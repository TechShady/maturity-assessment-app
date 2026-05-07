import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelColors,
} from "../types";
import { dynatraceMaturityCategories, scoreToLevel } from "../maturityModel";
import { getDtMaturityHistory, AssessmentRecord } from "../grailService";
import "../styles/roi.css";

// Industry benchmarks for ROI modeling
const roiBenchmarks = {
  observability: {
    name: "Observability & Monitoring",
    metrics: [
      { label: "Mean Time to Detect (MTTD)", unit: "min", l1: 120, l5: 5, icon: "⏱" },
      { label: "Alert Noise Reduction", unit: "%", l1: 0, l5: 85, icon: "🔕" },
      { label: "Dashboard Coverage", unit: "%", l1: 20, l5: 95, icon: "📊" },
    ],
  },
  incident: {
    name: "Incident Management",
    metrics: [
      { label: "Mean Time to Resolve (MTTR)", unit: "min", l1: 240, l5: 15, icon: "🔧" },
      { label: "Incidents per Month", unit: "count", l1: 50, l5: 8, icon: "🚨" },
      { label: "Post-Incident Learning Rate", unit: "%", l1: 10, l5: 95, icon: "📝" },
    ],
  },
  slo: {
    name: "SLO & Error Budgets",
    metrics: [
      { label: "Service Availability", unit: "%", l1: 99.0, l5: 99.99, icon: "🎯" },
      { label: "Error Budget Utilization", unit: "%", l1: 0, l5: 90, icon: "📈" },
      { label: "Release Confidence", unit: "%", l1: 30, l5: 95, icon: "🚀" },
    ],
  },
  automation: {
    name: "Automation & Toil Reduction",
    metrics: [
      { label: "Toil Hours / Month", unit: "hrs", l1: 200, l5: 20, icon: "⚙️" },
      { label: "Automated Remediation Rate", unit: "%", l1: 0, l5: 80, icon: "🤖" },
      { label: "Manual Ops Effort", unit: "hrs/wk", l1: 40, l5: 5, icon: "👷" },
    ],
  },
  culture: {
    name: "Reliability Culture",
    metrics: [
      { label: "Chaos Experiment Coverage", unit: "%", l1: 0, l5: 75, icon: "🔬" },
      { label: "Reliability Review Cadence", unit: "wks", l1: 0, l5: 2, icon: "🔄" },
      { label: "Developer SRE Participation", unit: "%", l1: 5, l5: 80, icon: "🤝" },
    ],
  },
  deployment: {
    name: "Deployment Coverage",
    metrics: [
      { label: "Deployment Breadth", unit: "%", l1: 20, l5: 95, icon: "📡" },
      { label: "Onboarding Time", unit: "days", l1: 30, l5: 2, icon: "⏳" },
      { label: "Coverage Completeness", unit: "%", l1: 25, l5: 98, icon: "✅" },
    ],
  },
};

// Cost assumptions
const costDefaults = {
  avgIncidentCost: 5000,       // $ per incident
  engineerHourlyCost: 85,      // $ per hour
  downtimeCostPerMin: 500,     // $ per minute of downtime
  monthlyIncidents: 25,
  engineerCount: 10,
};

function interpolateMetric(l1Value: number, l5Value: number, score: number): number {
  const t = (score - 1) / 4;
  return l1Value + (l5Value - l1Value) * t;
}

export const ROICalculator = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable cost assumptions
  const [costs, setCosts] = useState(() => {
    const stored = sessionStorage.getItem("roi-cost-assumptions");
    return stored ? JSON.parse(stored) : costDefaults;
  });

  useEffect(() => {
    sessionStorage.setItem("roi-cost-assumptions", JSON.stringify(costs));
  }, [costs]);

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

  const orgScores = useMemo(() => {
    if (latestPerUser.length === 0) return null;
    const catAvgs: Record<string, number> = {};
    for (const cat of dynatraceMaturityCategories) {
      const scores = latestPerUser.map((r) => r.categoryScores[cat.id] || 0).filter((s) => s > 0);
      catAvgs[cat.id] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }
    const overall = Object.values(catAvgs).filter((v) => v > 0);
    const avg = overall.length > 0 ? overall.reduce((a, b) => a + b, 0) / overall.length : 0;
    return { categoryScores: catAvgs, overall: avg };
  }, [latestPerUser]);

  // Calculate ROI for moving from current level to target
  const roiAnalysis = useMemo(() => {
    if (!orgScores) return null;

    const currentMTTR = interpolateMetric(240, 15, orgScores.categoryScores["incident"] || 1);
    const targetMTTR = interpolateMetric(240, 15, Math.min((orgScores.categoryScores["incident"] || 1) + 1, 5));

    const currentIncidents = interpolateMetric(50, 8, orgScores.categoryScores["observability"] || 1);
    const targetIncidents = interpolateMetric(50, 8, Math.min((orgScores.categoryScores["observability"] || 1) + 1, 5));

    const currentToilHrs = interpolateMetric(200, 20, orgScores.categoryScores["automation"] || 1);
    const targetToilHrs = interpolateMetric(200, 20, Math.min((orgScores.categoryScores["automation"] || 1) + 1, 5));

    const mttrSavingsMin = currentMTTR - targetMTTR;
    const incidentReduction = currentIncidents - targetIncidents;
    const toilReduction = currentToilHrs - targetToilHrs;

    // Annual savings
    const downtimeSavings = mttrSavingsMin * costs.monthlyIncidents * costs.downtimeCostPerMin * 12;
    const incidentCostSavings = incidentReduction * costs.avgIncidentCost * 12;
    const toilSavings = toilReduction * costs.engineerHourlyCost * 12;
    const totalAnnualSavings = downtimeSavings + incidentCostSavings + toilSavings;

    return {
      current: {
        mttr: currentMTTR,
        incidents: currentIncidents,
        toilHrs: currentToilHrs,
      },
      target: {
        mttr: targetMTTR,
        incidents: targetIncidents,
        toilHrs: targetToilHrs,
      },
      savings: {
        downtime: downtimeSavings,
        incidents: incidentCostSavings,
        toil: toilSavings,
        total: totalAnnualSavings,
      },
      mttrSavingsMin,
      incidentReduction,
      toilReduction,
    };
  }, [orgScores, costs]);

  // Per-category metric projections
  const categoryProjections = useMemo(() => {
    if (!orgScores) return [];
    return Object.entries(roiBenchmarks).map(([catId, bench]) => {
      const currentScore = orgScores.categoryScores[catId] || 1;
      const targetScore = Math.min(currentScore + 1, 5);
      const projections = bench.metrics.map((m) => ({
        ...m,
        current: interpolateMetric(m.l1, m.l5, currentScore),
        projected: interpolateMetric(m.l1, m.l5, targetScore),
      }));
      return { catId, name: bench.name, currentScore, targetScore, projections };
    });
  }, [orgScores]);

  if (loading) {
    return (
      <div className="roi-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="roi-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Data Yet</h2>
        <p style={{ opacity: 0.6 }}>Complete a DT Maturity assessment to see ROI projections.</p>
        <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginTop: 16 }}>
          Start Assessment
        </Button>
      </div>
    );
  }

  const formatCurrency = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <div className="roi-container">
      <div className="print-bar">
        <Button variant="emphasized" onClick={() => window.print()}>Print to PDF</Button>
      </div>

      <div className="roi-header">
        <h1>ROI & Business Value</h1>
        <p>Estimated business impact of advancing your SRE maturity by one level</p>
      </div>

      {/* Cost Assumptions */}
      <div className="roi-card roi-assumptions">
        <h2>Cost Assumptions</h2>
        <p className="roi-desc">Adjust these values to match your organization's cost structure</p>
        <div className="assumptions-grid">
          <div className="assumption-item">
            <label>Avg Incident Cost</label>
            <div className="assumption-input">
              <span>$</span>
              <input
                type="number"
                value={costs.avgIncidentCost}
                onChange={(e) => setCosts(prev => ({ ...prev, avgIncidentCost: +e.target.value }))}
              />
            </div>
          </div>
          <div className="assumption-item">
            <label>Engineer Hourly Cost</label>
            <div className="assumption-input">
              <span>$</span>
              <input
                type="number"
                value={costs.engineerHourlyCost}
                onChange={(e) => setCosts(prev => ({ ...prev, engineerHourlyCost: +e.target.value }))}
              />
            </div>
          </div>
          <div className="assumption-item">
            <label>Downtime Cost / Min</label>
            <div className="assumption-input">
              <span>$</span>
              <input
                type="number"
                value={costs.downtimeCostPerMin}
                onChange={(e) => setCosts(prev => ({ ...prev, downtimeCostPerMin: +e.target.value }))}
              />
            </div>
          </div>
          <div className="assumption-item">
            <label>Monthly Incidents</label>
            <div className="assumption-input">
              <input
                type="number"
                value={costs.monthlyIncidents}
                onChange={(e) => setCosts(prev => ({ ...prev, monthlyIncidents: +e.target.value }))}
              />
            </div>
          </div>
          <div className="assumption-item">
            <label>Engineering Headcount</label>
            <div className="assumption-input">
              <input
                type="number"
                value={costs.engineerCount}
                onChange={(e) => setCosts(prev => ({ ...prev, engineerCount: +e.target.value }))}
              />
            </div>
          </div>
          <div className="assumption-item">
            <Button variant="emphasized" onClick={() => setCosts(costDefaults)} style={{ fontSize: 12 }}>
              Reset to Defaults
            </Button>
          </div>
        </div>
      </div>

      {/* Annual Savings Summary */}
      {roiAnalysis && (
        <>
          <div className="roi-card roi-savings-hero">
            <h2>Estimated Annual Savings</h2>
            <div className="savings-total">{formatCurrency(roiAnalysis.savings.total)}</div>
            <p className="roi-desc">By advancing one maturity level across key practice areas</p>
          </div>

          <div className="roi-kpi-row">
            <div className="roi-kpi">
              <div className="roi-kpi-icon">⏱</div>
              <div className="roi-kpi-value">{formatCurrency(roiAnalysis.savings.downtime)}</div>
              <div className="roi-kpi-label">Downtime Reduction</div>
              <div className="roi-kpi-detail">
                MTTR: {roiAnalysis.current.mttr.toFixed(0)}min → {roiAnalysis.target.mttr.toFixed(0)}min
              </div>
            </div>
            <div className="roi-kpi">
              <div className="roi-kpi-icon">🚨</div>
              <div className="roi-kpi-value">{formatCurrency(roiAnalysis.savings.incidents)}</div>
              <div className="roi-kpi-label">Fewer Incidents</div>
              <div className="roi-kpi-detail">
                {roiAnalysis.current.incidents.toFixed(0)}/mo → {roiAnalysis.target.incidents.toFixed(0)}/mo
              </div>
            </div>
            <div className="roi-kpi">
              <div className="roi-kpi-icon">⚙️</div>
              <div className="roi-kpi-value">{formatCurrency(roiAnalysis.savings.toil)}</div>
              <div className="roi-kpi-label">Toil Reduction</div>
              <div className="roi-kpi-detail">
                {roiAnalysis.current.toilHrs.toFixed(0)}hrs → {roiAnalysis.target.toilHrs.toFixed(0)}hrs/mo
              </div>
            </div>
          </div>
        </>
      )}

      {/* Category Metric Projections */}
      <div className="roi-card">
        <h2>Metric Projections by Practice Area</h2>
        <p className="roi-desc">Estimated operational improvements when advancing one level per category</p>
        <div className="projections-grid">
          {categoryProjections.map((cp) => {
            const currentColor = MaturityLevelColors[scoreToLevel(cp.currentScore) as MaturityLevel];
            const targetColor = MaturityLevelColors[scoreToLevel(cp.targetScore) as MaturityLevel];
            return (
              <div className="projection-card" key={cp.catId}>
                <div className="projection-header">
                  <span className="projection-name">{cp.name}</span>
                  <span className="projection-levels">
                    <span style={{ color: currentColor }}>L{scoreToLevel(cp.currentScore)}</span>
                    <span className="projection-arrow"> → </span>
                    <span style={{ color: targetColor }}>L{scoreToLevel(cp.targetScore)}</span>
                  </span>
                </div>
                <div className="projection-metrics">
                  {cp.projections.map((m) => {
                    const improved = Math.abs(m.projected - m.current) > 0.01;
                    const isReduction = m.projected < m.current;
                    return (
                      <div className="projection-metric" key={m.label}>
                        <span className="pm-icon">{m.icon}</span>
                        <span className="pm-label">{m.label}</span>
                        <span className="pm-values">
                          <span className="pm-current">{m.current.toFixed(m.unit === "%" ? 1 : 0)}</span>
                          {improved && (
                            <>
                              <span className="pm-arrow">→</span>
                              <span className={`pm-projected ${isReduction ? "decrease" : "increase"}`}>
                                {m.projected.toFixed(m.unit === "%" ? 1 : 0)}
                              </span>
                            </>
                          )}
                          <span className="pm-unit">{m.unit}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Value Story */}
      {roiAnalysis && orgScores && (
        <div className="roi-card roi-story">
          <h2>Value Story</h2>
          <p className="roi-desc">Use this narrative in customer conversations</p>
          <div className="story-block">
            <p>
              Your organization is currently operating at <strong>Level {scoreToLevel(orgScores.overall)}: {MaturityLevelLabels[scoreToLevel(orgScores.overall) as MaturityLevel]}</strong> with
              an overall maturity score of <strong>{orgScores.overall.toFixed(1)}/5.0</strong> based
              on {latestPerUser.length} assessor{latestPerUser.length !== 1 ? "s" : ""}.
            </p>
            <p>
              By advancing one maturity level, you could reduce mean time to resolve
              from <strong>{roiAnalysis.current.mttr.toFixed(0)} minutes</strong> to <strong>{roiAnalysis.target.mttr.toFixed(0)} minutes</strong>,
              prevent approximately <strong>{roiAnalysis.incidentReduction.toFixed(0)} incidents per month</strong>,
              and reclaim <strong>{roiAnalysis.toilReduction.toFixed(0)} hours of engineering toil monthly</strong>.
            </p>
            <p>
              This translates to an estimated <strong>{formatCurrency(roiAnalysis.savings.total)} in annual savings</strong> through
              reduced downtime ({formatCurrency(roiAnalysis.savings.downtime)}),
              fewer incidents ({formatCurrency(roiAnalysis.savings.incidents)}),
              and toil elimination ({formatCurrency(roiAnalysis.savings.toil)}).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
