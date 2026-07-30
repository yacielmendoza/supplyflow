import React, { useState } from 'react';
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
import { playAlertSound, generateWhatsAppLink, generateRequestWhatsAppSummary } from '../lib/notifications';

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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedRestaurantId && r.restaurantId !== selectedRestaurantId) return false;
    if (filterTab === 'PENDING') return r.status === 'Pendiente';
    if (filterTab === 'IN_PROGRESS') return ['Asignada', 'En Compra', 'Comprada'].includes(r.status);
    if (filterTab === 'COMPLETED') return ['Entregada', 'Completada'].includes(r.status);
    return true;
  });

  const countPending = requests.filter((r) => (!selectedRestaurantId || r.restaurantId === selectedRestaurantId) && r.status === 'Pendiente').length;
  const countInProgress = requests.filter((r) => (!selectedRestaurantId || r.restaurantId === selectedRestaurantId) && ['Asignada', 'En Compra', 'Comprada'].includes(r.status)).length;
  const countCompleted = requests.filter((r) => (!selectedRestaurantId || r.restaurantId === selectedRestaurantId) && ['Entregada', 'Completada'].includes(r.status)).length;
  const countAll = requests.filter((r) => !selectedRestaurantId || r.restaurantId === selectedRestaurantId).length;

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'Pendiente':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Asignada':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'En Compra':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'Comprada':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'Entregada':
      case 'Completada':
        return 'bg-slate-800/80 text-emerald-400/90 border-slate-700/60 font-medium';
    }
  };

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

  const getRoleHeaderTitle = () => {
    if (isCook) return t.requestsTitleCook;
    if (isBuyer) return t.requestsTitleBuyer;
    return t.requestsTitleAdmin;
  };

  const getRoleSubtitle = () => {
    if (isCook) return t.requestsSubCook;
    if (isBuyer) return t.requestsSubBuyer;
    return t.requestsSubAdmin;
  };

  const isLight = currentUser.theme === 'light';

  return (
    <div className="space-y-4">
      {/* Header & Status Grouping Navigation Tabs */}
      <div className={`border p-3.5 sm:p-5 rounded-2xl shadow-sm space-y-3.5 transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className={`text-lg sm:text-xl font-black flex items-center space-x-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <span>{getRoleHeaderTitle()} ({filteredRequests.length})</span>
            </h2>
            <p className={`text-xs sm:text-sm mt-0.5 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {getRoleSubtitle()}
            </p>
          </div>

          <span className={`self-start sm:self-auto px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}>
            {t.headerRolePrefix}: {currentUser.role}
          </span>
        </div>

        {/* Grouping Filter Tabs */}
        <div className={`grid grid-cols-4 gap-1.5 sm:gap-2 p-1.5 rounded-xl border text-center ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <button
            onClick={() => setFilterTab('ALL')}
            className={`py-2 px-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition flex items-center justify-center space-x-1.5 ${
              filterTab === 'ALL'
                ? isLight ? 'bg-white text-slate-900 shadow-xs' : 'bg-slate-800 text-white shadow-sm'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t.filterAll}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-900 text-slate-300'
            }`}>
              {countAll}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('PENDING')}
            className={`py-2 px-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition flex items-center justify-center space-x-1.5 ${
              filterTab === 'PENDING'
                ? 'bg-amber-500/20 text-amber-700 border border-amber-400 font-black'
                : isLight ? 'text-slate-600 hover:text-amber-700' : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <span className="truncate">{t.filterPending}</span>
            {countPending > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                {countPending}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterTab('IN_PROGRESS')}
            className={`py-2 px-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition flex items-center justify-center space-x-1.5 ${
              filterTab === 'IN_PROGRESS'
                ? 'bg-orange-500/20 text-orange-700 border border-orange-400 font-black'
                : isLight ? 'text-slate-600 hover:text-orange-700' : 'text-slate-400 hover:text-orange-300'
            }`}
          >
            <span className="truncate">{t.filterInProgress}</span>
            {countInProgress > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-500 text-slate-950 text-xs font-black">
                {countInProgress}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterTab('COMPLETED')}
            className={`py-2 px-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition flex items-center justify-center space-x-1.5 ${
              filterTab === 'COMPLETED'
                ? 'bg-emerald-500/20 text-emerald-800 border border-emerald-400 font-black'
                : isLight ? 'text-slate-600 hover:text-emerald-700' : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            <span className="truncate">{t.filterCompleted}</span>
            {countCompleted > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/30 text-emerald-300'
              }`}>
                {countCompleted}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Requests Feed */}
      {filteredRequests.length === 0 ? (
        <div className={`border rounded-2xl p-8 text-center space-y-2 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800/80'
        }`}>
          <CheckCircle2 className={`w-10 h-10 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
          <div className={`font-bold text-base ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{t.noRequests}</div>
          <p className={`text-xs sm:text-sm max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {t.selectTabHint}
          </p>
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
            const isUrgentActive = req.urgent && !isCompleted;
            const isAssignedToOtherBuyer =
              isBuyer && Boolean(req.assignedBuyerId) && req.assignedBuyerId !== currentUser.id;

            const isHighlighted = req.id === highlightedRequestId;
            const isOverdue = overdueRequestIds?.has(req.id) ?? false;
            const cleanCookName = formatCleanName(req.createdByUserName);
            const cleanBuyerName = formatCleanName(req.assignedBuyerName);

            return (
              <div
                key={req.id}
                id={`request-card-${req.id}`}
                className={`border rounded-2xl p-3.5 sm:p-4 transition-all ${
                  isHighlighted
                    ? isLight
                      ? 'bg-emerald-50 border-2 border-emerald-500 ring-4 ring-emerald-300 shadow-xl'
                      : 'bg-slate-900 border-2 border-emerald-400 ring-4 ring-emerald-400/70 shadow-2xl shadow-emerald-500/30'
                    : isCompleted
                    ? isLight
                      ? 'bg-slate-50/80 border-slate-200 opacity-80 hover:opacity-100 shadow-none'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-80 hover:opacity-100 shadow-none'
                    : isOverdue
                    ? isLight
                      ? 'bg-red-50/90 border-2 border-red-500 shadow-md shadow-red-100 ring-1 ring-red-300'
                      : 'bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border-2 border-red-500/80 shadow-md shadow-red-950/30 ring-1 ring-red-500/20'
                    : isPending
                    ? isLight
                      ? 'bg-amber-50/80 border-2 border-amber-400 shadow-sm'
                      : 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border-2 border-amber-500/80 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/20'
                    : req.status === 'En Compra' || req.status === 'Asignada'
                    ? isLight
                      ? 'bg-orange-50/80 border-2 border-orange-400 shadow-sm'
                      : 'bg-slate-900 border-2 border-orange-500/60 shadow-orange-950/10'
                    : isUrgentActive
                    ? isLight
                      ? 'bg-rose-50/80 border-2 border-rose-400 shadow-sm'
                      : 'bg-slate-900 border-2 border-rose-500/60 shadow-rose-950/10'
                    : isLight
                      ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-wrap">
                    <span className={`font-black text-base sm:text-lg whitespace-nowrap ${
                      isLight ? 'text-slate-900' : 'text-slate-100'
                    }`}>
                      #{req.requestNumber}
                    </span>

                    <span className={`px-2.5 py-1 rounded-lg border font-extrabold text-xs sm:text-sm truncate max-w-[150px] sm:max-w-[220px] ${
                      isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-950 border-slate-800 text-emerald-400'
                    }`}>
                      {req.restaurantName}
                    </span>

                    {isPending && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs uppercase flex items-center space-x-1 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-slate-950" />
                        <span>{t.pending.toUpperCase()}</span>
                      </span>
                    )}

                    {req.urgent && (
                      <span
                        className={`px-2 py-0.5 rounded-lg text-xs font-black uppercase flex items-center space-x-1 flex-shrink-0 ${
                          isCompleted
                            ? isLight ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                            : 'bg-rose-500/20 text-rose-700 border border-rose-300 animate-pulse font-extrabold'
                        }`}
                      >
                        <Flame className={`w-3.5 h-3.5 ${isCompleted ? (isLight ? 'text-slate-500' : 'text-slate-400') : 'text-rose-600'}`} />
                        <span>{t.tagUrgent}</span>
                      </span>
                    )}

                    {isOverdue && (
                      <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-black text-xs uppercase flex items-center space-x-1 flex-shrink-0 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>ATRASADO</span>
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase border tracking-wide ${getStatusBadge(req.status)}`}
                    >
                      {getStatusLabel(req.status)}
                    </span>
                  </div>
                </div>

                {/* Subtitle Line */}
                <div className={`mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs sm:text-sm border-b pb-2.5 ${
                  isLight ? 'text-slate-600 border-slate-200' : 'text-slate-300 border-slate-800/60'
                }`}>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className={`flex items-center space-x-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                      <span>{getTimeAgo(req.createdAt)}</span>
                    </span>
                    <span>•</span>
                    <span>{t.labelRequestedBy}: <strong className={isLight ? 'text-slate-900 font-bold' : 'text-slate-100'}>{cleanCookName}</strong></span>
                    {cleanBuyerName && (
                      <>
                        <span>•</span>
                        <span>{t.labelBuyer}: <strong className={isLight ? 'text-emerald-800 font-bold' : 'text-emerald-300'}>{cleanBuyerName}</strong></span>
                      </>
                    )}
                  </div>

                  {/* Item count tag */}
                  <div className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-950 text-slate-200 border-slate-800'
                  }`}>
                    {totalItems} {totalItems === 1 ? t.labelItemSingular : t.labelItems}
                    {purchasedItems > 0 && ` (${purchasedItems}/${totalItems} ${t.labelReady})`}
                  </div>
                </div>

                {/* Progress Bar for active purchases */}
                {['Asignada', 'En Compra', 'Comprada'].includes(req.status) && (
                  <div className={`mt-2.5 p-2.5 sm:p-3 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800/80'
                  }`}>
                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold mb-1.5">
                      <span className={`flex items-center space-x-1.5 truncate ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        <Store className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">
                          {req.status === 'Comprada'
                            ? t.shopPurchasedMsg
                            : `${t.shopActiveMsg} (${cleanBuyerName || t.labelBuyer})`}
                        </span>
                      </span>
                      <span className="text-emerald-600 font-black ml-2 flex-shrink-0">
                        {progressPct}%
                      </span>
                    </div>
                    <div className={`w-full rounded-full h-2 overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Compact Product Chips (collapsed) */}
                {!isExpanded && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                    {req.items.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className={`text-xs px-2.5 py-1 rounded-lg border truncate max-w-[220px] ${
                          item.purchased
                            ? isLight
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 line-through'
                              : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300/80 line-through'
                            : isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-800 font-medium'
                              : 'bg-slate-950 border-slate-800 text-slate-200 font-medium'
                        }`}
                      >
                        {item.productName} ({item.requestedQty} {item.unit})
                      </span>
                    ))}
                    {req.items.length > 3 && (
                      <button
                        onClick={() => toggleExpand(req.id)}
                        className="text-xs text-emerald-600 hover:underline font-extrabold px-2 py-1"
                      >
                        +{req.items.length - 3} {t.labelMore}...
                      </button>
                    )}
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className={`mt-3 pt-3 border-t space-y-3 animate-fadeIn ${
                    isLight ? 'border-slate-200' : 'border-slate-800'
                  }`}>
                    {req.notes && (
                      <div className={`px-3.5 py-2 border rounded-xl text-xs sm:text-sm italic flex items-start space-x-2 ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-slate-200'
                      }`}>
                        <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>"{req.notes}"</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {t.labelRequiredItems} ({totalItems}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {req.items.map((item) => (
                          <div
                            key={item.id}
                            className={`px-3 py-2 rounded-xl text-xs sm:text-sm border flex items-center justify-between gap-2 ${
                              item.purchased
                                ? isLight
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 line-through'
                                  : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300/90 line-through'
                                : isLight
                                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                                  : 'bg-slate-950 border-slate-800 text-slate-100'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0 truncate">
                              {item.purchased ? (
                                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                              )}
                              <span className="truncate font-bold">{item.productName}</span>
                            </div>

                            <span className={`font-black px-2 py-0.5 rounded-lg border text-xs flex-shrink-0 ${
                              isLight ? 'bg-white text-slate-900 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-800'
                            }`}>
                              {item.requestedQty} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Action Footer */}
                <div className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-2 flex-wrap ${
                  isLight ? 'border-slate-200' : 'border-slate-800/80'
                }`}>
                  {/* Toggle Details Button */}
                  <button
                    onClick={() => toggleExpand(req.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                    }`}
                  >
                    <span>{isExpanded ? t.btnHideDetails : t.btnViewDetails}</span>
                    {isExpanded ? (
                      <ChevronUp className={`w-4 h-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
                    ) : (
                      <ChevronDown className={`w-4 h-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
                    )}
                  </button>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-auto">
                    {/* WhatsApp Share */}
                    <a
                      href={generateWhatsAppLink(currentUser.phone, generateRequestWhatsAppSummary(req))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2 rounded-xl border text-emerald-600 text-xs font-bold transition flex items-center ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200' : 'bg-slate-950 hover:bg-slate-800 border-slate-800'
                      }`}
                      title={t.labelShareWhatsApp}
                    >
                      <Share2 className="w-4 h-4" />
                    </a>

                    {/* COCINERO ACTIONS */}
                    {isCook && (
                      <>
                        {['Comprada', 'Entregada'].includes(req.status) && (
                          <button
                            onClick={() => {
                              playAlertSound('success');
                              onUpdateStatus(req.id, 'Completada');
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center space-x-1.5 shadow-xl shadow-emerald-500/40 animate-pulse ring-4 ring-emerald-400/80 transition scale-105"
                          >
                            <PackageCheck className="w-4 h-4 text-slate-950" />
                            <span>{t.btnConfirmReceipt}</span>
                          </button>
                        )}

                        {req.status === 'Pendiente' && (
                          <div className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-bold flex items-center space-x-1">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            <span>{t.statusWaiting}</span>
                          </div>
                        )}

                        {req.status === 'Asignada' && (
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-bold flex items-center space-x-1">
                            <Truck className="w-4 h-4 text-emerald-400 animate-pulse" />
                            <span>{t.statusOnTheWay} ({cleanBuyerName || t.labelBuyer})</span>
                          </div>
                        )}

                        {req.status === 'En Compra' && (
                          <div className="px-3 py-1.5 rounded-xl bg-orange-950/40 border border-orange-800/50 text-orange-300 text-xs font-bold flex items-center space-x-1">
                            <ShoppingBag className="w-4 h-4 text-orange-400 animate-pulse" />
                            <span>{t.statusAtStore} ({cleanBuyerName || t.labelBuyer})</span>
                          </div>
                        )}

                        {req.status === 'Completada' && (
                          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-extrabold flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t.statusReceived}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* COMPRADOR ACTIONS */}
                    {isBuyer && (
                      <>
                        {isAssignedToOtherBuyer ? (
                          <div
                            className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-400 font-bold text-xs flex items-center space-x-1.5 opacity-80 cursor-not-allowed select-none"
                            title={`${t.labelTakenBy} ${cleanBuyerName || t.labelOtherBuyer}`}
                          >
                            <Lock className="w-4 h-4 text-amber-400" />
                            <span>{t.labelTakenBy} {cleanBuyerName || t.labelOtherBuyer}</span>
                          </div>
                        ) : (
                          <>
                            {req.status === 'Pendiente' && (
                              <button
                                onClick={() => {
                                  playAlertSound('success');
                                  onClaimRequest(req.id);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center space-x-1 shadow-md transition"
                              >
                                <User className="w-4 h-4" />
                                <span>{t.btnTakeOrder}</span>
                              </button>
                            )}

                            {['Asignada', 'En Compra', 'Pendiente'].includes(req.status) && (
                              <button
                                onClick={() => {
                                  playAlertSound('click');
                                  onOpenShoppingMode(req);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center space-x-1 shadow-md transition"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-slate-950" />
                                <span>{t.btnShopMode}</span>
                              </button>
                            )}

                            {req.status === 'Comprada' && (
                              <button
                                onClick={() => {
                                  playAlertSound('success');
                                  onUpdateStatus(req.id, 'Entregada');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center space-x-1 shadow-md transition"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>{t.btnDelivered}</span>
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* ADMIN ACTIONS */}
                    {isAdmin && (
                      <>
                        {req.status === 'Pendiente' && (
                          <button
                            onClick={() => {
                              playAlertSound('success');
                              onClaimRequest(req.id);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1 shadow-md transition"
                          >
                            <User className="w-3 h-3" />
                            <span>{t.btnAssignMe}</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            playAlertSound('click');
                            onOpenShoppingMode(req);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center space-x-1 border border-slate-700 transition"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{t.btnShopMode}</span>
                        </button>

                        {req.status === 'Comprada' && (
                          <button
                            onClick={() => {
                              playAlertSound('success');
                              onUpdateStatus(req.id, 'Completada');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1 transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t.btnComplete}</span>
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
