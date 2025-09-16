"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Wallet, PieChart, Target } from "lucide-react"
import { PortfolioData } from "@/types"

interface PortfolioSummaryProps {
  portfolio: PortfolioData
}

export function PortfolioSummary({ portfolio }: PortfolioSummaryProps) {
  const { user, summary } = portfolio
  const isPositive = summary.totalPnL >= 0
  const isPositiveReturn = summary.totalReturnPercent >= 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: user.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Portfolio Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalPortfolioValue)}</div>
          <p className="text-xs text-muted-foreground">
            {isPositiveReturn ? (
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {formatPercent(summary.totalReturnPercent)}
              </span>
            ) : (
              <span className="text-red-600 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {formatPercent(summary.totalReturnPercent)}
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Available Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(user.balance)}</div>
          <p className="text-xs text-muted-foreground">
            Ready to trade
          </p>
        </CardContent>
      </Card>

      {/* Total P&L */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(summary.totalPnL)}
          </div>
          <p className="text-xs text-muted-foreground">
            Unrealized: {formatCurrency(summary.totalUnrealizedPnL)} | 
            Realized: {formatCurrency(summary.totalRealizedPnL)}
          </p>
        </CardContent>
      </Card>

      {/* Market Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Market Value</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalMarketValue)}</div>
          <p className="text-xs text-muted-foreground">
            {portfolio.positions.length} active positions
          </p>
        </CardContent>
      </Card>
    </div>
  )
}