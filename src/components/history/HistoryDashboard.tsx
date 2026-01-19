'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Download,
  Upload,
  Trash2,
  FileText,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { historyStore } from '@/lib/storage/historyStore';
import { HistoryEntry, ResumeGroup, HistoryStats } from '@/lib/types/history';
import { ResumeGroupCard, HistoryEntryCard } from './HistoryEntryCard';

type ViewMode = 'grouped' | 'chronological';

interface HistoryDashboardProps {
  /** Callback when dashboard is closed */
  onClose?: () => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * History Dashboard
 *
 * Shows analysis history with grouping by resume and improvement tracking.
 */
export function HistoryDashboard({ onClose, compact = false }: HistoryDashboardProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [groups, setGroups] = useState<ResumeGroup[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Load history on mount
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allEntries, groupedData, statsData] = await Promise.all([
        historyStore.getAll(),
        historyStore.getGrouped(),
        historyStore.getStats(),
      ]);
      setEntries(allEntries);
      setGroups(groupedData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Delete a single entry
  const handleDeleteEntry = useCallback(async (id: string) => {
    await historyStore.delete(id);
    loadHistory();
  }, [loadHistory]);

  // Clear all history
  const handleClearAll = useCallback(async () => {
    await historyStore.deleteAll();
    setShowConfirmClear(false);
    loadHistory();
  }, [loadHistory]);

  // Export history
  const handleExport = useCallback(async () => {
    try {
      const exportData = await historyStore.export();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jalanea-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export history:', error);
    }
  }, []);

  // Import history
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const imported = await historyStore.import(data);
      alert(`Imported ${imported} entries`);
      loadHistory();
    } catch (error) {
      console.error('Failed to import history:', error);
      alert('Failed to import history. Invalid file format.');
    }

    // Reset file input
    event.target.value = '';
  }, [loadHistory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/30 flex items-center justify-center">
            <History className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Analysis History</h2>
            <p className="text-sm text-indigo-400">
              Track your resume improvements over time
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={entries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-300 hover:text-indigo-200 hover:bg-indigo-800/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-300 hover:text-indigo-200 hover:bg-indigo-800/50 rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Import</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          {entries.length > 0 && (
            <button
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && stats.totalAnalyses > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-indigo-900/30 rounded-xl border border-indigo-500/20 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="text-2xl font-bold text-white">{stats.totalAnalyses}</span>
            </div>
            <div className="text-xs text-indigo-400">Total Analyses</div>
          </div>

          <div className="bg-indigo-900/30 rounded-xl border border-indigo-500/20 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span className="text-2xl font-bold text-white">{stats.uniqueResumes}</span>
            </div>
            <div className="text-xs text-indigo-400">Unique Resumes</div>
          </div>

          <div className="bg-indigo-900/30 rounded-xl border border-indigo-500/20 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span
                className={`text-2xl font-bold ${
                  stats.averageParseHealth >= 80
                    ? 'text-emerald-400'
                    : stats.averageParseHealth >= 60
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`}
              >
                {stats.averageParseHealth}%
              </span>
            </div>
            <div className="text-xs text-indigo-400">Avg Parse Health</div>
          </div>

          <div className="bg-indigo-900/30 rounded-xl border border-indigo-500/20 p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {stats.mostRecentAnalysis
                ? new Date(stats.mostRecentAnalysis).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : '-'}
            </div>
            <div className="text-xs text-indigo-400">Last Analysis</div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      {entries.length > 0 && (
        <div className="flex items-center gap-1 bg-indigo-950/80 rounded-lg p-1 w-fit">
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'grouped'
                ? 'bg-indigo-700/50 text-white'
                : 'text-indigo-400 hover:text-indigo-300'
            }`}
          >
            By Resume
          </button>
          <button
            onClick={() => setViewMode('chronological')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'chronological'
                ? 'bg-indigo-700/50 text-white'
                : 'text-indigo-400 hover:text-indigo-300'
            }`}
          >
            Chronological
          </button>
        </div>
      )}

      {/* Content */}
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-indigo-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
            <History className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No History Yet</h3>
          <p className="text-indigo-300 text-sm max-w-md mx-auto">
            Your analysis history will appear here after you analyze a resume.
            History is saved locally in your browser.
          </p>
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-3">
          {groups.map((group) => (
            <ResumeGroupCard
              key={group.resumeHash}
              group={group}
              onDeleteEntry={handleDeleteEntry}
              defaultExpanded={groups.length === 1}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <HistoryEntryCard
              key={entry.id}
              entry={entry}
              onDelete={handleDeleteEntry}
            />
          ))}
        </div>
      )}

      {/* Confirm Clear Dialog */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-indigo-900 rounded-2xl border border-indigo-500/30 p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Clear All History?</h3>
            </div>

            <p className="text-indigo-300 text-sm mb-6">
              This will permanently delete all {entries.length} analysis entries.
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Clear All History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
