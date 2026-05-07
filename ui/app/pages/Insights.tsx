import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@dynatrace/strato-components/buttons";
import { Select, SelectTrigger, SelectContent, SelectOption } from "@dynatrace/strato-components-preview/forms";
import { TrendChart, RadarChart, Heatmap, InteractiveTrendChart } from "../components/Charts";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelColors,
} from "../types";
import { assessmentCategories, scoreToLevel } from "../maturityModel";
import { getDtMaturityHistory, getPersonalGrowthHistory, AssessmentRecord } from "../grailService";
import "../styles/insights.css";

export const Insights = () => {
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [targetLevels, setTargetLevels] = useState<Record<string, number>>(() => {
    const stored = sessionStorage.getItem("target-levels");
    if (stored) return JSON.parse(stored);
    const defaults: Record<string, number> = {};
    assessmentCategories.forEach((c) => (defaults[c.id] = 4));
    return defaults;
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [dt, pg] = await Promise.all([getDtMaturityHistory(), getPersonalGrowthHistory()]);
        setHistory([...dt, ...pg].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
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

  // Latest assessment per user
  const latestPerUser = useMemo(() => {
    const map: Record<string, AssessmentRecord> = {};
    for (const r of history) {
      if (!map[r.user] || new Date(r.timestamp) > new Date(map[r.user].timestamp)) {
        map[r.user] = r;
      }
    }
    return Object.values(map);
  }, [history]);

  // Org averages
  const orgAverages = useMemo(() => {
    if (latestPerUser.length === 0) return null;
    const catAvgs: Record<string, number> = {};
    for (const cat of assessmentCategories) {
      const scores = latestPerUser.map((r) => r.categoryScores[cat.id] || 0).filter((s) => s > 0);
      catAvgs[cat.id] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }
    const overall = Object.values(catAvgs).reduce((a, b) => a + b, 0) / assessmentCategories.length;
    return { categoryScores: catAvgs, overall };
  }, [latestPerUser]);

  // Biggest movers (users with largest improvement)
  const biggestMovers = useMemo(() => {
    const movers: { user: string; category: string; change: number }[] = [];
    for (const user of users) {
      const userHist = history
        .filter((r) => r.user === user)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (userHist.length < 2) continue;
      const first = userHist[0];
      const last = userHist[userHist.length - 1];
      for (const cat of assessmentCategories) {
        const change = (last.categoryScores[cat.id] || 0) - (first.categoryScores[cat.id] || 0);
        if (Math.abs(change) > 0) {
          movers.push({ user, category: cat.name, change: +change.toFixed(2) });
        }
      }
    }
    return movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10);
  }, [history, users]);

  // Assessment cadence
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

  // User-specific achievement badges
  const badges = useMemo(() => {
    if (selectedUser === "all" || filteredHistory.length === 0) return [];
    const earned: { label: string; icon: string; desc: string }[] = [];

    // First Assessment
    if (filteredHistory.length >= 1) {
      earned.push({ label: "First Assessment", icon: "🎯", desc: "Completed your first assessment" });
    }

    // Consistent Assessor - 3+ assessments
    if (filteredHistory.length >= 3) {
      earned.push({ label: "Consistent Assessor", icon: "🔄", desc: "Completed 3+ assessments" });
    }

    // Veteran - 5+ assessments
    if (filteredHistory.length >= 5) {
      earned.push({ label: "Veteran", icon: "🎖️", desc: "Completed 5+ assessments" });
    }

    if (filteredHistory.length >= 2) {
      const first = filteredHistory[0];
      const latest = filteredHistory[filteredHistory.length - 1];

      // Improved - overall score went up
      if (latest.overallScore > first.overallScore) {
        earned.push({ label: "Improved", icon: "📈", desc: "Overall score improved since first assessment" });
      }

      // Level Up - overall level increased
      if (latest.overallLevel > first.overallLevel) {
        earned.push({ label: "Level Up", icon: "⬆️", desc: "Maturity level increased" });
      }

      // Streak - last 3 consecutive improvements
      if (filteredHistory.length >= 3) {
        const last3 = filteredHistory.slice(-3);
        if (last3[1].overallScore > last3[0].overallScore && last3[2].overallScore > last3[1].overallScore) {
          earned.push({ label: "On a Streak", icon: "🔥", desc: "3 consecutive improvements" });
        }
      }
    }

    // Top Performer - any category >= 4.5
    const latest = filteredHistory[filteredHistory.length - 1];
    const catScores = Object.values(latest.categoryScores);
    if (catScores.some((s) => s >= 4.5)) {
      earned.push({ label: "Top Performer", icon: "🏆", desc: "Scored 4.5+ in a category" });
    }

    // Well Rounded - all categories >= 3.0
    if (catScores.length > 0 && catScores.every((s) => s >= 3.0)) {
      earned.push({ label: "Well Rounded", icon: "🌟", desc: "All categories at 3.0 or above" });
    }

    // Visionary - overall score >= 4.5
    if (latest.overallScore >= 4.5) {
      earned.push({ label: "Visionary", icon: "👁️", desc: "Overall score of 4.5+" });
    }

    return earned;
  }, [filteredHistory, selectedUser]);

  // Trend data for selected user
  const trendData = useMemo(() => {
    return filteredHistory.map((r) => ({
      label: new Date(r.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: r.overallScore,
    }));
  }, [filteredHistory]);

  // Multi-series category trends
  const categorySeries = useMemo(() => {
    if (filteredHistory.length < 2) return [];
    const palette = ["#1496ff", "#59c46b", "#f5d30e", "#ef8b0e", "#c4190b", "#a855f7", "#06b6d4", "#ec4899", "#84cc16", "#f97316"];
    return assessmentCategories.map((cat, i) => ({
      label: cat.name,
      values: filteredHistory.map((r) => r.categoryScores[cat.id] || 0),
      color: palette[i % palette.length],
    }));
  }, [filteredHistory]);

  // Radar data
  const radarData = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const latest = filteredHistory[filteredHistory.length - 1];
    const previous = filteredHistory.length > 1 ? filteredHistory[filteredHistory.length - 2] : null;
    return {
      categories: assessmentCategories.map((c) => c.name.split(" ")[0]),
      values: assessmentCategories.map((c) => latest.categoryScores[c.id] || 0),
      previousValues: previous
        ? assessmentCategories.map((c) => previous.categoryScores[c.id] || 0)
        : undefined,
    };
  }, [filteredHistory]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    return latestPerUser.map((r) => ({
      label: r.user,
      values: assessmentCategories.map((c) => r.categoryScores[c.id] || 0),
    }));
  }, [latestPerUser]);

  // Gap to target
  const gapData = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const latest = filteredHistory[filteredHistory.length - 1];
    return assessmentCategories.map((cat) => {
      const current = latest.categoryScores[cat.id] || 0;
      const target = targetLevels[cat.id] || 4;
      return { category: cat.name, id: cat.id, current, target, gap: +(target - current).toFixed(2) };
    });
  }, [filteredHistory, targetLevels]);

  const handleTargetChange = (catId: string, value: number) => {
    const updated = { ...targetLevels, [catId]: value };
    setTargetLevels(updated);
    sessionStorage.setItem("target-levels", JSON.stringify(updated));
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
        <p style={{ opacity: 0.6 }}>Complete assessments to see insights.</p>
      </div>
    );
  }

  return (
    <div className="insights-container">
      <div className="insights-header">
        <h1>Assessment Insights</h1>
        <p>Deep dive into maturity trends, comparisons, and improvement opportunities.</p>
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

      {/* Score Trend Chart */}
      {trendData.length >= 2 && (
        <div className="insight-card">
          <h2>Score Trend</h2>
          <p className="insight-desc">Overall maturity score over time</p>
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

      {/* Radar Chart */}
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

      {/* Heatmap */}
      {heatmapData.length > 1 && (
        <div className="insight-card">
          <h2>Organization Heatmap</h2>
          <p className="insight-desc">All users' latest scores by category</p>
          <Heatmap
            rows={heatmapData}
            columns={assessmentCategories.map((c) => c.name.split("&")[0].trim())}
          />
        </div>
      )}

      {/* Gap to Target */}
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

      {/* Peer Benchmarking */}
      {orgAverages && selectedUser !== "all" && filteredHistory.length > 0 && (
        <div className="insight-card">
          <h2>Peer Benchmarking</h2>
          <p className="insight-desc">Your scores vs. organization average</p>
          <div className="benchmark-grid">
            {assessmentCategories.map((cat) => {
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

      {/* Biggest Movers */}
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

      {/* Achievement Badges (per user) */}
      {badges.length > 0 && (
        <div className="insight-card">
          <h2>Achievements</h2>
          <p className="insight-desc">Badges earned by {selectedUser}</p>
          <div className="badges-grid">
            {badges.map((b) => (
              <div className="badge-card" key={b.label}>
                <span className="badge-icon">{b.icon}</span>
                <div className="badge-info">
                  <span className="badge-label">{b.label}</span>
                  <span className="badge-desc">{b.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment Cadence */}
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
