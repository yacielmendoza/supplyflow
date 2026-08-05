import React, { useState } from 'react';
import { UserProfile } from '../types';
import { getTranslation, Language } from '../lib/translations';
import {
  User,
  Phone,
  Mail,
  Globe,
  Sun,
  Moon,
  Camera,
  Check,
  MessageCircle,
  Shield,
  Sparkles,
} from 'lucide-react';
import { playAlertSound } from '../lib/notifications';
import { cn } from '../lib/cn';
import { Badge, Button, Sheet } from './ui';

interface ProfileSettingsModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onSaveProfile: (updatedProfile: UserProfile) => void;
}

const AVATAR_PRESETS = [
  {
    id: 'chef',
    label: 'Cook / Chef',
    url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'runner',
    label: 'Runner / Buyer',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'admin',
    label: 'Admin / Manager',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  },
];

const section = 'space-y-3 bg-inset p-4 rounded-card border border-border-default';
const sectionLabel =
  'text-xs font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5';
const input =
  'w-full bg-surface border border-border-default rounded-control px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none';

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  currentUser,
  onClose,
  onSaveProfile,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [language, setLanguage] = useState<Language>(currentUser.language || 'es');
  const [theme, setTheme] = useState<'dark' | 'light'>(currentUser.theme || 'dark');
  const [isSuccessSaved, setIsSuccessSaved] = useState(false);

  const currentT = getTranslation(language);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({ ...currentUser, name, email, phone, avatarUrl, language, theme });
    playAlertSound('success');
    setIsSuccessSaved(true);
    setTimeout(onClose, 1200);
  };

  const toggle = (active: boolean) =>
    cn(
      'py-2.5 px-3 rounded-control border text-xs font-extrabold transition flex items-center justify-center gap-2',
      active
        ? 'bg-accent text-accent-contrast border-accent shadow-sm'
        : 'bg-surface border-border-default text-text-secondary hover:text-text-primary'
    );

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={currentT.settingsTitle}
      ariaLabel={currentT.settingsTitle}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>
            {currentT.cancel}
          </Button>
          <Button
            type="submit"
            form="profile-form"
            variant="primary"
            size="md"
            leftIcon={<Check className="w-4 h-4" />}
          >
            {currentT.saveChanges}
          </Button>
        </div>
      }
    >
      <p className="text-xs text-text-secondary mb-4">{currentT.settingsSubtitle}</p>

      <form id="profile-form" onSubmit={handleSave} className="space-y-5">
        {isSuccessSaved && (
          <div className="p-3 bg-success/10 border border-success/40 rounded-card text-success text-xs sm:text-sm font-bold flex items-center gap-2">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{currentT.savedSuccess}</span>
          </div>
        )}

        {/* Avatar */}
        <div className={section}>
          <span className={sectionLabel}>
            <Camera className="w-4 h-4 text-accent" />
            {currentT.profilePicture}
          </span>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-card bg-elevated border-2 border-accent/50 overflow-hidden flex items-center justify-center shadow-lg flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarUrl('')}
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-accent">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-xs text-text-secondary">{currentT.avatarChooseLabel}</div>
              <div className="flex flex-wrap gap-2">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAvatarUrl(preset.url)}
                    aria-pressed={avatarUrl === preset.url}
                    className={cn(
                      'px-2.5 py-1 rounded-control text-xs font-bold border transition flex items-center gap-1.5',
                      avatarUrl === preset.url
                        ? 'bg-accent text-accent-contrast border-accent'
                        : 'bg-surface border-border-default text-text-secondary hover:text-text-primary'
                    )}
                  >
                    <img
                      src={preset.url}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="avatar-url" className="sr-only">
              {currentT.profilePicture}
            </label>
            <input
              id="avatar-url"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://ejemplo.com/mi-foto.jpg"
              className={input}
            />
          </div>
        </div>

        {/* Personal details */}
        <div className={section}>
          <span className={sectionLabel}>
            <User className="w-4 h-4 text-accent" />
            {currentT.personalDetails}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="pf-name" className="text-xs font-bold text-text-secondary">
                {currentT.fullName}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  id="pf-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(input, 'pl-9 font-bold')}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="pf-email" className="text-xs font-bold text-text-secondary">
                {currentT.email}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  id="pf-email"
                  type="email"
                  placeholder="usuario@restosupply.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(input, 'pl-9')}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 text-xs text-text-secondary border-t border-border-default">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-info" />
              {currentT.userRoleLabel}
            </span>
            <Badge tone="neutral" className="uppercase">
              {currentUser.role}
            </Badge>
          </div>
        </div>

        {/* Phone / WhatsApp */}
        <div className={section}>
          <span className="text-xs font-black uppercase tracking-wider text-text-secondary flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-accent" />
              {currentT.phoneWhatsApp}
            </span>
            <span className="text-[10px] text-accent font-bold">{currentT.activeForAlerts}</span>
          </span>
          <div className="relative">
            <Phone className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
            <label htmlFor="pf-phone" className="sr-only">
              {currentT.phoneWhatsApp}
            </label>
            <input
              id="pf-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (432) 888-1020"
              className={cn(input, 'pl-9 font-bold')}
            />
          </div>
          <p className="text-[11px] text-text-muted">{currentT.phoneHelp}</p>
        </div>

        {/* Language */}
        <div className={section}>
          <span className={sectionLabel}>
            <Globe className="w-4 h-4 text-accent" />
            {currentT.languagePreference}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={language === 'es'} onClick={() => setLanguage('es')} className={toggle(language === 'es')}>
              {currentT.spanish}
            </button>
            <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')} className={toggle(language === 'en')}>
              {currentT.english}
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className={section}>
          <span className={sectionLabel}>
            <Sparkles className="w-4 h-4 text-accent" />
            {currentT.themePreference}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')} className={toggle(theme === 'dark')}>
              <Moon className="w-4 h-4" />
              {currentT.themeDark}
            </button>
            <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')} className={toggle(theme === 'light')}>
              <Sun className="w-4 h-4 text-warning" />
              {currentT.themeLight}
            </button>
          </div>
        </div>
      </form>
    </Sheet>
  );
};
