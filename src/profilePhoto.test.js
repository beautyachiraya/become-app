import { formatProfilePhotoSaveError, PROFILE_PHOTO_QUOTA_ERROR, resolveProfilePhotoUrl } from "./userData";
import { changeProfilePhoto, profileInitial, remotePhotoUrl } from "./profilePhoto";

const previous = "https://firebasestorage.googleapis.com/v0/b/become/o/old";
const remote = "https://firebasestorage.googleapis.com/v0/b/become/o/new";
const quotaError = Object.assign(
  new Error("Firebase Storage: Quota for bucket 'become-app-dde78.firebasestorage.app' exceeded (storage/quota-exceeded)"),
  { code: "storage/quota-exceeded" }
);

const compact = {
  blob: new Blob(["jpeg"], { type: "image/jpeg" }),
  dataUrl: "data:image/jpeg;base64,c21hbGw=",
  type: "image/jpeg",
};

function photoChange(overrides) {
  return changeProfilePhoto({
    file: new File(["pic"], "me.png", { type: "image/png" }),
    user: { uid: "user-1" },
    previousPhotoURL: previous,
    storageRef: (uid) => `users/${uid}/profile`,
    upload: jest.fn().mockResolvedValue(),
    downloadURL: jest.fn().mockResolvedValue(remote),
    writeProfile: jest.fn().mockResolvedValue(),
    compress: jest.fn().mockResolvedValue(compact),
    ...overrides,
  });
}

describe("changeProfilePhoto", () => {
  it("saves a compressed photo on the profile when Storage is over quota", async () => {
    const upload = jest.fn().mockRejectedValue(quotaError);
    const writeProfile = jest.fn().mockResolvedValue();
    const result = await photoChange({
      previousPhotoURL: previous,
      upload,
      downloadURL: jest.fn().mockResolvedValue("blob:http://localhost/selected"),
      writeProfile,
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(writeProfile).toHaveBeenCalledWith("user-1", { photoURL: compact.dataUrl }, { merge: true });
    expect(result.photoURL).toBe(compact.dataUrl);
    expect(result.pendingPreview).toBe("");
    expect(result.error).toBeNull();
    expect(result.storedInProfile).toBe(true);
    expect(resolveProfilePhotoUrl({
      profilePhotoURL: result.photoURL,
      authPhotoURL: "",
    })).toBe(compact.dataUrl);
  });

  it("restores the previous avatar and drops the local preview when a non-quota upload fails", async () => {
    const networkError = new Error("network down");
    const upload = jest.fn().mockRejectedValue(networkError);
    const writeProfile = jest.fn();
    const result = await photoChange({
      previousPhotoURL: previous,
      upload,
      downloadURL: jest.fn().mockResolvedValue("blob:http://localhost/selected"),
      writeProfile,
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(writeProfile).not.toHaveBeenCalled();
    expect(result.photoURL).toBe(previous);
    expect(result.pendingPreview).toBe("");
    expect(result.photoURL).not.toMatch(/^(blob:|data:)/);
    expect(result.error).toBe(networkError);

    const stillShowing = resolveProfilePhotoUrl({
      profilePhotoURL: result.pendingPreview || "blob:http://localhost/selected",
      authPhotoURL: "",
    });
    expect(stillShowing).toBe("");
    const restored = resolveProfilePhotoUrl({
      profilePhotoURL: result.photoURL,
      authPhotoURL: "",
    });
    expect(restored).toBe(previous);
  });

  it("keeps a previously saved profile photo and drops the preview when a later save fails", async () => {
    const saved = "data:image/jpeg;base64,old-saved";
    const result = await photoChange({
      previousPhotoURL: saved,
      upload: jest.fn().mockRejectedValue(new Error("network down")),
    });
    expect(result.photoURL).toBe(saved);
    expect(result.pendingPreview).toBe("");
    expect(resolveProfilePhotoUrl({
      profilePhotoURL: result.pendingPreview || "blob:http://localhost/selected",
      authPhotoURL: "",
    })).toBe("");
    expect(resolveProfilePhotoUrl({
      profilePhotoURL: result.photoURL,
      authPhotoURL: "",
    })).toBe(saved);
  });

  it("does not keep a fake preview when the quota fallback write fails", async () => {
    const writeError = new Error("permission-denied");
    const result = await photoChange({
      upload: jest.fn().mockRejectedValue(quotaError),
      writeProfile: jest.fn().mockRejectedValue(writeError),
    });
    expect(result.photoURL).toBe(previous);
    expect(result.pendingPreview).toBe("");
    expect(result.error).toBe(writeError);
    expect(resolveProfilePhotoUrl({
      profilePhotoURL: result.pendingPreview,
      authPhotoURL: "",
    })).toBe("");
  });

  it("keeps the previous photo when the profile write fails after Storage returns a link", async () => {
    const writeProfile = jest.fn().mockRejectedValue(new Error("permission-denied"));
    const result = await photoChange({ writeProfile });
    expect(writeProfile).toHaveBeenCalledWith("user-1", { photoURL: remote }, { merge: true });
    expect(result.photoURL).toBe(previous);
    expect(result.pendingPreview).toBe("");
    expect(result.error.message).toBe("permission-denied");
  });

  it("commits the remote URL only after Storage and the profile write both succeed", async () => {
    const writeProfile = jest.fn().mockResolvedValue();
    const result = await photoChange({ writeProfile });
    expect(result).toEqual({
      photoURL: remote,
      pendingPreview: "",
      error: null,
      cancelled: false,
    });
    expect(remotePhotoUrl(result.photoURL)).toBe(remote);
  });

  it("cancel leaves the previous photo and does not upload", async () => {
    const upload = jest.fn();
    const result = await photoChange({ file: null, upload });
    expect(upload).not.toHaveBeenCalled();
    expect(result.cancelled).toBe(true);
    expect(result.photoURL).toBe(previous);
    expect(result.pendingPreview).toBe("");
  });

  it("does not surface a quota error when the compressed photo is saved on the profile", async () => {
    const result = await photoChange({
      upload: jest.fn().mockRejectedValue(quotaError),
    });
    expect(result.error).toBeNull();
    expect(result.photoURL).toBe(compact.dataUrl);
  });

  it("uses the quota message instead of the raw Firebase string when fallback cannot be used", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const message = formatProfilePhotoSaveError(quotaError);
    expect(message).toBe(PROFILE_PHOTO_QUOTA_ERROR);
    expect(message).not.toContain("become-app-dde78");
    expect(message).not.toContain("storage/quota-exceeded");
    spy.mockRestore();
  });
});

describe("profileInitial", () => {
  it("uses the name, then the email, for an account with no Google photo", () => {
    expect(profileInitial("Achiraya", "Achirayawattanakit@gmail.com")).toBe("A");
    expect(profileInitial("", "Achirayawattanakit@gmail.com")).toBe("A");
    expect(profileInitial("  ", "")).toBe("");
  });
});
