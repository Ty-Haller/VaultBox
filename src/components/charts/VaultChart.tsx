import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../../lib/utils'
import { Card, CardHeader } from '../ui/Card'

interface VaultChartProps {
  data: { name: string; value: number; oz: number }[]
}

export function VaultChart({ data }: VaultChartProps) {
  return (
    <Card>
      <CardHeader title="Value by Vault" subtitle="Spot value distribution across vaults" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eef3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#5a7a96' }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 10, fill: '#5a7a96' }}
            />
            <Tooltip
              formatter={(value, _name, props) => {
                const payload = props?.payload as { oz: number }
                return [
                  `${formatCurrency(Number(value))} (${payload.oz.toFixed(2)} oz)`,
                  'Spot Value',
                ]
              }}
            />
            <Bar dataKey="value" fill="#d4a017" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}