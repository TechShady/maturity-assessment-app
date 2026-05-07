import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  MaturityLevel,
  MaturityLevelColors,
} from "../types";
import { dynatraceMaturityCategories, scoreToLevel } from "../maturityModel";
import { getDtMaturityHistory, AssessmentRecord } from "../grailService";
import "../styles/insights.css";

// Coverage question IDs and their friendly capability names
const coverageQuestions: { id: string; capability: string; description: string }[] = [
  { id: "cov-infra", capability: "Infrastructure Monitoring", description: "Full-stack host monitoring with OneAgent" },
  { id: "cov-logs", capability: "Log Management", description: "Log ingestion, analysis, and correlation" },
  { id: "cov-cloud", capability: "Cloud Monitoring", description: "AWS, Azure, and GCP resource monitoring" },
  { id: "cov-tracing", capability: "Distributed Tracing", description: "End-to-end request tracing across services" },
  { id: "cov-rum", capability: "Real User Monitoring", description: "Browser and mobile user experience tracking" },
  { id: "cov-ai", capability: "AI Observability", description: "AI/ML workload monitoring and optimization" },
  { id: "cov-security", capability: "Application Security", description: "Runtime vulnerability and attack detection" },
  { id: "cov-k8s", capability: "Kubernetes Monitoring", description: "Cluster, workload, and pod observability" },
  { id: "cov-db", capability: "Database Monitoring", description: "Query-level database performance monitoring" },
  { id: "cov-network", capability: "Network Monitoring", description: "Network flow analysis and topology" },
  { id: "cov-debugger", capability: "Live Debugger", description: "Production debugging without redeployment" },
  { id: "cov-synthetics", capability: "Synthetic Monitoring", description: "Proactive uptime and user journey validation" },
  { id: "cov-replay", capability: "Session Replay", description: "Visual replay of real user sessions" },
  { id: "cov-bizevents", capability: "Business Events", description: "Business process and transaction capture" },
  { id: "cov-bizinsights", capability: "Business Insights", description: "Business KPI analytics and decision support" },
];

// Map coverage score to percentage range label
function scoreToPercentage(score: number): string {
  if (score <= 1) return "0–20%";
  if (score <= 2) return "21–40%";
  if (score <= 3) return "41–60%";
  if (score <= 4) return "61–80%";
  return "81–100%";
}

// Map coverage score to priority
function scoreToPriority(score: number): { label: string; color: string } {
  if (score <= 1.5) return { label: "Critical Gap", color: "#c4190b" };
  if (score <= 2.5) return { label: "Significant Gap", color: "#ef8b0e" };
  if (score <= 3.5) return { label: "Moderate Gap", color: "#f5d30e" };
  if (score <= 4.0) return { label: "Minor Gap", color: "#59c46b" };
  return { label: "Well Covered", color: "#1496ff" };
}

export const CoverageGap = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  const latestPerUser = useMemo(() => {
    const map: Record<string, AssessmentRecord> = {};
    for (const r of history) {
      if (!map[r.user] || new Date(r.timestamp) > new Date(map[r.user].timestamp)) {
        map[r.user] = r;
      }
    }
    return Object.values(map);
  }, [history]);

  // Get average coverage scores from answers (stored in categoryScores for 'coverage' category)
  // But we need individual question answers - check if answers are stored
  const coverageAnalysis = useMemo(() => {
    if (latestPerUser.length === 0) return [];

    return coverageQuestions.map((cq) => {
      // Look through all records for answers to this question
      const scores: number[] = [];
      for (const record of latestPerUser) {
        if (record.answers && record.answers[cq.id] !== undefined) {
          scores.push(record.answers[cq.id]);
        }
      }
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const priority = scoreToPriority(avgScore);
      return {
        ...cq,
        avgScore,
        coverage: scoreToPercentage(avgScore),
        respondents: scores.length,
        priority,
      };
    }).sort((a, b) => a.avgScore - b.avgScore);
  }, [latestPerUser]);

  // Deployment coverage category scores as fallback
  const deploymentScore = useMemo(() => {
    if (latestPerUser.length === 0) return null;
    const scores = latestPerUser.map((r) => r.categoryScores["deployment"] || 0).filter((s) => s > 0);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [latestPerUser]);

  const coverageCategoryScore = useMemo(() => {
    if (latestPerUser.length === 0) return null;
    const scores = latestPerUser.map((r) => r.categoryScores["coverage"] || 0).filter((s) => s > 0);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [latestPerUser]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (coverageAnalysis.length === 0) return null;
    const withData = coverageAnalysis.filter((c) => c.respondents > 0);
    if (withData.length === 0) return null;
    const criticalGaps = withData.filter((c) => c.avgScore <= 1.5).length;
    const significantGaps = withData.filter((c) => c.avgScore > 1.5 && c.avgScore <= 2.5).length;
    const wellCovered = withData.filter((c) => c.avgScore > 4.0).length;
    const avgCoverage = withData.reduce((sum, c) => sum + c.avgScore, 0) / withData.length;
    return { criticalGaps, significantGaps, wellCovered, avgCoverage, totalCapabilities: withData.length };
  }, [coverageAnalysis]);

  if (loading) {
    return (
      <div className="insights-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading Coverage Analysis...</h2>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="insights-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Data Yet</h2>
        <p style={{ opacity: 0.6 }}>Complete DT Maturity assessments (including Coverage & Usage section) to see coverage gap analysis.</p>
        <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginTop: 16 }}>
          Start Assessment
        </Button>
      </div>
    );
  }

  const hasDetailedCoverage = coverageAnalysis.some((c) => c.respondents > 0);

  return (
    <div className="insights-container">
      <div className="print-bar">
        <Button variant="emphasized" onClick={() => window.print()}>Print to PDF</Button>
      </div>
      <div className="insights-header">
        <h1>Coverage Gap Analysis</h1>
        <p>Identify observability blind spots and areas where expanded coverage would strengthen your reliability posture.</p>
      </div>

      {/* Summary KPIs */}
      {summaryStats && (
        <div className="exec-kpi-row" style={{ marginBottom: 24 }}>
          <div className="exec-kpi">
            <div className="exec-kpi-value" style={{ color: "#c4190b" }}>{summaryStats.criticalGaps}</div>
            <div className="exec-kpi-label">Critical Gaps</div>
          </div>
          <div className="exec-kpi">
            <div className="exec-kpi-value" style={{ color: "#ef8b0e" }}>{summaryStats.significantGaps}</div>
            <div className="exec-kpi-label">Significant Gaps</div>
          </div>
          <div className="exec-kpi">
            <div className="exec-kpi-value" style={{ color: "#1496ff" }}>{summaryStats.wellCovered}</div>
            <div className="exec-kpi-label">Well Covered</div>
          </div>
          <div className="exec-kpi">
            <div className="exec-kpi-value">{summaryStats.avgCoverage.toFixed(1)}/5</div>
            <div className="exec-kpi-label">Avg Coverage</div>
          </div>
        </div>
      )}

      {/* High-Level Coverage Scores */}
      {(deploymentScore || coverageCategoryScore) && (
        <div className="insight-card">
          <h2>Overall Deployment Posture</h2>
          <p className="insight-desc">High-level view of deployment breadth and capability coverage</p>
          <div className="gap-grid">
            {deploymentScore && (
              <div className="gap-item">
                <div className="gap-category">Deployment Breadth</div>
                <div className="gap-bar-container">
                  <div className="gap-bar-bg">
                    <div
                      className="gap-bar-current"
                      style={{ width: `${(deploymentScore / 5) * 100}%`, background: MaturityLevelColors[scoreToLevel(deploymentScore) as MaturityLevel] }}
                    />
                    <div className="gap-bar-target" style={{ left: "80%" }} />
                  </div>
                </div>
                <div className="gap-values">
                  <span>Current: {deploymentScore.toFixed(1)}</span>
                  <span className={`gap-value ${deploymentScore < 4 ? "has-gap" : "met"}`}>
                    {deploymentScore < 4 ? `Gap to target: ${(4 - deploymentScore).toFixed(1)}` : "✓ On Track"}
                  </span>
                </div>
              </div>
            )}
            {coverageCategoryScore && (
              <div className="gap-item">
                <div className="gap-category">Capability Utilization</div>
                <div className="gap-bar-container">
                  <div className="gap-bar-bg">
                    <div
                      className="gap-bar-current"
                      style={{ width: `${(coverageCategoryScore / 5) * 100}%`, background: MaturityLevelColors[scoreToLevel(coverageCategoryScore) as MaturityLevel] }}
                    />
                    <div className="gap-bar-target" style={{ left: "80%" }} />
                  </div>
                </div>
                <div className="gap-values">
                  <span>Current: {coverageCategoryScore.toFixed(1)}</span>
                  <span className={`gap-value ${coverageCategoryScore < 4 ? "has-gap" : "met"}`}>
                    {coverageCategoryScore < 4 ? `Gap to target: ${(4 - coverageCategoryScore).toFixed(1)}` : "✓ On Track"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Capability Coverage */}
      {hasDetailedCoverage && (
        <div className="insight-card">
          <h2>Capability Coverage Breakdown</h2>
          <p className="insight-desc">Estimated coverage by Dynatrace capability based on {latestPerUser.length} assessor{latestPerUser.length !== 1 ? "s" : ""}</p>
          <div className="coverage-grid">
            {coverageAnalysis.filter((c) => c.respondents > 0).map((item) => (
              <div className="coverage-item" key={item.id}>
                <div className="coverage-header">
                  <span className="coverage-capability">{item.capability}</span>
                  <span className="coverage-priority" style={{ color: item.priority.color, fontWeight: 600, fontSize: 12 }}>
                    {item.priority.label}
                  </span>
                </div>
                <div className="coverage-desc">{item.description}</div>
                <div className="gap-bar-container">
                  <div className="gap-bar-bg">
                    <div
                      className="gap-bar-current"
                      style={{ width: `${(item.avgScore / 5) * 100}%`, background: item.priority.color }}
                    />
                  </div>
                </div>
                <div className="coverage-stats">
                  <span>Coverage: ~{item.coverage}</span>
                  <span>Score: {item.avgScore.toFixed(1)}/5</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expansion Opportunities */}
      {hasDetailedCoverage && (
        <div className="insight-card">
          <h2>Expansion Opportunities</h2>
          <p className="insight-desc">Capabilities where increased coverage would have the most impact on observability completeness</p>
          <div className="opportunity-list">
            {coverageAnalysis
              .filter((c) => c.respondents > 0 && c.avgScore < 4)
              .slice(0, 8)
              .map((item, idx) => (
                <div className="opportunity-item" key={item.id}>
                  <div className="opportunity-rank">{idx + 1}</div>
                  <div className="opportunity-details">
                    <div className="opportunity-name">{item.capability}</div>
                    <div className="opportunity-desc">{item.description}</div>
                    <div className="opportunity-impact">
                      {item.avgScore <= 1.5 && "Currently minimal or no coverage. Enabling this capability would significantly improve visibility."}
                      {item.avgScore > 1.5 && item.avgScore <= 2.5 && "Partial coverage exists. Expanding would close important observability blind spots."}
                      {item.avgScore > 2.5 && item.avgScore <= 3.5 && "Moderate coverage in place. Broader adoption would strengthen the overall posture."}
                      {item.avgScore > 3.5 && item.avgScore <= 4.0 && "Good coverage. Full enablement would complete the picture."}
                    </div>
                  </div>
                  <div className="opportunity-score" style={{ color: item.priority.color }}>
                    {item.avgScore.toFixed(1)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Fallback when no detailed coverage data */}
      {!hasDetailedCoverage && (
        <div className="insight-card">
          <h2>Coverage Data Needed</h2>
          <p className="insight-desc">
            To see detailed capability coverage analysis, ensure assessors complete the "Coverage & Usage" section 
            of the DT Maturity assessment. This section captures per-capability coverage percentages that power this analysis.
          </p>
          <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginTop: 16 }}>
            Take Assessment
          </Button>
        </div>
      )}
    </div>
  );
};
