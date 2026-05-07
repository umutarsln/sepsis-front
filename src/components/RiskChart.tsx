'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

/**
 * Risk trendi grafiği
 * 
 * Tahmin ufuklarına göre risk skorlarını gösterir.
 */
interface RiskChartProps {
  riskScores: Record<number, number>
}

export default function RiskChart({ riskScores }: RiskChartProps) {
  // Veriyi Recharts formatına çevir
  const data = Object.entries(riskScores).map(([horizon, score]) => ({
    horizon: `${horizon}h`,
    horizonNum: parseInt(horizon),
    risk: (score * 100).toFixed(1),
  }))
  
  // Risk seviyesi rengi belirle
  const getRiskColor = (value: number) => {
    if (value < 20) return '#10b981' // green
    if (value < 40) return '#f59e0b' // yellow
    if (value < 70) return '#ef4444' // red
    return '#dc2626' // dark red
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="horizon"
          label={{ value: 'Tahmin Ufku', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          label={{ value: 'Risk Skoru (%)', angle: -90, position: 'insideLeft' }}
          domain={[0, 100]}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <p className="font-semibold">{payload[0].payload.horizon}</p>
                  <p className="text-sm">
                    Risk: <span className="font-bold">{payload[0].value}%</span>
                  </p>
                </div>
              )
            }
            return null
          }}
        />
        <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="risk"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={{ fill: '#3b82f6', r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

