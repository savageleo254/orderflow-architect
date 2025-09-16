import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const action = searchParams.get("action")
    const entityType = searchParams.get("entityType")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const offset = (page - 1) * limit

    const whereClause: any = {
      userId: session.user.id
    }

    if (action) {
      whereClause.action = action
    }

    if (entityType) {
      whereClause.entityType = entityType
    }

    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: offset,
        take: limit
      }),
      db.auditLog.count({
        where: whereClause
      })
    ])

    // Parse JSON values for better readability
    const processedLogs = logs.map(log => ({
      ...log,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null
    }))

    return NextResponse.json({
      logs: processedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}