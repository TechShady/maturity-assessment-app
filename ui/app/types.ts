/** Observability Maturity Levels */
export enum MaturityLevel {
  Level1 = 1,
  Level2 = 2,
  Level3 = 3,
  Level4 = 4,
  Level5 = 5,
}

export const MaturityLevelLabels: Record<MaturityLevel, string> = {
  [MaturityLevel.Level1]: "Foundational Observability",
  [MaturityLevel.Level2]: "Standardized Response",
  [MaturityLevel.Level3]: "Proactive Reliability",
  [MaturityLevel.Level4]: "Predictive Intelligence",
  [MaturityLevel.Level5]: "Autonomous Reliability",
};

/** Short stage name shown as a prefix to the full level label (e.g. "Foundational - Standardized Response"). */
export const MaturityLevelHeaders: Record<MaturityLevel, string> = {
  [MaturityLevel.Level1]: "Reactive",
  [MaturityLevel.Level2]: "Foundational",
  [MaturityLevel.Level3]: "Proficient",
  [MaturityLevel.Level4]: "Strategic",
  [MaturityLevel.Level5]: "Visionary",
};

/** Combined "Header - Label" string used everywhere outside the Home page. */
export const MaturityLevelFullLabels: Record<MaturityLevel, string> = {
  [MaturityLevel.Level1]: `${MaturityLevelHeaders[MaturityLevel.Level1]} - ${MaturityLevelLabels[MaturityLevel.Level1]}`,
  [MaturityLevel.Level2]: `${MaturityLevelHeaders[MaturityLevel.Level2]} - ${MaturityLevelLabels[MaturityLevel.Level2]}`,
  [MaturityLevel.Level3]: `${MaturityLevelHeaders[MaturityLevel.Level3]} - ${MaturityLevelLabels[MaturityLevel.Level3]}`,
  [MaturityLevel.Level4]: `${MaturityLevelHeaders[MaturityLevel.Level4]} - ${MaturityLevelLabels[MaturityLevel.Level4]}`,
  [MaturityLevel.Level5]: `${MaturityLevelHeaders[MaturityLevel.Level5]} - ${MaturityLevelLabels[MaturityLevel.Level5]}`,
};

export const MaturityLevelDescriptions: Record<MaturityLevel, string> = {
  [MaturityLevel.Level1]:
    "Basic monitoring is in place. Incident response is mostly manual and reactive. Teams rely on alerts and dashboards without defined SLOs.",
  [MaturityLevel.Level2]:
    "SLOs are defined for key services. Runbooks and on-call rotations are standardized. Basic automation handles common tasks.",
  [MaturityLevel.Level3]:
    "Error budgets drive release decisions. Chaos engineering is practiced. Proactive capacity planning and toil reduction are priorities.",
  [MaturityLevel.Level4]:
    "AI-driven anomaly detection and predictive alerting reduce MTTR. Automated root cause analysis accelerates incident resolution.",
  [MaturityLevel.Level5]:
    "Self-healing systems respond autonomously. Reliability is continuously optimized with minimal human intervention. Full closed-loop automation.",
};

export const MaturityLevelColors: Record<MaturityLevel, string> = {
  [MaturityLevel.Level1]: "#c4190b",
  [MaturityLevel.Level2]: "#ef8b0e",
  [MaturityLevel.Level3]: "#f5d30e",
  [MaturityLevel.Level4]: "#59c46b",
  [MaturityLevel.Level5]: "#1496ff",
};

/** Assessment Categories */
export interface AssessmentCategory {
  id: string;
  name: string;
  description: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: AssessmentOption[];
}

export interface AssessmentOption {
  value: number; // 1-5 mapping to maturity level
  label: string;
}

export interface AssessmentResult {
  id: string;
  timestamp: string;
  user: string;
  teamName: string;
  categoryScores: Record<string, number>;
  overallScore: number;
  overallLevel: MaturityLevel;
}

export interface AssessmentAnswers {
  [questionId: string]: number;
}
