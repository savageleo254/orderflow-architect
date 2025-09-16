"use client"

import { useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import { MarketDataFeed, Order, Position, Trade, SocketEvents } from "@/types"

interface UseSocketOptions {
  autoConnect?: boolean
  userId?: string
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true, userId } = options
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [marketData, setMarketData] = useState<MarketDataFeed | null>(null)
  const [orderUpdates, setOrderUpdates] = useState<Order | null>(null)
  const [positionUpdates, setPositionUpdates] = useState<Position | null>(null)
  const [tradeUpdates, setTradeUpdates] = useState<Trade | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Initialize socket connection from environment variable or fallback to localhost
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
    socketRef.current = io(socketUrl, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    })

    const socket = socketRef.current

    // Connection events
    socket.on("connect", () => {
      setIsConnected(true)
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
    })

    // Market data events
    socket.on("market_data", (data) => {
      setMarketData(data)
    })

    // Order update events
    socket.on("order_update", (data) => {
      setOrderUpdates(data)
    })

    // Position update events
    socket.on("position_update", (data) => {
      setPositionUpdates(data)
    })

    // Trade update events
    socket.on("trade_update", (data) => {
      setTradeUpdates(data)
    })

    // Auto-connect if enabled
    if (autoConnect) {
      socket.connect()
    }

    // Cleanup
    return () => {
      socket.disconnect()
    }
  }, [autoConnect])

  // Subscribe to market data for specific symbols
  const subscribeToMarketData = (symbols: string[]) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("subscribe_market_data", symbols)
    }
  }

  // Unsubscribe from market data
  const unsubscribeFromMarketData = (symbols: string[]) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("unsubscribe_market_data", symbols)
    }
  }

  // Subscribe to order updates for a user
  const subscribeToOrders = (userId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("subscribe_orders", userId)
    }
  }

  // Subscribe to position updates for a user
  const subscribeToPositions = (userId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("subscribe_positions", userId)
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    marketData,
    orderUpdates,
    positionUpdates,
    tradeUpdates,
    subscribeToMarketData,
    unsubscribeFromMarketData,
    subscribeToOrders,
    subscribeToPositions,
  }
}