"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PortfolioSummary } from "./portfolio-summary"
import { MarketWatch } from "./market-watch"
import { OrderForm } from "./order-form"
import { OrderBook } from "./order-book"
import { PortfolioAnalysis } from "./portfolio-analysis"
import { OpenOrders } from "./open-orders"
import { Positions } from "./positions"
import { TradeHistory } from "./trade-history"
import { useSocket } from "@/hooks/use-socket"
import { Loader2, TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react"

interface PortfolioData {
  user: {
    id: string
    balance: number
    currency: string
  }
  summary: {
    totalMarketValue: number
    totalUnrealizedPnL: number
    totalRealizedPnL: number
    totalPortfolioValue: number
    totalPnL: number
    totalDeposits: number
    totalWithdrawals: number
    totalCommissions: number
    totalReturnPercent: number
  }
  positions: any[]
}

export function TradingDashboard() {
  const { data: session } = useSession()
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { isConnected, marketData, subscribeToMarketData, subscribeToOrders, subscribeToPositions } = useSocket()

  useEffect(() => {
    // Fetch real data for authenticated users
    if (session?.user?.id) {
      fetchPortfolioData()
      subscribeToMarketData(['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'XAUUSD'])
      subscribeToOrders(session.user.id)
      subscribeToPositions(session.user.id)
    } else {
      setIsLoading(false)
    }
  }, [session])

  const fetchPortfolioData = async () => {
    try {
      const response = await fetch("/api/portfolio")
      if (response.ok) {
        const data = await response.json()
        setPortfolioData(data)
      }
    } catch (error) {
      console.error("Error fetching portfolio data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Connected to real-time data" : "Disconnected"}
          </span>
        </div>
        {marketData && (
          <Badge variant="outline">
            {marketData.symbol}: {marketData.close.toFixed(marketData.symbol.includes('JPY') ? 3 : 5)}
          </Badge>
        )}
      </div>

      {/* Portfolio Summary */}
      {portfolioData && (
        <PortfolioSummary portfolio={portfolioData} />
      )}

      {/* Main Tabbed Interface */}
      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList className="flex flex-wrap gap-2 md:grid md:grid-cols-5 w-full">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="portfolio" className="space-y-6">
          {portfolioData && (
            <PortfolioAnalysis portfolio={portfolioData} />
          )}
        </TabsContent>
        
        <TabsContent value="market" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <MarketWatch />
            </div>
            <div className="xl:col-span-5">
              <OrderBook />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="trading" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-6">
              <OrderForm onOrderPlaced={fetchPortfolioData} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="orders" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <OpenOrders onOrderUpdate={fetchPortfolioData} />
            </div>
            <div className="xl:col-span-5">
              <Positions onPositionUpdate={fetchPortfolioData} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <TradeHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}