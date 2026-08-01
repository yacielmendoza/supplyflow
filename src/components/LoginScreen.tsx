import { useState, useEffect, ComponentType } from 'react';
import { Flame, ChefHat, ShoppingCart, BarChart3, Globe, ChevronRight, Loader2 } from 'lucide-react';
import { UserProfile, Role } from '../types';
import { getTranslation } from '../lib/translations';
import { tint } from '../lib/colors';

type Language = 'es' | 'en';

interface LoginScreenProps {
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
}

const ROLE_CONFIG: Record<Role, { color: string; icon: ComponentType<any> }> = {
  cocinero: { color: 'var(--sf-amber)', icon: ChefHat },
  comprador: { color: 'var(--sf-accent)', icon: ShoppingCart },
  admin: { color: 'var(--sf-violet)', icon: BarChart3 },
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const roleLabel = (role: Role, t: ReturnType<typeof getTranslation>) =>
  role === 'cocinero' ? t.roleCook : role === 'comprador' ? t.roleBuyer : t.roleAdmin;

export function LoginScreen({ users, onSelectUser, language, onChangeLanguage }: LoginScreenProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const t = getTranslation(language);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      setLoadTimedOut(false);
      return;
    }
    const id = setTimeout(() => setLoadTimedOut(true), 8000);
    return () => clearTimeout(id);
  }, [users.length]);

  const cooks = users.filter((u) => u.role === 'cocinero');
  const buyers = users.filter((u) => u.role === 'comprador');
  const admins = users.filter((u) => u.role === 'admin');

  const handleSelect = (user: UserProfile) => {
    if (loadingUserId) return;
    setLoadingUserId(user.id);
    setTimeout(() => onSelectUser(user), 500);
  };

  const sections: Array<{ key: Role; label: string; users: UserProfile[] }> = [
    { key: 'cocinero', label: t.loginSectionCooks, users: cooks },
    { key: 'comprador', label: t.loginSectionBuyers, users: buyers },
    { key: 'admin', label: t.loginSectionAdmins, users: admins },
  ];

  return (
    <div className="min-h-screen sf-page flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: tint('var(--sf-accent)', 8) }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: tint('var(--sf-amber)', 8) }} />
      </div>

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-10 safe-top">
        <button
          onClick={() => onChangeLanguage(language === 'es' ? 'en' : 'es')}
          aria-pressed={language === 'en'}
          aria-label={t.languagePreference}
          className="flex items-center gap-1.5 px-3 min-h-11 rounded-xl sf-btn-ghost text-xs font-bold transition active:scale-95"
        >
          <Globe className="w-3.5 h-3.5" />
          {language === 'es' ? 'EN' : 'ES'}
        </button>
      </div>

      {/* Logo */}
      <div
        className="flex flex-col items-center mb-10 transition-all duration-700"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-16px)' }}
      >
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
          style={{ background: 'var(--sf-brand-gradient)', boxShadow: 'var(--sf-brand-shadow)' }}
        >
          <Flame className="w-9 h-9" style={{ color: '#ffffff' }} />
        </div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--sf-text)' }}>SupplyFlow</h1>
        <p className="sf-muted text-sm mt-1">{t.loginSelectProfile}</p>
      </div>

      {/* User sections */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 text-sm" role="status" aria-live="polite">
          <div className="flex items-center gap-2 sf-subtle">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t.loginLoading}</span>
          </div>
          {loadTimedOut && (
            <div className="flex flex-col items-center gap-2 animate-fadeIn">
              <span className="sf-subtle text-xs">{t.loginLoadError}</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 min-h-11 rounded-xl sf-btn-ghost text-xs font-bold transition active:scale-95"
              >
                {t.loginRetry}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md space-y-6">
          {sections.filter((s) => s.users.length > 0).map((section, si) => {
            const config = ROLE_CONFIG[section.key];
            const SectionIcon = config.icon;
            return (
              <div
                key={section.key}
                className="transition-all duration-700"
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transitionDelay: `${si * 100 + 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <SectionIcon className="w-4 h-4" style={{ color: config.color }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: config.color }}>{section.label}</span>
                </div>

                <div className="space-y-2">
                  {section.users.map((user) => {
                    const isLoading = loadingUserId === user.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelect(user)}
                        disabled={loadingUserId !== null}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 text-left active:scale-[0.98] hover:brightness-105 disabled:opacity-60"
                        style={{ background: tint(config.color, 10), border: `1px solid ${tint(config.color, 28)}` }}
                      >
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{ background: tint(config.color, 16), color: config.color, border: `1px solid ${tint(config.color, 30)}` }}>
                          {getInitials(user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate" style={{ color: 'var(--sf-text)' }}>{user.name}</div>
                          <div className="text-xs mt-0.5" style={{ color: config.color }}>
                            {roleLabel(user.role, t)}
                          </div>
                        </div>
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" style={{ color: config.color }} />
                        ) : (
                          <ChevronRight className="w-4 h-4 sf-subtle" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="absolute bottom-6 sf-subtle text-xs transition-opacity duration-700 safe-bottom" style={{ opacity: mounted ? 1 : 0, transitionDelay: '500ms' }}>
        SupplyFlow V2 · Demo
      </p>
    </div>
  );
}
