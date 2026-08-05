import React, { useState } from 'react';
import { Product, Restaurant, Supplier, Category, UnitType, UserProfile } from '../types';
import { getTranslation } from '../lib/translations';
import { Plus, Edit2, Trash2, Save, X, Search, SlidersHorizontal, Clock, Flame } from 'lucide-react';
import { playAlertSound } from '../lib/notifications';
import { cn } from '../lib/cn';
import { Badge, Button, Card, Sheet, Tabs, type TabItem } from './ui';

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
  onAddRestaurant: (rest: { name: string; type: string; address: string; phone: string }) => Promise<void>;
  overdueSettings: OverdueSettings;
  onSaveOverdueSettings: (settings: OverdueSettings) => void;
}

type AdminTab = 'PRODUCTS' | 'RESTAURANTS' | 'SUPPLIERS' | 'TIEMPOS';

const inp =
  'w-full bg-inset border border-border-default rounded-control px-3 py-2 text-text-primary text-xs focus:outline-none';
const inpSm =
  'w-full bg-inset border border-border-default rounded-control px-2 py-1.5 text-text-primary text-xs focus:outline-none';
const lbl = 'block text-text-secondary font-bold mb-1';
const lblXs = 'text-[10px] text-text-secondary block font-bold';

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

  const [activeTab, setActiveTab] = useState<AdminTab>('PRODUCTS');
  const [selectedRestFilter, setSelectedRestFilter] = useState<string>('rest-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<Category>('INGREDIENTS');
  const [newProdUnit, setNewProdUnit] = useState<UnitType>('Paquete');
  const [newProdMin, setNewProdMin] = useState(2);
  const [newProdSuggested, setNewProdSuggested] = useState(5);
  const [newProdSupplier, setNewProdSupplier] = useState("Sam's Club");

  const [showAddRestModal, setShowAddRestModal] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestType, setNewRestType] = useState<'Food Truck' | 'Restaurante' | 'Cafe' | 'Bistro'>('Restaurante');
  const [newRestAddress, setNewRestAddress] = useState('Big Spring, TX');

  const [editForm, setEditForm] = useState<Partial<Product>>({});

  const categories: Category[] = [
    'INGREDIENTS', 'SNACKS', 'BEVERAGES', 'MIXERS', 'CANDY',
    'CHEMICALS', 'PAPER / DISPOSABLES', 'ALCOHOL',
  ];
  const unitOptions: UnitType[] = [
    'Paquete', 'Caja', 'Tubo', 'Bolsa', 'Libra', 'Galón', 'Botella',
    'Lata', 'Unidad', 'Tanque', 'Rollo', 'Atado', 'Cubeta', 'Caja / Cartón',
  ];

  const filteredProducts = products.filter((p) => {
    const matchRest = !selectedRestFilter || p.restaurantId === selectedRestFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRest && matchSearch;
  });

  const handleStartEdit = (p: Product) => {
    setEditingProdId(p.id);
    setEditForm({
      name: p.name, category: p.category, unit: p.unit,
      minThreshold: p.minThreshold, suggestedQuantity: p.suggestedQuantity,
      suggestedSupplier: p.suggestedSupplier,
    });
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
    setShowAddModal(false);
  };

  const handleCreateRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestName.trim()) return;
    playAlertSound('success');
    await onAddRestaurant({ name: newRestName, type: newRestType, address: newRestAddress, phone: '(432) 555-0000' });
    setNewRestName('');
    setShowAddRestModal(false);
  };

  const tabs: TabItem<AdminTab>[] = [
    { id: 'PRODUCTS', label: t.adminTabProducts },
    { id: 'RESTAURANTS', label: t.adminTabLocals, badge: restaurants.length, badgeTone: 'neutral' },
    { id: 'SUPPLIERS', label: t.adminTabSuppliers, badge: suppliers.length, badgeTone: 'neutral' },
    { id: 'TIEMPOS', label: 'Tiempos de Espera', icon: <Clock className="w-3.5 h-3.5" /> },
  ];

  const iconBtn =
    'p-2 rounded-control transition inline-flex items-center justify-center';

  return (
    <div className="space-y-3.5">
      {/* Header + tabs */}
      <Card padding="md" className="shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base sm:text-lg font-extrabold text-text-primary flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            {t.adminConfigTitle}
          </h2>
          <p className="text-xs text-text-secondary">{t.adminConfigSubtitle}</p>
        </div>
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <Tabs items={tabs} value={activeTab} onChange={setActiveTab} aria-label={t.adminConfigTitle} />
        </div>
      </Card>

      {/* PRODUCTS */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-3">
          <Card padding="sm" className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="admin-rest-filter" className="text-xs font-bold text-text-secondary flex-shrink-0">
                {t.adminLocalLabel}
              </label>
              <select
                id="admin-rest-filter"
                value={selectedRestFilter}
                onChange={(e) => setSelectedRestFilter(e.target.value)}
                className={cn(inpSm, 'sm:w-auto')}
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-2 text-text-muted" />
              <label htmlFor="admin-search" className="sr-only">
                {t.adminSearchPlaceholder}
              </label>
              <input
                id="admin-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.adminSearchPlaceholder}
                className={cn(inpSm, 'pl-9')}
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setShowAddModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t.adminAddProduct}
            </Button>
          </Card>

          {/* Mobile cards */}
          <div className="block md:hidden space-y-2.5">
            {filteredProducts.map((p) => {
              const isEditing = editingProdId === p.id;
              if (isEditing) {
                return (
                  <div key={p.id} className="bg-surface border border-accent/50 rounded-card p-3.5 space-y-3 shadow-lg">
                    <div className="font-bold text-xs text-accent">{t.adminEditingLabel}</div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className={lblXs}>{t.adminRestaurantName}</label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          className={inpSm}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={lblXs}>{t.adminCategory}</label>
                          <select
                            value={editForm.category}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value as Category }))}
                            className={inpSm}
                          >
                            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={lblXs}>{t.adminUnit}</label>
                          <select
                            value={editForm.unit}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value as UnitType }))}
                            className={inpSm}
                          >
                            {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={lblXs}>{t.adminMinOpShort}</label>
                          <input
                            type="number" min="1"
                            value={editForm.minThreshold || 1}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, minThreshold: Number(e.target.value) }))}
                            className={inpSm}
                          />
                        </div>
                        <div>
                          <label className={lblXs}>{t.adminStdPurchase}</label>
                          <input
                            type="number" min="1"
                            value={editForm.suggestedQuantity || 1}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, suggestedQuantity: Number(e.target.value) }))}
                            className={inpSm}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={lblXs}>{t.adminUsualSupplier}</label>
                        <input
                          type="text"
                          value={editForm.suggestedSupplier || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, suggestedSupplier: e.target.value }))}
                          className={inpSm}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditingProdId(null)}>
                          {t.adminCancel}
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleSaveEdit(p.id)} leftIcon={<Save className="w-3.5 h-3.5" />}>
                          {t.adminSave}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={p.id} className="bg-surface border border-border-default rounded-card p-3 space-y-2 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-text-primary text-sm">{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded-chip bg-elevated text-text-secondary font-mono text-[10px]">
                          {p.category}
                        </span>
                        <span className="text-[11px] text-text-secondary">• {t.adminUnitLabel} {p.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleStartEdit(p)} aria-label={t.adminSave} className={cn(iconBtn, 'bg-elevated hover:bg-border-default text-text-secondary')}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteProduct(p.id)} aria-label="Eliminar" className={cn(iconBtn, 'bg-danger/15 hover:bg-danger/25 text-danger')}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border-default text-xs">
                    <div className="bg-inset px-2.5 py-1.5 rounded-control border border-border-default">
                      <span className="text-[9px] text-text-secondary block font-bold uppercase">{t.adminMinOpShort}</span>
                      <span className="font-black text-warning">{p.minThreshold} {p.unit}s</span>
                    </div>
                    <div className="bg-inset px-2.5 py-1.5 rounded-control border border-border-default">
                      <span className="text-[9px] text-text-secondary block font-bold uppercase">{t.adminStdPackage}</span>
                      <span className="font-bold text-text-primary">{p.suggestedQuantity} {p.unit}s</span>
                    </div>
                  </div>
                  {p.suggestedSupplier && (
                    <div className="text-[11px] text-text-secondary pt-1 flex justify-between items-center border-t border-border-default">
                      <span>{t.adminUsualSupplierShort}</span>
                      <span className="font-bold text-text-primary">{p.suggestedSupplier}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-surface border border-border-default rounded-card overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-inset text-text-secondary uppercase font-mono border-b border-border-default">
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
                <tbody className="divide-y divide-border-default text-text-primary">
                  {filteredProducts.map((p) => {
                    const isEditing = editingProdId === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-elevated/50 transition">
                        <td className="p-3 font-bold text-text-primary">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                              className={cn(inpSm, 'w-full')}
                            />
                          ) : p.name}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={editForm.category}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value as Category }))}
                              className={inpSm}
                            >
                              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 rounded-chip bg-elevated text-text-secondary font-mono text-[10px]">{p.category}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={editForm.unit}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value as UnitType }))}
                              className={inpSm}
                            >
                              {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          ) : (
                            <span className="text-text-secondary">{p.unit}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="number" min="1"
                              value={editForm.minThreshold || 1}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, minThreshold: Number(e.target.value) }))}
                              className={cn(inpSm, 'w-16')}
                            />
                          ) : (
                            <Badge tone="warning">{p.minThreshold} {p.unit}s</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="number" min="1"
                              value={editForm.suggestedQuantity || 1}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, suggestedQuantity: Number(e.target.value) }))}
                              className={cn(inpSm, 'w-16')}
                            />
                          ) : (
                            <span>{p.suggestedQuantity} {p.unit}s</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.suggestedSupplier || ''}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, suggestedSupplier: e.target.value }))}
                              className={cn(inpSm, 'w-full')}
                            />
                          ) : (
                            <span className="text-text-secondary">{p.suggestedSupplier || '-'}</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleSaveEdit(p.id)} aria-label={t.adminSave} className={cn(iconBtn, 'bg-accent hover:bg-accent-hover text-accent-contrast')}>
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingProdId(null)} aria-label={t.adminCancel} className={cn(iconBtn, 'bg-elevated hover:bg-border-default text-text-secondary')}>
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleStartEdit(p)} aria-label={t.adminSave} className={cn(iconBtn, 'bg-elevated hover:bg-border-default text-text-secondary')}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => onDeleteProduct(p.id)} aria-label="Eliminar" className={cn(iconBtn, 'bg-danger/15 hover:bg-danger/25 text-danger')}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
          <Card padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-xs text-text-secondary">{t.adminRestaurantNetwork}</span>
            <Button variant="primary" size="md" className="w-full sm:w-auto" onClick={() => setShowAddRestModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
              {t.adminAddNewLocal}
            </Button>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {restaurants.map((r) => (
              <Card key={r.id} padding="md" className="flex items-start justify-between shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2.5 h-2.5 rounded-full', r.colorBadge || 'bg-accent')} />
                    <span className="font-bold text-text-primary text-base">{r.name}</span>
                    <Badge tone="accent" className="font-mono">{r.type}</Badge>
                  </div>
                  <p className="text-xs text-text-secondary">{r.address}</p>
                  <p className="text-xs text-text-muted">Tel: {r.phone}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SUPPLIERS */}
      {activeTab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suppliers.map((s) => (
            <Card key={s.id} padding="md" className="shadow-lg">
              <div className="font-bold text-text-primary text-sm">{s.name}</div>
              <p className="text-xs text-accent mt-1">{s.categorySpecialty}</p>
              <p className="text-xs text-text-muted mt-0.5">Tel: {s.phone}</p>
            </Card>
          ))}
        </div>
      )}

      {/* TIEMPOS */}
      {activeTab === 'TIEMPOS' && (
        <OverdueSettingsPanel settings={overdueSettings} onSave={onSaveOverdueSettings} />
      )}

      {/* Add product modal */}
      {showAddModal && (
        <Sheet
          open
          onClose={() => setShowAddModal(false)}
          size="md"
          title={t.adminModalAddProductTitle}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => setShowAddModal(false)}>{t.adminCancel}</Button>
              <Button type="submit" form="add-product-form" variant="primary" size="md">{t.adminSaveProduct}</Button>
            </div>
          }
        >
          <form id="add-product-form" onSubmit={handleCreateProductSubmit} className="space-y-3 text-xs">
            <div>
              <label htmlFor="np-name" className={lbl}>{t.adminProductName}</label>
              <input id="np-name" type="text" required value={newProdName} onChange={(e) => setNewProdName(e.target.value)} placeholder={t.adminProductNamePlaceholder} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="np-cat" className={lbl}>{t.adminCategory}</label>
                <select id="np-cat" value={newProdCategory} onChange={(e) => setNewProdCategory(e.target.value as Category)} className={inp}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="np-unit" className={lbl}>{t.adminDynamicUnit}</label>
                <select id="np-unit" value={newProdUnit} onChange={(e) => setNewProdUnit(e.target.value as UnitType)} className={inp}>
                  {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="np-min" className={lbl}>{t.adminMinThreshold}</label>
                <input id="np-min" type="number" min="1" value={newProdMin} onChange={(e) => setNewProdMin(Number(e.target.value))} className={inp} />
              </div>
              <div>
                <label htmlFor="np-std" className={lbl}>{t.adminStdPurchase}</label>
                <input id="np-std" type="number" min="1" value={newProdSuggested} onChange={(e) => setNewProdSuggested(Number(e.target.value))} className={inp} />
              </div>
            </div>
            <div>
              <label htmlFor="np-sup" className={lbl}>{t.adminUsualSupplier}</label>
              <input id="np-sup" type="text" value={newProdSupplier} onChange={(e) => setNewProdSupplier(e.target.value)} className={inp} />
            </div>
          </form>
        </Sheet>
      )}

      {/* Add restaurant modal */}
      {showAddRestModal && (
        <Sheet
          open
          onClose={() => setShowAddRestModal(false)}
          size="md"
          title={t.adminModalAddRestTitle}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => setShowAddRestModal(false)}>{t.adminCancel}</Button>
              <Button type="submit" form="add-restaurant-form" variant="primary" size="md">{t.adminRegisterLocal}</Button>
            </div>
          }
        >
          <form id="add-restaurant-form" onSubmit={handleCreateRestaurantSubmit} className="space-y-3 text-xs">
            <div>
              <label htmlFor="nr-name" className={lbl}>{t.adminCommercialName}</label>
              <input id="nr-name" type="text" required value={newRestName} onChange={(e) => setNewRestName(e.target.value)} placeholder={t.adminRestNamePlaceholder} className={inp} />
            </div>
            <div>
              <label htmlFor="nr-type" className={lbl}>{t.adminEstablishmentType}</label>
              <select id="nr-type" value={newRestType} onChange={(e) => setNewRestType(e.target.value as typeof newRestType)} className={inp}>
                <option value="Food Truck">Food Truck</option>
                <option value="Restaurante">Restaurante</option>
                <option value="Cafe">Cafe / Desayunos</option>
                <option value="Bistro">Bistro</option>
              </select>
            </div>
            <div>
              <label htmlFor="nr-addr" className={lbl}>{t.adminAddressCity}</label>
              <input id="nr-addr" type="text" value={newRestAddress} onChange={(e) => setNewRestAddress(e.target.value)} className={inp} />
            </div>
          </form>
        </Sheet>
      )}
    </div>
  );
};

function OverdueSettingsPanel({
  settings,
  onSave,
}: {
  settings: OverdueSettings;
  onSave: (s: OverdueSettings) => void;
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
    <Card padding="lg" className="space-y-5 max-w-md">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-warning" />
        <div>
          <h3 className="font-black text-text-primary text-base">Tiempos de Espera Máximos</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Si un pedido sin asignar supera este tiempo, se marcará como{' '}
            <span className="text-danger font-bold">ATRASADO</span> y se enviará una notificación a
            compradores y administradores.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="ov-normal" className="block text-text-secondary font-bold text-xs uppercase tracking-wider">
              Pedido Normal (min)
            </label>
            <input
              id="ov-normal"
              type="number" min={1} max={240}
              value={normal}
              onChange={(e) => setNormal(e.target.value)}
              className="w-full bg-inset border border-border-default rounded-control px-3 py-2.5 text-text-primary text-sm font-bold text-center focus:outline-none"
            />
            <p className="text-xs text-text-muted">Umbral para pedidos estándar</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ov-urgent" className="text-danger font-bold text-xs uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              Urgente (min)
            </label>
            <input
              id="ov-urgent"
              type="number" min={1} max={60}
              value={urgent}
              onChange={(e) => setUrgent(e.target.value)}
              className="w-full bg-inset border border-danger/50 rounded-control px-3 py-2.5 text-text-primary text-sm font-bold text-center focus:outline-none"
            />
            <p className="text-xs text-text-muted">Umbral para pedidos urgentes</p>
          </div>
        </div>

        <Button type="submit" variant={saved ? 'success' : 'primary'} size="lg" fullWidth>
          {saved ? '✓ Guardado' : 'Guardar Tiempos'}
        </Button>
      </form>

      <div className="bg-inset border border-border-default rounded-control p-3 text-xs text-text-secondary space-y-1">
        <div className="font-bold text-text-primary">Configuración actual:</div>
        <div>• Normal: <span className="text-warning font-bold">{settings.normalMinutes} minutos</span></div>
        <div>• Urgente: <span className="text-danger font-bold">{settings.urgentMinutes} minutos</span></div>
      </div>
    </Card>
  );
}
