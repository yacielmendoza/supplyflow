import { RequestStatus } from '../types';
import { Translations } from './translations';

/** Shared color-mix helper for tinted status/accent backgrounds — one implementation for the whole app. */
export const tint = (color: string, pct = 14) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** Single source of truth for the color assigned to each request status, reused by Dashboard, RequestsList and NotificationsView. */
export const STATUS_COLORS: Record<RequestStatus, string> = {
  Pendiente: 'var(--sf-amber)',
  Asignada: 'var(--sf-sky)',
  'En Compra': 'var(--sf-violet)',
  Comprada: 'var(--sf-accent)',
  Entregada: 'var(--sf-accent)',
  Completada: 'var(--sf-text-subtle)',
};

/** Translated label for each request status, derived from the active locale's translation set. */
export const getStatusLabels = (t: Translations): Record<RequestStatus, string> => ({
  Pendiente: t.pending,
  Asignada: t.assigned,
  'En Compra': t.inProgress,
  Comprada: t.purchased,
  Entregada: t.delivered,
  Completada: t.completed,
});
