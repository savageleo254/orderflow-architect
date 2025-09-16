// User Types
export interface User {
  id: string
  email: string
  name?: string
  emailVerified?: Date
  image?: string
  password?: string
  balance: number
  currency: string
  createdAt: Date
  updatedAt: Date
}

export interface Account {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token?: string
  access_token?: string
  expires_at?: number
  token_type?: string
  scope?: string
  id_token?: string
  session_state?: string
}

export interface Session {
  id: string
  sessionToken: string
  userId: string
  expires: Date
}

export interface VerificationToken {
  identifier: string
  token: string
  expires: Date
}

// Asset Types
export interface Asset {
  id: string
  symbol: string
  name: string
  type: 'stock' | 'crypto' | 'forex' | 'commodity'
  exchange?: string
  currency: string
  price?: number
  change24h?: number
  volume24h?: number
  marketCap?: number
  createdAt: Date
  updatedAt: Date
}

// Order Types
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT'
export type OrderSide = 'BUY' | 'SELL'
export type OrderStatus = 'PENDING' | 'OPEN' | 'FILLED' | 'CANCELLED' | 'REJECTED'
export type TimeInForce = 'DAY' | 'GTC' | 'IOC' | 'FOK'

export interface Order {
  id: string
  userId: string
  assetId: string
  type: OrderType
  side: OrderSide
  quantity: number
  price?: number
  stopPrice?: number
  status: OrderStatus
  timeInForce: TimeInForce
  filledQuantity: number
  averagePrice?: number
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  asset: Asset
  trades: Trade[]
  auditLogs: AuditLog[]
}

// Trade Types
export interface Trade {
  id: string
  orderId: string
  userId: string
  assetId: string
  positionId?: string
  quantity: number
  price: number
  side: OrderSide
  commission: number
  createdAt: Date
  order: Order
  user: User
  asset: Asset
  position?: Position
  auditLogs: AuditLog[]
}

// Position Types
export interface Position {
  id: string
  userId: string
  assetId: string
  quantity: number
  averagePrice: number
  unrealizedPnL?: number
  realizedPnL: number
  createdAt: Date
  updatedAt: Date
  user: User
  asset: Asset
  trades: Trade[]
}

// Market Data Types
export interface MarketData {
  id: string
  assetId: string
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume?: number
  bid?: number
  ask?: number
  bidSize?: number
  askSize?: number
  asset: Asset
}

// Watchlist Types
export interface Watchlist {
  id: string
  userId: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  user: User
  items: WatchlistItem[]
}

export interface WatchlistItem {
  id: string
  watchlistId: string
  assetId: string
  createdAt: Date
  watchlist: Watchlist
  asset: Asset
}

// Audit Log Types
export interface AuditLog {
  id: string
  userId?: string
  action: string
  entityType: string
  entityId: string
  oldValues?: string
  newValues?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  user?: User
  order?: Order
  trade?: Trade
}

// Portfolio Types
export interface PortfolioData {
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
  positions: (Position & {
    currentPrice?: number
    unrealizedPnL?: number
    unrealizedPnLPercent?: number
    marketValue?: number
  })[]
}

// Market Data Feed Types
export interface MarketDataFeed {
  symbol: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  bid: number
  ask: number
  bidSize: number
  askSize: number
  change24h: number
  changePercent24h: number
}

// Order Book Types
export interface OrderBookLevel {
  price: number
  quantity: number
  total: number
}

export interface OrderBookData {
  symbol: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  spread: number
  lastPrice: number
}

// API Response Types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Form Types
export interface OrderFormData {
  assetId: string
  type: OrderType
  side: OrderSide
  quantity: string
  price: string
  stopPrice: string
  timeInForce: TimeInForce
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface SignInFormData {
  email: string
  password: string
}

// Performance Data Types
export interface PerformanceData {
  date: string
  value: number
  return: number
}

export interface AllocationData {
  name: string
  value: number
  percentage: number
  color: string
}

// Socket Event Types
export interface SocketEvents {
  market_data: MarketDataFeed
  order_update: Order
  position_update: Position
  trade_update: Trade
  connected: {
    message: string
    timestamp: string
  }
}

// Error Types
export interface ApiError {
  code: string
  message: string
  details?: any
}

export interface ValidationError {
  field: string
  message: string
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  database: 'connected' | 'disconnected'
  websocket: 'connected' | 'disconnected'
  uptime: number
}