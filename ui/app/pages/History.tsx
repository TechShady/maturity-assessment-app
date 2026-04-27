import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelColors,
  AssessmentResult,
} from "../types";
import "../styles/history.css";

export const History = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AssessmentResult[]>(() => {
    const stored = localStorage.getItem("sre-assessment-history");
    if (!stored) return [];
    return JSON.parse(stored);
  });

  const handleCardClick = (result: AssessmentResult) => {
    sessionStorage.setItem("sre-assessment-result", JSON.stringify(result));
    navigate("/results");
  };

  const handleClear = useCallback(() => {
    localStorage.removeItem("sre-assessment-history");
    setHistory([]);
  }, []);

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>Assessment History</h1>
        <p>Track your observability maturity progress over time.</p>
      </div>

      {sortedHistory.length === 0 ? (
        <div className="history-empty">
          <p>No assessments completed yet.</p>
          <Button
            variant="emphasized"
            onClick={() => navigate("/assess")}
            style={{ marginTop: 16 }}
          >
            Start Your First Assessment
          </Button>
        </div>
      ) : (
        <>
          <div className="history-list">
            {sortedHistory.map((item) => {
              const color =
                MaturityLevelColors[item.overallLevel as MaturityLevel];
              return (
                <div
                  className="history-card"
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                >
                  <div
                    className="history-level-badge"
                    style={{ backgroundColor: color }}
                  >
                    {item.overallLevel}
                  </div>
                  <div className="history-info">
                    <span className="history-team">{item.teamName}</span>
                    <span className="history-date">
                      {new Date(item.timestamp).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="history-level-label">
                      {MaturityLevelLabels[item.overallLevel as MaturityLevel]}
                    </span>
                  </div>
                  <div className="history-score-section">
                    <div className="history-score-value" style={{ color }}>
                      {item.overallScore.toFixed(1)}
                    </div>
                    <div className="history-score-label">/ 5.0</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="history-clear">
            <Button variant="default" onClick={handleClear}>
              Clear History
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
