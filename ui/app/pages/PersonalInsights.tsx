import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@dynatrace/strato-components/buttons";
import { Select, SelectTrigger, SelectContent, SelectOption } from "@dynatrace/strato-components-preview/forms";
import { TrendChart, RadarChart, Heatmap, InteractiveTrendChart } from "../components/Charts";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelColors,
} from "../types";
import { personalGrowthCategories, scoreToLevel } from "../maturityModel";
import { getPersonalGrowthHistory, AssessmentRecord } from "../grailService";
import { useCustomerName } from "../CustomerNameContext";
import "../styles/insights.css";

export const PersonalInsights = () => {
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const { customerName } = useCustomerName();
  const [targetLevels, setTargetLevels] = useState<Record<string, number>>(() => {
    const stored = sessionStorage.getItem("pg-target-levels");
    if (stored) return JSON.parse(stored);
    const defaults: Record<string, number> = {};
    personalGrowthCategories.forEach((c) => (defaults[c.id] = 4));
    return defaults;
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const pg = await getPersonalGrowthHistory();
        setHistory(pg.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
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
    for (const cat of personalGrowthCategories) {
      const scores = latestPerUser.map((r) => r.categoryScores[cat.id] || 0).filter((s) => s > 0);
      catAvgs[cat.id] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }
    const overall = Object.values(catAvgs).reduce((a, b) => a + b, 0) / personalGrowthCategories.length;
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
      for (const cat of personalGrowthCategories) {
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

  const badges = useMemo(() => {
    if (selectedUser === "all" || filteredHistory.length === 0) return [];
    const earned: { label: string; icon: string; desc: string }[] = [];

    if (filteredHistory.length >= 1) {
      earned.push({ label: "First Assessment", icon: "🎯", desc: "Completed your first personal growth assessment" });
    }
    if (filteredHistory.length >= 3) {
      earned.push({ label: "Consistent Learner", icon: "🔄", desc: "Completed 3+ assessments" });
    }
    if (filteredHistory.length >= 5) {
      earned.push({ label: "Growth Veteran", icon: "🎖️", desc: "Completed 5+ assessments" });
    }

    if (filteredHistory.length >= 2) {
      const first = filteredHistory[0];
      const latest = filteredHistory[filteredHistory.length - 1];
      if (latest.overallScore > first.overallScore) {
        earned.push({ label: "Growing", icon: "📈", desc: "Overall score improved since first assessment" });
      }
      if (latest.overallLevel > first.overallLevel) {
        earned.push({ label: "Level Up", icon: "⬆️", desc: "Proficiency level increased" });
      }
      if (filteredHistory.length >= 3) {
        const last3 = filteredHistory.slice(-3);
        if (last3[1].overallScore > last3[0].overallScore && last3[2].overallScore > last3[1].overallScore) {
          earned.push({ label: "On a Streak", icon: "🔥", desc: "3 consecutive improvements" });
        }
      }
    }

    const latest = filteredHistory[filteredHistory.length - 1];
    const catScores = Object.values(latest.categoryScores);
    if (catScores.some((s) => s >= 4.5)) {
      earned.push({ label: "Expert", icon: "🏆", desc: "Scored 4.5+ in a skill area" });
    }
    if (catScores.length > 0 && catScores.every((s) => s >= 3.0)) {
      earned.push({ label: "Well Rounded", icon: "🌟", desc: "All skill areas at 3.0 or above" });
    }
    if (latest.overallScore >= 4.5) {
      earned.push({ label: "Platform Master", icon: "👁️", desc: "Overall score of 4.5+" });
    }

    return earned;
  }, [filteredHistory, selectedUser]);

  const openCertificate = (badge: { label: string; icon: string; desc: string }) => {
    const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    const latest = filteredHistory[filteredHistory.length - 1];
    const levelLabel = MaturityLevelLabels[scoreToLevel(latest?.overallScore || 0) as MaturityLevel] || "";
    const companyName = customerName || "";
    const recipientName = selectedUser !== "all" ? selectedUser : "";

    const html = `<!DOCTYPE html>
<html><head><title>Certificate - ${badge.label}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: landscape; margin: 0; }
body { font-family: 'Inter', sans-serif; background: #f8f9fa; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
.certificate { width: 1050px; height: 750px; background: #fff; position: relative; padding: 60px 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.border-outer { position: absolute; inset: 12px; border: 3px solid #1496ff; border-radius: 4px; }
.border-inner { position: absolute; inset: 20px; border: 1px solid rgba(20, 150, 255, 0.3); border-radius: 2px; }
.corner { position: absolute; width: 40px; height: 40px; border-color: #1496ff; border-style: solid; }
.corner-tl { top: 30px; left: 30px; border-width: 3px 0 0 3px; }
.corner-tr { top: 30px; right: 30px; border-width: 3px 3px 0 0; }
.corner-bl { bottom: 30px; left: 30px; border-width: 0 0 3px 3px; }
.corner-br { bottom: 30px; right: 30px; border-width: 0 3px 3px 0; }
.logo-section { display: flex; align-items: center; gap: 14px; margin-bottom: 8px; }
.logo-section img { height: 48px; width: auto; }
.company-name { font-size: 14px; color: #555; margin-bottom: 24px; letter-spacing: 2px; text-transform: uppercase; }
.cert-title { font-family: 'Playfair Display', serif; font-size: 42px; color: #1a1a2e; margin-bottom: 8px; letter-spacing: 1px; }
.cert-subtitle { font-size: 15px; color: #666; margin-bottom: 32px; letter-spacing: 3px; text-transform: uppercase; }
.badge-display { font-size: 56px; margin-bottom: 16px; }
.badge-name { font-family: 'Playfair Display', serif; font-size: 28px; color: #1496ff; margin-bottom: 8px; }
.badge-description { font-size: 14px; color: #666; margin-bottom: 32px; max-width: 500px; text-align: center; }
.recipient { font-size: 24px; font-weight: 300; color: #1a1a2e; margin-bottom: 4px; }
.recipient-name { font-family: 'Playfair Display', serif; font-size: 32px; color: #1a1a2e; border-bottom: 2px solid #1496ff; padding-bottom: 4px; margin-bottom: 24px; }
.details { display: flex; gap: 48px; margin-bottom: 24px; }
.detail-item { text-align: center; }
.detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888; }
.detail-value { font-size: 14px; font-weight: 600; color: #333; margin-top: 4px; }
.footer { position: absolute; bottom: 40px; display: flex; align-items: center; gap: 40px; }
.footer-divider { width: 160px; border-top: 1px solid #ccc; }
.footer-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-top: 6px; text-align: center; }
.watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 200px; opacity: 0.02; color: #1496ff; pointer-events: none; }
@media print { body { background: #fff; } .certificate { box-shadow: none; } }
</style></head><body>
<div class="certificate">
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>
  <div class="watermark">${badge.icon}</div>
  <div class="logo-section">
    <img src="data:image/jpeg;base64,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" alt="Dynatrace" />
  </div>
  ${companyName ? `<div class="company-name">${companyName}</div>` : '<div style="margin-bottom:24px"></div>'}
  <div class="cert-title">Certificate of Achievement</div>
  <div class="cert-subtitle">Platform Proficiency Recognition</div>
  <div class="badge-display">${badge.icon}</div>
  <div class="badge-name">${badge.label}</div>
  <div class="badge-description">${badge.desc}</div>
  <div class="recipient">Awarded to</div>
  <div class="recipient-name">${recipientName}</div>
  <div class="details">
    <div class="detail-item">
      <div class="detail-label">Date Earned</div>
      <div class="detail-value">${dateStr}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Proficiency Level</div>
      <div class="detail-value">${levelLabel}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Overall Score</div>
      <div class="detail-value">${latest?.overallScore?.toFixed(1) || "—"} / 5.0</div>
    </div>
  </div>
  <div class="footer">
    <div>
      <div class="footer-divider"></div>
      <div class="footer-label">Program Administrator</div>
    </div>
    <div>
      <div class="footer-divider"></div>
      <div class="footer-label">Date of Issue</div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const trendData = useMemo(() => {
    return filteredHistory.map((r) => ({
      label: new Date(r.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: r.overallScore,
    }));
  }, [filteredHistory]);

  const categorySeries = useMemo(() => {
    if (filteredHistory.length < 2) return [];
    const palette = ["#1496ff", "#59c46b", "#f5d30e", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];
    return personalGrowthCategories.map((cat, i) => ({
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
      categories: personalGrowthCategories.map((c) => c.name.split(" ")[0]),
      values: personalGrowthCategories.map((c) => latest.categoryScores[c.id] || 0),
      previousValues: previous
        ? personalGrowthCategories.map((c) => previous.categoryScores[c.id] || 0)
        : undefined,
    };
  }, [filteredHistory]);

  const heatmapData = useMemo(() => {
    return latestPerUser.map((r) => ({
      label: r.user,
      values: personalGrowthCategories.map((c) => r.categoryScores[c.id] || 0),
    }));
  }, [latestPerUser]);

  const gapData = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const latest = filteredHistory[filteredHistory.length - 1];
    return personalGrowthCategories.map((cat) => {
      const current = latest.categoryScores[cat.id] || 0;
      const target = targetLevels[cat.id] || 4;
      return { category: cat.name, id: cat.id, current, target, gap: +(target - current).toFixed(2) };
    });
  }, [filteredHistory, targetLevels]);

  const handleTargetChange = (catId: string, value: number) => {
    const updated = { ...targetLevels, [catId]: value };
    setTargetLevels(updated);
    sessionStorage.setItem("pg-target-levels", JSON.stringify(updated));
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
        <p style={{ opacity: 0.6 }}>Complete Personal Growth assessments to see insights.</p>
      </div>
    );
  }

  return (
    <div className="insights-container">
      <div className="print-bar">
        <Button variant="emphasized" onClick={() => window.print()}>Print to PDF</Button>
      </div>
      <div className="insights-header">
        <h1>Personal Growth Insights</h1>
        <p>Track your Dynatrace proficiency growth and skill development over time.</p>
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
          <h2>Growth Trend</h2>
          <p className="insight-desc">Overall proficiency score over time</p>
          <TrendChart data={trendData} width={700} height={200} />
          {categorySeries.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Skill Area Trends</h3>
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
          <h2>Proficiency Profile</h2>
          <p className="insight-desc">
            Current skill strengths vs areas for growth
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
          <h2>Team Heatmap</h2>
          <p className="insight-desc">All users' latest proficiency scores by skill area</p>
          <Heatmap
            rows={heatmapData}
            columns={personalGrowthCategories.map((c) => c.name.split("&")[0].trim())}
          />
        </div>
      )}

      {gapData && (
        <div className="insight-card">
          <h2>Gap to Target</h2>
          <p className="insight-desc">Set your target proficiency per skill area and see the remaining gap</p>
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
          <p className="insight-desc">Your scores vs. team average</p>
          <div className="benchmark-grid">
            {personalGrowthCategories.map((cat) => {
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
          <p className="insight-desc">Skill areas with the largest improvements or regressions</p>
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

      {badges.length > 0 && (
        <div className="insight-card">
          <h2>Achievements</h2>
          <p className="insight-desc">Badges earned by {selectedUser}</p>
          <div className="badges-grid">
            {badges.map((b) => (
              <div className="badge-card clickable" key={b.label} onClick={() => openCertificate(b)} title="Click to print certificate">
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
