import React from "react";
import { Button } from "@dynatrace/strato-components/buttons";
import "../styles/help.css";

export const Help = () => {
  return (
    <div className="help-container">
      <div className="print-bar">
        <Button variant="emphasized" onClick={() => window.print()}>Print to PDF</Button>
      </div>
      <div className="help-header">
        <h1>Help &amp; Guide</h1>
        <p>Everything you need to know about the assessment application.</p>
      </div>

      <div className="help-section">
        <h2>📋 Getting Started</h2>
        <div className="help-content">
          <p>This app contains two separate assessments:</p>
          <ol>
            <li><strong>Dynatrace Maturity Assessment</strong> — evaluates your organization's Dynatrace deployment maturity, observability practices, and product coverage across key capabilities. No user or team information is collected.</li>
            <li><strong>Personal Growth Assessment</strong> — evaluates your individual proficiency with the Dynatrace platform and how effectively you leverage its capabilities. Requires your name and team.</li>
          </ol>
        </div>
      </div>

      <div className="help-section">
        <h2>🏢 Dynatrace Maturity Assessment</h2>
        <div className="help-content">
          <p>This assessment covers organizational maturity and product coverage:</p>
          <ul>
            <li><strong>Observability &amp; Monitoring</strong> — full-stack coverage, alerting, dashboards</li>
            <li><strong>Incident Management</strong> — detection, response, postmortems</li>
            <li><strong>SLO &amp; Error Budget Management</strong> — SLO definitions, error budget policies</li>
            <li><strong>Automation &amp; Toil Reduction</strong> — CI/CD, self-healing, toil measurement</li>
            <li><strong>Reliability Culture &amp; Practices</strong> — SRE adoption, reliability in SDLC</li>
            <li><strong>Deployment Coverage</strong> — breadth of Dynatrace deployment and onboarding</li>
            <li><strong>Coverage &amp; Usage</strong> — percentage coverage for each Dynatrace product capability (Infrastructure, Logs, Cloud, Tracing, RUM, AI Observability, Security, Kubernetes, Databases, Network, Live Debugger, Synthetics, Session Replay, Business Events, Business Insights)</li>
          </ul>
          <p>The Coverage &amp; Usage category identifies gaps where Dynatrace capabilities can be expanded or sold into.</p>
        </div>
      </div>

      <div className="help-section">
        <h2>👤 Personal Growth Assessment</h2>
        <div className="help-content">
          <p>This assessment measures individual Dynatrace skills and platform usage:</p>
          <ul>
            <li><strong>Personal Proficiency</strong> — skill level, learning approach, problem-solving</li>
            <li><strong>Problem Cards</strong> — how you leverage Problem Cards for incident response</li>
            <li><strong>Smartscape</strong> — topology awareness and dependency understanding</li>
            <li><strong>Site Reliability Guardian</strong> — release validation and quality gates</li>
            <li><strong>Workflows</strong> — types of automation you're building (health checks → self-healing)</li>
            <li><strong>SLOs &amp; SLIs</strong> — how you leverage SLOs for reliability management</li>
            <li><strong>AI-Assisted Platform Usage</strong> — using AI to build dashboards, workflows, and apps</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>🎯 Maturity Levels</h2>
        <div className="help-content">
          <div className="help-levels">
            <div className="help-level"><span className="help-level-badge" style={{ background: "#c4190b" }}>1</span><strong>Foundational Observability</strong> — Basic monitoring, manual response</div>
            <div className="help-level"><span className="help-level-badge" style={{ background: "#ef8b0e" }}>2</span><strong>Standardized Response</strong> — SLOs defined, runbooks standardized</div>
            <div className="help-level"><span className="help-level-badge" style={{ background: "#f5d30e" }}>3</span><strong>Proactive Reliability</strong> — Error budgets drive decisions, chaos engineering</div>
            <div className="help-level"><span className="help-level-badge" style={{ background: "#59c46b" }}>4</span><strong>Predictive Intelligence</strong> — AI-driven detection, automated RCA</div>
            <div className="help-level"><span className="help-level-badge" style={{ background: "#1496ff" }}>5</span><strong>Autonomous Reliability</strong> — Self-healing, closed-loop automation</div>
          </div>
        </div>
      </div>

      <div className="help-section">
        <h2>📈 Results Page</h2>
        <div className="help-content">
          <p>After completing either assessment you'll see:</p>
          <ul>
            <li><strong>Overall Score &amp; Level</strong> — your aggregate maturity rating</li>
            <li><strong>Category Scores</strong> — individual scores per dimension with progress bars</li>
            <li><strong>Priority Recommendations</strong> — actionable guidance for your weakest areas</li>
            <li><strong>Action Plan</strong> — turn recommendations into trackable goals with due dates and status</li>
            <li><strong>Print to PDF</strong> — generates a clean report</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>🕐 History Pages</h2>
        <div className="help-content">
          <p>History is split into two separate views — <strong>DT History</strong> and <strong>PG History</strong> — so you can review each assessment type independently.</p>
          <ul>
            <li><strong>DT History</strong> — all past Dynatrace Maturity assessments with category change pills for DT-specific categories</li>
            <li><strong>PG History</strong> — all past Personal Growth assessments with skill-area change tracking</li>
            <li><strong>Filter by User</strong> — dropdown to show assessments from a specific person</li>
            <li><strong>Change Indicators</strong> — green/red score difference compared to previous assessment</li>
            <li><strong>Category Change Pills</strong> — per-category improvement/regression shown below each card</li>
            <li><strong>Delete</strong> — remove individual assessments you no longer need</li>
            <li><strong>Click to View</strong> — click any card to see its full results</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>🔍 Insights Pages</h2>
        <div className="help-content">
          <p>Insights are split into <strong>DT Insights</strong> and <strong>PG Insights</strong>, each showing analytics for their respective assessment type:</p>
          <ul>
            <li><strong>Score Trend Chart</strong> — line chart showing overall score over time per user</li>
            <li><strong>Category Trends</strong> — multi-line chart showing each category's progression. Click legend items to highlight specific categories; click again to deselect. Multiple selections supported.</li>
            <li><strong>Radar/Spider Chart</strong> — visual comparison of strengths vs weaknesses</li>
            <li><strong>Organization Heatmap</strong> — all users × categories matrix, color-coded by level</li>
            <li><strong>Gap to Target</strong> — set a target level per category, see remaining gap</li>
            <li><strong>Peer Benchmarking</strong> — compare your scores against the organization average</li>
            <li><strong>Biggest Movers</strong> — categories with the largest improvements/regressions</li>
            <li><strong>Achievement Badges</strong> — (PG Insights) badges earned based on growth milestones. Click any badge to generate a formal printable certificate with the Dynatrace logo, company name, recipient, and proficiency details.</li>
            <li><strong>Assessment Cadence</strong> — how frequently each user assesses</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>📑 Executive Summary Pages</h2>
        <div className="help-content">
          <p>Executive summaries are split into <strong>DT Executive</strong> and <strong>PG Executive</strong> for focused leadership views:</p>
          <ul>
            <li><strong>Organization Average Score</strong> — overall maturity/proficiency across all assessors</li>
            <li><strong>KPIs</strong> — total assessors, assessments, and teams</li>
            <li><strong>Organization Radar</strong> — org-wide profile by category</li>
            <li><strong>Top 3 Risks / Skill Gaps</strong> — lowest-scoring categories across the organization</li>
            <li><strong>Top 3 Improvements</strong> — categories with the most improvement over time</li>
            <li><strong>Team Rollup</strong> — aggregated scores per team with per-category breakdowns</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>📊 Coverage Gaps</h2>
        <div className="help-content">
          <p>Identifies observability blind spots based on the Coverage &amp; Usage section of the DT Maturity assessment:</p>
          <ul>
            <li><strong>Summary KPIs</strong> — count of critical gaps, significant gaps, and well-covered capabilities</li>
            <li><strong>Overall Deployment Posture</strong> — high-level deployment breadth and capability utilization scores</li>
            <li><strong>Capability Coverage Breakdown</strong> — per-capability coverage percentage (Infrastructure, Logs, Cloud, Tracing, RUM, AI, Security, K8s, Databases, Network, Live Debugger, Synthetics, Session Replay, Business Events, Business Insights)</li>
            <li><strong>Expansion Opportunities</strong> — ranked list of capabilities where increased coverage would most improve observability completeness</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>⚠️ Risk Assessment</h2>
        <div className="help-content">
          <p>Evaluates organizational risk exposure based on coverage gaps and maturity levels:</p>
          <ul>
            <li><strong>Overall Risk Exposure</strong> — aggregate risk score (higher = greater exposure from gaps)</li>
            <li><strong>Risk by Impact Area</strong> — coverage gaps grouped by what they impact (Availability, MTTR, Security, User Experience, etc.)</li>
            <li><strong>Risk Register</strong> — detailed list of specific risks from coverage gaps, ordered by severity, with descriptions of what happens when each capability is missing</li>
            <li><strong>Practice Maturity Risks</strong> — operational practice areas where lower maturity increases organizational risk</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>� ROI Calculator</h2>
        <div className="help-content">
          <p>Models the business value of improving observability maturity:</p>
          <ul>
            <li><strong>Cost Assumptions</strong> — editable inputs for incident cost, engineer cost, and downtime cost</li>
            <li><strong>Annual Savings Summary</strong> — projected savings based on maturity improvements</li>
            <li><strong>Per-Category ROI</strong> — value projections broken down by maturity dimension</li>
            <li><strong>Value Story</strong> — narrative summary suitable for business cases</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>🔮 What-If Scenario Planner</h2>
        <div className="help-content">
          <p>Interactive scenario modeling for coverage investment decisions:</p>
          <ul>
            <li><strong>Capability Sliders</strong> — drag each of the 15 capability sliders to model target coverage levels</li>
            <li><strong>Negative ROI</strong> — drag sliders below current levels to see the cost impact of reducing observability investment (shown in red)</li>
            <li><strong>Per-Capability ROI</strong> — real-time annual value calculation for each capability change</li>
            <li><strong>Impact Area Grouping</strong> — ROI grouped by business impact (Availability, MTTR, Security, etc.)</li>
            <li><strong>Scenario Summary</strong> — narrative describing the overall projected impact</li>
            <li><strong>Reset / Max All</strong> — quickly reset to current state or maximize all capabilities</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>🗺️ Adoption Roadmap</h2>
        <div className="help-content">
          <p>Prioritized 30/60/90-day adoption plan based on current maturity gaps:</p>
          <ul>
            <li><strong>Phase Filtering</strong> — view actions by 30-day, 60-day, or 90-day timeframe</li>
            <li><strong>Priority-Sorted Actions</strong> — recommendations ordered by business impact</li>
            <li><strong>Maturity-Aware</strong> — actions tailored to your current level in each category</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>❤️ Account Health Score</h2>
        <div className="help-content">
          <p>Composite RAG health score (0–100) combining multiple dimensions:</p>
          <ul>
            <li><strong>Maturity (35%)</strong> — average maturity level across all categories</li>
            <li><strong>Coverage (25%)</strong> — breadth of Dynatrace capability deployment</li>
            <li><strong>Engagement (20%)</strong> — assessment frequency and participation</li>
            <li><strong>Trend (20%)</strong> — score trajectory (improving vs declining)</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>📋 QBR Export</h2>
        <div className="help-content">
          <p>Generates a formatted Quarterly Business Review report:</p>
          <ul>
            <li><strong>Customer Name</strong> — auto-populated from Settings (can be overridden)</li>
            <li><strong>QBR Date</strong> — configurable report date</li>
            <li><strong>HTML Report</strong> — opens in a new tab, ready to print or share</li>
            <li><strong>Includes</strong> — maturity summary, category scores, trends, and recommendations</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>⚙️ Settings &amp; Customer Name</h2>
        <div className="help-content">
          <p>Access Settings and Help from the three-dot menu (⋮) in the upper-right corner:</p>
          <ul>
            <li><strong>Customer Name</strong> — set a company/customer name that displays as a banner at the top of every page</li>
            <li><strong>Persistence</strong> — the name is saved in your browser and persists across sessions</li>
            <li><strong>QBR Integration</strong> — the customer name auto-populates into QBR reports</li>
          </ul>
        </div>
      </div>

      <div className="help-section">
        <h2>�💡 Tips</h2>
        <div className="help-content">
          <ul>
            <li>Use the <strong>DT Maturity</strong> assessment to identify product coverage gaps and organizational maturity</li>
            <li>Use the <strong>Personal Growth</strong> assessment to track individual skill development over time</li>
            <li>For Personal Growth, use the same name each time so the system can track your progress</li>
            <li>Reassess every 30–90 days to build a meaningful trend</li>
            <li>Use <strong>DT Insights</strong> or <strong>PG Insights</strong> before meetings to identify focus areas</li>
            <li>Share <strong>DT Executive</strong> with leadership to communicate maturity investments</li>
            <li>Review <strong>Coverage Gaps</strong> to find where expanded observability would reduce blind spots</li>
            <li>Use <strong>Risk Assessment</strong> to understand exposure from current coverage gaps</li>
            <li>Coverage &amp; Usage scores below Level 3 indicate areas that need attention</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
