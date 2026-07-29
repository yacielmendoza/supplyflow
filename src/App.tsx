import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { DailyChecklist } from './components/DailyChecklist';
import { RequestsList } from './components/RequestsList';
import { ShoppingModeModal } from './components/ShoppingModeModal';
import { AdminCatalog } from './components/AdminCatalog';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { NotificationCenter } from './components/NotificationCenter';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { LoginScreen } from './components/LoginScreen';
import { showLocalNotification, playAlertSound } from './lib/notifications';
import { getTranslation } from './lib/translations';
import {
  ClipboardList,
  ShoppingBag,
  SlidersHorizontal,
  BarChart3,
} from 'lucide-react';

export default function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('rest-1');

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [appLanguage, setAppLanguage] = useState<'es' | 'en'>('es');

  const [products, setProducts] = useState<Product[]>([]);
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([]);
  const [sseConnected, setSseConnected] = useState(false);

  const [activeTab, setActiveTab] = useState<'CHECKLIST' | 'REQUESTS' | 'ADMIN' | 'ANALYTICS'>('REQUESTS');

  const [shoppingModalRequest, setShoppingModalRequest] = useState<SupplyRequest | null>(null);
  // Ref to avoid stale closure in SSE handler
  const shoppingModalRequestRef = useRef<SupplyRequest | null>(null);
  useEffect(() => {
    shoppingModalRequestRef.current = shoppingModalRequest;
  }, [shoppingModalRequest]);

  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showProfileSettingsModal, setShowProfileSettingsModal] = useState(false);
  const [showPWAInstallModal, setShowPWAInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setCurrentUser(updatedProfile);
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedProfile.id ? updatedProfile : u))
    );
  };

  const handleSelectRequestFromNotification = (requestId: string) => {
    const req = supplyRequests.find((r) => r.id === requestId);
    if (req) {
      setSelectedRestaurantId(req.restaurantId);
    }
    setActiveTab('REQUESTS');
    setHighlightedRequestId(requestId);
    setShowNotificationCenter(false);
    setTimeout(() => {
      setHighlightedRequestId(null);
    }, 5000);
  };

  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false);

  const loadInitialData = useCallback(async () => {
    const [rests, usrs, prods, reqs] = await Promise.all([
      fetchRestaurants(),
      fetchUsers(),
      fetchProducts(),
      fetchSupplyRequests(),
    ]);

    if (rests.length > 0) setRestaurants(rests);
    if (usrs.length > 0) setUsers(usrs);
    if (prods.length > 0) setProducts(prods);
    if (reqs.length > 0) {
      const uniqueReqs = Array.from(new Map(reqs.map((r: SupplyRequest) => [r.id, r])).values());
      setSupplyRequests(uniqueReqs);
    }
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
                `🚨 NUEVA SOLICITUD #${newReq.requestNumber}`,
                `${newReq.restaurantName} — ${newReq.items.length} productos requeridos.`
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

  const selectedRestaurant =
    restaurants.find((r) => r.id === selectedRestaurantId) ||
    restaurants[0] || {
      id: 'rest-1',
      name: 'Caddy Shack Grill',
      type: 'Food Truck',
      address: 'Big Spring, TX',
      phone: '',
      active: true,
      colorBadge: 'bg-emerald-600',
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
        '⛔ Acceso Restringido',
        `Esta solicitud está asignada a ${req.assignedBuyerName || 'otro comprador'}.`
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
        `🚨 NUEVA SOLICITUD DE COMPRA #${newPendingRequest.requestNumber}`,
        `Se creó automáticamente con ${newPendingRequest.items.length} insumos faltantes.`
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
        notes: `Generada automáticamente — ${unpurchased.length} insumos faltantes de Solicitud #${shoppingModalRequest.requestNumber}.`,
        createdAt: now,
      };
      // Add optimistically so this device sees it immediately
      setSupplyRequests((prev) => [newPendingRequest!, ...prev.filter((r) => r.id !== newPendingRequest!.id)]);
      playAlertSound('urgent');
      showLocalNotification(
        `📦 NUEVA SOLICITUD #${newPendingRequest.requestNumber} GENERADA`,
        `Se creó con ${newPendingRequest.items.length} productos pendientes de comprar.`
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
    setProducts((prev) => [...prev, newProd]);
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const updated = await updateProduct(id, updates);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddRestaurant = async (restData: { name: string; type: any; address: string; phone: string }) => {
    const newRest = { ...restData, id: `rest-${Date.now()}`, active: true, colorBadge: 'bg-emerald-600' };
    setRestaurants((prev) => [...prev, newRest]);
    setSelectedRestaurantId(newRest.id);
  };

  const handleSelectUser = (u: UserProfile) => {
    setCurrentUser(u);
    if (u.role === 'cocinero') {
      setActiveTab('REQUESTS');
    } else if (u.role === 'comprador') {
      setActiveTab('REQUESTS');
    } else if (u.role === 'admin') {
      setActiveTab('ANALYTICS');
    }
  };

  // Show login screen when no user is selected
  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        onSelectUser={(u) => {
          setCurrentUser(u);
          setAppLanguage(u.language || 'es');
          if (u.role === 'admin') setActiveTab('ANALYTICS');
          else setActiveTab('REQUESTS');
        }}
        language={appLanguage}
        onChangeLanguage={setAppLanguage}
      />
    );
  }

  const activePendingRequestsCount = supplyRequests.filter(
    (r) => r.status === 'Pendiente'
  ).length;

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const t = getTranslation(currentUser.language || appLanguage);
  const isLight = currentUser.theme === 'light';

  // Sync html root class for theme
  if (isLight) {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }

  const getNavTabs = () => {
    switch (currentUser.role) {
      case 'cocinero':
        return [
          { id: 'REQUESTS' as const, label: t.navRequests, icon: ShoppingBag, badge: activePendingRequestsCount },
          { id: 'CHECKLIST' as const, label: t.navChecklist, icon: ClipboardList },
        ];
      case 'comprador':
        return [
          { id: 'REQUESTS' as const, label: t.navPurchaseRequests, icon: ShoppingBag, badge: activePendingRequestsCount },
        ];
      case 'admin':
        return [
          { id: 'ANALYTICS' as const, label: t.navAnalytics, icon: BarChart3 },
          { id: 'REQUESTS' as const, label: t.navRequests, icon: ShoppingBag, badge: activePendingRequestsCount },
          { id: 'ADMIN' as const, label: t.navAdmin, icon: SlidersHorizontal },
          { id: 'CHECKLIST' as const, label: t.navChecklist, icon: ClipboardList },
        ];
    }
  };

  const currentNavTabs = getNavTabs();

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      isLight
        ? 'bg-slate-100 text-slate-900 selection:bg-emerald-500 selection:text-white'
        : 'bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950'
    }`}>
      <Header
        restaurants={restaurants}
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurant={(id) => setSelectedRestaurantId(id)}
        currentUser={currentUser}
        users={users}
        onSelectUser={handleSelectUser}
        sseConnected={sseConnected}
        activeRequestsCount={activePendingRequestsCount}
        onOpenNotifications={() => setShowNotificationCenter(true)}
        onOpenProfileSettings={() => setShowProfileSettingsModal(true)}
        isPWAInstallable={!!deferredPrompt || isIOS}
        onInstallPWA={() => setShowPWAInstallModal(true)}
        onLogout={() => setCurrentUser(null)}
      />

      <nav
        className={`border-b sticky z-30 backdrop-blur-md ${
          isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}
        style={{ top: 'calc(52px + env(safe-area-inset-top))' }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 sm:space-x-3 py-1.5 overflow-x-auto no-scrollbar">
            {currentNavTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    playAlertSound('click');
                  }}
                  className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black scale-[1.02]'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-slate-950 text-emerald-400' : 'bg-rose-500 text-white animate-pulse'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full">
        {activeTab === 'CHECKLIST' && (
          <DailyChecklist
            products={currentRestaurantProducts}
            selectedRestaurant={selectedRestaurant}
            currentUser={currentUser}
            onSubmitChecklist={handleSubmitChecklist}
            isSubmitting={isSubmittingChecklist}
          />
        )}

        {activeTab === 'REQUESTS' && (
          <RequestsList
            requests={supplyRequests}
            currentUser={currentUser}
            onClaimRequest={handleClaimRequest}
            onOpenShoppingMode={handleOpenShoppingMode}
            onUpdateStatus={handleUpdateStatus}
            selectedRestaurantId={selectedRestaurantId}
            highlightedRequestId={highlightedRequestId}
          />
        )}

        {activeTab === 'ADMIN' && (
          <AdminCatalog
            products={products}
            restaurants={restaurants}
            suppliers={INITIAL_SUPPLIERS}
            currentUser={currentUser}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddRestaurant={handleAddRestaurant}
          />
        )}

        {activeTab === 'ANALYTICS' && <AnalyticsDashboard currentUser={currentUser} />}
      </main>

      {shoppingModalRequest && (
        <ShoppingModeModal
          request={shoppingModalRequest}
          currentUser={currentUser}
          onClose={() => setShoppingModalRequest(null)}
          onToggleItem={handleToggleItem}
          onCompleteShopping={handleFinishShopping}
        />
      )}

      {showNotificationCenter && (
        <NotificationCenter
          onClose={() => setShowNotificationCenter(false)}
          sseConnected={sseConnected}
          currentUserPhone={currentUser.phone}
          currentUserRole={currentUser.role}
          currentUserLanguage={currentUser.language}
          requests={supplyRequests}
          onSelectRequest={handleSelectRequestFromNotification}
        />
      )}

      {showProfileSettingsModal && (
        <ProfileSettingsModal
          currentUser={currentUser}
          onClose={() => setShowProfileSettingsModal(false)}
          onSaveProfile={handleSaveProfile}
        />
      )}

      {showPWAInstallModal && (
        <PWAInstallPrompt
          onClose={() => setShowPWAInstallModal(false)}
          isIOS={isIOS}
          onInstall={() => {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
            }
          }}
        />
      )}
    </div>
  );
}
