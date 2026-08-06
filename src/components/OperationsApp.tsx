import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, LayoutDashboard, PackagePlus, RefreshCw, ShoppingBasket, Wifi, WifiOff } from 'lucide-react';
import type { AuthenticatedProfile } from '../lib/auth';
import { nextRequestStatus, requestStatusLabel, validateRequestItems, type OperationalRequestStatus } from '../lib/operations';
import {
  createProduct, createSupplier, createSupplyRequest, loadOperationsSnapshot, recordInventory, recordItemPurchase,
  subscribeToOperations, transitionSupplyRequest, type OperationsSnapshot, type OperationalProduct, type OperationalRequest,
} from '../lib/operations-api';

type View = 'dashboard' | 'request' | 'catalog' | 'inventory';

const emptySnapshot: OperationsSnapshot = { locations: [], products: [], suppliers: [], requests: [], buyers: [] };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No fue posible completar la operación.';
}

function locationName(snapshot: OperationsSnapshot, locationId: string): string {
  return snapshot.locations.find((location) => location.id === locationId)?.name ?? 'Local no disponible';
}

function statusTone(status: OperationalRequestStatus): string {
  if (status === 'completed') return 'var(--sf-accent)';
  if (status === 'pending') return 'var(--sf-amber)';
  return 'var(--sf-text-muted)';
}

export function OperationsApp({ profile, onSignOut }: { profile: AuthenticatedProfile; onSignOut: () => Promise<void> }) {
  const [view, setView] = useState<View>('dashboard');
  const [snapshot, setSnapshot] = useState<OperationsSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setSnapshot(await loadOperationsSnapshot(profile));
      setError(null);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const markOnline = () => { setOnline(true); void refresh(); };
    const markOffline = () => setOnline(false);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    const unsubscribe = subscribeToOperations(() => { void refresh(); });
    return () => { window.removeEventListener('online', markOnline); window.removeEventListener('offline', markOffline); unsubscribe(); };
  }, [refresh]);

  const pendingCount = useMemo(() => snapshot.requests.filter((request) => request.status !== 'completed').length, [snapshot.requests]);

  return (
    <main className="min-h-screen sf-page pb-24">
      <header className="sticky top-0 z-10 border-b px-4 py-3 backdrop-blur" style={{ borderColor: 'var(--sf-border)', background: 'color-mix(in srgb, var(--sf-page) 92%, transparent)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div><h1 className="text-xl font-black" style={{ color: 'var(--sf-text)' }}>SupplyFlow</h1><p className="text-xs sf-muted">{profile.fullName || profile.email} · {profile.role}</p></div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" title={online ? 'Conectado' : 'Sin conexión'} style={{ color: online ? 'var(--sf-accent)' : 'var(--sf-danger)' }}>{online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}</span>
            <button type="button" onClick={() => void refresh()} disabled={refreshing} aria-label="Actualizar" className="sf-btn-ghost rounded-xl p-2 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={() => void onSignOut()} className="sf-btn-ghost rounded-xl px-3 py-2 text-xs font-bold">Salir</button>
          </div>
        </div>
      </header>
      {!online && <div role="status" className="mx-auto max-w-5xl px-4 pt-3 text-sm" style={{ color: 'var(--sf-danger)' }}>Sin conexión: las operaciones están temporalmente deshabilitadas. Tus datos no se sustituyen por contenido demo.</div>}
      {error && <div role="alert" className="mx-auto max-w-5xl px-4 pt-3 text-sm" style={{ color: 'var(--sf-danger)' }}>{error}</div>}
      <section className="mx-auto max-w-5xl px-4 py-5">
        {loading ? <p role="status" className="sf-muted">Cargando datos de tu organización…</p> : <>
          {view === 'dashboard' && <Dashboard snapshot={snapshot} pendingCount={pendingCount} onNewRequest={() => setView('request')} />}
          {view === 'request' && <RequestComposer snapshot={snapshot} profile={profile} online={online} onSaved={() => { void refresh(); setView('dashboard'); }} />}
          {view === 'catalog' && <Catalog snapshot={snapshot} profile={profile} online={online} onSaved={() => void refresh()} />}
          {view === 'inventory' && <Inventory snapshot={snapshot} profile={profile} online={online} onSaved={() => void refresh()} />}
          <RequestQueue snapshot={snapshot} profile={profile} online={online} onSaved={() => void refresh()} />
        </>}
      </section>
      <nav aria-label="Navegación principal" className="fixed bottom-0 left-0 right-0 border-t p-2" style={{ borderColor: 'var(--sf-border)', background: 'var(--sf-surface)' }}>
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard className="h-4 w-4" />} label="Inicio" />
          <NavButton active={view === 'request'} onClick={() => setView('request')} icon={<ClipboardList className="h-4 w-4" />} label="Solicitar" />
          <NavButton active={view === 'inventory'} onClick={() => setView('inventory')} icon={<ShoppingBasket className="h-4 w-4" />} label="Inventario" />
          <NavButton active={view === 'catalog'} onClick={() => setView('catalog')} icon={<PackagePlus className="h-4 w-4" />} label="Catálogo" />
        </div>
      </nav>
    </main>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className="flex flex-col items-center rounded-xl px-2 py-2 text-[11px] font-bold" style={{ color: active ? 'var(--sf-accent)' : 'var(--sf-text-muted)', background: active ? 'var(--sf-surface-2)' : 'transparent' }}>{icon}{label}</button>;
}

function Dashboard({ snapshot, pendingCount, onNewRequest }: { snapshot: OperationsSnapshot; pendingCount: number; onNewRequest: () => void }) {
  return <div className="space-y-4"><div className="sf-card p-5"><p className="sf-muted text-sm">Operación de abastecimiento</p><div className="mt-2 flex items-end justify-between"><p className="text-4xl font-black" style={{ color: 'var(--sf-text)' }}>{pendingCount}</p><button type="button" onClick={onNewRequest} className="sf-btn-accent rounded-xl px-4 py-3 text-sm font-bold">Nueva solicitud</button></div><p className="mt-1 text-xs sf-muted">solicitudes activas · {snapshot.locations.length} locales con acceso</p></div><div className="grid gap-3 sm:grid-cols-2">{snapshot.requests.slice(0, 4).map((request) => <RequestCard key={request.id} request={request} snapshot={snapshot} />)}</div>{snapshot.requests.length === 0 && <Empty text="Aún no hay solicitudes persistentes. Crea la primera desde Solicitar." />}</div>;
}

function RequestCard({ request, snapshot }: { request: OperationalRequest; snapshot: OperationsSnapshot }) {
  return <article className="sf-card p-4"><div className="flex justify-between gap-3"><div><p className="font-black" style={{ color: 'var(--sf-text)' }}>#{request.number} · {locationName(snapshot, request.locationId)}</p><p className="mt-1 text-xs sf-muted">{request.items.length} artículos{request.urgent ? ' · Urgente' : ''}</p></div><span className="rounded-lg px-2 py-1 text-xs font-bold" style={{ color: statusTone(request.status), background: 'var(--sf-surface-2)' }}>{requestStatusLabel(request.status)}</span></div></article>;
}

function Empty({ text }: { text: string }) { return <div className="sf-card p-6 text-center text-sm sf-muted">{text}</div>; }

function RequestComposer({ snapshot, profile, online, onSaved }: { snapshot: OperationsSnapshot; profile: AuthenticatedProfile; online: boolean; onSaved: () => void }) {
  const [locationId, setLocationId] = useState(snapshot.locations[0]?.id ?? '');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [urgent, setUrgent] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const products = snapshot.products.filter((product) => product.locationId === null || product.locationId === locationId);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const items = Object.entries(quantities).filter(([, quantity]) => Number(quantity) > 0).map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }));
    const validation = validateRequestItems(items);
    if (validation) { setMessage(validation); return; }
    setSaving(true); setMessage(null);
    try { await createSupplyRequest({ locationId, urgent, notes, items }); onSaved(); } catch (saveError) { setMessage(errorMessage(saveError)); } finally { setSaving(false); }
  };
  return <form onSubmit={(event) => void submit(event)} className="space-y-4"><div><h2 className="text-xl font-black" style={{ color: 'var(--sf-text)' }}>Nueva solicitud</h2><p className="text-sm sf-muted">Elige sólo lo que hace falta. La numeración se asigna en el servidor.</p></div>{message && <p role="alert" style={{ color: 'var(--sf-danger)' }}>{message}</p>}<label className="block text-sm font-bold">Local<select value={locationId} onChange={(event) => setLocationId(event.target.value)} required className="mt-1 w-full sf-inset p-3">{snapshot.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><div className="space-y-2">{products.map((product) => <label key={product.id} className="sf-card flex items-center gap-3 p-3"><div className="min-w-0 flex-1"><p className="truncate font-bold" style={{ color: 'var(--sf-text)' }}>{product.name}</p><p className="text-xs sf-muted">{product.category} · mínimo {product.minThreshold} {product.unit}</p></div><input aria-label={`Cantidad para ${product.name}`} type="number" min="0" step="0.01" value={quantities[product.id] ?? ''} onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: event.target.value }))} className="sf-inset w-20 p-2 text-right" /></label>)}</div><label className="flex items-center gap-2 text-sm font-bold"><input checked={urgent} onChange={(event) => setUrgent(event.target.checked)} type="checkbox" /> Urgente</label><label className="block text-sm font-bold">Notas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full sf-inset p-3" rows={3} /></label><button type="submit" disabled={!online || saving || !locationId} className="sf-btn-accent w-full rounded-xl p-3 font-bold disabled:opacity-50">{saving ? 'Guardando…' : 'Crear solicitud'}</button></form>;
}

function Catalog({ snapshot, profile, online, onSaved }: { snapshot: OperationsSnapshot; profile: AuthenticatedProfile; online: boolean; onSaved: () => void }) {
  const [name, setName] = useState(''); const [category, setCategory] = useState('INGREDIENTS'); const [unit, setUnit] = useState('Unidad'); const [locationId, setLocationId] = useState(''); const [supplier, setSupplier] = useState(''); const [phone, setPhone] = useState(''); const [message, setMessage] = useState<string | null>(null);
  const canManage = profile.role === 'admin';
  const addProduct = async (event: React.FormEvent) => { event.preventDefault(); if (!canManage) return; try { await createProduct(profile, { name, category, unit, locationId: locationId || null, minThreshold: 0, suggestedQuantity: 1 }); setName(''); setMessage('Producto guardado.'); onSaved(); } catch (saveError) { setMessage(errorMessage(saveError)); } };
  const addSupplier = async (event: React.FormEvent) => { event.preventDefault(); if (!canManage) return; try { await createSupplier(profile, supplier, phone); setSupplier(''); setPhone(''); setMessage('Proveedor guardado.'); onSaved(); } catch (saveError) { setMessage(errorMessage(saveError)); } };
  return <div className="space-y-5"><div><h2 className="text-xl font-black" style={{ color: 'var(--sf-text)' }}>Catálogo</h2><p className="text-sm sf-muted">{snapshot.products.length} productos · {snapshot.suppliers.length} proveedores</p></div>{message && <p role="status">{message}</p>}{canManage ? <><form onSubmit={(event) => void addProduct(event)} className="sf-card space-y-2 p-4"><h3 className="font-black">Agregar producto</h3><input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Nombre" className="w-full sf-inset p-3" /><div className="grid grid-cols-2 gap-2"><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Categoría" className="sf-inset p-3" /><input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Unidad" className="sf-inset p-3" /></div><select value={locationId} onChange={(event) => setLocationId(event.target.value)} className="w-full sf-inset p-3"><option value="">Disponible en toda la organización</option>{snapshot.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><button disabled={!online} className="sf-btn-accent w-full rounded-xl p-3 font-bold disabled:opacity-50">Guardar producto</button></form><form onSubmit={(event) => void addSupplier(event)} className="sf-card space-y-2 p-4"><h3 className="font-black">Agregar proveedor</h3><input value={supplier} onChange={(event) => setSupplier(event.target.value)} required placeholder="Proveedor" className="w-full sf-inset p-3" /><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Teléfono (opcional)" className="w-full sf-inset p-3" /><button disabled={!online} className="sf-btn-accent w-full rounded-xl p-3 font-bold disabled:opacity-50">Guardar proveedor</button></form></> : <p className="sf-muted text-sm">Puedes consultar el catálogo. Sólo administradores pueden modificarlo.</p>}<div className="space-y-2">{snapshot.products.map((product) => <ProductCard key={product.id} product={product} />)}</div></div>;
}

function ProductCard({ product }: { product: OperationalProduct }) { return <div className="sf-card p-3"><p className="font-bold" style={{ color: 'var(--sf-text)' }}>{product.name}</p><p className="text-xs sf-muted">{product.category} · {product.unit} · sugerido {product.suggestedQuantity}</p></div>; }

function Inventory({ snapshot, profile, online, onSaved }: { snapshot: OperationsSnapshot; profile: AuthenticatedProfile; online: boolean; onSaved: () => void }) {
  const [locationId, setLocationId] = useState(snapshot.locations[0]?.id ?? ''); const [productId, setProductId] = useState(''); const [quantity, setQuantity] = useState(''); const [message, setMessage] = useState<string | null>(null);
  const visibleProducts = snapshot.products.filter((product) => product.locationId === null || product.locationId === locationId);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); try { await recordInventory(profile, { locationId, productId, quantity: Number(quantity), notes: '' }); setQuantity(''); setMessage('Conteo guardado.'); onSaved(); } catch (saveError) { setMessage(errorMessage(saveError)); } };
  return <form onSubmit={(event) => void submit(event)} className="space-y-3"><div><h2 className="text-xl font-black" style={{ color: 'var(--sf-text)' }}>Conteo de inventario</h2><p className="text-sm sf-muted">Registra una lectura real; se conserva el historial.</p></div>{message && <p role="status">{message}</p>}<select value={locationId} onChange={(event) => { setLocationId(event.target.value); setProductId(''); }} className="w-full sf-inset p-3">{snapshot.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><select value={productId} onChange={(event) => setProductId(event.target.value)} required className="w-full sf-inset p-3"><option value="">Producto</option>{visibleProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input value={quantity} onChange={(event) => setQuantity(event.target.value)} required min="0" step="0.01" type="number" placeholder="Cantidad contada" className="w-full sf-inset p-3" /><button disabled={!online || !productId} className="sf-btn-accent w-full rounded-xl p-3 font-bold disabled:opacity-50">Guardar conteo</button></form>;
}

function RequestQueue({ snapshot, profile, online, onSaved }: { snapshot: OperationsSnapshot; profile: AuthenticatedProfile; online: boolean; onSaved: () => void }) {
  const active = snapshot.requests.filter((request) => request.status !== 'completed');
  if (active.length === 0) return null;
  return <section className="mt-7 space-y-3"><h2 className="text-lg font-black" style={{ color: 'var(--sf-text)' }}>Cola de trabajo</h2>{active.map((request) => <RequestActions key={request.id} request={request} snapshot={snapshot} profile={profile} online={online} onSaved={onSaved} />)}</section>;
}

function RequestActions({ request, snapshot, profile, online, onSaved }: { request: OperationalRequest; snapshot: OperationsSnapshot; profile: AuthenticatedProfile; online: boolean; onSaved: () => void }) {
  const [buyer, setBuyer] = useState(''); const [message, setMessage] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const next = nextRequestStatus(request.status);
  const action = async () => { if (!next) return; setSaving(true); try { await transitionSupplyRequest({ requestId: request.id, status: next, assignedBuyerId: next === 'assigned' ? buyer : undefined }); setMessage('Estado actualizado.'); onSaved(); } catch (actionError) { setMessage(errorMessage(actionError)); } finally { setSaving(false); } };
  const mayAdvance = (request.status === 'pending' && profile.role === 'admin') || (request.status !== 'pending' && (profile.role === 'admin' || request.assignedBuyerId === profile.id || request.status === 'delivered'));
  return <article className="sf-card space-y-3 p-4"><div className="flex justify-between gap-2"><div><p className="font-black" style={{ color: 'var(--sf-text)' }}>#{request.number} · {locationName(snapshot, request.locationId)}</p><p className="text-xs sf-muted">{request.items.length} artículos · {requestStatusLabel(request.status)}</p></div>{request.urgent && <span className="text-xs font-bold" style={{ color: 'var(--sf-danger)' }}>URGENTE</span>}</div>{request.items.map((item) => <PurchaseItem key={item.id} item={item} request={request} profile={profile} online={online} onSaved={onSaved} />)}{message && <p role="status" className="text-sm">{message}</p>}{request.status === 'pending' && profile.role === 'admin' && <select value={buyer} onChange={(event) => setBuyer(event.target.value)} className="w-full sf-inset p-2"><option value="">Asignar comprador</option>{snapshot.buyers.map((entry) => <option key={entry.id} value={entry.id}>{entry.fullName || entry.email}</option>)}</select>}{mayAdvance && next && <button type="button" onClick={() => void action()} disabled={!online || saving || (next === 'assigned' && !buyer)} className="sf-btn-accent w-full rounded-xl p-3 text-sm font-bold disabled:opacity-50">{saving ? 'Actualizando…' : next === 'assigned' ? 'Asignar comprador' : `Marcar como ${requestStatusLabel(next)}`}</button>}</article>;
}

function PurchaseItem({ item, request, profile, online, onSaved }: { item: OperationalRequest['items'][number]; request: OperationalRequest; profile: AuthenticatedProfile; online: boolean; onSaved: () => void }) {
  const [quantity, setQuantity] = useState(String(item.purchasedQuantity)); const [message, setMessage] = useState<string | null>(null);
  const canPurchase = (profile.role === 'admin' || request.assignedBuyerId === profile.id) && (request.status === 'assigned' || request.status === 'in_purchase');
  const save = async () => { try { await recordItemPurchase(item.id, Number(quantity)); setMessage('Guardado'); onSaved(); } catch (saveError) { setMessage(errorMessage(saveError)); } };
  return <div className="rounded-xl p-3" style={{ background: 'var(--sf-surface-2)' }}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold" style={{ color: 'var(--sf-text)' }}>{item.productName}</p><p className="text-xs sf-muted">{item.purchasedQuantity}/{item.requestedQuantity} {item.unit}</p></div>{canPurchase && <div className="flex gap-2"><input value={quantity} onChange={(event) => setQuantity(event.target.value)} min="0" max={item.requestedQuantity} step="0.01" type="number" className="sf-inset w-20 p-2 text-right text-sm" /><button type="button" onClick={() => void save()} disabled={!online} className="sf-btn-ghost rounded-lg px-3 text-xs font-bold">Guardar</button></div>}</div>{message && <p className="mt-1 text-xs">{message}</p>}</div>;
}
