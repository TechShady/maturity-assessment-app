import React, { useState } from "react";

interface TrendChartProps {
  data: { label: string; value: number; color?: string }[];
  width?: number;
  height?: number;
  maxValue?: number;
  lineColor?: string;
  showDots?: boolean;
  showLabels?: boolean;
  series?: { label: string; values: number[]; color: string }[];
  highlightedSeries?: Set<number>;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  width = 600,
  height = 200,
  maxValue = 5,
  lineColor = "#1496ff",
  showDots = true,
  showLabels = true,
  series,
  highlightedSeries,
}) => {
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const renderSingleLine = () => {
    if (data.length < 2) return null;
    const points = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartW,
      y: padding.top + chartH - (d.value / maxValue) * chartH,
    }));
    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <>
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2.5} />
        {showDots &&
          points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill={lineColor} />
          ))}
        {showLabels &&
          data.map((d, i) => (
            <text
              key={i}
              x={points[i].x}
              y={height - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#888"
            >
              {d.label}
            </text>
          ))}
      </>
    );
  };

  const renderMultiLine = () => {
    if (!series || series.length === 0) return null;
    const numPoints = series[0].values.length;
    if (numPoints < 2) return null;

    return series.map((s, si) => {
      const points = s.values.map((v, i) => ({
        x: padding.left + (i / (numPoints - 1)) * chartW,
        y: padding.top + chartH - (v / maxValue) * chartH,
      }));
      const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      const isHighlighted = !highlightedSeries || highlightedSeries.size === 0 || highlightedSeries.has(si);
      const opacity = isHighlighted ? 0.9 : 0.1;
      const strokeW = isHighlighted && highlightedSeries && highlightedSeries.size > 0 ? 3 : 2;
      return (
        <g key={si}>
          <path d={pathD} fill="none" stroke={s.color} strokeWidth={strokeW} opacity={opacity} />
          {showDots &&
            points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={isHighlighted && highlightedSeries && highlightedSeries.size > 0 ? 4 : 3} fill={s.color} opacity={opacity} />
            ))}
        </g>
      );
    });
  };

  // Y-axis grid lines
  const gridLines = [1, 2, 3, 4, 5].map((v) => {
    const y = padding.top + chartH - (v / maxValue) * chartH;
    return (
      <g key={v}>
        <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#333" strokeWidth={0.5} opacity={0.3} />
        <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#888">
          {v}
        </text>
      </g>
    );
  });

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {gridLines}
      {series ? renderMultiLine() : renderSingleLine()}
      {showLabels && data.length > 0 && !series &&
        data.map((d, i) => {
          const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
          return (
            <text key={`lbl-${i}`} x={x} y={height - 8} textAnchor="middle" fontSize={9} fill="#888">
              {d.label}
            </text>
          );
        })}
    </svg>
  );
};

interface RadarChartProps {
  categories: string[];
  values: number[];
  previousValues?: number[];
  maxValue?: number;
  size?: number;
  color?: string;
  previousColor?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  categories,
  values,
  previousValues,
  maxValue = 5,
  size = 280,
  color = "#1496ff",
  previousColor = "#666",
}) => {
  const center = size / 2;
  const radius = size / 2 - 40;
  const n = categories.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (index: number, value: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const r = (value / maxValue) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const polygonPoints = (vals: number[]) =>
    vals.map((v, i) => getPoint(i, v)).map((p) => `${p.x},${p.y}`).join(" ");

  // Grid rings
  const rings = [1, 2, 3, 4, 5].map((level) => {
    const pts = Array.from({ length: n }, (_, i) => getPoint(i, level));
    return (
      <polygon
        key={level}
        points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="#444"
        strokeWidth={0.5}
        opacity={0.4}
      />
    );
  });

  // Axis lines + labels
  const axes = categories.map((cat, i) => {
    const end = getPoint(i, maxValue);
    const labelPoint = getPoint(i, maxValue + 0.7);
    return (
      <g key={i}>
        <line x1={center} y1={center} x2={end.x} y2={end.y} stroke="#444" strokeWidth={0.5} opacity={0.4} />
        <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" fontSize={9} fill="#aaa" dominantBaseline="middle">
          {cat}
        </text>
      </g>
    );
  });

  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      {rings}
      {axes}
      {previousValues && (
        <polygon
          points={polygonPoints(previousValues)}
          fill={previousColor}
          fillOpacity={0.1}
          stroke={previousColor}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      <polygon
        points={polygonPoints(values)}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={2}
      />
      {values.map((v, i) => {
        const p = getPoint(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} />;
      })}
    </svg>
  );
};

interface HeatmapProps {
  rows: { label: string; values: number[] }[];
  columns: string[];
  maxValue?: number;
  colors?: Record<number, string>;
}

export const Heatmap: React.FC<HeatmapProps> = ({
  rows,
  columns,
  maxValue = 5,
  colors,
}) => {
  const defaultColors: Record<number, string> = {
    1: "#c4190b",
    2: "#ef8b0e",
    3: "#f5d30e",
    4: "#59c46b",
    5: "#1496ff",
  };
  const colorMap = colors || defaultColors;

  const getColor = (value: number) => {
    const level = Math.round(value);
    return colorMap[Math.min(5, Math.max(1, level))] || "#444";
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}></th>
            {columns.map((col) => (
              <th key={col} style={{ padding: "8px 6px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: 10, fontWeight: 600 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td style={{ padding: "6px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{row.label}</td>
              {row.values.map((val, i) => (
                <td key={i} style={{ padding: "4px", textAlign: "center" }}>
                  <div
                    style={{
                      background: getColor(val),
                      color: "#fff",
                      borderRadius: 6,
                      padding: "6px 4px",
                      fontWeight: 700,
                      fontSize: 13,
                      minWidth: 36,
                    }}
                  >
                    {val.toFixed(1)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Interactive trend chart with clickable legend for filtering series
interface InteractiveTrendChartProps {
  data: { label: string; value: number; color?: string }[];
  series: { label: string; values: number[]; color: string }[];
  width?: number;
  height?: number;
  showLabels?: boolean;
}

export const InteractiveTrendChart: React.FC<InteractiveTrendChartProps> = ({
  data,
  series,
  width = 700,
  height = 220,
  showLabels = true,
}) => {
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());

  const toggleSeries = (index: number) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <>
      <TrendChart
        data={data}
        series={series}
        width={width}
        height={height}
        showLabels={showLabels}
        highlightedSeries={highlighted}
      />
      <div className="legend">
        {series.map((s, i) => {
          const isActive = highlighted.size === 0 || highlighted.has(i);
          return (
            <span
              key={s.label}
              className={`legend-item ${highlighted.size > 0 ? (isActive ? "legend-active" : "legend-dimmed") : ""}`}
              onClick={() => toggleSeries(i)}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              <span className="legend-dot" style={{ background: s.color, opacity: isActive ? 1 : 0.2 }} />
              <span style={{ opacity: isActive ? 1 : 0.4 }}>{s.label}</span>
            </span>
          );
        })}
      </div>
    </>
  );
};
