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

    // Get user with balance
    const user = await db.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get positions
    const positions = await db.position.findMany({
      where: {
        userId: session.user.id,
        quantity: {
          not: 0
        }
      },
      include: {
        asset: true
      }
    })

    // Calculate portfolio metrics
    let totalMarketValue = 0
    let totalUnrealizedPnL = 0
    let totalRealizedPnL = 0

    const positionsWithMetrics = await Promise.all(
      positions.map(async (position) => {
        const currentPrice = position.asset.price || position.averagePrice
        const marketValue = position.quantity * currentPrice
        const unrealizedPnL = (currentPrice - position.averagePrice) * position.quantity
        const unrealizedPnLPercent = ((currentPrice - position.averagePrice) / position.averagePrice) * 100

        totalMarketValue += marketValue
        totalUnrealizedPnL += unrealizedPnL
        totalRealizedPnL += position.realizedPnL

        return {
          ...position,
          currentPrice,
          marketValue,
          unrealizedPnL,
          unrealizedPnLPercent
        }
      })
    )

    // Get total deposits and withdrawals (from trades)
    const trades = await db.trade.findMany({
      where: { userId: session.user.id }
    })

    const totalDeposits = 10000 // Starting balance
    const totalWithdrawals = 0
    const totalCommissions = trades.reduce((sum, trade) => sum + trade.commission, 0)

    const totalPortfolioValue = user.balance + totalMarketValue
    const totalPnL = totalPortfolioValue - totalDeposits + totalWithdrawals - totalCommissions

    const portfolio = {
      user: {
        id: user.id,
        balance: user.balance,
        currency: user.currency
      },
      summary: {
        totalMarketValue,
        totalUnrealizedPnL,
        totalRealizedPnL,
        totalPortfolioValue,
        totalPnL,
        totalDeposits,
        totalWithdrawals,
        totalCommissions,
        totalReturnPercent: ((totalPortfolioValue - totalDeposits) / totalDeposits) * 100
      },
      positions: positionsWithMetrics
    }

    return NextResponse.json(portfolio)
  } catch (error) {
    console.error("Error fetching portfolio:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}