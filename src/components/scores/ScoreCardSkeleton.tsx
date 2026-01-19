'use client';

/**
 * Score Card Skeleton
 *
 * Animated loading placeholder that matches score card dimensions.
 * Used while scores are being calculated.
 */

export function ScoreCardSkeleton() {
  return (
    <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-20 bg-indigo-700/50 rounded" />
        <div className="flex items-center gap-1">
          <div className="h-4 w-12 bg-indigo-700/50 rounded-full" />
          <div className="h-4 w-4 bg-indigo-700/50 rounded" />
        </div>
      </div>

      {/* Gauge skeleton */}
      <div className="flex justify-center mb-3">
        <div className="w-20 h-20 rounded-full bg-indigo-700/20 border-[6px] border-indigo-700/30 flex items-center justify-center">
          <div className="h-6 w-8 bg-indigo-700/50 rounded" />
        </div>
      </div>

      {/* Label skeleton */}
      <div className="flex justify-center mb-3">
        <div className="h-6 w-20 bg-indigo-700/50 rounded-full" />
      </div>

      {/* Description skeleton */}
      <div className="flex justify-center">
        <div className="h-3 w-32 bg-indigo-700/30 rounded" />
      </div>
    </div>
  );
}

export default ScoreCardSkeleton;
