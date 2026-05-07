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
import "../styles/roadmap.css";

// Capability enablement mapping
const capabilityRoadmap: Record<string, { quickWins: string[]; strategic: string[]; transformational: string[] }> = {
  observability: {
    quickWins: [
      "Deploy OneAgent to all production hosts for full-stack visibility",
      "Create a unified operations dashboard with key health indicators",
      "Enable Davis AI anomaly detection on critical services",
    ],
    strategic: [
      "Implement topology-aware alerting to eliminate noise and false positives",
      "Build service-level dashboards for all tier-1 applications",
      "Establish golden signal monitoring (latency, traffic, errors, saturation)",
    ],
    transformational: [
      "Implement AIOps-driven root cause analysis across the full stack",
      "Build self-service observability portals for development teams",
      "Achieve single-pane-of-glass visibility across all environments",
    ],
  },
  incident: {
    quickWins: [
      "Connect Dynatrace problem notifications to your ITSM/pager system",
      "Create incident runbooks linked to Dynatrace problem patterns",
      "Establish a blameless post-incident review process",
    ],
    strategic: [
      "Implement automated incident classification and routing via Davis",
      "Build correlation rules to reduce incident volume by 50%+",
      "Track MTTR/MTTD metrics and establish improvement targets",
    ],
    transformational: [
      "Deploy auto-remediation workflows for known failure patterns",
      "Implement predictive incident detection using Davis AI",
      "Achieve <15min MTTR for P1 incidents through closed-loop automation",
    ],
  },
  slo: {
    quickWins: [
      "Define SLOs for your top 5 revenue-critical services",
      "Create SLO dashboards visible to engineering and product teams",
      "Set up error budget burn-rate alerts for early warning",
    ],
    strategic: [
      "Implement error budget policies that gate deployments",
      "Extend SLO coverage to all tier-1 and tier-2 services",
      "Integrate SLO status into release approval workflows",
    ],
    transformational: [
      "Use Site Reliability Guardian for automated release validation",
      "Implement SLO-based capacity planning and scaling decisions",
      "Achieve full SLO lifecycle management with automated reporting",
    ],
  },
  automation: {
    quickWins: [
      "Automate top 3 most frequent manual operational tasks with Workflows",
      "Set up auto-remediation for disk space and memory threshold events",
      "Create automated deployment validation checks",
    ],
    strategic: [
      "Build self-service operational workflows for development teams",
      "Implement automated scaling policies based on predictive metrics",
      "Track and measure toil hours to prioritize automation investments",
    ],
    transformational: [
      "Deploy closed-loop automation: detect → diagnose → remediate → validate",
      "Implement ChatOps/AI-assisted operations with Dynatrace CoPilot",
      "Achieve <10% operational toil through comprehensive automation",
    ],
  },
  culture: {
    quickWins: [
      "Establish reliability champions in each development team",
      "Run a tabletop exercise simulating a production incident",
      "Include reliability review in sprint retrospectives",
    ],
    strategic: [
      "Launch a chaos engineering program starting with controlled experiments",
      "Embed reliability criteria in the SDLC definition of done",
      "Conduct quarterly game day exercises across teams",
    ],
    transformational: [
      "Make reliability a first-class engineering discipline with dedicated SRE roles",
      "Continuous chaos experimentation in production environments",
      "Reliability metrics as core KPIs in engineering OKRs",
    ],
  },
  deployment: {
    quickWins: [
      "Inventory all applications and map current monitoring coverage gaps",
      "Deploy OneAgent to all non-production environments for shift-left visibility",
      "Enable automatic injection for containerized workloads",
    ],
    strategic: [
      "Implement standardized onboarding playbooks reducing agent deployment to <1 day",
      "Extend monitoring to all cloud-native and serverless workloads",
      "Establish coverage KPIs and track progress quarterly",
    ],
    transformational: [
      "Achieve 95%+ deployment coverage across all environments",
      "Implement GitOps-driven monitoring-as-code for consistent coverage",
      "Zero-touch onboarding for new applications and infrastructure",
    ],
  },
  coverage: {
    quickWins: [
      "Enable Log Management for centralized log correlation",
      "Activate Real User Monitoring on customer-facing web applications",
      "Enable Distributed Tracing across your microservices architecture",
    ],
    strategic: [
      "Deploy Application Security for runtime vulnerability detection",
      "Implement Synthetic Monitoring for proactive uptime validation",
      "Enable Business Events capture for revenue-critical transactions",
    ],
    transformational: [
      "Full-spectrum coverage: Infrastructure, APM, RUM, Synthetics, Security, Business Events",
      "Implement AI Observability for ML/AI workload monitoring",
      "Deploy Business Insights for executive-level operational analytics",
    ],
  },
};

interface RoadmapItem {
  category: string;
  categoryId: string;
  phase: "Quick Win (30 days)" | "Strategic (60 days)" | "Transformational (90 days)";
  action: string;
  currentLevel: number;
  priority: "Critical" | "High" | "Medium";
  priorityColor: string;
}

export const AdoptionRoadmap = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState<string>("all");

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
    return catAvgs;
  }, [latestPerUser]);

  const roadmapItems = useMemo((): RoadmapItem[] => {
    if (!orgScores) return [];

    const items: RoadmapItem[] = [];
    // Sort categories by score ascending — worst gaps first
    const sortedCats = dynatraceMaturityCategories
      .filter((c) => capabilityRoadmap[c.id])
      .map((c) => ({ ...c, score: orgScores[c.id] || 0 }))
      .sort((a, b) => a.score - b.score);

    for (const cat of sortedCats) {
      const roadmap = capabilityRoadmap[cat.id];
      if (!roadmap) continue;

      const priority = cat.score < 2 ? "Critical" : cat.score < 3 ? "High" : "Medium";
      const priorityColor = cat.score < 2 ? "#c4190b" : cat.score < 3 ? "#ef8b0e" : "#f5d30e";

      // Select actions based on current level
      const level = scoreToLevel(cat.score);
      let quickWins: string[], strategic: string[], transformational: string[];

      if (level <= 2) {
        quickWins = roadmap.quickWins;
        strategic = roadmap.strategic.slice(0, 2);
        transformational = roadmap.transformational.slice(0, 1);
      } else if (level <= 3) {
        quickWins = roadmap.strategic.slice(0, 2);
        strategic = roadmap.strategic.slice(2).concat(roadmap.transformational.slice(0, 1));
        transformational = roadmap.transformational.slice(1, 2);
      } else {
        quickWins = roadmap.transformational.slice(0, 1);
        strategic = roadmap.transformational.slice(1);
        transformational = [];
      }

      for (const action of quickWins) {
        items.push({
          category: cat.name,
          categoryId: cat.id,
          phase: "Quick Win (30 days)",
          action,
          currentLevel: level,
          priority,
          priorityColor,
        });
      }
      for (const action of strategic) {
        items.push({
          category: cat.name,
          categoryId: cat.id,
          phase: "Strategic (60 days)",
          action,
          currentLevel: level,
          priority,
          priorityColor,
        });
      }
      for (const action of transformational) {
        items.push({
          category: cat.name,
          categoryId: cat.id,
          phase: "Transformational (90 days)",
          action,
          currentLevel: level,
          priority,
          priorityColor,
        });
      }
    }

    return items;
  }, [orgScores]);

  const filteredItems = useMemo(() => {
    if (phaseFilter === "all") return roadmapItems;
    return roadmapItems.filter((item) => item.phase.includes(phaseFilter));
  }, [roadmapItems, phaseFilter]);

  // Group by phase
  const phases = ["Quick Win (30 days)", "Strategic (60 days)", "Transformational (90 days)"] as const;
  const groupedByPhase = useMemo(() => {
    const groups: Record<string, RoadmapItem[]> = {};
    for (const phase of phases) {
      groups[phase] = filteredItems.filter((i) => i.phase === phase);
    }
    return groups;
  }, [filteredItems]);

  if (loading) {
    return (
      <div className="roadmap-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="roadmap-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Data Yet</h2>
        <p style={{ opacity: 0.6 }}>Complete a DT Maturity assessment to generate your adoption roadmap.</p>
        <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginTop: 16 }}>
          Start Assessment
        </Button>
      </div>
    );
  }

  return (
    <div className="roadmap-container">
      <div className="print-bar">
        <Button variant="emphasized" onClick={() => window.print()}>Print to PDF</Button>
      </div>

      <div className="roadmap-header">
        <h1>Adoption Roadmap</h1>
        <p>Prioritized 30/60/90-day plan based on your current maturity gaps</p>
      </div>

      {/* Summary KPIs */}
      <div className="roadmap-kpi-row">
        <div className="roadmap-kpi">
          <div className="roadmap-kpi-value" style={{ color: "#c4190b" }}>
            {roadmapItems.filter((i) => i.priority === "Critical").length}
          </div>
          <div className="roadmap-kpi-label">Critical Actions</div>
        </div>
        <div className="roadmap-kpi">
          <div className="roadmap-kpi-value" style={{ color: "#ef8b0e" }}>
            {roadmapItems.filter((i) => i.priority === "High").length}
          </div>
          <div className="roadmap-kpi-label">High Priority</div>
        </div>
        <div className="roadmap-kpi">
          <div className="roadmap-kpi-value" style={{ color: "#f5d30e" }}>
            {roadmapItems.filter((i) => i.priority === "Medium").length}
          </div>
          <div className="roadmap-kpi-label">Medium Priority</div>
        </div>
        <div className="roadmap-kpi">
          <div className="roadmap-kpi-value" style={{ color: "#1496ff" }}>
            {roadmapItems.length}
          </div>
          <div className="roadmap-kpi-label">Total Actions</div>
        </div>
      </div>

      {/* Phase Filter */}
      <div className="roadmap-filter">
        <span className="filter-label">Phase:</span>
        {["all", "30", "60", "90"].map((f) => (
          <button
            key={f}
            className={`filter-btn ${phaseFilter === f ? "active" : ""}`}
            onClick={() => setPhaseFilter(f)}
          >
            {f === "all" ? "All Phases" : `${f} Days`}
          </button>
        ))}
      </div>

      {/* Roadmap by Phase */}
      {phases.map((phase) => {
        const items = groupedByPhase[phase];
        if (!items || items.length === 0) return null;
        const phaseIcon = phase.includes("Quick") ? "⚡" : phase.includes("Strategic") ? "🎯" : "🚀";
        return (
          <div className="roadmap-phase" key={phase}>
            <h2 className="phase-title">
              <span className="phase-icon">{phaseIcon}</span>
              {phase}
              <span className="phase-count">{items.length} actions</span>
            </h2>
            <div className="roadmap-items">
              {items.map((item, idx) => {
                const levelColor = MaturityLevelColors[item.currentLevel as MaturityLevel];
                return (
                  <div className="roadmap-item" key={`${item.categoryId}-${idx}`}>
                    <div className="roadmap-item-priority">
                      <span className="priority-dot" style={{ background: item.priorityColor }} />
                      <span className="priority-label" style={{ color: item.priorityColor }}>{item.priority}</span>
                    </div>
                    <div className="roadmap-item-content">
                      <div className="roadmap-item-category">
                        <span>{item.category}</span>
                        <span className="roadmap-item-level" style={{ color: levelColor }}>
                          L{item.currentLevel}
                        </span>
                      </div>
                      <div className="roadmap-item-action">{item.action}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
