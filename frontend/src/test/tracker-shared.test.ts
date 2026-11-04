import { describe, it, expect } from "vitest";
import { normalizeStepsSequential, normalizeStepsIndependent } from "@/hooks/useTracker";
import type { TrackerRow } from "@/hooks/useTracker";

describe("Shared Tracker Multi-User Logic", () => {
  const sampleRow: TrackerRow = {
    id: "test-row-1",
    account_id: "acc-123",
    patient_name: "John Doe",
    step1: "Pending",
    step2: "Pending",
    step3: "Pending",
    overall_status: "Pending",
    notes: "Follow up required",
    created_by: "another-user-uuid",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("allows updating steps sequentially regardless of original creator", () => {
    const patch = normalizeStepsSequential(sampleRow, "step1", "Successfully Sent");
    expect(patch.step1).toBe("Successfully Sent");
    expect(patch.step2).toBeNull();
    expect(patch.step3).toBeNull();
  });

  it("handles independent step status updates across users", () => {
    const patch = normalizeStepsIndependent(sampleRow, "step2", "Successfully Sent");
    expect(patch.step1).toBe("Pending");
    expect(patch.step2).toBe("Successfully Sent");
    expect(patch.step3).toBe("Pending");
  });

  it("verifies row created by other user can transition from pending to failed and enables step 2", () => {
    const patch = normalizeStepsSequential(sampleRow, "step1", "Failed");
    expect(patch.step1).toBe("Failed");
    expect(patch.step2).toBe("Pending");
  });
});
