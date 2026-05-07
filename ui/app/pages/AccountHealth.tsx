import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelColors,
} from "../types";
import { dynatraceMaturityCategories, personalGrowthCategories, scoreToLevel } from "../maturityModel";
import { getDtMaturityHistory, getPersonalGrowthHistory, AssessmentRecord } from "../grailService";
import "../styles/health.css";

// Coverage question IDs
const coverageQuestionIds = [
  "cov-infra", "cov-logs", "cov-cloud", "cov-tracing", "cov-rum",
  "cov-ai", "cov-security", "cov-k8s", "cov-db", "cov-network",
  "cov-debugger", "cov-synthetics", "cov-replay", "cov-bizevents", "cov-bizinsights",
];

function computeHealthScore(
  dtRecords: AssessmentRecord[],
  pgRecords: AssessmentRecord[],
): {
  overall: number;
  status: "Red" | "Amber" | "Green";
  color: string;
  maturityScore: number;
  coverageScore: number;
  engagementScore: number;
  trendScore: number;
  maturityDetail: string;
  coverageDetail: string;
  engagementDetail: string;
  trendDetail: string;
} | null {
  if (dtRecords.length === 0 && pgRecords.length === 0) return null;

  // 1. Maturity Score (0-100): based on latest org-average DT maturity
  const latestDtPerUser: Record<string, AssessmentRecord> = {};
  for (const r of dtRecords) {
    if (!latestDtPerUser[r.user] || new Date(r.timestamp) > new Date(latestDtPerUser[r.user].timestamp)) {
      latestDtPerUser[r.user] = r;
    }
  }
  const dtLatest = Object.values(latestDtPerUser);
  const avgOverall = dtLatest.length > 0
    ? dtLatest.reduce((sum, r) => sum + r.overallScore, 0) / dtLatest.length
    : 0;
  const maturityScore = (avgOverall / 5) * 100;
  const maturityDetail = dtLatest.length > 0
    ? `Avg: ${avgOverall.toFixed(1)}/5.0 (L${scoreToLevel(avgOverall)}) across ${dtLatest.length} assessor${dtLatest.length !== 1 ? "s" : ""}`
    : "No DT maturity assessments";

  // 2. Coverage Score (0-100): average of coverage question answers
  const coverageScores: number[] = [];
  for (const record of dtLatest) {
    if (record.answers) {
      for (const qid of coverageQuestionIds) {
        if (record.answers[qid] !== undefined) {
          coverageScores.push(record.answers[qid]);
        }
      }
    }
  }
  const avgCoverage = coverageScores.length > 0
    ? coverageScores.reduce((a, b) => a + b, 0) / coverageScores.length
    : 0;
  const coverageScore = (avgCoverage / 5) * 100;
  const coveredCapabilities = coverageScores.length > 0
    ? Math.round(coverageScores.filter((s) => s >= 3).length / (coverageScores.length / coverageQuestionIds.length))
    : 0;
  const coverageDetail = coverageScores.length > 0
    ? `Avg: ${avgCoverage.toFixed(1)}/5.0 — ${coveredCapabilities}/${coverageQuestionIds.length} capabilities adequate`
    : "No coverage data (answers not stored)";

  // 3. Engagement Score (0-100): based on assessment recency, frequency, breadth
  const allRecords = [...dtRecords, ...pgRecords];
  const latestTimestamp = allRecords.reduce((max, r) => {
    const t = new Date(r.timestamp).getTime();
    return t > max ? t : max;
  }, 0);
  const daysSinceLast = (Date.now() - latestTimestamp) / (1000 * 60 * 60 * 24);
  const recencyPoints = daysSinceLast <= 30 ? 40 : daysSinceLast <= 60 ? 30 : daysSinceLast <= 90 ? 20 : daysSinceLast <= 180 ? 10 : 0;
  const assessorCount = new Set([...dtRecords.map((r) => r.user), ...pgRecords.map((r) => r.user)]).size;
  const breadthPoints = Math.min(assessorCount * 10, 30);
  const freqPoints = Math.min(allRecords.length * 3, 30);
  const engagementScore = recencyPoints + breadthPoints + freqPoints;
  const engagementDetail = `${Math.round(daysSinceLast)}d since last · ${assessorCount} assessor${assessorCount !== 1 ? "s" : ""} · ${allRecords.length} total assessments`;

  // 4. Trend Score (0-100): are scores improving?
  let trendScore = 50; // neutral baseline
  const users = Array.from(new Set(dtRecords.map((r) => r.user)));
  let totalChange = 0;
  let trendCount = 0;
  for (const user of users) {
    const userHist = dtRecords
      .filter((r) => r.user === user)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (userHist.length >= 2) {
      const change = userHist[userHist.length - 1].overallScore - userHist[0].overallScore;
      totalChange += change;
      trendCount++;
    }
  }
  if (trendCount > 0) {
    const avgChange = totalChange / trendCount;
    trendScore = Math.max(0, Math.min(100, 50 + avgChange * 25));
  }
  const trendDetail = trendCount > 0
    ? `${(totalChange / trendCount) > 0 ? "+" : ""}${(totalChange / trendCount).toFixed(2)} avg score change across ${trendCount} user${trendCount !== 1 ? "s" : ""}`
    : "Need 2+ assessments per user to track trends";

  // Weighted overall: Maturity 35%, Coverage 25%, Engagement 20%, Trend 20%
  const overall = maturityScore * 0.35 + coverageScore * 0.25 + engagementScore * 0.20 + trendScore * 0.20;
  const status = overall >= 60 ? "Green" : overall >= 35 ? "Amber" : "Red";
  const color = status === "Green" ? "#59c46b" : status === "Amber" ? "#ef8b0e" : "#c4190b";

  return {
    overall, status, color,
    maturityScore, coverageScore, engagementScore, trendScore,
    maturityDetail, coverageDetail, engagementDetail, trendDetail,
  };
}

export const AccountHealth = () => {
  const navigate = useNavigate();
  const [dtHistory, setDtHistory] = useState<AssessmentRecord[]>([]);
  const [pgHistory, setPgHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [dt, pg] = await Promise.all([getDtMaturityHistory(), getPersonalGrowthHistory()]);
        setDtHistory(dt);
        setPgHistory(pg);
      } catch (e) {
        console.error("Failed to load history:", e);
      }
      setLoading(false);
    })();
  }, []);

  const health = useMemo(
    () => computeHealthScore(dtHistory, pgHistory),
    [dtHistory, pgHistory]
  );

  // Recommendations based on health dimensions
  const recommendations = useMemo(() => {
    if (!health) return [];
    const recs: { icon: string; title: string; detail: string; urgency: string }[] = [];

    if (health.maturityScore < 40) {
      recs.push({
        icon: "📉", title: "Low Maturity Score",
        detail: "Focus on foundational observability and incident management practices. Schedule enablement sessions.",
        urgency: "Critical",
      });
    } else if (health.maturityScore < 60) {
      recs.push({
        icon: "📊", title: "Maturity Plateau",
        detail: "Advance SLO adoption and automation practices to break through Level 2-3.",
        urgency: "High",
      });
    }

    if (health.coverageScore < 40) {
      recs.push({
        icon: "🔍", title: "Coverage Gaps",
        detail: "Multiple Dynatrace capabilities are underutilized. Review Coverage Gaps tab for expansion priorities.",
        urgency: "Critical",
      });
    }

    if (health.engagementScore < 40) {
      recs.push({
        icon: "🗓", title: "Low Engagement",
        detail: "Assessments are stale or limited in breadth. Schedule reassessments and involve more team members.",
        urgency: "High",
      });
    }

    if (health.trendScore < 40) {
      recs.push({
        icon: "📉", title: "Declining Scores",
        detail: "Maturity scores are trending downward. Investigate team changes or process gaps.",
        urgency: "High",
      });
    }

    if (recs.length === 0) {
      recs.push({
        icon: "✅", title: "Healthy Account",
        detail: "Strong maturity, good coverage, regular engagement, and positive trends. Continue current cadence.",
        urgency: "None",
      });
    }

    return recs;
  }, [health]);

  // Quick stats
  const stats = useMemo(() => {
    const allUsers = new Set([...dtHistory.map((r) => r.user), ...pgHistory.map((r) => r.user)]);
    const teams = new Set(dtHistory.map((r) => r.teamName));
    return {
      totalAssessments: dtHistory.length + pgHistory.length,
      assessors: allUsers.size,
      teams: teams.size,
      dtAssessments: dtHistory.length,
      pgAssessments: pgHistory.length,
    };
  }, [dtHistory, pgHistory]);

  if (loading) {
    return (
      <div className="health-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (dtHistory.length === 0 && pgHistory.length === 0) {
    return (
      <div className="health-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Data Yet</h2>
        <p style={{ opacity: 0.6 }}>Complete assessments to see your account health score.</p>
        <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginTop: 16 }}>
          Start Assessment
        </Button>
      </div>
    );
  }

  if (!health) return null;

  const dimensions = [
    { label: "Maturity", score: health.maturityScore, detail: health.maturityDetail, weight: "35%", icon: "🏆" },
    { label: "Coverage", score: health.coverageScore, detail: health.coverageDetail, weight: "25%", icon: "📡" },
    { label: "Engagement", score: health.engagementScore, detail: health.engagementDetail, weight: "20%", icon: "📅" },
    { label: "Trend", score: health.trendScore, detail: health.trendDetail, weight: "20%", icon: "📈" },
  ];

  return (
    <div className="health-container">
      <div className="print-bar">
        <Button variant="emphasized" onClick={() => window.print()}>Print to PDF</Button>
      </div>

      <div className="health-header">
        <h1>Account Health Score</h1>
        <p>Composite account health based on maturity, coverage, engagement, and trend</p>
      </div>

      {/* Hero Score */}
      <div className="health-hero" style={{ borderColor: health.color }}>
        <div className="health-rag" style={{ background: health.color }}>{health.status}</div>
        <div className="health-score" style={{ color: health.color }}>{health.overall.toFixed(0)}</div>
        <div className="health-score-label">out of 100</div>
      </div>

      {/* Quick Stats */}
      <div className="health-stats-row">
        <div className="health-stat">
          <div className="health-stat-value">{stats.assessors}</div>
          <div className="health-stat-label">Assessors</div>
        </div>
        <div className="health-stat">
          <div className="health-stat-value">{stats.totalAssessments}</div>
          <div className="health-stat-label">Assessments</div>
        </div>
        <div className="health-stat">
          <div className="health-stat-value">{stats.teams}</div>
          <div className="health-stat-label">Teams</div>
        </div>
        <div className="health-stat">
          <div className="health-stat-value">{stats.dtAssessments}/{stats.pgAssessments}</div>
          <div className="health-stat-label">DT / PG</div>
        </div>
      </div>

      {/* Dimension Breakdown */}
      <div className="health-card">
        <h2>Health Dimensions</h2>
        <p className="health-desc">Each dimension contributes to the overall health score</p>
        <div className="dimension-grid">
          {dimensions.map((dim) => {
            const dimColor = dim.score >= 60 ? "#59c46b" : dim.score >= 35 ? "#ef8b0e" : "#c4190b";
            return (
              <div className="dimension-card" key={dim.label}>
                <div className="dimension-header">
                  <span className="dimension-icon">{dim.icon}</span>
                  <span className="dimension-name">{dim.label}</span>
                  <span className="dimension-weight">({dim.weight})</span>
                </div>
                <div className="dimension-score" style={{ color: dimColor }}>
                  {dim.score.toFixed(0)}
                </div>
                <div className="dimension-bar-bg">
                  <div
                    className="dimension-bar-fill"
                    style={{ width: `${dim.score}%`, background: dimColor }}
                  />
                </div>
                <div className="dimension-detail">{dim.detail}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="health-card">
        <h2>Recommendations</h2>
        <div className="health-recs">
          {recommendations.map((rec, idx) => {
            const urgencyColor = rec.urgency === "Critical" ? "#c4190b" : rec.urgency === "High" ? "#ef8b0e" : "#59c46b";
            return (
              <div className="health-rec-item" key={idx}>
                <span className="rec-icon">{rec.icon}</span>
                <div className="rec-content">
                  <div className="rec-title">
                    {rec.title}
                    {rec.urgency !== "None" && (
                      <span className="rec-urgency" style={{ color: urgencyColor }}>{rec.urgency}</span>
                    )}
                  </div>
                  <div className="rec-detail">{rec.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical context */}
      <div className="health-card">
        <h2>Assessment Activity</h2>
        <div className="activity-timeline">
          {[...dtHistory, ...pgHistory]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10)
            .map((r, idx) => {
              const isDt = dtHistory.includes(r);
              const color = MaturityLevelColors[scoreToLevel(r.overallScore) as MaturityLevel];
              return (
                <div className="activity-item" key={idx}>
                  <div className="activity-dot" style={{ background: color }} />
                  <div className="activity-content">
                    <span className="activity-user">{r.user}</span>
                    <span className="activity-type">{isDt ? "DT Maturity" : "Personal Growth"}</span>
                    <span className="activity-score" style={{ color }}>{r.overallScore.toFixed(1)}</span>
                  </div>
                  <div className="activity-date">
                    {new Date(r.timestamp).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
