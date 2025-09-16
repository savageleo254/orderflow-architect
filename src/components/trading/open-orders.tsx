"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, X } from "lucide-react"
import { Order, OrderStatus, OrderSide } from "@/types"

interface OpenOrdersProps {
  onOrderUpdate: () => void
}

export function OpenOrders({ onOrderUpdate }: OpenOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders?status=OPEN&status=PENDING")
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      } else {
        setError("Failed to fetch orders")
      }
    } catch (error) {
      setError("An error occurred while fetching orders")
    } finally {
      setIsLoading(false)
    }
  }

  const cancelOrder = async (orderId: string) => {
    setCancellingId(orderId)
    
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setOrders(prev => prev.filter(order => order.id !== orderId))
        onOrderUpdate()
      } else {
        const data = await response.json()
        setError(data.error || "Failed to cancel order")
      }
    } catch (error) {
      setError("An error occurred while cancelling order")
    } finally {
      setCancellingId(null)
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

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "OPEN":
        return "default"
      case "PENDING":
        return "secondary"
      case "FILLED":
        return "default"
      case "CANCELLED":
        return "destructive"
      case "REJECTED":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getSideColor = (side: OrderSide) => {
    return side === "BUY" ? "default" : "destructive"
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Orders</CardTitle>
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
          <CardTitle>Open Orders</CardTitle>
          <CardDescription>
            Your active trading orders
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No open orders
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Filled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.asset.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSideColor(order.side)}>
                        {order.side}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      {order.price ? formatCurrency(order.price) : "Market"}
                    </TableCell>
                    <TableCell>
                      {order.filledQuantity} / {order.quantity}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="h-8 w-8 p-0"
                      >
                        {cancellingId === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
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