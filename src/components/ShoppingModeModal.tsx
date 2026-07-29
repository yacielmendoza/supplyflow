import React, { useState } from 'react';
import { SupplyRequest, RequestItem, UserProfile } from '../types';
import {
  X,
  CheckCircle2,
  Check,
  ShoppingBag,
  Store,
  MessageSquare,
  Phone,
  Share2,
  Sparkles,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { playAlertSound, generateWhatsAppLink } from '../lib/notifications';

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

  // Group suppliers
  const suppliers = Array.from(
    new Set(request.items.map((i) => i.suggestedSupplier || 'General / Varios'))
  );

  const filteredItems = request.items.filter((item) => {
    if (selectedSupplierFilter === 'TODOS') return true;
    const sup = item.suggestedSupplier || 'General / Varios';
    return sup === selectedSupplierFilter;
  });

  const totalItems = request.items.length;
  const purchasedCount = request.items.filter((i) => i.purchased).length;
  const progressPct = Math.round((purchasedCount / totalItems) * 100);

  const handleCheck = async (item: RequestItem) => {
    playAlertSound(item.purchased ? 'click' : 'success');
    const newStatus = !item.purchased;
    await onToggleItem(item.id, newStatus, itemNotes[item.id]);
  };

  const handleSaveNote = async (itemId: string) => {
    const noteText = itemNotes[itemId] || '';
    const item = request.items.find((i) => i.id === itemId);
    if (item) {
      await onToggleItem(itemId, item.purchased, noteText);
    }
    setEditingNoteItemId(null);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    playAlertSound('success');
    await onCompleteShopping();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between animate-fadeIn">
      {/* Top Sticky Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center font-black">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-base">
                  Modo Compra — Solicitud #{request.requestNumber}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-semibold text-xs">
                  {request.restaurantName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lista de compras interactiva optimizada para pasillos de tienda.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Live Progress Bar */}
        <div className="max-w-4xl mx-auto mt-3">
          <div className="flex justify-between items-center text-xs font-bold mb-1">
            <span className="text-slate-300">Progreso del Carrito:</span>
            <span className="text-emerald-400">
              {purchasedCount} de {totalItems} marcados ({progressPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Supplier Filter Strip */}
        <div className="max-w-4xl mx-auto mt-3 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1 flex-shrink-0">
            <Store className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tienda:</span>
          </span>

          <button
            onClick={() => setSelectedSupplierFilter('TODOS')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedSupplierFilter === 'TODOS'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            Todas ({request.items.length})
          </button>

          {suppliers.map((sup) => {
            const count = request.items.filter(
              (i) => (i.suggestedSupplier || 'General / Varios') === sup
            ).length;
            return (
              <button
                key={sup}
                onClick={() => setSelectedSupplierFilter(sup)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
                  selectedSupplierFilter === sup
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                {sup} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Checklist Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => handleCheck(item)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start space-x-3.5 ${
              item.purchased
                ? 'bg-emerald-950/20 border-emerald-700/60 opacity-80'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
            }`}
          >
            {/* Custom Checkbox */}
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
                item.purchased
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400'
                  : 'bg-slate-800 border-2 border-slate-600 text-transparent'
              }`}
            >
              <Check className="w-5 h-5 stroke-[3]" />
            </div>

            {/* Item Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-black text-base ${
                    item.purchased ? 'text-emerald-300 line-through' : 'text-slate-100'
                  }`}
                >
                  {item.productName}
                </span>

                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-extrabold text-xs">
                  {item.requestedQty} {item.unit}s
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">
                  {item.category}
                </span>
                <span>•</span>
                <span>Tienda: {item.suggestedSupplier || 'Cualquier tienda'}</span>
              </div>

              {/* Item Note if present */}
              {item.itemNote && (
                <div className="mt-2 text-xs text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-800/50">
                  Note: {item.itemNote}
                </div>
              )}

              {/* Add Note Button */}
              <div className="mt-2 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                {editingNoteItemId === item.id ? (
                  <div className="flex items-center space-x-2 w-full mt-1">
                    <input
                      type="text"
                      value={itemNotes[item.id] || ''}
                      onChange={(e) =>
                        setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Ej: Marca sustituta, no había suficiente..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                    <button
                      onClick={() => handleSaveNote(item.id)}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingNoteItemId(item.id)}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center space-x-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{item.itemNote ? 'Editar nota' : '+ Añadir nota de compra'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Al completar, se notificará inmediatamente al cocinero en la cocina.</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-950/50 hover:brightness-110 transition flex items-center justify-center space-x-2"
            >
              <Truck className="w-4 h-4" />
              <span>
                {isSubmitting ? 'Procesando...' : '✅ Confirmar y Notificar Entrega'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
