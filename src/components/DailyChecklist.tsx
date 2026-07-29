import React, { useState, useMemo } from 'react';
import { Product, Category, Restaurant, UserProfile } from '../types';
import { formatCategoryName } from '../lib/formatters';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Minus,
  Search,
  Filter,
  Sparkles,
  ClipboardList,
  Flame,
  Check,
  MessageSquare,
} from 'lucide-react';
import { playAlertSound } from '../lib/notifications';

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

export const DailyChecklist: React.FC<DailyChecklistProps> = ({
  products,
  selectedRestaurant,
  currentUser,
  onSubmitChecklist,
  isSubmitting,
}) => {
  // Local state for stock readings during checklist execution
  const [readings, setReadings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach((p) => {
      // Default to existing currentStock or minThreshold + 1 if unread
      initial[p.id] = p.currentStock !== undefined ? p.currentStock : p.minThreshold + 2;
    });
    return initial;
  });

  // Track products that have been explicitly checked or updated in this inspection session
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const toggleReviewed = (productId: string) => {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const markAsReviewed = (productId: string) => {
    setReviewedIds((prev) => {
      if (prev.has(productId)) return prev;
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  };

  const [selectedCategory, setSelectedCategory] = useState<Category | 'TODAS'>('TODAS');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'UNREVIEWED' | 'REVIEWED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Active products count
  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);
  const totalReviewedCount = useMemo(
    () => activeProducts.filter((p) => reviewedIds.has(p.id)).length,
    [activeProducts, reviewedIds]
  );
  const reviewProgressPct =
    activeProducts.length > 0 ? Math.round((totalReviewedCount / activeProducts.length) * 100) : 0;

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'TODAS' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isRev = reviewedIds.has(p.id);
      const matchRev =
        reviewFilter === 'ALL'
          ? true
          : reviewFilter === 'UNREVIEWED'
          ? !isRev
          : isRev;
      return matchCat && matchSearch && matchRev && p.active;
    });
  }, [products, selectedCategory, searchQuery, reviewFilter, reviewedIds]);

  // Calculate items needing replenishment based on threshold
  const itemsNeedingReplenishment = useMemo(() => {
    return products.filter((p) => {
      const currentVal = readings[p.id] !== undefined ? readings[p.id] : p.minThreshold + 1;
      return currentVal < p.minThreshold;
    });
  }, [products, readings]);

  const handleStockChange = (productId: string, val: number) => {
    const safeVal = Math.max(0, val);
    setReadings((prev) => ({ ...prev, [productId]: safeVal }));
    markAsReviewed(productId);
  };

  const handleQuickSet = (productId: string, status: 'out' | 'low' | 'ok') => {
    const p = products.find((prod) => prod.id === productId);
    if (!p) return;
    if (status === 'out') {
      handleStockChange(productId, 0);
    } else if (status === 'low') {
      handleStockChange(productId, Math.max(0, p.minThreshold - 1));
    } else if (status === 'ok') {
      handleStockChange(productId, p.minThreshold + 3);
    }
    markAsReviewed(productId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playAlertSound('urgent');
    await onSubmitChecklist(readings, notes, isUrgent);
    setSubmittedSuccess(true);
    setTimeout(() => setSubmittedSuccess(false), 4000);
  };

  const isLight = currentUser.theme === 'light';

  return (
    <div className="space-y-3.5 pb-24">
      {/* Compact Banner with Progress */}
      <div className={`border rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3 transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className={`text-base sm:text-lg font-extrabold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Inspección de Existencias — {selectedRestaurant.name}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-800 text-emerald-400 border-slate-700'
              }`}>
                &lt; 60s
              </span>
            </div>
            <p className={`text-xs truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Registra el stock. El sistema detecta faltantes contra el <strong className={isLight ? 'text-slate-900 font-bold' : 'text-slate-200'}>mínimo operativo</strong>.
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className={`text-right px-3 py-1.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className={`text-[9px] font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Progreso Revisión</div>
              <div className="text-sm font-black text-emerald-600">
                {totalReviewedCount} / {activeProducts.length} <span className={`text-[11px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({reviewProgressPct}%)</span>
              </div>
            </div>

            <div className={`text-right px-3 py-1.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className={`text-[9px] font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Bajo Mínimo</div>
              <div className={`text-sm font-black ${itemsNeedingReplenishment.length > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                {itemsNeedingReplenishment.length} items
              </div>
            </div>
          </div>
        </div>

        {/* Inspection Progress Bar */}
        <div className="space-y-1">
          <div className={`w-full rounded-full h-2 overflow-hidden border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${reviewProgressPct}%` }}
            />
          </div>
          <div className={`flex items-center justify-between text-[10px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
            <span>
              {totalReviewedCount === activeProducts.length
                ? '¡Inspección completa! Todos los insumos revisados.'
                : `${activeProducts.length - totalReviewedCount} insumos pendientes por revisar`}
            </span>
            <span className="font-bold text-emerald-600">{reviewProgressPct}%</span>
          </div>
        </div>
      </div>

      {submittedSuccess && (
        <div className={`p-3 rounded-xl border flex items-center space-x-2.5 text-xs font-bold ${
          isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>¡Solicitud enviada a los compradores en tiempo real!</span>
        </div>
      )}

      {/* Search Bar & Category Chips & Review Filters */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3 top-2.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ingrediente o insumo..."
              className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs'
                  : 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500'
              }`}
            />
          </div>

          {/* Filter by Review Status */}
          <div className={`flex items-center space-x-1 p-1 rounded-xl border text-xs flex-shrink-0 ${
            isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-900 border-slate-800'
          }`}>
            <button
              onClick={() => setReviewFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                reviewFilter === 'ALL'
                  ? isLight ? 'bg-white text-slate-900 shadow-xs font-extrabold' : 'bg-slate-800 text-slate-100 shadow-sm'
                  : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({activeProducts.length})
            </button>
            <button
              onClick={() => setReviewFilter('UNREVIEWED')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                reviewFilter === 'UNREVIEWED'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sin Revisar ({activeProducts.length - totalReviewedCount})
            </button>
            <button
              onClick={() => setReviewFilter('REVIEWED')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                reviewFilter === 'REVIEWED'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                  : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Revisados ({totalReviewedCount})
            </button>
          </div>
        </div>

        {/* Category Horizontal Selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
          {['TODAS', 'INGREDIENTS', 'SNACKS', 'BEVERAGES', 'MIXERS', 'CANDY', 'CHEMICALS', 'PAPER / DISPOSABLES', 'ALCOHOL'].map((cat) => {
            const isSelected = selectedCategory === cat;
            const displayLabel = cat === 'TODAS' ? 'Todas' : formatCategoryName(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as any)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? isLight ? 'bg-emerald-600 text-white shadow-sm font-extrabold' : 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                    : isLight ? 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs' : 'bg-slate-900 text-slate-300 hover:text-slate-100 border border-slate-800'
                }`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Inspection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredProducts.map((p) => {
          const currentVal = readings[p.id] !== undefined ? readings[p.id] : p.minThreshold + 1;
          const isBelowThreshold = currentVal < p.minThreshold;
          const isCriticalZero = currentVal === 0;
          const isReviewed = reviewedIds.has(p.id);

          return (
            <div
              key={p.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                isReviewed
                  ? isCriticalZero
                    ? isLight
                      ? 'bg-rose-50 border-2 border-rose-500 shadow-sm'
                      : 'bg-rose-950/30 border-2 border-rose-500 shadow-md shadow-rose-950/30'
                    : isBelowThreshold
                    ? isLight
                      ? 'bg-amber-50 border-2 border-amber-500 shadow-sm'
                      : 'bg-amber-950/30 border-2 border-amber-500 shadow-md shadow-amber-950/30'
                    : isLight
                      ? 'bg-emerald-50/70 border-2 border-emerald-500 shadow-sm'
                      : 'bg-slate-900 border-2 border-emerald-500/80 shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/20'
                  : isLight
                    ? 'bg-white border-slate-200 shadow-xs hover:shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 opacity-90'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <span className={`font-extrabold text-base sm:text-lg truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{p.name}</span>
                  </div>
                  <div className="text-xs space-x-2 mt-0.5">
                    <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{formatCategoryName(p.category)}</span>
                    <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
                    <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-300'}>Mínimo: <strong className={isLight ? 'text-slate-900 font-extrabold' : 'text-slate-100 font-bold'}>{p.minThreshold} {p.unit}s</strong></span>
                  </div>
                </div>

                {/* Reviewed Check Badge + Stock Status Badge */}
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleReviewed(p.id)}
                    title={isReviewed ? 'Hacer clic para desmarcar' : 'Hacer clic para marcar como revisado'}
                    className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase flex items-center space-x-1 transition-all ${
                      isReviewed
                        ? isLight ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-500 text-slate-950 shadow-sm'
                        : isLight ? 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300' : 'bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isReviewed ? (isLight ? 'text-white' : 'text-slate-950') : (isLight ? 'text-slate-500' : 'text-slate-400')}`} />
                    <span>{isReviewed ? 'REVISADO' : 'SIN REVISAR'}</span>
                  </button>

                  {/* Stock Status Badge */}
                  {isCriticalZero ? (
                    <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                      isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      AGOTADO
                    </span>
                  ) : isBelowThreshold ? (
                    <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                      isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      REPOSICIÓN
                    </span>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold uppercase ${
                      isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      OK
                    </span>
                  )}
                </div>
              </div>

              {/* Counter Row */}
              <div className={`flex items-center justify-between pt-2 border-t gap-2 ${
                isLight ? 'border-slate-200' : 'border-slate-800/80'
              }`}>
                {/* Presets */}
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickSet(p.id, 'out')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition ${
                      currentVal === 0
                        ? 'bg-rose-600 text-white shadow-xs'
                        : isLight ? 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200' : 'bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/60'
                    }`}
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSet(p.id, 'low')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition ${
                      isBelowThreshold && currentVal > 0
                        ? 'bg-amber-600 text-white shadow-xs'
                        : isLight ? 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200' : 'bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/60'
                    }`}
                  >
                    Bajo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSet(p.id, 'ok')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition ${
                      !isBelowThreshold
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isLight ? 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200' : 'bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/60'
                    }`}
                  >
                    Suficiente
                  </button>
                </div>

                {/* Counter */}
                <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-xl border ${
                  isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950 border-slate-800'
                }`}>
                  <button
                    type="button"
                    onClick={() => handleStockChange(p.id, currentVal - 1)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-black transition ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 active:bg-slate-200 shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className={`w-10 text-center font-black text-base sm:text-lg ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    {currentVal}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStockChange(p.id, currentVal + 1)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-black transition ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 active:bg-slate-200 shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Action Bar with Optional Expandable Note */}
      <div className={`fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md border-t shadow-2xl transition-colors ${
        isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/95 border-slate-800'
      }`}>
        {/* Optional Expandable Note Drawer */}
        {showNoteInput && (
          <div className={`border-b p-2.5 space-y-1.5 animate-fadeIn max-w-7xl mx-auto ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <label className={`font-bold flex items-center space-x-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nota Opcional para los Compradores</span>
              </label>
              <button
                type="button"
                onClick={() => setShowNoteInput(false)}
                className={`text-[11px] font-medium ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Ocultar ✕
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Entregar por la puerta trasera antes de las 11:00 AM, carne magra, marca preferencia..."
              rows={2}
              className={`w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500'
              }`}
            />
          </div>
        )}

        <div className="max-w-7xl mx-auto p-2.5 sm:p-3 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 ${
                itemsNeedingReplenishment.length > 0
                  ? 'bg-rose-500 text-white'
                  : 'bg-emerald-500 text-slate-950'
              }`}
            >
              {itemsNeedingReplenishment.length}
            </div>

            <div className="min-w-0">
              <div className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                {itemsNeedingReplenishment.length > 0
                  ? `${itemsNeedingReplenishment.length} items a reponer`
                  : 'Stock completo por encima del mínimo'}
              </div>
              <div className={`text-[10px] truncate flex items-center space-x-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>Notificación a compradores</span>
                {notes.trim() && <span className="text-emerald-600 font-bold">• Con nota</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Optional Note Toggle Button */}
            <button
              type="button"
              onClick={() => setShowNoteInput((prev) => !prev)}
              title={notes.trim() ? 'Nota personalizada incluida' : 'Agregar nota u observaciones'}
              className={`flex items-center space-x-1 text-xs font-bold p-2 sm:px-2.5 sm:py-1.5 rounded-lg border transition flex-shrink-0 ${
                notes.trim()
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : showNoteInput
                  ? isLight ? 'bg-slate-200 text-slate-900 border-slate-300' : 'bg-slate-700 text-emerald-400 border-emerald-500/50'
                  : isLight ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <MessageSquare className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${notes.trim() ? 'text-white' : 'text-emerald-600'}`} />
              <span className="hidden sm:inline">
                {notes.trim() ? 'Nota Activada' : showNoteInput ? 'Cerrar Nota' : '+ Agregar Nota'}
              </span>
            </button>

            <label className={`flex items-center space-x-1 text-xs font-medium px-2 py-1.5 rounded-lg border cursor-pointer ${
              isLight ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="rounded text-rose-500 focus:ring-rose-500"
              />
              <span className="text-rose-600 font-extrabold text-[11px]">Urgente</span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all ${
                itemsNeedingReplenishment.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-emerald-600/20'
                  : isLight ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? 'Enviando...'
                  : itemsNeedingReplenishment.length > 0
                  ? 'Enviar Solicitud'
                  : 'Guardar Stock'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
