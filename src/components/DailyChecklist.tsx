import React, { useState, useMemo } from 'react';
import { Product, Category, Restaurant, UserProfile } from '../types';
import { formatCategoryName } from '../lib/formatters';
import { getTranslation } from '../lib/translations';
import { CheckCircle2, Send, Plus, Minus, Search, MessageSquare } from 'lucide-react';
import { playAlertSound } from '../lib/notifications';
import { cn } from '../lib/cn';
import { Badge, Button, Tabs, type TabItem } from './ui';

interface DailyChecklistProps {
  products: Product[];
  selectedRestaurant: Restaurant;
  currentUser: UserProfile;
  onSubmitChecklist: (
    stockReadings: Record<string, number>,
    notes: string,
    urgent: boolean
  ) => Promise<void>;
  isSubmitting: boolean;
}

type ReviewFilter = 'ALL' | 'UNREVIEWED' | 'REVIEWED';

const CATEGORIES = [
  'TODAS',
  'INGREDIENTS',
  'SNACKS',
  'BEVERAGES',
  'MIXERS',
  'CANDY',
  'CHEMICALS',
  'PAPER / DISPOSABLES',
  'ALCOHOL',
] as const;

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

  const toggleReviewed = (productId: string) => {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const markAsReviewed = (productId: string) => {
    setReviewedIds((prev) => {
      if (prev.has(productId)) return prev;
      return new Set(prev).add(productId);
    });
  };

  const [selectedCategory, setSelectedCategory] = useState<Category | 'TODAS'>('TODAS');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('ALL');
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
  const reviewProgressPct =
    activeProducts.length > 0 ? Math.round((totalReviewedCount / activeProducts.length) * 100) : 0;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'TODAS' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isRev = reviewedIds.has(p.id);
      const matchRev =
        reviewFilter === 'ALL' ? true : reviewFilter === 'UNREVIEWED' ? !isRev : isRev;
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
    const safeVal = Math.max(0, Number.isFinite(val) ? val : 0);
    setReadings((prev) => ({ ...prev, [productId]: safeVal }));
    markAsReviewed(productId);
  };

  const handleQuickSet = (productId: string, status: 'out' | 'low' | 'ok') => {
    const p = products.find((prod) => prod.id === productId);
    if (!p) return;
    if (status === 'out') handleStockChange(productId, 0);
    else if (status === 'low') handleStockChange(productId, Math.max(0, p.minThreshold - 1));
    else if (status === 'ok') handleStockChange(productId, p.minThreshold + 3);
    markAsReviewed(productId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playAlertSound('urgent');
    await onSubmitChecklist(readings, notes, isUrgent);
    setSubmittedSuccess(true);
    setTimeout(() => setSubmittedSuccess(false), 4000);
  };

  const reviewTabs: TabItem<ReviewFilter>[] = [
    { id: 'ALL', label: t.checklistFilterAll, badge: activeProducts.length, badgeTone: 'neutral' },
    {
      id: 'UNREVIEWED',
      label: t.checklistFilterUnreviewed,
      badge: activeProducts.length - totalReviewedCount,
      badgeTone: 'warning',
    },
    { id: 'REVIEWED', label: t.checklistFilterReviewed, badge: totalReviewedCount, badgeTone: 'success' },
  ];

  const preset = (active: boolean, tone: 'danger' | 'warning' | 'success') =>
    cn(
      'px-2.5 py-1.5 rounded-control text-xs font-extrabold transition',
      active
        ? tone === 'danger'
          ? 'bg-danger text-white'
          : tone === 'warning'
          ? 'bg-warning text-accent-contrast'
          : 'bg-success text-accent-contrast'
        : 'bg-elevated text-text-secondary hover:text-text-primary border border-border-default'
    );

  return (
    <div className="space-y-3.5 pb-28">
      {/* Banner + progress */}
      <div className="border border-border-default bg-surface rounded-card p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold truncate text-text-primary">
                {t.checklistTitle} — {selectedRestaurant.name}
              </h2>
              <Badge tone="accent" className="flex-shrink-0">
                {t.checklistSpeed}
              </Badge>
            </div>
            <p className="text-xs truncate text-text-secondary">{t.checklistSubtitle}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right px-3 py-1.5 rounded-control border border-border-default bg-inset">
              <div className="text-[9px] font-bold uppercase text-text-secondary">
                {t.checklistProgressLabel}
              </div>
              <div className="text-sm font-black text-accent">
                {totalReviewedCount} / {activeProducts.length}{' '}
                <span className="text-[11px] font-bold text-text-secondary">({reviewProgressPct}%)</span>
              </div>
            </div>

            <div className="text-right px-3 py-1.5 rounded-control border border-border-default bg-inset">
              <div className="text-[9px] font-bold uppercase text-text-secondary">
                {t.checklistBelowMin}
              </div>
              <div
                className={cn(
                  'text-sm font-black',
                  itemsNeedingReplenishment.length > 0 ? 'text-danger' : 'text-accent'
                )}
              >
                {itemsNeedingReplenishment.length}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div
            className="w-full rounded-full h-2 overflow-hidden border border-border-default bg-inset"
            role="progressbar"
            aria-valuenow={reviewProgressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="bg-accent h-2 rounded-full transition-all duration-[var(--duration-base)]"
              style={{ width: `${reviewProgressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-secondary">
            <span>
              {totalReviewedCount === activeProducts.length
                ? t.checklistComplete
                : `${activeProducts.length - totalReviewedCount} ${t.checklistPending}`}
            </span>
            <span className="font-bold text-accent">{reviewProgressPct}%</span>
          </div>
        </div>
      </div>

      {submittedSuccess && (
        <div className="p-3 rounded-control border border-success/40 bg-success/10 text-success flex items-center gap-2.5 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{t.checklistSentMsg}</span>
        </div>
      )}

      {/* Search + review filters */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
            <label htmlFor="checklist-search" className="sr-only">
              {t.checklistSearch}
            </label>
            <input
              id="checklist-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.checklistSearch}
              className="w-full pl-9 pr-3 py-2 border border-border-default bg-surface rounded-control text-xs font-medium text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>

          <Tabs
            items={reviewTabs}
            value={reviewFilter}
            onChange={setReviewFilter}
            aria-label={t.checklistFilterAll}
            className="flex-shrink-0"
          />
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const displayLabel = cat === 'TODAS' ? t.checklistFilterAll : formatCategoryName(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as Category | 'TODAS')}
                aria-pressed={isSelected}
                className={cn(
                  'px-3 py-1.5 rounded-control text-xs sm:text-sm font-bold whitespace-nowrap transition-all',
                  isSelected
                    ? 'bg-accent text-accent-contrast shadow-sm'
                    : 'bg-surface text-text-secondary hover:text-text-primary border border-border-default'
                )}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredProducts.map((p) => {
          const currentVal = readings[p.id] !== undefined ? readings[p.id] : p.minThreshold + 1;
          const isBelowThreshold = currentVal < p.minThreshold;
          const isCriticalZero = currentVal === 0;
          const isReviewed = reviewedIds.has(p.id);

          return (
            <div
              key={p.id}
              className={cn(
                'p-3.5 sm:p-4 rounded-card border transition-all',
                isReviewed
                  ? isCriticalZero
                    ? 'bg-danger/10 border-2 border-danger shadow-sm'
                    : isBelowThreshold
                    ? 'bg-warning/10 border-2 border-warning shadow-sm'
                    : 'bg-accent/5 border-2 border-accent/70 shadow-sm'
                  : 'bg-surface/60 border-border-default opacity-90'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-base sm:text-lg truncate text-text-primary block">
                    {p.name}
                  </span>
                  <div className="text-xs space-x-2 mt-0.5">
                    <span className="font-bold text-accent">{formatCategoryName(p.category)}</span>
                    <span className="text-text-muted">•</span>
                    <span className="text-text-secondary">
                      {t.minimum}{' '}
                      <strong className="text-text-primary font-bold">
                        {p.minThreshold} {p.unit}s
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleReviewed(p.id)}
                    aria-pressed={isReviewed}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-extrabold uppercase flex items-center gap-1 transition-all',
                      isReviewed
                        ? 'bg-accent text-accent-contrast shadow-sm'
                        : 'bg-elevated text-text-secondary hover:text-text-primary border border-border-default'
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isReviewed ? t.tagReviewed : t.tagUnreviewed}
                  </button>

                  {isCriticalZero ? (
                    <Badge tone="danger" className="uppercase">
                      {t.tagEmpty}
                    </Badge>
                  ) : isBelowThreshold ? (
                    <Badge tone="warning" className="uppercase">
                      {t.tagReplenish}
                    </Badge>
                  ) : (
                    <Badge tone="success" className="uppercase">
                      {t.tagOk}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Counter row */}
              <div className="flex items-center justify-between pt-2 border-t border-border-default gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button type="button" onClick={() => handleQuickSet(p.id, 'out')} className={preset(currentVal === 0, 'danger')}>
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSet(p.id, 'low')}
                    className={preset(isBelowThreshold && currentVal > 0, 'warning')}
                  >
                    {t.stockLow}
                  </button>
                  <button type="button" onClick={() => handleQuickSet(p.id, 'ok')} className={preset(!isBelowThreshold, 'success')}>
                    {t.stockSufficient}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 rounded-control border border-border-default bg-inset">
                  <button
                    type="button"
                    onClick={() => handleStockChange(p.id, currentVal - 1)}
                    aria-label={`${p.name} −1`}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-control flex items-center justify-center font-black transition bg-elevated hover:bg-border-default text-text-primary"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentVal}
                    onChange={(e) => handleStockChange(p.id, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                    aria-label={`${t.minimum} ${p.name}`}
                    className="w-12 text-center font-black text-base sm:text-lg bg-transparent text-text-primary focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleStockChange(p.id, currentVal + 1)}
                    aria-label={`${p.name} +1`}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-control flex items-center justify-center font-black transition bg-elevated hover:bg-border-default text-text-primary"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md border-t border-border-default bg-surface/95 shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {showNoteInput && (
          <div className="border-b border-border-default bg-inset p-2.5 space-y-1.5 animate-fadeIn max-w-7xl mx-auto">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="checklist-note" className="font-bold flex items-center gap-1.5 text-text-primary">
                <MessageSquare className="w-3.5 h-3.5 text-accent" />
                {t.noteForBuyers}
              </label>
              <button
                type="button"
                onClick={() => setShowNoteInput(false)}
                className="text-[11px] font-medium text-text-secondary hover:text-text-primary"
              >
                {t.hideNote}
              </button>
            </div>
            <textarea
              id="checklist-note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.checklistNotePlaceholder}
              rows={2}
              className="w-full border border-border-default bg-surface rounded-control p-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
            />
          </div>
        )}

        <div className="max-w-7xl mx-auto p-2.5 sm:p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                'w-8 h-8 rounded-control flex items-center justify-center font-black text-sm flex-shrink-0',
                itemsNeedingReplenishment.length > 0
                  ? 'bg-danger text-white'
                  : 'bg-accent text-accent-contrast'
              )}
            >
              {itemsNeedingReplenishment.length}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate text-text-primary">
                {itemsNeedingReplenishment.length > 0
                  ? `${itemsNeedingReplenishment.length} ${t.itemsToReplenish}`
                  : t.stockCompleteMsg}
              </div>
              <div className="text-[10px] truncate flex items-center gap-1 text-text-secondary">
                <span>{t.notifyBuyers}</span>
                {notes.trim() && <span className="text-accent font-bold">• {t.withNote}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowNoteInput((prev) => !prev)}
              aria-pressed={showNoteInput}
              className={cn(
                'flex items-center gap-1 text-xs font-bold p-2 sm:px-2.5 sm:py-1.5 rounded-control border transition flex-shrink-0',
                notes.trim()
                  ? 'bg-accent text-accent-contrast border-accent'
                  : 'bg-elevated text-text-secondary border-border-default hover:text-text-primary'
              )}
            >
              <MessageSquare className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">
                {notes.trim() ? t.noteActive : showNoteInput ? t.closeNote : t.noteAddBtn}
              </span>
            </button>

            <label className="flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-control border border-border-default bg-elevated text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="accent-[var(--sf-danger)]"
              />
              <span className="text-danger font-extrabold text-[11px]">{t.checklistUrgent}</span>
            </label>

            <Button
              variant={itemsNeedingReplenishment.length > 0 ? 'primary' : 'secondary'}
              size="md"
              onClick={handleSubmit}
              loading={isSubmitting}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              {isSubmitting
                ? t.btnSending
                : itemsNeedingReplenishment.length > 0
                ? t.btnSendRequest
                : t.btnSaveStock}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
