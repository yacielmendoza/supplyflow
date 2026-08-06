export type Role = 'cocinero' | 'comprador' | 'admin';

export type Category =
  | 'INGREDIENTS'
  | 'SNACKS'
  | 'BEVERAGES'
  | 'MIXERS'
  | 'CANDY'
  | 'CHEMICALS'
  | 'PAPER / DISPOSABLES'
  | 'ALCOHOL'
  | 'SUPPLIES';

export type UnitType =
  | 'Paquete'
  | 'Caja'
  | 'Tubo'
  | 'Bolsa'
  | 'Libra'
  | 'Galón'
  | 'Botella'
  | 'Lata'
  | 'Unidad'
  | 'Tanque'
  | 'Rollo'
  | 'Atado'
  | 'Cubeta'
  | 'Caja / Cartón';

export type RequestStatus =
  | 'Pendiente'
  | 'Asignada'
  | 'En Compra'
  | 'Comprada'
  | 'Entregada'
  | 'Completada';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  categorySpecialty?: string;
}

export type RestaurantColorKey = 'emerald' | 'amber' | 'indigo' | 'rose';

export interface Restaurant {
  id: string;
  name: string;
  type: 'Food Truck' | 'Restaurante' | 'Cafe' | 'Bistro';
  address: string;
  phone: string;
  active: boolean;
  colorBadge: RestaurantColorKey;
}

export interface UserProfile {
  id: string;
  name: string;
  role: Role;
  phone: string;
  assignedLocations: string[]; // Restaurant IDs
  assignedCategories?: Category[];
  avatarUrl?: string;
  email?: string;
  language?: 'es' | 'en';
  theme?: 'dark' | 'light';
}

export interface Product {
  id: string;
  restaurantId: string;
  name: string;
  category: Category;
  unit: UnitType;
  minThreshold: number; // Mínimo operativo
  suggestedQuantity: number; // Cantidad estándar a comprar
  currentStock?: number; // Última lectura registrada
  suggestedSupplier?: string;
  notes?: string;
  active: boolean;
  updatedAt: string;
}

export interface RequestItem {
  id: string;
  productId: string;
  productName: string;
  category: Category;
  unit: UnitType;
  currentStockAtRequest: number;
  minThreshold: number;
  requestedQty: number;
  boughtQty?: number;
  suggestedSupplier?: string;
  purchased: boolean;
  purchasedAt?: string;
  purchasedBy?: string; // Buyer User ID
  itemNote?: string;
}

export interface SupplyRequest {
  id: string;
  requestNumber: number; // e.g., 125
  restaurantId: string;
  restaurantName: string;
  createdByUserId: string;
  createdByUserName: string;
  assignedBuyerId?: string;
  assignedBuyerName?: string;
  status: RequestStatus;
  items: RequestItem[];
  urgent: boolean;
  notes?: string;
  createdAt: string;
  assignedAt?: string;
  shoppingStartedAt?: string;
  purchasedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
}

export interface StockAuditLog {
  id: string;
  restaurantId: string;
  productId: string;
  productName: string;
  recordedQty: number;
  minThreshold: number;
  needsReplenishment: boolean;
  recordedByUserId: string;
  recordedByUserName: string;
  timestamp: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  targetRole?: Role;
  restaurantId?: string;
  requestId?: string;
  timestamp: string;
}
