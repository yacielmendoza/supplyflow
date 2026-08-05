import { useState, useEffect, ComponentType } from 'react';
import { Flame, ChefHat, ShoppingCart, BarChart3, Globe, ChevronRight, Loader2 } from 'lucide-react';
import { UserProfile, Role } from '../types';
import { getTranslation } from '../lib/translations';

type Language = 'es' | 'en';

interface LoginScreenProps {
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
}

const ROLE_CONFIG: Record<
  Role,
  { color: string; bg: string; border: string; icon: ComponentType<{ className?: string }> }
> = {
  cocinero: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', icon: ChefHat },
  comprador: { color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30', icon: ShoppingCart },
  admin: { color: 'text-info', bg: 'bg-info/10', border: 'border-info/30', icon: BarChart3 },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function LoginScreen({ users, onSelectUser, language, onChangeLanguage }: LoginScreenProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const t = getTranslation(language);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
    <div className="min-h-screen bg-app text-text-primary flex flex-col items-center justify-center relative overflow-hidden px-4 px-safe">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-warning/5 rounded-full blur-3xl" />
      </div>

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-10" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}>
        <button
          onClick={() => onChangeLanguage(language === 'es' ? 'en' : 'es')}
          aria-label={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          className="flex items-center gap-1.5 px-3 h-9 rounded-control bg-elevated border border-border-default text-text-secondary text-xs font-medium hover:text-text-primary transition-colors"
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
        <div className="w-16 h-16 rounded-card bg-accent/20 border border-accent/30 flex items-center justify-center mb-4 shadow-lg">
          <Flame className="w-9 h-9 text-accent" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">SupplyFlow</h1>
        <p className="text-text-secondary text-sm mt-1">{t.loginSelectProfile}</p>
      </div>

      {/* User sections */}
      {users.length === 0 ? (
        <div className="flex items-center gap-2 text-text-muted text-sm" role="status">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t.loginLoading}</span>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-6">
          {sections
            .filter((s) => s.users.length > 0)
            .map((section, si) => {
              const config = ROLE_CONFIG[section.key];
              const SectionIcon = config.icon;

              return (
                <div
                  key={section.key}
                  className="transition-all duration-700"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                    transitionDelay: `${si * 100 + 100}ms`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <SectionIcon className={`w-4 h-4 ${config.color}`} />
                    <span className={`text-xs font-bold uppercase tracking-widest ${config.color}`}>
                      {section.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {section.users.map((user) => {
                      const isLoading = loadingUserId === user.id;
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleSelect(user)}
                          disabled={loadingUserId !== null}
                          className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-card border transition-all duration-200 text-left active:scale-[0.98] hover:scale-[1.01] ${config.bg} ${config.border} disabled:opacity-60`}
                        >
                          <div
                            className={`w-11 h-11 rounded-control flex items-center justify-center text-sm font-black flex-shrink-0 border ${config.bg} ${config.border} ${config.color}`}
                          >
                            {getInitials(user.name)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-text-primary font-bold text-sm truncate">{user.name}</div>
                            <div className={`text-xs mt-0.5 ${config.color} opacity-80`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </div>
                          </div>

                          {isLoading ? (
                            <Loader2 className={`w-4 h-4 animate-spin ${config.color}`} />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-text-muted" />
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

      {/* Footer */}
      <p
        className="absolute bottom-6 text-text-muted text-xs transition-opacity duration-700"
        style={{ opacity: mounted ? 1 : 0, transitionDelay: '500ms' }}
      >
        SupplyFlow V2 · Demo
      </p>
    </div>
  );
}
