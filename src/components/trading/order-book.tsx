"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSocket } from "@/hooks/use-socket"
import { BarChart3 } from "lucide-react"
import { Asset, MarketDataFeed } from "@/types"

export function OrderBook() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [symbol, setSymbol] = useState<string>("EURUSD")
  const [quote, setQuote] = useState<MarketDataFeed | null>(null)

  const { isConnected, marketData, subscribeToMarketData } = useSocket()

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/assets")
        if (res.ok) setAssets(await res.json())
      } catch (err) {
        console.error("fetchAssets error", err)
      }
    })()
  }, [])

  useEffect(() => {
    if (isConnected && symbol) subscribeToMarketData([symbol])
  }, [isConnected, symbol])

  useEffect(() => {
    if (marketData?.symbol === symbol) setQuote(marketData)
  }, [marketData, symbol])

  const fmt = (val: number) => (symbol.includes("JPY") ? val.toFixed(3) : val.toFixed(5))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Order Book
            </CardTitle>
            <CardDescription>Live MT5 quotes</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.symbol}>
                    {a.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Live" : "Offline"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {quote ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Last Price</div>
                <div className="text-lg font-semibold">{fmt(quote.close)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Spread</div>
                <div className="text-lg font-semibold">{fmt(quote.ask - quote.bid)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col items-center bg-green-50 p-3 rounded">
                <span className="text-muted-foreground mb-1">Bid</span>
                <span className="font-medium text-green-700">{fmt(quote.bid)}</span>
              </div>
              <div className="flex flex-col items-center bg-red-50 p-3 rounded">
                <span className="text-muted-foreground mb-1">Ask</span>
                <span className="font-medium text-red-700">{fmt(quote.ask)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">No data</div>
        )}
      </CardContent>
    </Card>
  )
}
