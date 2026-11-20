import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OvertimePage from "@/pages/Overtime";
import type { OvertimeLog, OvertimeLogInput } from "@/hooks/useOvertimeLogs";

const mockUseOvertimeLogs = vi.fn();
const mockUseIsAdmin = vi.fn();
const mockUpsertMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock("@/hooks/useOvertimeLogs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useOvertimeLogs")>();
  return {
    ...actual,
    useOvertimeLogs: () => mockUseOvertimeLogs(),
    useUpsertOvertimeLog: () => ({ mutate: mockUpsertMutate, isPending: false }),
    useDeleteOvertimeLog: () => ({ mutate: mockDeleteMutate, isPending: false }),
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

const baseRows: OvertimeLog[] = [
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
    vi.clearAllMocks();
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

  it("renders error empty state when query fails", () => {
    mockUseOvertimeLogs.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error("Table overtime_logs not found"),
    });
    renderPage();
    expect(screen.getAllByText("Unable to Load Overtime Logs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Table overtime_logs not found").length).toBeGreaterThan(0);
  });

  it("shows only the current user's OT for normal users without Added by or accounts", () => {
    mockUseIsAdmin.mockReturnValue(false);
    mockUseOvertimeLogs.mockReturnValue({
      data: baseRows,
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
      data: baseRows,
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

  it("adds a new OT row via the Add OT dialog and displays it in the table", async () => {
    let rowsState: OvertimeLog[] = [...baseRows];
    mockUseOvertimeLogs.mockImplementation(() => ({
      data: rowsState,
      isLoading: false,
      isError: false,
      error: null,
    }));

    mockUpsertMutate.mockImplementation(
      (
        vars: { id?: string; input: OvertimeLogInput },
        options?: { onSuccess?: () => void },
      ) => {
        rowsState = [
          {
            id: "ot-new",
            ...vars.input,
            notes: vars.input.notes ?? null,
            account_name: "-",
            doc_count: 0,
            created_by: "user-1",
            created_at: "2026-11-21T01:50:00Z",
            updated_at: "2026-11-21T01:50:00Z",
          },
          ...rowsState,
        ];
        options?.onSuccess?.();
      },
    );

    const { rerender } = renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Add OT/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Log Overtime (OT)")).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Start Time"), {
      target: { value: "18:00" },
    });
    fireEvent.change(within(dialog).getByLabelText("End Time"), {
      target: { value: "21:30" },
    });
    expect(within(dialog).getAllByText("3h 30m").length).toBeGreaterThan(0);

    fireEvent.change(within(dialog).getByLabelText(/Notes/i), {
      target: { value: "Handled late escalations" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add OT Entry" }));

    expect(mockUpsertMutate).toHaveBeenCalledTimes(1);
    expect(mockUpsertMutate.mock.calls[0][0]).toEqual({
      id: undefined,
      input: expect.objectContaining({
        start_time: "18:00",
        end_time: "21:30",
        duration_minutes: 210,
        notes: "Handled late escalations",
      }),
    });

    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/overtime"]}>
          <OvertimePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText("Handled late escalations").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3h 30m").length).toBeGreaterThan(0);
  });

  it("supports quick duration presets, overnight windows, and blocks invalid zero-duration ranges", async () => {
    mockUseOvertimeLogs.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Add OT/i }));
    const dialog = await screen.findByRole("dialog");

    // Quick preset +3h from default 17:00 -> 20:00
    fireEvent.click(within(dialog).getByRole("button", { name: "+3h" }));
    expect(within(dialog).getByLabelText("End Time")).toHaveValue("20:00");
    expect(within(dialog).getAllByText("3h").length).toBeGreaterThan(0);

    // Overnight window: 22:30 -> 01:00
    fireEvent.change(within(dialog).getByLabelText("Start Time"), {
      target: { value: "22:30" },
    });
    fireEvent.change(within(dialog).getByLabelText("End Time"), {
      target: { value: "01:00" },
    });
    expect(within(dialog).getByText("Overnight (+1d)")).toBeInTheDocument();
    expect(within(dialog).getAllByText("2h 30m").length).toBeGreaterThan(0);

    // Same start & end disables submission
    fireEvent.change(within(dialog).getByLabelText("End Time"), {
      target: { value: "22:30" },
    });
    expect(within(dialog).getByText("Invalid range")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add OT Entry" })).toBeDisabled();
  });

  it("edits an existing OT table row through the row action menu", async () => {
    let rowsState: OvertimeLog[] = [baseRows[0]];
    mockUseOvertimeLogs.mockImplementation(() => ({
      data: rowsState,
      isLoading: false,
      isError: false,
      error: null,
    }));

    mockUpsertMutate.mockImplementation(
      (
        vars: { id?: string; input: OvertimeLogInput },
        options?: { onSuccess?: () => void },
      ) => {
        rowsState = rowsState.map((r) =>
          r.id === vars.id ? { ...r, ...vars.input, notes: vars.input.notes ?? null } : r,
        );
        options?.onSuccess?.();
      },
    );

    const { rerender } = renderPage();

    const optionTriggers = screen.getAllByLabelText("Entry options");
    fireEvent.keyDown(optionTriggers[0], { key: "Enter" });

    const editBtn = await screen.findByRole("button", { name: /Edit/i });
    fireEvent.click(editBtn);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Edit Overtime Entry")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Notes/i)).toHaveValue("My own overtime note");

    fireEvent.change(within(dialog).getByLabelText(/Notes/i), {
      target: { value: "Updated OT reason" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    expect(mockUpsertMutate).toHaveBeenCalledWith(
      {
        id: "ot-1",
        input: expect.objectContaining({
          ot_date: "2026-11-20",
          start_time: "17:00",
          end_time: "19:30",
          duration_minutes: 150,
          notes: "Updated OT reason",
        }),
      },
      expect.any(Object),
    );

    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/overtime"]}>
          <OvertimePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText("Updated OT reason").length).toBeGreaterThan(0);
  });

  it("cancels deleting an OT table row when Cancel is clicked", async () => {
    mockUseOvertimeLogs.mockReturnValue({
      data: [baseRows[0]],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    fireEvent.keyDown(screen.getAllByLabelText("Entry options")[0], { key: "Enter" });
    fireEvent.click(await screen.findByRole("button", { name: /Delete/i }));
    const alert = await screen.findByRole("alertdialog");
    expect(within(alert).getByText("Delete overtime entry?")).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(mockDeleteMutate).not.toHaveBeenCalled();
    expect(screen.getAllByText("My own overtime note").length).toBeGreaterThan(0);
  });

  it("deletes an OT table row when Delete Entry is confirmed", async () => {
    let rowsState: OvertimeLog[] = [baseRows[0]];
    mockUseOvertimeLogs.mockImplementation(() => ({
      data: rowsState,
      isLoading: false,
      isError: false,
      error: null,
    }));

    mockDeleteMutate.mockImplementation((id: string) => {
      rowsState = rowsState.filter((r) => r.id !== id);
    });

    const { rerender } = renderPage();

    fireEvent.keyDown(screen.getAllByLabelText("Entry options")[0], { key: "Enter" });
    fireEvent.click(await screen.findByRole("button", { name: /Delete/i }));
    const alert = await screen.findByRole("alertdialog");
    fireEvent.click(within(alert).getByRole("button", { name: "Delete Entry" }));

    expect(mockDeleteMutate).toHaveBeenCalledWith("ot-1");

    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/overtime"]}>
          <OvertimePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByText("My own overtime note")).not.toBeInTheDocument();
    expect(screen.getAllByText("No Overtime Entries Yet").length).toBeGreaterThan(0);
  });

  it("copies an OT table row without Added By", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    mockUseIsAdmin.mockReturnValue(true);
    mockUseOvertimeLogs.mockReturnValue({
      data: [baseRows[0]],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    fireEvent.click(screen.getAllByTitle("Copy OT details")[0]);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain("Overtime Window\t5:00 PM – 7:30 PM");
    expect(copiedText).toContain("Duration\t2h 30m");
    expect(copiedText).toContain("Notes\tMy own overtime note");
    expect(copiedText).not.toContain("Added By");
  });

  it("sorts OT table rows by duration ascending and descending", () => {
    mockUseIsAdmin.mockReturnValue(true);
    mockUseOvertimeLogs.mockReturnValue({
      data: baseRows, // ot-1 = 150m, ot-2 = 120m
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    const durationHeader = screen.getByRole("button", { name: /Duration/i });
    fireEvent.click(durationHeader); // asc: 120m (ot-2) first, 150m (ot-1) second

    const table = screen.getByRole("table");
    const rowsAsc = within(table).getAllByRole("row").slice(1);
    expect(within(rowsAsc[0]).getByText("Teammate overtime note")).toBeInTheDocument();
    expect(within(rowsAsc[1]).getByText("My own overtime note")).toBeInTheDocument();

    fireEvent.click(durationHeader); // desc: 150m (ot-1) first, 120m (ot-2) second
    const rowsDesc = within(table).getAllByRole("row").slice(1);
    expect(within(rowsDesc[0]).getByText("My own overtime note")).toBeInTheDocument();
    expect(within(rowsDesc[1]).getByText("Teammate overtime note")).toBeInTheDocument();
  });

  it("filters OT table rows by search and admin scope tabs", async () => {
    mockUseIsAdmin.mockReturnValue(true);
    mockUseOvertimeLogs.mockReturnValue({
      data: baseRows,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    // Filter using Mine tab
    fireEvent.click(screen.getByRole("tab", { name: /Mine/i }));
    expect(screen.getAllByText("My own overtime note").length).toBeGreaterThan(0);
    expect(screen.queryByText("Teammate overtime note")).not.toBeInTheDocument();

    // Switch back to All Team
    fireEvent.click(screen.getByRole("tab", { name: /All Team/i }));
    expect(screen.getAllByText("Teammate overtime note").length).toBeGreaterThan(0);

    // Search by teammate name (debounced 200ms)
    const searchInput = screen.getByPlaceholderText("Search member, date, time, or notes…");
    fireEvent.change(searchInput, { target: { value: "Sam Patel" } });

    await waitFor(() => {
      expect(screen.queryByText("My own overtime note")).not.toBeInTheDocument();
      expect(screen.getAllByText("Teammate overtime note").length).toBeGreaterThan(0);
    });

    // Clear all restores both rows
    fireEvent.click(screen.getByRole("button", { name: /Clear all/i }));
    await waitFor(() => {
      expect(screen.getAllByText("My own overtime note").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Teammate overtime note").length).toBeGreaterThan(0);
    });
  });

  it("does not display Page Total footer in the OT table", () => {
    mockUseOvertimeLogs.mockReturnValue({
      data: [baseRows[0]],
      isLoading: false,
      isError: false,
      error: null,
    });
    renderPage();
    expect(screen.queryByText("Page Total")).not.toBeInTheDocument();
  });
});
