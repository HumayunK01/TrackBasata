import {
  createUseTracker,
  createFetchAllRows,
  createUseResolvedByDay,
  createUseUpsert,
  createUseUpdateStep,
  createUseDelete,
  normalizeStepsSequential,
} from "./useTracker";

export type { StepStatus as FaxStepStatus, StepField, TrackerRow as FaxRow, TrackerInput as FaxInput } from "./useTracker";
export { STEP_STATUSES, toTitleCase, isResolved, normalizeStepsSequential as normalizeSteps } from "./useTracker";

export const FAX_CATEGORY_KEY = "fax_resolved";
export const FAX_CATEGORY_LABEL = "Fax Resolved";
export const FAX_CATEGORY_SHORT = "Fax";

export const useFaxTracker = createUseTracker("fax_tracker", "fax_tracker");
export const fetchAllFaxRows = createFetchAllRows("fax_tracker");
export const useFaxResolvedByDay = createUseResolvedByDay("fax_resolved_by_day", "fax_tracker");
export const useUpsertFax = createUseUpsert("fax_tracker", "fax_tracker", "fax_");
export const useUpdateStep = createUseUpdateStep("fax_tracker", "fax_tracker", "fax_", normalizeStepsSequential);
export const useDeleteFax = createUseDelete("fax_tracker", "fax_tracker", "fax_");
