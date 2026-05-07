import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import { RadarChart } from "../components/Charts";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelFullLabels,
  MaturityLevelColors,
} from "../types";
import { assessmentCategories, scoreToLevel } from "../maturityModel";
import { getDtMaturityHistory, getPersonalGrowthHistory, AssessmentRecord } from "../grailService";
import "../styles/executive.css";

export const Executive = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Org-wide averages
  const orgStats = useMemo(() => {
    if (latestPerUser.length === 0) return null;
    const catAvgs: Record<string, number> = {};
    for (const cat of assessmentCategories) {
      const scores = latestPerUser.map((r) => r.categoryScores[cat.id] || 0).filter((s) => s > 0);
      catAvgs[cat.id] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }
    const overall = Object.values(catAvgs).reduce((a, b) => a + b, 0) / assessmentCategories.length;
    return { categoryScores: catAvgs, overall, overallLevel: scoreToLevel(overall) };
  }, [latestPerUser]);

  // Top risks (lowest categories)
  const topRisks = useMemo(() => {
    if (!orgStats) return [];
    return assessmentCategories
      .map((cat) => ({ name: cat.name, score: orgStats.categoryScores[cat.id] }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [orgStats]);

  // Top improvements (compare earliest vs latest across all users)
  const topImprovements = useMemo(() => {
    const improvements: { category: string; change: number }[] = [];
    const users = Array.from(new Set(history.map((h) => h.user)));
    for (const cat of assessmentCategories) {
      let totalChange = 0;
      let count = 0;
      for (const user of users) {
        const userHist = history
          .filter((r) => r.user === user)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (userHist.length >= 2) {
          const first = userHist[0].categoryScores[cat.id] || 0;
          const last = userHist[userHist.length - 1].categoryScores[cat.id] || 0;
          totalChange += last - first;
          count++;
        }
      }
      if (count > 0) {
        improvements.push({ category: cat.name, change: +(totalChange / count).toFixed(2) });
      }
    }
    return improvements.sort((a, b) => b.change - a.change).slice(0, 3);
  }, [history]);

  // Team rollup
  const teamRollup = useMemo(() => {
    const teams: Record<string, AssessmentRecord[]> = {};
    for (const r of latestPerUser) {
      if (!teams[r.teamName]) teams[r.teamName] = [];
      teams[r.teamName].push(r);
    }
    return Object.entries(teams).map(([team, records]) => {
      const avgScore = records.reduce((sum, r) => sum + r.overallScore, 0) / records.length;
      const catAvgs: Record<string, number> = {};
      for (const cat of assessmentCategories) {
        const scores = records.map((r) => r.categoryScores[cat.id] || 0);
        catAvgs[cat.id] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
      return { team, members: records.length, avgScore, level: scoreToLevel(avgScore), catAvgs };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [latestPerUser]);

  if (loading) {
    return (
      <div className="exec-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="exec-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Data Yet</h2>
        <p style={{ opacity: 0.6 }}>Complete assessments to see the executive summary.</p>
        <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginTop: 16 }}>
          Start Assessment
        </Button>
      </div>
    );
  }

  const overallColor = orgStats ? MaturityLevelColors[orgStats.overallLevel as MaturityLevel] : "#888";

  return (
    <div className="exec-container">
      <div className="exec-header">
        <h1>Executive Summary</h1>
        <p>Organization-wide maturity overview based on {latestPerUser.length} assessor{latestPerUser.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Overall Org Score */}
      {orgStats && (
        <div className="exec-overall" style={{ borderColor: overallColor }}>
          <div className="exec-score" style={{ color: overallColor }}>
            {orgStats.overall.toFixed(1)}
          </div>
          <div className="exec-level">
            Level {orgStats.overallLevel}: {MaturityLevelFullLabels[orgStats.overallLevel as MaturityLevel]}
          </div>
          <div className="exec-subtitle">Organization Average</div>
        </div>
      )}

      {/* KPI Row */}
      <div className="exec-kpi-row">
        <div className="exec-kpi">
          <div className="exec-kpi-value">{latestPerUser.length}</div>
          <div className="exec-kpi-label">Assessors</div>
        </div>
        <div className="exec-kpi">
          <div className="exec-kpi-value">{history.length}</div>
          <div className="exec-kpi-label">Total Assessments</div>
        </div>
        <div className="exec-kpi">
          <div className="exec-kpi-value">{teamRollup.length}</div>
          <div className="exec-kpi-label">Teams</div>
        </div>
      </div>

      {/* Radar */}
      {orgStats && (
        <div className="exec-section">
          <h2>Organization Maturity Profile</h2>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <RadarChart
              categories={assessmentCategories.map((c) => c.name.split(" ")[0])}
              values={assessmentCategories.map((c) => orgStats.categoryScores[c.id] || 0)}
              size={300}
              color={overallColor}
            />
          </div>
        </div>
      )}

      {/* Top Risks & Improvements side-by-side */}
      <div className="exec-two-col">
        <div className="exec-section">
          <h2>Top 3 Risks</h2>
          {topRisks.map((r) => {
            const color = MaturityLevelColors[scoreToLevel(r.score) as MaturityLevel];
            return (
              <div className="exec-risk-item" key={r.name}>
                <span className="exec-risk-name">{r.name}</span>
                <span className="exec-risk-score" style={{ color }}>{r.score.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
        <div className="exec-section">
          <h2>Top 3 Improvements</h2>
          {topImprovements.length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: 13 }}>Need multiple assessments to track improvements.</p>
          ) : (
            topImprovements.map((imp) => (
              <div className="exec-risk-item" key={imp.category}>
                <span className="exec-risk-name">{imp.category}</span>
                <span className={`exec-change ${imp.change > 0 ? "positive" : "negative"}`}>
                  {imp.change > 0 ? "+" : ""}{imp.change}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Team Rollup */}
      {teamRollup.length > 0 && (
        <div className="exec-section">
          <h2>Team Rollup</h2>
          <div className="team-rollup-grid">
            {teamRollup.map((t) => {
              const color = MaturityLevelColors[t.level as MaturityLevel];
              return (
                <div className="team-card" key={t.team}>
                  <div className="team-card-header">
                    <span className="team-name">{t.team}</span>
                    <span className="team-score" style={{ color }}>{t.avgScore.toFixed(1)}</span>
                  </div>
                  <div className="team-members">{t.members} member{t.members !== 1 ? "s" : ""}</div>
                  <div className="team-level">Level {t.level}: {MaturityLevelFullLabels[t.level as MaturityLevel]}</div>
                  <div className="team-cats">
                    {assessmentCategories.map((cat) => {
                      const s = t.catAvgs[cat.id] || 0;
                      const c = MaturityLevelColors[scoreToLevel(s) as MaturityLevel];
                      return (
                        <div className="team-cat-bar" key={cat.id}>
                          <span className="team-cat-name">{cat.name.split(" ")[0]}</span>
                          <div className="team-cat-track">
                            <div className="team-cat-fill" style={{ width: `${(s / 5) * 100}%`, background: c }} />
                          </div>
                          <span className="team-cat-score" style={{ color: c }}>{s.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
