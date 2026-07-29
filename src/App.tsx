import React, { useEffect, useState, useCallback } from 'react';
import {
  Restaurant,
  UserProfile,
  Product,
  SupplyRequest,
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
} from './lib/api';
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
import { showLocalNotification, playAlertSound } from './lib/notifications';
import { getTranslation } from './lib/translations';
import {
  ClipboardList,
  ShoppingBag,
  SlidersHorizontal,
  BarChart3,
  Flame,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('rest-1');

  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'user-1',
    name: 'Mateo (Cocinero Principal)',
    role: 'cocinero',
    phone: '+1 (432) 888-1020',
    assignedLocations: ['rest-1'],
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([]);
  const [sseConnected, setSseConnected] = useState(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'CHECKLIST' | 'REQUESTS' | 'ADMIN' | 'ANALYTICS'>('REQUESTS');

  // Modals
  const [shoppingModalRequest, setShoppingModalRequest] = useState<SupplyRequest | null>(null);
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
    setActiveTab('REQUESTS');
    setHighlightedRequestId(requestId);
    setShowNotificationCenter(false);
    // Clear highlight after 5 seconds
    setTimeout(() => {
      setHighlightedRequestId(null);
    }, 5000);
  };

  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false);

  // Load Data
  const loadInitialData = useCallback(async () => {
    const [rests, usrs, prods, reqs] = await Promise.all([
      fetchRestaurants(),
      fetchUsers(),
      fetchProducts(),
      fetchSupplyRequests(),
    ]);

    if (rests.length > 0) setRestaurants(rests);
    if (usrs.length > 0) {
      setUsers(usrs);
      if (!currentUser.id) setCurrentUser(usrs[0]);
    }
    if (prods.length > 0) setProducts(prods);
    if (reqs.length > 0) {
      const uniqueReqs = Array.from(new Map(reqs.map((r: SupplyRequest) => [r.id, r])).values());
      setSupplyRequests(uniqueReqs);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // SSE Real-Time Stream Event Listener
    const eventSource = new EventSource('/api/stream');

    eventSource.onopen = () => {
      setSseConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const { type, data } = payload;

        if (type === 'REQUEST_CREATED') {
          setSupplyRequests((prev) => [data, ...prev.filter((r) => r.id !== data.id)]);
          playAlertSound('urgent');
          showLocalNotification(
            `🚨 NUEVA SOLICITUD DE COMPRA #${data.requestNumber}`,
            `Restaurante ${data.restaurantName} - ${data.items.length} productos requeridos.`
          );
        } else if (type === 'REQUEST_UPDATED') {
          setSupplyRequests((prev) =>
            prev.map((r) => (r.id === data.id ? data : r))
          );
          if (shoppingModalRequest && shoppingModalRequest.id === data.id) {
            setShoppingModalRequest(data);
          }
        } else if (type === 'PRODUCT_ADDED' || type === 'PRODUCT_UPDATED') {
          fetchProducts().then((p) => setProducts(p));
        } else if (type === 'NOTIFICATION_ALERT') {
          playAlertSound('urgent');
          showLocalNotification(data.title, data.body);
        }
      } catch (err) {
        console.error('SSE Error', err);
      }
    };

    eventSource.onerror = () => {
      setSseConnected(false);
    };

    // PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    return () => {
      eventSource.close();
    };
  }, [loadInitialData]);

  // Selected Restaurant
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

  // Filter products by selected restaurant
  const currentRestaurantProducts = products.filter(
    (p) => p.restaurantId === selectedRestaurantId
  );

  // Handle Checklist Submission
  const handleSubmitChecklist = async (
    stockReadings: Record<string, number>,
    notes: string,
    urgent: boolean
  ) => {
    setIsSubmittingChecklist(true);
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
  };

  // Claim Request
  const handleClaimRequest = async (requestId: string) => {
    const updated = await claimSupplyRequest(requestId, currentUser.id);
    setSupplyRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
  };

  // Open Shopping Mode with Access Control & Auto-Claim
  const handleOpenShoppingMode = async (req: SupplyRequest) => {
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

    // Auto-claim if unassigned buyer opens shopping mode
    if (currentUser.role === 'comprador' && !req.assignedBuyerId) {
      const claimed = await claimSupplyRequest(req.id, currentUser.id);
      setSupplyRequests((prev) => prev.map((r) => (r.id === req.id ? claimed : r)));
      setShoppingModalRequest(claimed);
    } else {
      setShoppingModalRequest(req);
    }
  };

  // Status Change
  const handleUpdateStatus = async (requestId: string, status: RequestStatus) => {
    const { request: updated, newPendingRequest } = await updateRequestStatus(
      requestId,
      status,
      currentUser.id
    );
    setSupplyRequests((prev) => {
      let next = prev.map((r) => (r.id === requestId ? updated : r));
      if (newPendingRequest && !next.some((r) => r.id === newPendingRequest.id)) {
        next = [newPendingRequest, ...next];
      }
      return next;
    });

    if (newPendingRequest) {
      playAlertSound('urgent');
      showLocalNotification(
        `🚨 NUEVA SOLICITUD DE COMPRA #${newPendingRequest.requestNumber}`,
        `Se creó automáticamente con ${newPendingRequest.items.length} insumos faltantes.`
      );
    }
  };

  // Toggle Shopping Mode Item
  const handleToggleItem = async (itemId: string, purchased: boolean, note?: string) => {
    if (!shoppingModalRequest) return;
    const res = await toggleItemPurchased(
      shoppingModalRequest.id,
      itemId,
      purchased,
      note
    );
    setShoppingModalRequest(res.request);
    setSupplyRequests((prev) =>
      prev.map((r) => (r.id === res.request.id ? res.request : r))
    );
  };

  // Finish Shopping
  const handleFinishShopping = async () => {
    if (!shoppingModalRequest) return;
    const { request: updated, newPendingRequest } = await updateRequestStatus(
      shoppingModalRequest.id,
      'Comprada',
      currentUser.id
    );

    setSupplyRequests((prev) => {
      let next = prev.map((r) => (r.id === updated.id ? updated : r));
      if (newPendingRequest && !next.some((r) => r.id === newPendingRequest.id)) {
        next = [newPendingRequest, ...next];
      }
      return next;
    });

    triggerNotification(
      `✅ COMPRA COMPLETADA - SOLICITUD #${shoppingModalRequest.requestNumber}`,
      `Comprador ${currentUser.name} ha finalizado la compra para ${shoppingModalRequest.restaurantName}. En camino a entregar.`
    );

    if (newPendingRequest) {
      playAlertSound('urgent');
      showLocalNotification(
        `📦 NUEVA SOLICITUD #${newPendingRequest.requestNumber} GENERADA`,
        `Se creó con ${newPendingRequest.items.length} productos pendientes de comprar.`
      );
    }
  };

  // Product CRUD
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
    const res = await fetch('/api/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(restData),
    });
    const newRest = await res.json();
    setRestaurants((prev) => [...prev, newRest]);
    setSelectedRestaurantId(newRest.id);
  };

  const handleSelectUser = (u: UserProfile) => {
    setCurrentUser(u);
    // Automatically switch active tab to primary tab for the selected role
    if (u.role === 'cocinero') {
      setActiveTab('REQUESTS');
    } else if (u.role === 'comprador') {
      setActiveTab('REQUESTS');
    } else if (u.role === 'admin') {
      setActiveTab('ANALYTICS');
    }
  };

  const activePendingRequestsCount = supplyRequests.filter(
    (r) => r.status === 'Pendiente'
  ).length;

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const t = getTranslation(currentUser.language || 'es');
  const isLight = currentUser.theme === 'light';

  // Sync html root class for theme styles
  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [isLight]);

  // Role-based navigation items
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
      {/* Header */}
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
      />

      {/* Role-Based Streamlined Navigation Tabs */}
      <nav className={`border-b sticky top-[52px] z-30 backdrop-blur-md ${
        isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}>
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

      {/* Main Content Workspace */}
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
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddRestaurant={handleAddRestaurant}
          />
        )}

        {activeTab === 'ANALYTICS' && <AnalyticsDashboard />}
      </main>

      {/* Shopping Mode Modal */}
      {shoppingModalRequest && (
        <ShoppingModeModal
          request={shoppingModalRequest}
          currentUser={currentUser}
          onClose={() => setShoppingModalRequest(null)}
          onToggleItem={handleToggleItem}
          onCompleteShopping={handleFinishShopping}
        />
      )}

      {/* Notification Center Modal */}
      {showNotificationCenter && (
        <NotificationCenter
          onClose={() => setShowNotificationCenter(false)}
          sseConnected={sseConnected}
          currentUserPhone={currentUser.phone}
          currentUserRole={currentUser.role}
          requests={supplyRequests}
          onSelectRequest={handleSelectRequestFromNotification}
        />
      )}

      {/* Profile Settings Modal */}
      {showProfileSettingsModal && (
        <ProfileSettingsModal
          currentUser={currentUser}
          onClose={() => setShowProfileSettingsModal(false)}
          onSaveProfile={handleSaveProfile}
        />
      )}

      {/* PWA Install Modal */}
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
