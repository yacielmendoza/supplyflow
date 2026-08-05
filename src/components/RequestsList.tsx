import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SupplyRequest, RequestStatus, UserProfile } from '../types';
import { formatCleanName, formatUnitName } from '../lib/formatters';
import { getTranslation } from '../lib/translations';
import {
  Clock,
  User,
  ShoppingBag,
  CheckCircle2,
  Share2,
  Truck,
  Flame,
  Check,
  PackageCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Store,
  FileText,
  Lock,
} from 'lucide-react';
import { playAlertSound, generateWhatsAppLink, generateRequestWhatsAppSummary } from '../lib/notifications';
import { tint, STATUS_COLORS, getStatusLabels } from '../lib/colors';

interface RequestsListProps {
  requests: SupplyRequest[];
  currentUser: UserProfile;
  onClaimRequest: (requestId: string) => Promise<void>;
  onOpenShoppingMode: (request: SupplyRequest) => void;
  onUpdateStatus: (requestId: string, status: RequestStatus) => Promise<void>;
  selectedRestaurantId?: string;
  highlightedRequestId?: string | null;
  overdueRequestIds?: Set<string>;
}

export const RequestsList: React.FC<RequestsListProps> = ({
  requests,
  currentUser,
  onClaimRequest,
  onOpenShoppingMode,
  onUpdateStatus,
  selectedRestaurantId,
  highlightedRequestId,
  overdueRequestIds,
}) => {
  const t = getTranslation(currentUser.language ?? 'es');
  const shouldReduceMotion = useReducedMotion();

  const [filterTab, setFilterTab] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ALL'>('ALL');
  const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (highlightedRequestId) {
      setExpandedRequestIds((prev) => new Set(prev).add(highlightedRequestId));
      setFilterTab('ALL');
    }
  }, [highlightedRequestId]);

  const toggleExpand = (id: string) => {
    setExpandedRequestIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const inScope = (r: SupplyRequest) => !selectedRestaurantId || r.restaurantId === selectedRestaurantId;

  const { filteredRequests, countPending, countInProgress, countCompleted, countAll } = useMemo(() => {
    const scoped = requests.filter(inScope);
    return {
      filteredRequests: scoped.filter((r) => {
        if (filterTab === 'PENDING') return r.status === 'Pendiente';
        if (filterTab === 'IN_PROGRESS') return ['Asignada', 'En Compra', 'Comprada'].includes(r.status);
        if (filterTab === 'COMPLETED') return ['Entregada', 'Completada'].includes(r.status);
        return true;
      }),
      countPending: scoped.filter((r) => r.status === 'Pendiente').length,
      countInProgress: scoped.filter((r) => ['Asignada', 'En Compra', 'Comprada'].includes(r.status)).length,
      countCompleted: scoped.filter((r) => ['Entregada', 'Completada'].includes(r.status)).length,
      countAll: scoped.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, selectedRestaurantId, filterTab]);

  const statusLabels = useMemo(() => getStatusLabels(t), [t]);
  const getStatusLabel = (status: RequestStatus): string => statusLabels[status] ?? status;

  // Ticks once a minute so relative timestamps ("5 min ago") advance without a prop change.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const getTimeAgo = (dateStr: string) => {
    const mins = Math.floor((nowTick - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return t.timeJustNow;
    if (mins < 60) return `${t.timePrefix}${mins} ${t.timeMin}${t.timeSuffix}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${t.timePrefix}${hours} ${t.timeHour}${t.timeSuffix}`;
    return `${t.timePrefix}${Math.floor(hours / 24)} ${t.timeDay}${t.timeSuffix}`;
  };

  const isCook = currentUser.role === 'cocinero';
  const isBuyer = currentUser.role === 'comprador';
  const isAdmin = currentUser.role === 'admin';

  const title = isCook ? t.requestsTitleCook : isBuyer ? t.requestsTitleBuyer : t.requestsTitleAdmin;
  const subtitle = isCook ? t.requestsSubCook : isBuyer ? t.requestsSubBuyer : t.requestsSubAdmin;

  const FILTERS = useMemo(
    () => [
      { key: 'ALL' as const, label: t.filterAll, count: countAll, color: 'var(--sf-text-muted)' },
      { key: 'PENDING' as const, label: t.filterPending, count: countPending, color: 'var(--sf-amber)' },
      { key: 'IN_PROGRESS' as const, label: t.filterInProgress, count: countInProgress, color: 'var(--sf-violet)' },
      { key: 'COMPLETED' as const, label: t.filterCompleted, count: countCompleted, color: 'var(--sf-accent)' },
    ],
    [t, countAll, countPending, countInProgress, countCompleted]
  );

  const chipBtn =
    'px-4 min-h-11 rounded-xl text-sm font-black flex items-center justify-center transition disabled:opacity-60 active:scale-95 whitespace-nowrap';

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--sf-text)' }}>
          <ShoppingBag className="w-6 h-6 sf-accent" />
          {title}
          <span className="sf-subtle text-lg font-black">({filteredRequests.length})</span>
        </h1>
        <p className="sf-muted text-sm mt-0.5">{subtitle}</p>
      </div>

      {/* Filter tabs */}
      <div className="sf-inset p-1 grid grid-cols-4 gap-1">
        {FILTERS.map((f) => {
          const active = filterTab === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilterTab(f.key)}
              aria-pressed={active}
              className="py-2.5 px-1 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition"
              style={{
                background: active ? tint(f.color, 16) : 'transparent',
                color: active ? f.color : 'var(--sf-text-muted)',
                border: active ? `1px solid ${f.color}` : '1px solid transparent',
              }}
            >
              <span className="truncate">{f.label}</span>
              {f.count > 0 && (
                <span
                  className="px-1.5 rounded-full text-[10px] font-black"
                  style={{ background: active ? tint(f.color, 22) : 'var(--sf-surface)', color: active ? f.color : 'var(--sf-text-muted)' }}
                >
                  {f.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {filteredRequests.length === 0 ? (
        <div className="sf-card p-10 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto sf-subtle" />
          <div className="font-black text-base" style={{ color: 'var(--sf-text)' }}>{t.noRequests}</div>
          <p className="sf-muted text-sm max-w-sm mx-auto">{t.selectTabHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const totalItems = req.items.length;
            const purchasedItems = req.items.filter((i) => i.purchased).length;
            const progressPct = totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0;
            const isExpanded = expandedRequestIds.has(req.id);
            const isCompleted = ['Entregada', 'Completada'].includes(req.status);
            const isPending = req.status === 'Pendiente';
            const isAssignedToOtherBuyer = isBuyer && Boolean(req.assignedBuyerId) && req.assignedBuyerId !== currentUser.id;
            const isHighlighted = req.id === highlightedRequestId;
            const isOverdue = overdueRequestIds?.has(req.id) ?? false;
            const cleanCookName = formatCleanName(req.createdByUserName);
            const cleanBuyerName = formatCleanName(req.assignedBuyerName);
            const statusColor = STATUS_COLORS[req.status];

            // Card accent border by state priority
            const accent = isHighlighted
              ? 'var(--sf-accent)'
              : isOverdue
              ? 'var(--sf-rose)'
              : isCompleted
              ? 'var(--sf-border)'
              : statusColor;

            return (
              <div
                key={req.id}
                id={`request-card-${req.id}`}
                className="sf-card p-4 transition-all"
                style={{
                  borderColor: accent,
                  borderWidth: isHighlighted || isOverdue || (!isCompleted && isPending) ? '2px' : '1px',
                  opacity: isCompleted && !isHighlighted ? 0.85 : 1,
                  boxShadow: isHighlighted ? `0 0 0 4px ${tint('var(--sf-accent)', 30)}` : undefined,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="font-black text-base sm:text-lg" style={{ color: 'var(--sf-text)' }}>
                      #{req.requestNumber}
                    </span>
                    {req.urgent && !isCompleted && (
                      <span className="px-2 py-0.5 rounded-lg text-xs font-black uppercase flex items-center gap-1"
                        style={{ background: 'var(--sf-rose)', color: 'var(--sf-accent-contrast)' }}>
                        <Flame className="w-3.5 h-3.5" />
                        {t.tagUrgent}
                      </span>
                    )}
                    {isOverdue && (
                      <span className="px-2.5 py-1 rounded-lg font-black text-xs uppercase flex items-center gap-1 animate-pulse"
                        style={{ background: 'var(--sf-rose)', color: 'var(--sf-accent-contrast)' }}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        {t.tagOverdue}
                      </span>
                    )}
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide flex-shrink-0"
                    style={{ background: tint(statusColor, 14), color: statusColor, border: `1px solid ${tint(statusColor, 35)}` }}>
                    {getStatusLabel(req.status)}
                  </span>
                </div>

                {/* Subtitle */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs sm:text-sm pb-2.5"
                  style={{ borderBottom: '1px solid var(--sf-border)' }}>
                  <div className="flex items-center gap-2 flex-wrap sf-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 sf-subtle" />
                      {getTimeAgo(req.createdAt)}
                    </span>
                    <span>•</span>
                    <span>{t.labelRequestedBy}: <strong style={{ color: 'var(--sf-text)' }}>{cleanCookName}</strong></span>
                    {cleanBuyerName && (
                      <>
                        <span>•</span>
                        <span>{t.labelBuyer}: <strong className="sf-accent">{cleanBuyerName}</strong></span>
                      </>
                    )}
                  </div>
                  <div className="sf-inset text-xs font-bold px-2.5 py-1 rounded-lg" style={{ color: 'var(--sf-text)' }}>
                    {totalItems} {totalItems === 1 ? t.labelItemSingular : t.labelItems}
                    {purchasedItems > 0 && ` (${purchasedItems}/${totalItems} ${t.labelReady})`}
                  </div>
                </div>

                {/* Progress */}
                {['Asignada', 'En Compra', 'Comprada'].includes(req.status) && (
                  <div className="sf-inset mt-2.5 p-3">
                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold mb-1.5">
                      <span className="flex items-center gap-1.5 truncate" style={{ color: 'var(--sf-text)' }}>
                        <Store className="w-4 h-4 sf-accent flex-shrink-0" />
                        <span className="truncate">
                          {req.status === 'Comprada' ? t.shopPurchasedMsg : `${t.shopActiveMsg} (${cleanBuyerName || t.labelBuyer})`}
                        </span>
                      </span>
                      <span className="sf-accent font-black ml-2 flex-shrink-0">{progressPct}%</span>
                    </div>
                    <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'var(--sf-surface-2)' }}>
                      <div className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--sf-accent), var(--sf-accent-2))' }} />
                    </div>
                  </div>
                )}

                {/* Collapsed chips */}
                {!isExpanded && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                    {req.items.slice(0, 3).map((item) => (
                      <span key={item.id} className="sf-inset text-xs px-2.5 py-1 rounded-lg truncate max-w-[220px]"
                        style={{ color: item.purchased ? 'var(--sf-accent)' : 'var(--sf-text)', textDecoration: item.purchased ? 'line-through' : 'none' }}>
                        {item.productName} ({item.requestedQty} {formatUnitName(item.unit, t)})
                      </span>
                    ))}
                    {req.items.length > 3 && (
                      <button onClick={() => toggleExpand(req.id)} className="text-xs sf-accent font-extrabold px-2 py-1"
                        aria-expanded={isExpanded} aria-controls={isExpanded ? `request-details-${req.id}` : undefined}>
                        +{req.items.length - 3} {t.labelMore}...
                      </button>
                    )}
                  </div>
                )}

                {/* Expanded */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="expanded"
                      id={`request-details-${req.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--sf-border)' }}>
                        {req.notes && (
                          <div className="sf-inset px-3.5 py-2 text-xs sm:text-sm italic flex items-start gap-2" style={{ color: 'var(--sf-text)' }}>
                            <FileText className="w-4 h-4 sf-accent flex-shrink-0 mt-0.5" />
                            <span>&ldquo;{req.notes}&rdquo;</span>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="text-xs font-black uppercase tracking-wider sf-muted">
                            {t.labelRequiredItems} ({totalItems}):
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {req.items.map((item) => (
                              <div key={item.id} className="sf-inset px-3 py-2 text-xs sm:text-sm flex items-center justify-between gap-2"
                                style={item.purchased ? { background: tint('var(--sf-accent)', 12) } : undefined}>
                                <div className="flex items-center gap-2 min-w-0 truncate">
                                  {item.purchased ? (
                                    <Check className="w-4 h-4 sf-accent flex-shrink-0" />
                                  ) : (
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--sf-amber)' }} />
                                  )}
                                  <span className="truncate font-bold" style={{ color: item.purchased ? 'var(--sf-accent)' : 'var(--sf-text)', textDecoration: item.purchased ? 'line-through' : 'none' }}>
                                    {item.productName}
                                  </span>
                                </div>
                                <span className="sf-pill font-black px-2 py-0.5 rounded-lg text-xs flex-shrink-0" style={{ color: 'var(--sf-text)' }}>
                                  {item.requestedQty} {formatUnitName(item.unit, t)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer actions */}
                <div className="mt-3 pt-2.5 flex items-center justify-between gap-2 flex-wrap" style={{ borderTop: '1px solid var(--sf-border)' }}>
                  <button onClick={() => toggleExpand(req.id)} className="sf-btn-ghost px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition flex-shrink-0"
                    aria-expanded={isExpanded} aria-controls={isExpanded ? `request-details-${req.id}` : undefined}>
                    <span>{isExpanded ? t.btnHideDetails : t.btnViewDetails}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 sf-muted" /> : <ChevronDown className="w-4 h-4 sf-muted" />}
                  </button>

                  <div className="flex items-center gap-2 min-w-0 justify-end flex-wrap">
                    <a
                      href={generateWhatsAppLink(currentUser.phone, generateRequestWhatsAppSummary(req, currentUser.language ?? 'es'))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sf-btn-ghost w-11 h-11 rounded-xl sf-accent transition flex items-center justify-center flex-shrink-0"
                      title={t.labelShareWhatsApp}
                      aria-label={t.labelShareWhatsApp}
                    >
                      <Share2 className="w-4 h-4" />
                    </a>

                    {/* COOK */}
                    {isCook && (
                      <>
                        {['Comprada', 'Entregada'].includes(req.status) && (
                          <button onClick={() => { playAlertSound('success'); onUpdateStatus(req.id, 'Completada'); }}
                            className={`${chipBtn} sf-btn-accent gap-1.5 shadow-lg`}>
                            <PackageCheck className="w-4 h-4" />
                            {t.btnConfirmReceipt}
                          </button>
                        )}
                        {req.status === 'Pendiente' && <StatusPill color="var(--sf-amber)" icon={AlertCircle} label={t.statusWaiting} />}
                        {req.status === 'Asignada' && <StatusPill color="var(--sf-accent)" icon={Truck} label={`${t.statusOnTheWay} (${cleanBuyerName || t.labelBuyer})`} />}
                        {req.status === 'En Compra' && <StatusPill color="var(--sf-violet)" icon={ShoppingBag} label={`${t.statusAtStore} (${cleanBuyerName || t.labelBuyer})`} />}
                        {req.status === 'Completada' && <StatusPill color="var(--sf-accent)" icon={CheckCircle2} label={t.statusReceived} />}
                      </>
                    )}

                    {/* BUYER */}
                    {isBuyer && (
                      isAssignedToOtherBuyer ? (
                        <StatusPill color="var(--sf-text-subtle)" icon={Lock} label={`${t.labelTakenBy} ${cleanBuyerName || t.labelOtherBuyer}`} />
                      ) : (
                        <>
                          {req.status === 'Pendiente' && (
                            <button onClick={() => { playAlertSound('success'); onClaimRequest(req.id); }}
                              className={chipBtn} style={{ background: 'var(--sf-amber)', color: 'var(--sf-amber-contrast)' }}>
                              <User className="w-4 h-4 mr-1" />
                              {t.btnTakeOrder}
                            </button>
                          )}
                          {['Asignada', 'En Compra', 'Pendiente'].includes(req.status) && (
                            <button onClick={() => { playAlertSound('click'); onOpenShoppingMode(req); }}
                              className={`${chipBtn} sf-btn-accent gap-1`}>
                              <ShoppingBag className="w-4 h-4" />
                              {t.btnShopMode}
                            </button>
                          )}
                          {req.status === 'Comprada' && (
                            <button onClick={() => { playAlertSound('success'); onUpdateStatus(req.id, 'Entregada'); }}
                              className={`${chipBtn} sf-btn-accent gap-1`}>
                              <Truck className="w-4 h-4" />
                              {t.btnDelivered}
                            </button>
                          )}
                        </>
                      )
                    )}

                    {/* ADMIN */}
                    {isAdmin && (
                      <>
                        {req.status === 'Pendiente' && (
                          <button onClick={() => { playAlertSound('success'); onClaimRequest(req.id); }}
                            className={`${chipBtn} sf-btn-accent gap-1`}>
                            <User className="w-3.5 h-3.5" />
                            {t.btnAssignMe}
                          </button>
                        )}
                        <button onClick={() => { playAlertSound('click'); onOpenShoppingMode(req); }}
                          className={`${chipBtn} sf-btn-ghost gap-1 sf-accent`}>
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {t.btnShopMode}
                        </button>
                        {req.status === 'Comprada' && (
                          <button onClick={() => { playAlertSound('success'); onUpdateStatus(req.id, 'Completada'); }}
                            className={`${chipBtn} sf-btn-accent gap-1`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.btnComplete}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StatusPill: React.FC<{ color: string; icon: React.ElementType; label: string }> = ({ color, icon: Icon, label }) => (
  <div className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 min-w-0"
    style={{ background: tint(color, 14), color, border: `1px solid ${tint(color, 30)}` }}>
    <Icon className="w-4 h-4 flex-shrink-0" />
    <span className="truncate">{label}</span>
  </div>
);
