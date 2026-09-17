import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Become from "./become";

jest.mock("./firebase", () => ({
  auth: { currentUser: { uid: "user-1", email: "a@b.c", displayName: "Test" } },
  db: {},
  storage: {},
}));

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({ setCustomParameters: jest.fn() })),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: (_auth, cb) => {
    cb({ uid: "user-1", email: "a@b.c", displayName: "Test" });
    return () => {};
  },
}));

jest.mock("firebase/storage", () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

jest.mock("./userData", () => ({
  createDataClient: () => ({
    resetCache: jest.fn(),
    loadUserData: () => Promise.resolve({
      profile: { name: "Test", email: "a@b.c", phone: "" },
      treatments: [
        {
          id: "open",
          name: "Botox",
          clinic: "Glow Clinic",
          totalSessions: 3,
          expiryDate: "2026-12-31",
          kind: "paid",
          sessions: [{ id: 1, date: "2026-08-01" }],
          frequency: 30,
          frequencyLabel: "Monthly",
        },
        {
          id: "done",
          name: "Laser Hair Removal",
          clinic: "Glow Clinic",
          totalSessions: 3,
          remaining: 0,
          status: "Complete",
          expiryDate: "2026-12-31",
          kind: "paid",
          frequency: 30,
          frequencyLabel: "Monthly",
          sessions: [
            { id: 1, date: "2026-01-10" },
            { id: 2, date: "2026-02-10" },
            { id: 3, date: "2026-03-10" },
          ],
        },
      ],
    }),
    writeTreatment: jest.fn(),
    deleteTreatment: jest.fn(),
    writeProfile: jest.fn(),
  }),
  formatWriteError: (action, error) => `${action}: ${(error && error.message) || "fail"}`,
}));

describe("signed-in Home vs History", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("keeps used-up Complete packs off Home and opens History without login", async () => {
    render(<Become />);

    await waitFor(() => {
      expect(screen.getByText(/becoming/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText("Botox").length).toBeGreaterThan(0);
    expect(screen.queryByText("Laser Hair Removal")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "History" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/history");
    expect(screen.getAllByText("Laser Hair Removal").length).toBeGreaterThan(0);
    expect(screen.getByText("Used up")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
  });

  it("opens /history in-app when a session already exists", async () => {
    window.history.replaceState({}, "", "/history");
    render(<Become />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
    expect(screen.getAllByText("Laser Hair Removal").length).toBeGreaterThan(0);
    expect(screen.getByText("Used up")).toBeInTheDocument();
  });
});
