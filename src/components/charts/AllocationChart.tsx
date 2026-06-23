import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { MetalType } from '../../types'
import { METAL_COLORS, METAL_LABELS } from '../../types'
import { formatCurrency } from '../../lib/utils'
import { Card, CardHeader } from '../ui/Card'

interface AllocationChartProps {
  data: { metal: MetalType; value: number; oz: number }[]
}

export function AllocationChart({ data }: AllocationChartProps) {
  const filtered = data.filter((d) => d.value > 0)

  return (
    <Card>
      <CardHeader title="Metal Allocation" subtitle="Portfolio value by metal type" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              nameKey="metal"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {filtered.map((entry) => (
                <Cell key={entry.metal} fill={METAL_COLORS[entry.metal]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, props) => {
                const payload = props?.payload as { oz: number; metal: MetalType }
                return [
                  `${formatCurrency(Number(value))} (${payload.oz.toFixed(2)} oz)`,
                  METAL_LABELS[payload.metal],
                ]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {filtered.map((d) => (
          <div key={d.metal} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: METAL_COLORS[d.metal] }}
            />
            <span className="text-vault-600">{METAL_LABELS[d.metal]}</span>
            <span className="ml-auto font-mono text-vault-800">
              {formatCurrency(d.value, true)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}