import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { getTranslation } from '../lib/translations';
import { fetchAnalytics } from '../lib/api';
import {
  TrendingUp,
  Check,
  BarChart3,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  currentUser: UserProfile;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ currentUser }) => {
  const t = getTranslation(currentUser.language ?? 'es');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400">
        {t.analyticsLoading}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <span>{t.analyticsTitle}</span>
        </h2>
        <p className="text-xs text-slate-400">{t.analyticsSubtitle}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            {t.analyticsTotal}
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {data?.totalRequests || 0}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>{t.analyticsCoordinated}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            {t.analyticsPendingLabel}
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {data?.pendingRequests || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{t.analyticsWaitingBuyer}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            {t.analyticsInProgressLabel}
          </div>
          <div className="text-2xl font-black text-orange-400 mt-1">
            {data?.inProgressRequests || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{t.analyticsAtStore}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            {t.analyticsCompletedLabel}
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {data?.completedRequests || 0}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center">
            <Check className="w-3 h-3 mr-1" />
            <span>{t.analyticsTotalEfficiency}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg space-y-3">
        <h3 className="font-bold text-white text-sm">{t.analyticsTopItems}</h3>

        <div className="space-y-2">
          {data?.topRequestedItems?.map((item: any, idx: number) => (
            <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center text-xs mb-1 font-semibold">
                <span className="text-slate-200">{item.name}</span>
                <span className="text-emerald-400">{item.count} {t.analyticsRequests}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, item.count * 25)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
