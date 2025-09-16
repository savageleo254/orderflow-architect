import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"

export class ApiError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error)

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: "API_ERROR" },
      { status: error.statusCode }
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { 
        error: "Validation failed", 
        code: "VALIDATION_ERROR",
        details: error.format() 
      },
      { status: 400 }
    )
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Resource already exists", code: "DUPLICATE_ENTRY" },
        { status: 409 }
      )
    }
    
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Resource not found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      { error: "Database validation failed", code: "DATABASE_VALIDATION_ERROR" },
      { status: 400 }
    )
  }

  // Generic server error
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  )
}

export function asyncHandler<T>(
  fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<NextResponse> {
  return async (...args: any[]) => {
    try {
      const result = await fn(...args)
      return NextResponse.json(result)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

export function validateRequestBody<T>(schema: any, data: any): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(
        `Validation failed: ${Object.values(error.format()).map((e: any) => e._errors.join(', ')).join(", ")}`,
        400
      )
    }
    throw new ApiError("Invalid request body", 400)
  }
}

export function createSuccessResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message: message || "Operation successful"
  })
}

export function createErrorResponse(message: string, statusCode: number = 500, code?: string) {
  return NextResponse.json({
    success: false,
    error: message,
    code: code || "ERROR"
  }, { status: statusCode })
}