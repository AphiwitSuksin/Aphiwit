import type { Branch } from './mockData';
import { apiBranches, branches, importLog } from './mockData';
import { apiRequest, getApiBaseUrl } from './api';

export type ImportLogRow = (typeof importLog)[number];
export type ApiBranchRow = (typeof apiBranches)[number];

export type InputSectionData = {
  branches: Branch[];
  importLog: ImportLogRow[];
  apiBranches: ApiBranchRow[];
  source: 'api' | 'fallback';
};

type InputSectionApiResponse = {
  branches: Branch[];
  importLog: ImportLogRow[];
  apiBranches: ApiBranchRow[];
};

function hasApiBase() {
  return Boolean(getApiBaseUrl().trim());
}

export async function loadInputSectionData(signal?: AbortSignal): Promise<InputSectionData> {
  if (!hasApiBase()) {
    return { branches, importLog, apiBranches, source: 'fallback' };
  }

  try {
    const [branchRows, importRows, integrationRows] = await Promise.all([
      apiRequest<Branch[]>('/branches', { signal }),
      apiRequest<ImportLogRow[]>('/imports/logs', { signal }),
      apiRequest<ApiBranchRow[]>('/integrations/branches', { signal }),
    ]);
    const payload: InputSectionApiResponse = {
      branches: branchRows,
      importLog: importRows,
      apiBranches: integrationRows,
    };
    return { ...payload, source: 'api' };
  } catch {
    return { branches, importLog, apiBranches, source: 'fallback' };
  }
}
