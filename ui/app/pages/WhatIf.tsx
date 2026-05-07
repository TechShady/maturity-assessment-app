import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelColors,
} from "../types";
import { dynatraceMaturityCategories, scoreToLevel } from "../maturityModel";
import { getDtMaturityHistory, AssessmentRecord } from "../grailService";
import "../styles/whatif.css";

// Coverage capabilities with ROI impact modeling
const coverageCapabilities: {
  id: string;
  capability: string;
  description: string;
  impactArea: string;
  annualValuePerLevel: number; // $ value per level improvement
  riskReduction: string;
}[] = [
  { id: "cov-infra", capability: "Infrastructure Monitoring", description: "Full-stack host monitoring with OneAgent", impactArea: "Availability", annualValuePerLevel: 45000, riskReduction: "Fewer undetected capacity issues" },
  { id: "cov-logs", capability: "Log Management", description: "Log ingestion, analysis, and correlation", impactArea: "MTTR", annualValuePerLevel: 38000, riskReduction: "Faster root cause analysis" },
  { id: "cov-cloud", capability: "Cloud Monitoring", description: "AWS, Azure, and GCP resource monitoring", impactArea: "Cost & Performance", annualValuePerLevel: 52000, riskReduction: "Cloud cost optimization" },
  { id: "cov-tracing", capability: "Distributed Tracing", description: "End-to-end request tracing across services", impactArea: "MTTR", annualValuePerLevel: 42000, riskReduction: "Cross-service debugging" },
  { id: "cov-rum", capability: "Real User Monitoring", description: "Browser and mobile user experience tracking", impactArea: "User Experience", annualValuePerLevel: 55000, riskReduction: "Proactive UX issue detection" },
  { id: "cov-ai", capability: "AI Observability", description: "AI/ML workload monitoring and optimization", impactArea: "AI Governance", annualValuePerLevel: 35000, riskReduction: "Model drift & cost control" },
  { id: "cov-security", capability: "Application Security", description: "Runtime vulnerability and attack detection", impactArea: "Security", annualValuePerLevel: 85000, riskReduction: "Reduced breach risk" },
  { id: "cov-k8s", capability: "Kubernetes Monitoring", description: "Cluster, workload, and pod observability", impactArea: "Availability", annualValuePerLevel: 48000, riskReduction: "Fewer container outages" },
  { id: "cov-db", capability: "Database Monitoring", description: "Query-level database performance monitoring", impactArea: "Performance", annualValuePerLevel: 40000, riskReduction: "Faster query diagnosis" },
  { id: "cov-network", capability: "Network Monitoring", description: "Network flow analysis and topology", impactArea: "Availability", annualValuePerLevel: 32000, riskReduction: "Network issue isolation" },
  { id: "cov-debugger", capability: "Live Debugger", description: "Production debugging without redeployment", impactArea: "Developer Productivity", annualValuePerLevel: 28000, riskReduction: "Reduced MTTR for code issues" },
  { id: "cov-synthetics", capability: "Synthetic Monitoring", description: "Proactive uptime and user journey validation", impactArea: "Availability", annualValuePerLevel: 50000, riskReduction: "Proactive outage detection" },
  { id: "cov-replay", capability: "Session Replay", description: "Visual replay of real user sessions", impactArea: "User Experience", annualValuePerLevel: 22000, riskReduction: "Faster support resolution" },
  { id: "cov-bizevents", capability: "Business Events", description: "Business process and transaction capture", impactArea: "Business Impact", annualValuePerLevel: 60000, riskReduction: "Revenue impact visibility" },
  { id: "cov-bizinsights", capability: "Business Insights", description: "Business KPI analytics and decision support", impactArea: "Business Impact", annualValuePerLevel: 65000, riskReduction: "Data-driven decisions" },
];

function scoreToColor(score: number): string {
  if (score <= 1.5) return MaturityLevelColors[MaturityLevel.Level1];
  if (score <= 2.5) return MaturityLevelColors[MaturityLevel.Level2];
  if (score <= 3.5) return MaturityLevelColors[MaturityLevel.Level3];
  if (score <= 4.5) return MaturityLevelColors[MaturityLevel.Level4];
  return MaturityLevelColors[MaturityLevel.Level5];
}

function scoreToPriority(score: number): { label: string; color: string } {
  if (score <= 1.5) return { label: "Critical Gap", color: "#c4190b" };
  if (score <= 2.5) return { label: "Significant Gap", color: "#ef8b0e" };
  if (score <= 3.5) return { label: "Moderate", color: "#f5d30e" };
  if (score <= 4.0) return { label: "Good", color: "#59c46b" };
  return { label: "Excellent", color: "#1496ff" };
}

const formatCurrency = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export const WhatIf = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectedScores, setProjectedScores] = useState<Record<string, number>>({});
  const [initialized, setInitialized] = useState(false);

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

  // Current coverage scores from assessment answers
  const currentScores = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const cap of coverageCapabilities) {
      const vals: number[] = [];
      for (const record of latestPerUser) {
        if (record.answers && record.answers[cap.id] !== undefined) {
          vals.push(record.answers[cap.id]);
        }
      }
      scores[cap.id] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 1;
    }
    return scores;
  }, [latestPerUser]);

  // Initialize projected scores from current when data loads
  useEffect(() => {
    if (!initialized && !loading && latestPerUser.length > 0) {
      setProjectedScores({ ...currentScores });
      setInitialized(true);
    }
  }, [currentScores, loading, latestPerUser, initialized]);

  const handleSliderChange = useCallback((id: string, value: number) => {
    setProjectedScores((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleResetAll = useCallback(() => {
    setProjectedScores({ ...currentScores });
  }, [currentScores]);

  const handleMaxAll = useCallback(() => {
    const maxed: Record<string, number> = {};
    for (const cap of coverageCapabilities) {
      maxed[cap.id] = 5;
    }
    setProjectedScores(maxed);
  }, []);

  // ROI calculations
  const roiAnalysis = useMemo(() => {
    const capabilities = coverageCapabilities.map((cap) => {
      const current = currentScores[cap.id] || 1;
      const projected = projectedScores[cap.id] || current;
      const levelDelta = projected - current;
      const annualValue = levelDelta * cap.annualValuePerLevel;
      return { ...cap, current, projected, levelDelta, annualValue };
    });

    const totalAnnualROI = capabilities.reduce((sum, c) => sum + c.annualValue, 0);
    const capabilitiesChanged = capabilities.filter((c) => Math.abs(c.levelDelta) > 0.01).length;
    const avgCurrentScore = capabilities.reduce((sum, c) => sum + c.current, 0) / capabilities.length;
    const avgProjectedScore = capabilities.reduce((sum, c) => sum + c.projected, 0) / capabilities.length;

    // Group by impact area
    const byImpactArea: Record<string, { capabilities: typeof capabilities; totalValue: number }> = {};
    for (const cap of capabilities) {
      if (!byImpactArea[cap.impactArea]) {
        byImpactArea[cap.impactArea] = { capabilities: [], totalValue: 0 };
      }
      byImpactArea[cap.impactArea].capabilities.push(cap);
      byImpactArea[cap.impactArea].totalValue += cap.annualValue;
    }

    return { capabilities, totalAnnualROI, capabilitiesChanged, avgCurrentScore, avgProjectedScore, byImpactArea };
  }, [currentScores, projectedScores]);

  if (loading) {
    return (
      <div className="whatif-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="whatif-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Data Yet</h2>
        <p style={{ opacity: 0.6 }}>Complete a DT Maturity assessment to use the What-If scenario planner.</p>
        <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginTop: 16 }}>
          Start Assessment
        </Button>
      </div>
    );
  }

  const currentColor = scoreToColor(roiAnalysis.avgCurrentScore);
  const projectedColor = scoreToColor(roiAnalysis.avgProjectedScore);

  return (
    <div className="whatif-container">
      <div className="print-bar">
        <Button variant="emphasized" onClick={() => window.print()}>Print to PDF</Button>
      </div>

      <div className="whatif-header">
        <h1>What-If Scenario Planner</h1>
        <p>Drag each capability slider to model the ROI impact of expanding or reducing your Dynatrace coverage</p>
      </div>

      {/* ROI Summary - sticky at top */}
      <div className="whatif-roi-summary">
        <div className="roi-summary-main">
          <div className="roi-summary-label">Estimated Annual ROI</div>
          <div className={`roi-summary-value ${roiAnalysis.totalAnnualROI > 0 ? "has-value" : ""} ${roiAnalysis.totalAnnualROI < 0 ? "negative-value" : ""}`}>
            {roiAnalysis.totalAnnualROI < 0 ? "-" : ""}{formatCurrency(Math.abs(roiAnalysis.totalAnnualROI))}
          </div>
        </div>
        <div className="roi-summary-stats">
          <div className="roi-summary-stat">
            <span className="roi-stat-value" style={{ color: currentColor }}>{roiAnalysis.avgCurrentScore.toFixed(1)}</span>
            <span className="roi-stat-label">Current Avg</span>
          </div>
          <div className="roi-summary-arrow">→</div>
          <div className="roi-summary-stat">
            <span className="roi-stat-value" style={{ color: projectedColor }}>{roiAnalysis.avgProjectedScore.toFixed(1)}</span>
            <span className="roi-stat-label">Projected Avg</span>
          </div>
          <div className="roi-summary-divider" />
          <div className="roi-summary-stat">
            <span className="roi-stat-value">{roiAnalysis.capabilitiesChanged}</span>
            <span className="roi-stat-label">Changed</span>
          </div>
        </div>
        <div className="roi-summary-actions">
          <button className="roi-action-btn" onClick={handleResetAll}>Reset All</button>
          <button className="roi-action-btn" onClick={handleMaxAll}>Max All</button>
        </div>
      </div>

      {/* Capability Sliders */}
      <div className="whatif-card">
        <h2>Capability Coverage</h2>
        <p className="whatif-desc">Drag each slider to model your target coverage level. Colors shift as maturity increases.</p>
        <div className="whatif-capabilities">
          {roiAnalysis.capabilities.map((cap) => {
            const currentRounded = Math.round(cap.current);
            const projectedVal = projectedScores[cap.id] || currentRounded;
            const barColor = scoreToColor(projectedVal);
            const priority = scoreToPriority(cap.current);
            const delta = projectedVal - cap.current;
            const hasChange = Math.abs(delta) > 0.01;
            const isNegative = delta < -0.01;
            return (
              <div className={`whatif-capability ${hasChange ? "changed" : ""} ${isNegative ? "negative" : ""}`} key={cap.id}>
                <div className="capability-top">
                  <div className="capability-info">
                    <span className="capability-name">{cap.capability}</span>
                    <span className="capability-impact">{cap.impactArea}</span>
                  </div>
                  <div className="capability-values">
                    <span className="capability-current" style={{ color: scoreToColor(cap.current) }}>
                      {cap.current.toFixed(1)}
                    </span>
                    {hasChange && (
                      <>
                        <span className="capability-arrow">→</span>
                        <span className="capability-projected" style={{ color: barColor }}>
                          {projectedVal}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="capability-desc">{cap.description}</div>
                <div className="capability-slider-row">
                  <div className="slider-track-wrapper">
                    <div
                      className="slider-fill"
                      style={{
                        width: `${((projectedVal - 1) / 4) * 100}%`,
                        background: `linear-gradient(90deg, ${scoreToColor(1)}, ${barColor})`,
                      }}
                    />
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={projectedVal}
                      onChange={(e) => handleSliderChange(cap.id, +e.target.value)}
                      className="capability-slider"
                      style={{
                        // CSS custom property for thumb color
                        ["--thumb-color" as any]: barColor,
                      }}
                    />
                  </div>
                  <div className="slider-labels">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`slider-label ${n === projectedVal ? "active" : ""}`}
                        style={n === projectedVal ? { color: barColor } : undefined}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
                {hasChange && (
                  <div className="capability-roi">
                    <span className="capability-roi-label">{cap.riskReduction}</span>
                    <span className="capability-roi-value" style={{ color: isNegative ? "#c4190b" : "#59c46b" }}>
                      {isNegative ? "-" : "+"}{formatCurrency(Math.abs(cap.annualValue))}/yr
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ROI by Impact Area */}
      {roiAnalysis.totalAnnualROI !== 0 && (
        <div className="whatif-card">
          <h2>ROI by Impact Area</h2>
          <p className="whatif-desc">Projected value grouped by business impact category</p>
          <div className="impact-area-grid">
            {Object.entries(roiAnalysis.byImpactArea)
              .filter(([, data]) => Math.abs(data.totalValue) > 0)
              .sort((a, b) => Math.abs(b[1].totalValue) - Math.abs(a[1].totalValue))
              .map(([area, data]) => {
                const maxValue = Math.max(...Object.values(roiAnalysis.byImpactArea).map((d) => d.totalValue));
                const pct = maxValue > 0 ? (data.totalValue / maxValue) * 100 : 0;
                return (
                  <div className="impact-area-item" key={area}>
                    <div className="impact-area-header">
                      <span className="impact-area-name">{area}</span>
                      <span className="impact-area-value" style={data.totalValue < 0 ? { color: "#c4190b" } : undefined}>
                        {data.totalValue < 0 ? "-" : ""}{formatCurrency(Math.abs(data.totalValue))}
                      </span>
                    </div>
                    <div className="impact-area-bar-bg">
                      <div className="impact-area-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="impact-area-caps">
                      {data.capabilities
                        .filter((c) => Math.abs(c.levelDelta) > 0.01)
                        .map((c) => (
                          <span className={`impact-area-cap ${c.levelDelta < 0 ? "negative" : ""}`} key={c.id}>
                            {c.capability} ({c.levelDelta > 0 ? "+" : ""}{c.levelDelta.toFixed(0)})
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Investment Summary */}
      {roiAnalysis.totalAnnualROI !== 0 && (
        <div className="whatif-card whatif-summary-card">
          <h2>Scenario Summary</h2>
          <div className="scenario-summary">
            <p>
              By adjusting <strong>{roiAnalysis.capabilitiesChanged}</strong> capabilit{roiAnalysis.capabilitiesChanged !== 1 ? "ies" : "y"} from
              an average of <strong style={{ color: currentColor }}>{roiAnalysis.avgCurrentScore.toFixed(1)}</strong> to <strong style={{ color: projectedColor }}>{roiAnalysis.avgProjectedScore.toFixed(1)}</strong>,
              the estimated annual business {roiAnalysis.totalAnnualROI < 0 ? "impact is" : "value is"} <strong style={{ color: roiAnalysis.totalAnnualROI < 0 ? "#c4190b" : "#59c46b" }}>{roiAnalysis.totalAnnualROI < 0 ? "-" : ""}{formatCurrency(Math.abs(roiAnalysis.totalAnnualROI))}</strong>.
            </p>
            <p>
              Top {roiAnalysis.totalAnnualROI < 0 ? "risk areas" : "value drivers"}:{" "}
              {roiAnalysis.capabilities
                .filter((c) => Math.abs(c.annualValue) > 0)
                .sort((a, b) => Math.abs(b.annualValue) - Math.abs(a.annualValue))
                .slice(0, 3)
                .map((c) => `${c.capability} (${c.annualValue < 0 ? "-" : ""}${formatCurrency(Math.abs(c.annualValue))})`)
                .join(", ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
