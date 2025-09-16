"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { Asset, OrderType, OrderSide, TimeInForce } from "@/types"

interface OrderFormProps {
  onOrderPlaced: () => void
}

export function OrderForm({ onOrderPlaced }: OrderFormProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    assetId: "",
    type: "MARKET",
    side: "BUY",
    quantity: "",
    price: "",
    stopPrice: "",
    timeInForce: "DAY"
  })
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchAssets()
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseFloat(formData.quantity),
          price: formData.price ? parseFloat(formData.price) : undefined,
          stopPrice: formData.stopPrice ? parseFloat(formData.stopPrice) : undefined,
        }),
      })

      if (response.ok) {
        setSuccess("Order placed successfully!")
        setFormData({
          assetId: "",
          type: "MARKET",
          side: "BUY",
          quantity: "",
          price: "",
          stopPrice: "",
          timeInForce: "DAY"
        })
        onOrderPlaced()
      } else {
        const data = await response.json()
        setError(data.error || "Failed to place order")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError("")
    setSuccess("")
  }

  const selectedAsset = assets.find(asset => asset.id === formData.assetId)

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Place Order</CardTitle>
          <CardDescription>
            Create a new trading order
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Asset Selection */}
          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select value={formData.assetId} onValueChange={(value) => handleChange("assetId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.symbol} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAsset && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Current Price: ${selectedAsset.price?.toFixed(2) || "N/A"}</span>
                {selectedAsset.change24h !== undefined && (
                  <Badge variant={selectedAsset.change24h >= 0 ? "default" : "destructive"}>
                    {selectedAsset.change24h >= 0 ? "+" : ""}{selectedAsset.change24h.toFixed(2)}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Order Type</Label>
            <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MARKET">Market</SelectItem>
                <SelectItem value="LIMIT">Limit</SelectItem>
                <SelectItem value="STOP">Stop</SelectItem>
                <SelectItem value="STOP_LIMIT">Stop Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Side */}
          <div className="space-y-2">
            <Label htmlFor="side">Side</Label>
            <Select value={formData.side} onValueChange={(value) => handleChange("side", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SELL">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Enter quantity"
              value={formData.quantity}
              onChange={(e) => handleChange("quantity", e.target.value)}
              required
            />
          </div>

          {/* Price (for limit orders) */}
          {(formData.type === "LIMIT" || formData.type === "STOP_LIMIT") && (
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter limit price"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                required
              />
            </div>
          )}

          {/* Stop Price (for stop orders) */}
          {(formData.type === "STOP" || formData.type === "STOP_LIMIT") && (
            <div className="space-y-2">
              <Label htmlFor="stopPrice">Stop Price</Label>
              <Input
                id="stopPrice"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter stop price"
                value={formData.stopPrice}
                onChange={(e) => handleChange("stopPrice", e.target.value)}
                required
              />
            </div>
          )}

          {/* Time in Force */}
          <div className="space-y-2">
            <Label htmlFor="timeInForce">Time in Force</Label>
            <Select value={formData.timeInForce} onValueChange={(value) => handleChange("timeInForce", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAY">Day</SelectItem>
                <SelectItem value="GTC">Good Till Cancelled</SelectItem>
                <SelectItem value="IOC">Immediate or Cancel</SelectItem>
                <SelectItem value="FOK">Fill or Kill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Cost */}
          {formData.quantity && selectedAsset && (
            <div className="text-sm text-muted-foreground">
              Estimated Cost: ${(
                parseFloat(formData.quantity) * 
                (formData.type === "MARKET" ? (selectedAsset.price || 0) : (parseFloat(formData.price) || 0))
              ).toFixed(2)}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              "Place Order"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}