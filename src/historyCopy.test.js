const fs = require("fs");
const path = require("path");
import { HISTORY_EMPTY_COPY } from "./historyEvents";

describe("History naming in the app", () => {
  const src = fs.readFileSync(path.join(__dirname, "become.jsx"), "utf8");

  it("uses History as the tab/page name and never Past", () => {
    expect(src).toContain('history_tab: "History"');
    expect(src).toContain("{t(\"history_title\")}");
    expect(src).toContain('appTab==="history"');
    expect(src).not.toMatch(/>Past</);
    expect(src).not.toContain("past_tab");
    expect(src).not.toContain("Past packages");
  });

  it("keeps the empty-state copy and event-type labels", () => {
    expect(src).toContain("HISTORY_EMPTY_COPY");
    expect(HISTORY_EMPTY_COPY).toBe(
      "No history yet. When you finish a session or a package, it shows up here."
    );
    expect(src).toContain('event_session: "Session used"');
    expect(src).toContain('event_package: "Package finished"');
    expect(src).toContain('empty_first_package: "Add your first package"');
  });
});
