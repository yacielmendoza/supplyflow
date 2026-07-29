import React, { useState } from 'react';
import { UserProfile } from '../types';
import { getTranslation, Language } from '../lib/translations';
import {
  X,
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

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  currentUser,
  onClose,
  onSaveProfile,
}) => {
  const currentLang: Language = currentUser.language || 'es';
  const t = getTranslation(currentLang);

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [language, setLanguage] = useState<Language>(currentUser.language || 'es');
  const [theme, setTheme] = useState<'dark' | 'light'>(currentUser.theme || 'dark');
  const [isSuccessSaved, setIsSuccessSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...currentUser,
      name,
      email,
      phone,
      avatarUrl,
      language,
      theme,
    };

    onSaveProfile(updated);
    playAlertSound('success');
    setIsSuccessSaved(true);

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const currentT = getTranslation(language);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {currentT.settingsTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {currentT.settingsSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {isSuccessSaved && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-600/50 rounded-2xl text-emerald-300 text-xs sm:text-sm font-bold flex items-center space-x-2 animate-bounce">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{currentT.savedSuccess}</span>
            </div>
          )}

          {/* SECTION 1: Profile Picture / Avatar */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>{currentT.profilePicture}</span>
            </label>

            <div className="flex items-center space-x-4">
              {/* Avatar Preview */}
              <div className="relative group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border-2 border-emerald-500/50 overflow-hidden flex items-center justify-center shadow-lg">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarUrl('')}
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Avatar Presets */}
              <div className="flex-1 space-y-2">
                <div className="text-xs text-slate-400">{currentT.avatarChooseLabel}</div>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 ${
                        avatarUrl === preset.url
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-4 h-4 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom URL Input */}
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://ejemplo.com/mi-foto.jpg"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* SECTION 2: Personal Details */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <User className="w-4 h-4 text-emerald-400" />
              <span>{currentT.personalDetails}</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{currentT.fullName}</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{currentT.email}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="usuario@restosupply.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center justify-between pt-2 text-xs text-slate-400 border-t border-slate-800/60">
              <span className="flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>{currentT.userRoleLabel}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 font-black text-slate-200 uppercase">
                {currentUser.role}
              </span>
            </div>
          </div>

          {/* SECTION 3: WhatsApp or Phone Number for Messages */}
          <div className="space-y-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>{currentT.phoneWhatsApp}</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">{currentT.activeForAlerts}</span>
            </label>

            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (432) 888-1020"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>
            <p className="text-[11px] text-slate-400">{currentT.phoneHelp}</p>
          </div>

          {/* SECTION 4: Language Selection */}
          <div className="space-y-2.5 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>{currentT.languagePreference}</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition flex items-center justify-center space-x-2 ${
                  language === 'es'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span>{currentT.spanish}</span>
              </button>

              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition flex items-center justify-center space-x-2 ${
                  language === 'en'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span>{currentT.english}</span>
              </button>
            </div>
          </div>

          {/* SECTION 5: Visual Theme Selection */}
          <div className="space-y-2.5 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{currentT.themePreference}</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition flex items-center justify-center space-x-2 ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-emerald-400 border-emerald-500/80 ring-2 ring-emerald-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>{currentT.themeDark}</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition flex items-center justify-center space-x-2 ${
                  theme === 'light'
                    ? 'bg-amber-100 text-slate-950 border-amber-400 ring-2 ring-amber-400/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>{currentT.themeLight}</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              {currentT.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4 text-slate-950" />
              <span>{currentT.saveChanges}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
