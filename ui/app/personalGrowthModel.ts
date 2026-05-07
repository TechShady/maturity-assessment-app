import { AssessmentCategory } from "./types";

export const personalGrowthCategories: AssessmentCategory[] = [
  {
    id: "growth",
    name: "Personal Proficiency",
    description:
      "What is your personal proficiency level with Dynatrace? How effectively can you leverage the platform?",
    questions: [
      {
        id: "grow-1",
        text: "What is your current Dynatrace skill level?",
        options: [
          { value: 1, label: "Aware — Can navigate the UI and find basic information" },
          { value: 2, label: "Basic — Can build simple dashboards and notebooks" },
          { value: 3, label: "Working — Can build more complex DQL queries and custom visualizations" },
          { value: 4, label: "Advanced — Can optimize configurations, mentor others, and design monitoring strategies" },
          { value: 5, label: "Expert — Can build Dynatrace apps, automate with Workflows, and innovate with the platform" },
        ],
      },
      {
        id: "grow-2",
        text: "How do you approach learning and skill development with Dynatrace?",
        options: [
          { value: 1, label: "No formal training or self-study; learn only when forced" },
          { value: 2, label: "Completed basic training or Dynatrace University courses" },
          { value: 3, label: "Actively pursuing certifications and regularly exploring new features" },
          { value: 4, label: "Teaching others, contributing to internal knowledge bases, and attending community events" },
          { value: 5, label: "Driving innovation, building custom solutions, and contributing back to the community" },
        ],
      },
      {
        id: "grow-3",
        text: "How effectively do you use Dynatrace for problem-solving?",
        options: [
          { value: 1, label: "Rely on others to investigate issues in Dynatrace" },
          { value: 2, label: "Can perform basic troubleshooting using pre-built views and dashboards" },
          { value: 3, label: "Can independently investigate complex issues using DQL, traces, and topology" },
          { value: 4, label: "Can correlate across multiple data sources and identify root cause efficiently" },
          { value: 5, label: "Can build automated investigation workflows and proactive detection systems" },
        ],
      },
      {
        id: "grow-4",
        text: "How many hours are you spending per week with Dynatrace (UI, MCP, etc)?",
        options: [
          { value: 1, label: "Less than 1 hour" },
          { value: 2, label: "1-3 hours" },
          { value: 3, label: "3-5 hours" },
          { value: 4, label: "5-7 hours" },
          { value: 5, label: "7+ hours" },
        ],
      },
      {
        id: "grow-5",
        text: "What Official Dynatrace Certs do you have?",
        options: [
          { value: 1, label: "None" },
          { value: 2, label: "Essentials" },
          { value: 3, label: "Associates" },
          { value: 4, label: "Admin Professional" },
          { value: 5, label: "Implementation Professional" },
        ],
      },
    ],
  },
  {
    id: "problemcards",
    name: "Problem Cards",
    description:
      "How are you leveraging Dynatrace Problem Cards for incident awareness and response?",
    questions: [
      {
        id: "pc-1",
        text: "How are you using Problem Cards?",
        options: [
          { value: 1, label: "Not aware of Problem Cards or rarely look at them" },
          { value: 2, label: "Receive problem notifications and review cards when alerted" },
          { value: 3, label: "Actively use Problem Cards to understand root cause and impacted services" },
          { value: 4, label: "Leverage Problem Cards with custom alerting profiles and Davis AI correlation" },
          { value: 5, label: "Build automated workflows triggered by Problem Cards for triage, notification, and remediation" },
        ],
      },
    ],
  },
  {
    id: "smartscape",
    name: "Smartscape",
    description:
      "How are you leveraging Smartscape for topology awareness and dependency understanding?",
    questions: [
      {
        id: "ss-1",
        text: "How do you leverage Smartscape?",
        options: [
          { value: 1, label: "Not aware of Smartscape or never used it" },
          { value: 2, label: "Occasionally view Smartscape to see service relationships" },
          { value: 3, label: "Regularly use Smartscape to understand dependencies and impact during incidents" },
          { value: 4, label: "Leverage Smartscape topology in DQL queries and dashboards for dependency analysis" },
          { value: 5, label: "Use Smartscape data programmatically in workflows, apps, and change impact analysis" },
        ],
      },
    ],
  },
  {
    id: "guardian",
    name: "Site Reliability Guardian",
    description:
      "How are you leveraging Site Reliability Guardian for release validation and quality gates?",
    questions: [
      {
        id: "srg-1",
        text: "How are you leveraging Site Reliability Guardian?",
        options: [
          { value: 1, label: "Not aware of Site Reliability Guardian" },
          { value: 2, label: "Aware of the concept but have not configured any guardians" },
          { value: 3, label: "Have guardians configured for key services with basic validation objectives" },
          { value: 4, label: "Guardians integrated into CI/CD pipelines as automated quality gates" },
          { value: 5, label: "Full guardian coverage with custom objectives, automated rollback, and progressive delivery" },
        ],
      },
    ],
  },
  {
    id: "workflows",
    name: "Workflows",
    description:
      "What types of workflows are you building and how sophisticated is your automation?",
    questions: [
      {
        id: "wf-1",
        text: "What type of workflows are you building?",
        options: [
          { value: 1, label: "Not building any workflows" },
          { value: 2, label: "Basic health checks and simple notifications" },
          { value: 3, label: "Reporting workflows and structured problem notifications with context" },
          { value: 4, label: "Remediation workflows that take corrective action based on problems" },
          { value: 5, label: "Autonomous self-healing workflows with complex decision logic and multi-system orchestration" },
        ],
      },
    ],
  },
  {
    id: "slos",
    name: "SLOs & SLIs",
    description:
      "How are you personally leveraging SLOs and SLIs for reliability management?",
    questions: [
      {
        id: "sli-1",
        text: "How do you leverage SLOs/SLIs?",
        options: [
          { value: 1, label: "Not using SLOs or SLIs" },
          { value: 2, label: "Aware of SLOs but have not defined any" },
          { value: 3, label: "Have basic SLOs defined for key services and review them periodically" },
          { value: 4, label: "Actively manage error budgets and use SLO burn rates to drive decisions" },
          { value: 5, label: "SLOs drive release gates, capacity planning, and automated reliability responses" },
        ],
      },
    ],
  },
  {
    id: "ai-usage",
    name: "AI-Assisted Platform Usage",
    description:
      "Are you using AI capabilities to build dashboards, workflows, and custom apps more efficiently?",
    questions: [
      {
        id: "ai-1",
        text: "Are you using AI to build dashboards, workflows, and custom apps?",
        options: [
          { value: 1, label: "Not using any AI assistance for Dynatrace work" },
          { value: 2, label: "Occasionally use Davis CoPilot or AI assistants for simple queries" },
          { value: 3, label: "Regularly use AI to generate DQL queries, dashboard configurations, and workflow logic" },
          { value: 4, label: "Leverage AI to accelerate custom app development and complex automation design" },
          { value: 5, label: "AI is integral to my workflow — using it for architecture, code generation, and continuous optimization" },
        ],
      },
    ],
  },
];
