import React, { useEffect, useRef, useState } from 'react';
import { Restaurant, UserProfile, Role } from '../types';
import { formatCleanName } from '../lib/formatters';
import { getTranslation } from '../lib/translations';
import {
  Store,
  User,
  Bell,
  Smartphone,
  CheckCircle2,
  Flame,
  Volume2,
  Settings,
  LogOut,
} from 'lucide-react';
import { playAlertSound } from '../lib/notifications';
import { cn } from '../lib/cn';
import { Badge, Button, IconButton, type Tone } from './ui';

interface HeaderProps {
  restaurants: Restaurant[];
  selectedRestaurantId: string;
  onSelectRestaurant: (id: string) => void;
  currentUser: UserProfile;
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  sseConnected: boolean;
  activeRequestsCount: number;
  onOpenNotifications: () => void;
  onOpenProfileSettings: () => void;
  onInstallPWA?: () => void;
  isPWAInstallable?: boolean;
  onLogout?: () => void;
}

const roleTone: Record<Role, Tone> = {
  cocinero: 'warning',
  comprador: 'accent',
  admin: 'info',
};

export const Header: React.FC<HeaderProps> = ({
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  currentUser,
  users,
  onSelectUser,
  sseConnected,
  activeRequestsCount,
  onOpenNotifications,
  onOpenProfileSettings,
  onInstallPWA,
  isPWAInstallable,
  onLogout,
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const t = getTranslation(currentUser.language || 'es');

  // Close the role menu on outside click or Escape, and restore focus to the trigger.
  useEffect(() => {
    if (!showRoleDropdown) return;
    const onDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setShowRoleDropdown(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRoleDropdown(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showRoleDropdown]);

  const getRoleLabel = (role: Role) =>
    role === 'cocinero' ? t.roleCook : role === 'comprador' ? t.roleBuyer : t.roleAdmin;

  return (
    <header
      className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border-default text-text-primary shadow-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Brand + location */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-control bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 flex items-center justify-center shadow-md flex-shrink-0">
              <Flame className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:inline-block font-extrabold text-base sm:text-lg tracking-tight flex-shrink-0">
                Resto<span className="text-accent">Supply</span>
              </span>

              {/* Restaurant selector */}
              <div className="relative flex items-center bg-inset border border-border-default rounded-control px-2 sm:px-2.5 py-1 text-xs min-w-0">
                <Store className="w-3.5 h-3.5 text-accent mr-1 sm:mr-1.5 flex-shrink-0" />
                <label htmlFor="restaurant-select" className="sr-only">
                  {currentUser.language === 'en' ? 'Restaurant' : 'Restaurante'}
                </label>
                <select
                  id="restaurant-select"
                  value={selectedRestaurantId}
                  onChange={(e) => {
                    onSelectRestaurant(e.target.value);
                    playAlertSound('click');
                  }}
                  className="bg-transparent text-text-primary font-extrabold focus:outline-none cursor-pointer pr-1 text-xs max-w-[150px] sm:max-w-[220px] truncate"
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id} className="bg-surface text-text-primary font-normal">
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Live status */}
            <span
              className={cn(
                'hidden md:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border',
                sseConnected
                  ? 'bg-success/10 border-success/40 text-success'
                  : 'bg-warning/10 border-warning/40 text-warning'
              )}
              role="status"
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  sseConnected ? 'bg-success animate-pulse' : 'bg-warning'
                )}
              />
              <span className="font-semibold">{sseConnected ? t.online : t.reconnecting}</span>
            </span>

            <IconButton
              label={t.profileSettings}
              variant="accent"
              size="sm"
              onClick={() => {
                onOpenProfileSettings();
                playAlertSound('click');
              }}
            >
              <Settings className="w-5 h-5" />
            </IconButton>

            <IconButton
              label={t.headerTestChime}
              size="sm"
              onClick={() => playAlertSound('urgent')}
            >
              <Volume2 className="w-4 h-4" />
            </IconButton>

            <div className="relative">
              <IconButton label={t.headerNotifications} size="sm" onClick={onOpenNotifications}>
                <Bell className="w-5 h-5" />
              </IconButton>
              {activeRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {activeRequestsCount}
                </span>
              )}
            </div>

            {isPWAInstallable && onInstallPWA && (
              <Button
                variant="primary"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={onInstallPWA}
                leftIcon={<Smartphone className="w-3.5 h-3.5" />}
              >
                {t.installApp}
              </Button>
            )}

            {/* User / role menu */}
            <div className="relative">
              <button
                ref={triggerRef}
                onClick={() => setShowRoleDropdown((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={showRoleDropdown}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 h-11 rounded-control border text-xs font-medium transition',
                  'bg-elevated border-border-default hover:border-border-strong text-text-primary'
                )}
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover border border-border-strong"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-xs leading-tight truncate max-w-[120px]">
                    {formatCleanName(currentUser.name)}
                  </div>
                  <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                    {getRoleLabel(currentUser.role)}
                  </div>
                </div>
              </button>

              {showRoleDropdown && (
                <div
                  ref={menuRef}
                  role="menu"
                  className="absolute right-0 mt-2 w-64 bg-surface border border-border-default rounded-card shadow-2xl py-2 z-50"
                >
                  <div className="p-1 border-b border-border-default">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      role="menuitem"
                      onClick={() => {
                        setShowRoleDropdown(false);
                        onOpenProfileSettings();
                        playAlertSound('click');
                      }}
                      leftIcon={<Settings className="w-4 h-4 text-accent" />}
                    >
                      {t.profileSettings}
                    </Button>
                  </div>

                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    {t.changeUser}
                  </div>
                  <div className="space-y-1 p-1">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        role="menuitem"
                        onClick={() => {
                          onSelectUser(u);
                          setShowRoleDropdown(false);
                          playAlertSound('click');
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-control text-xs text-left transition',
                          u.id === currentUser.id
                            ? 'bg-elevated text-text-primary font-bold border border-border-default'
                            : 'hover:bg-elevated text-text-secondary'
                        )}
                      >
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover border border-border-default"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Badge tone={roleTone[u.role]} className="w-2.5 h-2.5 p-0 rounded-full" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-text-primary truncate">
                            {formatCleanName(u.name)}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {t.headerRolePrefix}: {getRoleLabel(u.role)}
                          </div>
                        </div>
                        {u.id === currentUser.id && (
                          <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {onLogout && (
                    <div className="p-1 border-t border-border-default mt-1">
                      <button
                        role="menuitem"
                        onClick={() => {
                          setShowRoleDropdown(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-control hover:bg-elevated text-text-secondary hover:text-danger text-xs transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="font-semibold">{t.logout || 'Cerrar sesión'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
