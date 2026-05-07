/**
/* Automatically generated code for test-queries.dql
*/
import { queryExecutionClient, QueryStartResponse } from '@dynatrace-sdk/client-query';

export function getQueryString(){
  return `fetch events, from:now()-90d
| filter event.kind == "DAVIS_PROBLEM"
| filter isNotNull(resolved_problem_duration)
| summarize avg_mttr = avg(resolved_problem_duration) / 1000000000 / 60
`;
}

export async function runQuery(): Promise<QueryStartResponse> {
  return await queryExecutionClient.queryExecute({body: { query: getQueryString(), requestTimeoutMilliseconds: 30000 }});
}