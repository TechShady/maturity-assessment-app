import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@dynatrace/strato-components/buttons";
import { Select, SelectTrigger, SelectContent, SelectOption } from "@dynatrace/strato-components-preview/forms";
import { TrendChart, RadarChart, Heatmap, InteractiveTrendChart } from "../components/Charts";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelColors,
} from "../types";
import { dynatraceMaturityCategories, scoreToLevel } from "../maturityModel";
import { getDtMaturityHistory, AssessmentRecord } from "../grailService";
import "../styles/insights.css";

export const DtInsights = () => {
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [targetLevels, setTargetLevels] = useState<Record<string, number>>(() => {
    const stored = sessionStorage.getItem("dt-target-levels");
    if (stored) return JSON.parse(stored);
    const defaults: Record<string, number> = {};
    dynatraceMaturityCategories.forEach((c) => (defaults[c.id] = 4));
    return defaults;
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const dt = await getDtMaturityHistory();
        setHistory(dt.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } catch (e) {
        console.error("Failed to load history:", e);
      }
      setLoading(false);
    })();
  }, []);

  const users = useMemo(
    () => Array.from(new Set(history.map((h) => h.user))).sort(),
    [history]
  );

  const filteredHistory = useMemo(() => {
    const h = selectedUser === "all" ? history : history.filter((r) => r.user === selectedUser);
    return [...h].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [history, selectedUser]);

  const latestPerUser = useMemo(() => {
    const map: Record<string, AssessmentRecord> = {};
    for (const r of history) {
      if (!map[r.user] || new Date(r.timestamp) > new Date(map[r.user].timestamp)) {
        map[r.user] = r;
      }
    }
    return Object.values(map);
  }, [history]);

  const orgAverages = useMemo(() => {
    if (latestPerUser.length === 0) return null;
    const catAvgs: Record<string, number> = {};
    for (const cat of dynatraceMaturityCategories) {
      const scores = latestPerUser.map((r) => r.categoryScores[cat.id] || 0).filter((s) => s > 0);
      catAvgs[cat.id] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }
    const overall = Object.values(catAvgs).reduce((a, b) => a + b, 0) / dynatraceMaturityCategories.length;
    return { categoryScores: catAvgs, overall };
  }, [latestPerUser]);

  const biggestMovers = useMemo(() => {
    const movers: { user: string; category: string; change: number }[] = [];
    for (const user of users) {
      const userHist = history
        .filter((r) => r.user === user)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (userHist.length < 2) continue;
      const first = userHist[0];
      const last = userHist[userHist.length - 1];
      for (const cat of dynatraceMaturityCategories) {
        const change = (last.categoryScores[cat.id] || 0) - (first.categoryScores[cat.id] || 0);
        if (Math.abs(change) > 0) {
          movers.push({ user, category: cat.name, change: +change.toFixed(2) });
        }
      }
    }
    return movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10);
  }, [history, users]);

  const cadenceData = useMemo(() => {
    return users.map((user) => {
      const userHist = history
        .filter((r) => r.user === user)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const lastAssessment = userHist[0];
      const daysSinceLast = lastAssessment
        ? Math.floor((Date.now() - new Date(lastAssessment.timestamp).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return { user, total: userHist.length, daysSinceLast };
    });
  }, [history, users]);

  const trendData = useMemo(() => {
    return filteredHistory.map((r) => ({
      label: new Date(r.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: r.overallScore,
    }));
  }, [filteredHistory]);

  const categorySeries = useMemo(() => {
    if (filteredHistory.length < 2) return [];
    const palette = ["#1496ff", "#59c46b", "#f5d30e", "#ef8b0e", "#c4190b", "#a855f7", "#06b6d4", "#ec4899", "#84cc16", "#f97316"];
    return dynatraceMaturityCategories.map((cat, i) => ({
      label: cat.name,
      values: filteredHistory.map((r) => r.categoryScores[cat.id] || 0),
      color: palette[i % palette.length],
    }));
  }, [filteredHistory]);

  const radarData = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const latest = filteredHistory[filteredHistory.length - 1];
    const previous = filteredHistory.length > 1 ? filteredHistory[filteredHistory.length - 2] : null;
    return {
      categories: dynatraceMaturityCategories.map((c) => c.name.split(" ")[0]),
      values: dynatraceMaturityCategories.map((c) => latest.categoryScores[c.id] || 0),
      previousValues: previous
        ? dynatraceMaturityCategories.map((c) => previous.categoryScores[c.id] || 0)
        : undefined,
    };
  }, [filteredHistory]);

  const heatmapData = useMemo(() => {
    return latestPerUser.map((r) => ({
      label: r.user,
      values: dynatraceMaturityCategories.map((c) => r.categoryScores[c.id] || 0),
    }));
  }, [latestPerUser]);

  const gapData = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const latest = filteredHistory[filteredHistory.length - 1];
    return dynatraceMaturityCategories.map((cat) => {
      const current = latest.categoryScores[cat.id] || 0;
      const target = targetLevels[cat.id] || 4;
      return { category: cat.name, id: cat.id, current, target, gap: +(target - current).toFixed(2) };
    });
  }, [filteredHistory, targetLevels]);

  const handleTargetChange = (catId: string, value: number) => {
    const updated = { ...targetLevels, [catId]: value };
    setTargetLevels(updated);
    sessionStorage.setItem("dt-target-levels", JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="insights-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading Insights...</h2>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="insights-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Data Yet</h2>
        <p style={{ opacity: 0.6 }}>Complete DT Maturity assessments to see insights.</p>
      </div>
    );
  }

  return (
    <div className="insights-container">
      <div className="print-bar">
        <Button variant="emphasized" onClick={() => window.print()}>Print to PDF</Button>
      </div>
      <div className="insights-header">
        <h1>DT Maturity Insights</h1>
        <p>Deep dive into Dynatrace maturity trends, comparisons, and improvement opportunities.</p>
      </div>

      <div className="insights-filter">
        <label className="filter-label">User:</label>
        <Select value={selectedUser} onChange={(val) => setSelectedUser(val ?? "all")}>
          <SelectTrigger placeholder="All Users" />
          <SelectContent>
            <SelectOption value="all">All Users</SelectOption>
            {users.map((u) => (
              <SelectOption key={u} value={u}>{u}</SelectOption>
            ))}
          </SelectContent>
        </Select>
      </div>

      {trendData.length >= 2 && (
        <div className="insight-card">
          <h2>Score Trend</h2>
          <p className="insight-desc">Overall DT maturity score over time</p>
          <TrendChart data={trendData} width={700} height={200} />
          {categorySeries.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Category Trends</h3>
              <InteractiveTrendChart
                data={trendData}
                series={categorySeries}
                width={700}
                height={220}
                showLabels={true}
              />
            </>
          )}
        </div>
      )}

      {radarData && (
        <div className="insight-card">
          <h2>Maturity Profile</h2>
          <p className="insight-desc">
            Current strengths vs weaknesses
            {radarData.previousValues && " (dashed = previous assessment)"}
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <RadarChart
              categories={radarData.categories}
              values={radarData.values}
              previousValues={radarData.previousValues}
              size={320}
            />
          </div>
        </div>
      )}

      {heatmapData.length > 1 && (
        <div className="insight-card">
          <h2>Organization Heatmap</h2>
          <p className="insight-desc">All users' latest DT maturity scores by category</p>
          <Heatmap
            rows={heatmapData}
            columns={dynatraceMaturityCategories.map((c) => c.name.split("&")[0].trim())}
          />
        </div>
      )}

      {gapData && (
        <div className="insight-card">
          <h2>Gap to Target</h2>
          <p className="insight-desc">Set your target level per category and see the remaining gap</p>
          <div className="gap-grid">
            {gapData.map((item) => (
              <div className="gap-item" key={item.id}>
                <div className="gap-category">{item.category}</div>
                <div className="gap-bar-container">
                  <div className="gap-bar-bg">
                    <div
                      className="gap-bar-current"
                      style={{ width: `${(item.current / 5) * 100}%`, background: MaturityLevelColors[scoreToLevel(item.current) as MaturityLevel] }}
                    />
                    <div
                      className="gap-bar-target"
                      style={{ left: `${(item.target / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="gap-values">
                  <span>Current: {item.current.toFixed(1)}</span>
                  <span className="gap-target-select">
                    Target:
                    <select
                      value={item.target}
                      onChange={(e) => handleTargetChange(item.id, Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </span>
                  <span className={`gap-value ${item.gap > 0 ? "has-gap" : "met"}`}>
                    {item.gap > 0 ? `Gap: ${item.gap}` : "✓ Met"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orgAverages && selectedUser !== "all" && filteredHistory.length > 0 && (
        <div className="insight-card">
          <h2>Peer Benchmarking</h2>
          <p className="insight-desc">Your scores vs. organization average</p>
          <div className="benchmark-grid">
            {dynatraceMaturityCategories.map((cat) => {
              const latest = filteredHistory[filteredHistory.length - 1];
              const userScore = latest.categoryScores[cat.id] || 0;
              const avgScore = orgAverages.categoryScores[cat.id] || 0;
              const diff = +(userScore - avgScore).toFixed(2);
              return (
                <div className="benchmark-item" key={cat.id}>
                  <div className="benchmark-category">{cat.name}</div>
                  <div className="benchmark-scores">
                    <span className="benchmark-user">{userScore.toFixed(1)}</span>
                    <span className="benchmark-vs">vs</span>
                    <span className="benchmark-avg">{avgScore.toFixed(1)} avg</span>
                    <span className={`benchmark-diff ${diff > 0 ? "above" : diff < 0 ? "below" : ""}`}>
                      {diff > 0 ? "+" : ""}{diff}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {biggestMovers.length > 0 && (
        <div className="insight-card">
          <h2>Biggest Movers</h2>
          <p className="insight-desc">Categories with the largest improvements or regressions</p>
          <div className="movers-list">
            {biggestMovers.map((m, i) => (
              <div className="mover-item" key={i}>
                <span className="mover-user">{m.user}</span>
                <span className="mover-category">{m.category}</span>
                <span className={`mover-change ${m.change > 0 ? "positive" : "negative"}`}>
                  {m.change > 0 ? "+" : ""}{m.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cadenceData.length > 0 && (
        <div className="insight-card">
          <h2>Assessment Cadence</h2>
          <p className="insight-desc">How frequently users are assessing</p>
          <div className="cadence-list">
            {cadenceData.map((item) => (
              <div className="cadence-item" key={item.user}>
                <span className="cadence-user">{item.user}</span>
                <span className="cadence-total">{item.total} assessment{item.total !== 1 ? "s" : ""}</span>
                <span className={`cadence-days ${item.daysSinceLast !== null && item.daysSinceLast > 90 ? "stale" : ""}`}>
                  {item.daysSinceLast !== null
                    ? item.daysSinceLast === 0
                      ? "Today"
                      : `${item.daysSinceLast}d ago`
                    : "Never"}
                </span>
                {item.daysSinceLast !== null && item.daysSinceLast > 90 && (
                  <span className="cadence-warning">⚠ Overdue</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
