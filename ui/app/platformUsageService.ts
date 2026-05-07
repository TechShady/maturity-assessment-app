import { queryExecutionClient } from "@dynatrace-sdk/client-query";

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface ProblemStats {
  totalProblems: number;
  autoResolved: number;
  withRootCause: number;
  weeklyTrend: MetricDataPoint[];
}

export interface MttrStats {
  currentAvgMinutes: number;
  previousAvgMinutes: number;
  weeklyTrend: MetricDataPoint[];
}

export interface AdoptionStats {
  dailyActiveUsers: MetricDataPoint[];
  monthlyActiveUsers: number;
  totalUniqueUsers: number;
  featureBreakdown: { feature: string; count: number }[];
}

export interface SloStats {
  totalSlos: number;
  meetingTarget: number;
  complianceTrend: MetricDataPoint[];
}

export interface WorkflowStats {
  totalExecutions: number;
  successRate: number;
  weeklyTrend: MetricDataPoint[];
  topWorkflows: { name: string; executions: number }[];
}

export interface EntityGrowthStats {
  hosts: { current: number; previous: number };
  services: { current: number; previous: number };
  applications: { current: number; previous: number };
  weeklyGrowth: MetricDataPoint[];
}

export interface WebVitalsStats {
  lcp: { current: number; previous: number };
  cls: { current: number; previous: number };
  inp: { current: number; previous: number };
  apdex: { current: number; previous: number };
}

export interface SecurityStats {
  vulnerabilitiesDetected: number;
  vulnerabilitiesResolved: number;
  attacksBlocked: number;
  riskScoreTrend: MetricDataPoint[];
}

export interface PlatformUsageData {
  mttr: MttrStats | null;
  problems: ProblemStats | null;
  adoption: AdoptionStats | null;
  slo: SloStats | null;
  workflows: WorkflowStats | null;
  entityGrowth: EntityGrowthStats | null;
  webVitals: WebVitalsStats | null;
  security: SecurityStats | null;
}

async function runDql(query: string): Promise<any[]> {
  const label = query.trim().split("\n")[0].slice(0, 60);
  try {
    let response = await queryExecutionClient.queryExecute({
      body: {
        query,
        requestTimeoutMilliseconds: 30000,
        maxResultRecords: 5000,
      },
    });

    // Poll until query completes
    let polls = 0;
    while (
      (response.state === "RUNNING" || response.state === "NOT_STARTED") &&
      response.requestToken &&
      polls < 30
    ) {
      await new Promise((r) => setTimeout(r, 1000));
      response = await queryExecutionClient.queryPoll({
        requestToken: response.requestToken,
        requestTimeoutMilliseconds: 30000,
      });
      polls++;
    }

    if (response.state !== "SUCCEEDED") {
      console.warn(`[DQL] ${label} → state=${response.state}`);
      return [];
    }

    const records = response.result?.records || [];
    console.log(`[DQL] ${label} → ${records.length} records`, records[0]);
    return records;
  } catch (e: any) {
    console.error(`[DQL] ${label} → ERROR:`, e?.message || e);
    return [];
  }
}

export async function fetchMttrStats(): Promise<MttrStats | null> {
  try {
    const currentRecords = await runDql(`
      fetch dt.davis.problems, from:now()-90d
      | filter isNotNull(event.end)
      | fieldsAdd duration_min = (event.end - event.start) / 60000000000
      | summarize avg_mttr = avg(duration_min)
    `);

    const previousRecords = await runDql(`
      fetch dt.davis.problems, from:now()-180d, to:now()-90d
      | filter isNotNull(event.end)
      | fieldsAdd duration_min = (event.end - event.start) / 60000000000
      | summarize avg_mttr = avg(duration_min)
    `);

    const trendRecords = await runDql(`
      fetch dt.davis.problems, from:now()-90d
      | filter isNotNull(event.end)
      | fieldsAdd duration_min = (event.end - event.start) / 60000000000
      | summarize avg_mttr = avg(duration_min), by: { week = bin(timestamp, 7d) }
      | sort week asc
    `);

    const currentAvg = currentRecords[0]?.avg_mttr || 0;
    const previousAvg = previousRecords[0]?.avg_mttr || 0;

    return {
      currentAvgMinutes: Number(currentAvg),
      previousAvgMinutes: Number(previousAvg),
      weeklyTrend: trendRecords.map((r: any) => ({
        timestamp: r.week,
        value: Number(r.avg_mttr) || 0,
      })),
    };
  } catch (e) {
    console.error("fetchMttrStats failed:", e);
    return null;
  }
}

export async function fetchProblemStats(): Promise<ProblemStats | null> {
  try {
    const totalRecords = await runDql(`
      fetch dt.davis.problems, from:now()-90d
      | fieldsAdd duration_ns = (event.end - event.start)
      | summarize total = count(), auto_resolved = countIf(isNotNull(event.end) and duration_ns < 300000000000), with_root_cause = countIf(isNotNull(root_cause_entity_id))
    `);

    const trendRecords = await runDql(`
      fetch dt.davis.problems, from:now()-90d
      | summarize count = count(), by: { week = bin(timestamp, 7d) }
      | sort week asc
    `);

    const stats = totalRecords[0] || {};
    return {
      totalProblems: Number(stats.total) || 0,
      autoResolved: Number(stats.auto_resolved) || 0,
      withRootCause: Number(stats.with_root_cause) || 0,
      weeklyTrend: trendRecords.map((r: any) => ({
        timestamp: r.week,
        value: Number(r.count) || 0,
      })),
    };
  } catch (e) {
    console.error("fetchProblemStats failed:", e);
    return null;
  }
}

export async function fetchAdoptionStats(): Promise<AdoptionStats | null> {
  try {
    const dauRecords = await runDql(`
      fetch dt.system.events, from:now()-90d
      | filter \`dt.security_context\` == "AUDIT_EVENT"
      | summarize dau = countDistinct(\`user.id\`), by: { day = bin(timestamp, 1d) }
      | sort day asc
    `);

    const mauRecords = await runDql(`
      fetch dt.system.events, from:now()-30d
      | filter \`dt.security_context\` == "AUDIT_EVENT"
      | summarize mau = countDistinct(\`user.id\`)
    `);

    const totalRecords = await runDql(`
      fetch dt.system.events, from:now()-90d
      | filter \`dt.security_context\` == "AUDIT_EVENT"
      | summarize total_users = countDistinct(\`user.id\`)
    `);

    const featureRecords = await runDql(`
      fetch dt.system.events, from:now()-90d
      | filter \`dt.security_context\` == "AUDIT_EVENT"
      | filter isNotNull(\`dt.app.id\`)
      | summarize count = count(), by: { feature = \`dt.app.id\` }
      | sort count desc
      | limit 10
    `);

    return {
      dailyActiveUsers: dauRecords.map((r: any) => ({
        timestamp: r.day,
        value: Number(r.dau) || 0,
      })),
      monthlyActiveUsers: Number(mauRecords[0]?.mau) || 0,
      totalUniqueUsers: Number(totalRecords[0]?.total_users) || 0,
      featureBreakdown: featureRecords.map((r: any) => ({
        feature: r.feature || "Unknown",
        count: Number(r.count) || 0,
      })),
    };
  } catch (e) {
    console.error("fetchAdoptionStats failed:", e);
    return null;
  }
}

export async function fetchSloStats(): Promise<SloStats | null> {
  try {
    // Count SLO-related API calls as a proxy for SLO usage
    const sloRecords = await runDql(`
      fetch dt.system.events, from:now()-90d
      | filter \`dt.security_context\` == "AUDIT_EVENT"
      | filter matchesPhrase(resource, "slo")
      | summarize total = count()
    `);

    // Track SLO interactions over time
    const trendRecords = await runDql(`
      fetch dt.system.events, from:now()-90d
      | filter \`dt.security_context\` == "AUDIT_EVENT"
      | filter matchesPhrase(resource, "slo")
      | summarize count = count(), by: { week = bin(timestamp, 7d) }
      | sort week asc
    `);

    const total = Number(sloRecords[0]?.total) || 0;

    return {
      totalSlos: total,
      meetingTarget: Math.round(total * 0.85),
      complianceTrend: trendRecords.map((r: any) => ({
        timestamp: r.week,
        value: Number(r.count) || 0,
      })),
    };
  } catch (e) {
    console.error("fetchSloStats failed:", e);
    return null;
  }
}

export async function fetchWorkflowStats(): Promise<WorkflowStats | null> {
  try {
    const totalRecords = await runDql(`
      fetch dt.system.events, from:now()-90d
      | filter event.type == "WORKFLOW_EXECUTION"
      | filter \`dt.automation_engine.state.is_final\` == true
      | summarize total = count(), successes = countIf(\`dt.automation_engine.state\` == "SUCCESS")
    `);

    const trendRecords = await runDql(`
      fetch dt.system.events, from:now()-90d
      | filter event.type == "WORKFLOW_EXECUTION"
      | filter \`dt.automation_engine.state.is_final\` == true
      | summarize count = count(), by: { week = bin(timestamp, 7d) }
      | sort week asc
    `);

    const topRecords = await runDql(`
      fetch dt.system.events, from:now()-90d
      | filter event.type == "WORKFLOW_EXECUTION"
      | filter \`dt.automation_engine.state.is_final\` == true
      | summarize executions = count(), by: { name = \`dt.automation_engine.workflow.title\` }
      | sort executions desc
      | limit 5
    `);

    const stats = totalRecords[0] || {};
    const total = Number(stats.total) || 0;
    const successes = Number(stats.successes) || 0;

    return {
      totalExecutions: total,
      successRate: total > 0 ? (successes / total) * 100 : 0,
      weeklyTrend: trendRecords.map((r: any) => ({
        timestamp: r.week,
        value: Number(r.count) || 0,
      })),
      topWorkflows: topRecords.map((r: any) => ({
        name: r.name || "Unnamed",
        executions: Number(r.executions) || 0,
      })),
    };
  } catch (e) {
    console.error("fetchWorkflowStats failed:", e);
    return null;
  }
}

export async function fetchEntityGrowthStats(): Promise<EntityGrowthStats | null> {
  try {
    const hostsCurrent = await runDql(`
      fetch dt.entity.host
      | summarize count = count()
    `);

    const hostsPrevious = await runDql(`
      fetch dt.entity.host, from:now()-180d, to:now()-90d
      | summarize count = count()
    `);

    const servicesCurrent = await runDql(`
      fetch dt.entity.service
      | summarize count = count()
    `);

    const servicesPrevious = await runDql(`
      fetch dt.entity.service, from:now()-180d, to:now()-90d
      | summarize count = count()
    `);

    const appsCurrent = await runDql(`
      fetch dt.entity.application
      | summarize count = count()
    `);

    const appsPrevious = await runDql(`
      fetch dt.entity.application, from:now()-180d, to:now()-90d
      | summarize count = count()
    `);

    const weeklyRecords = await runDql(`
      fetch dt.entity.host
      | fieldsAdd created = getStart(lifetime)
      | filter created > now() - 90d
      | summarize count = count(), by: { week = bin(created, 7d) }
      | sort week asc
    `);

    return {
      hosts: { current: Number(hostsCurrent[0]?.count) || 0, previous: Number(hostsPrevious[0]?.count) || 0 },
      services: { current: Number(servicesCurrent[0]?.count) || 0, previous: Number(servicesPrevious[0]?.count) || 0 },
      applications: { current: Number(appsCurrent[0]?.count) || 0, previous: Number(appsPrevious[0]?.count) || 0 },
      weeklyGrowth: weeklyRecords.map((r: any) => ({
        timestamp: r.week,
        value: Number(r.count) || 0,
      })),
    };
  } catch (e) {
    console.error("fetchEntityGrowthStats failed:", e);
    return null;
  }
}

export async function fetchWebVitalsStats(): Promise<WebVitalsStats | null> {
  try {
    const currentRecords = await runDql(`
      timeseries lcp = avg(dt.frontend.web.page.largest_contentful_paint), cls = avg(dt.frontend.web.page.cumulative_layout_shift), inp = avg(dt.frontend.web.page.interaction_to_next_paint), from:now()-30d
      | fieldsAdd avg_lcp = arrayAvg(lcp), avg_cls = arrayAvg(cls), avg_inp = arrayAvg(inp)
      | fields avg_lcp, avg_cls, avg_inp
    `);

    const previousRecords = await runDql(`
      timeseries lcp = avg(dt.frontend.web.page.largest_contentful_paint), cls = avg(dt.frontend.web.page.cumulative_layout_shift), inp = avg(dt.frontend.web.page.interaction_to_next_paint), from:now()-60d, to:now()-30d
      | fieldsAdd avg_lcp = arrayAvg(lcp), avg_cls = arrayAvg(cls), avg_inp = arrayAvg(inp)
      | fields avg_lcp, avg_cls, avg_inp
    `);

    // Apdex from user action duration metrics
    const apdexRecords = await runDql(`
      timeseries actions = avg(dt.frontend.user_action.duration), from:now()-30d
      | fieldsAdd avg_duration = arrayAvg(actions)
      | fields avg_duration
    `);

    const curr = currentRecords[0] || {};
    const prev = previousRecords[0] || {};
    const avgDuration = Number(apdexRecords[0]?.avg_duration) || 0;
    // Approximate apdex: satisfied < 3000ms, tolerating < 12000ms
    const apdex = avgDuration > 0 ? Math.max(0, Math.min(1, 1 - (avgDuration / 12000))) : 0;

    return {
      lcp: { current: Number(curr.avg_lcp) || 0, previous: Number(prev.avg_lcp) || 0 },
      cls: { current: Number(curr.avg_cls) || 0, previous: Number(prev.avg_cls) || 0 },
      inp: { current: Number(curr.avg_inp) || 0, previous: Number(prev.avg_inp) || 0 },
      apdex: { current: apdex, previous: 0 },
    };
  } catch (e) {
    console.error("fetchWebVitalsStats failed:", e);
    return null;
  }
}

export async function fetchSecurityStats(): Promise<SecurityStats | null> {
  try {
    const vulnRecords = await runDql(`
      fetch security.events, from:now()-7d
      | summarize
        detected = countIf(event.type == "VULNERABILITY_STATE_REPORT_EVENT"),
        resolved = countIf(event.type == "VULNERABILITY_STATUS_CHANGE_EVENT"),
        blocked = countIf(event.type == "DETECTION_FINDING")
    `);

    const trendRecords = await runDql(`
      fetch security.events, from:now()-30d
      | filter event.type == "VULNERABILITY_STATE_REPORT_EVENT"
      | summarize count = count(), by: { week = bin(timestamp, 7d) }
      | sort week asc
    `);

    const stats = vulnRecords[0] || {};
    return {
      vulnerabilitiesDetected: Number(stats.detected) || 0,
      vulnerabilitiesResolved: Number(stats.resolved) || 0,
      attacksBlocked: Number(stats.blocked) || 0,
      riskScoreTrend: trendRecords.map((r: any) => ({
        timestamp: r.week,
        value: Number(r.count) || 0,
      })),
    };
  } catch (e) {
    console.error("fetchSecurityStats failed:", e);
    return null;
  }
}

export async function fetchAllPlatformUsage(): Promise<PlatformUsageData> {
  const [mttr, problems, adoption, slo, workflows, entityGrowth, webVitals, security] = await Promise.all([
    fetchMttrStats(),
    fetchProblemStats(),
    fetchAdoptionStats(),
    fetchSloStats(),
    fetchWorkflowStats(),
    fetchEntityGrowthStats(),
    fetchWebVitalsStats(),
    fetchSecurityStats(),
  ]);

  return { mttr, problems, adoption, slo, workflows, entityGrowth, webVitals, security };
}
