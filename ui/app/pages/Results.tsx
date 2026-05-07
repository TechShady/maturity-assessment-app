import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelFullLabels,
  MaturityLevelDescriptions,
  MaturityLevelColors,
  AssessmentResult,
} from "../types";
import { dynatraceMaturityCategories, personalGrowthCategories, scoreToLevel } from "../maturityModel";
import {
  getActionPlan, saveActionPlan, ActionItem,
  getUniversityPlan, saveUniversityPlan, UniversityPlan,
} from "../grailService";
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
  deployment: {
    1: "Begin by deploying Dynatrace OneAgent on your most critical production hosts and services. Establish a baseline of what's monitored.",
    2: "Create a formal onboarding process for new services. Identify the biggest coverage gaps and prioritize instrumentation.",
    3: "Automate agent deployment via infrastructure-as-code. Build dashboards that track coverage percentage across environments.",
    4: "Integrate coverage validation into CI/CD pipelines. Automate gap detection with remediation workflows.",
    5: "Excellent deployment coverage. Maintain zero-touch onboarding and continuous validation as your environment evolves.",
  },
  coverage: {
    1: "Identify which Dynatrace capabilities are not deployed at all. Start with the highest-impact gaps (Infrastructure, APM, Logs).",
    2: "Expand beyond basic monitoring — enable Log Management, RUM, or Synthetic monitoring for key services.",
    3: "Increase coverage breadth to 60%+ across all capabilities. Focus on connecting data sources for correlation.",
    4: "Drive toward full coverage. Enable advanced capabilities like AI Observability, Security, and Business Events.",
    5: "Outstanding coverage. Focus on maximizing value from each capability and identifying new use cases.",
  },
  growth: {
    1: "Start with Dynatrace University fundamentals. Spend time navigating the platform and exploring dashboards and problem cards.",
    2: "Work through DQL basics and build your first custom dashboard. Join Dynatrace Community for peer learning.",
    3: "Pursue Dynatrace certification. Start building workflows and contributing to your team's monitoring standards.",
    4: "Mentor others and share knowledge. Explore the Dynatrace App SDK and advanced automation patterns.",
    5: "You're a Dynatrace expert. Continue innovating and consider contributing back to the community.",
  },
  problemcards: {
    1: "Start by reviewing Problem Cards when incidents occur. Understand how Davis AI detects and correlates problems.",
    2: "Configure alerting profiles to receive problem notifications for your services. Learn to read root cause analysis.",
    3: "Use Problem Cards as the starting point for all incident investigations. Leverage impact analysis and related entities.",
    4: "Customize problem detection sensitivity. Build alerting workflows triggered by specific problem types.",
    5: "Excellent use of Problem Cards. Continue leveraging them for automated remediation and proactive detection.",
  },
  smartscape: {
    1: "Open Smartscape and explore the topology of your environment. Understand how services, processes, and hosts connect.",
    2: "Use Smartscape during incidents to identify upstream and downstream dependencies.",
    3: "Leverage topology data in DQL queries for dependency analysis and impact assessment.",
    4: "Build dashboards and workflows that incorporate topology relationships for change impact analysis.",
    5: "Expert-level Smartscape usage. Continue using topology programmatically in apps and automation.",
  },
  guardian: {
    1: "Learn about Site Reliability Guardian and its role in release validation. Review the documentation.",
    2: "Create your first guardian with basic validation objectives for a key service.",
    3: "Expand guardian coverage to multiple services. Define meaningful SLO-based validation objectives.",
    4: "Integrate guardians as quality gates in your CI/CD pipeline. Use them for canary and blue-green deployments.",
    5: "Full guardian maturity. Continue refining objectives and expanding to progressive delivery patterns.",
  },
  workflows: {
    1: "Explore the Workflows app and understand its capabilities. Start with a simple notification workflow.",
    2: "Build health check workflows and structured problem notifications with context.",
    3: "Create reporting workflows and integrate with external systems (Slack, Jira, ServiceNow).",
    4: "Build remediation workflows that take corrective action. Use conditional logic and multi-step orchestration.",
    5: "Excellent workflow maturity. Continue building self-healing automation and sharing patterns.",
  },
  slos: {
    1: "Learn about SLOs and SLIs in Dynatrace. Understand the difference between availability and latency SLOs.",
    2: "Define your first SLO for a critical service. Set up basic burn-rate alerting.",
    3: "Expand SLOs to all key services. Start using error budgets to inform reliability decisions.",
    4: "Use SLO burn rates to drive release gates and capacity planning. Build SLO-based dashboards.",
    5: "Expert SLO management. Continue optimizing and automating based on error budget state.",
  },
  "ai-usage": {
    1: "Try using Davis CoPilot for simple questions about your environment. Explore AI-assisted DQL generation.",
    2: "Use AI assistance regularly for query building and dashboard configuration.",
    3: "Leverage AI to accelerate workflow creation and troubleshooting. Use it for documentation and knowledge sharing.",
    4: "Integrate AI into your development workflow for custom app creation and complex automation design.",
    5: "AI is integral to your Dynatrace workflow. Continue pushing boundaries and sharing techniques.",
  },
};

export const Results = () => {
  const navigate = useNavigate();

  const result: (AssessmentResult & { answers?: Record<string, number> }) | null =
    useMemo(() => {
      const stored = sessionStorage.getItem("sre-assessment-result");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Ensure backwards compatibility with older results without user field
      if (!parsed.user) parsed.user = "Anonymous";
      return parsed;
    }, []);

  if (!result) {
    return (
      <div className="results-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Assessment Results</h2>
        <p style={{ opacity: 0.6, marginBottom: 24 }}>
          Complete an assessment first to see your results.
        </p>
        <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")}>
          Start DT Maturity Assessment
        </Button>
        <Button variant="emphasized" onClick={() => navigate("/assess/personal")} style={{ marginLeft: 12 }}>
          Start Personal Growth Assessment
        </Button>
      </div>
    );
  }

  // Determine which category set to use based on stored assessment type
  const assessmentType = (result as any).assessmentType || sessionStorage.getItem("sre-assessment-type") || "dynatrace";
  const activeCategories = assessmentType === "personal-growth"
    ? personalGrowthCategories
    : dynatraceMaturityCategories;

  const overallColor = MaturityLevelColors[result.overallLevel];

  // Find weakest categories for priority recommendations
  const sortedCategories = activeCategories
    .map((cat) => ({
      ...cat,
      score: result.categoryScores[cat.id] || 0,
      level: scoreToLevel(result.categoryScores[cat.id] || 0),
    }))
    .sort((a, b) => a.score - b.score);

  const handlePrint = () => {
    const catCardsHtml = activeCategories
      .map((cat) => {
        const score = result.categoryScores[cat.id] || 0;
        const level = scoreToLevel(score);
        const color = MaturityLevelColors[level as MaturityLevel];
        return `<div style="border:1px solid #ddd;border-radius:10px;padding:16px;background:#f8f8f8;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:600;font-size:14px;">${cat.name}</span>
            <span style="font-weight:700;font-size:22px;color:${color}">${score.toFixed(1)}</span>
          </div>
          <div style="height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden;margin-bottom:6px;">
            <div style="height:100%;width:${(score / 5) * 100}%;background:${color};border-radius:4px;"></div>
          </div>
          <div style="font-size:12px;color:#666;">Level ${level}: ${MaturityLevelFullLabels[level as MaturityLevel]}</div>
        </div>`;
      })
      .join("");

    const recsHtml = sortedCategories
      .slice(0, 3)
      .map(
        (cat) => `<div style="border:1px solid #ddd;border-radius:10px;padding:14px 18px;margin-bottom:10px;background:#f8f8f8;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#888;margin-bottom:5px;">${cat.name}</div>
          <div style="font-size:14px;line-height:1.5;">${recommendations[cat.id]?.[cat.level] || "Continue improving your practices in this area."}</div>
        </div>`
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><title>Maturity Assessment Results - ${result.teamName}</title>
      <style>
        @page { margin: 15mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; margin: 0; padding: 20px; }
        .page-break { page-break-before: always; break-before: page; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 30px; }
      </style></head><body>
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="font-size:24px;margin:0 0 4px;">Assessment Results</h1>
        <div style="font-size:14px;color:#555;">${result.teamName}</div>
        <div style="font-size:12px;color:#888;">Assessed by: ${result.user || "Anonymous"} &middot; ${new Date(result.timestamp).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      <div style="text-align:center;border:2px solid ${overallColor};border-radius:14px;padding:30px;margin-bottom:30px;">
        <div style="font-size:60px;font-weight:800;color:${overallColor};">${result.overallLevel}</div>
        <div style="font-size:20px;font-weight:600;">${MaturityLevelFullLabels[result.overallLevel]}</div>
        <div style="font-size:14px;color:#666;">Overall Score: ${result.overallScore.toFixed(2)} / 5.00</div>
      </div>
      <div class="grid">${catCardsHtml}</div>
      <div class="page-break">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:14px;">Priority Recommendations</h2>
        ${recsHtml}
      </div>
    </body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    }
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h1>Assessment Results</h1>
        <div className="results-team">{result.teamName}</div>
        <div className="results-user" style={{ opacity: 0.7, fontSize: 13 }}>
          Assessed by: {result.user || "Anonymous"}
        </div>
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
          {MaturityLevelFullLabels[result.overallLevel]}
        </div>
        <div className="overall-score-detail">
          Overall Score: {result.overallScore.toFixed(2)} / 5.00
        </div>
      </div>

      <div className="category-results-grid">
        {activeCategories.map((cat) => {
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
                Level {level}: {MaturityLevelFullLabels[level]}
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

      <ActionPlan categories={sortedCategories.slice(0, 3)} recommendations={recommendations} />

      {assessmentType === "personal-growth" && (
        <DynatraceUniversityPlan />
      )}

      <div className="results-actions">
        <Button variant="emphasized" onClick={() => navigate(assessmentType === "personal-growth" ? "/assess/personal" : "/assess/dynatrace")}>
          Retake Assessment
        </Button>
        <Button variant="emphasized" onClick={() => navigate(assessmentType === "personal-growth" ? "/history/personal" : "/history/dt")}>
          View History
        </Button>
        <Button variant="emphasized" onClick={handlePrint} className="print-btn">
          Print to PDF
        </Button>
        <Button variant="emphasized" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>
    </div>
  );
};

interface ActionPlanProps {
  categories: { id: string; name: string; score: number; level: number }[];
  recommendations: Record<string, Record<number, string>>;
}

const ActionPlan: React.FC<ActionPlanProps> = ({ categories, recommendations }) => {
  const defaultItems: ActionItem[] = categories.map((cat) => ({
    id: cat.id,
    category: cat.name,
    goal: recommendations[cat.id]?.[cat.level] || "Improve this area",
    dueDate: "",
    status: "not-started" as const,
  }));

  const [items, setItems] = useState<ActionItem[]>(defaultItems);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getActionPlan().then((stored) => {
      if (stored && stored.length > 0) setItems(stored);
      setLoaded(true);
    });
  }, []);

  const updateItem = (id: string, updates: Partial<ActionItem>) => {
    setItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
      saveActionPlan(updated);
      return updated;
    });
  };

  return (
    <div className="action-plan-section">
      <h2>Action Plan</h2>
      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>
        Turn recommendations into trackable goals with due dates.
      </p>
      <div className="action-items">
        {items.map((item) => (
          <div className={`action-item ${item.status}`} key={item.id}>
            <div className="action-item-header">
              <span className="action-category">{item.category}</span>
              <select
                className="action-status"
                value={item.status}
                onChange={(e) => updateItem(item.id, { status: e.target.value as ActionItem["status"] })}
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="action-goal">{item.goal}</div>
            <div className="action-due">
              <label>Due: </label>
              <input
                type="date"
                value={item.dueDate}
                onChange={(e) => updateItem(item.id, { dueDate: e.target.value })}
                className="action-date-input"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DynatraceUniversityPlan: React.FC = () => {
  const [status, setStatus] = useState<"not-started" | "in-progress" | "completed">("not-started");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    getUniversityPlan().then((stored) => {
      if (stored) {
        setStatus(stored.status || "not-started");
        setDueDate(stored.dueDate || "");
      }
    });
  }, []);

  const update = (newStatus: typeof status, newDue: string) => {
    setStatus(newStatus);
    setDueDate(newDue);
    saveUniversityPlan({ status: newStatus, dueDate: newDue });
  };

  return (
    <div className="action-plan-section" style={{ marginTop: 32 }}>
      <h2>Dynatrace University</h2>
      <div className="action-items">
        <div className={`action-item ${status}`}>
          <div className="action-item-header">
            <span className="action-category">DYNATRACE UNIVERSITY</span>
            <select
              className="action-status"
              value={status}
              onChange={(e) => update(e.target.value as typeof status, dueDate)}
            >
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="action-goal">
            Build your skills and advance your career with best-in-class training from Dynatrace experts.
          </div>
          <div className="action-goal" style={{ marginTop: 8 }}>
            <a href="https://university.dynatrace.com/learn" target="_blank" rel="noopener noreferrer" style={{ color: "#5bb0f7", textDecoration: "underline" }}>
              https://university.dynatrace.com/learn
            </a>
          </div>
          <div className="action-due">
            <label>Due: </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => update(status, e.target.value)}
              className="action-date-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
