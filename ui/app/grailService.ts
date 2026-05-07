import { stateClient } from "@dynatrace-sdk/client-state";
import { AssessmentResult } from "./types";

const DT_MATURITY_PREFIX = "dt-maturity:";
const PERSONAL_GROWTH_PREFIX = "personal-growth:";

export interface AssessmentRecord extends AssessmentResult {
  answers?: Record<string, number>;
}

// --- Dynatrace Maturity Store ---

export async function getDtMaturityHistory(): Promise<AssessmentRecord[]> {
  return fetchHistory(DT_MATURITY_PREFIX);
}

export async function saveDtMaturityResult(record: AssessmentRecord): Promise<void> {
  return saveRecord(DT_MATURITY_PREFIX, record);
}

export async function deleteDtMaturityResult(id: string): Promise<void> {
  return deleteRecord(DT_MATURITY_PREFIX, id);
}

// --- Personal Growth Store ---

export async function getPersonalGrowthHistory(): Promise<AssessmentRecord[]> {
  return fetchHistory(PERSONAL_GROWTH_PREFIX);
}

export async function savePersonalGrowthResult(record: AssessmentRecord): Promise<void> {
  return saveRecord(PERSONAL_GROWTH_PREFIX, record);
}

export async function deletePersonalGrowthResult(id: string): Promise<void> {
  return deleteRecord(PERSONAL_GROWTH_PREFIX, id);
}

// --- Shared helpers ---

async function fetchHistory(prefix: string): Promise<AssessmentRecord[]> {
  try {
    const response = await stateClient.getAppStates({
      addFields: "value",
      filter: `key starts-with '${prefix}'`,
    });

    const records: AssessmentRecord[] = [];

    for (const item of response) {
      if (item.value) {
        try {
          const record = JSON.parse(item.value) as AssessmentRecord;
          records.push(record);
        } catch { /* skip malformed */ }
      }
    }

    return records.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (e) {
    console.error(`fetchHistory(${prefix}) failed:`, e);
    return [];
  }
}

async function saveRecord(prefix: string, record: AssessmentRecord): Promise<void> {
  try {
    await stateClient.setAppState({
      key: `${prefix}${record.id}`,
      body: { value: JSON.stringify(record) },
    });
  } catch (e) {
    console.error(`saveRecord(${prefix}) failed:`, e);
  }
}

async function deleteRecord(prefix: string, id: string): Promise<void> {
  try {
    await stateClient.deleteAppState({
      key: `${prefix}${id}`,
    });
  } catch (e) {
    console.error(`deleteRecord(${prefix}) failed:`, e);
  }
}

// --- Action Plan Store ---

const ACTION_PLAN_KEY = "action-plan";
const DT_UNIVERSITY_PLAN_KEY = "dt-university-plan";

export interface ActionItem {
  id: string;
  category: string;
  goal: string;
  dueDate: string;
  status: "not-started" | "in-progress" | "completed";
}

export interface UniversityPlan {
  status: "not-started" | "in-progress" | "completed";
  dueDate: string;
}

export async function getActionPlan(): Promise<ActionItem[] | null> {
  try {
    const response = await stateClient.getAppState({ key: ACTION_PLAN_KEY });
    if (response.value) {
      return JSON.parse(response.value) as ActionItem[];
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveActionPlan(items: ActionItem[]): Promise<void> {
  try {
    await stateClient.setAppState({
      key: ACTION_PLAN_KEY,
      body: { value: JSON.stringify(items) },
    });
  } catch (e) {
    console.error("saveActionPlan failed:", e);
  }
}

export async function getUniversityPlan(): Promise<UniversityPlan | null> {
  try {
    const response = await stateClient.getAppState({ key: DT_UNIVERSITY_PLAN_KEY });
    if (response.value) {
      return JSON.parse(response.value) as UniversityPlan;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveUniversityPlan(plan: UniversityPlan): Promise<void> {
  try {
    await stateClient.setAppState({
      key: DT_UNIVERSITY_PLAN_KEY,
      body: { value: JSON.stringify(plan) },
    });
  } catch (e) {
    console.error("saveUniversityPlan failed:", e);
  }
}
