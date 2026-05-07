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
