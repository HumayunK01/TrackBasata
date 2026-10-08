import {
  createUseTracker,
  createFetchAllRows,
  createUseResolvedByDay,
  createUseUpsert,
  createUseUpdateStep,
  createUseDelete,
  normalizeStepsIndependent,
} from "./useTracker";

export type { StepStatus as IndexableStepStatus, StepField, TrackerRow as IndexableRow, TrackerInput as IndexableInput } from "./useTracker";
export { STEP_STATUSES, isResolved, normalizeStepsIndependent as normalizeSteps } from "./useTracker";

export const INDEXABLE_CATEGORY_KEY = "indexable_resolved";
export const INDEXABLE_CATEGORY_LABEL = "Indexable Resolved";
export const INDEXABLE_CATEGORY_SHORT = "Indexable";

export const useIndexableTracker = createUseTracker("indexable_tracker", "indexable_tracker");
export const fetchAllIndexableRows = createFetchAllRows("indexable_tracker");
export const useIndexableResolvedByDay = createUseResolvedByDay("indexable_resolved_by_day", "indexable_tracker");
export const useUpsertIndexable = createUseUpsert("indexable_tracker", "indexable_tracker", "indexable_");
export const useUpdateStep = createUseUpdateStep("indexable_tracker", "indexable_tracker", "indexable_", normalizeStepsIndependent);
export const useDeleteIndexable = createUseDelete("indexable_tracker", "indexable_tracker", "indexable_");
