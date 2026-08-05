import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { getTranslation } from '../lib/translations';
import { fetchAnalytics } from '../lib/api';
import { TrendingUp, Check, BarChart3 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Card, Skeleton } from './ui';

interface AnalyticsDashboardProps {
  currentUser: UserProfile;
}

interface TopItem {
  name: string;
  count: number;
}
interface AnalyticsData {
  totalRequests?: number;
  pendingRequests?: number;
  inProgressRequests?: number;
  completedRequests?: number;
  topRequestedItems?: TopItem[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ currentUser }) => {
  const t = getTranslation(currentUser.language ?? 'es');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label={t.analyticsLoading}>
        <Skeleton rounded="card" className="h-16" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} rounded="card" className="h-24" />
          ))}
        </div>
        <Skeleton rounded="card" className="h-40" />
      </div>
    );
  }

  const stats: { label: string; value: number; valueClass: string; sub: React.ReactNode }[] = [
    {
      label: t.analyticsTotal,
      value: data?.totalRequests || 0,
      valueClass: 'text-text-primary',
      sub: (
        <span className="text-accent flex items-center">
          <TrendingUp className="w-3 h-3 mr-1" />
          {t.analyticsCoordinated}
        </span>
      ),
    },
    {
      label: t.analyticsPendingLabel,
      value: data?.pendingRequests || 0,
      valueClass: 'text-warning',
      sub: <span className="text-text-secondary">{t.analyticsWaitingBuyer}</span>,
    },
    {
      label: t.analyticsInProgressLabel,
      value: data?.inProgressRequests || 0,
      valueClass: 'text-info',
      sub: <span className="text-text-secondary">{t.analyticsAtStore}</span>,
    },
    {
      label: t.analyticsCompletedLabel,
      value: data?.completedRequests || 0,
      valueClass: 'text-success',
      sub: (
        <span className="text-success flex items-center">
          <Check className="w-3 h-3 mr-1" />
          {t.analyticsTotalEfficiency}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card padding="md" className="shadow-lg">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          {t.analyticsTitle}
        </h2>
        <p className="text-xs text-text-secondary">{t.analyticsSubtitle}</p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} padding="md" className="shadow-md">
            <div className="text-text-secondary text-xs font-bold uppercase tracking-wider">
              {s.label}
            </div>
            <div className={cn('text-2xl font-black mt-1', s.valueClass)}>{s.value}</div>
            <div className="text-[10px] mt-1">{s.sub}</div>
          </Card>
        ))}
      </div>

      <Card padding="md" className="shadow-lg space-y-3">
        <h3 className="font-bold text-text-primary text-sm">{t.analyticsTopItems}</h3>
        <div className="space-y-2">
          {data?.topRequestedItems?.map((item, idx) => {
            const pct = Math.min(100, item.count * 25);
            return (
              <div key={idx} className="bg-inset p-2.5 rounded-control border border-border-default">
                <div className="flex justify-between items-center text-xs mb-1 font-semibold">
                  <span className="text-text-primary">{item.name}</span>
                  <span className="text-accent">
                    {item.count} {t.analyticsRequests}
                  </span>
                </div>
                <div
                  className="w-full bg-elevated rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={item.name}
                >
                  <div className="bg-accent h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
