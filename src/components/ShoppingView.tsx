import React, { useState } from 'react';
import { SupplyRequest, RequestItem, UserProfile } from '../types';
import { getTranslation } from '../lib/translations';
import {
  CheckCircle2,
  Check,
  Store,
  MessageSquare,
  Truck,
} from 'lucide-react';
import { playAlertSound } from '../lib/notifications';
import { ViewHeader } from './ViewHeader';

interface ShoppingViewProps {
  request: SupplyRequest;
  currentUser: UserProfile;
  onClose: () => void;
  onToggleItem: (itemId: string, purchased: boolean, note?: string) => Promise<void>;
  onCompleteShopping: () => Promise<void>;
}

/**
 * Full-screen shopping view (replaces ShoppingModeModal). Progress bar, supplier
 * filter and an interactive checklist optimized for store aisles, with a fixed
 * confirm action. Themed via design tokens.
 */
export const ShoppingView: React.FC<ShoppingViewProps> = ({
  request,
  currentUser,
  onClose,
  onToggleItem,
  onCompleteShopping,
}) => {
  const t = getTranslation(currentUser.language ?? 'es');

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
  const suppliers = Array.from(new Set(request.items.map((i) => i.suggestedSupplier || supplierFallback)));

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
    const noteText = itemNotes[itemId] || '';
    const item = request.items.find((i) => i.id === itemId);
    if (item) await onToggleItem(itemId, item.purchased, noteText);
    setEditingNoteItemId(null);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    playAlertSound('success');
    await onCompleteShopping();
    setIsSubmitting(false);
    onClose();
  };

  const filterBtn = (active: boolean): React.CSSProperties =>
    active
      ? { background: 'var(--sf-accent)', color: 'var(--sf-accent-contrast)' }
      : { background: 'var(--sf-surface-2)', color: 'var(--sf-text-muted)', border: '1px solid var(--sf-border)' };

  return (
    <div className="min-h-screen sf-page flex flex-col">
      <ViewHeader
        title={`${t.shopModeTitle}${request.requestNumber}`}
        onBack={onClose}
        backLabel={t.back}
        right={
          <span className="text-xs font-black sf-accent">{progressPct}%</span>
        }
      />

      {/* Progress + supplier filter */}
      <div
        className="sticky z-30"
        style={{
          top: 'calc(64px + env(safe-area-inset-top))',
          background: 'color-mix(in srgb, var(--sf-surface) 88%, transparent)',
          borderBottom: '1px solid var(--sf-border)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="sf-muted text-xs font-bold uppercase tracking-wider truncate">
                {request.restaurantName}
              </span>
              <span className="text-xs font-black flex-shrink-0" style={{ color: 'var(--sf-text)' }}>
                <span className="sf-accent">{purchasedCount}</span>
                <span className="sf-subtle"> / {totalItems}</span>
                <span className="sf-muted"> · {progressPct}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--sf-surface-2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--sf-accent), var(--sf-accent-2))' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="sf-subtle text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
              <Store className="w-3.5 h-3.5 sf-accent" />
            </span>
            <button
              onClick={() => setSelectedSupplierFilter('TODOS')}
              aria-pressed={selectedSupplierFilter === 'TODOS'}
              className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition"
              style={filterBtn(selectedSupplierFilter === 'TODOS')}
            >
              {t.storeAll} ({request.items.length})
            </button>
            {suppliers.map((sup) => {
              const count = request.items.filter((i) => (i.suggestedSupplier || supplierFallback) === sup).length;
              return (
                <button
                  key={sup}
                  onClick={() => setSelectedSupplierFilter(sup)}
                  aria-pressed={selectedSupplierFilter === sup}
                  className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition"
                  style={filterBtn(selectedSupplierFilter === sup)}
                >
                  {sup} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-2.5" style={{ paddingBottom: 'calc(112px + env(safe-area-inset-bottom))' }}>
        {filteredItems.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            aria-pressed={item.purchased}
            onClick={() => handleCheck(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCheck(item);
              }
            }}
            className="sf-card p-4 flex items-start gap-3.5 cursor-pointer select-none transition"
            style={item.purchased ? { borderColor: 'var(--sf-accent)', background: 'var(--sf-accent-soft)' } : undefined}
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition"
              style={
                item.purchased
                  ? { background: 'var(--sf-accent)', color: 'var(--sf-accent-contrast)' }
                  : { background: 'var(--sf-surface-2)', border: '2px solid var(--sf-border-strong)', color: 'transparent' }
              }
            >
              <Check className="w-5 h-5 stroke-[3]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="font-black text-base"
                  style={{
                    color: item.purchased ? 'var(--sf-accent)' : 'var(--sf-text)',
                    textDecoration: item.purchased ? 'line-through' : 'none',
                  }}
                >
                  {item.productName}
                </span>
                <span className="sf-pill px-2.5 py-1 rounded-lg font-extrabold text-xs sf-accent flex-shrink-0">
                  {item.requestedQty} {item.unit}s
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs sf-muted mt-1">
                <span className="sf-inset px-1.5 py-0.5 rounded-lg text-[10px] uppercase font-mono">{item.category}</span>
                <span>•</span>
                <span className="truncate">{item.suggestedSupplier || t.storeAny}</span>
              </div>

              {item.itemNote && (
                <div className="mt-2 text-xs px-2 py-1.5 rounded-lg" style={{ background: 'var(--sf-surface-2)', color: 'var(--sf-amber)' }}>
                  {t.noteLabel} {item.itemNote}
                </div>
              )}

              <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                {editingNoteItemId === item.id ? (
                  <div className="flex items-center gap-2 w-full mt-1">
                    <input
                      type="text"
                      value={itemNotes[item.id] || ''}
                      onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveNote(item.id);
                        }
                      }}
                      onBlur={() => handleSaveNote(item.id)}
                      placeholder={t.notePlaceholder}
                      autoFocus
                      className="flex-1 sf-inset px-2.5 min-h-11 text-xs focus:outline-none"
                      style={{ color: 'var(--sf-text)' }}
                    />
                    <button
                      onClick={() => handleSaveNote(item.id)}
                      className="px-3 min-h-11 rounded-lg text-xs font-bold sf-btn-accent transition active:scale-95"
                    >
                      {t.noteSave}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingNoteItemId(item.id)}
                    className="px-2 min-h-11 -mx-2 rounded-lg text-[11px] sf-muted flex items-center gap-1 hover:brightness-125 transition active:scale-95"
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

      {/* Fixed confirm bar */}
      <div
        className="fixed bottom-0 inset-x-0 z-30 safe-bottom"
        style={{
          background: 'color-mix(in srgb, var(--sf-surface) 92%, transparent)',
          borderTop: '1px solid var(--sf-border)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs sf-muted flex-1 min-w-0">
            <CheckCircle2 className="w-5 h-5 sf-accent flex-shrink-0" />
            <span className="truncate">{t.shopNotifyMsg}</span>
          </div>
          <button
            onClick={handleFinish}
            disabled={isSubmitting}
            aria-live="polite"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm sf-btn-accent shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Truck className="w-4 h-4" />
            {isSubmitting ? t.shopProcessing : t.shopConfirmDelivery}
          </button>
        </div>
      </div>
    </div>
  );
};
