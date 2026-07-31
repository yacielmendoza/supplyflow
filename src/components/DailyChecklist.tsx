import React, { useState, useMemo } from 'react';
import { Product, Category, Restaurant, UserProfile } from '../types';
import { formatCategoryName } from '../lib/formatters';
import { getTranslation } from '../lib/translations';
import { CheckCircle2, Send, Plus, Minus, Search, MessageSquare } from 'lucide-react';
import { playAlertSound } from '../lib/notifications';

interface DailyChecklistProps {
  products: Product[];
  selectedRestaurant: Restaurant;
  currentUser: UserProfile;
  onSubmitChecklist: (stockReadings: Record<string, number>, notes: string, urgent: boolean) => Promise<void>;
  isSubmitting: boolean;
}

const tint = (color: string, pct = 14) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const DailyChecklist: React.FC<DailyChecklistProps> = ({
  products,
  selectedRestaurant,
  currentUser,
  onSubmitChecklist,
  isSubmitting,
}) => {
  const t = getTranslation(currentUser.language ?? 'es');

  const [readings, setReadings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach((p) => {
      initial[p.id] = p.currentStock !== undefined ? p.currentStock : p.minThreshold + 2;
    });
    return initial;
  });

  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const toggleReviewed = (id: string) =>
    setReviewedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const markAsReviewed = (id: string) =>
    setReviewedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  const [selectedCategory, setSelectedCategory] = useState<Category | 'TODAS'>('TODAS');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'UNREVIEWED' | 'REVIEWED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);
  const totalReviewedCount = useMemo(
    () => activeProducts.filter((p) => reviewedIds.has(p.id)).length,
    [activeProducts, reviewedIds]
  );
  const reviewProgressPct = activeProducts.length > 0 ? Math.round((totalReviewedCount / activeProducts.length) * 100) : 0;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'TODAS' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isRev = reviewedIds.has(p.id);
      const matchRev = reviewFilter === 'ALL' ? true : reviewFilter === 'UNREVIEWED' ? !isRev : isRev;
      return matchCat && matchSearch && matchRev && p.active;
    });
  }, [products, selectedCategory, searchQuery, reviewFilter, reviewedIds]);

  const itemsNeedingReplenishment = useMemo(() => {
    return products.filter((p) => {
      const currentVal = readings[p.id] !== undefined ? readings[p.id] : p.minThreshold + 1;
      return currentVal < p.minThreshold;
    });
  }, [products, readings]);

  const handleStockChange = (productId: string, val: number) => {
    setReadings((prev) => ({ ...prev, [productId]: Math.max(0, val) }));
    markAsReviewed(productId);
  };

  const handleQuickSet = (productId: string, status: 'out' | 'low' | 'ok') => {
    const p = products.find((prod) => prod.id === productId);
    if (!p) return;
    if (status === 'out') handleStockChange(productId, 0);
    else if (status === 'low') handleStockChange(productId, Math.max(0, p.minThreshold - 1));
    else handleStockChange(productId, p.minThreshold + 3);
    markAsReviewed(productId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playAlertSound('urgent');
    await onSubmitChecklist(readings, notes, isUrgent);
    setSubmittedSuccess(true);
    setTimeout(() => setSubmittedSuccess(false), 4000);
  };

  const filterPill = (active: boolean, color = 'var(--sf-accent)'): React.CSSProperties =>
    active
      ? { background: tint(color, 16), color, border: `1px solid ${color}` }
      : { background: 'transparent', color: 'var(--sf-text-muted)', border: '1px solid transparent' };

  return (
    <div className="space-y-3.5 animate-fadeIn">
      {/* Banner + progress */}
      <div className="sf-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-black truncate flex items-center gap-2" style={{ color: 'var(--sf-text)' }}>
              {t.checklistTitle}
              <span className="sf-pill text-[10px] font-bold px-2 py-0.5 rounded-full sf-accent flex-shrink-0">{t.checklistSpeed}</span>
            </h1>
            <p className="sf-muted text-xs truncate">{selectedRestaurant.name} · {t.checklistSubtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="sf-inset text-right px-3 py-1.5">
              <div className="text-[9px] font-bold uppercase sf-subtle">{t.checklistProgressLabel}</div>
              <div className="text-sm font-black sf-accent">{totalReviewedCount}/{activeProducts.length}</div>
            </div>
            <div className="sf-inset text-right px-3 py-1.5">
              <div className="text-[9px] font-bold uppercase sf-subtle">{t.checklistBelowMin}</div>
              <div className="text-sm font-black" style={{ color: itemsNeedingReplenishment.length > 0 ? 'var(--sf-rose)' : 'var(--sf-accent)' }}>
                {itemsNeedingReplenishment.length}
              </div>
            </div>
          </div>
        </div>
        <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'var(--sf-surface-2)' }}>
          <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${reviewProgressPct}%`, background: 'linear-gradient(90deg, var(--sf-accent), #2dd4bf)' }} />
        </div>
      </div>

      {submittedSuccess && (
        <div className="p-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold" style={{ background: tint('var(--sf-accent)', 14), color: 'var(--sf-accent)' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {t.checklistSentMsg}
        </div>
      )}

      {/* Search + review filter */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 sf-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.checklistSearch}
              className="w-full sf-inset pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none"
              style={{ color: 'var(--sf-text)' }}
            />
          </div>
          <div className="sf-inset flex items-center gap-1 p-1 flex-shrink-0">
            {([['ALL', t.checklistFilterAll, activeProducts.length, 'var(--sf-text-muted)'], ['UNREVIEWED', t.checklistFilterUnreviewed, activeProducts.length - totalReviewedCount, 'var(--sf-amber)'], ['REVIEWED', t.checklistFilterReviewed, totalReviewedCount, 'var(--sf-accent)']] as const).map(
              ([key, label, count, color]) => (
                <button key={key} onClick={() => setReviewFilter(key)}
                  className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition whitespace-nowrap"
                  style={filterPill(reviewFilter === key, color)}>
                  {label} ({count})
                </button>
              )
            )}
          </div>
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {(['TODAS', 'INGREDIENTS', 'SNACKS', 'BEVERAGES', 'MIXERS', 'CANDY', 'CHEMICALS', 'PAPER / DISPOSABLES', 'ALCOHOL'] as const).map((cat) => {
            const active = selectedCategory === cat;
            const label = cat === 'TODAS' ? t.checklistFilterAll : formatCategoryName(cat);
            return (
              <button key={cat} onClick={() => setSelectedCategory(cat as any)}
                className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition"
                style={active ? { background: 'var(--sf-accent)', color: 'var(--sf-accent-contrast)' } : { background: 'var(--sf-surface-2)', color: 'var(--sf-text-muted)', border: '1px solid var(--sf-border)' }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredProducts.map((p) => {
          const currentVal = readings[p.id] !== undefined ? readings[p.id] : p.minThreshold + 1;
          const isBelowThreshold = currentVal < p.minThreshold;
          const isCriticalZero = currentVal === 0;
          const isReviewed = reviewedIds.has(p.id);
          const stateColor = isCriticalZero ? 'var(--sf-rose)' : isBelowThreshold ? 'var(--sf-amber)' : 'var(--sf-accent)';

          return (
            <div key={p.id} className="sf-card p-4"
              style={isReviewed ? { borderColor: stateColor, borderWidth: '2px' } : { opacity: 0.92 }}>
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-base sm:text-lg truncate block" style={{ color: 'var(--sf-text)' }}>{p.name}</span>
                  <div className="text-xs mt-0.5 flex items-center gap-2">
                    <span className="font-bold sf-accent">{formatCategoryName(p.category)}</span>
                    <span className="sf-subtle">•</span>
                    <span className="sf-muted">{t.minimum} <strong style={{ color: 'var(--sf-text)' }}>{p.minThreshold} {p.unit}s</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" onClick={() => toggleReviewed(p.id)}
                    className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase flex items-center gap-1 transition"
                    style={isReviewed ? { background: 'var(--sf-accent)', color: 'var(--sf-accent-contrast)' } : { background: 'var(--sf-surface-2)', color: 'var(--sf-text-muted)', border: '1px solid var(--sf-border)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isReviewed ? t.tagReviewed : t.tagUnreviewed}
                  </button>
                  <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase"
                    style={{ background: tint(stateColor, 16), color: stateColor, border: `1px solid ${tint(stateColor, 30)}` }}>
                    {isCriticalZero ? t.tagEmpty : isBelowThreshold ? t.tagReplenish : t.tagOk}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 gap-2" style={{ borderTop: '1px solid var(--sf-border)' }}>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {([['out', '0', 'var(--sf-rose)', currentVal === 0], ['low', t.stockLow, 'var(--sf-amber)', isBelowThreshold && currentVal > 0], ['ok', t.stockSufficient, 'var(--sf-accent)', !isBelowThreshold]] as const).map(
                    ([status, label, color, active]) => (
                      <button key={status} type="button" onClick={() => handleQuickSet(p.id, status)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition"
                        style={active ? { background: color, color: '#fff' } : { background: 'var(--sf-surface-2)', color: 'var(--sf-text-muted)', border: '1px solid var(--sf-border)' }}>
                        {label}
                      </button>
                    )
                  )}
                </div>

                <div className="sf-inset flex items-center gap-1.5 px-2 py-1">
                  <button type="button" onClick={() => handleStockChange(p.id, currentVal - 1)}
                    className="w-11 h-11 rounded-lg flex items-center justify-center font-black transition sf-btn-ghost">
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="w-10 text-center font-black text-base sm:text-lg" style={{ color: 'var(--sf-text)' }}>{currentVal}</div>
                  <button type="button" onClick={() => handleStockChange(p.id, currentVal + 1)}
                    className="w-11 h-11 rounded-lg flex items-center justify-center font-black transition sf-btn-ghost">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action bar — in-flow at the end of the list (sits naturally above the bottom nav) */}
      <div className="sf-card overflow-hidden">
        {showNoteInput && (
          <div className="p-3 space-y-1.5 animate-fadeIn" style={{ borderBottom: '1px solid var(--sf-border)' }}>
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold flex items-center gap-1.5" style={{ color: 'var(--sf-text)' }}>
                <MessageSquare className="w-3.5 h-3.5 sf-accent" />
                {t.noteForBuyers}
              </label>
              <button type="button" onClick={() => setShowNoteInput(false)} className="text-[11px] font-medium sf-muted">{t.hideNote}</button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.checklistNotePlaceholder}
              rows={2}
              className="w-full sf-inset rounded-xl p-2 text-xs focus:outline-none resize-none"
              style={{ color: 'var(--sf-text)' }}
            />
          </div>
        )}

        <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
              style={{ background: itemsNeedingReplenishment.length > 0 ? 'var(--sf-rose)' : 'var(--sf-accent)', color: '#fff' }}>
              {itemsNeedingReplenishment.length}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate" style={{ color: 'var(--sf-text)' }}>
                {itemsNeedingReplenishment.length > 0 ? `${itemsNeedingReplenishment.length} ${t.itemsToReplenish}` : t.stockCompleteMsg}
              </div>
              <div className="text-[10px] truncate flex items-center gap-1 sf-muted">
                <span>{t.notifyBuyers}</span>
                {notes.trim() && <span className="sf-accent font-bold">• {t.withNote}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={() => setShowNoteInput((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-bold p-2 sm:px-2.5 sm:py-1.5 rounded-lg transition flex-shrink-0"
              style={notes.trim() ? { background: 'var(--sf-accent)', color: 'var(--sf-accent-contrast)' } : { background: 'var(--sf-surface-2)', color: 'var(--sf-text-muted)', border: '1px solid var(--sf-border)' }}>
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{notes.trim() ? t.noteActive : showNoteInput ? t.closeNote : t.noteAddBtn}</span>
            </button>

            <label className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer sf-btn-ghost">
              <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} style={{ accentColor: 'var(--sf-rose)' }} />
              <span className="font-extrabold text-[11px]" style={{ color: 'var(--sf-rose)' }}>{t.checklistUrgent}</span>
            </label>

            <button onClick={handleSubmit} disabled={isSubmitting}
              className="px-4 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition sf-btn-accent disabled:opacity-60">
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? t.btnSending : itemsNeedingReplenishment.length > 0 ? t.btnSendRequest : t.btnSaveStock}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
