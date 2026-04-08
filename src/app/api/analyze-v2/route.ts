import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { runV2Analysis } from '@/lib/v2';

export const maxDuration = 60;

const MAX_RESUME_CHARS = 30000;
const MAX_JD_CHARS = 20000;
const OWNER_UNLIMITED_EMAILS = new Set(['alexxusjenkins91@gmail.com']);

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp?.trim() || 'unknown');
}

function createRequestSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() { /* read-only */ },
    },
  });
}

async function isOwnerOrAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    const supabase = createRequestSupabaseClient(request);
    if (!supabase) return false;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) return false;
    return OWNER_UNLIMITED_EMAILS.has(user.email.trim().toLowerCase());
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.DEMO_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured on server' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const rawResume = typeof body?.resume === 'string' ? body.resume.trim() : '';
    const rawJD = typeof body?.jobDescription === 'string' ? body.jobDescription.trim() : '';
    const model = body?.model || 'gemini-2.5-flash';

    if (!rawResume || rawResume.length < 50) {
      return NextResponse.json({ error: 'Resume text too short or missing' }, { status: 400 });
    }
    if (!rawJD || rawJD.length < 50) {
      return NextResponse.json({ error: 'Job description too short or missing' }, { status: 400 });
    }

    // Truncate if needed
    const resume = rawResume.length > MAX_RESUME_CHARS
      ? rawResume.slice(0, MAX_RESUME_CHARS) + '\n[truncated]'
      : rawResume;
    const jobDescription = rawJD.length > MAX_JD_CHARS
      ? rawJD.slice(0, MAX_JD_CHARS) + '\n[truncated]'
      : rawJD;

    // Run the full V2 engine
    const result = await runV2Analysis(resume, jobDescription, apiKey, model);

    return NextResponse.json(result);
  } catch (error) {
    console.error('V2 Analysis Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'V2 analysis failed' },
      { status: 500 }
    );
  }
}
