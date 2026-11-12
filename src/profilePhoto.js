import { isLocalPhotoPreview, isProfilePhotoStorageBlocked } from "./userData";

export const PROFILE_PHOTO_MAX_EDGE = 384;
export const PROFILE_PHOTO_MAX_BYTES = 200 * 1024;

/** A saved photo is a remote URL or a data:image URL written to the profile. */
export function remotePhotoUrl(value) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (!url || isLocalPhotoPreview(url)) return "";
  const lower = url.toLowerCase();
  if (lower.startsWith("data:image/")) return url;
  if (lower.startsWith("data:")) return "";
  return url;
}

/** First letter of the profile name, or of the email when the name is empty. */
export function profileInitial(name, email) {
  const source = [name, email]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find(Boolean) || "";
  return source ? source[0].toUpperCase() : "";
}

function defaultCreateCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function loadImageFile(file) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => createImageBitmap(file));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that photo."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Couldn't compress that photo."));
      }, type, quality);
      return;
    }
    try {
      const dataUrl = canvas.toDataURL(type, quality);
      const comma = dataUrl.indexOf(",");
      const raw = comma >= 0 ? dataUrl.slice(comma + 1) : "";
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      resolve(new Blob([bytes], { type }));
    } catch (err) {
      reject(new Error("Couldn't compress that photo."));
    }
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Couldn't read that photo."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Center-crop to a square JPEG small enough to store in a Firestore profile
 * document (well under the 1 MiB limit) if Storage is full.
 */
export async function compressProfilePhoto(file, options = {}) {
  if (!file) throw new Error("Couldn't read that photo.");
  const maxEdge = options.maxEdge || PROFILE_PHOTO_MAX_EDGE;
  const maxBytes = options.maxBytes || PROFILE_PHOTO_MAX_BYTES;
  const image = options.image || await loadImageFile(file);
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  if (!width || !height) throw new Error("Couldn't read that photo.");
  const side = Math.min(width, height);
  const sx = Math.floor((width - side) / 2);
  const sy = Math.floor((height - side) / 2);
  const edge = Math.min(maxEdge, side);
  const createCanvas = options.createCanvas || defaultCreateCanvas;
  const canvas = createCanvas(edge, edge);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't compress that photo.");
  ctx.drawImage(image, sx, sy, side, side, 0, 0, edge, edge);
  if (typeof image.close === "function") {
    try { image.close(); } catch (err) { /* createImageBitmap only */ }
  }
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);
  while (blob.size > maxBytes && quality > 0.45) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  if (blob.size > maxBytes) throw new Error("That photo is too large to save.");
  const dataUrl = await blobToDataUrl(blob);
  if (!dataUrl || !dataUrl.toLowerCase().startsWith("data:image/")) {
    throw new Error("Couldn't compress that photo.");
  }
  return { blob, dataUrl, type: "image/jpeg" };
}

/**
 * Upload a profile photo and return the URL the avatar should show afterwards.
 * Tries Storage first. If the bucket is over quota, saves a compressed
 * data:image URL on the Firestore profile instead so Change photo works on Spark.
 * The new URL is returned only after the profile write succeeds.
 * Any failure drops the local preview and restores the previous saved photo.
 */
export async function changeProfilePhoto({
  file,
  user,
  previousPhotoURL,
  storageRef,
  upload,
  downloadURL,
  writeProfile,
  compress,
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
  let compact;
  try {
    compact = await (compress || compressProfilePhoto)(file);
  } catch (error) {
    return { photoURL: previous, pendingPreview: "", error, cancelled: false };
  }
  const fallbackUrl = remotePhotoUrl(compact && compact.dataUrl);
  const uploadFile = (compact && compact.blob) || file;

  try {
    const storedRef = storageRef(user.uid);
    await upload(storedRef, uploadFile);
    const url = remotePhotoUrl(await downloadURL(storedRef));
    if (!url) throw new Error("No download link came back.");
    await writeProfile(user.uid, { photoURL: url }, { merge: true });
    return { photoURL: url, pendingPreview: "", error: null, cancelled: false };
  } catch (error) {
    if (!isProfilePhotoStorageBlocked(error) || !fallbackUrl) {
      return { photoURL: previous, pendingPreview: "", error, cancelled: false };
    }
    try {
      await writeProfile(user.uid, { photoURL: fallbackUrl }, { merge: true });
      return { photoURL: fallbackUrl, pendingPreview: "", error: null, cancelled: false, storedInProfile: true };
    } catch (writeError) {
      return { photoURL: previous, pendingPreview: "", error: writeError, cancelled: false };
    }
  }
}
