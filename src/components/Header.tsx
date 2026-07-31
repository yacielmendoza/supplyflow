import React from 'react';
import { Restaurant, UserProfile } from '../types';
import { formatCleanName } from '../lib/formatters';
import { getTranslation } from '../lib/translations';
import { Store, Bell, Flame, ChevronDown } from 'lucide-react';
import { playAlertSound } from '../lib/notifications';

interface HeaderProps {
  restaurants: Restaurant[];
  selectedRestaurantId: string;
  onSelectRestaurant: (id: string) => void;
  currentUser: UserProfile;
  sseConnected: boolean;
  activeRequestsCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
}

/**
 * Simplified top bar (2026 refresh): brand logo · restaurant selector ·
 * notifications (with pending badge) · profile avatar. Everything else that
 * used to live here (settings, audio test, PWA install, user switch) now lives
 * in the Settings tab, keeping the header calm and roomy.
 */
export const Header: React.FC<HeaderProps> = ({
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  currentUser,
  sseConnected,
  activeRequestsCount,
  onOpenNotifications,
  onOpenProfile,
}) => {
  const t = getTranslation(currentUser.language || 'es');

  return (
    <header
      className="sticky top-0 z-40 safe-top"
      style={{
        background: 'color-mix(in srgb, var(--sf-surface) 88%, transparent)',
        borderBottom: '1px solid var(--sf-border)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 h-16">
          {/* Left: brand mark + restaurant selector */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 flex items-center justify-center shadow-lg shadow-emerald-900/30 flex-shrink-0">
              <Flame className="w-5 h-5 text-white stroke-[2.5]" />
            </div>

            <div className="relative flex items-center sf-pill rounded-2xl pl-3 pr-2 h-11 min-w-0">
              <Store className="w-4 h-4 sf-accent mr-2 flex-shrink-0" />
              <select
                value={selectedRestaurantId}
                onChange={(e) => {
                  onSelectRestaurant(e.target.value);
                  playAlertSound('click');
                }}
                aria-label="Restaurante"
                className="appearance-none bg-transparent font-bold focus:outline-none cursor-pointer pr-5 text-sm max-w-[42vw] sm:max-w-[240px] truncate"
                style={{ color: 'var(--sf-text)' }}
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 sf-subtle absolute right-2 pointer-events-none" />
            </div>
          </div>

          {/* Right: notifications + avatar */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={onOpenNotifications}
              className="relative w-11 h-11 rounded-2xl sf-btn-ghost flex items-center justify-center transition"
              title={t.headerNotifications}
              aria-label={t.headerNotifications}
            >
              <Bell className="w-5 h-5" />
              {activeRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center shadow-md sf-pop">
                  {activeRequestsCount > 99 ? '99+' : activeRequestsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                onOpenProfile();
                playAlertSound('click');
              }}
              className="relative w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition ring-2"
              style={{ ['--tw-ring-color' as string]: 'var(--sf-accent)' }}
              title={formatCleanName(currentUser.name)}
              aria-label={t.tabSettings}
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  className="w-full h-full flex items-center justify-center text-base font-black"
                  style={{ background: 'var(--sf-accent-soft)', color: 'var(--sf-accent)' }}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                style={{
                  background: sseConnected ? 'var(--sf-accent)' : 'var(--sf-amber)',
                  borderColor: 'var(--sf-surface)',
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
