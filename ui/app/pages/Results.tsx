import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelDescriptions,
  MaturityLevelColors,
  AssessmentResult,
} from "../types";
import { assessmentCategories, scoreToLevel } from "../maturityModel";
import "../styles/results.css";

const recommendations: Record<string, Record<number, string>> = {
  observability: {
    1: "Start by instrumenting your top 5 critical services with full-stack observability. Deploy Dynatrace OneAgent for automatic discovery and baselining.",
    2: "Expand APM coverage to all production services. Implement distributed tracing and correlate logs with traces for faster troubleshooting.",
    3: "Enable AI-powered anomaly detection and automatic baselining. Build unified dashboards that combine infrastructure, application, and business metrics.",
    4: "Implement topology-aware alerting and automatic root cause analysis. Use Davis AI to reduce alert noise and accelerate mean time to root cause.",
    5: "You're at the leading edge. Focus on maintaining coverage as your architecture evolves and sharing best practices across the organization.",
  },
  incident: {
    1: "Establish formal on-call rotations and basic runbooks for your top 10 most common incidents. Define severity levels and escalation paths.",
    2: "Implement automated incident detection with alert routing. Start conducting blameless postmortems and tracking action items to completion.",
    3: "Build automated war room coordination and cross-team communication. Analyze incident patterns to identify systemic issues.",
    4: "Leverage AI-correlated root cause analysis to reduce MTTR. Implement automated remediation for known failure modes.",
    5: "Excellent maturity. Continue refining autonomous remediation coverage and ensure learnings are automatically fed back into system improvements.",
  },
  slo: {
    1: "Define SLOs for your top 3 user-facing services based on latency and availability. Start measuring error budgets on a monthly basis.",
    2: "Expand SLO coverage to all critical services. Begin using error budget burn rate to inform release decisions.",
    3: "Implement error budget policies that automatically gate deployments. Use SLO dashboards in executive reviews.",
    4: "Deploy predictive SLO burn-rate alerting. Use Davis AI to correlate SLO breaches with root causes and recommend preventive actions.",
    5: "Outstanding SLO practice. Focus on dynamic SLO adjustment based on business context and sharing your framework across the organization.",
  },
  automation: {
    1: "Identify your top 5 most time-consuming manual tasks and automate them. Start with CI/CD pipelines and basic deployment automation.",
    2: "Implement auto-scaling and self-service provisioning. Build automated rollback capabilities for failed deployments.",
    3: "Quantitatively measure toil and set reduction targets. Implement infrastructure-as-code and GitOps workflows comprehensively.",
    4: "Use AI-driven insights to identify automation opportunities. Implement closed-loop remediation for common failure scenarios.",
    5: "Leading-edge automation. Focus on maintaining automation reliability and sharing patterns as reusable platform capabilities.",
  },
  culture: {
    1: "Start embedding SRE principles by creating shared ownership of production between dev and ops. Introduce basic reliability requirements in design reviews.",
    2: "Establish dedicated SRE roles or embedded SRE practices within teams. Begin conducting game days and chaos experiments in staging.",
    3: "Make reliability a first-class concern in sprint planning. Run regular chaos experiments in production with defined blast radius.",
    4: "Implement platform engineering with golden paths for reliability. Use AI to identify resilience weak points and guide chaos experiments.",
    5: "World-class reliability culture. Focus on evangelizing SRE practices across the organization and contributing to the broader SRE community.",
  },
};

export const Results = () => {
  const navigate = useNavigate();

  const result: (AssessmentResult & { answers?: Record<string, number> }) | null =
    useMemo(() => {
      const stored = sessionStorage.getItem("sre-assessment-result");
      if (!stored) return null;
      return JSON.parse(stored);
    }, []);

  if (!result) {
    return (
      <div className="results-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Assessment Results</h2>
        <p style={{ opacity: 0.6, marginBottom: 24 }}>
          Complete an assessment first to see your results.
        </p>
        <Button variant="emphasized" onClick={() => navigate("/assess")}>
          Start Assessment
        </Button>
      </div>
    );
  }

  const overallColor = MaturityLevelColors[result.overallLevel];

  // Find weakest categories for priority recommendations
  const sortedCategories = assessmentCategories
    .map((cat) => ({
      ...cat,
      score: result.categoryScores[cat.id] || 0,
      level: scoreToLevel(result.categoryScores[cat.id] || 0),
    }))
    .sort((a, b) => a.score - b.score);

  return (
    <div className="results-container">
      <div className="results-header">
        <h1>Assessment Results</h1>
        <div className="results-team">{result.teamName}</div>
        <div className="results-timestamp">
          {new Date(result.timestamp).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      <div
        className="overall-score-card"
        style={{ borderColor: overallColor }}
      >
        <div className="overall-level-num" style={{ color: overallColor }}>
          {result.overallLevel}
        </div>
        <div className="overall-level-name">
          {MaturityLevelLabels[result.overallLevel]}
        </div>
        <div className="overall-score-detail">
          Overall Score: {result.overallScore.toFixed(2)} / 5.00
        </div>
      </div>

      <div className="category-results-grid">
        {assessmentCategories.map((cat) => {
          const score = result.categoryScores[cat.id] || 0;
          const level = scoreToLevel(score) as MaturityLevel;
          const color = MaturityLevelColors[level];
          return (
            <div className="category-result-card" key={cat.id}>
              <div className="cat-result-header">
                <span className="cat-result-name">{cat.name}</span>
                <span className="cat-result-score" style={{ color }}>
                  {score.toFixed(1)}
                </span>
              </div>
              <div className="cat-result-bar">
                <div
                  className="cat-result-fill"
                  style={{
                    width: `${(score / 5) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <div className="cat-result-level">
                Level {level}: {MaturityLevelLabels[level]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="recommendations-section">
        <h2>Priority Recommendations</h2>
        {sortedCategories.slice(0, 3).map((cat) => (
          <div className="rec-card" key={cat.id}>
            <div className="rec-category">{cat.name}</div>
            <div className="rec-text">
              {recommendations[cat.id]?.[cat.level] ||
                "Continue improving your practices in this area."}
            </div>
          </div>
        ))}
      </div>

      <div className="results-actions">
        <Button variant="default" onClick={() => navigate("/assess")}>
          Retake Assessment
        </Button>
        <Button variant="default" onClick={() => navigate("/history")}>
          View History
        </Button>
        <Button variant="default" onClick={() => window.print()} className="print-btn">
          Print to PDF
        </Button>
        <Button variant="emphasized" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>
    </div>
  );
};
