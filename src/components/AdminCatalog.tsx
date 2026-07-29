import React, { useState } from 'react';
import { Product, Restaurant, Supplier, Category, UnitType } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Store,
  Package,
  Truck,
  Building,
  Check,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { playAlertSound } from '../lib/notifications';

interface AdminCatalogProps {
  products: Product[];
  restaurants: Restaurant[];
  suppliers: Supplier[];
  onAddProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddRestaurant: (rest: { name: string; type: any; address: string; phone: string }) => Promise<void>;
}

export const AdminCatalog: React.FC<AdminCatalogProps> = ({
  products,
  restaurants,
  suppliers,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddRestaurant,
}) => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'RESTAURANTS' | 'SUPPLIERS'>('PRODUCTS');
  const [selectedRestFilter, setSelectedRestFilter] = useState<string>('rest-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  // New Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<Category>('INGREDIENTS');
  const [newProdUnit, setNewProdUnit] = useState<UnitType>('Paquete');
  const [newProdMin, setNewProdMin] = useState(2);
  const [newProdSuggested, setNewProdSuggested] = useState(5);
  const [newProdSupplier, setNewProdSupplier] = useState("Sam's Club");

  // New Restaurant State
  const [showAddRestModal, setShowAddRestModal] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestType, setNewRestType] = useState<'Food Truck' | 'Restaurante' | 'Cafe' | 'Bistro'>('Restaurante');
  const [newRestAddress, setNewRestAddress] = useState('Big Spring, TX');

  // Edit Inline Product State
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  const categories: Category[] = [
    'INGREDIENTS',
    'SNACKS',
    'BEVERAGES',
    'MIXERS',
    'CANDY',
    'CHEMICALS',
    'PAPER / DISPOSABLES',
    'ALCOHOL',
  ];

  const unitOptions: UnitType[] = [
    'Paquete',
    'Caja',
    'Tubo',
    'Bolsa',
    'Libra',
    'Galón',
    'Botella',
    'Lata',
    'Unidad',
    'Tanque',
    'Rollo',
    'Atado',
    'Cubeta',
    'Caja / Cartón',
  ];

  const filteredProducts = products.filter((p) => {
    const matchRest = !selectedRestFilter || p.restaurantId === selectedRestFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRest && matchSearch;
  });

  const handleStartEdit = (p: Product) => {
    setEditingProdId(p.id);
    setEditForm({
      name: p.name,
      category: p.category,
      unit: p.unit,
      minThreshold: p.minThreshold,
      suggestedQuantity: p.suggestedQuantity,
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
      name: newProdName,
      category: newProdCategory,
      unit: newProdUnit,
      minThreshold: Number(newProdMin),
      suggestedQuantity: Number(newProdSuggested),
      suggestedSupplier: newProdSupplier,
      active: true,
    });
    setNewProdName('');
    setShowAddModal(false);
  };

  const handleCreateRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestName.trim()) return;
    playAlertSound('success');
    await onAddRestaurant({
      name: newRestName,
      type: newRestType,
      address: newRestAddress,
      phone: '(432) 555-0000',
    });
    setNewRestName('');
    setShowAddRestModal(false);
  };

  return (
    <div className="space-y-3.5">
      {/* Top Header Controls */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>Configuración y Catálogo</span>
          </h2>
          <p className="text-xs text-slate-400">
            Ajusta los umbrales mínimos operativos, unidades y locales.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'PRODUCTS'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Productos
          </button>
          <button
            onClick={() => setActiveTab('RESTAURANTS')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'RESTAURANTS'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Locales ({restaurants.length})
          </button>
          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'SUPPLIERS'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Proveedores ({suppliers.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCTS */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 flex-shrink-0">Local:</span>
              <select
                value={selectedRestFilter}
                onChange={(e) => setSelectedRestFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md flex-shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>

          {/* Mobile Product Cards View (block md:hidden) */}
          <div className="block md:hidden space-y-2.5">
            {filteredProducts.map((p) => {
              const isEditing = editingProdId === p.id;

              if (isEditing) {
                return (
                  <div key={p.id} className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-3.5 space-y-3 shadow-lg">
                    <div className="font-bold text-xs text-emerald-400">Editando Producto</div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block font-bold">Nombre</label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold">Categoría</label>
                          <select
                            value={editForm.category}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value as any }))}
                            className="w-full bg-slate-950 border border-slate-700 px-2 py-1.5 rounded-lg text-white text-xs"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold">Unidad</label>
                          <select
                            value={editForm.unit}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value as any }))}
                            className="w-full bg-slate-950 border border-slate-700 px-2 py-1.5 rounded-lg text-white text-xs"
                          >
                            {unitOptions.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold">Mínimo Operativo</label>
                          <input
                            type="number"
                            min="1"
                            value={editForm.minThreshold || 1}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, minThreshold: Number(e.target.value) }))}
                            className="w-full bg-slate-950 border border-slate-700 px-2 py-1.5 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold">Compra Estándar</label>
                          <input
                            type="number"
                            min="1"
                            value={editForm.suggestedQuantity || 1}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, suggestedQuantity: Number(e.target.value) }))}
                            className="w-full bg-slate-950 border border-slate-700 px-2 py-1.5 rounded-lg text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block font-bold">Proveedor Habitual</label>
                        <input
                          type="text"
                          value={editForm.suggestedSupplier || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, suggestedSupplier: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-white"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          onClick={() => setEditingProdId(null)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 font-bold rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveEdit(p.id)}
                          className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg flex items-center space-x-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-slate-100 text-sm">{p.name}</div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {p.category}
                        </span>
                        <span className="text-[11px] text-slate-400">• Unidad: {p.unit}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => handleStartEdit(p)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(p.id)}
                        className="p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800/80 text-xs">
                    <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Mínimo Operativo</span>
                      <span className="font-black text-amber-400">{p.minThreshold} {p.unit}s</span>
                    </div>
                    <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Paquete Estándar</span>
                      <span className="font-bold text-slate-200">{p.suggestedQuantity} {p.unit}s</span>
                    </div>
                  </div>

                  {p.suggestedSupplier && (
                    <div className="text-[11px] text-slate-400 pt-1 flex justify-between items-center border-t border-slate-800/50">
                      <span>Proveedor habitual:</span>
                      <span className="font-bold text-slate-200">{p.suggestedSupplier}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-3">Producto</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Unidad</th>
                    <th className="p-3">Mínimo Operativo</th>
                    <th className="p-3">Paquete Estándar</th>
                    <th className="p-3">Proveedor Sugerido</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {filteredProducts.map((p) => {
                    const isEditing = editingProdId === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/50 transition">
                        <td className="p-3 font-bold text-white">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.name || ''}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, name: e.target.value }))
                              }
                              className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white w-full"
                            />
                          ) : (
                            p.name
                          )}
                        </td>

                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={editForm.category}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, category: e.target.value as any }))
                              }
                              className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                            >
                              {categories.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                              {p.category}
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={editForm.unit}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, unit: e.target.value as any }))
                              }
                              className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                            >
                              {unitOptions.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-300">{p.unit}</span>
                          )}
                        </td>

                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              value={editForm.minThreshold || 1}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  minThreshold: Number(e.target.value),
                                }))
                              }
                              className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white w-16"
                            />
                          ) : (
                            <span className="font-extrabold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800">
                              {p.minThreshold} {p.unit}s
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              value={editForm.suggestedQuantity || 1}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  suggestedQuantity: Number(e.target.value),
                                }))
                              }
                              className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white w-16"
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
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  suggestedSupplier: e.target.value,
                                }))
                              }
                              className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white w-full"
                            />
                          ) : (
                            <span className="text-slate-400">{p.suggestedSupplier || '-'}</span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleSaveEdit(p.id)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingProdId(null)}
                                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleStartEdit(p)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteProduct(p.id)}
                                className="p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded"
                              >
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

      {/* TAB 2: RESTAURANTS */}
      {activeTab === 'RESTAURANTS' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400">
              Red de establecimientos configurada en Big Spring, TX
            </span>
            <button
              onClick={() => setShowAddRestModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md flex-shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Nuevo Local</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {restaurants.map((r) => (
              <div
                key={r.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between shadow-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${r.colorBadge || 'bg-emerald-500'}`} />
                    <span className="font-bold text-white text-base">{r.name}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[10px] font-mono">
                      {r.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{r.address}</p>
                  <p className="text-xs text-slate-500">Tel: {r.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS */}
      {activeTab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="font-bold text-white text-sm">{s.name}</div>
              <p className="text-xs text-emerald-400 mt-1">{s.categorySpecialty}</p>
              <p className="text-xs text-slate-500 mt-0.5">Contacto: {s.phone}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Añadir Nuevo Producto al Catálogo</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Ej: Carne Molida Angus"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Categoría</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Unidad Dinámica</label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Mínimo Operativo</label>
                  <input
                    type="number"
                    min="1"
                    value={newProdMin}
                    onChange={(e) => setNewProdMin(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Compra Estándar</label>
                  <input
                    type="number"
                    min="1"
                    value={newProdSuggested}
                    onChange={(e) => setNewProdSuggested(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Proveedor Habitual</label>
                <input
                  type="text"
                  value={newProdSupplier}
                  onChange={(e) => setNewProdSupplier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-bold"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Restaurant */}
      {showAddRestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Registrar Nuevo Local / Food Truck</h3>
              <button onClick={() => setShowAddRestModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRestaurantSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  placeholder="Ej: Taquería El Caporal"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Tipo de Establecimiento</label>
                <select
                  value={newRestType}
                  onChange={(e) => setNewRestType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Food Truck">Food Truck</option>
                  <option value="Restaurante">Restaurante</option>
                  <option value="Cafe">Cafe / Desayunos</option>
                  <option value="Bistro">Bistro</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Dirección / Ubicación en Big Spring</label>
                <input
                  type="text"
                  value={newRestAddress}
                  onChange={(e) => setNewRestAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddRestModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-bold"
                >
                  Registrar Local
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
