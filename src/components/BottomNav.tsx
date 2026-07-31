import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { playAlertSound } from '../lib/notifications';

export interface BottomNavTab {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface BottomNavProps {
  tabs: BottomNavTab[];
  activeTab: string;
  onChange: (id: string) => void;
}

/**
 * Native-style bottom tab bar. Big touch targets, single active accent pill,
 * safe-area aware. Themed entirely through design tokens.
 */
export const BottomNav: React.FC<BottomNavProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 safe-bottom"
      style={{
        background: 'color-mix(in srgb, var(--sf-surface) 92%, transparent)',
        borderTop: '1px solid var(--sf-border)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--sf-shadow)',
      }}
    >
      <div className="max-w-5xl mx-auto px-2">
        <div className="flex items-stretch justify-around gap-1 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isActive) {
                    onChange(tab.id);
                    playAlertSound('click');
                  }
                }}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition"
                style={{ color: isActive ? 'var(--sf-accent)' : 'var(--sf-text-subtle)' }}
              >
                <span
                  className="relative flex items-center justify-center w-14 h-9 rounded-2xl transition"
                  style={{ background: isActive ? 'var(--sf-accent-soft)' : 'transparent' }}
                >
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.6 : 2} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className="absolute -top-1.5 right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow"
                      style={{ background: 'var(--sf-rose)' }}
                    >
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-bold tracking-tight leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
