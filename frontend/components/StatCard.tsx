'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  accentColor?: 'blue' | 'sky' | 'cyan' | 'navy' | 'emerald' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'blue',
}) => {
  const colorGradients = {
    blue: 'from-[#0A66C2]/15 to-[#10AEE6]/5 text-[#0A66C2]',
    sky: 'from-[#10AEE6]/15 to-[#1DE0FF]/5 text-[#10AEE6]',
    cyan: 'from-[#1DE0FF]/15 to-transparent text-[#0A66C2]',
    navy: 'from-[#12213F]/15 to-transparent text-[#12213F] dark:text-slate-200',
    emerald: 'from-emerald-500/15 to-transparent text-emerald-600 dark:text-emerald-400',
    amber: 'from-amber-500/15 to-transparent text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* Subtle top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0A66C2] via-[#10AEE6] to-[#1DE0FF] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {title}
          </p>
          <h4 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--navy)] dark:text-white">
            {value}
          </h4>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorGradients[accentColor]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[var(--border)] text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
                trend.isPositive !== false
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
              }`}
            >
              {trend.isPositive !== false ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-[var(--text-muted)]">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
