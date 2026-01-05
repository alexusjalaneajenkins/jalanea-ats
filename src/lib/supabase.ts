import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to prevent prerender errors
let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables not configured');
    }

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
  try {
    const { data, error } = await getSupabase()
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
  const { data, error } = await getSupabase()
    .from('ats_analyses')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching history:', error);
    return { data: [], error: error.message || 'Failed to load history' };
  }
  return { data: data || [], error: null };
}

// Delete an analysis
export async function deleteAnalysis(id: string, deviceId: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('ats_analyses')
    .delete()
    .eq('id', id)
    .eq('device_id', deviceId);

  return !error;
}
