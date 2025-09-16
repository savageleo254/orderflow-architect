"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/hooks/use-socket"
import { TrendingUp, TrendingDown, Eye, EyeOff } from "lucide-react"
import { Asset, MarketDataFeed } from "@/types"

export function MarketWatch() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [marketData, setMarketData] = useState<Map<string, MarketDataFeed>>(new Map())
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>(['EURUSD', 'GBPUSD', 'USDJPY'])
  const [activeCategory, setActiveCategory] = useState<'forex' | 'stock' | 'commodity' | 'crypto'>('forex')
  const { isConnected, marketData: socketMarketData, subscribeToMarketData } = useSocket()

  useEffect(() => {
    fetchAssets()
  }, [])

  useEffect(() => {
    if (socketMarketData) {
      setMarketData(prev => {
        const newMap = new Map(prev)
        newMap.set(socketMarketData.symbol, socketMarketData)
        return newMap
      })
    }
  }, [socketMarketData])

  // Subscribe to selected symbols in real time
  useEffect(() => {
    if (isConnected && watchedSymbols.length) {
      subscribeToMarketData(watchedSymbols)
    }
  }, [isConnected, watchedSymbols])

  const fetchAssets = async () => {
    try {
      const response = await fetch("/api/assets")
      if (response.ok) {
        const data = await response.json()
        setAssets(data)
      }
    } catch (error) {
      console.error("Error fetching assets:", error)
    }
  }

  const toggleWatchSymbol = (symbol: string) => {
    setWatchedSymbols(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    )
  }

  const formatPrice = (amount: number, symbol: string) => {
    // Forex pairs have different decimal places
    const isJPY = symbol.includes('JPY')
    const decimals = isJPY ? 3 : 5
    
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`
  }

  const getAssetData = (symbol: string) => {
    const asset = assets.find(a => a.symbol === symbol)
    const market = marketData.get(symbol)
    
    return {
      ...asset,
      ...market
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Market Watch
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Live" : "Offline"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time market data for selected assets
        </CardDescription>
        <Tabs value={activeCategory} onValueChange={(val) => setActiveCategory(val as any)} className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="forex">Forex</TabsTrigger>
            <TabsTrigger value="stock">Stocks</TabsTrigger>
            <TabsTrigger value="commodity">Commodities</TabsTrigger>
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {watchedSymbols.map(symbol => {
            const assetMeta = assets.find(a => a.symbol === symbol)
            if (!assetMeta || assetMeta.type !== activeCategory) return null;
            const data = getAssetData(symbol)
            if (!data) return null

            const isPositive = (data.change24h || 0) >= 0
            const changePercent = data.changePercent24h || 0

            return (
              <div key={symbol} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{symbol}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWatchSymbol(symbol)}
                      className="h-6 w-6 p-0"
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {data.name || symbol}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold">
                    {formatPrice(data.close || data.price || 0, symbol)}
                  </div>
                  <div className={`text-sm flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {formatPercent(changePercent)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground mb-2">Available Assets:</div>
          <div className="flex flex-wrap gap-2">
            {assets
              .filter(asset => asset.type === activeCategory && !watchedSymbols.includes(asset.symbol))
              .map(asset => (
              <Button
                key={asset.id}
                variant="outline"
                size="sm"
                onClick={() => toggleWatchSymbol(asset.symbol)}
                className="h-8"
              >
                <Eye className="h-3 w-3 mr-1" />
                {asset.symbol}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}