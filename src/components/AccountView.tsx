import React, { useState } from 'react';
import { UserProfile } from '../types';
import { getTranslation, Language } from '../lib/translations';
import { formatCleanName } from '../lib/formatters';
import {
  User,
  Mail,
  Phone,
  Camera,
  Moon,
  Sun,
  Globe,
  Smartphone,
  LogOut,
  Users,
  Check,
  Shield,
  Download,
  Share,
  PlusSquare,
} from 'lucide-react';
import { playAlertSound } from '../lib/notifications';
import { ViewHeader } from './ViewHeader';

interface AccountViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onBack: () => void;
  onSaveProfile: (updated: UserProfile) => void;
  onSelectUser: (u: UserProfile) => void;
  isPWAInstallable?: boolean;
  isIOS?: boolean;
  onInstallDirect?: () => void;
  onLogout: () => void;
}

const AVATAR_PRESETS = [
  { id: 'chef', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80' },
  { id: 'runner', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 'admin', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80' },
];

const roleLabel = (role: UserProfile['role'], t: ReturnType<typeof getTranslation>) =>
  role === 'cocinero' ? t.roleCook : role === 'comprador' ? t.roleBuyer : t.roleAdmin;

/**
 * Full-screen account view (replaces ProfileSettingsModal + the old Settings
 * tab). Inline-editable profile, instant theme/language toggles, user switching,
 * and logout — no modals, single entry point from the header avatar.
 */
export const AccountView: React.FC<AccountViewProps> = ({
  currentUser,
  users,
  onBack,
  onSaveProfile,
  onSelectUser,
  isPWAInstallable,
  isIOS,
  onInstallDirect,
  onLogout,
}) => {
  const t = getTranslation(currentUser.language || 'es');
  const theme = currentUser.theme || 'dark';
  const language: Language = currentUser.language || 'es';
  const [showInstall, setShowInstall] = useState(false);

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty =
    name !== currentUser.name ||
    email !== (currentUser.email || '') ||
    phone !== currentUser.phone ||
    avatarUrl !== (currentUser.avatarUrl || '');

  const saveProfile = () => {
    onSaveProfile({ ...currentUser, name, email, phone, avatarUrl });
    playAlertSound('success');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  };

  const setTheme = (next: 'dark' | 'light') => {
    if (next === theme) return;
    onSaveProfile({ ...currentUser, theme: next });
    playAlertSound('click');
  };
  const setLanguage = (next: Language) => {
    if (next === language) return;
    onSaveProfile({ ...currentUser, language: next });
    playAlertSound('click');
  };

  const inputStyle: React.CSSProperties = { color: 'var(--sf-text)' };

  return (
    <div className="min-h-screen sf-page">
      <ViewHeader title={t.accountTitle} onBack={onBack} />

      <div className="max-w-2xl mx-auto px-4 pb-16 pt-4 space-y-5">
        {/* Profile — inline editable */}
        <section className="sf-card p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--sf-accent-soft)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setAvatarUrl('')} />
              ) : (
                <span className="text-3xl font-black" style={{ color: 'var(--sf-accent)' }}>
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xl font-black truncate" style={{ color: 'var(--sf-text)' }}>
                {formatCleanName(name)}
              </div>
              <div className="flex items-center gap-1.5 sf-muted text-xs font-bold uppercase tracking-wider mt-1">
                <Shield className="w-3.5 h-3.5" style={{ color: 'var(--sf-violet)' }} />
                {roleLabel(currentUser.role, t)}
              </div>
            </div>
          </div>

          {/* Avatar presets */}
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 sf-muted flex-shrink-0" />
            <div className="flex gap-2">
              {AVATAR_PRESETS.map((p) => {
                const active = avatarUrl === p.url;
                return (
                  <button
                    key={p.id}
                    onClick={() => setAvatarUrl(p.url)}
                    className="w-9 h-9 rounded-xl overflow-hidden transition"
                    style={{ outline: active ? '2px solid var(--sf-accent)' : '1px solid var(--sf-border)', outlineOffset: '1px' }}
                  >
                    <img src={p.url} alt={p.id} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-2.5">
            <Field icon={User} value={name} onChange={setName} placeholder={t.fullName} inputStyle={inputStyle} />
            <Field icon={Mail} value={email} onChange={setEmail} placeholder={t.email} type="email" inputStyle={inputStyle} />
            <Field icon={Phone} value={phone} onChange={setPhone} placeholder={t.phoneWhatsApp} type="tel" inputStyle={inputStyle} />
          </div>

          <button
            onClick={saveProfile}
            disabled={!dirty && !savedFlash}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition disabled:opacity-45"
            style={
              savedFlash
                ? { background: 'var(--sf-accent-soft)', color: 'var(--sf-accent)', border: '1px solid var(--sf-accent)' }
                : { background: 'var(--sf-accent)', color: 'var(--sf-accent-contrast)' }
            }
          >
            <Check className="w-4 h-4" />
            {savedFlash ? t.savedSuccess : t.saveChanges}
          </button>
        </section>

        {/* Appearance */}
        <section className="sf-card p-4 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider sf-muted">{t.setAppearance}</h2>
          <div className="grid grid-cols-2 gap-2">
            {([['dark', Moon, t.themeDark], ['light', Sun, t.themeLight]] as const).map(([value, Icon, label]) => (
              <ToggleBtn key={value} active={theme === value} icon={Icon} label={label} onClick={() => setTheme(value)} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([['es', t.spanish], ['en', t.english]] as const).map(([value, label]) => (
              <ToggleBtn key={value} active={language === value} icon={Globe} label={label} onClick={() => setLanguage(value)} />
            ))}
          </div>
          {isPWAInstallable && (
            <>
              <button
                onClick={() => setShowInstall((s) => !s)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm sf-btn-accent"
              >
                <Smartphone className="w-4 h-4" />
                {t.installApp}
              </button>

              {showInstall && (
                <div className="sf-inset p-4 space-y-2 animate-fadeIn">
                  {isIOS ? (
                    <>
                      <p className="text-xs font-black" style={{ color: 'var(--sf-amber)' }}>iPhone / iPad (Safari)</p>
                      <ol className="space-y-1.5 text-xs sf-muted">
                        <li className="flex items-center gap-1.5">
                          <span>1. {t.pwaIosStep1}</span>
                          <Share className="w-4 h-4 sf-accent" />
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span>2. {t.pwaIosStep2}</span>
                          <PlusSquare className="w-4 h-4 sf-accent" />
                        </li>
                        <li>3. {t.pwaIosStep3}</li>
                      </ol>
                    </>
                  ) : (
                    <button
                      onClick={onInstallDirect}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm sf-btn-accent"
                    >
                      <Download className="w-4 h-4" />
                      {t.pwaInstallBtn}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Switch user */}
        <section className="sf-card p-4 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider sf-muted flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t.changeUser}
          </h2>
          <div className="space-y-2">
            {users.map((u) => {
              const active = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    if (!active) onSelectUser(u);
                    playAlertSound('click');
                  }}
                  className="w-full flex items-center gap-3 sf-inset px-3 py-2.5 text-left transition hover:brightness-95"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'var(--sf-accent-soft)' }}>
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-sm font-black" style={{ color: 'var(--sf-accent)' }}>{u.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: 'var(--sf-text)' }}>{formatCleanName(u.name)}</div>
                    <div className="sf-subtle text-xs">{roleLabel(u.role, t)}</div>
                  </div>
                  {active && <Check className="w-5 h-5 sf-accent flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm"
          style={{ background: 'var(--sf-surface-2)', color: 'var(--sf-rose)', border: '1px solid var(--sf-border)' }}
        >
          <LogOut className="w-4 h-4" />
          {t.logout}
        </button>
      </div>
    </div>
  );
};

const Field: React.FC<{
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  inputStyle: React.CSSProperties;
}> = ({ icon: Icon, value, onChange, placeholder, type = 'text', inputStyle }) => (
  <div className="relative">
    <Icon className="w-4 h-4 sf-subtle absolute left-3 top-1/2 -translate-y-1/2" />
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full sf-inset pl-10 pr-3 py-3 text-sm font-semibold focus:outline-none"
      style={inputStyle}
    />
  </div>
);

const ToggleBtn: React.FC<{ active: boolean; icon: React.ElementType; label: string; onClick: () => void }> = ({
  active,
  icon: Icon,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition"
    style={{
      background: active ? 'var(--sf-accent-soft)' : 'var(--sf-surface-2)',
      color: active ? 'var(--sf-accent)' : 'var(--sf-text-muted)',
      border: active ? '1px solid var(--sf-accent)' : '1px solid var(--sf-border)',
    }}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);
