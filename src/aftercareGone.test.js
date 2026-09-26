import { createRoot } from "react-dom/client";
import { act } from "react";
import { resetGoogleRedirectResultForTests } from "./googleAuth";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("./firebase", () => ({
  auth: { currentUser: null },
  googleRedirectAuth: {},
  firebaseApiKey: "test-key",
  db: {},
  storage: {},
}));

jest.mock("firebase/storage", () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signInWithRedirect: jest.fn(),
  getRedirectResult: jest.fn(),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: class GoogleAuthProvider {
    setCustomParameters() {}
    static credentialFromResult() { return null; }
  },
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  collection: (_db, ...parts) => parts.join("/"),
  doc: (_db, ...parts) => parts.join("/"),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

import Become from "./become";
import { auth as mockAuth } from "./firebase";
import { getDoc, getDocs } from "firebase/firestore";
import { signInWithEmailAndPassword, getRedirectResult } from "firebase/auth";

const GONE = [
  "Aftercare Guide",
  "Aftercare reminder",
  "View Full Aftercare Guide",
  "Do these after treatment",
  "Avoid these after treatment",
  "Good to know",
  "Aftercare guidance",
];

function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<Become />);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function setInput(el, value) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function clickMatch(container, selector, label) {
  const match = Array.from(container.querySelectorAll(selector)).find((node) => (
    node.textContent.trim() === label
  ));
  if (!match) throw new Error(`Could not find ${selector} "${label}"`);
  match.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

async function waitForText(container, label) {
  const started = Date.now();
  while (Date.now() - started < 3000) {
    if ((container.textContent || "").includes(label)) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }
  throw new Error(`Timed out waiting for "${label}". Saw: ${(container.textContent || "").slice(0, 400)}`);
}

function expectAftercareGone(container) {
  const text = container.textContent || "";
  GONE.forEach((label) => {
    expect(text).not.toContain(label);
  });
}

beforeEach(() => {
  mockAuth.currentUser = null;
  resetGoogleRedirectResultForTests();
  window.alert = jest.fn();
  getRedirectResult.mockResolvedValue(null);
  signInWithEmailAndPassword.mockImplementation(async () => {
    mockAuth.currentUser = { uid: "user-1", email: "ada@example.com", displayName: "Ada" };
    return { user: mockAuth.currentUser };
  });
  getDoc.mockResolvedValue({ exists: () => false, data: () => null });
  getDocs.mockImplementation(async (path) => {
    if (String(path).endsWith("treatments")) {
      return {
        empty: false,
        docs: [{
          id: "1",
          data: () => ({
            id: 1,
            name: "Botox",
            clinic: "Glow Clinic",
            totalSessions: 3,
            sessions: [{ id: "s1", date: "2026-09-01", note: "Felt calm" }],
            frequency: 30,
            frequencyLabel: "Monthly",
            expiryDate: "2026-12-01",
            palette: 0,
          }),
        }],
      };
    }
    return { empty: true, docs: [] };
  });
});

describe("aftercare removal", () => {
  it("shows the session timeline on a package, with no aftercare guide or reminder", async () => {
    const view = mount();
    try {
      const email = view.container.querySelector('input[placeholder="Email address"]');
      const password = view.container.querySelector('input[placeholder="Password"]');
      act(() => {
        setInput(email, "ada@example.com");
        setInput(password, "secret-pass");
        clickMatch(view.container, "button", "Sign In");
      });

      await waitForText(view.container, "Botox");
      expectAftercareGone(view.container);

      act(() => {
        clickMatch(view.container, "p", "Glow Clinic");
      });

      await waitForText(view.container, "Session Timeline");
      expect(view.container.textContent).toContain("+ Log Session 2");
      expectAftercareGone(view.container);

      act(() => {
        clickMatch(view.container, "button", "1");
      });

      await waitForText(view.container, "Session 1");
      expect(view.container.textContent).toContain("Felt calm");
      expectAftercareGone(view.container);
    } finally {
      view.unmount();
    }
  });

  it("keeps the medical disclaimer and drops the aftercare sentence", () => {
    const view = mount();
    try {
      act(() => {
        clickMatch(view.container, "button", "Sign up");
      });
      act(() => {
        clickMatch(view.container, "span", "Terms of Service");
      });
      const text = view.container.textContent || "";
      expect(text).toContain("does NOT constitute medical advice");
      expect(text).toContain("Reminders are for general informational purposes only");
      expect(text).not.toContain("Aftercare guidance");
    } finally {
      view.unmount();
    }
  });
});
