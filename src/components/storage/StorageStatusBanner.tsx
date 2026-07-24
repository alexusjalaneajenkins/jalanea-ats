'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  ensurePersistentStorageCapability,
  getServerStorageCapabilitySnapshot,
  getStorageCapabilitySnapshot,
  subscribeToStorageCapability,
} from '@/lib/storage/capability';

export function StorageStatusBanner() {
  const storage = useSyncExternalStore(
    subscribeToStorageCapability,
    getStorageCapabilitySnapshot,
    getServerStorageCapabilitySnapshot
  );

  useEffect(() => {
    void ensurePersistentStorageCapability();
  }, []);

  if (storage.mode !== 'ephemeral') return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-950/95 p-4 text-amber-50 shadow-2xl backdrop-blur"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
      <div>
        <p className="text-sm font-bold">Temporary browser storage</p>
        <p className="mt-1 text-xs leading-5 text-amber-100/85">
          You can keep working in this tab, but this browser blocked permanent
          storage. Your resume sessions, history, and AI-key settings will be
          lost when the tab closes.
        </p>
      </div>
    </div>
  );
}
