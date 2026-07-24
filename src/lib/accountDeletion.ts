export interface AccountDeletionResult {
  ok: boolean;
  error: string | null;
}

export interface AccountDeletionDependencies {
  requestDeletion(): Promise<AccountDeletionResult>;
  eraseLocalData(): Promise<void>;
  signOut(): Promise<{ error: string | null }>;
}

/**
 * Execute the account-deletion sequence.
 *
 * Kept independent of browser and Supabase modules so ordering and
 * partial-failure behavior can be tested in Node.
 */
export async function deleteAccountWithDependencies(
  dependencies: AccountDeletionDependencies
): Promise<{ error: string | null }> {
  let deletionResult: AccountDeletionResult;

  try {
    deletionResult = await dependencies.requestDeletion();
  } catch {
    return {
      error: 'Unable to delete your ATS account data. Check your connection and try again.',
    };
  }

  if (!deletionResult.ok) {
    return { error: deletionResult.error || 'Failed to delete ATS account data' };
  }

  let localErasureFailed = false;
  try {
    await dependencies.eraseLocalData();
  } catch {
    localErasureFailed = true;
  }

  let signOutError: string | null = null;
  try {
    const result = await dependencies.signOut();
    signOutError = result.error;
  } catch {
    signOutError = 'Sign-out request failed';
  }

  if (localErasureFailed && signOutError) {
    return {
      error: 'Your ATS account data was deleted, but this browser could not fully clear its local resume and analysis data or complete sign-out. Clear this site’s data in your browser before using this device again.',
    };
  }

  if (localErasureFailed) {
    return {
      error: 'Your ATS account data was deleted, but this browser could not fully clear its local resume and analysis data. Clear this site’s data in your browser before using this device again.',
    };
  }

  if (signOutError) {
    return {
      error: 'Your ATS account data and local browser data were deleted, but sign-out failed. Close this browser and sign out again before using this device.',
    };
  }

  return { error: null };
}
