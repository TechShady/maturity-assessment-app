import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dynatrace/strato-components/buttons";
import PptxGenJS from "pptxgenjs";
import {
  MaturityLevel,
  MaturityLevelLabels,
  MaturityLevelFullLabels,
  MaturityLevelColors,
} from "../types";
import { dynatraceMaturityCategories, personalGrowthCategories, scoreToLevel } from "../maturityModel";
import { getDtMaturityHistory, getPersonalGrowthHistory, AssessmentRecord } from "../grailService";
import { PlatformUsageData, fetchAllPlatformUsage } from "../platformUsageService";
import { useCustomerName } from "../CustomerNameContext";
import { journeyImage } from "../../assets/journeyImage";
import "../styles/qbr.css";

// Coverage capabilities for SKU mapping
const coverageCapabilities: { id: string; capability: string; sku: string }[] = [
  { id: "cov-infra", capability: "Infrastructure Monitoring", sku: "Full-Stack Monitoring" },
  { id: "cov-logs", capability: "Log Management", sku: "Log Management & Analytics" },
  { id: "cov-cloud", capability: "Cloud Monitoring", sku: "Infrastructure Monitoring" },
  { id: "cov-tracing", capability: "Distributed Tracing", sku: "Full-Stack Monitoring / APM" },
  { id: "cov-rum", capability: "Real User Monitoring", sku: "Digital Experience Monitoring" },
  { id: "cov-ai", capability: "AI Observability", sku: "AI Observability" },
  { id: "cov-security", capability: "Application Security", sku: "Application Security" },
  { id: "cov-k8s", capability: "Kubernetes Monitoring", sku: "Kubernetes Monitoring" },
  { id: "cov-db", capability: "Database Monitoring", sku: "Full-Stack Monitoring" },
  { id: "cov-network", capability: "Network Monitoring", sku: "Infrastructure Monitoring" },
  { id: "cov-debugger", capability: "Live Debugger", sku: "Full-Stack Monitoring" },
  { id: "cov-synthetics", capability: "Synthetic Monitoring", sku: "Synthetic Monitoring" },
  { id: "cov-replay", capability: "Session Replay", sku: "Digital Experience Monitoring" },
  { id: "cov-bizevents", capability: "Business Events", sku: "Business Analytics" },
  { id: "cov-bizinsights", capability: "Business Insights", sku: "Business Analytics" },
];

/** Compute badges earned given a chronological history (oldest first) */
function computeBadges(hist: AssessmentRecord[]): string[] {
  if (hist.length === 0) return [];
  const earned: string[] = [];

  if (hist.length >= 1) earned.push("First Assessment");
  if (hist.length >= 3) earned.push("Consistent Assessor");
  if (hist.length >= 5) earned.push("Veteran");

  if (hist.length >= 2) {
    const first = hist[0];
    const latest = hist[hist.length - 1];
    if (latest.overallScore > first.overallScore) earned.push("Improved");
    if (latest.overallLevel > first.overallLevel) earned.push("Level Up");
    if (hist.length >= 3) {
      const last3 = hist.slice(-3);
      if (last3[1].overallScore > last3[0].overallScore && last3[2].overallScore > last3[1].overallScore) {
        earned.push("On a Streak");
      }
    }
  }

  const latest = hist[hist.length - 1];
  const catScores = Object.values(latest.categoryScores);
  if (catScores.some((s) => s >= 4.5)) earned.push("Top Performer");
  if (catScores.length > 0 && catScores.every((s) => s >= 3.0)) earned.push("Well Rounded");
  if (latest.overallScore >= 4.5) earned.push("Visionary");

  return earned;
}

/** Get start and end dates for the previous quarter relative to a reference date */
function getPreviousQuarter(refDate: Date): { start: Date; end: Date } {
  const month = refDate.getMonth(); // 0-11
  const year = refDate.getFullYear();
  // Current quarter: Q1=Jan-Mar(0-2), Q2=Apr-Jun(3-5), Q3=Jul-Sep(6-8), Q4=Oct-Dec(9-11)
  const currentQStart = Math.floor(month / 3) * 3; // 0,3,6,9
  // Previous quarter end = day before current quarter start
  const prevQEnd = new Date(year, currentQStart, 0, 23, 59, 59, 999); // last day of prev month
  const prevQStartMonth = currentQStart - 3;
  const prevQStart = prevQStartMonth >= 0
    ? new Date(year, prevQStartMonth, 1)
    : new Date(year - 1, prevQStartMonth + 12, 1);
  return { start: prevQStart, end: prevQEnd };
}

export const QBRExport = () => {
  const navigate = useNavigate();
  const [dtHistory, setDtHistory] = useState<AssessmentRecord[]>([]);
  const [pgHistory, setPgHistory] = useState<AssessmentRecord[]>([]);
  const [platformData, setPlatformData] = useState<PlatformUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const { customerName } = useCustomerName();
  const [qbrDate, setQbrDate] = useState(() =>
    sessionStorage.getItem("qbr-date") || new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    sessionStorage.setItem("qbr-date", qbrDate);
  }, [qbrDate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [dt, pg, platform] = await Promise.all([
          getDtMaturityHistory(),
          getPersonalGrowthHistory(),
          fetchAllPlatformUsage(),
        ]);
        setDtHistory(dt.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setPgHistory(pg.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setPlatformData(platform);
      } catch (e) {
        console.error("Failed to load history:", e);
      }
      setLoading(false);
    })();
  }, []);

  const latestDtPerUser = useMemo(() => {
    const map: Record<string, AssessmentRecord> = {};
    for (const r of dtHistory) {
      if (!map[r.user] || new Date(r.timestamp) > new Date(map[r.user].timestamp)) {
        map[r.user] = r;
      }
    }
    return Object.values(map);
  }, [dtHistory]);

  const orgStats = useMemo(() => {
    if (latestDtPerUser.length === 0) return null;
    const catAvgs: Record<string, number> = {};
    for (const cat of dynatraceMaturityCategories) {
      const scores = latestDtPerUser.map((r) => r.categoryScores[cat.id] || 0).filter((s) => s > 0);
      catAvgs[cat.id] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }
    const overall = Object.values(catAvgs).filter((v) => v > 0);
    const avg = overall.length > 0 ? overall.reduce((a, b) => a + b, 0) / overall.length : 0;
    return { categoryScores: catAvgs, overall: avg, level: scoreToLevel(avg) };
  }, [latestDtPerUser]);

  // Coverage analysis
  const coverageAnalysis = useMemo(() => {
    return coverageCapabilities.map((cc) => {
      const scores: number[] = [];
      for (const record of latestDtPerUser) {
        if (record.answers && record.answers[cc.id] !== undefined) {
          scores.push(record.answers[cc.id]);
        }
      }
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { ...cc, avgScore: avg, hasData: scores.length > 0 };
    });
  }, [latestDtPerUser]);

  // Progress since previous assessment period
  const progressData = useMemo(() => {
    const users = Array.from(new Set(dtHistory.map((r) => r.user)));
    const changes: { category: string; change: number }[] = [];
    for (const cat of dynatraceMaturityCategories) {
      let totalChange = 0;
      let count = 0;
      for (const user of users) {
        const userHist = dtHistory
          .filter((r) => r.user === user)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (userHist.length >= 2) {
          const prev = userHist[userHist.length - 2].categoryScores[cat.id] || 0;
          const curr = userHist[userHist.length - 1].categoryScores[cat.id] || 0;
          totalChange += curr - prev;
          count++;
        }
      }
      changes.push({ category: cat.name, change: count > 0 ? +(totalChange / count).toFixed(2) : 0 });
    }
    return changes;
  }, [dtHistory]);

  // Expansion opportunities (coverage < 3)
  const expansionOpps = useMemo(() => {
    return coverageAnalysis
      .filter((c) => c.hasData && c.avgScore < 3)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 5);
  }, [coverageAnalysis]);

  // Top risks (lowest category scores)
  const topRisks = useMemo(() => {
    if (!orgStats) return [];
    return dynatraceMaturityCategories
      .map((cat) => ({ name: cat.name, score: orgStats.categoryScores[cat.id] }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [orgStats]);

  // Badge Recognition - new badges earned in the previous quarter based on QBR date
  const badgeRecognition = useMemo(() => {
    if (pgHistory.length === 0) return [];
    const refDate = new Date(qbrDate);
    const { start, end } = getPreviousQuarter(refDate);

    const users = Array.from(new Set(pgHistory.map((r) => r.user)));
    const results: { user: string; newBadges: string[] }[] = [];

    for (const user of users) {
      const userHist = pgHistory
        .filter((r) => r.user === user)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Badges at the start of the quarter (history before quarter start)
      const beforeQuarter = userHist.filter((r) => new Date(r.timestamp) < start);
      const badgesBefore = computeBadges(beforeQuarter);

      // Badges at the end of the quarter (history through end of quarter)
      const throughQuarter = userHist.filter((r) => new Date(r.timestamp) <= end);
      const badgesAfter = computeBadges(throughQuarter);

      // New badges = in badgesAfter but not in badgesBefore
      const newBadges = badgesAfter.filter((b) => !badgesBefore.includes(b));
      if (newBadges.length > 0) {
        results.push({ user, newBadges });
      }
    }

    return results;
  }, [pgHistory, qbrDate]);

  // ---- Platform Usage helpers (SVG charts + recommendations) ----

  const svgSparkline = (data: { value: number }[], color: string, w = 600, h = 80): string => {
    if (!data || data.length === 0) return `<div style="padding:20px;text-align:center;opacity:0.5;font-style:italic">No trend data available</div>`;
    const values = data.map((d) => Number(d.value) || 0);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const stepX = w / Math.max(data.length - 1, 1);
    const points = values.map((v, i) => `${(i * stepX).toFixed(1)},${(h - ((v - min) / range) * (h - 10) - 5).toFixed(1)}`).join(" ");
    const areaPoints = `0,${h} ${points} ${w},${h}`;
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="display:block">
      <polygon points="${areaPoints}" fill="${color}" opacity="0.15"/>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  };

  const svgBarChart = (items: { label: string; value: number }[], color: string): string => {
    if (!items || items.length === 0) return "";
    const max = Math.max(...items.map((i) => i.value), 1);
    return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact">
      ${items
        .map((item) => {
          const pct = Math.max((item.value / max) * 100, 1);
          return `<tr>
            <td style="width:32%;padding:4px 8px 4px 0;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle" title="${item.label}">${item.label}</td>
            <td style="width:55%;padding:4px 8px;vertical-align:middle">
              <div style="height:18px;width:100%;background:#f0f2f5;border-radius:9px;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact">
                <div style="width:${pct}%;height:18px;background:${color};border-radius:9px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
              </div>
            </td>
            <td style="width:13%;padding:4px 0 4px 8px;text-align:right;font-weight:600;color:${color};vertical-align:middle;white-space:nowrap">${item.value.toLocaleString()}</td>
          </tr>`;
        })
        .join("")}
    </table>`;
  };

  const buildRecommendations = (pd: PlatformUsageData | null) => {
    const recs: { severity: "critical" | "warning" | "info"; title: string; detail: string }[] = [];
    if (!pd) return recs;
    if (pd.adoption && pd.adoption.monthlyActiveUsers < 5) {
      recs.push({ severity: "critical", title: "Increase Platform Adoption", detail: `Only ${pd.adoption.monthlyActiveUsers} monthly active user(s). Run hands-on workshops and identify champions to expand usage organization-wide.` });
    }
    if (pd.mttr && pd.mttr.previousAvgMinutes > 0 && pd.mttr.currentAvgMinutes > pd.mttr.previousAvgMinutes) {
      recs.push({ severity: "critical", title: "Address Rising MTTR", detail: `Resolution time increased from ${pd.mttr.previousAvgMinutes.toFixed(0)} to ${pd.mttr.currentAvgMinutes.toFixed(0)} minutes. Review Davis alerting configuration and implement auto-remediation workflows.` });
    }
    if (pd.slo && pd.slo.totalSlos === 0) {
      recs.push({ severity: "warning", title: "Configure SLOs", detail: "No SLOs defined. Start with availability and latency SLOs for critical user-facing services to drive measurable reliability improvements." });
    }
    if (pd.workflows && pd.workflows.totalExecutions === 0) {
      recs.push({ severity: "warning", title: "Enable Workflow Automation", detail: "No workflows running. Implement auto-remediation for common operational issues (disk cleanup, restart, scaling) to reduce engineering toil." });
    }
    if (pd.workflows && pd.workflows.totalExecutions > 0 && pd.workflows.successRate < 90) {
      recs.push({ severity: "warning", title: "Improve Workflow Reliability", detail: `Workflow success rate is ${pd.workflows.successRate.toFixed(0)}%. Investigate failing executions and stabilize automation pipelines.` });
    }
    if (pd.entityGrowth && pd.entityGrowth.hosts.current < pd.entityGrowth.hosts.previous) {
      recs.push({ severity: "critical", title: "Entity Count Declining", detail: `Hosts decreased from ${pd.entityGrowth.hosts.previous} to ${pd.entityGrowth.hosts.current}. Investigate whether agents are being removed or infrastructure decommissioned.` });
    }
    if (pd.problems && pd.problems.totalProblems > 0 && (pd.problems.withRootCause / pd.problems.totalProblems) < 0.5) {
      recs.push({ severity: "warning", title: "Improve Root-Cause Coverage", detail: `Only ${((pd.problems.withRootCause / pd.problems.totalProblems) * 100).toFixed(0)}% of problems have a root cause identified. Increase OneAgent coverage and Smartscape topology completeness.` });
    }
    if (pd.webVitals && pd.webVitals.lcp.current > 2500) {
      recs.push({ severity: "warning", title: "Optimize Largest Contentful Paint", detail: `LCP is ${pd.webVitals.lcp.current.toFixed(0)} ms (Google "good" threshold: 2500 ms). Audit image sizes, server response times, and render-blocking resources.` });
    }
    if (pd.webVitals && pd.webVitals.cls.current > 0.1) {
      recs.push({ severity: "info", title: "Reduce Cumulative Layout Shift", detail: `CLS is ${pd.webVitals.cls.current.toFixed(3)} (target: < 0.1). Reserve space for dynamic content and avoid late-loading layout-affecting elements.` });
    }
    if (pd.security && pd.security.vulnerabilitiesDetected > 0 && pd.security.vulnerabilitiesResolved === 0) {
      recs.push({ severity: "critical", title: "Triage Open Vulnerabilities", detail: `${pd.security.vulnerabilitiesDetected.toLocaleString()} vulnerabilities detected with none resolved. Establish a security review cadence and remediation SLAs.` });
    }
    return recs;
  };

  const generateQBRHtml = () => {
    if (!orgStats) return;

    const displayName = customerName || "Customer";
    const overallColor = MaturityLevelColors[orgStats.level as MaturityLevel];
    const levelLabel = MaturityLevelFullLabels[orgStats.level as MaturityLevel];

    const progressRows = progressData
      .map((p) => {
        const changeStr = p.change > 0 ? `<span style="color:#59c46b">+${p.change}</span>` :
          p.change < 0 ? `<span style="color:#c4190b">${p.change}</span>` :
          `<span style="color:#888">—</span>`;
        return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${p.category}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${changeStr}</td></tr>`;
      })
      .join("");

    const catRows = dynatraceMaturityCategories
      .map((cat) => {
        const score = orgStats.categoryScores[cat.id] || 0;
        const color = MaturityLevelColors[scoreToLevel(score) as MaturityLevel];
        const pct = (score / 5) * 100;
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">${cat.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:8px;background:#eee;border-radius:4px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
              </div>
              <span style="color:${color};font-weight:700;min-width:30px">${score.toFixed(1)}</span>
            </div>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:${color}">L${scoreToLevel(score)}</td>
        </tr>`;
      })
      .join("");

    const riskRows = topRisks
      .map((r) => {
        const color = MaturityLevelColors[scoreToLevel(r.score) as MaturityLevel];
        return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${r.name}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:${color};font-weight:700">${r.score.toFixed(1)}</td></tr>`;
      })
      .join("");

    const expansionRows = expansionOpps.length > 0
      ? expansionOpps.map((e) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${e.capability}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${e.sku}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#ef8b0e;font-weight:600">${e.avgScore.toFixed(1)}/5</td></tr>`
        ).join("")
      : `<tr><td colspan="3" style="padding:12px;text-align:center;opacity:0.5">No expansion opportunities identified</td></tr>`;

    const badgeRows = badgeRecognition.length > 0
      ? badgeRecognition.map((r) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">${r.user}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${r.newBadges.join(", ")}</td></tr>`
        ).join("")
      : `<tr><td colspan="2" style="padding:12px;text-align:center;opacity:0.5">No new badges attained</td></tr>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>QBR - ${displayName} - ${qbrDate}</title>
<style>
  *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
  @media print {*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a1a;line-height:1.5}
  h1{font-size:28px;margin:0 0 4px}
  h2{font-size:20px;margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid #eee}
  h3{font-size:16px;margin:20px 0 8px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th{text-align:left;padding:10px 12px;background:#f5f5f5;font-size:13px;font-weight:600;border-bottom:2px solid #ddd}
  .hero{text-align:center;padding:32px;margin:24px 0;border:3px solid ${overallColor};border-radius:16px}
  .hero .score{font-size:64px;font-weight:800;color:${overallColor}}
  .hero .level{font-size:18px;margin-top:4px}
  .kpi-row{display:flex;gap:16px;margin:16px 0}
  .kpi{flex:1;text-align:center;padding:16px;background:#f8f8f8;border-radius:10px}
  .kpi .value{font-size:28px;font-weight:700}
  .kpi .label{font-size:12px;opacity:0.6;margin-top:4px}
  .footer{margin-top:48px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;opacity:0.5;text-align:center}
  @media print{body{padding:20px}}
</style></head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px">
  <div>
    <h1>${displayName}</h1>
    <div style="font-size:14px;opacity:0.6">Quarterly Business Review — SRE Maturity Assessment</div>
  </div>
  <div style="text-align:right;font-size:13px;opacity:0.6">
    <div>${new Date(qbrDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
    <div>Prepared by Dynatrace</div>
  </div>
</div>

<div style="text-align:center;margin:24px 0 32px">
  <img src="${journeyImage}" alt="Observability Transformation Journey" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1)"/>
</div>

<h2>Executive Summary</h2>
<div class="hero">
  <div class="score">${orgStats.overall.toFixed(1)}</div>
  <div class="level">Level ${orgStats.level}: ${levelLabel}</div>
  <div style="font-size:13px;opacity:0.6;margin-top:8px">Organization Maturity Score (1-5 scale)</div>
</div>

<div class="kpi-row">
  <div class="kpi"><div class="value">${latestDtPerUser.length}</div><div class="label">Assessors</div></div>
  <div class="kpi"><div class="value">${dtHistory.length}</div><div class="label">DT Assessments</div></div>
  <div class="kpi"><div class="value">${new Set(latestDtPerUser.map(r=>r.teamName)).size}</div><div class="label">Teams</div></div>
  <div class="kpi"><div class="value">${pgHistory.length}</div><div class="label">PG Assessments</div></div>
</div>

<hr style="margin:40px 0;border:none;border-top:3px solid #1496ff">
<h1 style="color:#1496ff;font-size:22px">Section 1: Dynatrace Maturity</h1>

<h2>Maturity by Category</h2>
<table>
  <thead><tr><th>Category</th><th>Score</th><th>Level</th></tr></thead>
  <tbody>${catRows}</tbody>
</table>

<h2>Progress Since Last Assessment</h2>
<table>
  <thead><tr><th>Category</th><th style="text-align:center">Change</th></tr></thead>
  <tbody>${progressRows}</tbody>
</table>

<div style="display:flex;gap:24px">
  <div style="flex:1">
    <h2>Top 3 Risk Areas</h2>
    <table>
      <thead><tr><th>Category</th><th>Score</th></tr></thead>
      <tbody>${riskRows}</tbody>
    </table>
  </div>
  <div style="flex:1">
    <h2>Expansion Opportunities</h2>
    <table>
      <thead><tr><th>Capability</th><th>SKU</th><th>Coverage</th></tr></thead>
      <tbody>${expansionRows}</tbody>
    </table>
  </div>
</div>

<h2>Recommended Actions</h2>
<ol style="padding-left:20px">
${topRisks.map((r) => `  <li style="margin-bottom:8px"><strong>${r.name}</strong> (Score: ${r.score.toFixed(1)}) — Focus on advancing this practice area from Level ${scoreToLevel(r.score)} to Level ${Math.min(scoreToLevel(r.score) + 1, 5)}</li>`).join("\n")}
${expansionOpps.length > 0 ? `  <li style="margin-bottom:8px"><strong>Expand coverage</strong> in ${expansionOpps.map(e => e.capability).join(", ")} to close observability blind spots</li>` : ""}
  <li style="margin-bottom:8px"><strong>Schedule reassessment</strong> in 90 days to track progress against these goals</li>
</ol>

<hr style="margin:40px 0;border:none;border-top:3px solid #6f2da8">
<h1 style="color:#6f2da8;font-size:22px">Section 2: Personal Growth</h1>

<h2>Personal Growth Achievement</h2>
<table>
  <thead><tr><th>User</th><th>New Badges Earned</th></tr></thead>
  <tbody>${badgeRows}</tbody>
</table>

<hr style="margin:40px 0;border:none;border-top:3px solid #14bae4">
<h1 style="color:#14bae4;font-size:22px">Section 3: Platform Usage</h1>
<p style="opacity:0.7;font-size:13px;margin-top:-4px">Operational telemetry from this Dynatrace environment over the trailing 90 days. These indicators show how effectively the platform is being used to drive reliability, automation, and customer experience outcomes.</p>

${platformData ? `
<h2>Mean Time to Resolution (MTTR)</h2>
<div class="kpi-row">
  <div class="kpi"><div class="value">${platformData.mttr ? platformData.mttr.currentAvgMinutes.toFixed(0) + ' min' : 'N/A'}</div><div class="label">Current Quarter</div></div>
  <div class="kpi"><div class="value">${platformData.mttr ? platformData.mttr.previousAvgMinutes.toFixed(0) + ' min' : 'N/A'}</div><div class="label">Previous Quarter</div></div>
  <div class="kpi"><div class="value" style="color:${platformData.mttr && platformData.mttr.currentAvgMinutes < platformData.mttr.previousAvgMinutes ? '#59c46b' : platformData.mttr && platformData.mttr.currentAvgMinutes > platformData.mttr.previousAvgMinutes ? '#c4190b' : '#888'}">${platformData.mttr && platformData.mttr.previousAvgMinutes > 0 ? ((1 - platformData.mttr.currentAvgMinutes / platformData.mttr.previousAvgMinutes) * 100).toFixed(0) + '%' : '—'}</div><div class="label">Improvement</div></div>
</div>
<div style="background:#fafbfc;border:1px solid #eee;border-radius:8px;padding:16px;margin:12px 0">
  <div style="font-size:12px;font-weight:600;opacity:0.7;margin-bottom:6px">Weekly MTTR Trend (90d)</div>
  ${platformData.mttr ? svgSparkline(platformData.mttr.weeklyTrend, "#14bae4") : ""}
</div>
<p style="font-size:13px;line-height:1.6;color:#444">
  ${platformData.mttr && platformData.mttr.previousAvgMinutes > 0
    ? (platformData.mttr.currentAvgMinutes < platformData.mttr.previousAvgMinutes
        ? `<strong style="color:#59c46b">MTTR is improving.</strong> The team is leveraging Dynatrace effectively for faster root-cause identification, reducing time-to-resolution by ${((1 - platformData.mttr.currentAvgMinutes / platformData.mttr.previousAvgMinutes) * 100).toFixed(0)}% versus the prior quarter.`
        : `<strong style="color:#c4190b">MTTR is increasing.</strong> Resolution times grew by ${((platformData.mttr.currentAvgMinutes / platformData.mttr.previousAvgMinutes - 1) * 100).toFixed(0)}%. Consider reviewing alert routing, on-call rotations, and runbook automation.`)
    : "Insufficient historical data to compare quarters."}
</p>

<h2>Problem Detection &amp; Resolution</h2>
<div class="kpi-row">
  <div class="kpi"><div class="value">${platformData.problems?.totalProblems.toLocaleString() || 0}</div><div class="label">Total Problems (90d)</div></div>
  <div class="kpi"><div class="value">${platformData.problems && platformData.problems.totalProblems > 0 ? ((platformData.problems.autoResolved / platformData.problems.totalProblems) * 100).toFixed(0) + '%' : '0%'}</div><div class="label">Auto-Resolved (&lt;5min)</div></div>
  <div class="kpi"><div class="value">${platformData.problems && platformData.problems.totalProblems > 0 ? ((platformData.problems.withRootCause / platformData.problems.totalProblems) * 100).toFixed(0) + '%' : '0%'}</div><div class="label">Root Cause Identified</div></div>
</div>
<div style="background:#fafbfc;border:1px solid #eee;border-radius:8px;padding:16px;margin:12px 0">
  <div style="font-size:12px;font-weight:600;opacity:0.7;margin-bottom:6px">Weekly Problem Volume (90d)</div>
  ${platformData.problems ? svgSparkline(platformData.problems.weeklyTrend, "#6f2da8") : ""}
</div>
<p style="font-size:13px;line-height:1.6;color:#444">
  Davis AI detected <strong>${(platformData.problems?.totalProblems || 0).toLocaleString()}</strong> problems over the last 90 days, with
  <strong>${platformData.problems && platformData.problems.totalProblems > 0 ? ((platformData.problems.withRootCause / platformData.problems.totalProblems) * 100).toFixed(0) : 0}%</strong>
  receiving automated root-cause analysis. Higher root-cause coverage correlates with deeper Smartscape topology and broader OneAgent deployment.
</p>

<h2>Platform Adoption</h2>
<div class="kpi-row">
  <div class="kpi"><div class="value">${platformData.adoption?.monthlyActiveUsers || 0}</div><div class="label">Monthly Active Users</div></div>
  <div class="kpi"><div class="value">${platformData.adoption?.totalUniqueUsers || 0}</div><div class="label">Unique Users (90d)</div></div>
  <div class="kpi"><div class="value">${platformData.adoption?.dailyActiveUsers && platformData.adoption.dailyActiveUsers.length > 0 ? Math.round(platformData.adoption.dailyActiveUsers.reduce((s,d)=>s+(d.value||0),0) / platformData.adoption.dailyActiveUsers.length) : 0}</div><div class="label">Avg Daily Active Users</div></div>
</div>
<div style="background:#fafbfc;border:1px solid #eee;border-radius:8px;padding:16px;margin:12px 0">
  <div style="font-size:12px;font-weight:600;opacity:0.7;margin-bottom:6px">Daily Active Users Trend (90d)</div>
  ${platformData.adoption ? svgSparkline(platformData.adoption.dailyActiveUsers, "#9b51e0") : ""}
</div>
${platformData.adoption && platformData.adoption.featureBreakdown.length > 0 ? `
<div style="page-break-inside:avoid;break-inside:avoid">
<h3 style="margin-top:20px">Top Apps by Usage</h3>
${svgBarChart(platformData.adoption.featureBreakdown.slice(0, 8).map((f) => ({ label: f.feature, value: f.count })), "#9b51e0")}
</div>
` : ""}
<p style="font-size:13px;line-height:1.6;color:#444">
  Adoption breadth shows how broadly Dynatrace is being used across teams. <strong>${platformData.adoption?.monthlyActiveUsers || 0}</strong> users active in the last 30 days. Sustained growth in Daily Active Users is the strongest predictor of platform stickiness and renewal value.
</p>

<h2>SLO Compliance</h2>
<div class="kpi-row">
  <div class="kpi"><div class="value">${platformData.slo?.totalSlos || 0}</div><div class="label">SLOs Configured</div></div>
  <div class="kpi"><div class="value">${platformData.slo?.meetingTarget || 0}</div><div class="label">Meeting Target</div></div>
  <div class="kpi"><div class="value">${platformData.slo && platformData.slo.totalSlos > 0 ? ((platformData.slo.meetingTarget / platformData.slo.totalSlos) * 100).toFixed(0) + '%' : '0%'}</div><div class="label">Compliance Rate</div></div>
</div>
<div style="background:#fafbfc;border:1px solid #eee;border-radius:8px;padding:16px;margin:12px 0">
  <div style="font-size:12px;font-weight:600;opacity:0.7;margin-bottom:6px">SLO Activity Trend (90d)</div>
  ${platformData.slo ? svgSparkline(platformData.slo.complianceTrend, "#ff6600") : ""}
</div>
<p style="font-size:13px;line-height:1.6;color:#444">
  ${platformData.slo && platformData.slo.totalSlos > 0
    ? `<strong>${platformData.slo.totalSlos}</strong> service-level objectives are being tracked. SLOs are the foundation of error-budget-driven engineering and a critical step toward Level 4 (Proficient) maturity.`
    : "<strong style='color:#c4190b'>No SLOs are configured.</strong> Defining SLOs is a critical step toward measuring and improving reliability — start with golden-signal SLOs (availability, latency) for top user-facing services."}
</p>

<h2>Workflow Automation</h2>
<div class="kpi-row">
  <div class="kpi"><div class="value">${(platformData.workflows?.totalExecutions || 0).toLocaleString()}</div><div class="label">Executions (90d)</div></div>
  <div class="kpi"><div class="value" style="color:${(platformData.workflows?.successRate || 0) >= 95 ? '#59c46b' : (platformData.workflows?.successRate || 0) >= 80 ? '#ef8b0e' : '#c4190b'}">${platformData.workflows ? platformData.workflows.successRate.toFixed(0) + '%' : '0%'}</div><div class="label">Success Rate</div></div>
  <div class="kpi"><div class="value">${platformData.workflows?.topWorkflows?.length || 0}</div><div class="label">Active Workflows</div></div>
</div>
<div style="background:#fafbfc;border:1px solid #eee;border-radius:8px;padding:16px;margin:12px 0">
  <div style="font-size:12px;font-weight:600;opacity:0.7;margin-bottom:6px">Weekly Workflow Executions (90d)</div>
  ${platformData.workflows ? svgSparkline(platformData.workflows.weeklyTrend, "#1496ff") : ""}
</div>
${platformData.workflows && platformData.workflows.topWorkflows.length > 0 ? `
<div style="page-break-inside:avoid;break-inside:avoid">
<h3 style="margin-top:20px">Top Workflows by Execution Volume</h3>
${svgBarChart(platformData.workflows.topWorkflows.slice(0, 5).map((w) => ({ label: w.name, value: w.executions })), "#1496ff")}
</div>
` : ""}
<p style="font-size:13px;line-height:1.6;color:#444">
  Workflow automation eliminates operational toil and reduces MTTR. ${(platformData.workflows?.totalExecutions || 0) === 0 ? "<strong style='color:#c4190b'>No workflows are running.</strong> Implementing auto-remediation for common operational issues (disk cleanup, restart, scaling) can dramatically reduce engineering effort." : `<strong>${(platformData.workflows?.totalExecutions || 0).toLocaleString()}</strong> executions with a <strong style="color:${(platformData.workflows?.successRate || 0) >= 95 ? '#59c46b' : '#ef8b0e'}">${(platformData.workflows?.successRate || 0).toFixed(0)}%</strong> success rate.`}
</p>

<h2>Monitored Entity Growth</h2>
<div class="kpi-row">
  <div class="kpi"><div class="value">${platformData.entityGrowth?.hosts.current || 0}${platformData.entityGrowth && platformData.entityGrowth.hosts.current > platformData.entityGrowth.hosts.previous ? ' <span style="color:#59c46b;font-size:18px">▲</span>' : platformData.entityGrowth && platformData.entityGrowth.hosts.current < platformData.entityGrowth.hosts.previous ? ' <span style="color:#c4190b;font-size:18px">▼</span>' : ''}</div><div class="label">Hosts</div></div>
  <div class="kpi"><div class="value">${platformData.entityGrowth?.services.current || 0}${platformData.entityGrowth && platformData.entityGrowth.services.current > platformData.entityGrowth.services.previous ? ' <span style="color:#59c46b;font-size:18px">▲</span>' : platformData.entityGrowth && platformData.entityGrowth.services.current < platformData.entityGrowth.services.previous ? ' <span style="color:#c4190b;font-size:18px">▼</span>' : ''}</div><div class="label">Services</div></div>
  <div class="kpi"><div class="value">${platformData.entityGrowth?.applications.current || 0}${platformData.entityGrowth && platformData.entityGrowth.applications.current > platformData.entityGrowth.applications.previous ? ' <span style="color:#59c46b;font-size:18px">▲</span>' : platformData.entityGrowth && platformData.entityGrowth.applications.current < platformData.entityGrowth.applications.previous ? ' <span style="color:#c4190b;font-size:18px">▼</span>' : ''}</div><div class="label">Applications</div></div>
</div>
<div style="background:#fafbfc;border:1px solid #eee;border-radius:8px;padding:16px;margin:12px 0">
  <div style="font-size:12px;font-weight:600;opacity:0.7;margin-bottom:6px">New Hosts Onboarded per Week (90d)</div>
  ${platformData.entityGrowth ? svgSparkline(platformData.entityGrowth.weeklyGrowth, "#59c46b") : ""}
</div>
<p style="font-size:13px;line-height:1.6;color:#444">
  Total monitored footprint: <strong>${(platformData.entityGrowth?.hosts.current || 0) + (platformData.entityGrowth?.services.current || 0) + (platformData.entityGrowth?.applications.current || 0)}</strong> entities under observation. Consistent entity growth signals expanding platform value and deeper organizational coverage.
</p>

<h2>User Experience (Core Web Vitals)</h2>
<div class="kpi-row">
  <div class="kpi"><div class="value" style="color:${platformData.webVitals && platformData.webVitals.lcp.current <= 2500 ? '#59c46b' : platformData.webVitals && platformData.webVitals.lcp.current <= 4000 ? '#ef8b0e' : '#c4190b'}">${platformData.webVitals ? platformData.webVitals.lcp.current.toFixed(0) + ' ms' : 'N/A'}</div><div class="label">LCP <span style="opacity:0.5">(target ≤ 2500)</span></div></div>
  <div class="kpi"><div class="value" style="color:${platformData.webVitals && platformData.webVitals.cls.current <= 0.1 ? '#59c46b' : platformData.webVitals && platformData.webVitals.cls.current <= 0.25 ? '#ef8b0e' : '#c4190b'}">${platformData.webVitals ? platformData.webVitals.cls.current.toFixed(3) : 'N/A'}</div><div class="label">CLS <span style="opacity:0.5">(target ≤ 0.1)</span></div></div>
  <div class="kpi"><div class="value" style="color:${platformData.webVitals && platformData.webVitals.inp.current <= 200 ? '#59c46b' : platformData.webVitals && platformData.webVitals.inp.current <= 500 ? '#ef8b0e' : '#c4190b'}">${platformData.webVitals ? platformData.webVitals.inp.current.toFixed(0) + ' ms' : 'N/A'}</div><div class="label">INP <span style="opacity:0.5">(target ≤ 200)</span></div></div>
  <div class="kpi"><div class="value" style="color:${platformData.webVitals && platformData.webVitals.apdex.current >= 0.94 ? '#59c46b' : platformData.webVitals && platformData.webVitals.apdex.current >= 0.85 ? '#ef8b0e' : '#c4190b'}">${platformData.webVitals ? platformData.webVitals.apdex.current.toFixed(2) : 'N/A'}</div><div class="label">Apdex Score</div></div>
</div>
${platformData.webVitals ? (() => {
  const wv = platformData.webVitals;
  const charts = [
    { label: "LCP",   cur: wv.lcp.current,   target: 2500, unit: "ms",  fmt: (n: number) => n.toFixed(0), good: wv.lcp.current <= 2500,    higher: false },
    { label: "CLS",   cur: wv.cls.current,   target: 0.1,  unit: "",    fmt: (n: number) => n.toFixed(3), good: wv.cls.current <= 0.1,     higher: false },
    { label: "INP",   cur: wv.inp.current,   target: 200,  unit: "ms",  fmt: (n: number) => n.toFixed(0), good: wv.inp.current <= 200,     higher: false },
    { label: "Apdex", cur: wv.apdex.current, target: 0.94, unit: "",    fmt: (n: number) => n.toFixed(2), good: wv.apdex.current >= 0.94,  higher: true },
  ];
  return `<div style="page-break-inside:avoid;break-inside:avoid;background:#fafbfc;border:1px solid #eee;border-radius:8px;padding:16px;margin:12px 0">
    <div style="font-size:12px;font-weight:600;opacity:0.7;margin-bottom:10px">Current vs. Target</div>
    <table style="width:100%;border-collapse:separate;border-spacing:8px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact">
      <tr>
        ${charts.map((c) => {
          const max = Math.max(c.cur, c.target) * 1.15 || 1;
          const curPct = (c.cur / max) * 100;
          const tgtPct = (c.target / max) * 100;
          const curColor = c.good ? "#14bae4" : "#c4190b";
          return `<td style="width:25%;text-align:center;vertical-align:bottom;padding:0 4px">
            <div style="font-size:11px;font-weight:600;margin-bottom:6px">${c.label}</div>
            <div style="display:inline-block;height:120px;width:100%;position:relative;border-bottom:2px solid #ccc">
              <div style="position:absolute;left:25%;bottom:0;width:20%;height:${curPct}%;background:${curColor};border-radius:3px 3px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
              <div style="position:absolute;left:55%;bottom:0;width:20%;height:${tgtPct}%;background:#888;border-radius:3px 3px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
            </div>
            <div style="font-size:10px;margin-top:6px;color:#444">
              <span style="color:${curColor};font-weight:700">${c.fmt(c.cur)}${c.unit}</span>
              <span style="opacity:0.5"> / </span>
              <span style="color:#666">${c.fmt(c.target)}${c.unit}</span>
            </div>
          </td>`;
        }).join("")}
      </tr>
    </table>
    <div style="font-size:10px;color:#888;margin-top:8px;text-align:center">
      <span style="display:inline-block;width:10px;height:10px;background:#14bae4;vertical-align:middle;margin-right:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></span> Current
      &nbsp;&nbsp;
      <span style="display:inline-block;width:10px;height:10px;background:#888;vertical-align:middle;margin-right:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></span> Target
    </div>
  </div>`;
})() : ""}
<p style="font-size:13px;line-height:1.6;color:#444">
  Core Web Vitals measure real user experience. Improvements here translate directly to business outcomes: better engagement, lower bounce rates, and higher conversion. Google considers a site "good" when all three vitals meet their thresholds.
</p>

<h2>Security Posture</h2>
<div class="kpi-row">
  <div class="kpi"><div class="value">${(platformData.security?.vulnerabilitiesDetected || 0).toLocaleString()}</div><div class="label">Vulnerabilities Detected</div></div>
  <div class="kpi"><div class="value">${(platformData.security?.vulnerabilitiesResolved || 0).toLocaleString()}</div><div class="label">Resolved</div></div>
  <div class="kpi"><div class="value">${(platformData.security?.attacksBlocked || 0).toLocaleString()}</div><div class="label">Findings</div></div>
</div>
<div style="background:#fafbfc;border:1px solid #eee;border-radius:8px;padding:16px;margin:12px 0">
  <div style="font-size:12px;font-weight:600;opacity:0.7;margin-bottom:6px">Vulnerability Activity Trend</div>
  ${platformData.security ? svgSparkline(platformData.security.riskScoreTrend, "#c4190b") : ""}
</div>
<p style="font-size:13px;line-height:1.6;color:#444">
  Application Security continuously detects exploitable vulnerabilities in production. ${(platformData.security?.vulnerabilitiesDetected || 0) > 0 ? `<strong>${(platformData.security?.vulnerabilitiesResolved || 0).toLocaleString()}</strong> of <strong>${(platformData.security?.vulnerabilitiesDetected || 0).toLocaleString()}</strong> vulnerabilities have been resolved this quarter.` : "Security telemetry is not active in this environment — enabling Application Security unlocks runtime vulnerability detection."}
</p>

<h2>Platform Health Summary</h2>
<table>
  <thead><tr><th>Indicator</th><th>Status</th><th>Details</th></tr></thead>
  <tbody>
    <tr><td>MTTR Trend</td><td>${platformData.mttr ? (platformData.mttr.currentAvgMinutes < platformData.mttr.previousAvgMinutes ? '✅ Improving' : platformData.mttr.currentAvgMinutes > platformData.mttr.previousAvgMinutes ? '🔴 Increasing' : '⚠️ Stable') : '⚪ No Data'}</td><td>${platformData.mttr ? platformData.mttr.currentAvgMinutes.toFixed(0) + ' min avg' : ''}</td></tr>
    <tr><td>User Adoption</td><td>${platformData.adoption ? (platformData.adoption.monthlyActiveUsers >= 5 ? '✅ Healthy' : platformData.adoption.monthlyActiveUsers >= 2 ? '⚠️ Moderate' : '🔴 Low') : '⚪ No Data'}</td><td>${platformData.adoption ? platformData.adoption.monthlyActiveUsers + ' MAU' : ''}</td></tr>
    <tr><td>Problem Detection</td><td>${platformData.problems ? (platformData.problems.totalProblems > 0 ? '✅ Active' : '🔴 Inactive') : '⚪ No Data'}</td><td>${platformData.problems ? (platformData.problems.totalProblems || 0).toLocaleString() + ' problems' : ''}</td></tr>
    <tr><td>SLOs Configured</td><td>${platformData.slo ? (platformData.slo.totalSlos >= 5 ? '✅ Well Defined' : platformData.slo.totalSlos > 0 ? '⚠️ Partial' : '🔴 None') : '⚪ No Data'}</td><td>${platformData.slo ? platformData.slo.totalSlos + ' SLOs' : ''}</td></tr>
    <tr><td>Automation</td><td>${platformData.workflows ? (platformData.workflows.totalExecutions > 0 ? '✅ Active' : '🔴 None') : '⚪ No Data'}</td><td>${platformData.workflows ? (platformData.workflows.totalExecutions || 0).toLocaleString() + ' runs / ' + platformData.workflows.successRate.toFixed(0) + '% success' : ''}</td></tr>
    <tr><td>Entity Growth</td><td>${platformData.entityGrowth ? (platformData.entityGrowth.hosts.current > platformData.entityGrowth.hosts.previous ? '✅ Growing' : platformData.entityGrowth.hosts.current < platformData.entityGrowth.hosts.previous ? '🔴 Declining' : '⚠️ Stable') : '⚪ No Data'}</td><td>${platformData.entityGrowth ? platformData.entityGrowth.hosts.current + ' hosts, ' + platformData.entityGrowth.services.current + ' services' : ''}</td></tr>
    <tr><td>Web Vitals</td><td>${platformData.webVitals ? (platformData.webVitals.lcp.current > 0 ? '✅ Tracked' : '🔴 Not Tracked') : '⚪ No Data'}</td><td>${platformData.webVitals ? 'LCP: ' + platformData.webVitals.lcp.current.toFixed(0) + 'ms' : ''}</td></tr>
    <tr><td>Security</td><td>${platformData.security ? (platformData.security.vulnerabilitiesDetected > 0 || platformData.security.attacksBlocked > 0 ? '✅ Active' : '🔴 Not Enabled') : '⚪ No Data'}</td><td>${platformData.security ? (platformData.security.vulnerabilitiesResolved || 0).toLocaleString() + ' resolved' : ''}</td></tr>
  </tbody>
</table>

${(() => {
  const recs = buildRecommendations(platformData);
  if (recs.length === 0) {
    return `<div style="background:#e8f8ec;border-left:4px solid #59c46b;padding:16px;border-radius:6px;margin:24px 0"><strong style="color:#2c7a3d">✅ No critical actions identified.</strong> All tracked platform indicators are within healthy thresholds.</div>`;
  }
  return `<h2>Recommended Focus Areas</h2>
  <p style="font-size:13px;opacity:0.7">Prioritized actions based on the platform usage data above. Address red items first to unlock the largest reliability and adoption gains.</p>
  <div style="display:flex;flex-direction:column;gap:10px;margin:16px 0">
  ${recs.map((r) => {
    const color = r.severity === "critical" ? "#c4190b" : r.severity === "warning" ? "#ef8b0e" : "#1496ff";
    const bg = r.severity === "critical" ? "#fdecea" : r.severity === "warning" ? "#fff4e5" : "#e8f4fd";
    const icon = r.severity === "critical" ? "🔴" : r.severity === "warning" ? "⚠️" : "💡";
    return `<div style="background:${bg};border-left:4px solid ${color};padding:14px 16px;border-radius:6px;display:flex;gap:12px"><div style="font-size:18px;flex-shrink:0">${icon}</div><div><div style="font-weight:700;color:${color};margin-bottom:4px">${r.title}</div><div style="font-size:13px;color:#333;line-height:1.5">${r.detail}</div></div></div>`;
  }).join("")}
  </div>`;
})()}
` : '<p style="opacity:0.5;text-align:center">Platform usage data not available</p>'}

<div class="footer">
  Generated from SRE Maturity Assessment Platform · ${new Date().toLocaleDateString()} · Confidential
</div>

</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const generateQBRPptx = () => {
    if (!orgStats) return;

    const displayName = customerName || "Customer";
    const levelLabel = MaturityLevelFullLabels[orgStats.level as MaturityLevel];
    const overallColor = MaturityLevelColors[orgStats.level as MaturityLevel];

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
    pptx.layout = "WIDE";

    // Title Slide
    let slide = pptx.addSlide();
    slide.background = { color: "1B2A4A" };
    slide.addText(displayName, { x: 0.8, y: 0.6, w: 11.7, h: 0.9, fontSize: 32, bold: true, color: "FFFFFF", align: "center" });
    slide.addText("Quarterly Business Review — SRE Maturity Assessment", { x: 0.8, y: 1.5, w: 11.7, h: 0.5, fontSize: 16, color: "AABBDD", align: "center" });
    slide.addImage({ data: journeyImage, x: 1.5, y: 2.2, w: 10.3, h: 4.0 });
    slide.addText(new Date(qbrDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), { x: 0.8, y: 6.4, w: 11.7, h: 0.4, fontSize: 13, color: "88AACC", align: "center" });
    slide.addText("Prepared by Dynatrace", { x: 0.8, y: 6.85, w: 11.7, h: 0.4, fontSize: 11, color: "667799", align: "center" });

    // Executive Summary Slide
    slide = pptx.addSlide();
    slide.addText("Executive Summary", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });
    slide.addShape(pptx.ShapeType.roundRect, { x: 4.5, y: 1.2, w: 4.3, h: 2.8, fill: { color: "F5F7FA" }, line: { color: overallColor.replace("#", ""), width: 2 }, rectRadius: 0.1 });
    slide.addText(orgStats.overall.toFixed(1), { x: 4.5, y: 1.4, w: 4.3, h: 1.6, fontSize: 56, bold: true, color: overallColor.replace("#", ""), align: "center" });
    slide.addText(`Level ${orgStats.level}: ${levelLabel}`, { x: 4.5, y: 2.9, w: 4.3, h: 0.5, fontSize: 14, color: "444444", align: "center" });
    slide.addText("Organization Maturity Score (1–5)", { x: 4.5, y: 3.4, w: 4.3, h: 0.4, fontSize: 10, color: "888888", align: "center" });

    // KPI boxes
    const kpis = [
      { label: "Assessors", value: String(latestDtPerUser.length) },
      { label: "DT Assessments", value: String(dtHistory.length) },
      { label: "Teams", value: String(new Set(latestDtPerUser.map((r) => r.teamName)).size) },
      { label: "PG Assessments", value: String(pgHistory.length) },
    ];
    kpis.forEach((kpi, i) => {
      const kx = 1.0 + i * 2.9;
      slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 4.5, w: 2.6, h: 1.8, fill: { color: "F0F2F5" }, rectRadius: 0.05 });
      slide.addText(kpi.value, { x: kx, y: 4.7, w: 2.6, h: 1.0, fontSize: 28, bold: true, color: "1B2A4A", align: "center" });
      slide.addText(kpi.label, { x: kx, y: 5.6, w: 2.6, h: 0.5, fontSize: 10, color: "666666", align: "center" });
    });

    // --- SECTION DIVIDER: Dynatrace Maturity ---
    slide = pptx.addSlide();
    slide.background = { color: "1B2A4A" };
    slide.addText("Section 1", { x: 0.8, y: 2.5, w: 11.7, h: 0.5, fontSize: 14, color: "AABBDD", align: "center" });
    slide.addText("Dynatrace Maturity", { x: 0.8, y: 3.0, w: 11.7, h: 1.0, fontSize: 36, bold: true, color: "FFFFFF", align: "center" });

    // Maturity by Category Slide
    slide = pptx.addSlide();
    slide.addText("Maturity by Category", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });

    const catTableRows: PptxGenJS.TableRow[] = [
      [
        { text: "Category", options: { bold: true, fontSize: 11, fill: { color: "E8ECF0" } } },
        { text: "Score", options: { bold: true, fontSize: 11, fill: { color: "E8ECF0" }, align: "center" } },
        { text: "Level", options: { bold: true, fontSize: 11, fill: { color: "E8ECF0" }, align: "center" } },
      ],
    ];
    for (const cat of dynatraceMaturityCategories) {
      const score = orgStats.categoryScores[cat.id] || 0;
      const lvl = scoreToLevel(score);
      const clr = MaturityLevelColors[lvl as MaturityLevel].replace("#", "");
      catTableRows.push([
        { text: cat.name, options: { fontSize: 10 } },
        { text: score.toFixed(1), options: { fontSize: 10, align: "center", bold: true, color: clr } },
        { text: `L${lvl}`, options: { fontSize: 10, align: "center", color: clr } },
      ]);
    }
    slide.addTable(catTableRows, { x: 0.5, y: 1.1, w: 12.3, colW: [7, 2.5, 2.8], border: { type: "solid", color: "DDDDDD", pt: 0.5 }, rowH: 0.4 });

    // Progress Slide
    slide = pptx.addSlide();
    slide.addText("Progress Since Last Assessment", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });

    const progressRows: PptxGenJS.TableRow[] = [
      [
        { text: "Category", options: { bold: true, fontSize: 11, fill: { color: "E8ECF0" } } },
        { text: "Change", options: { bold: true, fontSize: 11, fill: { color: "E8ECF0" }, align: "center" } },
      ],
    ];
    for (const p of progressData) {
      const changeText = p.change > 0 ? `+${p.change}` : p.change < 0 ? `${p.change}` : "—";
      const changeColor = p.change > 0 ? "2E8B57" : p.change < 0 ? "C4190B" : "888888";
      progressRows.push([
        { text: p.category, options: { fontSize: 10 } },
        { text: changeText, options: { fontSize: 10, align: "center", bold: true, color: changeColor } },
      ]);
    }
    slide.addTable(progressRows, { x: 0.5, y: 1.1, w: 12.3, colW: [8, 4.3], border: { type: "solid", color: "DDDDDD", pt: 0.5 }, rowH: 0.4 });

    // Risk & Expansion Slide
    slide = pptx.addSlide();
    slide.addText("Risk Areas & Expansion Opportunities", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });

    // Risk table
    slide.addText("Top 3 Risk Areas", { x: 0.5, y: 1.0, w: 5.5, h: 0.4, fontSize: 14, bold: true, color: "333333" });
    const riskRows: PptxGenJS.TableRow[] = [
      [
        { text: "Category", options: { bold: true, fontSize: 10, fill: { color: "E8ECF0" } } },
        { text: "Score", options: { bold: true, fontSize: 10, fill: { color: "E8ECF0" }, align: "center" } },
      ],
    ];
    for (const r of topRisks) {
      const clr = MaturityLevelColors[scoreToLevel(r.score) as MaturityLevel].replace("#", "");
      riskRows.push([
        { text: r.name, options: { fontSize: 10 } },
        { text: r.score.toFixed(1), options: { fontSize: 10, align: "center", bold: true, color: clr } },
      ]);
    }
    slide.addTable(riskRows, { x: 0.5, y: 1.5, w: 5.8, colW: [4, 1.8], border: { type: "solid", color: "DDDDDD", pt: 0.5 }, rowH: 0.4 });

    // Expansion table
    slide.addText("Expansion Opportunities", { x: 7.0, y: 1.0, w: 5.8, h: 0.4, fontSize: 14, bold: true, color: "333333" });
    const expRows: PptxGenJS.TableRow[] = [
      [
        { text: "Capability", options: { bold: true, fontSize: 10, fill: { color: "E8ECF0" } } },
        { text: "SKU", options: { bold: true, fontSize: 10, fill: { color: "E8ECF0" } } },
        { text: "Score", options: { bold: true, fontSize: 10, fill: { color: "E8ECF0" }, align: "center" } },
      ],
    ];
    if (expansionOpps.length > 0) {
      for (const e of expansionOpps) {
        expRows.push([
          { text: e.capability, options: { fontSize: 9 } },
          { text: e.sku, options: { fontSize: 9 } },
          { text: `${e.avgScore.toFixed(1)}/5`, options: { fontSize: 9, align: "center", color: "EF8B0E", bold: true } },
        ]);
      }
    } else {
      expRows.push([{ text: "No expansion opportunities identified", options: { fontSize: 9, colspan: 3, align: "center" } }]);
    }
    slide.addTable(expRows, { x: 7.0, y: 1.5, w: 5.8, colW: [2.3, 2.2, 1.3], border: { type: "solid", color: "DDDDDD", pt: 0.5 }, rowH: 0.4 });

    // Recommended Actions Slide
    slide = pptx.addSlide();
    slide.addText("Recommended Actions", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });

    const actions: string[] = [];
    for (const r of topRisks) {
      actions.push(`${r.name} (Score: ${r.score.toFixed(1)}) — Advance from Level ${scoreToLevel(r.score)} to Level ${Math.min(scoreToLevel(r.score) + 1, 5)}`);
    }
    if (expansionOpps.length > 0) {
      actions.push(`Expand coverage in ${expansionOpps.map((e) => e.capability).join(", ")} to close observability blind spots`);
    }
    actions.push("Schedule reassessment in 90 days to track progress against these goals");

    const actionText = actions.map((a, i) => `${i + 1}. ${a}`).join("\n\n");
    slide.addText(actionText, { x: 0.8, y: 1.2, w: 11.7, h: 5.5, fontSize: 13, color: "333333", valign: "top", paraSpaceAfter: 8 });

    // --- SECTION DIVIDER: Personal Growth ---
    slide = pptx.addSlide();
    slide.background = { color: "2D1B4E" };
    slide.addText("Section 2", { x: 0.8, y: 2.5, w: 11.7, h: 0.5, fontSize: 14, color: "AABBDD", align: "center" });
    slide.addText("Personal Growth", { x: 0.8, y: 3.0, w: 11.7, h: 1.0, fontSize: 36, bold: true, color: "FFFFFF", align: "center" });

    // Personal Growth Slide
    slide = pptx.addSlide();
    slide.addText("Personal Growth Achievement", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });

    const badgeTableRows: PptxGenJS.TableRow[] = [
      [
        { text: "User", options: { bold: true, fontSize: 11, fill: { color: "E8ECF0" } } },
        { text: "New Badges Earned", options: { bold: true, fontSize: 11, fill: { color: "E8ECF0" } } },
      ],
    ];
    if (badgeRecognition.length > 0) {
      for (const r of badgeRecognition) {
        badgeTableRows.push([
          { text: r.user, options: { fontSize: 10, bold: true } },
          { text: r.newBadges.join(", "), options: { fontSize: 10 } },
        ]);
      }
    } else {
      badgeTableRows.push([{ text: "No new badges attained in the previous quarter", options: { fontSize: 10, colspan: 2, align: "center" } }]);
    }
    slide.addTable(badgeTableRows, { x: 0.5, y: 1.1, w: 12.3, colW: [4, 8.3], border: { type: "solid", color: "DDDDDD", pt: 0.5 }, rowH: 0.4 });

    // --- SECTION DIVIDER: Platform Usage ---
    slide = pptx.addSlide();
    slide.background = { color: "0A3D5C" };
    slide.addText("Section 3", { x: 0.8, y: 2.5, w: 11.7, h: 0.5, fontSize: 14, color: "AABBDD", align: "center" });
    slide.addText("Platform Usage", { x: 0.8, y: 3.0, w: 11.7, h: 1.0, fontSize: 36, bold: true, color: "FFFFFF", align: "center" });

    // Platform Usage: MTTR Slide
    if (platformData?.mttr) {
      slide = pptx.addSlide();
      slide.addText("Mean Time to Resolution (MTTR)", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });
      const mttrColor = platformData.mttr.currentAvgMinutes < platformData.mttr.previousAvgMinutes ? "2E8B57" : platformData.mttr.currentAvgMinutes > platformData.mttr.previousAvgMinutes ? "C4190B" : "888888";
      const mttrKpis = [
        { label: "Current Quarter", value: `${platformData.mttr.currentAvgMinutes.toFixed(0)} min` },
        { label: "Previous Quarter", value: `${platformData.mttr.previousAvgMinutes.toFixed(0)} min` },
        { label: "Change", value: platformData.mttr.previousAvgMinutes > 0 ? `${((1 - platformData.mttr.currentAvgMinutes / platformData.mttr.previousAvgMinutes) * 100).toFixed(0)}%` : "—" },
      ];
      mttrKpis.forEach((kpi, i) => {
        const kx = 0.5 + i * 4.3;
        slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 1.1, w: 4.0, h: 1.5, fill: { color: "F0F2F5" }, rectRadius: 0.05 });
        slide.addText(kpi.value, { x: kx, y: 1.2, w: 4.0, h: 0.9, fontSize: 26, bold: true, color: i === 2 ? mttrColor : "1B2A4A", align: "center" });
        slide.addText(kpi.label, { x: kx, y: 2.1, w: 4.0, h: 0.4, fontSize: 11, color: "666666", align: "center" });
      });
      // Trend chart
      if (platformData.mttr.weeklyTrend.length > 0) {
        const labels = platformData.mttr.weeklyTrend.map((_, i) => `W${i + 1}`);
        const values = platformData.mttr.weeklyTrend.map((d) => Number(d.value) || 0);
        slide.addChart(pptx.ChartType.line, [{ name: "MTTR (min)", labels, values }], {
          x: 0.5, y: 2.9, w: 12.3, h: 3.4,
          showTitle: true, title: "Weekly MTTR Trend (90 days)", titleFontSize: 12,
          chartColors: ["14BAE4"], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 6,
          showLegend: false, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
          showValue: false, valAxisTitle: "Minutes", showValAxisTitle: true, valAxisTitleFontSize: 10,
        });
      }
      slide.addText(platformData.mttr.currentAvgMinutes < platformData.mttr.previousAvgMinutes
        ? "💡 MTTR is improving — platform is accelerating incident response"
        : platformData.mttr.currentAvgMinutes > platformData.mttr.previousAvgMinutes
        ? "💡 MTTR has increased — review alerting rules and runbook integrations"
        : "💡 MTTR is stable quarter-over-quarter",
        { x: 0.5, y: 6.5, w: 12.3, h: 0.4, fontSize: 12, italic: true, color: mttrColor, align: "center" });
    }

    // Platform Usage: Problems Slide
    if (platformData?.problems) {
      slide = pptx.addSlide();
      slide.addText("Problem Detection & Resolution", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });
      const probKpis = [
        { label: "Total Problems (90d)", value: platformData.problems.totalProblems.toLocaleString() },
        { label: "Auto-Resolved (<5m)", value: platformData.problems.totalProblems > 0 ? `${((platformData.problems.autoResolved / platformData.problems.totalProblems) * 100).toFixed(0)}%` : "0%" },
        { label: "Root Cause ID'd", value: platformData.problems.totalProblems > 0 ? `${((platformData.problems.withRootCause / platformData.problems.totalProblems) * 100).toFixed(0)}%` : "0%" },
      ];
      probKpis.forEach((kpi, i) => {
        const kx = 0.5 + i * 4.3;
        slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 1.1, w: 4.0, h: 1.5, fill: { color: "F0F2F5" }, rectRadius: 0.05 });
        slide.addText(kpi.value, { x: kx, y: 1.2, w: 4.0, h: 0.9, fontSize: 26, bold: true, color: "1B2A4A", align: "center" });
        slide.addText(kpi.label, { x: kx, y: 2.1, w: 4.0, h: 0.4, fontSize: 11, color: "666666", align: "center" });
      });
      if (platformData.problems.weeklyTrend.length > 0) {
        const labels = platformData.problems.weeklyTrend.map((_, i) => `W${i + 1}`);
        const values = platformData.problems.weeklyTrend.map((d) => Number(d.value) || 0);
        slide.addChart(pptx.ChartType.line, [{ name: "Problems", labels, values }], {
          x: 0.5, y: 2.9, w: 12.3, h: 3.4,
          showTitle: true, title: "Weekly Problem Volume (90 days)", titleFontSize: 12,
          chartColors: ["6F2DA8"], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 6,
          showLegend: false, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
          valAxisTitle: "Count", showValAxisTitle: true, valAxisTitleFontSize: 10,
        });
      }
      slide.addText(`💡 Davis AI identified root causes for ${platformData.problems.totalProblems > 0 ? ((platformData.problems.withRootCause / platformData.problems.totalProblems) * 100).toFixed(0) : 0}% of problems — broader Smartscape topology drives this metric higher.`,
        { x: 0.5, y: 6.5, w: 12.3, h: 0.4, fontSize: 12, italic: true, color: "555555", align: "center" });
    }

    // Platform Usage: Adoption Slide (DAU trend + feature breakdown bar chart)
    if (platformData?.adoption) {
      slide = pptx.addSlide();
      slide.addText("Platform Adoption", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });
      const avgDau = platformData.adoption.dailyActiveUsers.length > 0
        ? Math.round(platformData.adoption.dailyActiveUsers.reduce((s, d) => s + (Number(d.value) || 0), 0) / platformData.adoption.dailyActiveUsers.length)
        : 0;
      const adoptKpis = [
        { label: "Monthly Active Users", value: String(platformData.adoption.monthlyActiveUsers) },
        { label: "Unique Users (90d)", value: String(platformData.adoption.totalUniqueUsers) },
        { label: "Avg Daily Active", value: String(avgDau) },
      ];
      adoptKpis.forEach((kpi, i) => {
        const kx = 0.5 + i * 4.3;
        slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 1.1, w: 4.0, h: 1.3, fill: { color: "F0F2F5" }, rectRadius: 0.05 });
        slide.addText(kpi.value, { x: kx, y: 1.15, w: 4.0, h: 0.8, fontSize: 26, bold: true, color: "1B2A4A", align: "center" });
        slide.addText(kpi.label, { x: kx, y: 1.95, w: 4.0, h: 0.4, fontSize: 11, color: "666666", align: "center" });
      });
      // DAU trend chart (left)
      if (platformData.adoption.dailyActiveUsers.length > 0) {
        const labels = platformData.adoption.dailyActiveUsers.map((_, i) => String(i + 1));
        const values = platformData.adoption.dailyActiveUsers.map((d) => Number(d.value) || 0);
        slide.addChart(pptx.ChartType.area, [{ name: "DAU", labels, values }], {
          x: 0.5, y: 2.7, w: 6.1, h: 3.8,
          showTitle: true, title: "Daily Active Users (90 days)", titleFontSize: 11,
          chartColors: ["9B51E0"], showLegend: false,
          catAxisLabelFontSize: 8, valAxisLabelFontSize: 9,
          catAxisLabelFrequency: "7",
        });
      }
      // Feature breakdown bar chart (right) — reverse array so highest is on top
      if (platformData.adoption.featureBreakdown.length > 0) {
        const top = [...platformData.adoption.featureBreakdown.slice(0, 8)].reverse();
        slide.addChart(pptx.ChartType.bar, [{ name: "Usage", labels: top.map((f) => f.feature), values: top.map((f) => f.count) }], {
          x: 6.7, y: 2.7, w: 6.1, h: 3.8,
          showTitle: true, title: "Top Apps by Usage", titleFontSize: 11,
          chartColors: ["9B51E0"], barDir: "bar", showLegend: false,
          catAxisLabelFontSize: 8, valAxisLabelFontSize: 9,
        });
      }
      slide.addText(`💡 ${platformData.adoption.monthlyActiveUsers} MAU — sustained DAU growth is the leading indicator of platform value realization.`,
        { x: 0.5, y: 6.6, w: 12.3, h: 0.3, fontSize: 12, italic: true, color: "555555", align: "center" });
    }

    // Platform Usage: SLO Slide
    if (platformData?.slo) {
      slide = pptx.addSlide();
      slide.addText("SLO Compliance", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });
      const compRate = platformData.slo.totalSlos > 0 ? ((platformData.slo.meetingTarget / platformData.slo.totalSlos) * 100) : 0;
      const sloColor = compRate >= 95 ? "2E8B57" : compRate >= 80 ? "EF8B0E" : "C4190B";
      const sloKpis = [
        { label: "SLOs Configured", value: String(platformData.slo.totalSlos), color: "1B2A4A" },
        { label: "Meeting Target", value: String(platformData.slo.meetingTarget), color: "2E8B57" },
        { label: "Compliance Rate", value: `${compRate.toFixed(0)}%`, color: sloColor },
      ];
      sloKpis.forEach((kpi, i) => {
        const kx = 0.5 + i * 4.3;
        slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 1.1, w: 4.0, h: 1.5, fill: { color: "F0F2F5" }, rectRadius: 0.05 });
        slide.addText(kpi.value, { x: kx, y: 1.2, w: 4.0, h: 0.9, fontSize: 26, bold: true, color: kpi.color, align: "center" });
        slide.addText(kpi.label, { x: kx, y: 2.1, w: 4.0, h: 0.4, fontSize: 11, color: "666666", align: "center" });
      });
      if (platformData.slo.complianceTrend.length > 0) {
        const labels = platformData.slo.complianceTrend.map((_, i) => `W${i + 1}`);
        const values = platformData.slo.complianceTrend.map((d) => Number(d.value) || 0);
        slide.addChart(pptx.ChartType.line, [{ name: "SLO Activity", labels, values }], {
          x: 0.5, y: 2.9, w: 12.3, h: 3.4,
          showTitle: true, title: "SLO Activity Trend (90 days)", titleFontSize: 12,
          chartColors: ["FF6600"], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 6,
          showLegend: false, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
        });
      }
      slide.addText(platformData.slo.totalSlos > 0
        ? `💡 ${platformData.slo.totalSlos} SLOs being tracked — foundation for error-budget-driven engineering.`
        : "💡 No SLOs configured — define golden-signal SLOs (availability, latency) for top user-facing services.",
        { x: 0.5, y: 6.5, w: 12.3, h: 0.4, fontSize: 12, italic: true, color: "555555", align: "center" });
    }

    // Platform Usage: Workflows Slide (trend chart + top workflows bar chart)
    if (platformData?.workflows) {
      slide = pptx.addSlide();
      slide.addText("Workflow Automation", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });
      const wfColor = platformData.workflows.successRate >= 95 ? "2E8B57" : platformData.workflows.successRate >= 80 ? "EF8B0E" : "C4190B";
      const wfKpis = [
        { label: "Total Executions", value: platformData.workflows.totalExecutions.toLocaleString(), color: "1B2A4A" },
        { label: "Success Rate", value: `${platformData.workflows.successRate.toFixed(0)}%`, color: wfColor },
        { label: "Active Workflows", value: String(platformData.workflows.topWorkflows.length), color: "1B2A4A" },
      ];
      wfKpis.forEach((kpi, i) => {
        const kx = 0.5 + i * 4.3;
        slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 1.1, w: 4.0, h: 1.3, fill: { color: "F0F2F5" }, rectRadius: 0.05 });
        slide.addText(kpi.value, { x: kx, y: 1.15, w: 4.0, h: 0.8, fontSize: 26, bold: true, color: kpi.color, align: "center" });
        slide.addText(kpi.label, { x: kx, y: 1.95, w: 4.0, h: 0.4, fontSize: 11, color: "666666", align: "center" });
      });
      // Trend (left)
      if (platformData.workflows.weeklyTrend.length > 0) {
        const labels = platformData.workflows.weeklyTrend.map((_, i) => `W${i + 1}`);
        const values = platformData.workflows.weeklyTrend.map((d) => Number(d.value) || 0);
        slide.addChart(pptx.ChartType.line, [{ name: "Executions", labels, values }], {
          x: 0.5, y: 2.7, w: 6.1, h: 3.8,
          showTitle: true, title: "Weekly Executions (90 days)", titleFontSize: 11,
          chartColors: ["1496FF"], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 5,
          showLegend: false, catAxisLabelFontSize: 8, valAxisLabelFontSize: 9,
        });
      }
      // Top workflows bar (right) — reverse array so highest is on top
      if (platformData.workflows.topWorkflows.length > 0) {
        const top = [...platformData.workflows.topWorkflows.slice(0, 6)].reverse();
        slide.addChart(pptx.ChartType.bar, [{ name: "Executions", labels: top.map((w) => w.name), values: top.map((w) => w.executions) }], {
          x: 6.7, y: 2.7, w: 6.1, h: 3.8,
          showTitle: true, title: "Top Workflows", titleFontSize: 11,
          chartColors: ["1496FF"], barDir: "bar", showLegend: false,
          catAxisLabelFontSize: 8, valAxisLabelFontSize: 9,
        });
      }
      slide.addText(platformData.workflows.totalExecutions > 0
        ? `💡 ${platformData.workflows.totalExecutions.toLocaleString()} automated runs reduced engineering toil this quarter.`
        : "💡 No workflows running — implement auto-remediation for common operational issues to reduce toil.",
        { x: 0.5, y: 6.6, w: 12.3, h: 0.3, fontSize: 12, italic: true, color: "555555", align: "center" });
    }

    // Platform Usage: Entity Growth Slide
    if (platformData?.entityGrowth) {
      slide = pptx.addSlide();
      slide.addText("Monitored Entity Growth", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });
      const eg = platformData.entityGrowth;
      const arrow = (cur: number, prev: number) => cur > prev ? "▲" : cur < prev ? "▼" : "—";
      const arrowColor = (cur: number, prev: number) => cur > prev ? "2E8B57" : cur < prev ? "C4190B" : "888888";
      const egKpis = [
        { label: "Hosts", value: String(eg.hosts.current), arrow: arrow(eg.hosts.current, eg.hosts.previous), color: arrowColor(eg.hosts.current, eg.hosts.previous), prev: eg.hosts.previous },
        { label: "Services", value: String(eg.services.current), arrow: arrow(eg.services.current, eg.services.previous), color: arrowColor(eg.services.current, eg.services.previous), prev: eg.services.previous },
        { label: "Applications", value: String(eg.applications.current), arrow: arrow(eg.applications.current, eg.applications.previous), color: arrowColor(eg.applications.current, eg.applications.previous), prev: eg.applications.previous },
      ];
      egKpis.forEach((kpi, i) => {
        const kx = 0.5 + i * 4.3;
        slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 1.1, w: 4.0, h: 1.7, fill: { color: "F0F2F5" }, rectRadius: 0.05 });
        slide.addText(`${kpi.value} ${kpi.arrow}`, { x: kx, y: 1.2, w: 4.0, h: 0.9, fontSize: 26, bold: true, color: kpi.color, align: "center" });
        slide.addText(kpi.label, { x: kx, y: 2.0, w: 4.0, h: 0.3, fontSize: 11, color: "666666", align: "center" });
        slide.addText(`prev: ${kpi.prev}`, { x: kx, y: 2.35, w: 4.0, h: 0.3, fontSize: 9, color: "888888", italic: true, align: "center" });
      });
      if (eg.weeklyGrowth.length > 0) {
        const labels = eg.weeklyGrowth.map((_, i) => `W${i + 1}`);
        const values = eg.weeklyGrowth.map((d) => Number(d.value) || 0);
        slide.addChart(pptx.ChartType.bar, [{ name: "New Hosts", labels, values }], {
          x: 0.5, y: 3.0, w: 12.3, h: 3.3,
          showTitle: true, title: "New Hosts Onboarded per Week", titleFontSize: 12,
          chartColors: ["59C46B"], barDir: "col", showLegend: false,
          catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
        });
      }
      slide.addText(`💡 Total monitored footprint: ${eg.hosts.current + eg.services.current + eg.applications.current} entities — consistent growth signals expanding platform value.`,
        { x: 0.5, y: 6.5, w: 12.3, h: 0.4, fontSize: 12, italic: true, color: "555555", align: "center" });
    }

    // Platform Usage: Web Vitals Slide
    if (platformData?.webVitals) {
      slide = pptx.addSlide();
      slide.addText("User Experience (Core Web Vitals)", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });
      const wv = platformData.webVitals;
      const wvKpis = [
        { label: "LCP (target ≤ 2500ms)", value: `${wv.lcp.current.toFixed(0)} ms`, color: wv.lcp.current <= 2500 ? "2E8B57" : wv.lcp.current <= 4000 ? "EF8B0E" : "C4190B" },
        { label: "CLS (target ≤ 0.1)", value: wv.cls.current.toFixed(3), color: wv.cls.current <= 0.1 ? "2E8B57" : wv.cls.current <= 0.25 ? "EF8B0E" : "C4190B" },
        { label: "INP (target ≤ 200ms)", value: `${wv.inp.current.toFixed(0)} ms`, color: wv.inp.current <= 200 ? "2E8B57" : wv.inp.current <= 500 ? "EF8B0E" : "C4190B" },
        { label: "Apdex", value: wv.apdex.current.toFixed(2), color: wv.apdex.current >= 0.94 ? "2E8B57" : wv.apdex.current >= 0.85 ? "EF8B0E" : "C4190B" },
      ];
      wvKpis.forEach((kpi, i) => {
        const kx = 0.5 + i * 3.2;
        slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 1.3, w: 3.0, h: 2.0, fill: { color: "F0F2F5" }, rectRadius: 0.05 });
        slide.addText(kpi.value, { x: kx, y: 1.5, w: 3.0, h: 1.0, fontSize: 24, bold: true, color: kpi.color, align: "center" });
        slide.addText(kpi.label, { x: kx, y: 2.5, w: 3.0, h: 0.6, fontSize: 10, color: "666666", align: "center" });
      });
      // Four side-by-side mini charts (each metric vs its own target — different scales)
      const wvCharts = [
        { x: 0.5,  title: "LCP (ms)",  cur: wv.lcp.current,   target: 2500 },
        { x: 3.7,  title: "CLS",       cur: wv.cls.current,   target: 0.1 },
        { x: 6.9,  title: "INP (ms)",  cur: wv.inp.current,   target: 200 },
        { x: 10.1, title: "Apdex",     cur: wv.apdex.current, target: 0.94 },
      ];
      wvCharts.forEach((c) => {
        slide.addChart(pptx.ChartType.bar, [
          { name: "Current", labels: [""], values: [c.cur] },
          { name: "Target",  labels: [""], values: [c.target] },
        ], {
          x: c.x, y: 3.7, w: 2.9, h: 2.7,
          showTitle: true, title: c.title, titleFontSize: 11,
          chartColors: ["14BAE4", "888888"], barDir: "col",
          showLegend: true, legendPos: "b", legendFontSize: 9,
          catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
          barGapWidthPct: 30,
        });
      });
      slide.addText("💡 Core Web Vitals improvements drive engagement and conversion — a 100ms LCP reduction can lift conversion 1-2%.",
        { x: 0.5, y: 6.5, w: 12.3, h: 0.4, fontSize: 12, italic: true, color: "555555", align: "center" });
    }

    // Platform Usage: Security Slide
    if (platformData?.security) {
      slide = pptx.addSlide();
      slide.addText("Security Posture", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });
      const sec = platformData.security;
      const secKpis = [
        { label: "Vulnerabilities Detected", value: sec.vulnerabilitiesDetected.toLocaleString() },
        { label: "Resolved", value: sec.vulnerabilitiesResolved.toLocaleString() },
        { label: "Findings", value: sec.attacksBlocked.toLocaleString() },
      ];
      secKpis.forEach((kpi, i) => {
        const kx = 0.5 + i * 4.3;
        slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 1.1, w: 4.0, h: 1.5, fill: { color: "F0F2F5" }, rectRadius: 0.05 });
        slide.addText(kpi.value, { x: kx, y: 1.2, w: 4.0, h: 0.9, fontSize: 26, bold: true, color: "1B2A4A", align: "center" });
        slide.addText(kpi.label, { x: kx, y: 2.1, w: 4.0, h: 0.4, fontSize: 11, color: "666666", align: "center" });
      });
      if (sec.riskScoreTrend.length > 0) {
        const labels = sec.riskScoreTrend.map((_, i) => `W${i + 1}`);
        const values = sec.riskScoreTrend.map((d) => Number(d.value) || 0);
        slide.addChart(pptx.ChartType.line, [{ name: "Vulnerability Activity", labels, values }], {
          x: 0.5, y: 2.9, w: 12.3, h: 3.4,
          showTitle: true, title: "Vulnerability Activity Trend (90 days)", titleFontSize: 12,
          chartColors: ["C4190B"], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 6,
          showLegend: false, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
        });
      }
      slide.addText(sec.vulnerabilitiesDetected > 0
        ? `💡 ${sec.vulnerabilitiesResolved.toLocaleString()} of ${sec.vulnerabilitiesDetected.toLocaleString()} vulnerabilities resolved this quarter.`
        : "💡 Application Security not active — enable to unlock runtime vulnerability detection on production workloads.",
        { x: 0.5, y: 6.5, w: 12.3, h: 0.4, fontSize: 12, italic: true, color: "555555", align: "center" });
    }

    // Platform Usage: SLO, Workflows, Entities, Web Vitals, Security Summary
    slide = pptx.addSlide();
    slide.addText("Platform Health Summary", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });

    const healthRows: PptxGenJS.TableRow[] = [
      [
        { text: "Indicator", options: { bold: true, fontSize: 11, fill: { color: "E8ECF0" } } },
        { text: "Status", options: { bold: true, fontSize: 11, fill: { color: "E8ECF0" } } },
        { text: "Details", options: { bold: true, fontSize: 11, fill: { color: "E8ECF0" } } },
      ],
    ];
    const healthItems: { indicator: string; status: string; details: string }[] = [
      {
        indicator: "MTTR Trend",
        status: platformData?.mttr ? (platformData.mttr.currentAvgMinutes < platformData.mttr.previousAvgMinutes ? "✅ Improving" : platformData.mttr.currentAvgMinutes > platformData.mttr.previousAvgMinutes ? "🔴 Increasing" : "⚠️ Stable") : "— No Data",
        details: platformData?.mttr ? `${platformData.mttr.currentAvgMinutes.toFixed(0)} min avg` : "",
      },
      {
        indicator: "User Adoption",
        status: platformData?.adoption ? (platformData.adoption.monthlyActiveUsers >= 5 ? "✅ Healthy" : platformData.adoption.monthlyActiveUsers >= 2 ? "⚠️ Moderate" : "🔴 Low") : "— No Data",
        details: platformData?.adoption ? `${platformData.adoption.monthlyActiveUsers} MAU` : "",
      },
      {
        indicator: "SLO Compliance",
        status: platformData?.slo ? (platformData.slo.totalSlos >= 5 ? "✅ Well Defined" : platformData.slo.totalSlos > 0 ? "⚠️ Partial" : "🔴 None") : "— No Data",
        details: platformData?.slo ? `${platformData.slo.meetingTarget}/${platformData.slo.totalSlos} meeting target` : "",
      },
      {
        indicator: "Workflow Automation",
        status: platformData?.workflows ? (platformData.workflows.totalExecutions > 0 ? "✅ Active" : "🔴 None") : "— No Data",
        details: platformData?.workflows ? `${platformData.workflows.totalExecutions} executions, ${platformData.workflows.successRate.toFixed(0)}% success` : "",
      },
      {
        indicator: "Entity Growth",
        status: platformData?.entityGrowth ? (platformData.entityGrowth.hosts.current > platformData.entityGrowth.hosts.previous ? "✅ Growing" : platformData.entityGrowth.hosts.current < platformData.entityGrowth.hosts.previous ? "🔴 Declining" : "⚠️ Stable") : "— No Data",
        details: platformData?.entityGrowth ? `${platformData.entityGrowth.hosts.current} hosts, ${platformData.entityGrowth.services.current} services` : "",
      },
      {
        indicator: "Web Vitals",
        status: platformData?.webVitals ? (platformData.webVitals.lcp.current > 0 ? "✅ Tracked" : "🔴 Not Tracked") : "— No Data",
        details: platformData?.webVitals ? `LCP: ${platformData.webVitals.lcp.current.toFixed(0)}ms` : "",
      },
      {
        indicator: "Security",
        status: platformData?.security ? (platformData.security.vulnerabilitiesDetected > 0 || platformData.security.attacksBlocked > 0 ? "✅ Active" : "🔴 Not Enabled") : "— No Data",
        details: platformData?.security ? `${platformData.security.vulnerabilitiesResolved} resolved, ${platformData.security.attacksBlocked} blocked` : "",
      },
    ];
    for (const item of healthItems) {
      healthRows.push([
        { text: item.indicator, options: { fontSize: 10, bold: true } },
        { text: item.status, options: { fontSize: 10 } },
        { text: item.details, options: { fontSize: 10, color: "666666" } },
      ]);
    }
    slide.addTable(healthRows, { x: 0.5, y: 1.1, w: 12.3, colW: [3.5, 3.5, 5.3], border: { type: "solid", color: "DDDDDD", pt: 0.5 }, rowH: 0.45 });

    // Platform Usage: Recommended Focus Areas Slide
    {
      const recs = buildRecommendations(platformData);
      if (recs.length > 0) {
        slide = pptx.addSlide();
        slide.addText("Recommended Focus Areas", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "1B2A4A" });
        slide.addText("Prioritized actions from the platform telemetry above. Address red items first.",
          { x: 0.5, y: 0.95, w: 12, h: 0.4, fontSize: 12, italic: true, color: "666666" });
        const sevColor = (s: string) => s === "critical" ? "C4190B" : s === "warning" ? "EF8B0E" : "1496FF";
        const sevBg = (s: string) => s === "critical" ? "FDECEA" : s === "warning" ? "FFF4E5" : "E8F4FD";
        const sevIcon = (s: string) => s === "critical" ? "🔴" : s === "warning" ? "⚠️" : "💡";
        recs.slice(0, 6).forEach((rec, i) => {
          const ry = 1.5 + i * 0.85;
          slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: ry, w: 12.3, h: 0.75, fill: { color: sevBg(rec.severity) }, line: { color: sevColor(rec.severity), width: 0 }, rectRadius: 0.05 });
          slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: ry, w: 0.08, h: 0.75, fill: { color: sevColor(rec.severity) }, line: { color: sevColor(rec.severity), width: 0 } });
          slide.addText(sevIcon(rec.severity), { x: 0.7, y: ry + 0.05, w: 0.5, h: 0.65, fontSize: 18, align: "center" });
          slide.addText(rec.title, { x: 1.3, y: ry + 0.05, w: 11.4, h: 0.3, fontSize: 13, bold: true, color: sevColor(rec.severity) });
          slide.addText(rec.detail, { x: 1.3, y: ry + 0.35, w: 11.4, h: 0.4, fontSize: 10, color: "333333" });
        });
      } else {
        slide = pptx.addSlide();
        slide.addText("Platform Health: All Clear", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: "2E8B57" });
        slide.addShape(pptx.ShapeType.roundRect, { x: 1.5, y: 2.5, w: 10.3, h: 2.5, fill: { color: "E8F8EC" }, line: { color: "59C46B", width: 0 }, rectRadius: 0.1 });
        slide.addText("✅", { x: 1.5, y: 2.7, w: 10.3, h: 1.0, fontSize: 48, align: "center" });
        slide.addText("No critical actions identified", { x: 1.5, y: 3.7, w: 10.3, h: 0.5, fontSize: 18, bold: true, color: "2C7A3D", align: "center" });
        slide.addText("All tracked platform indicators are within healthy thresholds.", { x: 1.5, y: 4.2, w: 10.3, h: 0.5, fontSize: 12, color: "555555", align: "center" });
      }
    }

    pptx.writeFile({ fileName: `QBR-${displayName.replace(/\s+/g, "_")}-${qbrDate}.pptx` });
  };

  if (loading) {
    return (
      <div className="qbr-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (dtHistory.length === 0) {
    return (
      <div className="qbr-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>No Data Yet</h2>
        <p style={{ opacity: 0.6 }}>Complete assessments to generate a QBR export.</p>
        <Button variant="emphasized" onClick={() => navigate("/assess/dynatrace")} style={{ marginTop: 16 }}>
          Start Assessment
        </Button>
      </div>
    );
  }

  return (
    <div className="qbr-container">
      <div className="qbr-header">
        <h1>QBR Export</h1>
        <p>Generate a structured Quarterly Business Review document for customer presentations</p>
      </div>

      {/* Configuration */}
      <div className="qbr-card qbr-config">
        <h2>Report Configuration</h2>
        <div className="qbr-config-grid">
          <div className="qbr-field">
            <label>QBR Date</label>
            <input
              type="date"
              value={qbrDate}
              onChange={(e) => setQbrDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="qbr-card">
        <h2>Report Preview</h2>
        <p className="qbr-desc">This report includes three sections</p>

        <div className="qbr-preview-sections">
          <div className="preview-section" style={{ borderLeft: "3px solid #1496ff" }}>
            <span className="preview-icon">📊</span>
            <div className="preview-content">
              <div className="preview-title">Executive Summary</div>
              <div className="preview-desc">
                Overall maturity score ({orgStats?.overall.toFixed(1)}/5.0 — Level {orgStats?.level}),
                assessor count ({latestDtPerUser.length}), team count ({new Set(latestDtPerUser.map((r) => r.teamName)).size})
              </div>
            </div>
          </div>

          <div className="preview-section" style={{ background: "rgba(20, 150, 255, 0.05)", borderLeft: "3px solid #1496ff" }}>
            <span className="preview-icon">🔷</span>
            <div className="preview-content">
              <div className="preview-title" style={{ color: "#1496ff" }}>Section 1: Dynatrace Maturity</div>
              <div className="preview-desc">
                {dynatraceMaturityCategories.length} practice areas with scores, levels, progress, risk areas, expansion opportunities, and recommended actions
              </div>
            </div>
          </div>

          <div className="preview-section" style={{ background: "rgba(111, 45, 168, 0.05)", borderLeft: "3px solid #6f2da8" }}>
            <span className="preview-icon">🟣</span>
            <div className="preview-content">
              <div className="preview-title" style={{ color: "#6f2da8" }}>Section 2: Personal Growth</div>
              <div className="preview-desc">
                {badgeRecognition.length > 0
                  ? `${badgeRecognition.length} user${badgeRecognition.length > 1 ? "s" : ""} earned new badges: ${badgeRecognition.map((r) => r.user).join(", ")}`
                  : "Badge achievements and team growth milestones from the previous quarter"}
              </div>
            </div>
          </div>

          <div className="preview-section" style={{ background: "rgba(20, 186, 228, 0.05)", borderLeft: "3px solid #14bae4" }}>
            <span className="preview-icon">🔵</span>
            <div className="preview-content">
              <div className="preview-title" style={{ color: "#14bae4" }}>Section 3: Platform Usage</div>
              <div className="preview-desc">
                MTTR trends, problem detection, platform adoption (DAU/MAU), SLO compliance, workflow automation, entity growth, Web Vitals, and security posture
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Buttons */}
      <div className="qbr-actions">
        <Button variant="emphasized" onClick={generateQBRHtml}>
          Generate QBR Report
        </Button>
        <Button variant="emphasized" onClick={generateQBRPptx}>
          Export to PowerPoint
        </Button>
        <span className="qbr-action-hint">Opens a formatted report in a new tab ready for printing or saving as PDF / Downloads a .pptx file</span>
      </div>
    </div>
  );
};
