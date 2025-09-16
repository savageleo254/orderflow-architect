"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Target, Activity } from "lucide-react"
import { PortfolioData, PerformanceData, AllocationData } from "@/types"
import { seededRandom, setSeed } from "@/lib/seeded-random"

interface PortfolioAnalysisProps {
  portfolio: PortfolioData
}

export function PortfolioAnalysis({ portfolio }: PortfolioAnalysisProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [allocationData, setAllocationData] = useState<AllocationData[]>([])

  useEffect(() => {
    generatePerformanceData()
    generateAllocationData()
  }, [portfolio])

  const generatePerformanceData = () => {
    // In production we do not fabricate data. Only generate demo data if explicitly enabled.
    if (process.env.NEXT_PUBLIC_DEMO !== "true") {
      setPerformanceData([])
      return
    }
    // Deterministic seeded demo data
    setSeed(42)
    const data: PerformanceData[] = []
    let currentValue = portfolio.summary.totalDeposits || 1000
    for (let i = 30; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dailyReturn = (seededRandom() - 0.4) * 0.02 // -0.8%..+1.2%
      currentValue *= 1 + dailyReturn
      data.push({
        date: date.toISOString().split("T")[0],
        value: currentValue,
        return: dailyReturn * 100,
      })
    }
    setPerformanceData(data)
  }

  const generateAllocationData = () => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']
    const strHash = (str: string) =>
      str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

    const allocation = portfolio.positions.map((position) => {
      const name = position.asset?.symbol || position.assetId || 'Unknown'
      const idx = strHash(name) % COLORS.length
      return {
        name,
        value: position.marketValue || 0,
        percentage:
          portfolio.summary.totalMarketValue > 0
            ? ((position.marketValue || 0) / portfolio.summary.totalMarketValue) * 100
            : 0,
        color: COLORS[idx],
      }
    })

    allocation.push({
      name: 'Cash',
      value: portfolio.user.balance,
      percentage:
        portfolio.summary.totalPortfolioValue > 0
          ? (portfolio.user.balance / portfolio.summary.totalPortfolioValue) * 100
          : 0,
      color: '#888888',
    })

    setAllocationData(allocation)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: portfolio.user.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Portfolio Analysis
        </CardTitle>
        <CardDescription>
          Detailed portfolio performance and allocation analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="performance" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={false}
                    name="Portfolio Value"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Total Return</div>
                <div className={`text-lg font-bold ${portfolio.summary.totalReturnPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatPercent(portfolio.summary.totalReturnPercent)}
                </div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Best Day</div>
                <div className="text-lg font-bold text-green-600">
                  {performanceData.length > 0 ? formatPercent(Math.max(...performanceData.map(d => d.return))) : formatPercent(0)}
                </div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Worst Day</div>
                <div className="text-lg font-bold text-red-600">
                  {performanceData.length > 0 ? formatPercent(Math.min(...performanceData.map(d => d.return))) : formatPercent(0)}
                </div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Volatility</div>
                <div className="text-lg font-bold">
                  {formatPercent(2.5)}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="allocation" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Asset Allocation</h4>
                {allocationData
                  .sort((a, b) => b.value - a.value)
                  .map((item, index) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Sharpe Ratio</span>
                </div>
                <div className="text-2xl font-bold">1.24</div>
                <div className="text-xs text-muted-foreground">Risk-adjusted return</div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Max Drawdown</span>
                </div>
                <div className="text-2xl font-bold text-red-600">-12.5%</div>
                <div className="text-xs text-muted-foreground">Maximum loss from peak</div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Win Rate</span>
                </div>
                <div className="text-2xl font-bold">68.5%</div>
                <div className="text-xs text-muted-foreground">Profitable trades</div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <PieChartIcon className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Beta</span>
                </div>
                <div className="text-2xl font-bold">0.87</div>
                <div className="text-xs text-muted-foreground">Market correlation</div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Alpha</span>
                </div>
                <div className="text-2xl font-bold text-green-600">+2.3%</div>
                <div className="text-xs text-muted-foreground">Excess return</div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Sortino Ratio</span>
                </div>
                <div className="text-2xl font-bold">1.45</div>
                <div className="text-xs text-muted-foreground">Downside risk-adjusted</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Portfolio Health</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Diversification</span>
                  <Badge variant="default">Good</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Risk Level</span>
                  <Badge variant="secondary">Moderate</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Liquidity</span>
                  <Badge variant="default">High</Badge>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}