import React, { useState } from 'react';
import { Product, Restaurant, Supplier, Category, UnitType, UserProfile } from '../types';
import { getTranslation } from '../lib/translations';
import { Plus, Edit2, Trash2, Save, X, Search, SlidersHorizontal, Clock, Flame } from 'lucide-react';
import { playAlertSound } from '../lib/notifications';

export interface OverdueSettings {
  normalMinutes: number;
  urgentMinutes: number;
}

interface AdminCatalogProps {
  products: Product[];
  restaurants: Restaurant[];
  suppliers: Supplier[];
  currentUser: UserProfile;
  onAddProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddRestaurant: (rest: { name: string; type: any; address: string; phone: string }) => Promise<void>;
  overdueSettings: OverdueSettings;
  onSaveOverdueSettings: (settings: OverdueSettings) => void;
}

const inputCls = 'w-full sf-inset px-3 py-2 text-xs focus:outline-none';
const inputStyle: React.CSSProperties = { color: 'var(--sf-text)' };
const tint = (color: string, pct = 14) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const AdminCatalog: React.FC<AdminCatalogProps> = ({
  products,
  restaurants,
  suppliers,
  currentUser,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddRestaurant,
  overdueSettings,
  onSaveOverdueSettings,
}) => {
  const t = getTranslation(currentUser.language ?? 'es');

  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'RESTAURANTS' | 'SUPPLIERS' | 'TIEMPOS'>('PRODUCTS');
  const [selectedRestFilter, setSelectedRestFilter] = useState<string>('rest-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<Category>('INGREDIENTS');
  const [newProdUnit, setNewProdUnit] = useState<UnitType>('Paquete');
  const [newProdMin, setNewProdMin] = useState(2);
  const [newProdSuggested, setNewProdSuggested] = useState(5);
  const [newProdSupplier, setNewProdSupplier] = useState("Sam's Club");

  const [showAddRestForm, setShowAddRestForm] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestType, setNewRestType] = useState<'Food Truck' | 'Restaurante' | 'Cafe' | 'Bistro'>('Restaurante');
  const [newRestAddress, setNewRestAddress] = useState('Big Spring, TX');

  const [editForm, setEditForm] = useState<Partial<Product>>({});

  const categories: Category[] = ['INGREDIENTS', 'SNACKS', 'BEVERAGES', 'MIXERS', 'CANDY', 'CHEMICALS', 'PAPER / DISPOSABLES', 'ALCOHOL'];
  const unitOptions: UnitType[] = ['Paquete', 'Caja', 'Tubo', 'Bolsa', 'Libra', 'Galón', 'Botella', 'Lata', 'Unidad', 'Tanque', 'Rollo', 'Atado', 'Cubeta', 'Caja / Cartón'];

  const filteredProducts = products.filter((p) => {
    const matchRest = !selectedRestFilter || p.restaurantId === selectedRestFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRest && matchSearch;
  });

  const handleStartEdit = (p: Product) => {
    setEditingProdId(p.id);
    setEditForm({ name: p.name, category: p.category, unit: p.unit, minThreshold: p.minThreshold, suggestedQuantity: p.suggestedQuantity, suggestedSupplier: p.suggestedSupplier });
  };

  const handleSaveEdit = async (id: string) => {
    playAlertSound('success');
    await onUpdateProduct(id, editForm);
    setEditingProdId(null);
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    playAlertSound('success');
    await onAddProduct({
      restaurantId: selectedRestFilter || 'rest-1',
      name: newProdName, category: newProdCategory, unit: newProdUnit,
      minThreshold: Number(newProdMin), suggestedQuantity: Number(newProdSuggested),
      suggestedSupplier: newProdSupplier, active: true,
    });
    setNewProdName('');
    setShowAddForm(false);
  };

  const handleCreateRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestName.trim()) return;
    playAlertSound('success');
    await onAddRestaurant({ name: newRestName, type: newRestType, address: newRestAddress, phone: '(432) 555-0000' });
    setNewRestName('');
    setShowAddRestForm(false);
  };

  const TABS = [
    { key: 'PRODUCTS' as const, label: t.adminTabProducts },
    { key: 'RESTAURANTS' as const, label: `${t.adminTabLocals} (${restaurants.length})` },
    { key: 'SUPPLIERS' as const, label: `${t.adminTabSuppliers} (${suppliers.length})` },
    { key: 'TIEMPOS' as const, label: t.adminTabOverdue },
  ];

  return (
    <div className="space-y-3.5 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--sf-text)' }}>
          <SlidersHorizontal className="w-6 h-6 sf-accent" />
          {t.adminConfigTitle}
        </h1>
        <p className="sf-muted text-sm mt-0.5">{t.adminConfigSubtitle}</p>
      </div>

      {/* Tab switcher */}
      <div className="sf-inset p-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1"
              style={active ? { background: 'var(--sf-surface)', color: 'var(--sf-accent)', boxShadow: 'var(--sf-shadow-sm)' } : { color: 'var(--sf-text-muted)' }}>
              {tab.key === 'TIEMPOS' && <Clock className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* PRODUCTS */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-3">
          <div className="sf-card p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold sf-muted flex-shrink-0">{t.adminLocalLabel}</span>
              <select value={selectedRestFilter} onChange={(e) => setSelectedRestFilter(e.target.value)}
                className="w-full sm:w-auto sf-inset text-xs rounded-xl px-2.5 py-1.5 focus:outline-none" style={inputStyle}>
                {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
              </select>
            </div>
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 sf-subtle" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.adminSearchPlaceholder} className="w-full sf-inset pl-9 pr-3 py-1.5 text-xs focus:outline-none" style={inputStyle} />
            </div>
            <button onClick={() => setShowAddForm((s) => !s)}
              className="w-full sm:w-auto px-3.5 py-1.5 sf-btn-accent font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 flex-shrink-0 whitespace-nowrap">
              <Plus className="w-4 h-4" />
              {t.adminAddProduct}
            </button>
          </div>

          {/* Inline add form */}
          {showAddForm && (
            <form onSubmit={handleCreateProductSubmit} className="sf-card p-4 space-y-3 text-xs animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm" style={{ color: 'var(--sf-text)' }}>{t.adminModalAddProductTitle}</h3>
                <button type="button" onClick={() => setShowAddForm(false)} aria-label={t.adminCancel} className="sf-btn-ghost w-9 h-9 rounded-lg flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div>
                <label className="block sf-muted font-bold mb-1">{t.adminProductName}</label>
                <input type="text" required value={newProdName} onChange={(e) => setNewProdName(e.target.value)} placeholder={t.adminProductNamePlaceholder} className={inputCls} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block sf-muted font-bold mb-1">{t.adminCategory}</label>
                  <select value={newProdCategory} onChange={(e) => setNewProdCategory(e.target.value as any)} className={inputCls} style={inputStyle}>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block sf-muted font-bold mb-1">{t.adminDynamicUnit}</label>
                  <select value={newProdUnit} onChange={(e) => setNewProdUnit(e.target.value as any)} className={inputCls} style={inputStyle}>
                    {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block sf-muted font-bold mb-1">{t.adminMinThreshold}</label>
                  <input type="number" min="1" value={newProdMin} onChange={(e) => setNewProdMin(Number(e.target.value))} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block sf-muted font-bold mb-1">{t.adminStdPurchase}</label>
                  <input type="number" min="1" value={newProdSuggested} onChange={(e) => setNewProdSuggested(Number(e.target.value))} className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="block sf-muted font-bold mb-1">{t.adminUsualSupplier}</label>
                <input type="text" value={newProdSupplier} onChange={(e) => setNewProdSupplier(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div className="pt-1 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 sf-btn-ghost rounded-xl font-bold">{t.adminCancel}</button>
                <button type="submit" className="px-4 py-2 sf-btn-accent rounded-xl font-bold">{t.adminSaveProduct}</button>
              </div>
            </form>
          )}

          {/* Mobile cards */}
          <div className="block md:hidden space-y-2.5">
            {filteredProducts.map((p) => {
              const isEditing = editingProdId === p.id;
              if (isEditing) return <EditCard key={p.id} p={p} editForm={editForm} setEditForm={setEditForm} categories={categories} unitOptions={unitOptions} onCancel={() => setEditingProdId(null)} onSave={() => handleSaveEdit(p.id)} t={t} />;
              return (
                <div key={p.id} className="sf-card p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-sm" style={{ color: 'var(--sf-text)' }}>{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="sf-inset px-2 py-0.5 rounded font-mono text-[10px] sf-muted">{p.category}</span>
                        <span className="text-[11px] sf-muted">• {t.adminUnitLabel} {p.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleStartEdit(p)} aria-label={t.adminEdit} className="sf-btn-ghost w-10 h-10 rounded-lg flex items-center justify-center"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => onDeleteProduct(p.id)} aria-label={t.adminDelete} className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: tint('var(--sf-rose)', 14), color: 'var(--sf-rose)' }}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1.5 text-xs" style={{ borderTop: '1px solid var(--sf-border)' }}>
                    <div className="sf-inset px-2.5 py-1.5">
                      <span className="text-[9px] sf-subtle block font-bold uppercase">{t.adminMinOpShort}</span>
                      <span className="font-black" style={{ color: 'var(--sf-amber)' }}>{p.minThreshold} {p.unit}s</span>
                    </div>
                    <div className="sf-inset px-2.5 py-1.5">
                      <span className="text-[9px] sf-subtle block font-bold uppercase">{t.adminStdPackage}</span>
                      <span className="font-bold" style={{ color: 'var(--sf-text)' }}>{p.suggestedQuantity} {p.unit}s</span>
                    </div>
                  </div>
                  {p.suggestedSupplier && (
                    <div className="text-[11px] sf-muted pt-1 flex justify-between items-center" style={{ borderTop: '1px solid var(--sf-border)' }}>
                      <span>{t.adminUsualSupplierShort}</span>
                      <span className="font-bold" style={{ color: 'var(--sf-text)' }}>{p.suggestedSupplier}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block sf-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="uppercase font-mono" style={{ background: 'var(--sf-surface-2)', color: 'var(--sf-text-muted)', borderBottom: '1px solid var(--sf-border)' }}>
                  <tr>
                    <th className="p-3">{t.adminTableProduct}</th>
                    <th className="p-3">{t.adminCategory}</th>
                    <th className="p-3">{t.adminUnit}</th>
                    <th className="p-3">{t.adminMinThreshold}</th>
                    <th className="p-3">{t.adminSuggestedQty}</th>
                    <th className="p-3">{t.adminSuggestedSupplier}</th>
                    <th className="p-3 text-right">{t.adminTableActions}</th>
                  </tr>
                </thead>
                <tbody style={{ color: 'var(--sf-text)' }}>
                  {filteredProducts.map((p) => {
                    const isEditing = editingProdId === p.id;
                    return (
                      <tr key={p.id} style={{ borderTop: '1px solid var(--sf-border)' }}>
                        <td className="p-3 font-bold">
                          {isEditing ? <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} className="sf-inset px-2 py-1 rounded text-xs w-full" style={inputStyle} /> : p.name}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select value={editForm.category} onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value as any }))} className="sf-inset px-2 py-1 rounded text-xs" style={inputStyle}>
                              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          ) : <span className="sf-inset px-2 py-0.5 rounded font-mono text-[10px] sf-muted">{p.category}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select value={editForm.unit} onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value as any }))} className="sf-inset px-2 py-1 rounded text-xs" style={inputStyle}>
                              {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          ) : <span className="sf-muted">{p.unit}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input type="number" min="1" value={editForm.minThreshold || 1} onChange={(e) => setEditForm((prev) => ({ ...prev, minThreshold: Number(e.target.value) }))} className="sf-inset px-2 py-1 rounded text-xs w-16" style={inputStyle} /> : (
                            <span className="font-extrabold px-2 py-0.5 rounded" style={{ background: tint('var(--sf-amber)', 16), color: 'var(--sf-amber)', border: `1px solid ${tint('var(--sf-amber)', 30)}` }}>{p.minThreshold} {p.unit}s</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input type="number" min="1" value={editForm.suggestedQuantity || 1} onChange={(e) => setEditForm((prev) => ({ ...prev, suggestedQuantity: Number(e.target.value) }))} className="sf-inset px-2 py-1 rounded text-xs w-16" style={inputStyle} /> : <span>{p.suggestedQuantity} {p.unit}s</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input type="text" value={editForm.suggestedSupplier || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, suggestedSupplier: e.target.value }))} className="sf-inset px-2 py-1 rounded text-xs w-full" style={inputStyle} /> : <span className="sf-muted">{p.suggestedSupplier || '-'}</span>}
                        </td>
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleSaveEdit(p.id)} aria-label={t.adminSave} className="sf-btn-accent p-1.5 rounded"><Save className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingProdId(null)} aria-label={t.adminCancel} className="sf-btn-ghost p-1.5 rounded"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleStartEdit(p)} aria-label={t.adminEdit} className="sf-btn-ghost p-1.5 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => onDeleteProduct(p.id)} aria-label={t.adminDelete} className="p-1.5 rounded" style={{ background: tint('var(--sf-rose)', 14), color: 'var(--sf-rose)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RESTAURANTS */}
      {activeTab === 'RESTAURANTS' && (
        <div className="space-y-3">
          <div className="sf-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-xs sf-muted">{t.adminRestaurantNetwork}</span>
            <button onClick={() => setShowAddRestForm((s) => !s)} className="w-full sm:w-auto px-4 py-2 sf-btn-accent font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 flex-shrink-0 whitespace-nowrap">
              <Plus className="w-4 h-4" />
              {t.adminAddNewLocal}
            </button>
          </div>

          {showAddRestForm && (
            <form onSubmit={handleCreateRestaurantSubmit} className="sf-card p-4 space-y-3 text-xs animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm" style={{ color: 'var(--sf-text)' }}>{t.adminModalAddRestTitle}</h3>
                <button type="button" onClick={() => setShowAddRestForm(false)} aria-label={t.adminCancel} className="sf-btn-ghost w-9 h-9 rounded-lg flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div>
                <label className="block sf-muted font-bold mb-1">{t.adminCommercialName}</label>
                <input type="text" required value={newRestName} onChange={(e) => setNewRestName(e.target.value)} placeholder={t.adminRestNamePlaceholder} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block sf-muted font-bold mb-1">{t.adminEstablishmentType}</label>
                <select value={newRestType} onChange={(e) => setNewRestType(e.target.value as any)} className={inputCls} style={inputStyle}>
                  <option value="Food Truck">Food Truck</option>
                  <option value="Restaurante">Restaurante</option>
                  <option value="Cafe">Cafe / Desayunos</option>
                  <option value="Bistro">Bistro</option>
                </select>
              </div>
              <div>
                <label className="block sf-muted font-bold mb-1">{t.adminAddressCity}</label>
                <input type="text" value={newRestAddress} onChange={(e) => setNewRestAddress(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div className="pt-1 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddRestForm(false)} className="px-4 py-2 sf-btn-ghost rounded-xl font-bold">{t.adminCancel}</button>
                <button type="submit" className="px-4 py-2 sf-btn-accent rounded-xl font-bold">{t.adminRegisterLocal}</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {restaurants.map((r) => (
              <div key={r.id} className="sf-card p-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${r.colorBadge || 'bg-emerald-500'}`} />
                  <span className="font-bold text-base" style={{ color: 'var(--sf-text)' }}>{r.name}</span>
                  <span className="sf-inset px-2 py-0.5 rounded text-[10px] font-mono sf-accent">{r.type}</span>
                </div>
                <p className="text-xs sf-muted mt-1">{r.address}</p>
                <p className="text-xs sf-subtle">{t.adminPhoneLabel} {r.phone}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUPPLIERS */}
      {activeTab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suppliers.map((s) => (
            <div key={s.id} className="sf-card p-4">
              <div className="font-bold text-sm" style={{ color: 'var(--sf-text)' }}>{s.name}</div>
              <p className="text-xs sf-accent mt-1">{s.categorySpecialty}</p>
              <p className="text-xs sf-subtle mt-0.5">{t.adminPhoneLabel} {s.phone}</p>
            </div>
          ))}
        </div>
      )}

      {/* TIEMPOS */}
      {activeTab === 'TIEMPOS' && <OverdueSettingsPanel settings={overdueSettings} onSave={onSaveOverdueSettings} t={t} />}
    </div>
  );
};

const EditCard: React.FC<{
  p: Product;
  editForm: Partial<Product>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  categories: Category[];
  unitOptions: UnitType[];
  onCancel: () => void;
  onSave: () => void;
  t: ReturnType<typeof getTranslation>;
}> = ({ p, editForm, setEditForm, categories, unitOptions, onCancel, onSave, t }) => (
  <div className="sf-card p-3.5 space-y-3" style={{ borderColor: 'var(--sf-accent)' }}>
    <div className="font-bold text-xs sf-accent">{t.adminEditingLabel}</div>
    <div className="space-y-2 text-xs">
      <div>
        <label className="text-[10px] sf-muted block font-bold">{t.adminRestaurantName}</label>
        <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} className={inputCls} style={inputStyle} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] sf-muted block font-bold">{t.adminCategory}</label>
          <select value={editForm.category} onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value as any }))} className={inputCls} style={inputStyle}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] sf-muted block font-bold">{t.adminUnit}</label>
          <select value={editForm.unit} onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value as any }))} className={inputCls} style={inputStyle}>
            {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] sf-muted block font-bold">{t.adminMinOpShort}</label>
          <input type="number" min="1" value={editForm.minThreshold || 1} onChange={(e) => setEditForm((prev) => ({ ...prev, minThreshold: Number(e.target.value) }))} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] sf-muted block font-bold">{t.adminStdPurchase}</label>
          <input type="number" min="1" value={editForm.suggestedQuantity || 1} onChange={(e) => setEditForm((prev) => ({ ...prev, suggestedQuantity: Number(e.target.value) }))} className={inputCls} style={inputStyle} />
        </div>
      </div>
      <div>
        <label className="text-[10px] sf-muted block font-bold">{t.adminUsualSupplier}</label>
        <input type="text" value={editForm.suggestedSupplier || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, suggestedSupplier: e.target.value }))} className={inputCls} style={inputStyle} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 sf-btn-ghost font-bold rounded-lg">{t.adminCancel}</button>
        <button onClick={onSave} className="px-3 py-1.5 sf-btn-accent font-bold rounded-lg flex items-center gap-1"><Save className="w-3.5 h-3.5" />{t.adminSave}</button>
      </div>
    </div>
  </div>
);

function OverdueSettingsPanel({
  settings,
  onSave,
  t,
}: {
  settings: OverdueSettings;
  onSave: (s: OverdueSettings) => void;
  t: ReturnType<typeof getTranslation>;
}) {
  const [normal, setNormal] = useState(String(settings.normalMinutes));
  const [urgent, setUrgent] = useState(String(settings.urgentMinutes));
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Math.max(1, parseInt(normal, 10) || 15);
    const u = Math.max(1, parseInt(urgent, 10) || 5);
    onSave({ normalMinutes: n, urgentMinutes: u });
    setNormal(String(n));
    setUrgent(String(u));
    setSaved(true);
    playAlertSound('success');
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="sf-card p-5 space-y-5 max-w-md">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5" style={{ color: 'var(--sf-amber)' }} />
        <div>
          <h3 className="font-black text-base" style={{ color: 'var(--sf-text)' }}>{t.adminOverdueTitle}</h3>
          <p className="text-xs sf-muted mt-0.5">
            {t.adminOverdueDesc} <span className="font-bold" style={{ color: 'var(--sf-rose)' }}>{t.tagOverdue}</span> {t.adminOverdueDescSuffix}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block sf-muted font-bold text-xs uppercase tracking-wider">{t.adminOverdueNormalLabel}</label>
            <input type="number" min={1} max={240} value={normal} onChange={(e) => setNormal(e.target.value)} className="w-full sf-inset px-3 py-2.5 text-sm font-bold text-center focus:outline-none" style={inputStyle} />
            <p className="text-xs sf-subtle">{t.adminOverdueNormalHint}</p>
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-xs uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--sf-rose)' }}>
              <Flame className="w-3.5 h-3.5" />
              {t.adminOverdueUrgentLabel}
            </label>
            <input type="number" min={1} max={60} value={urgent} onChange={(e) => setUrgent(e.target.value)} className="w-full sf-inset px-3 py-2.5 text-sm font-bold text-center focus:outline-none" style={{ ...inputStyle, borderColor: tint('var(--sf-rose)', 40) }} />
            <p className="text-xs sf-subtle">{t.adminOverdueUrgentHint}</p>
          </div>
        </div>

        <button type="submit" className="w-full py-2.5 rounded-xl font-black text-sm transition flex items-center justify-center gap-2"
          style={saved ? { background: 'var(--sf-accent)', color: 'var(--sf-accent-contrast)' } : { background: 'var(--sf-amber)', color: '#1a1206' }}>
          {saved && <Save className="w-4 h-4" />}
          {saved ? t.adminOverdueSavedBtn : t.adminOverdueSaveBtn}
        </button>
      </form>

      <div className="sf-inset p-3 text-xs sf-muted space-y-1">
        <div className="font-bold" style={{ color: 'var(--sf-text)' }}>{t.adminOverdueCurrentConfig}</div>
        <div>• {t.adminOverdueNormalSummary} <span className="font-bold" style={{ color: 'var(--sf-amber)' }}>{settings.normalMinutes} {t.adminOverdueMinutesUnit}</span></div>
        <div>• {t.adminOverdueUrgentSummary} <span className="font-bold" style={{ color: 'var(--sf-rose)' }}>{settings.urgentMinutes} {t.adminOverdueMinutesUnit}</span></div>
      </div>
    </div>
  );
}
