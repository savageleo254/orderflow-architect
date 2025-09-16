"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TradingDashboard } from "@/components/trading/trading-dashboard"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return
    
    setIsLoading(false)
  }, [session, status])

  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">OrderFlow Architect</h1>
              <p className="text-muted-foreground">Advanced Trading Platform</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {session.user?.email}
              </Badge>
              <Button 
                variant="outline" 
                onClick={() => router.push("/api/auth/signout")}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <TradingDashboard />
      </main>
    </div>
  )
}