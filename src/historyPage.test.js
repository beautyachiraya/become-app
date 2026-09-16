import { render, fireEvent } from "@testing-library/react";
import HistoryScreen, { SourceBadge } from "./historyPage";
import { buildHistoryTimeline } from "./packageLedger";

const NOW = new Date("2026-09-16T12:00:00");

const T = {
  history_tab: "History",
  history_empty: "No history yet. When you finish a session or a package, it shows up here.",
  history_empty_title: "No history yet.",
  filter_all: "All",
  filter_sessions: "Sessions",
  filter_packages: "Packages",
  session_used: "Session used",
  package_finished: "Package finished",
  buy_more: "Buy more",
  promo: "Promo",
  paid: "Paid",
  used_up: "Used up",
  expired: "Expired",
};

function t(key) {
  return T[key];
}

describe("HistoryScreen", () => {
  it("uses the History name and the required empty copy", () => {
    const { getByText, container } = render(<HistoryScreen rows={[]} t={t} />);
    expect(getByText("History")).toBeTruthy();
    expect(getByText(/No history yet\. When you finish a session or a package, it shows up here\./)).toBeTruthy();
    expect(container.textContent.toLowerCase()).not.toContain("past");
  });

  it("renders session used and package finished rows with source badges", () => {
    const rows = buildHistoryTimeline([
      {
        id: "used",
        name: "Botox",
        clinic: "Clinic A",
        totalSessions: 1,
        source: "promo",
        expiryDate: "2026-12-01",
        sessions: [{ id: 1, date: "2026-09-01", note: "Smooth" }],
      },
    ], [], NOW);
    const { getAllByText, getByText } = render(<HistoryScreen rows={rows} t={t} />);
    expect(getByText("Session used")).toBeTruthy();
    expect(getByText("Package finished")).toBeTruthy();
    expect(getAllByText("Botox · Clinic A").length).toBe(2);
    expect(getAllByText("Promo").length).toBeGreaterThan(0);
    expect(getByText("Buy more")).toBeTruthy();
  });

  it("filters to sessions only", () => {
    const rows = buildHistoryTimeline([
      {
        id: "used",
        name: "Facial",
        clinic: "Clinic A",
        totalSessions: 1,
        source: "paid",
        expiryDate: "2026-12-01",
        sessions: [{ id: 1, date: "2026-09-01" }],
      },
    ], [], NOW);
    const { getByText, queryByText } = render(<HistoryScreen rows={rows} t={t} />);
    fireEvent.click(getByText("Sessions"));
    expect(queryByText("Package finished")).toBeNull();
    expect(getByText("Session used")).toBeTruthy();
  });
});

describe("SourceBadge", () => {
  it("does not render when source is missing", () => {
    const { container } = render(<SourceBadge source={null} />);
    expect(container.textContent).toBe("");
  });
});
