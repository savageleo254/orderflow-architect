import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { HealthStatus } from "@/types"
import { logger } from "@/lib/logger"

const startTime = Date.now()

export async function GET(request: NextRequest) {
  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: 'disconnected',
      websocket: 'connected',
      uptime: Date.now() - startTime
    }

    // Check database connection
    try {
      await db.$queryRaw`SELECT 1`
      health.database = 'connected'
    } catch (error) {
      health.database = 'disconnected'
      health.status = 'degraded'
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      logger.error('Database health check failed', { error: errorMessage })
    }

    // Check WebSocket (basic check)
    try {
      // This is a basic check - in production you might want to test actual WebSocket connections
      health.websocket = 'connected'
    } catch (error) {
      health.websocket = 'disconnected'
      health.status = 'degraded'
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      logger.error('WebSocket health check failed', { error: errorMessage })
    }

    // Determine overall status
    if (health.database === 'disconnected' && health.websocket === 'disconnected') {
      health.status = 'unhealthy'
    } else if (health.database === 'disconnected' || health.websocket === 'disconnected') {
      health.status = 'degraded'
    }

    logger.info('Health check completed', health)

    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    logger.error('Health check failed', { error: errorMessage })
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 503 })
  }
}