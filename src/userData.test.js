import { createDataClient, formatWriteError } from "./userData";

function profileSnap(data) {
  return {
    exists: () => !!data,
    data: () => data,
  };
}

function treatmentsSnap(list) {
  return {
    empty: !list.length,
    docs: list.map((d) => ({ data: () => d })),
  };
}

function makeClient(overrides) {
  return createDataClient({
    db: {},
    doc: (_db, ...path) => path.join("/"),
    collection: (_db, ...path) => path.join("/"),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    setDoc: jest.fn(),
    deleteDoc: jest.fn(),
    ...overrides,
  });
}

describe("formatWriteError", () => {
  it("logs the error and returns a user-facing message", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("permission-denied");
    expect(formatWriteError("Couldn't save this session", err)).toBe(
      "Couldn't save this session: permission-denied"
    );
    expect(spy).toHaveBeenCalledWith("[Become] Couldn't save this session", err);
    spy.mockRestore();
  });

  it("falls back when the error has no message", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(formatWriteError("Couldn't save your profile", {})).toBe(
      "Couldn't save your profile: Please try again."
    );
    spy.mockRestore();
  });
});

describe("loadUserData", () => {
  it("fetches profile once when called twice for the same uid", async () => {
    const getDoc = jest.fn().mockResolvedValue(profileSnap({ name: "Sophia", photoURL: "x" }));
    const getDocs = jest.fn().mockResolvedValue(treatmentsSnap([{ id: 1, name: "Botox", sessions: [] }]));
    const client = makeClient({ getDoc, getDocs });

    const first = client.loadUserData("uid-1");
    const second = client.loadUserData("uid-1");
    expect(second).toBe(first);

    const result = await first;
    expect(await second).toEqual(result);
    expect(getDoc).toHaveBeenCalledTimes(1);
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(result.profile.name).toBe("Sophia");
    expect(result.treatments).toHaveLength(1);
  });

  it("retries after a failed load instead of caching the failure", async () => {
    const getDoc = jest.fn()
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValue(profileSnap({ name: "Retry" }));
    const getDocs = jest.fn().mockResolvedValue(treatmentsSnap([]));
    const client = makeClient({ getDoc, getDocs });

    await expect(client.loadUserData("uid-1")).rejects.toThrow("unavailable");
    const result = await client.loadUserData("uid-1");
    expect(result.profile.name).toBe("Retry");
    expect(getDoc).toHaveBeenCalledTimes(2);
  });

  it("fetches again after resetCache (new sign-in lifecycle)", async () => {
    const getDoc = jest.fn().mockResolvedValue(profileSnap({ name: "A" }));
    const getDocs = jest.fn().mockResolvedValue(treatmentsSnap([]));
    const client = makeClient({ getDoc, getDocs });

    await client.loadUserData("uid-1");
    client.resetCache();
    await client.loadUserData("uid-1");
    expect(getDoc).toHaveBeenCalledTimes(2);
  });
});

describe("write helpers", () => {
  it("propagates setDoc failures so callers can show an error", async () => {
    const setDoc = jest.fn().mockRejectedValue(new Error("permission-denied"));
    const client = makeClient({ setDoc });
    await expect(client.writeTreatment("uid-1", { id: 9, name: "Laser" }))
      .rejects.toThrow("permission-denied");
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it("writes profile with merge so photoURL is not wiped", async () => {
    const setDoc = jest.fn().mockResolvedValue();
    const client = makeClient({ setDoc });
    await client.writeProfile("uid-1", { name: "S", email: "a@b.c", phone: "" });
    expect(setDoc).toHaveBeenCalledWith(
      "users/uid-1/profile/info",
      { name: "S", email: "a@b.c", phone: "" },
      { merge: true }
    );
  });

  it("propagates deleteDoc failures", async () => {
    const deleteDoc = jest.fn().mockRejectedValue(new Error("not-found"));
    const client = makeClient({ deleteDoc });
    await expect(client.deleteTreatment("uid-1", 3)).rejects.toThrow("not-found");
  });
});
