import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import { Flex } from "@dynatrace/strato-components/layouts";
import { TextInput } from "@dynatrace/strato-components-preview/forms";
import { ProgressBar } from "@dynatrace/strato-components/content";
import {
  assessmentCategories,
  calculateCategoryScore,
  calculateOverallScore,
  scoreToLevel,
} from "../maturityModel";
import { AssessmentAnswers, MaturityLevelColors, MaturityLevel } from "../types";
import "../styles/assessment.css";

export const Assessment = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  const totalQuestions = useMemo(
    () => assessmentCategories.reduce((sum, c) => sum + c.questions.length, 0),
    []
  );
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const currentCategory = assessmentCategories[currentCategoryIndex];

  const handleSelect = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    const categoryScores: Record<string, number> = {};
    for (const cat of assessmentCategories) {
      categoryScores[cat.id] = calculateCategoryScore(
        cat.id,
        answers,
        assessmentCategories
      );
    }
    const overallScore = calculateOverallScore(answers, assessmentCategories);
    const overallLevel = scoreToLevel(overallScore) as MaturityLevel;

    const result = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      teamName: teamName || "My Team",
      categoryScores,
      overallScore,
      overallLevel,
      answers,
    };

    // Store in sessionStorage for the results page, and append to history in localStorage
    sessionStorage.setItem("sre-assessment-result", JSON.stringify(result));

    const history = JSON.parse(
      localStorage.getItem("sre-assessment-history") || "[]"
    );
    history.push(result);
    localStorage.setItem("sre-assessment-history", JSON.stringify(history));

    navigate("/results");
  };

  const allCurrentAnswered = currentCategory.questions.every(
    (q) => answers[q.id] !== undefined
  );
  const isLastCategory =
    currentCategoryIndex === assessmentCategories.length - 1;

  return (
    <div className="assess-container">
      <div className="assess-header">
        <h1>Observability Transformation Journey Assessment</h1>
        <p>
          Answer each question to evaluate your team's observability practices across five
          dimensions.
        </p>
      </div>

      <div className="team-input-section">
        <TextInput
          placeholder="Enter team or service name"
          value={teamName}
          onChange={setTeamName}
        />
      </div>

      <div className="progress-section">
        <div className="progress-label">
          <span>
            Category {currentCategoryIndex + 1} of{" "}
            {assessmentCategories.length}
          </span>
          <span>
            {answeredCount} / {totalQuestions} questions answered (
            {progressPercent}%)
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
              const levelColor =
                MaturityLevelColors[option.value as MaturityLevel];
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
              variant="default"
              onClick={() =>
                setCurrentCategoryIndex((i) => Math.max(0, i - 1))
              }
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
              onClick={() =>
                setCurrentCategoryIndex((i) =>
                  Math.min(assessmentCategories.length - 1, i + 1)
                )
              }
            >
              Next Category
            </Button>
          ) : (
            <Button
              variant="emphasized"
              disabled={answeredCount < totalQuestions}
              onClick={handleSubmit}
            >
              View Results
            </Button>
          )}
        </Flex>
      </div>
    </div>
  );
};
