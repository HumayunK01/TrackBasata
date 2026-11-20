import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OvertimePage from "@/pages/Overtime";

const mockUseOvertimeLogs = vi.fn();
const mockUseIsAdmin = vi.fn();

vi.mock("@/hooks/useOvertimeLogs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useOvertimeLogs")>();
  return {
    ...actual,
    useOvertimeLogs: () => mockUseOvertimeLogs(),
    useUpsertOvertimeLog: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteOvertimeLog: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "alex@example.com" },
    session: null,
    loading: false,
    signOut: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProfile", () => ({
  useIsAdmin: () => mockUseIsAdmin(),
  useProfile: () => ({
    data: { id: "user-1", first_name: "Alex", last_name: "Doe", role: mockUseIsAdmin() ? "admin" : "user" },
  }),
  useProfilesMap: () => ({
    data: { "user-1": "Alex Doe", "user-2": "Sam Patel" },
  }),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/overtime"]}>
        <OvertimePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mixedTeamRows = [
  {
    id: "ot-1",
    ot_date: "2026-11-20",
    start_time: "17:00",
    end_time: "19:30",
    duration_minutes: 150,
    account_name: "-",
    doc_count: 0,
    notes: "My own overtime note",
    created_by: "user-1",
    created_at: "2026-11-20T20:00:00Z",
    updated_at: "2026-11-20T20:00:00Z",
  },
  {
    id: "ot-2",
    ot_date: "2026-11-19",
    start_time: "18:00",
    end_time: "20:00",
    duration_minutes: 120,
    account_name: "-",
    doc_count: 0,
    notes: "Teammate overtime note",
    created_by: "user-2",
    created_at: "2026-11-19T20:00:00Z",
    updated_at: "2026-11-19T20:00:00Z",
  },
];

describe("OvertimePage", () => {
  beforeEach(() => {
    mockUseIsAdmin.mockReturnValue(false);
  });

  it("handles non-array/null data from query cache without crashing", () => {
    mockUseOvertimeLogs.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });
    renderPage();
    expect(screen.getByText("My Overtime Overview")).toBeInTheDocument();
    expect(screen.getAllByText("No Overtime Entries Yet").length).toBeGreaterThan(0);
  });

  it("shows only the current user's OT for normal users without Added by or accounts", () => {
    mockUseIsAdmin.mockReturnValue(false);
    mockUseOvertimeLogs.mockReturnValue({
      data: mixedTeamRows,
      isLoading: false,
      isError: false,
      error: null,
    });
    renderPage();

    expect(screen.getByText("My Overtime Overview")).toBeInTheDocument();
    expect(screen.getAllByText("My own overtime note").length).toBeGreaterThan(0);
    expect(screen.queryByText("Teammate overtime note")).not.toBeInTheDocument();
    expect(screen.queryByText("Sam Patel")).not.toBeInTheDocument();
    expect(screen.queryByText("All Members")).not.toBeInTheDocument();
    expect(screen.queryByText("Added by")).not.toBeInTheDocument();
    expect(screen.queryByText("All Accounts")).not.toBeInTheDocument();
  });

  it("shows all team members' OT together for admins with Added by for every entry", () => {
    mockUseIsAdmin.mockReturnValue(true);
    mockUseOvertimeLogs.mockReturnValue({
      data: mixedTeamRows,
      isLoading: false,
      isError: false,
      error: null,
    });
    renderPage();

    expect(screen.getByText("Team Overtime Overview")).toBeInTheDocument();
    expect(screen.getAllByText("My own overtime note").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Teammate overtime note").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alex Doe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sam Patel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Added by").length).toBeGreaterThan(0);
    expect(screen.getByText("All Members")).toBeInTheDocument();
    expect(screen.getByText("All Team")).toBeInTheDocument();
    expect(screen.queryByText("All Accounts")).not.toBeInTheDocument();
  });
});
