import { z } from "zod"

// Order validation schemas
export const createOrderSchema = z.object({
  assetId: z.string().cuid(),
  type: z.enum(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive").optional(),
  stopPrice: z.number().positive("Stop price must be positive").optional(),
  timeInForce: z.enum(["DAY", "GTC", "IOC", "FOK"]).default("DAY")
}).refine(data => {
  // Validate price requirements based on order type
  if (data.type === "LIMIT" || data.type === "STOP_LIMIT") {
    return data.price !== undefined
  }
  if (["STOP", "STOP_LIMIT"].includes(data.type)) {
    return data.stopPrice !== undefined
  }
  return true
}, {
  message: "Price requirements not met for order type"
})

export const updateOrderSchema = z.object({
  quantity: z.number().positive().optional(),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional()
})

// User validation schemas
export const registerUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be at most 50 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
})

export const signInUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
})

// Asset validation schemas
export const createAssetSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be at most 10 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  type: z.enum(["stock", "crypto", "forex", "commodity"]),
  exchange: z.string().max(50, "Exchange must be at most 50 characters").optional(),
  currency: z.string().default("USD"),
  price: z.number().min(0, "Price must be non-negative").optional()
})

// Watchlist validation schemas
export const createWatchlistSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be at most 50 characters"),
  description: z.string().max(200, "Description must be at most 200 characters").optional()
})

export const addToWatchlistSchema = z.object({
  assetId: z.string().cuid()
})

// Audit log validation schemas
export const auditLogQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).default(50),
  action: z.string().optional(),
  entityType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// Portfolio validation schemas
export const depositSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USD")
})

export const withdrawSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USD")
})

// Market data validation schemas
export const marketDataQuerySchema = z.object({
  symbols: z.array(z.string()).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  interval: z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d"]).default("1d")
})

// Type exports
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type RegisterUserInput = z.infer<typeof registerUserSchema>
export type SignInUserInput = z.infer<typeof signInUserSchema>
export type CreateAssetInput = z.infer<typeof createAssetSchema>
export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>
export type MarketDataQueryInput = z.infer<typeof marketDataQuerySchema>