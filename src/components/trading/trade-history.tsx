"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Download, Search } from "lucide-react"
import { Order, Trade } from "@/types"

export function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])

  useEffect(() => {
    fetchTrades()
  }, [])

  useEffect(() => {
    if (trades.length > 0) {
      const filtered = trades.filter(trade =>
        trade.asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.side.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredTrades(filtered)
    }
  }, [trades, searchTerm])

  const fetchTrades = async () => {
    try {
      // We need to get trades from orders since we don't have a direct trades endpoint
      const response = await fetch("/api/orders")
      if (response.ok) {
        const orders = await response.json()
        const allTrades = orders.flatMap((order: Order) => 
          order.trades.map((trade: Trade) => ({
            ...trade,
            asset: order.asset
          }))
        )
        setTrades(allTrades)
        setFilteredTrades(allTrades)
      } else {
        setError("Failed to fetch trade history")
      }
    } catch (error) {
      setError("An error occurred while fetching trade history")
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const exportToCSV = () => {
    const headers = ["Symbol", "Side", "Quantity", "Price", "Commission", "Total", "Date"]
    const csvContent = [
      headers.join(","),
      ...filteredTrades.map(trade => [
        trade.asset.symbol,
        trade.side,
        trade.quantity,
        trade.price,
        trade.commission,
        trade.quantity * trade.price,
        formatDate(trade.createdAt)
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trade-history-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getSideColor = (side: string) => {
    return side === "BUY" ? "default" : "destructive"
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Trade History</CardTitle>
            <CardDescription>
              Your completed trades
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={filteredTrades.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="mb-4">
          <Label htmlFor="search">Search Trades</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="search"
              placeholder="Search by symbol or side..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {trades.length === 0 ? "No trade history found" : "No trades match your search"}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map(trade => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">
                      {trade.asset.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSideColor(trade.side)}>
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell>{trade.quantity}</TableCell>
                    <TableCell>{formatCurrency(trade.price)}</TableCell>
                    <TableCell>{formatCurrency(trade.commission)}</TableCell>
                    <TableCell>{formatCurrency(trade.quantity * trade.price)}</TableCell>
                    <TableCell>{formatDate(trade.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}