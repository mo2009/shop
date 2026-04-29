'use client';

/** Tiny inline-SVG sparkline. No deps. */
type Props = {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
};

export default function Sparkline({
  data,
  color = '#2196F3',
  width = 120,
  height = 32,
  fill = true,
  className,
}: Props) {
  if (!data.length) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const areaPath =
    `M${points[0][0]},${height} ` +
    points.map(([x, y]) => `L${x},${y}`).join(' ') +
    ` L${points[points.length - 1][0]},${height} Z`;

  const gradId = `spark-${color.replace('#', '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
