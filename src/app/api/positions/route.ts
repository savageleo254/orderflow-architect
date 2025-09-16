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

    const positions = await db.position.findMany({
      where: {
        userId: session.user.id,
        quantity: {
          not: 0
        }
      },
      include: {
        asset: true,
        trades: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Calculate unrealized P&L for each position
    const positionsWithPnL = await Promise.all(
      positions.map(async (position) => {
        const currentPrice = position.asset.price || position.averagePrice
        const unrealizedPnL = (currentPrice - position.averagePrice) * position.quantity
        const unrealizedPnLPercent = ((currentPrice - position.averagePrice) / position.averagePrice) * 100

        return {
          ...position,
          currentPrice,
          unrealizedPnL,
          unrealizedPnLPercent,
          marketValue: position.quantity * currentPrice
        }
      })
    )

    return NextResponse.json(positionsWithPnL)
  } catch (error) {
    console.error("Error fetching positions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}