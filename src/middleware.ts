import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (resets on server restart)
// For production, consider Redis or a database-backed solution
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute

function getRateLimitKey(request: NextRequest): string {
  // Use IP address as the key, fallback to a header if behind proxy
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // No record or window expired - start new window
  if (!record || now > record.resetTime) {
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetTime };
  }

  // Within window - check limit
  if (record.count < MAX_REQUESTS_PER_WINDOW) {
    record.count++;
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetTime: record.resetTime };
  }

  // Rate limit exceeded
  return { allowed: false, remaining: 0, resetTime: record.resetTime };
}

export function middleware(request: NextRequest) {
  // Apply rate limiting to analyze endpoints
  const isAnalyzeEndpoint =
    request.nextUrl.pathname === '/api/analyze' ||
    request.nextUrl.pathname === '/api/analyze-free';

  if (isAnalyzeEndpoint) {
    const key = getRateLimitKey(request);
    const { allowed, remaining, resetTime } = checkRateLimit(key);

    if (!allowed) {
      const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.` },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
            'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
          }
        }
      );
    }

    // Add rate limit headers to successful requests
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toString());
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/analyze', '/api/analyze-free'],
};
