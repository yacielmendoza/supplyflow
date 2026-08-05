import React, { useRef } from 'react';
import { cn } from '../../lib/cn';
import { Badge, type Tone } from './Badge';

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: number;
  badgeTone?: Tone;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  'aria-label'?: string;
  className?: string;
  /** 'segmented' = pill group on a track; 'underline' = text tabs. */
  variant?: 'segmented' | 'underline';
}

/**
 * Accessible tab strip (roving focus + arrow-key navigation, `aria-selected`).
 * Used as a segmented control / filter; it manages selection only, not panels.
 */
export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  variant = 'segmented',
  className,
  ...rest
}: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (index + dir + items.length) % items.length;
    refs.current[next]?.focus();
    onChange(items[next].id);
  };

  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn(
        variant === 'segmented'
          ? 'inline-flex items-center gap-1 p-1 rounded-control bg-inset border border-border-default'
          : 'flex items-center gap-1 border-b border-border-default',
        className
      )}
    >
      {items.map((item, i) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'inline-flex items-center gap-1.5 font-bold whitespace-nowrap ' +
                'transition duration-[var(--duration-fast)] touch-manipulation',
              variant === 'segmented'
                ? cn(
                    'px-3 h-9 rounded-[calc(var(--radius-control)-0.25rem)] text-sm',
                    active
                      ? 'bg-accent text-accent-contrast shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )
                : cn(
                    'px-3 h-10 text-sm border-b-2 -mb-px',
                    active
                      ? 'border-accent text-text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  )
            )}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <Badge
                solid={active}
                tone={item.badgeTone ?? (active ? 'neutral' : 'accent')}
                className="ml-0.5"
              >
                {item.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
