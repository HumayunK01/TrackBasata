import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TeamMemberCard, type TeamMemberItem } from "@/components/ar/team/TeamMemberCard";
import fs from "node:fs";
import path from "node:path";

describe("Disable ID Feature", () => {
  const activeMember: TeamMemberItem = {
    id: "user-123",
    first_name: "Jane",
    last_name: "Doe",
    role: "user",
    daysWorked: 15,
    totalDocs: 450,
    avg: 30,
    logCount: 15,
    is_disabled: false,
  };

  const disabledMember: TeamMemberItem = {
    ...activeMember,
    id: "user-456",
    first_name: "John",
    last_name: "Smith",
    is_disabled: true,
  };

  it("renders active member without disabled badge", () => {
    render(
      <TeamMemberCard
        member={activeMember}
        isMe={false}
        onSelect={vi.fn()}
        onToggleRole={vi.fn()}
        onDeleteRequest={vi.fn()}
        onToggleDisabled={vi.fn()}
      />
    );

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
  });

  it("renders disabled member with Disabled badge", () => {
    render(
      <TeamMemberCard
        member={disabledMember}
        isMe={false}
        onSelect={vi.fn()}
        onToggleRole={vi.fn()}
        onDeleteRequest={vi.fn()}
        onToggleDisabled={vi.fn()}
      />
    );

    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("opens actions dropdown and calls onToggleDisabled with correct target and state", async () => {
    const handleToggleDisabled = vi.fn();
    render(
      <TeamMemberCard
        member={activeMember}
        isMe={false}
        onSelect={vi.fn()}
        onToggleRole={vi.fn()}
        onDeleteRequest={vi.fn()}
        onToggleDisabled={handleToggleDisabled}
      />
    );

    const actionButton = screen.getByLabelText("Actions for Jane Doe");
    fireEvent.keyDown(actionButton, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Disable user")).toBeInTheDocument();
    });

    const disableOption = screen.getByText("Disable user");
    fireEvent.click(disableOption);

    expect(handleToggleDisabled).toHaveBeenCalledWith("user-123", "Jane Doe", true);
  });

  it("offers Re-enable user option for disabled members", async () => {
    const handleToggleDisabled = vi.fn();
    render(
      <TeamMemberCard
        member={disabledMember}
        isMe={false}
        onSelect={vi.fn()}
        onToggleRole={vi.fn()}
        onDeleteRequest={vi.fn()}
        onToggleDisabled={handleToggleDisabled}
      />
    );

    const actionButton = screen.getByLabelText("Actions for John Smith");
    fireEvent.keyDown(actionButton, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Re-enable user")).toBeInTheDocument();
    });

    const enableOption = screen.getByText("Re-enable user");
    fireEvent.click(enableOption);

    expect(handleToggleDisabled).toHaveBeenCalledWith("user-456", "John Smith", false);
  });

  it("migration file contains safety checks and updates both auth.users and profiles", () => {
    const migrationPath = path.resolve(
      __dirname,
      "../../../supabase/migrations/20260923000002_add_disable_user_feature.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    expect(sql).toContain("public.is_admin()");
    expect(sql).toContain("target_user = caller_id");
    expect(sql).toContain("banned_until");
    expect(sql).toContain("is_disabled");
    expect(sql).toContain("public.set_user_disabled");
  });
});
