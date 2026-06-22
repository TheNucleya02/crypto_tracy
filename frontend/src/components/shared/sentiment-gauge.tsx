import { cn } from "@/lib/utils";

interface SentimentGaugeProps {
  value: number;
  classification: string;
  size?: number;
}

function colorForValue(v: number) {
  if (v < 25) return "#dc2626"; // red
  if (v < 45) return "#f97316"; // orange
  if (v < 55) return "#eab308"; // yellow
  if (v < 75) return "#22c55e"; // green
  return "#16a34a"; // dark green
}

export function SentimentGauge({ value, classification, size = 160 }: SentimentGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const circ = Math.PI * radius; // half circle
  const offset = circ - (clamped / 100) * circ;
  const color = colorForValue(clamped);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + stroke} viewBox={`0 0 ${size} ${size / 2 + stroke}`}>
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        <path
          d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke="url(#gauge-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          opacity={0.3}
        />
        <path
          d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="-mt-7 flex flex-col items-center">
        <span className="text-3xl font-bold tracking-tight" style={{ color }}>
          {clamped}
        </span>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full mt-1",
            "border border-border bg-muted"
          )}
          style={{ color }}
        >
          {classification}
        </span>
      </div>
      <div className="flex w-full justify-between px-1 mt-2 text-[10px] text-muted-foreground">
        <span>Extreme Fear</span>
        <span>Extreme Greed</span>
      </div>
    </div>
  );
}
