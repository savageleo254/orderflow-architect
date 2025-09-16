import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { OrderType, OrderSide, OrderStatus, TimeInForce } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const assetId = searchParams.get("assetId")

    const whereClause: any = {
      userId: session.user.id,
    }

    if (status) {
      whereClause.status = status
    }

    if (assetId) {
      whereClause.assetId = assetId
    }

    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        asset: true,
        trades: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { assetId, type, side, quantity, price, stopPrice, timeInForce } = body

    // Validate required fields
    if (!assetId || !type || !side || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate order type specific requirements
    if ((type === "LIMIT" || type === "STOP_LIMIT") && !price) {
      return NextResponse.json({ error: "Price is required for limit orders" }, { status: 400 })
    }

    if ((type === "STOP" || type === "STOP_LIMIT") && !stopPrice) {
      return NextResponse.json({ error: "Stop price is required for stop orders" }, { status: 400 })
    }

    // Get asset and user
    const asset = await db.asset.findUnique({
      where: { id: assetId }
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate estimated cost
    const currentPrice = asset.price || 0
    const orderPrice = type === "MARKET" ? currentPrice : (price || currentPrice)
    const estimatedCost = quantity * orderPrice

    // Check if user has sufficient balance for buy orders
    if (side === "BUY" && user.balance < estimatedCost) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Create the order
    const order = await db.order.create({
      data: {
        userId: session.user.id,
        assetId,
        type: type as OrderType,
        side: side as OrderSide,
        quantity: parseFloat(quantity),
        price: price ? parseFloat(price) : null,
        stopPrice: stopPrice ? parseFloat(stopPrice) : null,
        status: OrderStatus.PENDING,
        timeInForce: (timeInForce || "DAY") as TimeInForce,
        filledQuantity: 0,
      },
      include: {
        asset: true,
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "order_created",
        entityType: "order",
        entityId: order.id,
        newValues: JSON.stringify({
          assetId: order.assetId,
          type: order.type,
          side: order.side,
          quantity: order.quantity,
          price: order.price,
          stopPrice: order.stopPrice,
          timeInForce: order.timeInForce
        })
      }
    })

    // Process market orders immediately
    if (type === "MARKET") {
      await processMarketOrder(order)
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processMarketOrder(order: any) {
  try {
    // Get current market price
    const asset = await db.asset.findUnique({
      where: { id: order.assetId }
    })

    if (!asset || !asset.price) {
      return
    }

    const executionPrice = asset.price
    const commission = order.quantity * executionPrice * 0.001 // 0.1% commission

    // Create trade
    const trade = await db.trade.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        assetId: order.assetId,
        quantity: order.quantity,
        price: executionPrice,
        side: order.side,
        commission,
      }
    })

    // Update order
    await db.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.FILLED,
        filledQuantity: order.quantity,
        averagePrice: executionPrice,
      }
    })

    // Update user balance
    const user = await db.user.findUnique({
      where: { id: order.userId }
    })

    if (user) {
      const balanceChange = order.side === "BUY" 
        ? -(order.quantity * executionPrice + commission)
        : order.quantity * executionPrice - commission

      await db.user.update({
        where: { id: order.userId },
        data: {
          balance: user.balance + balanceChange
        }
      })
    }

    // Update or create position
    await updatePosition(order.userId, order.assetId, order.side, order.quantity, executionPrice)

    // Create audit log for trade
    await db.auditLog.create({
      data: {
        userId: order.userId,
        action: "trade_executed",
        entityType: "trade",
        entityId: trade.id,
        newValues: JSON.stringify({
          orderId: trade.orderId,
          quantity: trade.quantity,
          price: trade.price,
          side: trade.side,
          commission: trade.commission
        })
      }
    })

  } catch (error) {
    console.error("Error processing market order:", error)
  }
}

async function updatePosition(userId: string, assetId: string, side: string, quantity: number, price: number) {
  try {
    let position = await db.position.findUnique({
      where: {
        userId_assetId: {
          userId,
          assetId
        }
      }
    })

    if (side === "BUY") {
      if (position) {
        // Update existing position
        const totalQuantity = position.quantity + quantity
        const totalValue = (position.quantity * position.averagePrice) + (quantity * price)
        const newAveragePrice = totalValue / totalQuantity

        await db.position.update({
          where: { id: position.id },
          data: {
            quantity: totalQuantity,
            averagePrice: newAveragePrice,
          }
        })
      } else {
        // Create new position
        await db.position.create({
          data: {
            userId,
            assetId,
            quantity,
            averagePrice: price,
          }
        })
      }
    } else if (side === "SELL") {
      if (position) {
        const newQuantity = position.quantity - quantity
        
        if (newQuantity > 0) {
          // Update existing position
          await db.position.update({
            where: { id: position.id },
            data: {
              quantity: newQuantity,
            }
          })
        } else if (newQuantity === 0) {
          // Close position
          await db.position.delete({
            where: { id: position.id }
          })
        } else {
          throw new Error("Insufficient position quantity")
        }
      } else {
        throw new Error("No position found to close")
      }
    }
  } catch (error) {
    console.error("Error updating position:", error)
    throw error
  }
}