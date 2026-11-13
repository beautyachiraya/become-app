import { renderToStaticMarkup } from "react-dom/server";
import { JournalHomeCard, JournalDetailStats, JournalVisitList } from "./journalUi";

describe("journal home card", () => {
  function card(extra = {}) {
    return renderToStaticMarkup(
      <JournalHomeCard
        name="Botox"
        clinic="Glow Clinic"
        icon="◈"
        palette={{ bg: "#FDF4EE", accent: "#D49068", text: "#A05830" }}
        chip="Per visit"
        lastVisitLabel="Last visit"
        lastVisitText="No visits yet"
        subline="Tap to log a visit"
        {...extra}
      />
    );
  }

  it("shows a Per visit chip, last visit, and a prompt to log — never a remaining count", () => {
    const html = card();
    expect(html).toContain("Botox");
    expect(html).toContain("Glow Clinic");
    expect(html).toContain("Per visit");
    expect(html).not.toMatch(/\bJournal\b/);
    expect(html).not.toMatch(/\bDiary\b/);
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
    const numeral = html.match(/data-numeral="lining"[^>]*>/);
    expect(numeral).not.toBeNull();
    expect(numeral[0]).toContain("DM Sans");
    expect(numeral[0]).toContain("lining-nums");
    expect(numeral[0]).toContain("#A05830");
    expect(numeral[0]).not.toContain("Cormorant");
    expect(numeral[0]).not.toContain("#D49068");
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
        ink="#504098"
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
    expect(html).toContain('data-numeral="lining"');
    expect(html).toContain("DM Sans");
    expect(html).toContain("lining-nums");
    expect(html).toContain("#504098");
    expect(html).not.toContain("Cormorant");
    expect(html).not.toContain("#8870C8");
    expect(html).toContain("Last visit");
    expect(html).toContain("Next suggested");
    expect(html).toContain("Log visit");
    expect(html).toContain("Usually monthly");
    expect(html.toLowerCase()).not.toContain("buy more");
    expect(html.toLowerCase()).not.toContain(">left<");
  });
});
