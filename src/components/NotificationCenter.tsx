import React, { useState } from 'react';
import { SupplyRequest, RequestStatus } from '../types';
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
import { cn } from '../lib/cn';
import {
  Badge,
  Button,
  EmptyState,
  Sheet,
  StatusPill,
  Tabs,
  type TabItem,
  type Tone,
} from './ui';

interface NotificationCenterProps {
  onClose: () => void;
  sseConnected: boolean;
  currentUserPhone: string;
  currentUserRole?: 'cocinero' | 'comprador' | 'admin';
  currentUserLanguage?: 'es' | 'en';
  requests?: SupplyRequest[];
  onSelectRequest?: (requestId: string) => void;
}

const feedStatusTone = (status: RequestStatus): Tone =>
  status === 'Pendiente'
    ? 'warning'
    : status === 'En Compra' || status === 'Asignada'
    ? 'info'
    : status === 'Comprada'
    ? 'accent'
    : 'success';

const input =
  'w-full bg-surface border border-border-default rounded-control px-2.5 py-1.5 text-xs text-text-primary focus:outline-none';

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
  type Tab = 'FEED' | 'SETTINGS';

  const [activeTab, setActiveTab] = useState<Tab>('FEED');
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const [testTitle, setTestTitle] = useState('🚨 ATENCIÓN COCINA / COMPRADORES');
  const [testBody, setTestBody] = useState(
    'Solicitud #125 generada para Caddy Shack Grill - Falta Tocino y Pan'
  );
  const [simulatedSent, setSimulatedSent] = useState(false);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('restosupply_read_notifications');
      return saved ? new Set<string>(JSON.parse(saved) as string[]) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const persist = (ids: Set<string>) => {
    try {
      localStorage.setItem('restosupply_read_notifications', JSON.stringify(Array.from(ids)));
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

  const visibleRequests = requests.filter(
    (r) => !dismissedIds.has(r.id) && r.status !== 'Completada'
  );

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushGranted(granted);
    if (granted) {
      showLocalNotification(
        'Notificaciones Activadas',
        'Recibirás alertas instantáneas cuando haya pedidos pendientes.'
      );
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
  const urgentCount = visibleRequests.filter(
    (r) => r.urgent && r.status !== 'Completada'
  ).length;

  const tabs: TabItem<Tab>[] = [
    { id: 'FEED', label: t.notifTabFeed, icon: <Bell className="w-3.5 h-3.5" />, badge: visibleRequests.length },
    { id: 'SETTINGS', label: t.notifTabSettings, icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  const connectionRow = (
    <div className="p-2.5 bg-inset border border-border-default rounded-control flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 min-w-0" role="status">
        <span
          className={cn(
            'w-2.5 h-2.5 rounded-full flex-shrink-0',
            sseConnected ? 'bg-success animate-pulse' : 'bg-warning'
          )}
        />
        <span className="font-bold text-text-primary truncate">
          {sseConnected ? t.notifStatusActive : t.notifStatusConnecting}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {urgentCount > 0 && (
          <Badge tone="danger">
            <Flame className="w-3 h-3" />
            {urgentCount} {t.notifUrgentLabel}
          </Badge>
        )}
        {visibleRequests.length > 0 && (
          <button
            onClick={handleDismissAll}
            className="text-[10px] text-text-secondary hover:text-accent underline font-bold"
          >
            {t.notifMarkAllRead}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          {t.notifBandejaTitle}
        </span>
      }
      ariaLabel={t.notifBandejaTitle}
    >
      <div className="space-y-3.5">
        <Tabs items={tabs} value={activeTab} onChange={setActiveTab} className="w-full" aria-label={t.notifBandejaTitle} />

        {activeTab === 'FEED' && (
          <div className="space-y-3">
            {connectionRow}

            {visibleRequests.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 />}
                title={t.notifInboxEmpty}
                description={t.notifInboxEmptyText}
                action={
                  dismissedIds.size > 0 ? (
                    <button
                      onClick={handleClearDismissedHistory}
                      className="text-xs text-accent hover:underline font-bold"
                    >
                      {t.notifShowReadCount} ({dismissedIds.size})
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-2.5">
                {visibleRequests.map((req) => {
                  const isCompleted = ['Entregada', 'Completada'].includes(req.status);
                  const isUrgent = req.urgent && !isCompleted;
                  const itemSummary = req.items.map((i) => i.productName).slice(0, 3).join(', ');
                  const extraCount = req.items.length > 3 ? ` y ${req.items.length - 3} más` : '';
                  const formattedTime = new Date(req.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const cookNeedsAction =
                    currentUserRole === 'cocinero' && ['Comprada', 'Entregada'].includes(req.status);
                  const buyerNeedsAction =
                    currentUserRole === 'comprador' && req.status === 'Pendiente';

                  return (
                    <div
                      key={req.id}
                      onClick={() => onSelectRequest?.(req.id)}
                      className={cn(
                        'p-3 rounded-control border transition-all text-xs space-y-2 cursor-pointer group hover:border-accent/70',
                        isUrgent
                          ? 'bg-danger/10 border-danger/50'
                          : cookNeedsAction
                          ? 'bg-accent/10 border-2 border-accent/70'
                          : req.status === 'Pendiente'
                          ? 'bg-warning/10 border-warning/40'
                          : isCompleted
                          ? 'bg-inset border-border-default'
                          : 'bg-inset border-border-default'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap gap-y-1">
                            <span className="font-extrabold text-text-primary text-xs group-hover:text-accent transition">
                              Solicitud #{req.requestNumber}
                            </span>
                            <span className="text-[10px] text-text-secondary font-medium">
                              ({req.restaurantName})
                            </span>
                            {req.urgent && (
                              <Badge tone="danger" className="uppercase text-[9px]">
                                <Flame className="w-2.5 h-2.5" />
                                URGENTE
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-text-secondary font-medium">
                            {t.notifCreatedBy}{' '}
                            <strong className="text-text-primary">
                              {formatCleanName(req.createdByUserName)}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <StatusPill tone={feedStatusTone(req.status)}>{req.status}</StatusPill>
                          <button
                            onClick={(e) => handleDismiss(req.id, e)}
                            title={t.notifMarkReadTitle}
                            aria-label={t.notifMarkReadTitle}
                            className="p-1 text-text-muted hover:text-accent hover:bg-elevated rounded-control transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-text-secondary bg-surface p-2 rounded-control border border-border-default">
                        <strong className="text-text-primary">
                          {req.items.length} {t.notifItemCount}
                        </strong>{' '}
                        {itemSummary}
                        {extraCount}
                      </div>

                      {req.notes && (
                        <div className="text-[11px] text-accent bg-accent/10 p-2 rounded-control border border-accent/30 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1 italic">&ldquo;{req.notes}&rdquo;</div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-border-default text-[11px]">
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formattedTime}
                        </span>

                        {cookNeedsAction ? (
                          <span className="text-success font-extrabold flex items-center gap-1 bg-success/10 px-2 py-0.5 rounded-chip border border-success/40">
                            <PackageCheck className="w-3.5 h-3.5" />
                            {t.notifActionConfirmReceipt}
                          </span>
                        ) : buyerNeedsAction ? (
                          <span className="text-warning font-extrabold flex items-center gap-1 bg-warning/10 px-2 py-0.5 rounded-chip border border-warning/40">
                            <User className="w-3.5 h-3.5" />
                            {t.notifActionTakeOrder}
                          </span>
                        ) : (
                          <span className="text-text-secondary group-hover:text-accent font-bold flex items-center gap-1 transition">
                            {t.notifViewRequests}
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'SETTINGS' && (
          <div className="space-y-3.5">
            {connectionRow}

            <div className="bg-inset p-3 rounded-control border border-border-default space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-text-primary text-xs">
                    {t.notifPushBrowserTitle}
                  </div>
                  <p className="text-[11px] text-text-secondary">{t.notifPushBrowserDesc}</p>
                </div>
                <Button variant="primary" size="sm" onClick={handleEnablePush}>
                  {t.notifPushActivate}
                </Button>
              </div>
              {pushGranted !== null && (
                <div className="text-[10px] font-bold text-accent">
                  {pushGranted ? t.notifPushActive : t.notifPushBlocked}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-text-secondary">
                {t.notifSoundTestLabel}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => playAlertSound('urgent')}
                  leftIcon={<Volume2 className="w-3.5 h-3.5 text-danger" />}
                >
                  {t.notifChimeUrgent}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => playAlertSound('success')}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                >
                  {t.notifChimeSuccess}
                </Button>
              </div>
            </div>

            <div className="bg-inset p-3.5 rounded-control border border-border-default space-y-2 text-xs">
              <div className="font-bold text-text-primary flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-warning" />
                {t.notifSimulateLabel}
              </div>
              <label htmlFor="nc-title" className="sr-only">
                {t.notifSimulateLabel}
              </label>
              <input
                id="nc-title"
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className={input}
              />
              <input
                type="text"
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                aria-label={t.notifSimulateLabel}
                className={input}
              />
              <div className="flex items-center justify-between pt-1 gap-2">
                <a
                  href={generateWhatsAppLink(currentUserPhone, sampleWhatsAppText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-accent/10 border border-accent/40 text-accent font-bold rounded-control flex items-center gap-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {t.notifWhatsAppLink}
                </a>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendTestPush}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  {t.notifLaunchAlert}
                </Button>
              </div>
              {simulatedSent && (
                <div className="p-2 bg-success/10 text-success rounded-control border border-success/40 text-[11px] font-bold">
                  {t.notifSentSuccess}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};
