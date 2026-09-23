import {
  createDataClient,
  formatWriteError,
  formatVisitWriteError,
  resolveProfilePhotoUrl,
  formatProfilePhotoSaveError,
  isLocalPhotoPreview,
  PROFILE_PHOTO_SAVE_ERROR,
  PROFILE_PHOTO_QUOTA_ERROR,
  PROFILE_PHOTO_STORAGE_UNAVAILABLE_ERROR,
} from "./userData";

function profileSnap(data) {
  return {
    exists: () => !!data,
    data: () => data,
  };
}

function treatmentsSnap(list) {
  return {
    empty: !list.length,
    docs: list.map((d) => ({ id: String(d.id), data: () => d })),
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

describe("formatVisitWriteError", () => {
  it("replaces a Firestore permission denial with plain language", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const err = {
      code: "permission-denied",
      message: "Missing or insufficient permissions.",
    };
    const message = formatVisitWriteError("Couldn't save this visit", err);
    expect(message).toBe(
      "Couldn't save this visit. This account isn't allowed to store visits yet."
    );
    expect(message).not.toMatch(/permission-denied/i);
    expect(message).not.toMatch(/insufficient permissions/i);
    expect(message).not.toMatch(/firebase/i);
    expect(spy).toHaveBeenCalledWith("[Become] Couldn't save this visit", err);
    spy.mockRestore();
  });

  it("uses the same plain language when an update is denied", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const message = formatVisitWriteError("Couldn't update this visit", {
      code: "firestore/permission-denied",
      message: "Missing or insufficient permissions.",
    });
    expect(message).toBe(
      "Couldn't update this visit. This account isn't allowed to store visits yet."
    );
    spy.mockRestore();
  });

  it("keeps other visit failures as the action plus the error detail", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(formatVisitWriteError("Couldn't save this visit", new Error("network down"))).toBe(
      "Couldn't save this visit: network down"
    );
    spy.mockRestore();
  });
});

describe("resolveProfilePhotoUrl", () => {
  const stored = "https://firebasestorage.googleapis.com/v0/b/become/o/profile";
  const google = "https://lh3.googleusercontent.com/a/achiraya";

  it("prefers a stored profile photo over the Google sign-in photo", () => {
    expect(resolveProfilePhotoUrl({ profilePhotoURL: stored, authPhotoURL: google })).toBe(stored);
  });

  it("uses the Google photo when the stored photo is missing", () => {
    expect(resolveProfilePhotoUrl({ profilePhotoURL: "", authPhotoURL: google })).toBe(google);
    expect(resolveProfilePhotoUrl({ profilePhotoURL: "   ", authPhotoURL: google })).toBe(google);
    expect(resolveProfilePhotoUrl({ profilePhotoURL: null, authPhotoURL: google })).toBe(google);
  });

  it("returns an empty string when neither photo is set so the initials placeholder shows", () => {
    expect(resolveProfilePhotoUrl({ profilePhotoURL: null, authPhotoURL: "" })).toBe("");
    expect(resolveProfilePhotoUrl({})).toBe("");
  });

  it("skips a local file preview so a failed upload cannot look saved", () => {
    expect(isLocalPhotoPreview("blob:http://localhost/selected")).toBe(true);
    expect(isLocalPhotoPreview("data:image/png;base64,aaaa")).toBe(true);
    expect(resolveProfilePhotoUrl({
      profilePhotoURL: "data:image/png;base64,aaaa",
      authPhotoURL: "",
    })).toBe("");
    expect(resolveProfilePhotoUrl({
      profilePhotoURL: "blob:http://localhost/selected",
      authPhotoURL: google,
    })).toBe(google);
  });

  it("skips a stored URL that failed to load and uses the Google photo", () => {
    expect(resolveProfilePhotoUrl({
      profilePhotoURL: stored,
      authPhotoURL: google,
      failedUrls: [stored],
    })).toBe(google);
  });

  it("returns empty when the stored URL failed and there is no Google photo", () => {
    expect(resolveProfilePhotoUrl({
      profilePhotoURL: stored,
      authPhotoURL: null,
      failedUrls: [stored],
    })).toBe("");
  });

  it("returns empty when the stored URL and the Google photo are the same broken URL", () => {
    expect(resolveProfilePhotoUrl({
      profilePhotoURL: stored,
      authPhotoURL: stored,
      failedUrls: [stored],
    })).toBe("");
  });

  it("returns empty after both the stored URL and the Google photo fail", () => {
    expect(resolveProfilePhotoUrl({
      profilePhotoURL: stored,
      authPhotoURL: google,
      failedUrls: [stored, google],
    })).toBe("");
  });
});

describe("formatProfilePhotoSaveError", () => {
  it("asks the user to try again for an ordinary failure and does not pretend it saved", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("network down");
    expect(formatProfilePhotoSaveError(err)).toBe(PROFILE_PHOTO_SAVE_ERROR);
    expect(PROFILE_PHOTO_SAVE_ERROR).not.toMatch(/spark/i);
    expect(spy).toHaveBeenCalledWith("[Become] Couldn't save your photo", err);
    spy.mockRestore();
  });

  it("maps storage/quota-exceeded to plain language and hides the Firebase message", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const err = {
      code: "storage/quota-exceeded",
      message: "Firebase Storage: Quota for bucket 'become-app-dde78.firebasestorage.app' exceeded (storage/quota-exceeded)",
    };
    const message = formatProfilePhotoSaveError(err);
    expect(message).toBe(PROFILE_PHOTO_QUOTA_ERROR);
    expect(message).toMatch(/free storage limit/i);
    expect(message).toMatch(/try again later/i);
    expect(message).toMatch(/free up some space/i);
    expect(message).not.toMatch(/Firebase Storage|quota-exceeded|firebasestorage/i);
    spy.mockRestore();
  });

  it("explains that a Spark storage rejection will not be fixed by uploading again", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const err = {
      code: "storage/unknown",
      message: "Firebase Storage: An unknown error occurred. (storage/unknown)",
      customData: {
        serverResponse: JSON.stringify({
          error: { code: 402, message: "The billing account for the owning project is disabled" },
        }),
      },
    };
    const message = formatProfilePhotoSaveError(err);
    expect(message).toBe(PROFILE_PHOTO_STORAGE_UNAVAILABLE_ERROR);
    expect(message).toMatch(/wasn't saved/i);
    expect(message).toMatch(/Spark/);
    expect(message).toMatch(/uploading again won't/i);
    spy.mockRestore();
  });

  it("treats storage/unauthorized as storage unavailable, not a silent success", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(formatProfilePhotoSaveError({
      code: "storage/unauthorized",
      message: "User does not have permission to access 'users/uid/profile'. (storage/unauthorized)",
    })).toBe(PROFILE_PHOTO_STORAGE_UNAVAILABLE_ERROR);
    spy.mockRestore();
  });

  it("keeps a Firestore permission error as a try-again, not a Spark storage message", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(formatProfilePhotoSaveError({
      code: "permission-denied",
      message: "Missing or insufficient permissions.",
    })).toBe(PROFILE_PHOTO_SAVE_ERROR);
    spy.mockRestore();
  });

  it("keeps a retryable storage network error as a try-again", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(formatProfilePhotoSaveError({
      code: "storage/retry-limit-exceeded",
      message: "Max retry time for operation exceeded. (storage/retry-limit-exceeded)",
    })).toBe(PROFILE_PHOTO_SAVE_ERROR);
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

  it("fills treatment id from the document id when data has no id", async () => {
    const getDoc = jest.fn().mockResolvedValue(profileSnap({ name: "A" }));
    const getDocs = jest.fn().mockResolvedValue({
      empty: false,
      docs: [{ id: "doc-9", data: () => ({ name: "Botox", sessions: [], totalSessions: 1 }) }],
    });
    const client = makeClient({ getDoc, getDocs });
    const result = await client.loadUserData("uid-1");
    expect(result.treatments[0].id).toBe("doc-9");
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

  it("loads visits from the user's visits collection", async () => {
    const getDocs = jest.fn().mockResolvedValue({
      empty: false,
      docs: [{ id: "v1", data: () => ({ status: "planned", packageId: "p1" }) }],
    });
    const client = makeClient({ getDocs });
    const visits = await client.loadVisits("uid-1");
    expect(getDocs).toHaveBeenCalledWith("users/uid-1/visits");
    expect(visits).toEqual([{ status: "planned", packageId: "p1", id: "v1" }]);
  });

  it("writes a visit without undefined fields", async () => {
    const setDoc = jest.fn().mockResolvedValue();
    const client = makeClient({ setDoc });
    await client.writeVisit("uid-1", { id: "v1", status: "planned", remindAt: undefined, notes: "Morning" });
    expect(setDoc).toHaveBeenCalledWith(
      "users/uid-1/visits/v1",
      { id: "v1", status: "planned", notes: "Morning" }
    );
  });
});
