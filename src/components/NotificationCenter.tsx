import React, { useState } from 'react';
import { SupplyRequest } from '../types';
import { getTranslation } from '../lib/translations';
import { formatCleanName } from '../lib/formatters';
import {
  Bell,
  Volume2,
  Share2,
  CheckCircle2,
  X,
  Send,
  Zap,
  Flame,
  Clock,
  MessageSquare,
  Settings,
  ArrowRight,
  Check,
  PackageCheck,
  User,
} from 'lucide-react';
import {
  playAlertSound,
  requestPushPermission,
  showLocalNotification,
  generateWhatsAppLink,
} from '../lib/notifications';
import { triggerNotification } from '../lib/api';

interface NotificationCenterProps {
  onClose: () => void;
  sseConnected: boolean;
  currentUserPhone: string;
  currentUserRole?: 'cocinero' | 'comprador' | 'admin';
  currentUserLanguage?: 'es' | 'en';
  requests?: SupplyRequest[];
  onSelectRequest?: (requestId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onClose,
  sseConnected,
  currentUserPhone,
  currentUserRole,
  currentUserLanguage,
  requests = [],
  onSelectRequest,
}) => {
  const t = getTranslation(currentUserLanguage ?? 'es');

  const [activeTab, setActiveTab] = useState<'FEED' | 'SETTINGS'>('FEED');
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const [testTitle, setTestTitle] = useState('🚨 ATENCIÓN COCINA / COMPRADORES');
  const [testBody, setTestBody] = useState('Solicitud #125 generada para Caddy Shack Grill - Falta Tocino y Pan');
  const [simulatedSent, setSimulatedSent] = useState(false);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('restosupply_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleDismiss = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('restosupply_read_notifications', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleDismissAll = () => {
    const allIds = new Set(requests.map((r) => r.id));
    setDismissedIds(allIds);
    try {
      localStorage.setItem('restosupply_read_notifications', JSON.stringify(Array.from(allIds)));
    } catch {
      // ignore
    }
  };

  const handleClearDismissedHistory = () => {
    setDismissedIds(new Set());
    try {
      localStorage.removeItem('restosupply_read_notifications');
    } catch {
      // ignore
    }
  };

  const visibleRequests = requests.filter((r) => !dismissedIds.has(r.id));

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushGranted(granted);
    if (granted) {
      showLocalNotification('Notificaciones Activadas', 'Recibirás alertas instantáneas cuando haya pedidos pendientes.');
    }
  };

  const handleSendTestPush = async () => {
    playAlertSound('urgent');
    showLocalNotification(testTitle, testBody);
    await triggerNotification(testTitle, testBody);
    setSimulatedSent(true);
    setTimeout(() => setSimulatedSent(false), 3000);
  };

  const sampleWhatsAppText = `🚨 *RESTOSUPPLY ALERTA DE COMPRA*\nNueva solicitud urgente de Caddy Shack Grill.\nVer en app: ${window.location.href}`;

  const urgentCount = visibleRequests.filter((r) => r.urgent && r.status !== 'Completada').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 sm:p-5 space-y-3.5 shadow-2xl my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 flex-shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <Bell className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <h3 className="font-extrabold text-white text-sm sm:text-base truncate">{t.notifBandejaTitle}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs flex-shrink-0">
          <button
            onClick={() => setActiveTab('FEED')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-extrabold flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'FEED'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{t.notifTabFeed}</span>
            {visibleRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] font-black rounded-full">
                {visibleRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-extrabold flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'SETTINGS'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t.notifTabSettings}</span>
          </button>
        </div>

        {/* TAB 1: NOTIFICATIONS FEED */}
        {activeTab === 'FEED' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-[280px]">
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="font-bold text-slate-200 truncate">
                  {sseConnected ? t.notifStatusActive : t.notifStatusConnecting}
                </span>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {urgentCount > 0 && (
                  <span className="text-[10px] bg-rose-950/80 text-rose-300 px-2 py-0.5 rounded border border-rose-800 font-extrabold flex items-center space-x-1">
                    <Flame className="w-3 h-3 text-rose-400" />
                    <span>{urgentCount} {t.notifUrgentLabel}</span>
                  </span>
                )}

                {visibleRequests.length > 0 && (
                  <button
                    onClick={handleDismissAll}
                    className="text-[10px] text-slate-400 hover:text-emerald-400 underline font-bold"
                  >
                    {t.notifMarkAllRead}
                  </button>
                )}
              </div>
            </div>

            {visibleRequests.length === 0 ? (
              <div className="text-center py-10 space-y-3 bg-slate-950/50 rounded-xl border border-slate-800/60 p-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                <div className="text-sm font-extrabold text-slate-200">{t.notifInboxEmpty}</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {t.notifInboxEmptyText}
                </p>
                {dismissedIds.size > 0 && (
                  <button
                    onClick={handleClearDismissedHistory}
                    className="text-xs text-emerald-400 hover:underline font-bold pt-2 block mx-auto"
                  >
                    {t.notifShowReadCount} ({dismissedIds.size})
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleRequests.map((req) => {
                  const isPending = req.status === 'Pendiente';
                  const isCompleted = ['Entregada', 'Completada'].includes(req.status);
                  const isUrgent = req.urgent && !isCompleted;
                  const itemSummary = req.items.map((i) => i.productName).slice(0, 3).join(', ');
                  const extraCount = req.items.length > 3 ? ` y ${req.items.length - 3} más` : '';

                  const formattedTime = new Date(req.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const cookNeedsAction = currentUserRole === 'cocinero' && ['Comprada', 'Entregada'].includes(req.status);
                  const buyerNeedsAction = currentUserRole === 'comprador' && req.status === 'Pendiente';

                  return (
                    <div
                      key={req.id}
                      onClick={() => onSelectRequest && onSelectRequest(req.id)}
                      className={`p-3 rounded-xl border transition-all text-xs space-y-2 cursor-pointer group hover:border-emerald-500/70 ${
                        isUrgent
                          ? 'bg-rose-950/20 border-rose-600/50'
                          : cookNeedsAction
                          ? 'bg-emerald-950/20 border-2 border-emerald-500/80 shadow-md shadow-emerald-950/20'
                          : isPending
                          ? 'bg-amber-950/20 border-amber-600/40'
                          : isCompleted
                          ? 'bg-slate-950/60 border-slate-800/80'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="font-extrabold text-white text-xs group-hover:text-emerald-400 transition">
                              Solicitud #{req.requestNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({req.restaurantName})
                            </span>
                            {req.urgent && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-black uppercase flex items-center space-x-1">
                                <Flame className="w-2.5 h-2.5 text-rose-400" />
                                <span>URGENTE</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-300 font-medium">
                            {t.notifCreatedBy} <strong className="text-slate-100">{formatCleanName(req.createdByUserName)}</strong>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              isPending
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : req.status === 'En Compra'
                                ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                                : 'bg-slate-800 text-emerald-400 border-slate-700'
                            }`}
                          >
                            {req.status}
                          </span>

                          <button
                            onClick={(e) => handleDismiss(req.id, e)}
                            title={t.notifMarkReadTitle}
                            className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <strong className="text-slate-300">{req.items.length} {t.notifItemCount}</strong> {itemSummary}{extraCount}
                      </div>

                      {req.notes && (
                        <div className="text-[11px] text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/50 flex items-start space-x-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1 italic">
                            &ldquo;{req.notes}&rdquo;
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                        <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formattedTime}</span>
                        </span>

                        {cookNeedsAction ? (
                          <div className="text-emerald-400 font-extrabold flex items-center space-x-1 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 animate-pulse">
                            <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{t.notifActionConfirmReceipt}</span>
                          </div>
                        ) : buyerNeedsAction ? (
                          <div className="text-amber-300 font-extrabold flex items-center space-x-1 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span>{t.notifActionTakeOrder}</span>
                          </div>
                        ) : (
                          <div className="text-slate-400 group-hover:text-emerald-400 font-bold flex items-center space-x-1 transition">
                            <span>{t.notifViewRequests}</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SETTINGS & PUSH SIMULATOR */}
        {activeTab === 'SETTINGS' && (
          <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="font-bold text-slate-200 truncate">
                  {t.notifSsePrefix} {sseConnected ? t.notifSseActive : t.notifStatusConnecting}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-mono flex-shrink-0">
                Push / Stream
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-slate-200 text-xs">{t.notifPushBrowserTitle}</div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">
                    {t.notifPushBrowserDesc}
                  </p>
                </div>

                <button
                  onClick={handleEnablePush}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex-shrink-0 whitespace-nowrap shadow-sm"
                >
                  {t.notifPushActivate}
                </button>
              </div>

              {pushGranted !== null && (
                <div className="text-[10px] font-bold text-emerald-400">
                  {pushGranted ? t.notifPushActive : t.notifPushBlocked}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                {t.notifSoundTestLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => playAlertSound('urgent')}
                  className="px-2.5 py-2 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition"
                >
                  <Volume2 className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  <span className="truncate">{t.notifChimeUrgent}</span>
                </button>

                <button
                  onClick={() => playAlertSound('success')}
                  className="px-2.5 py-2 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{t.notifChimeSuccess}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{t.notifSimulateLabel}</span>
              </div>

              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />

              <input
                type="text"
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />

              <div className="flex items-center justify-between pt-1">
                <a
                  href={generateWhatsAppLink(currentUserPhone, sampleWhatsAppText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold rounded-lg flex items-center space-x-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{t.notifWhatsAppLink}</span>
                </a>

                <button
                  onClick={handleSendTestPush}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-lg flex items-center space-x-1 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t.notifLaunchAlert}</span>
                </button>
              </div>

              {simulatedSent && (
                <div className="p-2 bg-emerald-950 text-emerald-300 rounded border border-emerald-700 text-[11px] font-bold">
                  {t.notifSentSuccess}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
