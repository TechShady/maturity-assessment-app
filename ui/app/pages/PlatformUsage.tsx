import React, { useState, useEffect } from "react";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  PlatformUsageData,
  MetricDataPoint,
  fetchAllPlatformUsage,
} from "../platformUsageService";
import { useCustomerName } from "../CustomerNameContext";
import "../styles/platform-usage.css";

// --- Shared Components ---

const TrendArrow = ({ current, previous, invertColors }: { current: number; previous: number; invertColors?: boolean }) => {
  if (previous === 0) return <span className="pu-neutral">—</span>;
  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);
  const isPositive = invertColors ? diff < 0 : diff > 0;
  const isNegative = invertColors ? diff > 0 : diff < 0;
  if (diff === 0) return <span className="pu-neutral">— 0%</span>;
  return (
    <span className={isPositive ? "pu-positive" : isNegative ? "pu-negative" : "pu-neutral"}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(Number(pct))}%
    </span>
  );
};

const SparkLine = ({ data, color = "#1496ff" }: { data: MetricDataPoint[]; color?: string }) => {
  if (data.length < 2) return <span className="pu-no-data">Insufficient data</span>;
  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 280;
  const h = 50;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="pu-sparkline">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
};

const HealthIndicator = ({ label, status }: { label: string; status: "good" | "neutral" | "risk" | "unknown" }) => {
  const icons = { good: "✅", neutral: "⚠️", risk: "🔴", unknown: "⚪" };
  const colors = { good: "#59c46b", neutral: "#ef8b0e", risk: "#c4190b", unknown: "#888" };
  return (
    <div className="pu-health-item">
      <span className="pu-health-icon">{icons[status]}</span>
      <span className="pu-health-label" style={{ color: colors[status] }}>{label}</span>
    </div>
  );
};

// --- Sub-Tab Components ---

const MttrTab = ({ data }: { data: PlatformUsageData }) => {
  if (!data.mttr) {
    return <p className="pu-no-data">No MTTR data available — ensure Davis problems are being detected and resolved</p>;
  }
  return (
    <div className="pu-tab-content">
      <div className="pu-section-intro">
        <p>Mean Time to Resolution measures how quickly incidents are resolved. A declining MTTR indicates the team is leveraging Dynatrace effectively for faster root cause identification.</p>
      </div>
      <div className="pu-metrics-row">
        <div className="pu-metric">
          <div className="pu-metric-value">{data.mttr.currentAvgMinutes.toFixed(0)} min</div>
          <div className="pu-metric-label">Current Quarter Avg</div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">{data.mttr.previousAvgMinutes.toFixed(0)} min</div>
          <div className="pu-metric-label">Previous Quarter Avg</div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">
            <TrendArrow current={data.mttr.currentAvgMinutes} previous={data.mttr.previousAvgMinutes} invertColors />
          </div>
          <div className="pu-metric-label">Quarter-over-Quarter</div>
        </div>
      </div>
      <div className="pu-chart-section">
        <h3>Weekly MTTR Trend</h3>
        <SparkLine data={data.mttr.weeklyTrend} color="#14bae4" />
        <p className="pu-chart-hint">Downward trend = improving resolution time</p>
      </div>
      <div className="pu-insight-box">
        <h3>💡 Insight</h3>
        {data.mttr.currentAvgMinutes < data.mttr.previousAvgMinutes ? (
          <p className="pu-positive">MTTR has <strong>improved</strong> by {((1 - data.mttr.currentAvgMinutes / data.mttr.previousAvgMinutes) * 100).toFixed(0)}% this quarter. The platform is accelerating incident response.</p>
        ) : data.mttr.currentAvgMinutes > data.mttr.previousAvgMinutes ? (
          <p className="pu-negative">MTTR has <strong>increased</strong> by {((data.mttr.currentAvgMinutes / data.mttr.previousAvgMinutes - 1) * 100).toFixed(0)}% this quarter. Consider reviewing alerting rules and runbook integrations.</p>
        ) : (
          <p className="pu-neutral">MTTR is <strong>stable</strong> quarter-over-quarter.</p>
        )}
      </div>
    </div>
  );
};

const ProblemsTab = ({ data }: { data: PlatformUsageData }) => {
  if (!data.problems) {
    return <p className="pu-no-data">No problem data available</p>;
  }
  const autoResolvedPct = data.problems.totalProblems > 0
    ? ((data.problems.autoResolved / data.problems.totalProblems) * 100).toFixed(0)
    : "0";
  const rootCausePct = data.problems.totalProblems > 0
    ? ((data.problems.withRootCause / data.problems.totalProblems) * 100).toFixed(0)
    : "0";
  return (
    <div className="pu-tab-content">
      <div className="pu-section-intro">
        <p>Problem detection health shows how actively Davis AI identifies issues and whether automated resolution and root cause analysis are working effectively.</p>
      </div>
      <div className="pu-metrics-row">
        <div className="pu-metric">
          <div className="pu-metric-value">{data.problems.totalProblems}</div>
          <div className="pu-metric-label">Total Problems (90d)</div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value pu-positive">{autoResolvedPct}%</div>
          <div className="pu-metric-label">Auto-Resolved (&lt;5min)</div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">{rootCausePct}%</div>
          <div className="pu-metric-label">Root Cause Identified</div>
        </div>
      </div>
      <div className="pu-chart-section">
        <h3>Weekly Problem Volume</h3>
        <SparkLine data={data.problems.weeklyTrend} color="#6f2da8" />
        <p className="pu-chart-hint">Declining volume = maturing environment with fewer issues</p>
      </div>
      <div className="pu-insight-box">
        <h3>💡 Insight</h3>
        {Number(autoResolvedPct) > 50 ? (
          <p className="pu-positive">Over half of problems resolve automatically — a strong indicator that alerting and auto-remediation are configured well.</p>
        ) : data.problems.totalProblems === 0 ? (
          <p className="pu-negative">No problems detected in 90 days. This may indicate Davis is not configured to detect issues in this environment. Review anomaly detection settings.</p>
        ) : (
          <p className="pu-neutral">Auto-resolution rate is below 50%. Consider implementing workflows for common problem patterns to improve MTTR.</p>
        )}
      </div>
    </div>
  );
};

const AdoptionTab = ({ data }: { data: PlatformUsageData }) => {
  if (!data.adoption) {
    return <p className="pu-no-data">No adoption data available — audit logs may not be accessible</p>;
  }
  return (
    <div className="pu-tab-content">
      <div className="pu-section-intro">
        <p>Platform adoption measures how many users actively engage with Dynatrace. Higher adoption reduces churn risk and increases organizational value.</p>
      </div>
      <div className="pu-metrics-row">
        <div className="pu-metric">
          <div className="pu-metric-value">{data.adoption.monthlyActiveUsers}</div>
          <div className="pu-metric-label">Monthly Active Users</div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">{data.adoption.totalUniqueUsers}</div>
          <div className="pu-metric-label">Unique Users (90d)</div>
        </div>
      </div>
      <div className="pu-chart-section">
        <h3>Daily Active Users Trend</h3>
        <SparkLine data={data.adoption.dailyActiveUsers} color="#59c46b" />
        <p className="pu-chart-hint">Upward trend = growing platform stickiness</p>
      </div>
      {data.adoption.featureBreakdown.length > 0 && (
        <div className="pu-sub-section">
          <h3>Feature Usage Breakdown</h3>
          <div className="pu-bar-chart">
            {data.adoption.featureBreakdown.slice(0, 10).map((f) => (
              <div key={f.feature} className="pu-bar-row">
                <span className="pu-bar-label">{f.feature}</span>
                <div className="pu-bar-track">
                  <div
                    className="pu-bar-fill"
                    style={{
                      width: `${(f.count / (data.adoption!.featureBreakdown[0]?.count || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="pu-bar-value">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="pu-insight-box">
        <h3>💡 Insight</h3>
        {data.adoption.monthlyActiveUsers >= 10 ? (
          <p className="pu-positive">Strong adoption with {data.adoption.monthlyActiveUsers} monthly active users. The platform is well-embedded across the organization.</p>
        ) : data.adoption.monthlyActiveUsers >= 3 ? (
          <p className="pu-neutral">Moderate adoption. Consider running enablement sessions to expand usage to more team members.</p>
        ) : (
          <p className="pu-negative">Low adoption is a significant churn risk. Only {data.adoption.monthlyActiveUsers} user(s) are active monthly. Prioritize hands-on workshops and champion programs.</p>
        )}
      </div>
    </div>
  );
};

const SloTab = ({ data }: { data: PlatformUsageData }) => {
  if (!data.slo) {
    return <p className="pu-no-data">No SLO data available</p>;
  }
  const complianceRate = data.slo.totalSlos > 0 ? ((data.slo.meetingTarget / data.slo.totalSlos) * 100).toFixed(0) : "0";
  return (
    <div className="pu-tab-content">
      <div className="pu-section-intro">
        <p>SLO compliance tracks whether defined reliability targets are being met. Rising compliance shows the team is driving measurable improvements.</p>
      </div>
      <div className="pu-metrics-row">
        <div className="pu-metric">
          <div className="pu-metric-value">{data.slo.totalSlos}</div>
          <div className="pu-metric-label">Total SLOs Configured</div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value pu-positive">{data.slo.meetingTarget}</div>
          <div className="pu-metric-label">Meeting Target</div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">{complianceRate}%</div>
          <div className="pu-metric-label">Compliance Rate</div>
        </div>
      </div>
      <div className="pu-chart-section">
        <h3>SLO Breach Trend</h3>
        <SparkLine data={data.slo.complianceTrend} color="#ff6600" />
        <p className="pu-chart-hint">Lower = fewer breaches = better reliability</p>
      </div>
      <div className="pu-insight-box">
        <h3>💡 Insight</h3>
        {data.slo.totalSlos === 0 ? (
          <p className="pu-negative">No SLOs are configured. Defining SLOs is a critical step toward measuring and improving reliability. Start with golden signal SLOs for key services.</p>
        ) : Number(complianceRate) >= 95 ? (
          <p className="pu-positive">Excellent SLO compliance at {complianceRate}%. Consider tightening targets or adding SLOs for more services.</p>
        ) : (
          <p className="pu-neutral">SLO compliance is at {complianceRate}%. Review breaching SLOs and create action plans for the most impactful ones.</p>
        )}
      </div>
    </div>
  );
};

const WorkflowsTab = ({ data }: { data: PlatformUsageData }) => {
  if (!data.workflows) {
    return <p className="pu-no-data">No workflow data available</p>;
  }
  return (
    <div className="pu-tab-content">
      <div className="pu-section-intro">
        <p>Workflow automation shows how much operational toil is being handled by Dynatrace Workflows. Active automation reduces MTTR and frees up engineering time.</p>
      </div>
      <div className="pu-metrics-row">
        <div className="pu-metric">
          <div className="pu-metric-value">{data.workflows.totalExecutions}</div>
          <div className="pu-metric-label">Total Executions (90d)</div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value pu-positive">{data.workflows.successRate.toFixed(0)}%</div>
          <div className="pu-metric-label">Success Rate</div>
        </div>
      </div>
      <div className="pu-chart-section">
        <h3>Weekly Workflow Executions</h3>
        <SparkLine data={data.workflows.weeklyTrend} color="#1496ff" />
        <p className="pu-chart-hint">Upward trend = growing automation adoption</p>
      </div>
      {data.workflows.topWorkflows.length > 0 && (
        <div className="pu-sub-section">
          <h3>Top Workflows by Execution Count</h3>
          <div className="pu-bar-chart">
            {data.workflows.topWorkflows.map((w) => (
              <div key={w.name} className="pu-bar-row">
                <span className="pu-bar-label">{w.name}</span>
                <div className="pu-bar-track">
                  <div
                    className="pu-bar-fill"
                    style={{
                      width: `${(w.executions / (data.workflows!.topWorkflows[0]?.executions || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="pu-bar-value">{w.executions}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="pu-insight-box">
        <h3>💡 Insight</h3>
        {data.workflows.totalExecutions === 0 ? (
          <p className="pu-negative">No workflows executed. Implementing auto-remediation workflows for common issues (disk cleanup, service restarts, scaling) can dramatically reduce MTTR.</p>
        ) : data.workflows.successRate >= 90 ? (
          <p className="pu-positive">Workflows are running reliably with a {data.workflows.successRate.toFixed(0)}% success rate. Consider expanding automation to cover more operational patterns.</p>
        ) : (
          <p className="pu-neutral">Workflow success rate is below 90%. Review failing executions and fix configuration issues to improve reliability.</p>
        )}
      </div>
    </div>
  );
};

const EntityGrowthTab = ({ data }: { data: PlatformUsageData }) => {
  if (!data.entityGrowth) {
    return <p className="pu-no-data">No entity data available</p>;
  }
  return (
    <div className="pu-tab-content">
      <div className="pu-section-intro">
        <p>Monitored entity growth tracks how much infrastructure and application coverage is expanding. Growing entities indicate deeper platform adoption and investment.</p>
      </div>
      <div className="pu-metrics-row">
        <div className="pu-metric">
          <div className="pu-metric-value">{data.entityGrowth.hosts.current}</div>
          <div className="pu-metric-label">
            Hosts <TrendArrow current={data.entityGrowth.hosts.current} previous={data.entityGrowth.hosts.previous} />
          </div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">{data.entityGrowth.services.current}</div>
          <div className="pu-metric-label">
            Services <TrendArrow current={data.entityGrowth.services.current} previous={data.entityGrowth.services.previous} />
          </div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">{data.entityGrowth.applications.current}</div>
          <div className="pu-metric-label">
            Applications <TrendArrow current={data.entityGrowth.applications.current} previous={data.entityGrowth.applications.previous} />
          </div>
        </div>
      </div>
      <div className="pu-chart-section">
        <h3>New Hosts Onboarded per Week</h3>
        <SparkLine data={data.entityGrowth.weeklyGrowth} color="#59c46b" />
        <p className="pu-chart-hint">Consistent growth = healthy platform expansion</p>
      </div>
      <div className="pu-insight-box">
        <h3>💡 Insight</h3>
        {data.entityGrowth.hosts.current > data.entityGrowth.hosts.previous ? (
          <p className="pu-positive">Entity count is growing — {data.entityGrowth.hosts.current - data.entityGrowth.hosts.previous} new hosts added this quarter. The customer is expanding their Dynatrace footprint.</p>
        ) : data.entityGrowth.hosts.current < data.entityGrowth.hosts.previous ? (
          <p className="pu-negative">Entity count has <strong>declined</strong> — {data.entityGrowth.hosts.previous - data.entityGrowth.hosts.current} fewer hosts than last quarter. Investigate if decommissioning is planned or if agents are being removed.</p>
        ) : (
          <p className="pu-neutral">Entity count is stable. Look for expansion opportunities in unmonitored environments.</p>
        )}
      </div>
    </div>
  );
};

const WebVitalsTab = ({ data }: { data: PlatformUsageData }) => {
  if (!data.webVitals) {
    return <p className="pu-no-data">No Web Vitals data — ensure RUM is configured</p>;
  }
  return (
    <div className="pu-tab-content">
      <div className="pu-section-intro">
        <p>Core Web Vitals measure real user experience. Improvements here directly translate to business outcomes — better engagement, lower bounce rates, and higher conversion.</p>
      </div>
      <div className="pu-metrics-row pu-metrics-grid">
        <div className="pu-metric">
          <div className="pu-metric-value">{data.webVitals.lcp.current.toFixed(0)} ms</div>
          <div className="pu-metric-label">
            LCP (Largest Contentful Paint)
            <br />
            <TrendArrow current={data.webVitals.lcp.current} previous={data.webVitals.lcp.previous} invertColors />
          </div>
          <div className="pu-metric-threshold">
            {data.webVitals.lcp.current <= 2500 ? "✅ Good" : data.webVitals.lcp.current <= 4000 ? "⚠️ Needs Improvement" : "🔴 Poor"}
          </div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">{data.webVitals.cls.current.toFixed(3)}</div>
          <div className="pu-metric-label">
            CLS (Cumulative Layout Shift)
            <br />
            <TrendArrow current={data.webVitals.cls.current} previous={data.webVitals.cls.previous} invertColors />
          </div>
          <div className="pu-metric-threshold">
            {data.webVitals.cls.current <= 0.1 ? "✅ Good" : data.webVitals.cls.current <= 0.25 ? "⚠️ Needs Improvement" : "🔴 Poor"}
          </div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">{data.webVitals.inp.current.toFixed(0)} ms</div>
          <div className="pu-metric-label">
            INP (Interaction to Next Paint)
            <br />
            <TrendArrow current={data.webVitals.inp.current} previous={data.webVitals.inp.previous} invertColors />
          </div>
          <div className="pu-metric-threshold">
            {data.webVitals.inp.current <= 200 ? "✅ Good" : data.webVitals.inp.current <= 500 ? "⚠️ Needs Improvement" : "🔴 Poor"}
          </div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">{data.webVitals.apdex.current.toFixed(2)}</div>
          <div className="pu-metric-label">Apdex Score</div>
          <div className="pu-metric-threshold">
            {data.webVitals.apdex.current >= 0.9 ? "✅ Excellent" : data.webVitals.apdex.current >= 0.7 ? "⚠️ Fair" : "🔴 Poor"}
          </div>
        </div>
      </div>
      <div className="pu-insight-box">
        <h3>💡 Insight</h3>
        {data.webVitals.lcp.current <= 2500 && data.webVitals.cls.current <= 0.1 && data.webVitals.inp.current <= 200 ? (
          <p className="pu-positive">All Core Web Vitals are in the "Good" range. Users are experiencing excellent performance.</p>
        ) : (
          <p className="pu-neutral">Some Web Vitals need attention. Use Dynatrace Session Replay and Waterfall analysis to identify optimization opportunities.</p>
        )}
      </div>
    </div>
  );
};

const SecurityTab = ({ data }: { data: PlatformUsageData }) => {
  if (!data.security) {
    return <p className="pu-no-data">No security data — Application Security may not be enabled</p>;
  }
  return (
    <div className="pu-tab-content">
      <div className="pu-section-intro">
        <p>Security posture shows runtime vulnerability detection, resolution velocity, and attack prevention powered by Dynatrace Application Security.</p>
      </div>
      <div className="pu-metrics-row">
        <div className="pu-metric">
          <div className="pu-metric-value">{data.security.vulnerabilitiesDetected}</div>
          <div className="pu-metric-label">Vulnerabilities Detected</div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value pu-positive">{data.security.vulnerabilitiesResolved}</div>
          <div className="pu-metric-label">Resolved</div>
        </div>
        <div className="pu-metric">
          <div className="pu-metric-value">{data.security.attacksBlocked}</div>
          <div className="pu-metric-label">Attacks Blocked</div>
        </div>
      </div>
      <div className="pu-chart-section">
        <h3>Vulnerability Detection Trend</h3>
        <SparkLine data={data.security.riskScoreTrend} color="#c4190b" />
        <p className="pu-chart-hint">Declining trend with growing resolved count = improving posture</p>
      </div>
      <div className="pu-insight-box">
        <h3>💡 Insight</h3>
        {data.security.vulnerabilitiesDetected === 0 && data.security.attacksBlocked === 0 ? (
          <p className="pu-negative">No security events detected. If Application Security is licensed, verify that runtime protection is enabled for instrumented services.</p>
        ) : data.security.vulnerabilitiesResolved > data.security.vulnerabilitiesDetected * 0.5 ? (
          <p className="pu-positive">Good remediation velocity — over 50% of detected vulnerabilities have been resolved.</p>
        ) : (
          <p className="pu-neutral">Remediation velocity is below 50%. Prioritize critical and high-severity vulnerabilities that are reachable from the internet.</p>
        )}
      </div>
    </div>
  );
};

const SummaryTab = ({ data }: { data: PlatformUsageData }) => {
  return (
    <div className="pu-tab-content">
      <div className="pu-section-intro">
        <p>Overall platform health at a glance. Green indicators show areas of strength; red indicators highlight churn risks requiring attention.</p>
      </div>
      <div className="pu-health-grid">
        <HealthIndicator
          label="MTTR Improving"
          status={data.mttr ? (data.mttr.currentAvgMinutes < data.mttr.previousAvgMinutes ? "good" : data.mttr.currentAvgMinutes === data.mttr.previousAvgMinutes ? "neutral" : "risk") : "unknown"}
        />
        <HealthIndicator
          label="User Adoption"
          status={data.adoption ? (data.adoption.monthlyActiveUsers >= 5 ? "good" : data.adoption.monthlyActiveUsers >= 2 ? "neutral" : "risk") : "unknown"}
        />
        <HealthIndicator
          label="Problem Detection Active"
          status={data.problems ? (data.problems.totalProblems > 0 ? "good" : "risk") : "unknown"}
        />
        <HealthIndicator
          label="SLOs Configured"
          status={data.slo ? (data.slo.totalSlos >= 5 ? "good" : data.slo.totalSlos > 0 ? "neutral" : "risk") : "unknown"}
        />
        <HealthIndicator
          label="Automation Active"
          status={data.workflows ? (data.workflows.totalExecutions > 0 ? "good" : "risk") : "unknown"}
        />
        <HealthIndicator
          label="Entity Growth"
          status={data.entityGrowth ? (data.entityGrowth.hosts.current > data.entityGrowth.hosts.previous ? "good" : data.entityGrowth.hosts.current === data.entityGrowth.hosts.previous ? "neutral" : "risk") : "unknown"}
        />
        <HealthIndicator
          label="Web Vitals Tracked"
          status={data.webVitals ? (data.webVitals.lcp.current > 0 ? "good" : "risk") : "unknown"}
        />
        <HealthIndicator
          label="Security Enabled"
          status={data.security ? (data.security.vulnerabilitiesDetected > 0 || data.security.attacksBlocked > 0 ? "good" : "risk") : "unknown"}
        />
      </div>

      <div className="pu-summary-recommendations">
        <h3>Recommended Focus Areas</h3>
        <div className="pu-recommendation-list">
          {data.adoption && data.adoption.monthlyActiveUsers < 5 && (
            <div className="pu-recommendation pu-recommendation-critical">
              <span className="pu-rec-icon">🔴</span>
              <div>
                <strong>Increase Platform Adoption</strong>
                <p>Only {data.adoption.monthlyActiveUsers} monthly active user(s). Run hands-on workshops and identify champions to expand usage.</p>
              </div>
            </div>
          )}
          {data.mttr && data.mttr.currentAvgMinutes > data.mttr.previousAvgMinutes && (
            <div className="pu-recommendation pu-recommendation-critical">
              <span className="pu-rec-icon">🔴</span>
              <div>
                <strong>Address Rising MTTR</strong>
                <p>Resolution time increased this quarter. Review Davis alerting configuration and implement auto-remediation workflows.</p>
              </div>
            </div>
          )}
          {data.slo && data.slo.totalSlos === 0 && (
            <div className="pu-recommendation pu-recommendation-warning">
              <span className="pu-rec-icon">⚠️</span>
              <div>
                <strong>Configure SLOs</strong>
                <p>No SLOs defined. Start with availability and latency SLOs for critical user-facing services.</p>
              </div>
            </div>
          )}
          {data.workflows && data.workflows.totalExecutions === 0 && (
            <div className="pu-recommendation pu-recommendation-warning">
              <span className="pu-rec-icon">⚠️</span>
              <div>
                <strong>Enable Automation</strong>
                <p>No workflows running. Implement auto-remediation for common operational issues to reduce toil.</p>
              </div>
            </div>
          )}
          {data.entityGrowth && data.entityGrowth.hosts.current < data.entityGrowth.hosts.previous && (
            <div className="pu-recommendation pu-recommendation-critical">
              <span className="pu-rec-icon">🔴</span>
              <div>
                <strong>Entity Count Declining</strong>
                <p>Monitored entities decreased — investigate whether agents are being removed or infrastructure is being decommissioned.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Sub-Tab Definitions ---

type SubTabId = "summary" | "mttr" | "problems" | "adoption" | "slo" | "workflows" | "entities" | "webvitals" | "security";

const SUB_TABS: { id: SubTabId; label: string; icon: string }[] = [
  { id: "summary", label: "Summary", icon: "📊" },
  { id: "mttr", label: "MTTR", icon: "⏱️" },
  { id: "problems", label: "Problems", icon: "🔔" },
  { id: "adoption", label: "Adoption", icon: "👥" },
  { id: "slo", label: "SLOs", icon: "🎯" },
  { id: "workflows", label: "Workflows", icon: "⚙️" },
  { id: "entities", label: "Entities", icon: "📈" },
  { id: "webvitals", label: "Web Vitals", icon: "🌐" },
  { id: "security", label: "Security", icon: "🔒" },
];

// --- Main Component ---

export const PlatformUsage = () => {
  const [data, setData] = useState<PlatformUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SubTabId>("summary");
  const { customerName } = useCustomerName();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAllPlatformUsage();
        setData(result);
      } catch (e: any) {
        setError(e?.message || "Failed to load platform usage data");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="pu-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Loading Platform Usage Data...</h2>
        <p className="pu-subtitle">Querying Dynatrace environment metrics via DQL</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pu-container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h2>Error Loading Data</h2>
        <p className="pu-subtitle">{error}</p>
        <Button variant="emphasized" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case "summary": return <SummaryTab data={data} />;
      case "mttr": return <MttrTab data={data} />;
      case "problems": return <ProblemsTab data={data} />;
      case "adoption": return <AdoptionTab data={data} />;
      case "slo": return <SloTab data={data} />;
      case "workflows": return <WorkflowsTab data={data} />;
      case "entities": return <EntityGrowthTab data={data} />;
      case "webvitals": return <WebVitalsTab data={data} />;
      case "security": return <SecurityTab data={data} />;
      default: return null;
    }
  };

  return (
    <div className="pu-container">
      <div className="pu-header">
        <h1>Platform Usage Analysis</h1>
        <p className="pu-subtitle">
          Dynatrace platform health indicators for {customerName || "this environment"} — Last 90 days
        </p>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="pu-tabs">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`pu-tab-btn ${activeTab === tab.id ? "pu-tab-btn-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="pu-tab-icon">{tab.icon}</span>
            <span className="pu-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pu-tab-panel">
        {renderTabContent()}
      </div>
    </div>
  );
};
