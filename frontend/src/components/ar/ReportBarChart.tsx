// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- this file IS the lazy chunk; top-level import is intentional
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ChartEntry { date: string; docs: number; }

const T = {
  grid: "hsl(var(--border))",
  axis: { tick: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } },
  // Tooltip is HTML, not SVG — text color must use `color`, not `fill`
  text: { fontSize: 12, color: "hsl(var(--popover-foreground))" },
  container: { background: "hsl(var(--popover))", border: "1px solid hsl(var(--popover-border))", borderRadius: 8, fontSize: 12, boxShadow: "var(--shadow-popover)" },
};

export default function ReportBarChart({ data }: { data: ChartEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} maxBarSize={data.length > 20 ? 12 : 36} barCategoryGap="28%" margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
        <defs>
          <linearGradient id="reportBarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.75} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
          </linearGradient>
          <linearGradient id="reportBarFillLatest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
        <XAxis
          dataKey="date"
          {...T.axis}
          tickLine={false}
          axisLine={false}
          dy={8}
          tickFormatter={(v) => { const p = v.split("/"); return `${p[0]}/${p[1]}`; }}
          interval={data.length > 20 ? Math.floor(data.length / 10) : 0}
        />
        <YAxis {...T.axis} allowDecimals={false} width={40} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} cursor={{ fill: "hsl(var(--accent))", radius: 6 }} />
        <Bar dataKey="docs" name="Documents" radius={[6, 6, 0, 0]} activeBar={{ fillOpacity: 1 }}>
          {data.map((entry, i) => (
            <Cell
              key={`bar-${entry.date}`}
              fill={i === data.length - 1 ? "url(#reportBarFillLatest)" : "url(#reportBarFill)"}
              stroke={i === data.length - 1 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"}
              strokeWidth={1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
