import { AssessmentCategory } from "./types";
import { dynatraceMaturityCategories } from "./dynatraceMaturityModel";
import { personalGrowthCategories } from "./personalGrowthModel";

/** Legacy export — combines both assessment category sets for backward compatibility */
export const assessmentCategories: AssessmentCategory[] = [
  ...dynatraceMaturityCategories,
  ...personalGrowthCategories,
];

export { dynatraceMaturityCategories, personalGrowthCategories };

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
