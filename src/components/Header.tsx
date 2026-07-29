import React, { useState } from 'react';
import { Restaurant, UserProfile, Role } from '../types';
import { formatCleanName } from '../lib/formatters';
import { getTranslation } from '../lib/translations';
import {
  Store,
  User,
  Bell,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Volume2,
  Settings,
  LogOut,
} from 'lucide-react';
import { playAlertSound } from '../lib/notifications';

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
  const selectedRest = restaurants.find((r) => r.id === selectedRestaurantId) || restaurants[0];
  const t = getTranslation(currentUser.language || 'es');

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'cocinero':
        return t.roleCook;
      case 'comprador':
        return t.roleBuyer;
      case 'admin':
        return t.roleAdmin;
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'cocinero':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/20';
      case 'comprador':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20';
      case 'admin':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/20';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Brand Logo & Compact Location Selector */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 flex items-center justify-center shadow-md shadow-emerald-950/50 flex-shrink-0">
              <Flame className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>

            <div className="flex items-center space-x-2 min-w-0">
              {/* App Name */}
              <span className="hidden sm:inline-block font-extrabold text-base sm:text-lg tracking-tight text-white font-sans flex-shrink-0">
                Resto<span className="text-emerald-400">Supply</span>
              </span>

              {/* Restaurant Selector Pill */}
              <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 sm:px-2.5 py-1 text-xs min-w-0">
                <Store className="w-3.5 h-3.5 text-emerald-400 mr-1 sm:mr-1.5 flex-shrink-0" />
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => {
                    onSelectRestaurant(e.target.value);
                    playAlertSound('click');
                  }}
                  className="bg-transparent text-slate-100 font-extrabold focus:outline-none cursor-pointer pr-1 text-xs max-w-[150px] sm:max-w-[220px] truncate"
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100 font-normal">
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Live SSE Indicator */}
            <div
              className={`hidden md:flex items-center space-x-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
                sseConnected
                  ? 'bg-emerald-950/80 border-emerald-700/50 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-700/50 text-amber-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold">{sseConnected ? t.online : t.reconnecting}</span>
            </div>

            {/* Profile Settings Quick Gear Button */}
            <button
              onClick={() => {
                onOpenProfileSettings();
                playAlertSound('click');
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors border border-slate-700/60"
              title={t.profileSettings}
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Test Audio Chime */}
            <button
              onClick={() => playAlertSound('urgent')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={t.headerTestChime}
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Notifications Button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={t.headerNotifications}
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {activeRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center animate-bounce shadow-md">
                  {activeRequestsCount}
                </span>
              )}
            </button>

            {/* PWA Install Button */}
            {isPWAInstallable && onInstallPWA && (
              <button
                onClick={onInstallPWA}
                className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{t.installApp}</span>
              </button>
            )}

            {/* User Profile / Role Selector */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition ${getRoleBadgeColor(
                  currentUser.role
                )}`}
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-emerald-400/50"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-white text-xs leading-tight truncate max-w-[120px]">
                    {formatCleanName(currentUser.name)}
                  </div>
                  <div className="text-[10px] opacity-80 font-bold uppercase tracking-wider">
                    {getRoleLabel(currentUser.role)}
                  </div>
                </div>
              </button>

              {/* Role Dropdown */}
              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-slate-200">
                  {/* Configure Profile Button inside dropdown */}
                  <div className="p-1 border-b border-slate-800">
                    <button
                      onClick={() => {
                        setShowRoleDropdown(false);
                        onOpenProfileSettings();
                        playAlertSound('click');
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 font-extrabold text-xs transition"
                    >
                      <Settings className="w-4 h-4 text-emerald-400" />
                      <span>{t.profileSettings}</span>
                    </button>
                  </div>

                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t.changeUser}
                  </div>
                  <div className="space-y-1 p-1">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSelectUser(u);
                          setShowRoleDropdown(false);
                          playAlertSound('click');
                        }}
                        className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-xs text-left transition ${
                          u.id === currentUser.id
                            ? 'bg-slate-800 text-white font-bold border border-slate-700'
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            className="w-5 h-5 rounded-full object-cover border border-slate-700"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              u.role === 'cocinero'
                                ? 'bg-amber-400'
                                : u.role === 'comprador'
                                ? 'bg-emerald-400'
                                : 'bg-purple-400'
                            }`}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-100 truncate">{formatCleanName(u.name)}</div>
                          <div className="text-xs text-slate-400">
                            {t.headerRolePrefix}: {getRoleLabel(u.role)}
                          </div>
                        </div>
                        {u.id === currentUser.id && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Logout */}
                  {onLogout && (
                    <div className="p-1 border-t border-slate-800 mt-1">
                      <button
                        onClick={() => {
                          setShowRoleDropdown(false);
                          onLogout();
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-800/80 text-slate-400 hover:text-rose-400 text-xs transition"
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
