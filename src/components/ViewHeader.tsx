import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { playAlertSound } from '../lib/notifications';

interface ViewHeaderProps {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
  backLabel?: string;
}

/**
 * Sticky top bar for drill-in views (Account, Notifications). A back affordance
 * instead of a modal close — the screen is a real view, not an overlay.
 */
export const ViewHeader: React.FC<ViewHeaderProps> = ({ title, onBack, right, backLabel = 'Back' }) => {
  return (
    <div
      className="sticky top-0 z-40 safe-top"
      style={{
        background: 'color-mix(in srgb, var(--sf-surface) 88%, transparent)',
        borderBottom: '1px solid var(--sf-border)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div className="max-w-2xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-2 h-16">
          <button
            onClick={() => {
              onBack();
              playAlertSound('click');
            }}
            aria-label={backLabel}
            className="w-11 h-11 rounded-2xl sf-btn-ghost flex items-center justify-center flex-shrink-0 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-lg font-black truncate" style={{ color: 'var(--sf-text)' }}>
            {title}
          </h1>
          {right && <div className="flex-shrink-0">{right}</div>}
        </div>
      </div>
    </div>
  );
};
