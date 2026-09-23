import { useLayoutEffect, useRef, useState } from "react";
import { resolveProfilePhotoUrl } from "./userData";

function rememberFailed(failed, url) {
  if (!url || failed.includes(url)) return failed;
  return [...failed, url];
}

/**
 * Profile photo: stored URL, then the sign-in photo, then initials.
 * A broken image moves to the next option. A local file preview is never shown.
 */
export default function ProfileAvatarImage({ profilePhotoURL, authPhotoURL, initial, initialStyle }) {
  const [failedUrls, setFailedUrls] = useState([]);
  const [loadedSrc, setLoadedSrc] = useState("");
  const imgRef = useRef(null);
  const storedKey = typeof profilePhotoURL === "string" ? profilePhotoURL : "";
  const [seenStored, setSeenStored] = useState(storedKey);
  if (seenStored !== storedKey) {
    setSeenStored(storedKey);
    setFailedUrls([]);
    setLoadedSrc("");
  }
  const src = resolveProfilePhotoUrl({
    profilePhotoURL,
    authPhotoURL,
    failedUrls: seenStored === storedKey ? failedUrls : [],
  });

  function markFailed(url) {
    setFailedUrls((prev) => rememberFailed(prev, url));
  }

  // A cached broken image can fail before React attaches onError.
  // If the element is already finished and has no pixels, skip it now.
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img || !src) return;
    if (img.complete && img.naturalWidth === 0) markFailed(src);
  }, [src]);

  const initialMark = <span style={initialStyle}>{initial}</span>;
  if (!src) return initialMark;

  return (
    <>
      {initialMark}
      <img
        ref={imgRef}
        key={src}
        src={src}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: loadedSrc === src ? 1 : 0,
        }}
        onLoad={() => setLoadedSrc(src)}
        onError={() => markFailed(src)}
      />
    </>
  );
}
