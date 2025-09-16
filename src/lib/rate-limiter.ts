import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from '@supabase/ssr'

interface RateLimitData {
  count: number
  resetTime: number
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitData>()

export class RateLimiter {
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  private getClientId(request: NextRequest): string {
    // Try to get client ID from various sources
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')
    
    return forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  }

  private getRateLimitData(clientId: string): RateLimitData {
    const now = Date.now()
    const data = rateLimitStore.get(clientId)

    if (!data || now > data.resetTime) {
      const newData: RateLimitData = {
        count: 1,
        resetTime: now + this.windowMs
      }
      rateLimitStore.set(clientId, newData)
      return newData
    }

    data.count++
    return data
  }

  public check(request: NextRequest): {
    allowed: boolean
    remaining: number
    resetTime: number
    limit: number
  } {
    const clientId = this.getClientId(request)
    const data = this.getRateLimitData(clientId)
    const remaining = Math.max(0, this.maxRequests - data.count)

    return {
      allowed: data.count <= this.maxRequests,
      remaining,
      resetTime: data.resetTime,
      limit: this.maxRequests
    }
  }

  public getHeaders(result: ReturnType<RateLimiter['check']>) {
    return {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString()
    }
  }

  // Clean up expired entries (call this periodically)
  public cleanup(): void {
    const now = Date.now()
    for (const [key, data] of rateLimitStore.entries()) {
      if (now > data.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }
}

// Create default rate limiter instance
const defaultRateLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100') // 100 requests
)

// Middleware function for rate limiting
export async function rateLimit(request: NextRequest): Promise<{
  success: boolean
  headers?: Record<string, string>
  error?: string
}> {
  const result = defaultRateLimiter.check(request)
  
  if (!result.allowed) {
    return {
      success: false,
      error: "Too many requests",
      headers: defaultRateLimiter.getHeaders(result)
    }
  }

  return {
    success: true,
    headers: defaultRateLimiter.getHeaders(result)
  }
}

// Route-specific rate limiters
export const authRateLimiter = new RateLimiter(15 * 60 * 1000, 5) // 5 auth requests per 15 minutes
export const tradingRateLimiter = new RateLimiter(60 * 1000, 30) // 30 trading requests per minute

// Clean up rate limit store every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    defaultRateLimiter.cleanup()
    authRateLimiter.cleanup()
    tradingRateLimiter.cleanup()
  }, 60 * 60 * 1000) // Every hour
}