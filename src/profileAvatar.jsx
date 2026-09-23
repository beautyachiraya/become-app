import { useState } from "react";
import { resolveProfilePhotoUrl } from "./userData";

/**
 * Profile photo: stored URL, then Google sign-in photo, then initials.
 * A broken image (onError) advances to the next option instead of staying broken.
 */
export default function ProfileAvatarImage({ profilePhotoURL, authPhotoURL, initial, initialStyle }) {
  const [failedUrls, setFailedUrls] = useState([]);
  const src = resolveProfilePhotoUrl({ profilePhotoURL, authPhotoURL, failedUrls });

  if (!src) {
    return <span style={initialStyle}>{initial}</span>;
  }

  return (
    <img
      key={src}
      src={src}
      alt="Profile"
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      onError={() => {
        setFailedUrls((prev) => (prev.includes(src) ? prev : [...prev, src]));
      }}
    />
  );
}
