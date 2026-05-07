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

// Coverage question IDs and their risk context
const coverageRiskMap: { id: string; capability: string; riskWhenMissing: string; impactArea: string }[] = [
  { id: "cov-infra", capability: "Infrastructure Monitoring", riskWhenMissing: "Blind spots in host health — capacity issues, resource exhaustion, and hardware failures go undetected until user impact occurs.", impactArea: "Availability" },
  { id: "cov-logs", capability: "Log Management", riskWhenMissing: "Inability to correlate application behavior with root cause — troubleshooting relies on manual log file searches across servers.", impactArea: "Mean Time to Resolve" },
  { id: "cov-cloud", capability: "Cloud Monitoring", riskWhenMissing: "Cloud cost overruns, undetected service degradation, and missed scaling events in cloud-native infrastructure.", impactArea: "Cost & Performance" },
  { id: "cov-tracing", capability: "Distributed Tracing", riskWhenMissing: "Complex cross-service failures are difficult to diagnose — latency bottlenecks and error propagation paths remain hidden.", impactArea: "Mean Time to Resolve" },
  { id: "cov-rum", capability: "Real User Monitoring", riskWhenMissing: "No visibility into actual user experience — performance issues and conversion impacts are discovered through complaints, not data.", impactArea: "User Experience" },
  { id: "cov-ai", capability: "AI Observability", riskWhenMissing: "AI/ML workloads operate without quality monitoring — model drift, hallucinations, and cost overruns go undetected.", impactArea: "AI Governance" },
  { id: "cov-security", capability: "Application Security", riskWhenMissing: "Runtime vulnerabilities and active attacks may go undetected — reactive security posture increases breach risk.", impactArea: "Security" },
  { id: "cov-k8s", capability: "Kubernetes Monitoring", riskWhenMissing: "Container orchestration issues (pod crashes, resource starvation, misconfigurations) are discovered late in the impact chain.", impactArea: "Availability" },
  { id: "cov-db", capability: "Database Monitoring", riskWhenMissing: "Slow queries, connection pool exhaustion, and database health issues surface as application errors rather than root causes.", impactArea: "Performance" },
  { id: "cov-network", capability: "Network Monitoring", riskWhenMissing: "Network partitions, latency spikes, and connectivity issues are blamed on applications rather than infrastructure.", impactArea: "Availability" },
  { id: "cov-debugger", capability: "Live Debugger", riskWhenMissing: "Production debugging requires code redeployment — increased MTTR and risk of introducing new issues during investigation.", impactArea: "Developer Productivity" },
  { id: "cov-synthetics", capability: "Synthetic Monitoring", riskWhenMissing: "No proactive detection of availability issues — problems are user-reported rather than caught before impact.", impactArea: "Availability" },
  { id: "cov-replay", capability: "Session Replay", riskWhenMissing: "User-reported issues cannot be visually reproduced — support teams lack context for accurate diagnosis.", impactArea: "User Experience" },
  { id: "cov-bizevents", capability: "Business Events", riskWhenMissing: "No correlation between technical performance and business outcomes — revenue impact is unknown during incidents.", impactArea: "Business Impact" },
  { id: "cov-bizinsights", capability: "Business Insights", riskWhenMissing: "Business stakeholders lack data-driven visibility — decisions are made without understanding operational impact.", impactArea: "Business Impact" },
];

// Risk severity classification
function scoreToRiskSeverity(score: number): { level: string; color: string; weight: number } {
  if (score <= 1.5) return { level: "Critical", color: "#c4190b", weight: 4 };
  if (score <= 2.5) return { level: "High", color: "#ef8b0e", weight: 3 };
  if (score <= 3.5) return { level: "Medium", color: "#f5d30e", weight: 2 };
  if (score <= 4.0) return { level: "Low", color: "#59c46b", weight: 1 };
  return { level: "Minimal", color: "#1496ff", weight: 0 };
}

export const RiskAssessment = () => {
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

  // Risk analysis from coverage answers
  const riskAnalysis = useMemo(() => {
    if (latestPerUser.length === 0) return [];

    return coverageRiskMap.map((crm) => {
      const scores: number[] = [];
      for (const record of latestPerUser) {
        if (record.answers && record.answers[crm.id] !== undefined) {
          scores.push(record.answers[crm.id]);
        }
      }
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const severity = scoreToRiskSeverity(avgScore);
      return {
        ...crm,
        avgScore,
        respondents: scores.length,
        severity,
      };
    }).sort((a, b) => b.severity.weight - a.severity.weight || a.avgScore - b.avgScore);
  }, [latestPerUser]);

  // Maturity-based risks (low-scoring maturity categories)
  const maturityRisks = useMemo(() => {
    if (latestPerUser.length === 0) return [];
    return dynatraceMaturityCategories
      .filter((cat) => cat.id !== "coverage") // exclude coverage category itself
      .map((cat) => {
        const scores = latestPerUser.map((r) => r.categoryScores[cat.id] || 0).filter((s) => s > 0);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const severity = scoreToRiskSeverity(avgScore);
        return { name: cat.name, description: cat.description, avgScore, severity };
      })
      .filter((r) => r.avgScore > 0 && r.avgScore < 4)
      .sort((a, b) => a.avgScore - b.avgScore);
  }, [latestPerUser]);

  // Risk by impact area
  const riskByImpactArea = useMemo(() => {
    const areas: Record<string, { risks: typeof riskAnalysis; avgScore: number }> = {};
    for (const risk of riskAnalysis.filter((r) => r.respondents > 0)) {
      if (!areas[risk.impactArea]) areas[risk.impactArea] = { risks: [], avgScore: 0 };
      areas[risk.impactArea].risks.push(risk);
    }
    for (const area of Object.values(areas)) {
      area.avgScore = area.risks.reduce((sum, r) => sum + r.avgScore, 0) / area.risks.length;
    }
    return Object.entries(areas)
      .map(([area, data]) => ({ area, ...data }))
      .sort((a, b) => a.avgScore - b.avgScore);
  }, [riskAnalysis]);

  // Overall risk score
  const overallRiskScore = useMemo(() => {
    const withData = riskAnalysis.filter((r) => r.respondents > 0);
    if (withData.length === 0) return null;
    const avg = withData.reduce((sum, r) => sum + r.avgScore, 0) / withData.length;
    // Invert: lower coverage = higher risk
    const riskScore = 5 - avg;
    return { score: riskScore, coverageAvg: avg };
  }, [riskAnalysis]);

  if (loading) {
    return (
      <div className="insights-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading Risk Assessment...</h2>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="insights-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Data Yet</h2>
        <p style={{ opacity: 0.6 }}>Complete DT Maturity assessments to see the risk assessment.</p>
        <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginTop: 16 }}>
          Start Assessment
        </Button>
      </div>
    );
  }

  const hasDetailedData = riskAnalysis.some((r) => r.respondents > 0);

  return (
    <div className="insights-container">
      <div className="print-bar">
        <Button variant="emphasized" onClick={() => window.print()}>Print to PDF</Button>
      </div>
      <div className="insights-header">
        <h1>Risk Assessment</h1>
        <p>Evaluate organizational risk exposure based on observability coverage gaps and maturity levels.</p>
      </div>

      {/* Overall Risk Gauge */}
      {overallRiskScore && (
        <div className="insight-card" style={{ textAlign: "center" }}>
          <h2>Overall Risk Exposure</h2>
          <p className="insight-desc">Based on coverage gaps across all monitored capabilities</p>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 40, marginTop: 16 }}>
            <div>
              <div style={{
                fontSize: 48,
                fontWeight: 700,
                color: overallRiskScore.score > 3 ? "#c4190b" : overallRiskScore.score > 2 ? "#ef8b0e" : overallRiskScore.score > 1 ? "#f5d30e" : "#59c46b"
              }}>
                {overallRiskScore.score.toFixed(1)}
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Risk Score (out of 5)</div>
            </div>
            <div style={{ textAlign: "left", fontSize: 13, opacity: 0.8 }}>
              <div>Higher score = greater risk exposure</div>
              <div style={{ marginTop: 4 }}>Avg coverage level: {overallRiskScore.coverageAvg.toFixed(1)}/5</div>
              <div style={{ marginTop: 4 }}>
                {overallRiskScore.score > 3 && "Significant gaps require attention to reduce exposure."}
                {overallRiskScore.score > 2 && overallRiskScore.score <= 3 && "Moderate gaps exist that should be addressed."}
                {overallRiskScore.score > 1 && overallRiskScore.score <= 2 && "Coverage is generally good with minor gaps remaining."}
                {overallRiskScore.score <= 1 && "Excellent coverage — minimal risk exposure from gaps."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk by Impact Area */}
      {riskByImpactArea.length > 0 && (
        <div className="insight-card">
          <h2>Risk by Impact Area</h2>
          <p className="insight-desc">Coverage gaps grouped by the area they most impact</p>
          <div className="risk-area-grid">
            {riskByImpactArea.map((area) => {
              const severity = scoreToRiskSeverity(area.avgScore);
              return (
                <div className="risk-area-card" key={area.area}>
                  <div className="risk-area-header">
                    <span className="risk-area-name">{area.area}</span>
                    <span className="risk-area-severity" style={{ color: severity.color }}>{severity.level}</span>
                  </div>
                  <div className="risk-area-capabilities">
                    {area.risks.map((r) => (
                      <div className="risk-capability-item" key={r.id}>
                        <span className="risk-cap-dot" style={{ background: r.severity.color }} />
                        <span>{r.capability}</span>
                        <span className="risk-cap-score">{r.avgScore.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Risk Register */}
      {hasDetailedData && (
        <div className="insight-card">
          <h2>Risk Register</h2>
          <p className="insight-desc">Specific risks from coverage gaps, ordered by severity</p>
          <div className="risk-register">
            {riskAnalysis
              .filter((r) => r.respondents > 0 && r.severity.weight > 0)
              .map((risk) => (
                <div className="risk-register-item" key={risk.id}>
                  <div className="risk-severity-badge" style={{ background: risk.severity.color }}>
                    {risk.severity.level}
                  </div>
                  <div className="risk-register-details">
                    <div className="risk-register-name">{risk.capability}</div>
                    <div className="risk-register-impact">{risk.riskWhenMissing}</div>
                    <div className="risk-register-meta">
                      <span>Impact Area: {risk.impactArea}</span>
                      <span>Coverage: {risk.avgScore.toFixed(1)}/5</span>
                    </div>
                  </div>
                </div>
              ))}
            {riskAnalysis.filter((r) => r.respondents > 0 && r.severity.weight > 0).length === 0 && (
              <p style={{ opacity: 0.6, textAlign: "center", padding: 16 }}>
                All capabilities are at acceptable coverage levels. Continue monitoring for changes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Maturity-Based Risks */}
      {maturityRisks.length > 0 && (
        <div className="insight-card">
          <h2>Practice Maturity Risks</h2>
          <p className="insight-desc">Operational practice areas where lower maturity increases organizational risk</p>
          <div className="maturity-risk-list">
            {maturityRisks.map((risk) => (
              <div className="maturity-risk-item" key={risk.name}>
                <div className="maturity-risk-header">
                  <span className="maturity-risk-name">{risk.name}</span>
                  <span className="maturity-risk-severity" style={{ color: risk.severity.color }}>
                    {risk.severity.level} Risk
                  </span>
                </div>
                <div className="maturity-risk-desc">{risk.description}</div>
                <div className="gap-bar-container">
                  <div className="gap-bar-bg">
                    <div
                      className="gap-bar-current"
                      style={{ width: `${(risk.avgScore / 5) * 100}%`, background: risk.severity.color }}
                    />
                    <div className="gap-bar-target" style={{ left: "80%" }} />
                  </div>
                </div>
                <div className="gap-values">
                  <span>Current: {risk.avgScore.toFixed(1)}</span>
                  <span className="gap-value has-gap">Gap to target: {(4 - risk.avgScore).toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No detailed data fallback */}
      {!hasDetailedData && maturityRisks.length === 0 && (
        <div className="insight-card">
          <h2>Assessment Data Needed</h2>
          <p className="insight-desc">
            Complete the "Coverage & Usage" section of the DT Maturity assessment to generate a detailed 
            risk analysis based on observability coverage gaps.
          </p>
          <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginTop: 16 }}>
            Take Assessment
          </Button>
        </div>
      )}
    </div>
  );
};
