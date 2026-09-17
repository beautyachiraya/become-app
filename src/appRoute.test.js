import { tabFromPath, pathFromTab, resolveAuthEntry, navTargetForControl } from "./appRoute";

describe("tabFromPath", () => {
  it("maps /history to the History tab", () => {
    expect(tabFromPath("/history")).toBe("history");
    expect(tabFromPath("/history/")).toBe("history");
    expect(tabFromPath("/history?ref=nav")).toBe("history");
  });

  it("maps home and unknown paths to Home", () => {
    expect(tabFromPath("/")).toBe("home");
    expect(tabFromPath("/home")).toBe("home");
    expect(tabFromPath("/nope")).toBe("home");
  });
});

describe("pathFromTab", () => {
  it("round-trips History to /history", () => {
    expect(pathFromTab("history")).toBe("/history");
    expect(tabFromPath(pathFromTab("history"))).toBe("history");
  });
});

describe("resolveAuthEntry", () => {
  it("does not force login for /history when a signed-in session is present", () => {
    const dest = resolveAuthEntry({
      authReady: true,
      user: { uid: "user-1" },
      pathname: "/history",
      authScreen: "login",
    });
    expect(dest).toEqual({ screen: "app", appTab: "history" });
    expect(dest.screen).not.toBe("login");
  });

  it("waits on boot so a restoring session does not flash sign-in", () => {
    expect(resolveAuthEntry({
      authReady: false,
      user: null,
      pathname: "/history",
      authScreen: "login",
    })).toEqual({ screen: "boot", appTab: "history" });
  });

  it("still shows sign-in on /history when there is no session", () => {
    expect(resolveAuthEntry({
      authReady: true,
      user: null,
      pathname: "/history",
      authScreen: "login",
    })).toEqual({ screen: "login", appTab: "history" });
  });
});

describe("navTargetForControl", () => {
  it("sends the History tab to History, not New Treatment", () => {
    expect(navTargetForControl("history")).toEqual({
      appTab: "history",
      showAdd: false,
      path: "/history",
    });
  });

  it("keeps the center plus on New Treatment only", () => {
    expect(navTargetForControl("add")).toEqual({
      appTab: null,
      showAdd: true,
      path: null,
    });
  });
});
