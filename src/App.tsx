import React, { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';
import {
  Restaurant,
  UserProfile,
  Product,
  SupplyRequest,
  RequestItem,
  RequestStatus,
  Role,
} from './types';
import {
  fetchRestaurants,
  fetchUsers,
  fetchProducts,
  fetchSupplyRequests,
  submitDailyChecklist,
  claimSupplyRequest,
  updateRequestStatus,
  toggleItemPurchased,
  createProduct,
  updateProduct,
  deleteProduct,
  triggerNotification,
  upsertSupplyRequest,
  getNextRequestNumber,
} from './lib/api';
import { supabase, rowToRequest } from './lib/supabase';
import { INITIAL_SUPPLIERS } from './data/caddyShackData';
import { Header } from './components/Header';
import { BottomNav, BottomNavTab } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import type { OverdueSettings } from './components/AdminCatalog';

// Tab/screen destinations are only ever needed after the initial Dashboard
// render, so they're code-split out of the main bundle and fetched on demand.
const AccountView = lazy(() => import('./components/AccountView').then((m) => ({ default: m.AccountView })));
const NotificationsView = lazy(() => import('./components/NotificationsView').then((m) => ({ default: m.NotificationsView })));
const DailyChecklist = lazy(() => import('./components/DailyChecklist').then((m) => ({ default: m.DailyChecklist })));
const RequestsList = lazy(() => import('./components/RequestsList').then((m) => ({ default: m.RequestsList })));
const ShoppingView = lazy(() => import('./components/ShoppingView').then((m) => ({ default: m.ShoppingView })));
const AdminCatalog = lazy(() => import('./components/AdminCatalog').then((m) => ({ default: m.AdminCatalog })));
import { showLocalNotification, playAlertSound, setAppBadge } from './lib/notifications';
import { getTranslation } from './lib/translations';
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react';

type TabId = 'DASHBOARD' | 'REQUESTS' | 'CHECKLIST' | 'ADMIN';
type Screen = 'NONE' | 'NOTIFICATIONS' | 'ACCOUNT';

// Lightweight, theme-aware placeholder shown while a lazy-loaded view's chunk fetches.
const ViewFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24">
    <div
      className="w-8 h-8 rounded-full border-2 animate-spin"
      style={{ borderColor: 'var(--sf-border)', borderTopColor: 'var(--sf-accent)' }}
    />
  </div>
);

const SESSION_KEY = 'restosupply_session_user';
const LANGUAGE_KEY = 'restosupply_language';
const PRODUCTS_OVERRIDE_KEY = 'restosupply_products_override';
const RESTAURANTS_OVERRIDE_KEY = 'restosupply_restaurants_override';

function readStoredJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function persistJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — in-memory state still works for this session */
  }
}

export default function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('rest-1');

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => readStoredJSON<UserProfile>(SESSION_KEY));
  const [appLanguage, setAppLanguage] = useState<'es' | 'en'>(() => {
    const stored = readStoredJSON<UserProfile>(SESSION_KEY);
    return stored?.language || (localStorage.getItem(LANGUAGE_KEY) as 'es' | 'en' | null) || 'es';
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([]);
  const [sseConnected, setSseConnected] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('DASHBOARD');
  const [screen, setScreen] = useState<Screen>('NONE');

  const [shoppingModalRequest, setShoppingModalRequest] = useState<SupplyRequest | null>(null);
  // Ref to avoid stale closure in SSE handler
  const shoppingModalRequestRef = useRef<SupplyRequest | null>(null);
  useEffect(() => {
    shoppingModalRequestRef.current = shoppingModalRequest;
  }, [shoppingModalRequest]);

  const t = getTranslation(currentUser?.language || appLanguage);
  // Ref to avoid stale-language closures in long-lived effect handlers (SSE, interval)
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);

  const [overdueSettings, setOverdueSettings] = useState<OverdueSettings>(() => {
    try {
      const s = localStorage.getItem('restosupply_overdue_settings');
      return s ? JSON.parse(s) : { normalMinutes: 15, urgentMinutes: 5 };
    } catch { return { normalMinutes: 15, urgentMinutes: 5 }; }
  });
  const [overdueRequestIds, setOverdueRequestIds] = useState<Set<string>>(new Set());
  const notifiedOverdueIds = useRef<Set<string>>(new Set());

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setCurrentUser(updatedProfile);
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedProfile.id ? updatedProfile : u))
    );
    persistJSON(SESSION_KEY, updatedProfile);
    if (updatedProfile.language) localStorage.setItem(LANGUAGE_KEY, updatedProfile.language);
  };

  const handleSelectRequestFromNotification = (requestId: string) => {
    const req = supplyRequests.find((r) => r.id === requestId);
    if (req) {
      setSelectedRestaurantId(req.restaurantId);
    }
    setActiveTab('REQUESTS');
    setScreen('NONE');
    setHighlightedRequestId(requestId);
    setTimeout(() => {
      setHighlightedRequestId(null);
    }, 5000);
  };

  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false);

  const loadInitialData = useCallback(async () => {
    // Restaurants/users/products are static + localStorage-only (no backend
    // table yet for the catalog) and resolve instantly. Supply requests are
    // the only part that depends on the Supabase network round-trip, which
    // can be slow or briefly unavailable — fetch it independently so a slow
    // or failed connection never delays restoring the session/catalog.
    const [rests, usrs, prods] = await Promise.all([
      fetchRestaurants(),
      fetchUsers(),
      fetchProducts(),
    ]);

    // A locally-saved override lets admin catalog edits survive a refresh on this device.
    const storedRestaurants = readStoredJSON<Restaurant[]>(RESTAURANTS_OVERRIDE_KEY);
    const storedProducts = readStoredJSON<Product[]>(PRODUCTS_OVERRIDE_KEY);

    if (storedRestaurants && storedRestaurants.length > 0) setRestaurants(storedRestaurants);
    else if (rests.length > 0) setRestaurants(rests);

    if (usrs.length > 0) setUsers(usrs);

    if (storedProducts && storedProducts.length > 0) setProducts(storedProducts);
    else if (prods.length > 0) setProducts(prods);

    fetchSupplyRequests().then((reqs) => {
      if (reqs.length > 0) {
        const uniqueReqs = Array.from(new Map(reqs.map((r: SupplyRequest) => [r.id, r])).values());
        setSupplyRequests(uniqueReqs);
      }
    });
  }, []);

  useEffect(() => {
    loadInitialData();

    // Supabase Realtime — syncs all devices over the internet in real time
    const channel = supabase
      .channel('sf_supply_requests_all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sf_supply_requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReq = rowToRequest(payload.new as Record<string, unknown>);
            setSupplyRequests((prev) => {
              // Skip if already in state (optimistic update on the originating device)
              if (prev.some((r) => r.id === newReq.id)) return prev;
              playAlertSound('urgent');
              showLocalNotification(
                `${tRef.current.notifNewRequestTitlePrefix} #${newReq.requestNumber}`,
                `${newReq.restaurantName} — ${newReq.items.length} ${tRef.current.notifNewRequestBodySuffix}`
              );
              return [newReq, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = rowToRequest(payload.new as Record<string, unknown>);
            setSupplyRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            if (shoppingModalRequestRef.current?.id === updated.id) {
              setShoppingModalRequest(updated);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            setSupplyRequests((prev) => prev.filter((r) => r.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        setSseConnected(status === 'SUBSCRIBED');
      });

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // iOS PWA: reconnect Realtime when app returns from background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.realtime.connect();
        loadInitialData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadInitialData]);

  // Detect overdue (unassigned Pendiente) requests and notify once per request
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const newOverdue = new Set<string>();
      supplyRequests.forEach((req) => {
        if (req.status !== 'Pendiente' || req.assignedBuyerId) return;
        const ageMin = (now - new Date(req.createdAt).getTime()) / 60000;
        const limit = req.urgent ? overdueSettings.urgentMinutes : overdueSettings.normalMinutes;
        if (ageMin < limit) return;
        newOverdue.add(req.id);
        if (!notifiedOverdueIds.current.has(req.id) && currentUser && (currentUser.role === 'comprador' || currentUser.role === 'admin')) {
          notifiedOverdueIds.current.add(req.id);
          showLocalNotification(
            `${tRef.current.notifOverdueTitlePrefix} #${req.requestNumber}`,
            `${req.restaurantName} ${tRef.current.notifOverdueBodyMid} ${limit} ${tRef.current.notifOverdueBodySuffix}`
          );
        }
      });
      setOverdueRequestIds(newOverdue);
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [supplyRequests, overdueSettings, currentUser]);

  // Update PWA icon badge with pending request count
  useEffect(() => {
    const count = supplyRequests.filter((r) => r.status === 'Pendiente').length;
    setAppBadge(count);
  }, [supplyRequests]);

  const selectedRestaurant =
    restaurants.find((r) => r.id === selectedRestaurantId) ||
    restaurants[0] || {
      id: 'rest-1',
      name: 'Caddy Shack Grill',
      type: 'Food Truck',
      address: 'Big Spring, TX',
      phone: '',
      active: true,
      colorBadge: 'emerald',
    };

  const currentRestaurantProducts = products.filter(
    (p) => p.restaurantId === selectedRestaurantId
  );

  const handleSubmitChecklist = async (
    stockReadings: Record<string, number>,
    notes: string,
    urgent: boolean
  ) => {
    if (!currentUser) return;
    setIsSubmittingChecklist(true);
    try {
      const result = await submitDailyChecklist(
        selectedRestaurantId,
        currentUser.id,
        stockReadings,
        notes,
        urgent
      );
      setIsSubmittingChecklist(false);
      if (result.request) {
        setSupplyRequests((prev) => [result.request!, ...prev.filter((r) => r.id !== result.request!.id)]);
        setActiveTab('REQUESTS');
      }
    } catch {
      setIsSubmittingChecklist(false);
      // No backend — build a local pending request from items below their minimum threshold
      const restaurant = restaurants.find((r) => r.id === selectedRestaurantId);
      const restaurantProducts = products.filter((p) => p.restaurantId === selectedRestaurantId && p.active);
      const lowStockItems: RequestItem[] = restaurantProducts
        .filter((p) => (stockReadings[p.id] ?? p.minThreshold + 1) < p.minThreshold)
        .map((p, i) => ({
          id: `local-item-${i}`,
          productId: p.id,
          productName: p.name,
          category: p.category,
          unit: p.unit,
          currentStockAtRequest: stockReadings[p.id] ?? 0,
          minThreshold: p.minThreshold,
          requestedQty: p.suggestedQuantity,
          suggestedSupplier: p.suggestedSupplier,
          purchased: false,
        }));
      if (lowStockItems.length > 0) {
        const demoReq: SupplyRequest = {
          id: `local-req-${Date.now()}`,
          requestNumber: 200 + Math.floor(Math.random() * 50),
          restaurantId: selectedRestaurantId,
          restaurantName: restaurant?.name ?? selectedRestaurantId,
          createdByUserId: currentUser.id,
          createdByUserName: currentUser.name,
          status: 'Pendiente',
          items: lowStockItems,
          urgent,
          notes,
          createdAt: new Date().toISOString(),
        };
        setSupplyRequests((prev) => [demoReq, ...prev]);
      }
      setActiveTab('REQUESTS');
    }
  };

  const handleClaimRequest = async (requestId: string) => {
    if (!currentUser) return;
    const target = supplyRequests.find((r) => r.id === requestId);
    if (!target) return;
    const optimistic = { ...target, status: 'Asignada' as const, assignedBuyerId: currentUser.id, assignedBuyerName: currentUser.name };
    setSupplyRequests((prev) => prev.map((r) => (r.id === requestId ? optimistic : r)));
    try {
      const updated = await claimSupplyRequest(requestId, currentUser.id, currentUser.name);
      setSupplyRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
    } catch {
      // Supabase failed, optimistic update stays
    }
  };

  const handleOpenShoppingMode = async (req: SupplyRequest) => {
    if (!currentUser) return;
    if (
      currentUser.role === 'comprador' &&
      req.assignedBuyerId &&
      req.assignedBuyerId !== currentUser.id
    ) {
      playAlertSound('urgent');
      showLocalNotification(
        tRef.current.notifRestrictedTitle,
        `${tRef.current.notifRestrictedBodyPrefix} ${req.assignedBuyerName || tRef.current.notifRestrictedOtherBuyer}.`
      );
      return;
    }

    if (currentUser.role === 'comprador' && !req.assignedBuyerId) {
      const optimisticClaimed = { ...req, status: 'Asignada' as const, assignedBuyerId: currentUser.id, assignedBuyerName: currentUser.name };
      setSupplyRequests((prev) => prev.map((r) => (r.id === req.id ? optimisticClaimed : r)));
      setShoppingModalRequest(optimisticClaimed);
      try {
        const claimed = await claimSupplyRequest(req.id, currentUser.id, currentUser.name);
        setSupplyRequests((prev) => prev.map((r) => (r.id === req.id ? claimed : r)));
        setShoppingModalRequest(claimed);
      } catch {
        // Supabase failed, optimistic update stays
      }
    } else {
      setShoppingModalRequest(req);
    }
  };

  const handleUpdateStatus = async (requestId: string, status: RequestStatus) => {
    if (!currentUser) return;
    setSupplyRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)));
    let newPendingRequest: SupplyRequest | null | undefined;
    try {
      const { request: updated, newPendingRequest: pending } = await updateRequestStatus(
        requestId,
        status,
        currentUser.id
      );
      newPendingRequest = pending;
      setSupplyRequests((prev) => {
        let next = prev.map((r) => (r.id === requestId ? updated : r));
        if (pending && !next.some((r) => r.id === pending.id)) {
          next = [pending, ...next];
        }
        return next;
      });
    } catch {
      // no backend, optimistic update stays
    }

    if (newPendingRequest) {
      playAlertSound('urgent');
      showLocalNotification(
        `${tRef.current.notifAutoPendingTitle} #${newPendingRequest.requestNumber}`,
        `${tRef.current.notifAutoPendingBodyPrefix} ${newPendingRequest.items.length} ${tRef.current.notifAutoPendingBodySuffix}`
      );
    }
  };

  const handleToggleItem = async (itemId: string, purchased: boolean, note?: string) => {
    if (!shoppingModalRequest || !currentUser) return;
    // Optimistic update — reflect change immediately so UI works without backend
    const optimistic = {
      ...shoppingModalRequest,
      items: shoppingModalRequest.items.map((item) =>
        item.id === itemId
          ? { ...item, purchased, purchasedAt: purchased ? new Date().toISOString() : undefined, itemNote: note ?? item.itemNote }
          : item
      ),
    };
    setShoppingModalRequest(optimistic);
    setSupplyRequests((prev) => prev.map((r) => (r.id === optimistic.id ? optimistic : r)));
    // Sync with backend in background (may fail on static hosting, that's OK)
    try {
      const res = await toggleItemPurchased(shoppingModalRequest.id, itemId, purchased, note);
      if (res?.request) {
        setShoppingModalRequest(res.request);
        setSupplyRequests((prev) => prev.map((r) => (r.id === res.request.id ? res.request : r)));
      }
    } catch {
      // no backend available, optimistic update already applied
    }
  };

  const handleFinishShopping = async () => {
    if (!shoppingModalRequest || !currentUser) return;

    const purchased = shoppingModalRequest.items.filter((item) => item.purchased);
    const unpurchased = shoppingModalRequest.items.filter((item) => !item.purchased);
    const now = new Date().toISOString();

    // When some items were not purchased, trim the original to only what was bought
    const originalItems = unpurchased.length > 0 && purchased.length > 0 ? purchased : shoppingModalRequest.items;

    const updatedOriginal: SupplyRequest = {
      ...shoppingModalRequest,
      status: 'Comprada',
      items: originalItems,
      purchasedAt: now,
    };

    // Optimistic update on this device immediately
    setSupplyRequests((prev) => prev.map((r) => (r.id === updatedOriginal.id ? updatedOriginal : r)));

    let newPendingRequest: SupplyRequest | null = null;

    if (unpurchased.length > 0 && purchased.length > 0) {
      const nextNumber = await getNextRequestNumber().catch(
        () => 200 + Math.floor(Math.random() * 99)
      );
      newPendingRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        requestNumber: nextNumber,
        restaurantId: shoppingModalRequest.restaurantId,
        restaurantName: shoppingModalRequest.restaurantName,
        createdByUserId: shoppingModalRequest.createdByUserId,
        createdByUserName: shoppingModalRequest.createdByUserName,
        status: 'Pendiente',
        items: unpurchased.map((item, idx) => ({
          ...item,
          id: `ri-${Date.now()}-${idx}`,
          purchased: false,
          purchasedAt: undefined,
          purchasedBy: undefined,
        })),
        urgent: shoppingModalRequest.urgent,
        notes: `${tRef.current.notifAutoGeneratedNotePrefix} ${unpurchased.length} ${tRef.current.notifAutoGeneratedNoteMid} #${shoppingModalRequest.requestNumber}.`,
        createdAt: now,
      };
      // Add optimistically so this device sees it immediately
      setSupplyRequests((prev) => [newPendingRequest!, ...prev.filter((r) => r.id !== newPendingRequest!.id)]);
      playAlertSound('urgent');
      showLocalNotification(
        `${tRef.current.notifPendingGeneratedTitlePrefix} #${newPendingRequest.requestNumber} ${tRef.current.notifPendingGeneratedTitleSuffix}`,
        `${tRef.current.notifPendingGeneratedBodyPrefix} ${newPendingRequest.items.length} ${tRef.current.notifPendingGeneratedBodySuffix}`
      );
    }

    // Write to Supabase — Realtime broadcasts both changes to all other devices
    try {
      await upsertSupplyRequest(updatedOriginal);
      if (newPendingRequest) {
        await upsertSupplyRequest(newPendingRequest);
      }
    } catch (err) {
      console.error('Supabase write failed, keeping optimistic state', err);
    }

    setShoppingModalRequest(null);
  };

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'updatedAt'>) => {
    const newProd = await createProduct(productData);
    setProducts((prev) => {
      const next = [...prev, newProd];
      persistJSON(PRODUCTS_OVERRIDE_KEY, next);
      return next;
    });
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const updated = await updateProduct(id, updates);
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === id ? updated : p));
      persistJSON(PRODUCTS_OVERRIDE_KEY, next);
      return next;
    });
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistJSON(PRODUCTS_OVERRIDE_KEY, next);
      return next;
    });
  };

  const handleAddRestaurant = async (restData: { name: string; type: any; address: string; phone: string }) => {
    const newRest = { ...restData, id: `rest-${Date.now()}`, active: true, colorBadge: 'emerald' as const };
    setRestaurants((prev) => {
      const next = [...prev, newRest];
      persistJSON(RESTAURANTS_OVERRIDE_KEY, next);
      return next;
    });
    setSelectedRestaurantId(newRest.id);
  };

  const handleSaveOverdueSettings = (settings: OverdueSettings) => {
    setOverdueSettings(settings);
    localStorage.setItem('restosupply_overdue_settings', JSON.stringify(settings));
    notifiedOverdueIds.current.clear();
  };

  const handleSelectUser = (u: UserProfile) => {
    setCurrentUser(u);
    setAppLanguage(u.language || 'es');
    setActiveTab('DASHBOARD');
    setScreen('NONE');
    persistJSON(SESSION_KEY, u);
    if (u.language) localStorage.setItem(LANGUAGE_KEY, u.language);
  };

  const handleChangeLanguage = (lang: 'es' | 'en') => {
    setAppLanguage(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  };

  // Show login screen when no user is selected
  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        onSelectUser={handleSelectUser}
        language={appLanguage}
        onChangeLanguage={handleChangeLanguage}
      />
    );
  }

  const activePendingRequestsCount = supplyRequests.filter(
    (r) => r.status === 'Pendiente'
  ).length;

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const isLight = currentUser.theme === 'light';

  // Sync html root class for theme
  if (isLight) {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }

  // Keep the PWA/browser chrome (status bar, task switcher) color matching the active theme
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isLight ? '#f3f5f9' : '#070b14');
  }

  const getNavTabs = (): BottomNavTab[] => {
    const dashboard: BottomNavTab = { id: 'DASHBOARD', label: t.tabDashboard, icon: LayoutDashboard };
    switch (currentUser.role) {
      case 'cocinero':
        return [
          dashboard,
          { id: 'REQUESTS', label: t.tabRequests, icon: ShoppingBag, badge: activePendingRequestsCount },
          { id: 'CHECKLIST', label: t.tabChecklist, icon: ClipboardList },
        ];
      case 'comprador':
        return [
          dashboard,
          { id: 'REQUESTS', label: t.tabRequestsBuyer, icon: ShoppingBag, badge: activePendingRequestsCount },
        ];
      case 'admin':
        return [
          dashboard,
          { id: 'REQUESTS', label: t.tabRequests, icon: ShoppingBag, badge: activePendingRequestsCount },
          { id: 'ADMIN', label: t.tabCatalog, icon: SlidersHorizontal },
          { id: 'CHECKLIST', label: t.tabChecklist, icon: ClipboardList },
        ];
      default:
        return [dashboard];
    }
  };

  const currentNavTabs = getNavTabs();

  // Shopping mode is a full-screen view (no modal), takes priority when active
  if (shoppingModalRequest) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <ShoppingView
          request={shoppingModalRequest}
          currentUser={currentUser}
          onClose={() => setShoppingModalRequest(null)}
          onToggleItem={handleToggleItem}
          onCompleteShopping={handleFinishShopping}
        />
      </Suspense>
    );
  }

  // Drill-in full-screen views (no modals): notifications & account
  if (screen === 'NOTIFICATIONS') {
    return (
      <Suspense fallback={<ViewFallback />}>
        <NotificationsView
          onBack={() => setScreen('NONE')}
          sseConnected={sseConnected}
          currentUserPhone={currentUser.phone}
          currentUserRole={currentUser.role}
          currentUserLanguage={currentUser.language}
          requests={supplyRequests}
          onSelectRequest={handleSelectRequestFromNotification}
        />
      </Suspense>
    );
  }

  if (screen === 'ACCOUNT') {
    return (
      <Suspense fallback={<ViewFallback />}>
        <AccountView
          currentUser={currentUser}
          users={users}
          onBack={() => setScreen('NONE')}
          onSaveProfile={handleSaveProfile}
          onSelectUser={handleSelectUser}
          isPWAInstallable={!!deferredPrompt || isIOS}
          isIOS={isIOS}
          onInstallDirect={() => {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
            }
          }}
          onLogout={handleLogout}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans sf-page selection:bg-[var(--sf-accent)] selection:text-[var(--sf-accent-contrast)]">
      <Header
        restaurants={restaurants}
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurant={(id) => setSelectedRestaurantId(id)}
        currentUser={currentUser}
        sseConnected={sseConnected}
        activeRequestsCount={activePendingRequestsCount}
        onOpenNotifications={() => setScreen('NOTIFICATIONS')}
        onOpenProfile={() => setScreen('ACCOUNT')}
      />

      <main
        className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-6 w-full"
        style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}
      >
        {activeTab === 'DASHBOARD' && (
          <Dashboard
            currentUser={currentUser}
            requests={supplyRequests}
            products={products}
            selectedRestaurantId={selectedRestaurantId}
            onGoToRequests={() => setActiveTab('REQUESTS')}
            onOpenRequest={handleSelectRequestFromNotification}
          />
        )}

        {activeTab === 'CHECKLIST' && (
          <Suspense fallback={<ViewFallback />}>
            <DailyChecklist
              products={currentRestaurantProducts}
              selectedRestaurant={selectedRestaurant}
              currentUser={currentUser}
              onSubmitChecklist={handleSubmitChecklist}
              isSubmitting={isSubmittingChecklist}
            />
          </Suspense>
        )}

        {activeTab === 'REQUESTS' && (
          <Suspense fallback={<ViewFallback />}>
            <RequestsList
              requests={supplyRequests}
              currentUser={currentUser}
              onClaimRequest={handleClaimRequest}
              onOpenShoppingMode={handleOpenShoppingMode}
              onUpdateStatus={handleUpdateStatus}
              selectedRestaurantId={selectedRestaurantId}
              highlightedRequestId={highlightedRequestId}
              overdueRequestIds={overdueRequestIds}
            />
          </Suspense>
        )}

        {activeTab === 'ADMIN' && (
          <Suspense fallback={<ViewFallback />}>
            <AdminCatalog
              products={products}
              restaurants={restaurants}
              suppliers={INITIAL_SUPPLIERS}
              currentUser={currentUser}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddRestaurant={handleAddRestaurant}
              overdueSettings={overdueSettings}
              onSaveOverdueSettings={handleSaveOverdueSettings}
            />
          </Suspense>
        )}

      </main>

      <BottomNav
        tabs={currentNavTabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />
    </div>
  );
}
