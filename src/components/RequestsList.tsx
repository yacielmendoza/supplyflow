import React, { useEffect, useState } from 'react';
import { SupplyRequest, RequestStatus, UserProfile } from '../types';
import { formatCleanName } from '../lib/formatters';
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
import {
  playAlertSound,
  generateWhatsAppLink,
  generateRequestWhatsAppSummary,
} from '../lib/notifications';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/cn';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  StatusPill,
  Tabs,
  type TabItem,
  type Tone,
} from './ui';

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

type FilterTab = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ALL';

// Consolidated status → semantic tone (replaces the ad-hoc per-file color set).
const statusTone = (status: RequestStatus): Tone => {
  switch (status) {
    case 'Pendiente':
      return 'warning';
    case 'Asignada':
    case 'En Compra':
      return 'info';
    case 'Comprada':
      return 'accent';
    case 'Entregada':
    case 'Completada':
      return 'success';
  }
};

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

  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (highlightedRequestId) {
      setExpandedRequestIds((prev) => new Set(prev).add(highlightedRequestId));
      setFilterTab('ALL');
    }
  }, [highlightedRequestId]);

  const toggleExpand = (id: string) => {
    setExpandedRequestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const inThisRestaurant = (r: SupplyRequest) =>
    !selectedRestaurantId || r.restaurantId === selectedRestaurantId;

  const filteredRequests = requests.filter((r) => {
    if (!inThisRestaurant(r)) return false;
    if (filterTab === 'PENDING') return r.status === 'Pendiente';
    if (filterTab === 'IN_PROGRESS')
      return ['Asignada', 'En Compra', 'Comprada'].includes(r.status);
    if (filterTab === 'COMPLETED') return ['Entregada', 'Completada'].includes(r.status);
    return true;
  });

  const countPending = requests.filter(
    (r) => inThisRestaurant(r) && r.status === 'Pendiente'
  ).length;
  const countInProgress = requests.filter(
    (r) => inThisRestaurant(r) && ['Asignada', 'En Compra', 'Comprada'].includes(r.status)
  ).length;
  const countCompleted = requests.filter(
    (r) => inThisRestaurant(r) && ['Entregada', 'Completada'].includes(r.status)
  ).length;
  const countAll = requests.filter(inThisRestaurant).length;

  const getStatusLabel = (status: RequestStatus): string => {
    const map: Record<RequestStatus, string> = {
      Pendiente: t.pending,
      Asignada: t.assigned,
      'En Compra': t.inProgress,
      Comprada: t.purchased,
      Entregada: t.delivered,
      Completada: t.completed,
    };
    return map[status] ?? status;
  };

  const getTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t.timeJustNow;
    if (mins < 60) return `${t.timePrefix}${mins} ${t.timeMin}${t.timeSuffix}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${t.timePrefix}${hours} ${t.timeHour}${t.timeSuffix}`;
    return `${t.timePrefix}${Math.floor(hours / 24)} ${t.timeDay}${t.timeSuffix}`;
  };

  const isCook = currentUser.role === 'cocinero';
  const isBuyer = currentUser.role === 'comprador';
  const isAdmin = currentUser.role === 'admin';

  const roleTitle = isCook
    ? t.requestsTitleCook
    : isBuyer
    ? t.requestsTitleBuyer
    : t.requestsTitleAdmin;
  const roleSubtitle = isCook
    ? t.requestsSubCook
    : isBuyer
    ? t.requestsSubBuyer
    : t.requestsSubAdmin;

  const filterItems: TabItem<FilterTab>[] = [
    { id: 'ALL', label: t.filterAll, badge: countAll, badgeTone: 'neutral' },
    { id: 'PENDING', label: t.filterPending, badge: countPending, badgeTone: 'warning' },
    { id: 'IN_PROGRESS', label: t.filterInProgress, badge: countInProgress, badgeTone: 'info' },
    { id: 'COMPLETED', label: t.filterCompleted, badge: countCompleted, badgeTone: 'success' },
  ];

  // Card shell styling by state (token-based, theme-adaptive, deterministic).
  const cardShell = (state: {
    highlighted: boolean;
    completed: boolean;
    overdue: boolean;
    pending: boolean;
    active: boolean;
    urgent: boolean;
  }) => {
    const { highlighted, completed, overdue, pending, active, urgent } = state;
    if (highlighted)
      return 'bg-accent/5 border-accent ring-4 ring-accent/40 shadow-xl';
    if (completed)
      return 'bg-surface/60 border-border-default opacity-80 hover:opacity-100';
    if (overdue) return 'bg-danger/5 border-danger shadow-md';
    if (pending) return 'bg-warning/5 border-warning/70 shadow-sm';
    if (active) return 'bg-info/5 border-info/60 shadow-sm';
    if (urgent) return 'bg-danger/5 border-danger/60 shadow-sm';
    return 'bg-surface border-border-default hover:border-border-strong';
  };

  return (
    <div className="space-y-4">
      {/* Header & filter tabs */}
      <div className="rounded-card border border-border-default bg-surface p-3.5 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 text-text-primary">
              <ShoppingBag className="w-5 h-5 text-accent" />
              <span>
                {roleTitle} ({filteredRequests.length})
              </span>
            </h2>
            <p className="text-xs sm:text-sm mt-0.5 text-text-secondary">{roleSubtitle}</p>
          </div>

          <Badge tone="neutral" className="self-start sm:self-auto uppercase tracking-wider">
            {t.headerRolePrefix}: {currentUser.role}
          </Badge>
        </div>

        <Tabs
          items={filterItems}
          value={filterTab}
          onChange={setFilterTab}
          aria-label={roleTitle}
          className="w-full flex-wrap"
        />
      </div>

      {/* Feed */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 />}
          title={t.noRequests}
          description={t.selectTabHint}
        />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
          {filteredRequests.map((req) => {
            const totalItems = req.items.length;
            const purchasedItems = req.items.filter((i) => i.purchased).length;
            const progressPct =
              totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0;
            const isExpanded = expandedRequestIds.has(req.id);
            const isCompleted = ['Entregada', 'Completada'].includes(req.status);
            const isPending = req.status === 'Pendiente';
            const isActive = ['Asignada', 'En Compra'].includes(req.status);
            const isUrgentActive = req.urgent && !isCompleted;
            const isAssignedToOtherBuyer =
              isBuyer && Boolean(req.assignedBuyerId) && req.assignedBuyerId !== currentUser.id;
            const isHighlighted = req.id === highlightedRequestId;
            const isOverdue = overdueRequestIds?.has(req.id) ?? false;
            const cleanCookName = formatCleanName(req.createdByUserName);
            const cleanBuyerName = formatCleanName(req.assignedBuyerName);

            return (
              <motion.div
                key={req.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                id={`request-card-${req.id}`}
                className={cn(
                  'rounded-card border p-3.5 sm:p-4 transition-colors',
                  cardShell({
                    highlighted: isHighlighted,
                    completed: isCompleted && !isHighlighted,
                    overdue: isOverdue && !isHighlighted && !isCompleted,
                    pending: isPending && !isOverdue && !isHighlighted,
                    active: isActive && !isHighlighted && !isCompleted,
                    urgent: isUrgentActive && !isPending && !isActive && !isHighlighted,
                  })
                )}
              >
                {/* Card header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="font-black text-base sm:text-lg whitespace-nowrap text-text-primary">
                      #{req.requestNumber}
                    </span>

                    <Badge tone="accent" className="max-w-[150px] sm:max-w-[220px] truncate">
                      {req.restaurantName}
                    </Badge>

                    {isPending && (
                      <Badge tone="warning" solid className="uppercase">
                        <Clock className="w-3.5 h-3.5" />
                        {t.pending.toUpperCase()}
                      </Badge>
                    )}

                    {req.urgent && (
                      <Badge
                        tone={isCompleted ? 'neutral' : 'danger'}
                        className="uppercase"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        {t.tagUrgent}
                      </Badge>
                    )}

                    {isOverdue && (
                      <Badge tone="danger" solid className="uppercase animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" />
                        ATRASADO
                      </Badge>
                    )}
                  </div>

                  <StatusPill tone={statusTone(req.status)} className="flex-shrink-0">
                    {getStatusLabel(req.status)}
                  </StatusPill>
                </div>

                {/* Subtitle line */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs sm:text-sm border-b border-border-default pb-2.5 text-text-secondary">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{getTimeAgo(req.createdAt)}</span>
                    </span>
                    <span aria-hidden="true">•</span>
                    <span>
                      {t.labelRequestedBy}:{' '}
                      <strong className="text-text-primary font-bold">{cleanCookName}</strong>
                    </span>
                    {cleanBuyerName && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span>
                          {t.labelBuyer}:{' '}
                          <strong className="text-accent font-bold">{cleanBuyerName}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  <Badge tone="neutral">
                    {totalItems} {totalItems === 1 ? t.labelItemSingular : t.labelItems}
                    {purchasedItems > 0 && ` (${purchasedItems}/${totalItems} ${t.labelReady})`}
                  </Badge>
                </div>

                {/* Progress bar */}
                {['Asignada', 'En Compra', 'Comprada'].includes(req.status) && (
                  <div className="mt-2.5 p-2.5 sm:p-3 rounded-control border border-border-default bg-inset">
                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold mb-1.5">
                      <span className="flex items-center gap-1.5 truncate text-text-primary">
                        <Store className="w-4 h-4 text-accent flex-shrink-0" />
                        <span className="truncate">
                          {req.status === 'Comprada'
                            ? t.shopPurchasedMsg
                            : `${t.shopActiveMsg} (${cleanBuyerName || t.labelBuyer})`}
                        </span>
                      </span>
                      <span className="text-accent font-black ml-2 flex-shrink-0">
                        {progressPct}%
                      </span>
                    </div>
                    <div
                      className="w-full rounded-full h-2 overflow-hidden bg-elevated"
                      role="progressbar"
                      aria-valuenow={progressPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="bg-accent h-2 rounded-full transition-all duration-[var(--duration-slow)]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Compact chips (collapsed) */}
                {!isExpanded && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                    {req.items.slice(0, 3).map((item) => (
                      <Chip key={item.id} done={item.purchased} className="max-w-[220px]">
                        {item.productName} ({item.requestedQty} {item.unit})
                      </Chip>
                    ))}
                    {req.items.length > 3 && (
                      <button
                        onClick={() => toggleExpand(req.id)}
                        className="text-xs text-accent hover:underline font-extrabold px-2 py-1"
                      >
                        +{req.items.length - 3} {t.labelMore}...
                      </button>
                    )}
                  </div>
                )}

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border-default space-y-3 animate-fadeIn">
                    {req.notes && (
                      <div className="px-3.5 py-2 border border-border-default rounded-control bg-inset text-xs sm:text-sm italic flex items-start gap-2 text-text-primary">
                        <FileText className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                        <span>"{req.notes}"</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-text-secondary">
                        {t.labelRequiredItems} ({totalItems}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {req.items.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              'px-3 py-2 rounded-control text-xs sm:text-sm border flex items-center justify-between gap-2',
                              item.purchased
                                ? 'bg-success/10 border-success/30 text-success line-through'
                                : 'bg-inset border-border-default text-text-primary'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 truncate">
                              {item.purchased ? (
                                <Check className="w-4 h-4 text-success flex-shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0" />
                              )}
                              <span className="truncate font-bold">{item.productName}</span>
                            </div>
                            <Badge tone="neutral" className="flex-shrink-0">
                              {item.requestedQty} {item.unit}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action footer */}
                <div className="mt-3 pt-2.5 border-t border-border-default flex items-center justify-between gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleExpand(req.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`request-card-${req.id}`}
                    rightIcon={
                      isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    }
                  >
                    {isExpanded ? t.btnHideDetails : t.btnViewDetails}
                  </Button>

                  <div className="flex items-center gap-2 ml-auto">
                    {/* WhatsApp share */}
                    <a
                      href={generateWhatsAppLink(
                        currentUser.phone,
                        generateRequestWhatsAppSummary(req)
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t.labelShareWhatsApp}
                      title={t.labelShareWhatsApp}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-control border border-border-default bg-elevated text-accent hover:text-accent-contrast hover:bg-accent transition"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>

                    {/* COCINERO */}
                    {isCook && (
                      <>
                        {['Comprada', 'Entregada'].includes(req.status) && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => {
                              playAlertSound('success');
                              onUpdateStatus(req.id, 'Completada');
                            }}
                            leftIcon={<PackageCheck className="w-4 h-4" />}
                          >
                            {t.btnConfirmReceipt}
                          </Button>
                        )}
                        {req.status === 'Pendiente' && (
                          <StatusPill tone="warning" icon={<AlertCircle />}>
                            {t.statusWaiting}
                          </StatusPill>
                        )}
                        {req.status === 'Asignada' && (
                          <StatusPill tone="info" icon={<Truck />}>
                            {t.statusOnTheWay} ({cleanBuyerName || t.labelBuyer})
                          </StatusPill>
                        )}
                        {req.status === 'En Compra' && (
                          <StatusPill tone="info" icon={<ShoppingBag />}>
                            {t.statusAtStore} ({cleanBuyerName || t.labelBuyer})
                          </StatusPill>
                        )}
                        {req.status === 'Completada' && (
                          <StatusPill tone="success" icon={<CheckCircle2 />}>
                            {t.statusReceived}
                          </StatusPill>
                        )}
                      </>
                    )}

                    {/* COMPRADOR */}
                    {isBuyer && (
                      <>
                        {isAssignedToOtherBuyer ? (
                          <StatusPill
                            tone="neutral"
                            icon={<Lock className="text-warning" />}
                            className="opacity-80"
                            title={`${t.labelTakenBy} ${cleanBuyerName || t.labelOtherBuyer}`}
                          >
                            {t.labelTakenBy} {cleanBuyerName || t.labelOtherBuyer}
                          </StatusPill>
                        ) : (
                          <>
                            {req.status === 'Pendiente' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  playAlertSound('success');
                                  onClaimRequest(req.id);
                                }}
                                leftIcon={<User className="w-4 h-4" />}
                              >
                                {t.btnTakeOrder}
                              </Button>
                            )}
                            {['Asignada', 'En Compra', 'Pendiente'].includes(req.status) && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => {
                                  playAlertSound('click');
                                  onOpenShoppingMode(req);
                                }}
                                leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
                              >
                                {t.btnShopMode}
                              </Button>
                            )}
                            {req.status === 'Comprada' && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => {
                                  playAlertSound('success');
                                  onUpdateStatus(req.id, 'Entregada');
                                }}
                                leftIcon={<Truck className="w-3.5 h-3.5" />}
                              >
                                {t.btnDelivered}
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* ADMIN */}
                    {isAdmin && (
                      <>
                        {req.status === 'Pendiente' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => {
                              playAlertSound('success');
                              onClaimRequest(req.id);
                            }}
                            leftIcon={<User className="w-3 h-3" />}
                          >
                            {t.btnAssignMe}
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            playAlertSound('click');
                            onOpenShoppingMode(req);
                          }}
                          leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
                        >
                          {t.btnShopMode}
                        </Button>
                        {req.status === 'Comprada' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => {
                              playAlertSound('success');
                              onUpdateStatus(req.id, 'Completada');
                            }}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            {t.btnComplete}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
