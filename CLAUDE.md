# CLAUDE.md

This file gives Claude Code context for working in this repository. Read it before making changes.

## What this app is

Become is a beauty treatment tracker (PWA) built in React. It lets users track aesthetic clinic packages/sessions across multiple providers — the problem it solves is that people lose track of remaining sessions, expiry dates, and photos when they juggle several clinics.

Target markets: Thailand, Dubai, and Southeast Asia.

- Live: https://become-app-rho.vercel.app
- Deploy: Vercel, auto-deploys from `main` — **treat every merge to `main` as a production release.** Prefer working on a branch and showing a full diff before merging, rather than committing straight to `main`.

## Stack

- **Frontend:** React. The whole app lives in `src/Become.jsx` — a single large root component. Most screens (login, signup, home, detail, session, profile) are conditional blocks inside this one component, **not** separate route files or a components-per-screen structure. When asked to change a screen or flow, look inside `src/Become.jsx` first rather than assuming a component folder structure exists elsewhere.
- **Auth:** Firebase Authentication — Google sign-in (popup), email/password sign-up and login. There are also mock OAuth screens (Google/Facebook/Apple) used for a simulated sign-in flow shown before hitting real Firebase auth. Don't confuse the mock screens with the real auth calls.
- **Data:** Firestore.
  - Treatments: `users/{uid}/treatments/{treatmentId}`
  - Profile: `users/{uid}/profile/info`
- **Storage:** Firebase Storage — treatment/session photos and profile photo uploads.
- **i18n:** Lightweight custom system — a `T` object keyed by `en`/`th`. Currently English and Thai only. **Check for existing keys before adding new ones** — there's a documented history of translation variable name conflicts between the `en` and `th` blocks.

## Brand identity — match this, don't default to generic styling

- Headline font: Cormorant Garamond (serif, often italic for emphasis words)
- Body font: DM Sans
- Core palette: caramel (#B4915F) / ivory (#FAF7F2) / espresso (#1C1612), with a warm linen/muted secondary range
- Treatment cards pull from a rotating 6-color soft accent palette (blush, peach, sage, lavender, gold, sky) — see the `PALETTE` array in `Become.jsx`
- Tone: elegant, minimal, self-care/wellness focused. Avoid clinical or corporate-feeling UI copy.
- Animated sakura petal SVGs are used as subtle decorative background motion on the home and profile headers.

When adding a new UI flow, match this existing brand style rather than introducing new component patterns or generic styling.

## Current feature areas

- Core session/package tracking: create, edit, log a session, delete, expiry tracking, "days until next session" countdown ring
- Per-treatment aftercare guide (do's/don'ts/tips) keyed by treatment type
- Session photo upload + notes, editable after logging
- Profile screen: name/email/phone, avatar upload, language + currency pickers (English/Thai, THB/USD/AED)
- In-app Privacy Policy and Terms of Service modals, written for Thai PDPA compliance, gating sign-up until both are accepted
- Top Up flow — adding credit/balance to a user's account. A UX spec exists outside this file — ask before assuming implementation details not documented here.
- Book Appointment — full booking flow. A UX spec exists outside this file — ask before assuming implementation details not documented here.

## Known trouble spots (check these before assuming related code is correct)

1. **Async Firestore save failures** — a recurring bug class. When touching any save/write logic, verify there's a try/catch and a loading/error state shown to the user. Don't assume writes succeed silently.
2. **Duplicate profile fetch** — the profile-loading `useEffect` (fires when `authScreen === "app"`) currently fetches the profile doc twice: once via a dynamic `import("firebase/firestore")` and once via the top-level `doc` import. Both fire and both write to state. This should be deduplicated to one fetch.
3. **Duplicate delete logic** — the session detail view has two separate "Remove this session" buttons with slightly different delete logic. These should be consolidated to one.
4. **Dead OTP code** — there's unused OTP sign-in state and handlers (`otpMethod`, `otpContact`, `otp`, `sendOtp`, `verifyOtp`, `otpRefs`). The OTP screen itself isn't rendered anymore. Before touching: confirm none of these are reachable from any rendered UI, then either remove as dead code or flag as a half-finished feature — don't assume which without checking.
5. **i18n key conflicts** — translation key naming has clashed between the `en`/`th` blocks in `T` before. Check for existing keys before adding new ones.

## Working conventions

- **Always explain what changed and why**, not just what — changes get reviewed before merging.
- **Keep changes scoped to what was asked.** Don't refactor unrelated code in the same pass unless explicitly asked to.
- **Explain plainly, not densely.** I'm not a professional developer — plain-English explanations of why something broke or why an approach was chosen are more useful than dense technical jargon.
- **Audit before deleting.** For anything that looks like dead code (see OTP note above), search for every reference first and confirm it's unreachable before removing it.
- **Don't assume production writes succeed.** Given the async Firestore bug class, treat every new or touched write path as needing explicit error handling and a visible loading/error state.
