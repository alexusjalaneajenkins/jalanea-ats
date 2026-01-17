import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to prevent prerender errors
let supabaseInstance: SupabaseClient | null = null;
let supabaseConfigured = false;

/**
 * Check if Supabase is configured with required environment variables.
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(supabaseUrl && supabaseAnonKey);
}

function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      supabaseConfigured = false;
      return null;
    }

    supabaseConfigured = true;
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Get or create a device ID for anonymous users
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem('ats_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('ats_device_id', deviceId);
  }
  return deviceId;
}

// Types for ATS analyses
export interface SavedAnalysis {
  id: string;
  device_id: string;
  score: number;
  summary: string;
  job_title: string;
  keyword_match_rate: number;
  keywords_found: string[];
  keywords_missing: string[];
  sections: {
    name: string;
    score: number;
    feedback: string;
  }[];
  suggestions: string[];
  created_at: string;
}

// Save an analysis result
export async function saveAnalysis(
  deviceId: string,
  jobTitle: string,
  result: {
    score: number;
    summary: string;
    keywordMatches: {
      found: string[];
      missing: string[];
      matchRate: number;
    };
    sections: { name: string; score: number; feedback: string }[];
    overallSuggestions: string[];
  }
): Promise<{ data: SavedAnalysis | null; error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: new Error('Cloud storage not configured. History is stored locally only.') };
  }

  try {
    const { data, error } = await supabase
      .from('ats_analyses')
      .insert({
        device_id: deviceId,
        score: result.score,
        summary: result.summary,
        job_title: jobTitle,
        keyword_match_rate: result.keywordMatches.matchRate,
        keywords_found: result.keywordMatches.found,
        keywords_missing: result.keywordMatches.missing,
        sections: result.sections,
        suggestions: result.overallSuggestions,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

// Get analysis history for a device
export async function getAnalysisHistory(deviceId: string): Promise<{ data: SavedAnalysis[]; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    // Supabase not configured - return empty history without error
    // This is expected in local-only mode
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('ats_analyses')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      // Check for auth/API key errors - these are configuration issues, not user errors
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('api key') || errorMessage.includes('invalid') || errorMessage.includes('unauthorized') || error.code === 'PGRST301') {
        console.warn('Supabase not properly configured, running in local-only mode');
        return { data: [], error: null };
      }
      console.error('Error fetching history:', error);
      return { data: [], error: 'Failed to load history' };
    }
    return { data: data || [], error: null };
  } catch (err) {
    // Network or other errors - fail silently for better UX
    console.warn('Could not connect to cloud storage:', err);
    return { data: [], error: null };
  }
}

// Delete an analysis
export async function deleteAnalysis(id: string, deviceId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from('ats_analyses')
    .delete()
    .eq('id', id)
    .eq('device_id', deviceId);

  return !error;
}
