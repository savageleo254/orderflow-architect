import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { OrderStatus } from "@prisma/client"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orderId = params.id

    // Get the order
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if user owns the order
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if order can be cancelled
    if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELLED) {
      return NextResponse.json({ error: "Order cannot be cancelled" }, { status: 400 })
    }

    // Store old values for audit log
    const oldValues = {
      status: order.status,
      filledQuantity: order.filledQuantity,
      averagePrice: order.averagePrice
    }

    // Cancel the order
    const cancelledOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
      },
      include: {
        asset: true,
        trades: true,
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "order_cancelled",
        entityType: "order",
        entityId: orderId,
        oldValues: JSON.stringify(oldValues),
        newValues: JSON.stringify({
          status: cancelledOrder.status,
          filledQuantity: cancelledOrder.filledQuantity,
          averagePrice: cancelledOrder.averagePrice
        })
      }
    })

    return NextResponse.json(cancelledOrder)
  } catch (error) {
    console.error("Error cancelling order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}