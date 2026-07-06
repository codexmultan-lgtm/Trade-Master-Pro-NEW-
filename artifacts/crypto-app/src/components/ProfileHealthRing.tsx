interface ProfileHealthRingProps {
  value: number;
  size?: number;
}

function healthColor(value: number) {
  if (value >= 70) return { stroke: "#34d399", text: "text-emerald-400", glow: "rgba(52,211,153,0.35)" };
  if (value >= 40) return { stroke: "#fbbf24", text: "text-amber-400", glow: "rgba(251,191,36,0.35)" };
  return { stroke: "#f87171", text: "text-destructive", glow: "rgba(248,113,113,0.35)" };
}

export function healthLabel(value: number) {
  if (value >= 85) return "Excellent";
  if (value >= 70) return "Good";
  if (value >= 40) return "Fair";
  if (value >= 20) return "Poor";
  return "Critical";
}

export default function ProfileHealthRing({ value, size = 160 }: ProfileHealthRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const colors = healthColor(clamped);
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease",
            filter: `drop-shadow(0 0 6px ${colors.glow})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${colors.text}`} style={{ fontSize: size * 0.22 }}>
          {clamped}%
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">{healthLabel(clamped)}</span>
      </div>
    </div>
  );
}
