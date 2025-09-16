import { headers } from "next/headers"
import { db } from "./db"

interface AuditLogOptions {
  userId?: string
  action: string
  entityType: string
  entityId: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
}

export class AuditLogger {
  static async log(options: AuditLogOptions) {
    try {
      const headersList = await headers()
      const ipAddress = options.ipAddress || headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
      const userAgent = options.userAgent || headersList.get("user-agent") || "unknown"

      await db.auditLog.create({
        data: {
          userId: options.userId,
          action: options.action,
          entityType: options.entityType,
          entityId: options.entityId,
          oldValues: options.oldValues ? JSON.stringify(options.oldValues) : null,
          newValues: options.newValues ? JSON.stringify(options.newValues) : null,
          ipAddress,
          userAgent
        }
      })
    } catch (error) {
      console.error("Failed to create audit log:", error)
      // Don't throw the error to avoid breaking the main functionality
    }
  }

  static async logUserAction(userId: string, action: string, details: any) {
    return this.log({
      userId,
      action,
      entityType: "user",
      entityId: userId,
      newValues: details
    })
  }

  static async logOrderAction(userId: string, orderId: string, action: string, oldValues?: any, newValues?: any) {
    return this.log({
      userId,
      action,
      entityType: "order",
      entityId: orderId,
      oldValues,
      newValues
    })
  }

  static async logTradeAction(userId: string, tradeId: string, action: string, tradeDetails: any) {
    return this.log({
      userId,
      action,
      entityType: "trade",
      entityId: tradeId,
      newValues: tradeDetails
    })
  }

  static async logPositionAction(userId: string, positionId: string, action: string, oldValues?: any, newValues?: any) {
    return this.log({
      userId,
      action,
      entityType: "position",
      entityId: positionId,
      oldValues,
      newValues
    })
  }

  static async logSystemAction(action: string, details: any) {
    return this.log({
      action,
      entityType: "system",
      entityId: "system",
      newValues: details
    })
  }
}