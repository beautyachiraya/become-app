import { createRoot } from "react-dom/client";
import { act } from "react";
import ProfileAvatarImage from "./profileAvatar";

global.IS_REACT_ACT_ENVIRONMENT = true;

const stored = "https://firebasestorage.googleapis.com/v0/b/become/o/profile";
const google = "https://lh3.googleusercontent.com/a/achiraya";

function renderAvatar(props) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<ProfileAvatarImage initial="A" {...props} />);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("ProfileAvatarImage", () => {
  it("shows the stored photo when it is present", () => {
    const view = renderAvatar({ profilePhotoURL: stored, authPhotoURL: google });
    expect(view.container.querySelector("img").getAttribute("src")).toBe(stored);
    view.unmount();
  });

  it("shows the Google photo when there is no stored photo", () => {
    const view = renderAvatar({ profilePhotoURL: "", authPhotoURL: google });
    expect(view.container.querySelector("img").getAttribute("src")).toBe(google);
    view.unmount();
  });

  it("shows initials when neither photo is set", () => {
    const view = renderAvatar({ profilePhotoURL: null, authPhotoURL: null, initial: "S" });
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container.textContent).toBe("S");
    view.unmount();
  });

  it("falls back to the Google photo when the stored image errors", () => {
    const view = renderAvatar({ profilePhotoURL: stored, authPhotoURL: google });
    const img = view.container.querySelector("img");
    act(() => {
      img.dispatchEvent(new Event("error"));
    });
    expect(view.container.querySelector("img").getAttribute("src")).toBe(google);
    view.unmount();
  });

  it("shows initials when the stored image errors and there is no Google photo", () => {
    const view = renderAvatar({ profilePhotoURL: stored, authPhotoURL: "", initial: "A" });
    act(() => {
      view.container.querySelector("img").dispatchEvent(new Event("error"));
    });
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container.textContent).toBe("A");
    view.unmount();
  });

  it("shows initials for a broken profile URL when the image already failed before onError", () => {
    const proto = window.HTMLImageElement.prototype;
    const complete = Object.getOwnPropertyDescriptor(proto, "complete");
    const naturalWidth = Object.getOwnPropertyDescriptor(proto, "naturalWidth");
    Object.defineProperty(proto, "complete", { configurable: true, get() { return true; } });
    Object.defineProperty(proto, "naturalWidth", { configurable: true, get() { return 0; } });
    try {
      const view = renderAvatar({ profilePhotoURL: stored, authPhotoURL: "", initial: "A" });
      expect(view.container.querySelector("img")).toBeNull();
      expect(view.container.textContent).toBe("A");
      expect(view.container.textContent).not.toBe("Profile");
      view.unmount();
    } finally {
      if (complete) Object.defineProperty(proto, "complete", complete);
      else delete proto.complete;
      if (naturalWidth) Object.defineProperty(proto, "naturalWidth", naturalWidth);
      else delete proto.naturalWidth;
    }
  });

  it("does not show a local file preview when there is no Google photo", () => {
    const view = renderAvatar({
      profilePhotoURL: "data:image/png;base64,aaaa",
      authPhotoURL: "",
      initial: "A",
    });
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container.textContent).toBe("A");
    view.unmount();
  });

  it("shows initials after both the stored photo and the Google photo error", () => {
    const view = renderAvatar({ profilePhotoURL: stored, authPhotoURL: google, initial: "A" });
    act(() => {
      view.container.querySelector("img").dispatchEvent(new Event("error"));
    });
    act(() => {
      view.container.querySelector("img").dispatchEvent(new Event("error"));
    });
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container.textContent).toBe("A");
    view.unmount();
  });
});
