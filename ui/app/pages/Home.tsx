import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelHeaders,
  MaturityLevelDescriptions,
  MaturityLevelColors,
} from "../types";
import { getDtMaturityHistory, getPersonalGrowthHistory } from "../grailService";
import { journeyImage } from "../../assets/journeyImage";
import "../styles/home.css";

const kpis = [
  { value: "30-50%", label: "Faster Incident Resolution" },
  { value: "40-60%", label: "Less Alert Noise" },
  { value: "Increased", label: "Application Availability" },
  { value: "Reduced", label: "Operational Cost" },
];

const levels = [
  MaturityLevel.Level1,
  MaturityLevel.Level2,
  MaturityLevel.Level3,
  MaturityLevel.Level4,
  MaturityLevel.Level5,
];

export const Home = () => {
  const navigate = useNavigate();
  const [reminder, setReminder] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [dtRecords, pgRecords] = await Promise.all([
          getDtMaturityHistory(),
          getPersonalGrowthHistory(),
        ]);
        const records = [...dtRecords, ...pgRecords];

        // Reminder: check if any user hasn't assessed in 30+ days
        if (records.length > 0) {
          const latest = records.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )[0];
          const daysSince = Math.floor(
            (Date.now() - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSince >= 90) {
            setReminder(`It's been ${daysSince} days since the last assessment. Time to reassess!`);
          } else if (daysSince >= 30) {
            setReminder(`${daysSince} days since the last assessment. Consider reassessing soon.`);
          }
        }
      } catch { /* silent */ }
    })();
  }, []);

  return (
    <div className="home-container">
      {reminder && (
        <div className="reminder-banner">
          <span className="reminder-icon">⏰</span>
          <span>{reminder}</span>
          <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginLeft: "auto" }}>
            Reassess Now
          </Button>
        </div>
      )}

      <div className="hero-section">
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div className="hero-badge">Dynatrace-Powered Observability</div>
            <h1 className="hero-title">Observability Transformation Journey Assessment</h1>
            <p className="hero-subtitle" style={{ margin: "0 0 32px 0" }}>
              Enable predictable digital reliability at enterprise scale. This
              application measures, tracks, and assesses observability maturity across five
              levels — from Reactive Foundational Observability to Visionary Autonomous Reliability —
              powered by Dynatrace intelligence.
            </p>
          </div>
          <div
            style={{
              flex: "0 0 420px",
              maxWidth: "420px",
              borderRadius: "16px",
              overflow: "hidden",
              background:
                "linear-gradient(135deg, rgba(20,150,255,0.08), rgba(99,57,199,0.08))",
              border: "1px solid rgba(20,150,255,0.25)",
              boxShadow:
                "0 0 24px rgba(20,150,255,0.18), 0 8px 32px rgba(0,0,0,0.35)",
              padding: "8px",
            }}
          >
            <img
              src={journeyImage}
              alt="Observability Transformation Journey"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: "10px",
              }}
            />
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <div className="kpi-card" key={kpi.label}>
            <div className="kpi-value" style={{ color: "#1496ff" }}>
              {kpi.value}
            </div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="levels-section">
        <h2>Five Levels of Observability Maturity</h2>
        <div className="levels-grid">
          {levels.map((level) => (
            <div className="level-card" key={level}>
              <div className="level-header-label" style={{ color: MaturityLevelColors[level] }}>
                {MaturityLevelHeaders[level]}
              </div>
              <div
                className="level-number"
                style={{ backgroundColor: MaturityLevelColors[level] }}
              >
                {level}
              </div>
              <div className="level-name">{MaturityLevelLabels[level]}</div>
              <div className="level-desc">
                {MaturityLevelDescriptions[level]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-section">
        <h2>Ready to assess?</h2>
        <p>
          Choose an assessment to evaluate your Dynatrace maturity or personal platform skills.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")}>
            Dynatrace Maturity
          </Button>
          <Button variant="emphasized" onClick={() => navigate("/assess/personal")}>
            Personal Growth
          </Button>
        </div>
      </div>
    </div>
  );
};
