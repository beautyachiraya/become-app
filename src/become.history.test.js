import { createRoot } from "react-dom/client";
import { act } from "react";
import Become from "./become";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("./firebase", () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
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

jest.mock("firebase/auth", () => {
  function GoogleAuthProvider() {
    this.setCustomParameters = jest.fn();
  }
  return {
    signInWithEmailAndPassword: jest.fn(),
    signInWithPopup: jest.fn(),
    GoogleAuthProvider,
    createUserWithEmailAndPassword: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };
});

function daysFromNow(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

const fixtures = [
  {
    id: 1,
    packageId: 1,
    name: "Laser Hair Removal",
    clinic: "Glow Clinic Bangkok",
    totalSessions: 8,
    frequency: 42,
    frequencyLabel: "Every 6 weeks",
    expiryDate: daysFromNow(90),
    palette: 0,
    notes: "Full legs",
    source: "paid",
    sessions: [{ id: 1, date: daysFromNow(-40), note: "First session", photo: null, packageId: 1 }],
  },
  {
    id: 2,
    packageId: 2,
    name: "Botox",
    clinic: "Aesthetic Studio",
    totalSessions: 3,
    frequency: 90,
    frequencyLabel: "Every 3 months",
    expiryDate: daysFromNow(-20),
    palette: 1,
    notes: "Forehead",
    source: "promo",
    sessions: [{ id: 11, date: daysFromNow(-60), note: "20 units", photo: null, packageId: 2 }],
  },
  {
    id: 3,
    packageId: 3,
    name: "Chemical Peel",
    clinic: "Pure Skin Spa",
    totalSessions: 2,
    frequency: 30,
    frequencyLabel: "Monthly",
    expiryDate: daysFromNow(40),
    palette: 4,
    notes: "",
    source: "paid",
    sessions: [
      { id: 21, date: daysFromNow(-50), note: "First peel", photo: null, packageId: 3 },
      { id: 22, date: daysFromNow(-20), note: "Last session", photo: null, packageId: 3 },
    ],
  },
];

function mount(ui) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("History vs Home split", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps open packages on Home and shows remaining + source badge", () => {
    const { container, unmount } = mount(
      <Become initialAuthScreen="app" initialTreatments={fixtures} initialTab="home" />
    );
    const text = container.textContent;
    expect(text).toContain("Laser Hair Removal");
    expect(text).toContain("Paid");
    expect(text).not.toContain("Botox");
    expect(text).not.toContain("Chemical Peel");
    expect(text).toContain("7");
    unmount();
  });

  it("lists completed sessions and closed packages on History", () => {
    const { container, unmount } = mount(
      <Become initialAuthScreen="app" initialTreatments={fixtures} initialTab="history" />
    );
    const text = container.textContent;
    expect(text).toContain("History");
    expect(text).toContain("Completed sessions");
    expect(text).toContain("Closed packages");
    expect(text).toContain("Botox");
    expect(text).toContain("Chemical Peel");
    expect(text).toContain("Expired");
    expect(text).toContain("Used up");
    expect(text).toContain("Glow Clinic Bangkok");
    expect(text).toContain("Aesthetic Studio");
    expect(text).toContain("Promo");
    unmount();
  });

  it("moves from Home to History through the History nav label", () => {
    const { container, unmount } = mount(
      <Become initialAuthScreen="app" initialTreatments={fixtures} initialTab="home" />
    );
    expect(container.textContent).toContain("Laser Hair Removal");
    const historyBtn = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent.trim() === "History"
    );
    expect(historyBtn).toBeTruthy();
    act(() => {
      historyBtn.click();
    });
    expect(container.textContent).toContain("Completed sessions");
    expect(container.textContent).toContain("Botox");
    expect(container.textContent).toContain("Closed packages");
    unmount();
  });
});
