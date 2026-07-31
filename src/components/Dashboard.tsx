import React from 'react';
import { UserProfile, SupplyRequest, Product } from '../types';
import { getTranslation } from '../lib/translations';
import { formatCleanName } from '../lib/formatters';
import {
  AlertTriangle,
  PackageCheck,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Flame,
  ChevronRight,
  Boxes,
} from 'lucide-react';

interface DashboardProps {
  currentUser: UserProfile;
  requests: SupplyRequest[];
  products: Product[];
  selectedRestaurantId: string;
  onGoToRequests: () => void;
  onOpenRequest: (id: string) => void;
}

interface Stat {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string; // css var or hex for the icon/value accent
}

const isToday = (iso?: string) => {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
};

const STATUS_COLORS: Record<string, string> = {
  Pendiente: 'var(--sf-amber)',
  Asignada: 'var(--sf-sky)',
  'En Compra': 'var(--sf-violet)',
  Comprada: 'var(--sf-accent)',
  Entregada: 'var(--sf-accent)',
  Completada: 'var(--sf-text-subtle)',
};

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  requests,
  products,
  selectedRestaurantId,
  onGoToRequests,
  onOpenRequest,
}) => {
  const t = getTranslation(currentUser.language || 'es');
  const role = currentUser.role;

  // Scope to the active restaurant so the summary matches the header selector.
  const scoped = requests.filter((r) => r.restaurantId === selectedRestaurantId);

  // Role-specific stat cards
  let stats: Stat[] = [];
  let subtitle = t.dashAdminSummary;

  if (role === 'cocinero') {
    subtitle = t.dashCookSummary;
    const lowStock = products.filter(
      (p) => p.restaurantId === selectedRestaurantId && p.active && (p.currentStock ?? p.minThreshold + 1) < p.minThreshold
    ).length;
    const mine = scoped.filter(
      (r) => r.createdByUserId === currentUser.id && r.status !== 'Completada'
    ).length;
    const pending = scoped.filter((r) => r.status === 'Pendiente').length;
    const done = scoped.filter((r) => r.status === 'Completada' && isToday(r.completedAt)).length;
    stats = [
      { label: t.dashLowStock, value: lowStock, icon: AlertTriangle, color: 'var(--sf-rose)' },
      { label: t.dashMyActive, value: mine, icon: Boxes, color: 'var(--sf-sky)' },
      { label: t.dashPendingPickup, value: pending, icon: Clock, color: 'var(--sf-amber)' },
      { label: t.dashCompletedToday, value: done, icon: CheckCircle2, color: 'var(--sf-accent)' },
    ];
  } else if (role === 'comprador') {
    subtitle = t.dashBuyerSummary;
    const pending = scoped.filter((r) => r.status === 'Pendiente' && !r.assignedBuyerId).length;
    const shopping = scoped.filter(
      (r) => (r.status === 'Asignada' || r.status === 'En Compra') && r.assignedBuyerId === currentUser.id
    ).length;
    const urgent = scoped.filter((r) => r.urgent && r.status === 'Pendiente').length;
    const done = scoped.filter(
      (r) => r.assignedBuyerId === currentUser.id && (r.status === 'Comprada' || r.status === 'Completada') && isToday(r.purchasedAt)
    ).length;
    stats = [
      { label: t.dashPendingPickup, value: pending, icon: ShoppingCart, color: 'var(--sf-amber)' },
      { label: t.dashInShopping, value: shopping, icon: PackageCheck, color: 'var(--sf-violet)' },
      { label: t.dashUrgent, value: urgent, icon: Flame, color: 'var(--sf-rose)' },
      { label: t.dashCompletedToday, value: done, icon: CheckCircle2, color: 'var(--sf-accent)' },
    ];
  } else {
    subtitle = t.dashAdminSummary;
    const total = scoped.length;
    const pending = scoped.filter((r) => r.status === 'Pendiente').length;
    const inProgress = scoped.filter((r) => ['Asignada', 'En Compra'].includes(r.status)).length;
    const done = scoped.filter((r) => ['Comprada', 'Entregada', 'Completada'].includes(r.status)).length;
    stats = [
      { label: t.dashTotal, value: total, icon: Boxes, color: 'var(--sf-sky)' },
      { label: t.dashPendingPickup, value: pending, icon: Clock, color: 'var(--sf-amber)' },
      { label: t.dashInShopping, value: inProgress, icon: PackageCheck, color: 'var(--sf-violet)' },
      { label: t.dashCompletedToday, value: done, icon: CheckCircle2, color: 'var(--sf-accent)' },
    ];
  }

  const recent = [...scoped]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Greeting */}
      <div>
        <p className="sf-muted text-sm font-semibold">
          {t.dashHello}, {formatCleanName(currentUser.name).split(' ')[0]} 👋
        </p>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--sf-text)' }}>
          {subtitle}
        </h1>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="sf-card p-4 flex flex-col gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--sf-surface-2)', color: s.color }}
              >
                <Icon className="w-6 h-6" strokeWidth={2.4} />
              </div>
              <div>
                <div className="text-3xl font-black leading-none" style={{ color: 'var(--sf-text)' }}>
                  {s.value}
                </div>
                <div className="sf-muted text-xs font-bold mt-1">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="sf-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black" style={{ color: 'var(--sf-text)' }}>
            {t.dashRecent}
          </h2>
          <button
            onClick={onGoToRequests}
            className="flex items-center gap-0.5 text-xs font-bold sf-accent"
          >
            {t.dashViewAll}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="py-8 text-center sf-subtle text-sm font-semibold">{t.dashEmpty}</div>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onOpenRequest(r.id)}
                  className="w-full flex items-center gap-3 sf-inset px-3 py-3 text-left transition hover:brightness-95"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLORS[r.status] || 'var(--sf-text-subtle)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm" style={{ color: 'var(--sf-text)' }}>
                        #{r.requestNumber}
                      </span>
                      {r.urgent && (
                        <Flame className="w-3.5 h-3.5" style={{ color: 'var(--sf-rose)' }} />
                      )}
                    </div>
                    <div className="sf-muted text-xs truncate">
                      {r.items.length} {r.items.length === 1 ? t.labelItemSingular : t.labelItems}
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    style={{
                      background: 'var(--sf-surface)',
                      color: STATUS_COLORS[r.status] || 'var(--sf-text-subtle)',
                      border: '1px solid var(--sf-border)',
                    }}
                  >
                    {r.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
