import { renderToStaticMarkup } from "react-dom/server";
import { JournalHomeCard, JournalDetailStats, JournalVisitList } from "./journalUi";

describe("journal home card", () => {
  function card(extra = {}) {
    return renderToStaticMarkup(
      <JournalHomeCard
        name="Botox"
        clinic="Glow Clinic"
        icon="◈"
        palette={{ bg: "#FDF4EE", accent: "#D49068" }}
        chip="Journal"
        lastVisitLabel="Last visit"
        lastVisitText="No visits yet"
        subline="Tap to log a visit"
        {...extra}
      />
    );
  }

  it("shows a Journal chip, last visit, and a prompt to log — never a remaining count", () => {
    const html = card();
    expect(html).toContain("Botox");
    expect(html).toContain("Glow Clinic");
    expect(html).toContain("Journal");
    expect(html).toContain("Last visit");
    expect(html).toContain("No visits yet");
    expect(html).toContain("Tap to log a visit");
    expect(html).toContain('data-track-mode="journal"');
    expect(html.toLowerCase()).not.toMatch(/>\s*left\s*</);
    expect(html.toLowerCase()).not.toContain("buy more");
    expect(html.toLowerCase()).not.toContain("expiry");
  });

  it("shows the last visit date and the usual interval when one is set", () => {
    const html = card({
      lastVisitText: "12 Sep",
      usually: "Usually monthly",
    });
    expect(html).toContain("12 Sep");
    expect(html).toContain("Usually monthly");
    expect(html).not.toContain("No visits yet");
  });
});

describe("journal detail", () => {
  it("shows visits, last visit, and next suggested, with a log visit action and no buy more", () => {
    const stats = renderToStaticMarkup(
      <JournalDetailStats
        visitCount={2}
        lastVisitText="16 Sep 2026"
        nextSuggestedText="16 Oct"
        labels={{ visits: "Visits logged", lastVisit: "Last visit", next: "Next suggested" }}
        accent="#D49068"
      />
    );
    const visits = renderToStaticMarkup(
      <JournalVisitList
        visits={[{ id: 1, dateText: "16 Sep 2026", note: "Forehead" }]}
        emptyLabel="No visits yet"
        usually="Usually monthly"
        nextSuggestedText="16 Oct 2026"
        nextLabel="Next suggested"
        logLabel="Log visit"
        onLog={() => {}}
        onOpenVisit={() => {}}
      />
    );
    const html = stats + visits;
    expect(html).toContain("Visits logged");
    expect(html).toContain(">2<");
    expect(html).toContain("Last visit");
    expect(html).toContain("Next suggested");
    expect(html).toContain("Log visit");
    expect(html).toContain("Usually monthly");
    expect(html.toLowerCase()).not.toContain("buy more");
    expect(html.toLowerCase()).not.toContain(">left<");
  });
});
