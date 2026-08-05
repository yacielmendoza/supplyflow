import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Product, Category, Restaurant, UserProfile } from '../types';
import { formatCategoryName, formatUnitName, formatCleanName, PRODUCT_CATEGORIES } from '../lib/formatters';
import { getTranslation } from '../lib/translations';
import { tint } from '../lib/colors';
import { CheckCircle2, Send, Plus, Minus, Search, MessageSquare, ChevronUp, ChevronDown, UserRound } from 'lucide-react';
import { playAlertSound } from '../lib/notifications';

interface DailyChecklistProps {
  products: Product[];
  selectedRestaurant: Restaurant;
  currentUser: UserProfile;
  onSubmitChecklist: (stockReadings: Record<string, number>, notes: string, urgent: boolean) => Promise<void>;
  isSubmitting: boolean;
}

interface ChecklistDraft {
  readings: Record<string, number>;
  reviewedIds: string[];
  notes: string;
  isUrgent: boolean;
  showOrderPreview: boolean;
  // Who last saved this draft, and when — a shared kitchen device can have a
  // second user open the same restaurant/day Checklist behind the first
  // user's unsent draft; without these, it loads silently with no
  // indication the data belongs to someone else.
  authorId?: string;
  authorName?: string;
  savedAt?: number;
}

// Local calendar date, not UTC — a restaurant on a night shift outside UTC+0
// would otherwise see its draft key roll over to "tomorrow" hours early.
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Keyed by restaurant+day (not +user) on purpose: shift handoff within the
// same restaurant/day is the intended flow, so the draft itself is shared —
// see the authorId/authorName banner below for making the handoff explicit
// instead of silent.
function draftKeyFor(restaurantId: string) {
  return `restosupply_checklist_draft_${restaurantId}_${localDateKey(new Date())}`;
}

function parseDraft(raw: string | null): ChecklistDraft | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.readings !== 'object' ||
      !Array.isArray(parsed.reviewedIds) ||
      typeof parsed.notes !== 'string' ||
      typeof parsed.isUrgent !== 'boolean'
    ) {
      return null;
    }
    return {
      readings: parsed.readings,
      reviewedIds: parsed.reviewedIds,
      notes: parsed.notes,
      isUrgent: parsed.isUrgent,
      showOrderPreview: typeof parsed.showOrderPreview === 'boolean' ? parsed.showOrderPreview : false,
      authorId: typeof parsed.authorId === 'string' ? parsed.authorId : undefined,
      authorName: typeof parsed.authorName === 'string' ? parsed.authorName : undefined,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : undefined,
    };
  } catch {
    return null;
  }
}

function readDraft(restaurantId: string): ChecklistDraft | null {
  try {
    return parseDraft(localStorage.getItem(draftKeyFor(restaurantId)));
  } catch {
    return null;
  }
}

function formatDraftSavedAt(savedAt: number, t: ReturnType<typeof getTranslation>): string {
  const mins = Math.max(0, Math.floor((Date.now() - savedAt) / 60000));
  if (mins < 1) return t.timeJustNow;
  if (mins < 60) return `${t.timePrefix}${mins} ${t.timeMin}${t.timeSuffix}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${t.timePrefix}${hours} ${t.timeHour}${t.timeSuffix}`;
  return `${t.timePrefix}${Math.floor(hours / 24)} ${t.timeDay}${t.timeSuffix}`;
}

export const DailyChecklist: React.FC<DailyChecklistProps> = ({
  products,
  selectedRestaurant,
  currentUser,
  onSubmitChecklist,
  isSubmitting,
}) => {
  const t = getTranslation(currentUser.language ?? 'es');
  const shouldReduceMotion = useReducedMotion();
  const drawerTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' as const };

  // Draft is keyed by restaurant+day and restored on mount so switching tabs
  // (which unmounts this component) never discards in-progress checklist work.
  const draft = useMemo(() => readDraft(selectedRestaurant.id), [selectedRestaurant.id]);

  const [readings, setReadings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach((p) => {
      initial[p.id] = p.currentStock !== undefined ? p.currentStock : p.minThreshold + 2;
    });
    return { ...initial, ...draft?.readings };
  });

  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set(draft?.reviewedIds ?? []));
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
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isUrgent, setIsUrgent] = useState(draft?.isUrgent ?? false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [showOrderPreview, setShowOrderPreview] = useState(draft?.showOrderPreview ?? false);

  // Shown when the loaded draft was last saved by a different user (or by an
  // unknown one — a draft persisted before authorId existed) — makes a shift
  // handoff on a shared device explicit instead of silently showing someone
  // else's unsent stock counts as if they were the current user's own.
  const [draftOwner, setDraftOwner] = useState(() =>
    draft && draft.authorId !== currentUser.id
      ? { name: draft.authorName || '', savedAt: draft.savedAt ?? 0 }
      : null
  );

  // Set when another tab/device reports (via a `storage` event with
  // `newValue === null`) that this restaurant/day's draft was already
  // submitted or discarded elsewhere. Blocks local submit so a user looking
  // at now-stale local data can't fire a second real purchase request.
  const [remoteCleared, setRemoteCleared] = useState(false);

  // Guards the persistence effect below against two distinct false-positive
  // "authorship" writes: (a) merely opening the screen with someone else's
  // existing draft still on it (no edit happened yet — skipped once via
  // skipInitialPersistRef), and (b) applying a draft that just arrived from
  // another tab via the `storage` listener (that write already has its own
  // authorId/savedAt on disk — re-persisting it under the local user's id
  // is what caused the authorship ping-pong loop between two open tabs).
  const skipInitialPersistRef = useRef(!!draft);
  const applyingRemoteUpdateRef = useRef(false);
  // Tracks the freshest `savedAt` this tab has observed (its own writes and
  // any accepted remote ones), so a `storage` event that re-delivers data
  // this tab already has (or is older than what it has) is a no-op instead
  // of triggering another round of the same re-broadcast.
  const lastKnownSavedAtRef = useRef<number>(draft?.savedAt ?? 0);
  // Fields the local user is actively typing into must never be silently
  // overwritten by a remote update — that's the "keystrokes lost, no
  // warning" half of the cross-tab race.
  const noteFieldRef = useRef<HTMLTextAreaElement>(null);
  const focusedStockProductIdRef = useRef<string | null>(null);

  const resetToDefaults = () => {
    const defaults: Record<string, number> = {};
    products.forEach((p) => {
      defaults[p.id] = p.currentStock !== undefined ? p.currentStock : p.minThreshold + 2;
    });
    setReadings(defaults);
    setReviewedIds(new Set());
    setNotes('');
    setIsUrgent(false);
    setShowOrderPreview(false);
  };

  const discardDraft = () => {
    resetToDefaults();
    try {
      localStorage.removeItem(draftKeyFor(selectedRestaurant.id));
    } catch {
      /* storage unavailable — in-memory reset above still applies */
    }
    setDraftOwner(null);
  };

  const startFreshAfterRemoteClear = () => {
    resetToDefaults();
    setDraftOwner(null);
    setRemoteCleared(false);
  };

  useEffect(() => {
    if (applyingRemoteUpdateRef.current) {
      // This render's state came from a remote draft applied by the
      // `storage` listener below, which already wrote it with its own
      // authorId/savedAt — persisting it again here under the local user's
      // id is exactly the reattribution loop this guard exists to prevent.
      applyingRemoteUpdateRef.current = false;
      return;
    }
    if (skipInitialPersistRef.current) {
      // First run after mounting on top of a pre-existing draft: state was
      // just lazily initialized FROM that draft, nothing has actually been
      // edited yet. Writing here would stamp the current user as author
      // for content they haven't touched.
      skipInitialPersistRef.current = false;
      return;
    }
    const key = draftKeyFor(selectedRestaurant.id);
    const savedAt = Date.now();
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          readings,
          reviewedIds: Array.from(reviewedIds),
          notes,
          isUrgent,
          showOrderPreview,
          authorId: currentUser.id,
          authorName: currentUser.name,
          savedAt,
        } satisfies ChecklistDraft)
      );
      lastKnownSavedAtRef.current = savedAt;
    } catch {
      /* storage unavailable — in-memory state still works for this session */
    }
  }, [selectedRestaurant.id, readings, reviewedIds, notes, isUrgent, showOrderPreview, currentUser.id, currentUser.name]);

  // Another tab/device editing the same restaurant/day draft should reflect
  // here too — same pattern as NotificationsView's `dismissedIds` sync. Note
  // this listener only ever fires for writes from OTHER tabs (the browser
  // never dispatches `storage` back to the tab that wrote it), so there is
  // no "own echo" to filter by authorId — the real hazard is a genuine
  // remote write from a *different* user's tab landing while this tab has
  // unsaved edits of its own.
  useEffect(() => {
    const key = draftKeyFor(selectedRestaurant.id);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      if (e.newValue === null) {
        // The draft was removed elsewhere — either submitted or discarded.
        // Silently ignoring this (as "no draft data to apply") is what let a
        // second real purchase request get sent from this tab's stale view.
        setRemoteCleared(true);
        return;
      }
      const incoming = parseDraft(e.newValue);
      if (!incoming) return;
      if (incoming.savedAt !== undefined && incoming.savedAt <= lastKnownSavedAtRef.current) {
        // Older than (or same as) what this tab already has — a duplicate
        // or out-of-order delivery, not a new edit to apply.
        return;
      }
      applyingRemoteUpdateRef.current = true;
      setReadings((prev) => {
        const focusedId = focusedStockProductIdRef.current;
        if (focusedId && focusedId in prev) {
          // Keep the count the local user currently has their finger/cursor
          // on; accept every other product's incoming count.
          return { ...incoming.readings, [focusedId]: prev[focusedId] };
        }
        return incoming.readings;
      });
      setReviewedIds(new Set(incoming.reviewedIds));
      setNotes((prev) => (document.activeElement === noteFieldRef.current ? prev : incoming.notes));
      setIsUrgent(incoming.isUrgent);
      setShowOrderPreview(incoming.showOrderPreview);
      setDraftOwner(incoming.authorId !== currentUser.id ? { name: incoming.authorName || '', savedAt: incoming.savedAt ?? 0 } : null);
      setRemoteCleared(false);
      lastKnownSavedAtRef.current = incoming.savedAt ?? Date.now();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [selectedRestaurant.id, currentUser.id]);

  // Anchor the summary bar flush above the app's fixed BottomNav by measuring it.
  // useLayoutEffect (not useEffect) so the correct height is applied before
  // paint, avoiding a visible jump on every mount (this component remounts on
  // every tab switch, so a post-paint correction would flicker constantly).
  const [navH, setNavH] = useState(76);
  useLayoutEffect(() => {
    const measure = () => setNavH((document.querySelector('nav') as HTMLElement | null)?.offsetHeight || 76);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Measure the summary bar's real rendered height (it grows when a drawer is
  // open) so the scrollable content's bottom padding never lets the fixed bar
  // occlude the last product card — a static padding guess can't account for
  // that.
  const summaryBarRef = useRef<HTMLDivElement>(null);
  const [summaryBarH, setSummaryBarH] = useState(96);
  useLayoutEffect(() => {
    const el = summaryBarRef.current;
    if (!el) return;
    // Read the real height synchronously before paint — ResizeObserver's own
    // initial callback fires as a microtask, one frame too late, which is
    // what caused the padding flicker this replaces.
    setSummaryBarH(el.offsetHeight);
    const observer = new ResizeObserver(([entry]) => setSummaryBarH(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Escape closes whichever drawer is open, matching the Header popover's pattern.
  useEffect(() => {
    if (!showOrderPreview && !showNoteInput) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOrderPreview(false);
        setShowNoteInput(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showOrderPreview, showNoteInput]);

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
      if (!p.active) return false;
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
    if (remoteCleared) return; // another tab already submitted/discarded this draft — refuse a second real request
    playAlertSound(isUrgent ? 'urgent' : 'success');
    await onSubmitChecklist(readings, notes, isUrgent);
    try {
      localStorage.removeItem(draftKeyFor(selectedRestaurant.id));
    } catch {
      /* storage unavailable — nothing to clear */
    }
    setDraftOwner(null);
    setSubmittedSuccess(true);
    setTimeout(() => setSubmittedSuccess(false), 4000);
  };

  const filterPill = (active: boolean, color = 'var(--sf-accent)'): React.CSSProperties =>
    active
      ? { background: tint(color, 16), color, border: `1px solid ${color}` }
      : { background: 'transparent', color: 'var(--sf-text-muted)', border: '1px solid transparent' };

  return (
    <>
    <div className="space-y-3.5 animate-fadeIn" style={{ paddingBottom: `calc(${summaryBarH}px + env(safe-area-inset-bottom) + 16px)` }}>
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
          <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${reviewProgressPct}%`, background: 'linear-gradient(90deg, var(--sf-accent), var(--sf-accent-2))' }} />
        </div>
      </div>

      {remoteCleared && (
        <div role="status" className="p-3.5 rounded-2xl flex items-start gap-2.5 text-xs" style={{ background: tint('var(--sf-rose)', 14), border: `1px solid ${tint('var(--sf-rose)', 30)}` }}>
          <UserRound className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sf-rose)' }} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="font-bold" style={{ color: 'var(--sf-text)' }}>{t.checklistRemoteClearedMsg}</p>
            <button type="button" onClick={startFreshAfterRemoteClear} className="font-extrabold min-h-11 px-1" style={{ color: 'var(--sf-rose)' }}>
              {t.checklistRemoteClearedBtn}
            </button>
          </div>
        </div>
      )}

      {draftOwner && !remoteCleared && (
        <div role="status" className="p-3.5 rounded-2xl flex items-start gap-2.5 text-xs" style={{ background: tint('var(--sf-amber)', 14), border: `1px solid ${tint('var(--sf-amber)', 30)}` }}>
          <UserRound className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sf-amber)' }} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="font-bold" style={{ color: 'var(--sf-text)' }}>
              {t.checklistDraftBannerPrefix} <strong style={{ color: 'var(--sf-amber)' }}>{formatCleanName(draftOwner.name) || t.checklistDraftUnknownAuthor}</strong>
              {draftOwner.savedAt ? `, ${formatDraftSavedAt(draftOwner.savedAt, t)}` : ''}
              {t.checklistDraftBannerSuffix}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={() => setDraftOwner(null)} className="font-extrabold sf-accent min-h-11 px-1">
                {t.checklistDraftKeepBtn}
              </button>
              <button type="button" onClick={discardDraft} className="font-extrabold min-h-11 px-1" style={{ color: 'var(--sf-rose)' }}>
                {t.checklistDraftDiscardBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {submittedSuccess && (
        <div role="status" aria-live="polite" className="p-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold" style={{ background: tint('var(--sf-accent)', 14), color: 'var(--sf-accent)' }}>
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
              aria-label={t.checklistSearch}
              className="w-full sf-inset pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none"
              style={{ color: 'var(--sf-text)' }}
            />
          </div>
          <div className="sf-inset flex items-center gap-1 p-1 flex-shrink-0">
            {([['ALL', t.checklistFilterAll, activeProducts.length, 'var(--sf-text-muted)'], ['UNREVIEWED', t.checklistFilterUnreviewed, activeProducts.length - totalReviewedCount, 'var(--sf-amber)'], ['REVIEWED', t.checklistFilterReviewed, totalReviewedCount, 'var(--sf-accent)']] as const).map(
              ([key, label, count, color]) => (
                <button key={key} onClick={() => setReviewFilter(key)}
                  aria-pressed={reviewFilter === key}
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
          {(['TODAS', ...PRODUCT_CATEGORIES] as const).map((cat) => {
            const active = selectedCategory === cat;
            const label = cat === 'TODAS' ? t.checklistFilterAll : formatCategoryName(cat, t);
            return (
              <button key={cat} onClick={() => setSelectedCategory(cat as any)}
                aria-pressed={active}
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
        <AnimatePresence initial={false}>
        {filteredProducts.map((p) => {
          const currentVal = readings[p.id] !== undefined ? readings[p.id] : p.minThreshold + 1;
          const isBelowThreshold = currentVal < p.minThreshold;
          const isCriticalZero = currentVal === 0;
          const isReviewed = reviewedIds.has(p.id);
          const stateColor = isCriticalZero ? 'var(--sf-rose)' : isBelowThreshold ? 'var(--sf-amber)' : 'var(--sf-accent)';

          return (
            <motion.div key={p.id} layout="position"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: isReviewed ? 1 : 0.92, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={drawerTransition}
              className="sf-card p-4"
              style={isReviewed ? { borderColor: stateColor, borderWidth: '2px' } : undefined}>
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-base sm:text-lg truncate block" style={{ color: 'var(--sf-text)' }}>{p.name}</span>
                  <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="font-bold sf-accent whitespace-nowrap">{formatCategoryName(p.category, t)}</span>
                    <span className="sf-subtle" aria-hidden="true">•</span>
                    <span className="sf-muted whitespace-nowrap">{t.minimum} <strong style={{ color: 'var(--sf-text)' }}>{p.minThreshold} {formatUnitName(p.unit, t, p.minThreshold)}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" onClick={() => toggleReviewed(p.id)}
                    aria-pressed={isReviewed}
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
                <div className="flex items-center gap-1.5">
                  {([['out', '0', 'var(--sf-rose)', currentVal === 0], ['low', t.stockLow, 'var(--sf-amber)', isBelowThreshold && currentVal > 0], ['ok', t.stockSufficient, 'var(--sf-accent)', !isBelowThreshold]] as const).map(
                    ([status, label, color, active]) => (
                      <button key={status} type="button" onClick={() => handleQuickSet(p.id, status)}
                        aria-pressed={active}
                        className="px-3 py-1.5 rounded-full text-xs font-extrabold transition"
                        style={active ? { background: color, color: status === 'low' ? 'var(--sf-amber-contrast)' : 'var(--sf-accent-contrast)' } : { background: 'var(--sf-surface-2)', color: 'var(--sf-text-muted)', border: '1px solid var(--sf-border)' }}>
                        {label}
                      </button>
                    )
                  )}
                </div>

                <div className="sf-inset rounded-full flex items-center gap-1 p-1">
                  <button type="button" onClick={() => handleStockChange(p.id, currentVal - 1)}
                    aria-label={`${t.ariaDecreaseStock} ${p.name}`}
                    className="w-11 h-11 rounded-full flex items-center justify-center font-black transition sf-btn-ghost">
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={currentVal}
                    onFocus={() => { focusedStockProductIdRef.current = p.id; }}
                    onBlur={() => { if (focusedStockProductIdRef.current === p.id) focusedStockProductIdRef.current = null; }}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      handleStockChange(p.id, Number.isFinite(parsed) ? parsed : 0);
                    }}
                    aria-label={`${t.ariaStockInput} ${p.name}`}
                    className="w-12 text-center font-black text-base sm:text-lg tabular-nums bg-transparent focus:outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ color: 'var(--sf-text)' }}
                  />
                  <button type="button" onClick={() => handleStockChange(p.id, currentVal + 1)}
                    aria-label={`${t.ariaIncreaseStock} ${p.name}`}
                    className="w-11 h-11 rounded-full flex items-center justify-center font-black transition sf-btn-ghost">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>
    </div>

      {/* Summary bar — rendered via portal to document.body so no ancestor's
          transform/filter can break position:fixed; anchored flush above BottomNav. */}
      {createPortal(
      <div
        ref={summaryBarRef}
        className="fixed inset-x-0 z-30"
        style={{
          bottom: `${navH}px`,
          background: 'var(--sf-surface)',
          borderTop: '1px solid var(--sf-border)',
          boxShadow: 'var(--sf-shadow)',
          borderTopLeftRadius: '22px',
          borderTopRightRadius: '22px',
        }}
      >
        <div className="max-w-5xl mx-auto flex flex-col-reverse">
          {/* Main bar — placed first in the DOM (not just visually last) so
              keyboard users tabbing forward from its trigger buttons land in
              the drawers below in the DOM, not "behind" them (WCAG 2.4.3).
              flex-col-reverse restores the expected on-screen stacking
              (drawers open upward, above this bar). */}
          <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowOrderPreview((v) => !v)}
              aria-expanded={showOrderPreview}
              aria-controls="checklist-order-preview"
              aria-label={t.checklistOrderPreviewTitle}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-2xl px-1 py-1 transition"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{ background: itemsNeedingReplenishment.length > 0 ? 'var(--sf-rose)' : 'var(--sf-accent)', color: 'var(--sf-accent-contrast)' }}>
                {itemsNeedingReplenishment.length}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs truncate flex items-center gap-1" style={{ color: 'var(--sf-text)' }}>
                  {itemsNeedingReplenishment.length > 0 ? `${itemsNeedingReplenishment.length} ${t.itemsToReplenish}` : t.stockCompleteMsg}
                  {showOrderPreview ? <ChevronDown className="w-3.5 h-3.5 sf-subtle flex-shrink-0" /> : <ChevronUp className="w-3.5 h-3.5 sf-subtle flex-shrink-0" />}
                </div>
                <div className="text-[10px] truncate flex items-center gap-1 sf-muted">
                  <span>{t.notifyBuyers}</span>
                  {notes.trim() && <span className="sf-accent font-bold"><span aria-hidden="true">• </span>{t.withNote}</span>}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button type="button" onClick={() => setShowNoteInput((prev) => !prev)}
                aria-expanded={showNoteInput}
                aria-controls="checklist-note-drawer"
                aria-label={notes.trim() ? t.noteActive : showNoteInput ? t.closeNote : t.noteAddBtn}
                className="flex items-center justify-center w-11 h-11 rounded-xl transition flex-shrink-0"
                style={notes.trim() ? { background: 'var(--sf-accent)', color: 'var(--sf-accent-contrast)' } : { background: 'var(--sf-surface-2)', color: 'var(--sf-text-muted)', border: '1px solid var(--sf-border)' }}>
                <MessageSquare className="w-4 h-4" />
              </button>

              <label className="flex items-center gap-1 text-xs font-medium px-2.5 h-11 rounded-xl cursor-pointer sf-btn-ghost">
                <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} style={{ accentColor: 'var(--sf-rose)' }} />
                <span className="font-extrabold text-[11px]" style={{ color: 'var(--sf-rose)' }}>{t.checklistUrgent}</span>
              </label>

              <button onClick={handleSubmit} disabled={isSubmitting || remoteCleared}
                className="px-4 h-11 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition sf-btn-accent disabled:opacity-60">
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? t.btnSending : itemsNeedingReplenishment.length > 0 ? t.btnSendRequest : t.btnSaveStock}
              </button>
            </div>
          </div>

          {/* Expandable note drawer */}
          <AnimatePresence initial={false}>
            {showNoteInput && (
              <motion.div
                key="note-drawer"
                id="checklist-note-drawer"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={drawerTransition}
                style={{ overflow: 'hidden', borderBottom: '1px solid var(--sf-border)' }}
              >
                <div className="px-4 pt-3 pb-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="checklist-note-textarea" className="font-bold flex items-center gap-1.5" style={{ color: 'var(--sf-text)' }}>
                      <MessageSquare className="w-3.5 h-3.5 sf-accent" />
                      {t.noteForBuyers}
                    </label>
                    <button type="button" onClick={() => setShowNoteInput(false)} className="text-[11px] font-medium sf-muted px-2 py-2 -mx-2 -my-1 min-h-11 flex items-center">{t.hideNote}</button>
                  </div>
                  <textarea
                    id="checklist-note-textarea"
                    ref={noteFieldRef}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.checklistNotePlaceholder}
                    rows={2}
                    className="w-full sf-inset rounded-xl p-2 text-xs focus:outline-none resize-none"
                    style={{ color: 'var(--sf-text)' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expandable order preview */}
          <AnimatePresence initial={false}>
            {showOrderPreview && (
              <motion.div
                key="order-preview"
                id="checklist-order-preview"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={drawerTransition}
                style={{ overflow: 'hidden', borderBottom: '1px solid var(--sf-border)' }}
              >
                <div className="px-4 pt-3 pb-2 max-h-[42vh] overflow-y-auto">
                  <div className="text-xs font-black uppercase tracking-wider sf-muted mb-2">
                    {t.checklistOrderPreviewTitle} ({itemsNeedingReplenishment.length})
                  </div>
                  {itemsNeedingReplenishment.length === 0 ? (
                    <div className="py-4 text-center sf-subtle text-sm font-semibold">{t.stockCompleteMsg}</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {itemsNeedingReplenishment.map((p) => (
                        <li key={p.id} className="sf-inset flex items-center justify-between gap-3 px-3 py-2">
                          <span className="font-bold text-sm truncate" style={{ color: 'var(--sf-text)' }}>{p.name}</span>
                          <span className="text-xs font-black flex-shrink-0 sf-accent whitespace-nowrap">
                            {p.suggestedQuantity} {formatUnitName(p.unit, t, p.suggestedQuantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>,
        document.body
      )}
    </>
  );
};
