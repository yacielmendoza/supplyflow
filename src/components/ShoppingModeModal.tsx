import React, { useRef, useState } from 'react';
import { SupplyRequest, RequestItem, UserProfile } from '../types';
import { getTranslation } from '../lib/translations';
import {
  CheckCircle2,
  Check,
  ShoppingBag,
  Store,
  MessageSquare,
  Truck,
  X,
} from 'lucide-react';
import { playAlertSound } from '../lib/notifications';
import { cn } from '../lib/cn';
import { Badge, Button, IconButton, useDialogA11y } from './ui';

interface ShoppingModeModalProps {
  request: SupplyRequest;
  currentUser: UserProfile;
  onClose: () => void;
  onToggleItem: (itemId: string, purchased: boolean, note?: string) => Promise<void>;
  onCompleteShopping: () => Promise<void>;
}

export const ShoppingModeModal: React.FC<ShoppingModeModalProps> = ({
  request,
  currentUser,
  onClose,
  onToggleItem,
  onCompleteShopping,
}) => {
  const t = getTranslation(currentUser.language ?? 'es');
  const panelRef = useRef<HTMLDivElement>(null);
  const { onKeyDown } = useDialogA11y(true, onClose, panelRef);

  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('TODOS');
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    request.items.forEach((item) => {
      if (item.itemNote) initial[item.id] = item.itemNote;
    });
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supplierFallback = t.storeGeneral;
  const suppliers: string[] = Array.from(
    new Set(request.items.map((i) => i.suggestedSupplier || supplierFallback))
  );

  const filteredItems = request.items.filter((item) => {
    if (selectedSupplierFilter === 'TODOS') return true;
    return (item.suggestedSupplier || supplierFallback) === selectedSupplierFilter;
  });

  const totalItems = request.items.length;
  const purchasedCount = request.items.filter((i) => i.purchased).length;
  const progressPct = totalItems === 0 ? 0 : Math.round((purchasedCount / totalItems) * 100);

  const handleCheck = async (item: RequestItem) => {
    playAlertSound(item.purchased ? 'click' : 'success');
    await onToggleItem(item.id, !item.purchased, itemNotes[item.id]);
  };

  const handleSaveNote = async (itemId: string) => {
    const item = request.items.find((i) => i.id === itemId);
    if (item) await onToggleItem(itemId, item.purchased, itemNotes[itemId] || '');
    setEditingNoteItemId(null);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    playAlertSound('success');
    await onCompleteShopping();
    setIsSubmitting(false);
    onClose();
  };

  const supplierChip = (id: string, label: string, count: number) => (
    <button
      key={id}
      onClick={() => setSelectedSupplierFilter(id)}
      aria-pressed={selectedSupplierFilter === id}
      className={cn(
        'px-3 h-8 rounded-full text-xs font-bold transition whitespace-nowrap flex-shrink-0',
        selectedSupplierFilter === id
          ? 'bg-accent text-accent-contrast'
          : 'bg-elevated text-text-secondary hover:text-text-primary'
      )}
    >
      {label} ({count})
    </button>
  );

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${t.shopModeTitle}${request.requestNumber}`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 bg-app/95 backdrop-blur-md flex flex-col outline-none animate-fadeIn"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Sticky header */}
      <div className="bg-surface border-b border-border-default p-4 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-control bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-extrabold text-text-primary text-base truncate">
                  {t.shopModeTitle}
                  {request.requestNumber}
                </span>
                <Badge tone="accent" className="flex-shrink-0">
                  {request.restaurantName}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary">{t.shopModeSubtitle}</p>
            </div>
          </div>

          <IconButton
            label={currentUser.language === 'en' ? 'Close' : 'Cerrar'}
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </IconButton>
        </div>

        {/* Progress */}
        <div className="max-w-4xl mx-auto mt-3">
          <div className="flex justify-between items-center text-xs font-bold mb-1">
            <span className="text-text-secondary">{t.cartProgress}</span>
            <span className="text-accent">
              {purchasedCount} / {totalItems} {t.cartMarked} ({progressPct}%)
            </span>
          </div>
          <div
            className="w-full bg-elevated rounded-full h-3 overflow-hidden border border-border-default"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="bg-accent h-3 rounded-full transition-all duration-[var(--duration-base)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Supplier filter */}
        <div className="max-w-4xl mx-auto mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
            <Store className="w-3.5 h-3.5 text-accent" />
            {t.storeFilterLabel}
          </span>
          {supplierChip('TODOS', t.storeAll, request.items.length)}
          {suppliers.map((sup) =>
            supplierChip(
              sup,
              sup,
              request.items.filter((i) => (i.suggestedSupplier || supplierFallback) === sup).length
            )
          )}
        </div>
      </div>

      {/* Checklist body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => handleCheck(item)}
            className={cn(
              'p-4 rounded-card border transition-all cursor-pointer select-none flex items-start gap-3.5',
              item.purchased
                ? 'bg-success/10 border-success/40 opacity-80'
                : 'bg-surface border-border-default hover:border-border-strong shadow-md'
            )}
          >
            {/* Checkbox (keyboard-operable) */}
            <button
              type="button"
              role="checkbox"
              aria-checked={item.purchased}
              aria-label={item.productName}
              onClick={(e) => {
                e.stopPropagation();
                handleCheck(item);
              }}
              className={cn(
                'w-7 h-7 rounded-control flex items-center justify-center transition-all flex-shrink-0 mt-0.5',
                item.purchased
                  ? 'bg-accent text-accent-contrast ring-2 ring-accent/60'
                  : 'bg-elevated border-2 border-border-strong text-transparent'
              )}
            >
              <Check className="w-5 h-5 stroke-[3]" />
            </button>

            {/* Item info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'font-black text-base',
                    item.purchased ? 'text-success line-through' : 'text-text-primary'
                  )}
                >
                  {item.productName}
                </span>
                <Badge tone="accent" className="flex-shrink-0">
                  {item.requestedQty} {item.unit}s
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                <span className="bg-elevated px-1.5 py-0.5 rounded-chip text-[10px] uppercase font-mono">
                  {item.category}
                </span>
                <span aria-hidden="true">•</span>
                <span>
                  {t.storeFilterLabel} {item.suggestedSupplier || t.storeAny}
                </span>
              </div>

              {item.itemNote && (
                <div className="mt-2 text-xs text-warning bg-warning/10 p-2 rounded-control border border-warning/30">
                  {t.noteLabel} {item.itemNote}
                </div>
              )}

              <div
                className="mt-2 flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {editingNoteItemId === item.id ? (
                  <div className="flex items-center gap-2 w-full mt-1">
                    <input
                      type="text"
                      autoFocus
                      value={itemNotes[item.id] || ''}
                      onChange={(e) =>
                        setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveNote(item.id)}
                      placeholder={t.notePlaceholder}
                      aria-label={t.noteAdd}
                      className="flex-1 bg-inset border border-border-default rounded-control px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                    />
                    <Button size="sm" variant="primary" onClick={() => handleSaveNote(item.id)}>
                      {t.noteSave}
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingNoteItemId(item.id)}
                    className="text-[11px] text-text-secondary hover:text-accent flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{item.itemNote ? t.noteEdit : t.noteAdd}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky footer */}
      <div className="bg-surface border-t border-border-default p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <span>{t.shopNotifyMsg}</span>
          </div>

          <Button
            variant="success"
            size="lg"
            fullWidth
            className="sm:w-auto sm:px-8"
            onClick={handleFinish}
            loading={isSubmitting}
            leftIcon={<Truck className="w-4 h-4" />}
          >
            {isSubmitting ? t.shopProcessing : t.shopConfirmDelivery}
          </Button>
        </div>
      </div>
    </div>
  );
};
