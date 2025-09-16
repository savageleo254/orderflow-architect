"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { PortfolioData, Position } from "@/types"

interface PositionsProps {
  onPositionUpdate: () => void
}

export function Positions({ onPositionUpdate }: PositionsProps) {
  const [positions, setPositions] = useState<PortfolioData['positions']>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPositions()
  }, [])

  const fetchPositions = async () => {
    try {
      const response = await fetch("/api/positions")
      if (response.ok) {
        const data = await response.json()
        setPositions(data)
      } else {
        setError("Failed to fetch positions")
      }
    } catch (error) {
      setError("An error occurred while fetching positions")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Positions</CardTitle>
          <CardDescription>
            Your current trading positions
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {positions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No open positions
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Avg Price</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Market Value</TableHead>
                  <TableHead>Unrealized P&L</TableHead>
                  <TableHead>Unrealized %</TableHead>
                  <TableHead>Realized P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map(position => {
                  const isPositivePnL = (position.unrealizedPnL || 0) >= 0
                  const isPositivePercent = (position.unrealizedPnLPercent || 0) >= 0

                  return (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">
                        {position.asset.symbol}
                      </TableCell>
                      <TableCell>{position.quantity}</TableCell>
                      <TableCell>{formatCurrency(position.averagePrice)}</TableCell>
                      <TableCell>{formatCurrency(position.currentPrice || 0)}</TableCell>
                      <TableCell>{formatCurrency(position.marketValue || 0)}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${isPositivePnL ? "text-green-600" : "text-red-600"}`}>
                          {isPositivePnL ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {formatCurrency(position.unrealizedPnL || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${isPositivePercent ? "text-green-600" : "text-red-600"}`}>
                          {isPositivePercent ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {formatPercent(position.unrealizedPnLPercent || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={position.realizedPnL >= 0 ? "default" : "destructive"}>
                          {formatCurrency(position.realizedPnL)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}