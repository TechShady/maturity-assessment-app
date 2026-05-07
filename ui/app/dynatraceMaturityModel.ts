import { AssessmentCategory } from "./types";

export const dynatraceMaturityCategories: AssessmentCategory[] = [
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
          { value: 3, label: "Full-stack observability with traces, logs, and metrics correlated" },
          { value: 4, label: "AI-powered anomaly detection across all telemetry with automatic baselining" },
          { value: 5, label: "Continuous auto-discovery with topology-aware, context-rich observability" },
        ],
      },
      {
        id: "obs-2",
        text: "How do you handle alerting and noise management?",
        options: [
          { value: 1, label: "Static thresholds with frequent false positives" },
          { value: 2, label: "Some tuned alerts with basic deduplication and escalation paths" },
          { value: 3, label: "Adaptive thresholds with alert grouping and severity-based routing" },
          { value: 4, label: "AI-driven alerting with automatic root cause correlation and noise reduction" },
          { value: 5, label: "Predictive alerts that fire before impact, with near-zero false positive rate" },
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
          { value: 1, label: "Customer-reported issues drive most incident detection" },
          { value: 2, label: "Monitoring alerts trigger on-call with defined escalation procedures" },
          { value: 3, label: "Automated detection with severity classification and coordinated war rooms" },
          { value: 4, label: "AI correlates signals across services for rapid root cause identification" },
          { value: 5, label: "Autonomous remediation resolves most incidents before users are impacted" },
        ],
      },
      {
        id: "inc-2",
        text: "What does your post-incident process look like?",
        options: [
          { value: 1, label: "No formal post-incident reviews" },
          { value: 2, label: "Blame-free postmortems for major incidents with action items tracked" },
          { value: 3, label: "Systematic retrospectives with patterns analyzed across incidents" },
          { value: 4, label: "Automated incident reports with AI-suggested improvements" },
          { value: 5, label: "Continuous learning loop where postmortem insights automatically improve systems" },
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
          { value: 2, label: "SLOs defined for critical services based on uptime and latency" },
          { value: 3, label: "Comprehensive SLOs with error budgets that influence release decisions" },
          { value: 4, label: "Dynamic SLOs that adjust based on business context and user impact analysis" },
          { value: 5, label: "Self-tuning SLOs with autonomous error budget enforcement across all services" },
        ],
      },
      {
        id: "slo-2",
        text: "How do error budgets influence engineering decisions?",
        options: [
          { value: 1, label: "Error budgets are not tracked or used" },
          { value: 2, label: "Error budgets are reported but rarely influence roadmap decisions" },
          { value: 3, label: "Depleted error budgets trigger reliability sprints and freeze feature releases" },
          { value: 4, label: "Predictive burn-rate alerts trigger proactive reliability investments" },
          { value: 5, label: "Automated systems balance feature velocity and reliability based on budget state" },
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
          { value: 2, label: "Key deployment and scaling tasks are automated with CI/CD pipelines" },
          { value: 3, label: "Comprehensive automation including self-service provisioning and auto-scaling" },
          { value: 4, label: "AI-driven automation that adapts based on patterns and predictions" },
          { value: 5, label: "Full closed-loop automation with self-healing infrastructure and zero-touch operations" },
        ],
      },
      {
        id: "auto-2",
        text: "How do you measure and manage toil?",
        options: [
          { value: 1, label: "Toil is not formally tracked or defined" },
          { value: 2, label: "Teams qualitatively identify toil; some effort to automate repetitive tasks" },
          { value: 3, label: "Toil is quantitatively measured with targets and regular elimination projects" },
          { value: 4, label: "AI identifies toil patterns and recommends automation opportunities" },
          { value: 5, label: "Toil is near zero; systems self-maintain and continuously optimize" },
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
          { value: 1, label: "Ops team owns reliability; devs throw code over the wall" },
          { value: 2, label: "Shared responsibility with defined SRE roles supporting dev teams" },
          { value: 3, label: "Embedded SRE practices with every team owning their service reliability" },
          { value: 4, label: "Platform engineering provides golden paths; reliability is a product concern" },
          { value: 5, label: "Reliability is a core competency across the entire organization with autonomous governance" },
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
  {
    id: "deployment",
    name: "Deployment Coverage",
    description:
      "How broadly is Dynatrace deployed across your environment? What level of full-stack coverage do you have?",
    questions: [
      {
        id: "dep-1",
        text: "What is the breadth of your Dynatrace deployment coverage?",
        options: [
          { value: 1, label: "Minimal coverage — only a handful of hosts or services instrumented" },
          { value: 2, label: "Covering a few key applications but large gaps remain" },
          { value: 3, label: "Decent coverage across the estate, but not all products deployed (e.g. missing Logs, Metrics, or Traces)" },
          { value: 4, label: "Enterprise-wide coverage, though some product capabilities (Logs, Metrics, Traces) are not fully enabled" },
          { value: 5, label: "100% full-stack coverage across all environments, services, and product capabilities" },
        ],
      },
      {
        id: "dep-2",
        text: "How is new infrastructure or application onboarding handled?",
        options: [
          { value: 1, label: "Manual, ad-hoc agent installation with no standard process" },
          { value: 2, label: "Documented process but onboarding is reactive and inconsistent" },
          { value: 3, label: "Semi-automated onboarding with templates; most new services get instrumented" },
          { value: 4, label: "Automated onboarding via CI/CD or infrastructure-as-code; coverage validated" },
          { value: 5, label: "Zero-touch onboarding — auto-discovery ensures 100% coverage with no manual steps" },
        ],
      },
      {
        id: "dep-3",
        text: "How do you ensure ongoing coverage completeness?",
        options: [
          { value: 1, label: "No visibility into coverage gaps; unknown unknowns" },
          { value: 2, label: "Periodic manual audits to identify uninstrumented assets" },
          { value: 3, label: "Dashboards track coverage percentage with alerts for gaps" },
          { value: 4, label: "Automated coverage reports tied to CMDB with gap remediation workflows" },
          { value: 5, label: "Continuous coverage validation with auto-remediation of any discovered gaps" },
        ],
      },
    ],
  },
  {
    id: "coverage",
    name: "Coverage & Usage",
    description:
      "What percentage of your environment is covered by each Dynatrace capability, and how actively is it used? This identifies expansion opportunities.",
    questions: [
      {
        id: "cov-infra",
        text: "Infrastructure Monitoring — What percentage of your hosts/infrastructure are monitored with full-stack OneAgent?",
        options: [
          { value: 1, label: "0–20% — Minimal or no infrastructure coverage" },
          { value: 2, label: "21–40% — Some key servers monitored but large gaps" },
          { value: 3, label: "41–60% — Moderate coverage across environments" },
          { value: 4, label: "61–80% — Most infrastructure monitored with active usage" },
          { value: 5, label: "81–100% — Full infrastructure coverage and actively leveraged" },
        ],
      },
      {
        id: "cov-logs",
        text: "Log Management — What percentage of your log sources are ingested and actively analyzed in Dynatrace?",
        options: [
          { value: 1, label: "0–20% — Logs not ingested or barely used" },
          { value: 2, label: "21–40% — Some log sources connected but limited analysis" },
          { value: 3, label: "41–60% — Key application logs ingested with basic alerting" },
          { value: 4, label: "61–80% — Broad log coverage with pattern detection and correlation" },
          { value: 5, label: "81–100% — All logs ingested, analyzed, and correlated with traces/metrics" },
        ],
      },
      {
        id: "cov-cloud",
        text: "Cloud Monitoring — What percentage of your cloud resources (AWS/Azure/GCP) are monitored in Dynatrace?",
        options: [
          { value: 1, label: "0–20% — Minimal or no cloud integration" },
          { value: 2, label: "21–40% — Basic cloud metrics for some accounts" },
          { value: 3, label: "41–60% — Moderate coverage with key services monitored" },
          { value: 4, label: "61–80% — Most cloud accounts integrated with active dashboards" },
          { value: 5, label: "81–100% — Full cloud estate monitored with cost and resource optimization" },
        ],
      },
      {
        id: "cov-tracing",
        text: "Distributed Tracing — What percentage of your applications have distributed tracing enabled and actively used?",
        options: [
          { value: 1, label: "0–20% — No tracing or minimal instrumentation" },
          { value: 2, label: "21–40% — Tracing on a few critical services only" },
          { value: 3, label: "41–60% — Moderate coverage with traces used for troubleshooting" },
          { value: 4, label: "61–80% — Broad tracing with service flow analysis and dependency mapping" },
          { value: 5, label: "81–100% — Full end-to-end tracing across all services, actively used for optimization" },
        ],
      },
      {
        id: "cov-rum",
        text: "Real User Monitoring (RUM) — What percentage of your customer-facing applications have RUM enabled?",
        options: [
          { value: 1, label: "0–20% — No RUM or minimal browser monitoring" },
          { value: 2, label: "21–40% — RUM on a few key web apps only" },
          { value: 3, label: "41–60% — Moderate RUM coverage including mobile" },
          { value: 4, label: "61–80% — Broad RUM with user journey analysis and Web Vitals tracking" },
          { value: 5, label: "81–100% — Full RUM coverage across all apps with session replay and business correlation" },
        ],
      },
      {
        id: "cov-ai",
        text: "AI Observability — What percentage of your AI/ML workloads are monitored with Dynatrace?",
        options: [
          { value: 1, label: "0–20% — No AI observability in place" },
          { value: 2, label: "21–40% — Basic monitoring of a few AI endpoints" },
          { value: 3, label: "41–60% — Some AI model performance tracking and cost monitoring" },
          { value: 4, label: "61–80% — Broad AI observability including prompt tracing and quality metrics" },
          { value: 5, label: "81–100% — Full AI observability with guardrails, drift detection, and cost optimization" },
        ],
      },
      {
        id: "cov-security",
        text: "Security Posture — What percentage of your environment is covered by Dynatrace Application Security?",
        options: [
          { value: 1, label: "0–20% — Security features not enabled" },
          { value: 2, label: "21–40% — Vulnerability detection on a few services" },
          { value: 3, label: "41–60% — Moderate coverage with runtime vulnerability analysis" },
          { value: 4, label: "61–80% — Broad security coverage with attack detection and blocking" },
          { value: 5, label: "81–100% — Full runtime application security with automated protection" },
        ],
      },
      {
        id: "cov-k8s",
        text: "Kubernetes Monitoring — What percentage of your Kubernetes clusters are monitored with Dynatrace?",
        options: [
          { value: 1, label: "0–20% — No Kubernetes monitoring or minimal metrics" },
          { value: 2, label: "21–40% — Basic cluster health for a few environments" },
          { value: 3, label: "41–60% — Moderate coverage with workload and pod-level visibility" },
          { value: 4, label: "61–80% — Broad K8s monitoring with resource optimization recommendations" },
          { value: 5, label: "81–100% — Full Kubernetes observability across all clusters with cost and performance optimization" },
        ],
      },
      {
        id: "cov-db",
        text: "Database Monitoring — What percentage of your databases are monitored in Dynatrace?",
        options: [
          { value: 1, label: "0–20% — No database monitoring" },
          { value: 2, label: "21–40% — Basic connectivity checks on a few databases" },
          { value: 3, label: "41–60% — Query-level monitoring on key databases" },
          { value: 4, label: "61–80% — Broad database monitoring with slow query analysis and optimization" },
          { value: 5, label: "81–100% — Full database observability with performance insights and anomaly detection" },
        ],
      },
      {
        id: "cov-network",
        text: "Network Monitoring — What percentage of your network infrastructure is monitored with Dynatrace?",
        options: [
          { value: 1, label: "0–20% — No network monitoring in Dynatrace" },
          { value: 2, label: "21–40% — Basic network metrics for some devices" },
          { value: 3, label: "41–60% — Moderate coverage with flow analysis" },
          { value: 4, label: "61–80% — Broad network monitoring with topology and performance correlation" },
          { value: 5, label: "81–100% — Full network observability with AI-powered anomaly detection" },
        ],
      },
      {
        id: "cov-debugger",
        text: "Live Debugger — What percentage of your development teams are using Dynatrace Live Debugger?",
        options: [
          { value: 1, label: "0–20% — Not enabled or not aware of the feature" },
          { value: 2, label: "21–40% — A few developers have tried it" },
          { value: 3, label: "41–60% — Used by some teams for production debugging" },
          { value: 4, label: "61–80% — Broadly adopted for troubleshooting production issues" },
          { value: 5, label: "81–100% — Standard practice across all development teams" },
        ],
      },
      {
        id: "cov-synthetics",
        text: "Synthetic Monitoring — What percentage of your critical user journeys have synthetic monitors configured?",
        options: [
          { value: 1, label: "0–20% — No synthetic monitoring" },
          { value: 2, label: "21–40% — Basic uptime checks on key URLs" },
          { value: 3, label: "41–60% — Multi-step monitors for important user flows" },
          { value: 4, label: "61–80% — Comprehensive synthetic coverage with SLO-integrated checks" },
          { value: 5, label: "81–100% — Full synthetic coverage including API, browser, and third-party monitors" },
        ],
      },
      {
        id: "cov-replay",
        text: "Session Replay — What percentage of your web applications have Session Replay enabled?",
        options: [
          { value: 1, label: "0–20% — Session Replay not enabled" },
          { value: 2, label: "21–40% — Enabled on one or two apps with low sampling" },
          { value: 3, label: "41–60% — Moderate coverage with targeted sampling" },
          { value: 4, label: "61–80% — Broad coverage with replay used for UX analysis" },
          { value: 5, label: "81–100% — Full coverage with replay integrated into support and UX workflows" },
        ],
      },
      {
        id: "cov-bizevents",
        text: "Business Events — What percentage of your key business processes are captured as Business Events?",
        options: [
          { value: 1, label: "0–20% — No business events configured" },
          { value: 2, label: "21–40% — A few critical business transactions captured" },
          { value: 3, label: "41–60% — Moderate coverage of business processes" },
          { value: 4, label: "61–80% — Broad business event capture with funnel analysis" },
          { value: 5, label: "81–100% — Full business process observability with revenue impact correlation" },
        ],
      },
      {
        id: "cov-bizinsights",
        text: "Business Insights — How actively are Business Insights dashboards and analytics used?",
        options: [
          { value: 1, label: "0–20% — Not using Business Insights" },
          { value: 2, label: "21–40% — Basic awareness but minimal use" },
          { value: 3, label: "41–60% — Some teams use it for KPI tracking" },
          { value: 4, label: "61–80% — Business stakeholders actively use insights for decisions" },
          { value: 5, label: "81–100% — Fully integrated into business operations with real-time decision support" },
        ],
      },
    ],
  },
];
