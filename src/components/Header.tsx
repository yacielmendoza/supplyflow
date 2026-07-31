import React, { useState, useRef, useEffect } from 'react';
import { Restaurant, UserProfile } from '../types';
import { formatCleanName } from '../lib/formatters';
import { getTranslation } from '../lib/translations';
import { Store, Bell, Flame, ChevronDown, Check } from 'lucide-react';
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
 * notifications (with pending badge) · profile avatar. The restaurant selector
 * is a custom popover (not a native <select>) so the picker matches the app's
 * design language instead of the OS control.
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
  const [open, setOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = restaurants.find((r) => r.id === selectedRestaurantId) || restaurants[0];

  const closePopover = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePopover(true);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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

            <div className="relative min-w-0" ref={selectorRef}>
              <button
                ref={triggerRef}
                onClick={() => {
                  setOpen((o) => !o);
                  playAlertSound('click');
                }}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={t.headerRestaurantSelector}
                className="flex items-center sf-pill rounded-2xl pl-3 pr-2.5 h-11 min-w-0 transition"
                style={open ? { borderColor: 'var(--sf-accent)' } : undefined}
              >
                <Store className="w-4 h-4 sf-accent mr-2 flex-shrink-0" />
                <span className="font-bold text-sm truncate max-w-[42vw] sm:max-w-[240px]" style={{ color: 'var(--sf-text)' }}>
                  {selected?.name}
                </span>
                <ChevronDown
                  className="w-4 h-4 sf-subtle ml-1.5 flex-shrink-0 transition-transform"
                  style={{ transform: open ? 'rotate(180deg)' : 'none' }}
                />
              </button>

              {open && (
                <div
                  className="sf-card absolute left-0 top-full mt-2 min-w-[220px] max-h-72 overflow-y-auto p-1.5 z-50 animate-fadeIn"
                  style={{ borderRadius: '20px' }}
                >
                  {restaurants.map((r) => {
                    const active = r.id === selectedRestaurantId;
                    return (
                      <button
                        key={r.id}
                        aria-current={active ? 'true' : undefined}
                        onClick={() => {
                          onSelectRestaurant(r.id);
                          closePopover(true);
                          playAlertSound('click');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left transition"
                        style={active ? { background: 'var(--sf-accent-soft)' } : undefined}
                      >
                        <Store className="w-4 h-4 flex-shrink-0" style={{ color: active ? 'var(--sf-accent)' : 'var(--sf-text-subtle)' }} />
                        <span className="flex-1 min-w-0 truncate font-bold text-sm" style={{ color: active ? 'var(--sf-accent)' : 'var(--sf-text)' }}>
                          {r.name}
                        </span>
                        {active && <Check className="w-4 h-4 sf-accent flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
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
                <span
                  className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-white text-[11px] font-black flex items-center justify-center shadow-md sf-pop"
                  style={{ background: 'var(--sf-rose)' }}
                >
                  {activeRequestsCount > 99 ? '99+' : activeRequestsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                onOpenProfile();
                playAlertSound('click');
              }}
              className="relative w-11 h-11 rounded-full flex-shrink-0 transition ring-2"
              style={{ ['--tw-ring-color' as string]: 'var(--sf-accent)' }}
              title={formatCleanName(currentUser.name)}
              aria-label={t.tabSettings}
            >
              <span className="block w-full h-full rounded-full overflow-hidden">
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
              </span>
              {/* Presence dot — sits on the ring, outside the clipped image wrapper */}
              <span
                className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full"
                style={{
                  background: sseConnected ? 'var(--sf-accent)' : 'var(--sf-amber)',
                  border: '2.5px solid var(--sf-surface)',
                }}
                title={sseConnected ? t.online : t.reconnecting}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
