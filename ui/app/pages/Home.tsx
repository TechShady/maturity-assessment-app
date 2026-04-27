import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelDescriptions,
  MaturityLevelColors,
} from "../types";
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

  return (
    <div className="home-container">
      <div className="hero-section">
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div className="hero-badge">Dynatrace-Powered Observability</div>
            <h1 className="hero-title">Observability Transformation Journey Assessment</h1>
            <p className="hero-subtitle" style={{ margin: "0 0 32px 0" }}>
              Enable predictable digital reliability at enterprise scale. This
              application measures, tracks, and visualizes observability maturity across five
              levels — from foundational observability to autonomous reliability —
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
        <h2>Ready to assess your observability maturity?</h2>
        <p>
          Complete a guided assessment across five key dimensions to discover
          your current maturity level and get actionable recommendations.
        </p>
        <Button variant="emphasized" onClick={() => navigate("/assess")}>
          Start Assessment
        </Button>
      </div>
    </div>
  );
};
