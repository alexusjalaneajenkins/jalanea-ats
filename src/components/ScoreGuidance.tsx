'use client';

import { AlertTriangle, Target, Lightbulb } from 'lucide-react';
import { GuidanceItem, GuidancePriority } from '@/lib/analysis/scoreGuidance';

interface ScoreGuidanceProps {
  items: GuidanceItem[];
  onAction: (target: GuidanceItem['actionTarget']) => void;
}

const priorityConfig: Record<GuidancePriority, {
  icon: typeof AlertTriangle;
  borderColor: string;
  iconColor: string;
  bgColor: string;
  badgeColor: string;
  badgeText: string;
}> = {
  critical: {
    icon: AlertTriangle,
    borderColor: 'border-red-500/40',
    iconColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    badgeColor: 'bg-red-500/20 text-red-300',
    badgeText: 'Fix first',
  },
  important: {
    icon: Target,
    borderColor: 'border-amber-500/40',
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    badgeColor: 'bg-amber-500/20 text-amber-300',
    badgeText: 'Recommended',
  },
  suggested: {
    icon: Lightbulb,
    borderColor: 'border-indigo-500/40',
    iconColor: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    badgeColor: 'bg-indigo-500/20 text-indigo-300',
    badgeText: 'Optional',
  },
};

export function ScoreGuidance({ items, onAction }: ScoreGuidanceProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white">What to do next</h3>
      {items.map((item) => {
        const config = priorityConfig[item.priority];
        const Icon = config.icon;

        return (
          <div
            key={item.id}
            className={`rounded-xl border p-4 ${config.borderColor} ${config.bgColor}`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{item.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badgeColor}`}>
                    {config.badgeText}
                  </span>
                </div>
                <p className="text-xs text-indigo-300 mb-2">{item.description}</p>
              </div>
              <button
                onClick={() => onAction(item.actionTarget)}
                className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
              >
                {item.actionLabel}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
