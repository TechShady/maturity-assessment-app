import { AssessmentCategory } from "./types";

export const assessmentCategories: AssessmentCategory[] = [
  {
    id: "observability",
    name: "Observability & Monitoring",
    description:
      "How comprehensive is your observability stack? Do you have full-stack visibility?",
    questions: [
      {
        id: "obs-1",
        text: "What level of observability coverage do you have across your services?",
        options: [
          { value: 1, label: "Basic uptime checks and server metrics only" },
          { value: 2, label: "APM for key services with standard dashboards" },
          {
            value: 3,
            label:
              "Full-stack observability with traces, logs, and metrics correlated",
          },
          {
            value: 4,
            label:
              "AI-powered anomaly detection across all telemetry with automatic baselining",
          },
          {
            value: 5,
            label:
              "Continuous auto-discovery with topology-aware, context-rich observability",
          },
        ],
      },
      {
        id: "obs-2",
        text: "How do you handle alerting and noise management?",
        options: [
          {
            value: 1,
            label: "Static thresholds with frequent false positives",
          },
          {
            value: 2,
            label:
              "Some tuned alerts with basic deduplication and escalation paths",
          },
          {
            value: 3,
            label:
              "Adaptive thresholds with alert grouping and severity-based routing",
          },
          {
            value: 4,
            label:
              "AI-driven alerting with automatic root cause correlation and noise reduction",
          },
          {
            value: 5,
            label:
              "Predictive alerts that fire before impact, with near-zero false positive rate",
          },
        ],
      },
      {
        id: "obs-3",
        text: "How are dashboards and reporting used in your organization?",
        options: [
          { value: 1, label: "Ad-hoc dashboards created per team with no standards" },
          { value: 2, label: "Standardized dashboards for key services and golden signals" },
          { value: 3, label: "Executive and operational dashboards with SLO tracking" },
          { value: 4, label: "Dynamic dashboards with AI insights and automated reporting" },
          { value: 5, label: "Self-assembling dashboards that adapt to topology and context changes" },
        ],
      },
    ],
  },
  {
    id: "incident",
    name: "Incident Management",
    description:
      "How mature is your incident detection, response, and resolution process?",
    questions: [
      {
        id: "inc-1",
        text: "How do you detect and respond to incidents?",
        options: [
          {
            value: 1,
            label: "Customer-reported issues drive most incident detection",
          },
          {
            value: 2,
            label:
              "Monitoring alerts trigger on-call with defined escalation procedures",
          },
          {
            value: 3,
            label:
              "Automated detection with severity classification and coordinated war rooms",
          },
          {
            value: 4,
            label:
              "AI correlates signals across services for rapid root cause identification",
          },
          {
            value: 5,
            label:
              "Autonomous remediation resolves most incidents before users are impacted",
          },
        ],
      },
      {
        id: "inc-2",
        text: "What does your post-incident process look like?",
        options: [
          { value: 1, label: "No formal post-incident reviews" },
          {
            value: 2,
            label:
              "Blame-free postmortems for major incidents with action items tracked",
          },
          {
            value: 3,
            label:
              "Systematic retrospectives with patterns analyzed across incidents",
          },
          {
            value: 4,
            label:
              "Automated incident reports with AI-suggested improvements",
          },
          {
            value: 5,
            label:
              "Continuous learning loop where postmortem insights automatically improve systems",
          },
        ],
      },
      {
        id: "inc-3",
        text: "How is on-call structured and managed?",
        options: [
          { value: 1, label: "Informal or ad-hoc on-call with heroes handling issues" },
          { value: 2, label: "Defined on-call rotations with runbooks for common scenarios" },
          { value: 3, label: "Load-balanced on-call with escalation tiers and compensation" },
          { value: 4, label: "AI-assisted triage reduces on-call burden; smart routing to right responder" },
          { value: 5, label: "Minimal on-call needed; autonomous systems handle most operational events" },
        ],
      },
    ],
  },
  {
    id: "slo",
    name: "SLO & Error Budget Management",
    description:
      "How well do you define, track, and use SLOs and error budgets?",
    questions: [
      {
        id: "slo-1",
        text: "How are SLOs defined and managed?",
        options: [
          { value: 1, label: "No formal SLOs; availability is loosely tracked" },
          {
            value: 2,
            label:
              "SLOs defined for critical services based on uptime and latency",
          },
          {
            value: 3,
            label:
              "Comprehensive SLOs with error budgets that influence release decisions",
          },
          {
            value: 4,
            label:
              "Dynamic SLOs that adjust based on business context and user impact analysis",
          },
          {
            value: 5,
            label:
              "Self-tuning SLOs with autonomous error budget enforcement across all services",
          },
        ],
      },
      {
        id: "slo-2",
        text: "How do error budgets influence engineering decisions?",
        options: [
          { value: 1, label: "Error budgets are not tracked or used" },
          {
            value: 2,
            label:
              "Error budgets are reported but rarely influence roadmap decisions",
          },
          {
            value: 3,
            label:
              "Depleted error budgets trigger reliability sprints and freeze feature releases",
          },
          {
            value: 4,
            label:
              "Predictive burn-rate alerts trigger proactive reliability investments",
          },
          {
            value: 5,
            label:
              "Automated systems balance feature velocity and reliability based on budget state",
          },
        ],
      },
    ],
  },
  {
    id: "automation",
    name: "Automation & Toil Reduction",
    description:
      "How effectively do you automate operational tasks and reduce toil?",
    questions: [
      {
        id: "auto-1",
        text: "What is your approach to operational automation?",
        options: [
          { value: 1, label: "Most operations are manual with scripts shared informally" },
          {
            value: 2,
            label:
              "Key deployment and scaling tasks are automated with CI/CD pipelines",
          },
          {
            value: 3,
            label:
              "Comprehensive automation including self-service provisioning and auto-scaling",
          },
          {
            value: 4,
            label:
              "AI-driven automation that adapts based on patterns and predictions",
          },
          {
            value: 5,
            label:
              "Full closed-loop automation with self-healing infrastructure and zero-touch operations",
          },
        ],
      },
      {
        id: "auto-2",
        text: "How do you measure and manage toil?",
        options: [
          { value: 1, label: "Toil is not formally tracked or defined" },
          {
            value: 2,
            label:
              "Teams qualitatively identify toil; some effort to automate repetitive tasks",
          },
          {
            value: 3,
            label:
              "Toil is quantitatively measured with targets and regular elimination projects",
          },
          {
            value: 4,
            label:
              "AI identifies toil patterns and recommends automation opportunities",
          },
          {
            value: 5,
            label:
              "Toil is near zero; systems self-maintain and continuously optimize",
          },
        ],
      },
    ],
  },
  {
    id: "culture",
    name: "Reliability Culture & Practices",
    description:
      "How deeply embedded is reliability engineering in your organization?",
    questions: [
      {
        id: "cult-1",
        text: "How is reliability ownership structured?",
        options: [
          {
            value: 1,
            label:
              "Ops team owns reliability; devs throw code over the wall",
          },
          {
            value: 2,
            label:
              "Shared responsibility with defined SRE roles supporting dev teams",
          },
          {
            value: 3,
            label:
              "Embedded SRE practices with every team owning their service reliability",
          },
          {
            value: 4,
            label:
              "Platform engineering provides golden paths; reliability is a product concern",
          },
          {
            value: 5,
            label:
              "Reliability is a core competency across the entire organization with autonomous governance",
          },
        ],
      },
      {
        id: "cult-2",
        text: "What is your approach to chaos engineering and resilience testing?",
        options: [
          { value: 1, label: "No formal resilience testing" },
          {
            value: 2,
            label:
              "Occasional game days or manual failure injection in staging",
          },
          {
            value: 3,
            label:
              "Regular chaos experiments in production with defined blast radius",
          },
          {
            value: 4,
            label:
              "Continuous resilience validation informed by AI-identified weak points",
          },
          {
            value: 5,
            label:
              "Autonomous chaos testing that continuously validates and improves system resilience",
          },
        ],
      },
      {
        id: "cult-3",
        text: "How is reliability considered in the software development lifecycle?",
        options: [
          { value: 1, label: "Reliability is an afterthought, addressed only during outages" },
          { value: 2, label: "Basic reliability requirements in design reviews and deployment checklists" },
          { value: 3, label: "Reliability built into CI/CD with automated testing, canary deployments, and rollback" },
          { value: 4, label: "AI-powered release validation and progressive delivery based on SLO impact" },
          { value: 5, label: "Fully autonomous release management with self-validating deployments" },
        ],
      },
    ],
  },
];

/** Calculate category score as average of question answers */
export function calculateCategoryScore(
  categoryId: string,
  answers: Record<string, number>,
  categories: AssessmentCategory[]
): number {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return 0;

  const answeredQuestions = category.questions.filter(
    (q) => answers[q.id] !== undefined
  );
  if (answeredQuestions.length === 0) return 0;

  const sum = answeredQuestions.reduce((acc, q) => acc + (answers[q.id] || 0), 0);
  return sum / answeredQuestions.length;
}

/** Calculate overall maturity score */
export function calculateOverallScore(
  answers: Record<string, number>,
  categories: AssessmentCategory[]
): number {
  const categoryScores = categories.map((c) =>
    calculateCategoryScore(c.id, answers, categories)
  );
  const validScores = categoryScores.filter((s) => s > 0);
  if (validScores.length === 0) return 0;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

/** Map a numeric score to a maturity level */
export function scoreToLevel(score: number): number {
  if (score < 1.5) return 1;
  if (score < 2.5) return 2;
  if (score < 3.5) return 3;
  if (score < 4.5) return 4;
  return 5;
}
