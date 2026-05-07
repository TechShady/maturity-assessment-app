import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import { Flex } from "@dynatrace/strato-components/layouts";
import { ProgressBar } from "@dynatrace/strato-components/content";
import {
  dynatraceMaturityCategories,
} from "../dynatraceMaturityModel";
import { calculateCategoryScore, calculateOverallScore, scoreToLevel } from "../maturityModel";
import { AssessmentAnswers, MaturityLevelColors, MaturityLevel } from "../types";
import { saveDtMaturityResult, getDtMaturityHistory, AssessmentRecord } from "../grailService";
import "../styles/assessment.css";

export const DynatraceAssessment = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previousAnswers, setPreviousAnswers] = useState<Record<string, number> | null>(null);

  const categories = dynatraceMaturityCategories;

  useEffect(() => {
    getDtMaturityHistory().then((history) => {
      if (history.length > 0 && history[0].answers) {
        setPreviousAnswers(history[0].answers);
      }
    });
  }, []);

  const totalQuestions = useMemo(
    () => categories.reduce((sum, c) => sum + c.questions.length, 0),
    []
  );
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const currentCategory = categories[currentCategoryIndex];

  const handleSelect = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const categoryScores: Record<string, number> = {};
    for (const cat of categories) {
      categoryScores[cat.id] = calculateCategoryScore(cat.id, answers, categories);
    }
    const overallScore = calculateOverallScore(answers, categories);
    const overallLevel = scoreToLevel(overallScore) as MaturityLevel;

    const result = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: "Dynatrace Maturity",
      teamName: "Dynatrace Maturity",
      categoryScores,
      overallScore,
      overallLevel,
      answers,
    };

    sessionStorage.setItem("sre-assessment-result", JSON.stringify(result));
    sessionStorage.setItem("sre-assessment-type", "dynatrace");

    try {
      await saveDtMaturityResult(result);
    } catch (e) {
      console.error("Failed to save Dynatrace maturity result:", e);
    }

    setSaving(false);
    navigate("/results");
  };

  const allCurrentAnswered = currentCategory.questions.every(
    (q) => answers[q.id] !== undefined
  );
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  return (
    <div className="assess-container">
      <div className="assess-header">
        <h1>Dynatrace Maturity Assessment</h1>
        <p>
          Evaluate your organization's Dynatrace deployment maturity, coverage, and usage
          across key capabilities.
        </p>
      </div>

      <div className="progress-section">
        <div className="progress-label">
          <span>
            Category {currentCategoryIndex + 1} of {categories.length}
          </span>
          <span>
            {answeredCount} / {totalQuestions} questions answered ({progressPercent}%)
          </span>
        </div>
        <ProgressBar value={progressPercent} />
      </div>

      <div className="category-section">
        <div className="category-header">
          <h2 className="category-name">{currentCategory.name}</h2>
          <p className="category-desc">{currentCategory.description}</p>
        </div>

        {currentCategory.questions.map((question) => (
          <div className="question-block" key={question.id}>
            <p className="question-text">{question.text}</p>
            {question.options.map((option) => {
              const isSelected = answers[question.id] === option.value;
              const isPrevious = previousAnswers !== null && previousAnswers[question.id] === option.value;
              const levelColor = MaturityLevelColors[option.value as MaturityLevel];
              return (
                <div
                  key={option.value}
                  className={`option-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelect(question.id, option.value)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(question.id, option.value);
                    }
                  }}
                >
                  <span
                    className="option-level-badge"
                    style={{ backgroundColor: levelColor }}
                  >
                    {option.value}
                  </span>
                  <span className="option-label">{option.label}</span>
                  {isPrevious && <span className="previous-badge">Previous</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="nav-buttons">
        <Flex gap={8}>
          {currentCategoryIndex > 0 && (
            <Button
              variant="emphasized"
              onClick={() => setCurrentCategoryIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
          )}
        </Flex>
        <Flex gap={8}>
          {!isLastCategory ? (
            <Button
              variant="emphasized"
              disabled={!allCurrentAnswered}
              onClick={() => {
                setCurrentCategoryIndex((i) => Math.min(categories.length - 1, i + 1));
              }}
            >
              Next Category
            </Button>
          ) : (
            <Button
              variant="emphasized"
              disabled={answeredCount < totalQuestions || saving}
              onClick={handleSubmit}
            >
              {saving ? "Saving..." : "View Results"}
            </Button>
          )}
        </Flex>
      </div>
    </div>
  );
};
