import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/^﻿/, '');
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string).replace(/^﻿/, '');

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

// Convert DB row (snake_case) → SupplyRequest (camelCase)
export function rowToRequest(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    requestNumber: row.request_number as number,
    restaurantId: row.restaurant_id as string,
    restaurantName: row.restaurant_name as string,
    createdByUserId: row.created_by_user_id as string,
    createdByUserName: row.created_by_user_name as string,
    assignedBuyerId: (row.assigned_buyer_id as string) || undefined,
    assignedBuyerName: (row.assigned_buyer_name as string) || undefined,
    status: row.status as import('../types').RequestStatus,
    items: (row.items as import('../types').RequestItem[]) || [],
    urgent: row.urgent as boolean,
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
    assignedAt: (row.assigned_at as string) || undefined,
    shoppingStartedAt: (row.shopping_started_at as string) || undefined,
    purchasedAt: (row.purchased_at as string) || undefined,
    deliveredAt: (row.delivered_at as string) || undefined,
    completedAt: (row.completed_at as string) || undefined,
  };
}

// Convert SupplyRequest → DB row
export function requestToRow(req: import('../types').SupplyRequest) {
  return {
    id: req.id,
    request_number: req.requestNumber,
    restaurant_id: req.restaurantId,
    restaurant_name: req.restaurantName,
    created_by_user_id: req.createdByUserId,
    created_by_user_name: req.createdByUserName,
    assigned_buyer_id: req.assignedBuyerId ?? null,
    assigned_buyer_name: req.assignedBuyerName ?? null,
    status: req.status,
    items: req.items,
    urgent: req.urgent,
    notes: req.notes ?? null,
    created_at: req.createdAt,
    assigned_at: req.assignedAt ?? null,
    shopping_started_at: req.shoppingStartedAt ?? null,
    purchased_at: req.purchasedAt ?? null,
    delivered_at: req.deliveredAt ?? null,
    completed_at: req.completedAt ?? null,
  };
}
