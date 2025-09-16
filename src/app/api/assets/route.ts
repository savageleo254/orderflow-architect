import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const assets = await db.asset.findMany({
      orderBy: {
        symbol: "asc"
      }
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error("Error fetching assets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}