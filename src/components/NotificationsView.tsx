import React, { useState } from 'react';
import { SupplyRequest } from '../types';
import { getTranslation } from '../lib/translations';
import { formatCleanName } from '../lib/formatters';
import {
  Bell,
  Volume2,
  Share2,
  CheckCircle2,
  Send,
  Zap,
  Flame,
  Clock,
  MessageSquare,
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
import { ViewHeader } from './ViewHeader';

interface NotificationsViewProps {
  onBack: () => void;
  sseConnected: boolean;
  currentUserPhone: string;
  currentUserRole?: 'cocinero' | 'comprador' | 'admin';
  currentUserLanguage?: 'es' | 'en';
  requests?: SupplyRequest[];
  onSelectRequest?: (requestId: string) => void;
}

/**
 * Full-screen notifications view (replaces the old modal). Two segments:
 * the live inbox feed and the alert/push settings. Themed via design tokens.
 */
export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onBack,
  sseConnected,
  currentUserPhone,
  currentUserRole,
  currentUserLanguage,
  requests = [],
  onSelectRequest,
}) => {
  const t = getTranslation(currentUserLanguage ?? 'es');
  const [segment, setSegment] = useState<'FEED' | 'SETTINGS'>('FEED');
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const [testTitle, setTestTitle] = useState('🚨 ATENCIÓN COCINA / COMPRADORES');
  const [testBody, setTestBody] = useState('Solicitud #125 generada para Caddy Shack Grill - Falta Tocino y Pan');
  const [simulatedSent, setSimulatedSent] = useState(false);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('restosupply_read_notifications');
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const persist = (next: Set<string>) => {
    try {
      localStorage.setItem('restosupply_read_notifications', JSON.stringify(Array.from(next)));
    } catch {
      /* ignore */
    }
  };

  const handleDismiss = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedIds((prev) => {
      const next = new Set<string>(prev);
      next.add(id);
      persist(next);
      return next;
    });
  };

  const handleDismissAll = () => {
    const allIds = new Set(requests.map((r) => r.id));
    setDismissedIds(allIds);
    persist(allIds);
  };

  const handleClearDismissedHistory = () => {
    setDismissedIds(new Set());
    try {
      localStorage.removeItem('restosupply_read_notifications');
    } catch {
      /* ignore */
    }
  };

  const visibleRequests = requests.filter((r) => !dismissedIds.has(r.id) && r.status !== 'Completada');
  const urgentCount = visibleRequests.filter((r) => r.urgent).length;

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

  const statusColors: Record<string, string> = {
    Pendiente: 'var(--sf-amber)',
    Asignada: 'var(--sf-sky)',
    'En Compra': 'var(--sf-violet)',
    Comprada: 'var(--sf-accent)',
    Entregada: 'var(--sf-accent)',
    Completada: 'var(--sf-text-subtle)',
  };

  return (
    <div className="min-h-screen sf-page">
      <ViewHeader
        title={t.notifBandejaTitle}
        onBack={onBack}
        right={
          segment === 'FEED' && visibleRequests.length > 0 ? (
            <button onClick={handleDismissAll} className="text-xs font-bold sf-accent">
              {t.notifMarkAllRead}
            </button>
          ) : undefined
        }
      />

      <div className="max-w-2xl mx-auto px-4 pb-16 pt-4 space-y-4">
        {/* Segmented control */}
        <div className="sf-inset p-1 grid grid-cols-2 gap-1">
          {([['FEED', Bell, t.notifTabFeed, visibleRequests.length], ['SETTINGS', Zap, t.notifTabSettings, 0]] as const).map(
            ([key, Icon, label, count]) => {
              const active = segment === key;
              return (
                <button
                  key={key}
                  onClick={() => setSegment(key)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl font-black text-sm transition"
                  style={{
                    background: active ? 'var(--sf-surface)' : 'transparent',
                    color: active ? 'var(--sf-accent)' : 'var(--sf-text-muted)',
                    boxShadow: active ? 'var(--sf-shadow-sm)' : 'none',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {count > 0 && (
                    <span className="ml-0.5 px-1.5 rounded-full text-[10px] font-black"
                      style={{ background: 'var(--sf-accent-soft)', color: 'var(--sf-accent)' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            }
          )}
        </div>

        {/* Connection status */}
        <div className="sf-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: sseConnected ? 'var(--sf-accent)' : 'var(--sf-amber)' }}
            />
            <span className="font-bold text-sm truncate" style={{ color: 'var(--sf-text)' }}>
              {sseConnected ? t.notifStatusActive : t.notifStatusConnecting}
            </span>
          </div>
          {segment === 'FEED' && urgentCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg"
              style={{ background: 'var(--sf-surface-2)', color: 'var(--sf-rose)' }}>
              <Flame className="w-3.5 h-3.5" />
              {urgentCount} {t.notifUrgentLabel}
            </span>
          )}
        </div>

        {/* FEED */}
        {segment === 'FEED' && (
          visibleRequests.length === 0 ? (
            <div className="sf-card p-10 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto sf-accent opacity-80" />
              <div className="text-base font-black" style={{ color: 'var(--sf-text)' }}>{t.notifInboxEmpty}</div>
              <p className="sf-muted text-sm max-w-xs mx-auto">{t.notifInboxEmptyText}</p>
              {dismissedIds.size > 0 && (
                <button onClick={handleClearDismissedHistory} className="text-sm sf-accent font-bold pt-1">
                  {t.notifShowReadCount} ({dismissedIds.size})
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {visibleRequests.map((req) => {
                const isCompleted = ['Entregada', 'Completada'].includes(req.status);
                const itemSummary = req.items.map((i) => i.productName).slice(0, 3).join(', ');
                const extraCount = req.items.length > 3 ? ` +${req.items.length - 3}` : '';
                const time = new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const cookNeedsAction = currentUserRole === 'cocinero' && ['Comprada', 'Entregada'].includes(req.status);
                const buyerNeedsAction = currentUserRole === 'comprador' && req.status === 'Pendiente';
                return (
                  <li key={req.id}>
                    <div
                      onClick={() => onSelectRequest?.(req.id)}
                      className="sf-card p-4 space-y-2.5 cursor-pointer transition hover:brightness-[0.98]"
                      style={req.urgent ? { borderColor: 'var(--sf-rose)' } : undefined}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm" style={{ color: 'var(--sf-text)' }}>
                              #{req.requestNumber}
                            </span>
                            <span className="sf-subtle text-xs truncate">{req.restaurantName}</span>
                            {req.urgent && <Flame className="w-3.5 h-3.5" style={{ color: 'var(--sf-rose)' }} />}
                          </div>
                          <div className="sf-muted text-xs mt-0.5">
                            {t.notifCreatedBy} <strong style={{ color: 'var(--sf-text)' }}>{formatCleanName(req.createdByUserName)}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase"
                            style={{ background: 'var(--sf-surface-2)', color: statusColors[req.status], border: '1px solid var(--sf-border)' }}>
                            {req.status}
                          </span>
                          <button
                            onClick={(e) => handleDismiss(req.id, e)}
                            title={t.notifMarkReadTitle}
                            className="p-1.5 rounded-lg sf-btn-ghost transition"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="sf-inset px-3 py-2 text-xs sf-muted">
                        <strong style={{ color: 'var(--sf-text)' }}>{req.items.length} {t.notifItemCount}</strong> {itemSummary}{extraCount}
                      </div>

                      {req.notes && (
                        <div className="flex items-start gap-1.5 text-xs italic px-3 py-2 rounded-xl"
                          style={{ background: 'var(--sf-accent-soft)', color: 'var(--sf-accent)' }}>
                          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span className="min-w-0">&ldquo;{req.notes}&rdquo;</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-xs" style={{ borderTop: '1px solid var(--sf-border)' }}>
                        <span className="sf-subtle flex items-center gap-1 pt-1">
                          <Clock className="w-3 h-3" />
                          {time}
                        </span>
                        {cookNeedsAction ? (
                          <span className="font-black flex items-center gap-1 pt-1" style={{ color: 'var(--sf-accent)' }}>
                            <PackageCheck className="w-3.5 h-3.5" />
                            {t.notifActionConfirmReceipt}
                          </span>
                        ) : buyerNeedsAction ? (
                          <span className="font-black flex items-center gap-1 pt-1" style={{ color: 'var(--sf-amber)' }}>
                            <User className="w-3.5 h-3.5" />
                            {t.notifActionTakeOrder}
                          </span>
                        ) : (
                          <span className="sf-muted font-bold flex items-center gap-1 pt-1">
                            {t.notifViewRequests}
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        )}

        {/* SETTINGS */}
        {segment === 'SETTINGS' && (
          <div className="space-y-4">
            <div className="sf-card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-black text-sm" style={{ color: 'var(--sf-text)' }}>{t.notifPushBrowserTitle}</div>
                <p className="sf-muted text-xs mt-0.5">{t.notifPushBrowserDesc}</p>
                {pushGranted !== null && (
                  <div className="text-xs font-bold mt-1 sf-accent">
                    {pushGranted ? t.notifPushActive : t.notifPushBlocked}
                  </div>
                )}
              </div>
              <button onClick={handleEnablePush} className="px-4 py-2 rounded-2xl font-black text-xs sf-btn-accent flex-shrink-0 whitespace-nowrap">
                {t.notifPushActivate}
              </button>
            </div>

            <div className="sf-card p-4 space-y-3">
              <label className="text-xs font-black uppercase tracking-wider sf-muted">{t.notifSoundTestLabel}</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => playAlertSound('urgent')}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold sf-btn-ghost">
                  <Volume2 className="w-4 h-4" style={{ color: 'var(--sf-rose)' }} />
                  {t.notifChimeUrgent}
                </button>
                <button onClick={() => playAlertSound('success')}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold sf-btn-ghost">
                  <CheckCircle2 className="w-4 h-4 sf-accent" />
                  {t.notifChimeSuccess}
                </button>
              </div>
            </div>

            <div className="sf-card p-4 space-y-3">
              <div className="font-black text-sm flex items-center gap-1.5" style={{ color: 'var(--sf-text)' }}>
                <Zap className="w-4 h-4" style={{ color: 'var(--sf-amber)' }} />
                {t.notifSimulateLabel}
              </div>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full sf-inset px-3 py-2.5 text-sm focus:outline-none"
                style={{ color: 'var(--sf-text)' }}
              />
              <input
                type="text"
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                className="w-full sf-inset px-3 py-2.5 text-sm focus:outline-none"
                style={{ color: 'var(--sf-text)' }}
              />
              <div className="flex items-center justify-between gap-2">
                <a
                  href={generateWhatsAppLink(currentUserPhone, sampleWhatsAppText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-2xl font-bold text-xs sf-btn-ghost flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  {t.notifWhatsAppLink}
                </a>
                <button onClick={handleSendTestPush} className="px-4 py-2 rounded-2xl font-black text-xs sf-btn-accent flex items-center gap-1.5">
                  <Send className="w-4 h-4" />
                  {t.notifLaunchAlert}
                </button>
              </div>
              {simulatedSent && (
                <div className="text-xs font-bold px-3 py-2 rounded-xl" style={{ background: 'var(--sf-accent-soft)', color: 'var(--sf-accent)' }}>
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
