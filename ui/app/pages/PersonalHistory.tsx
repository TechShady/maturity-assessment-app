import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import { Select, SelectTrigger, SelectContent, SelectOption } from "@dynatrace/strato-components-preview/forms";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelColors,
} from "../types";
import { personalGrowthCategories } from "../maturityModel";
import {
  getPersonalGrowthHistory,
  deletePersonalGrowthResult,
  AssessmentRecord,
} from "../grailService";
import "../styles/history.css";

export const PersonalHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const pgRecords = await getPersonalGrowthHistory();
      setHistory(pgRecords.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (e) {
      console.error("Failed to load history:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleCardClick = (result: AssessmentRecord) => {
    sessionStorage.setItem("sre-assessment-result", JSON.stringify(result));
    navigate("/results");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    setDeleting(id);
    try {
      await deletePersonalGrowthResult(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete assessment:", err);
    }
    setDeleting(null);
  };

  const users = Array.from(new Set(history.map((h) => h.user))).sort();

  const filteredHistory =
    selectedUser === "all"
      ? history
      : history.filter((h) => h.user === selectedUser);

  const sortedHistory = [...filteredHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getChange = (
    current: AssessmentRecord
  ): { scoreDiff: number; levelDiff: number } | null => {
    const sameUserHistory = sortedHistory.filter((h) => h.user === current.user);
    const currentIdx = sameUserHistory.findIndex((h) => h.id === current.id);
    if (currentIdx < 0 || currentIdx >= sameUserHistory.length - 1) return null;
    const previous = sameUserHistory[currentIdx + 1];
    return {
      scoreDiff: +(current.overallScore - previous.overallScore).toFixed(2),
      levelDiff: current.overallLevel - previous.overallLevel,
    };
  };

  const getCategoryChanges = (
    current: AssessmentRecord
  ): Record<string, number> | null => {
    const sameUserHistory = sortedHistory.filter((h) => h.user === current.user);
    const currentIdx = sameUserHistory.findIndex((h) => h.id === current.id);
    if (currentIdx < 0 || currentIdx >= sameUserHistory.length - 1) return null;
    const previous = sameUserHistory[currentIdx + 1];
    const changes: Record<string, number> = {};
    for (const cat of personalGrowthCategories) {
      const curr = current.categoryScores[cat.id] || 0;
      const prev = previous.categoryScores[cat.id] || 0;
      changes[cat.id] = +(curr - prev).toFixed(2);
    }
    return changes;
  };

  if (loading) {
    return (
      <div className="history-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading Personal Growth History...</h2>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="print-bar">
        <Button variant="emphasized" onClick={() => window.print()}>Print to PDF</Button>
      </div>
      <div className="history-header">
        <h1>Personal Growth History</h1>
        <p>Track your Dynatrace proficiency growth over time.</p>
      </div>

      {history.length > 0 && (
        <div className="history-filter">
          <label className="filter-label">Filter by User:</label>
          <Select value={selectedUser} onChange={(val) => setSelectedUser(val ?? "all")}>
            <SelectTrigger placeholder="All Users" />
            <SelectContent>
              <SelectOption value="all">All Users</SelectOption>
              {users.map((u) => (
                <SelectOption key={u} value={u}>{u}</SelectOption>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {sortedHistory.length === 0 ? (
        <div className="history-empty">
          <p>
            {history.length === 0
              ? "No personal growth assessments completed yet."
              : "No assessments found for the selected user."}
          </p>
          <Button
            variant="emphasized"
            onClick={() => navigate("/assess/personal")}
            style={{ marginTop: 16 }}
          >
            Start Personal Growth Assessment
          </Button>
        </div>
      ) : (
        <div className="history-list">
          {sortedHistory.map((item) => {
            const color = MaturityLevelColors[item.overallLevel as MaturityLevel];
            const change = getChange(item);
            const catChanges = getCategoryChanges(item);
            return (
              <div className="history-card" key={item.id} onClick={() => handleCardClick(item)}>
                <div className="history-card-main">
                  <div className="history-level-badge" style={{ backgroundColor: color }}>
                    {item.overallLevel}
                  </div>
                  <div className="history-info">
                    <span className="history-user">{item.user}</span>
                    <span className="history-team">{item.teamName}</span>
                    <span className="history-date">
                      {new Date(item.timestamp).toLocaleDateString(undefined, {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
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
                    {change && (
                      <div className={`history-change ${change.scoreDiff > 0 ? "positive" : change.scoreDiff < 0 ? "negative" : "neutral"}`}>
                        {change.scoreDiff > 0 ? "+" : ""}{change.scoreDiff}
                      </div>
                    )}
                  </div>
                  <div className="history-actions">
                    <Button variant="emphasized" onClick={(e) => handleDelete(e, item.id)} disabled={deleting === item.id}>
                      {deleting === item.id ? "..." : "Delete"}
                    </Button>
                  </div>
                </div>
                {catChanges && (
                  <div className="history-category-changes">
                    {personalGrowthCategories.map((cat) => {
                      const diff = catChanges[cat.id];
                      return (
                        <span key={cat.id} className={`cat-change-pill ${diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral"}`}>
                          {cat.name.split(" ")[0]}: {diff > 0 ? "+" : ""}{diff}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
