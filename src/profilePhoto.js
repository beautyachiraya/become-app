import { isLocalPhotoPreview } from "./userData";

/** A saved photo is a remote URL. Local previews are never treated as saved. */
export function remotePhotoUrl(value) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (!url || isLocalPhotoPreview(url)) return "";
  return url;
}

/** First letter of the profile name, or of the email when the name is empty. */
export function profileInitial(name, email) {
  const source = [name, email]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find(Boolean) || "";
  return source ? source[0].toUpperCase() : "";
}

/**
 * Upload a profile photo and return the URL the avatar should show afterwards.
 * The new remote URL is returned only after Storage and the profile write both succeed.
 * Any failure, including quota, drops the local preview and restores the previous remote URL.
 */
export async function changeProfilePhoto({
  file,
  user,
  previousPhotoURL,
  storageRef,
  upload,
  downloadURL,
  writeProfile,
} = {}) {
  const previous = remotePhotoUrl(previousPhotoURL);
  if (!file) {
    return { photoURL: previous, pendingPreview: "", error: null, cancelled: true };
  }
  if (!user || !user.uid) {
    return {
      photoURL: previous,
      pendingPreview: "",
      error: new Error("Please sign in and try again."),
      cancelled: false,
    };
  }
  try {
    const storedRef = storageRef(user.uid);
    await upload(storedRef, file);
    const url = remotePhotoUrl(await downloadURL(storedRef));
    if (!url) throw new Error("No download link came back.");
    await writeProfile(user.uid, { photoURL: url }, { merge: true });
    return { photoURL: url, pendingPreview: "", error: null, cancelled: false };
  } catch (error) {
    return { photoURL: previous, pendingPreview: "", error, cancelled: false };
  }
}
