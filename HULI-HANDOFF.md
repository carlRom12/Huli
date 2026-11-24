# Huli: build spec + Codex prompt

Huli is a "when did I last do it?" tracker for recurring household and personal things (LPG, water refill, aircon cleaning, oil change, haircut). It predicts when each is due from your own history. v1 is solo, local-only, and installable as a PWA.

Design reference: the 5 Huli screens (Today, Item detail, Add, Settings, Laptop) in the published "Huli" design canvas. Open it next to this file. Logo A (tick dot) is the chosen logo.

---

## 1. Stack

- Vite + React + TypeScript
- Tailwind CSS (map the tokens below into the theme)
- Dexie (IndexedDB) for storage. No backend, no accounts.
- vite-plugin-pwa (manifest, service worker, offline)
- date-fns for dates
- Vitest for the prediction logic
- Font: DM Sans (400, 500, 700, 800), self-hosted or Google Fonts

## 2. Design tokens

| Token | Hex | Use |
|---|---|---|
| bg | #F4EFE6 | app background |
| surface | #FBF8F2 | cards, nav |
| border | #DDD5C3 | card and row borders |
| ink | #0F2A2E | text |
| muted | #35514F | secondary text |
| teal | #0B6B5C | primary buttons, OK status, active tab |
| mint | #5EE0C1 | accent on dark (toast Undo) |
| amber | #F2A93B | Soon status bar, logo dot |
| coral | #E8604C | Overdue bar |
| overdue tint | #F6C2B9 (text #7A1F12 / #3D0F08) | Overdue status card |
| soon text | #7A4B00 | Soon label |
| overdue text | #9A2A1A | Overdue label |
| ok pill | #CFE9E2 (text #0B4F44) | "Added" state |
| icon tile | #E6DFCF | item icon background |

Radii: cards 22px, buttons 24-28px (full pill), status card 26px. Min touch target 44px (primary actions 48-56px). Focus ring: 3px #0B6B5C, offset 2px. Respect prefers-reduced-motion.

Status is never color alone: each has an icon and a word (check = All good, clock = Coming up, triangle = Overdue).

## 3. Data model

```ts
type Item = {
  id: string;
  name: string;
  icon: 'flame'|'droplet'|'wind'|'wrench'|'scissors'|'home'|'car'|'user'|'tag';
  defaultIntervalDays: number;   // from starter pack or user input
  createdAt: number;
};
type Log = { id: string; itemId: string; doneOn: string; /* yyyy-MM-dd */ createdAt: number };
```

Derived values (never stored):

- `lastDone` = most recent log date (or `createdAt` if no logs and user said "last done: unknown")
- `typicalInterval`: take the gaps in days between consecutive logs, use the last 5 gaps, take the median. With fewer than 2 logs (0 or 1 gaps), use `defaultIntervalDays`.
- `daysSince` = today - lastDone
- `ratio` = daysSince / typicalInterval
- `status`: ratio < 0.75 → OK ("All good"); 0.75 to 1.0 → Soon ("Coming up"); > 1.0 → Overdue
- `daysUntilDue` = typicalInterval - daysSince (negative = overdue)

Worked example (LPG tank, today Nov 24 2026): logs May 14, Jun 20, Jul 28, Sep 5, Oct 13 → gaps 37, 38, 39, 38 → median 38. daysSince 42 → ratio 1.11 → Overdue by 4 days, expected around Nov 20. Put this in a unit test.

Rules:
- Multiple logs on the same day are ignored for gap math.
- Backdated logs are allowed ("Other date"). Never allow future dates.
- Gaps over 3x the median are treated as outliers (skipped trip, forgot to log) and excluded from the median.

## 4. Screens (match the design)

**Today (home)**
- Header: logo mark + "huli" wordmark, today's date at right.
- Headline: "N things need you" (N = overdue count), subline "M more coming up soon." When N = 0: "You're all caught up."
- Sections in order: Overdue, Coming up, All good. Hide empty sections. Within a section, sort by ratio descending.
- Each card: icon tile, name, status line (icon + "4 days overdue" or "Due tomorrow" or "Due in 38 days" + "· every ~38 days"), thin progress bar (ratio, capped at 100%), and a **Done** button.
- Tapping Done logs today and shows a toast "Logged <name> for today" with **Undo** (5 seconds). Tapping the card body opens Item detail.
- Bottom nav: Today, Add, Settings.
- Empty state (no items): big "Nothing tracked yet" with a button to Add > Starter packs.

**Item detail**
- Back, Edit (rename, icon, default interval, delete with confirm).
- Status card (tinted by status): label, big text ("4 days late"), "Last done Oct 13 · 42 days ago", progress bar, and the explanation "Expected around Nov 20, based on your last 4 gaps (usually 38 days)." With under 2 gaps say "Based on a starting guess of 35 days. Gets smarter as you log."
- Buttons: **Done today** (primary) and **Other date** (opens date picker, max = today).
- "Days between refills" bar chart of the last 5 gaps plus the current open gap in coral if overdue.
- History list, newest first, with "N days after". Swipe or long-press to delete a log (with Undo).

**Add**
- Segmented: Starter packs | Make your own.
- Packs: chips Home / Vehicle / Personal. Each row shows name, "Usually every ~N days", and Add. Already added rows show "Added".
- Pack contents:
  - Home: LPG tank 35, Water refill (5 gal) 7, Aircon cleaning 90, Pest control 180, Smoke detector battery 365, Water filter 180
  - Vehicle: Oil change 90, Tire pressure 30, Registration 365, Car wash 14
  - Personal: Haircut 28, Dentist 180, Eyeglasses check 365, Nail trim 14
- Make your own: name, icon, "usually every" (number + days/weeks/months), "last done" (Today / Yesterday / pick date / Not sure).
- When adding, ask for "last done" (default Today) so the prediction starts right.

**Settings**
- Reminders: Daily nudge switch (default on), time (default 8:00 AM), "Heads up before due" switch.
- Your data: Export backup (JSON download), Restore from backup (file picker, confirm before replacing).
- Get the app: "Add Huli to home screen" button (uses beforeinstallprompt on Android; on iOS show a short how-to).
- Coming later: Share with household (disabled row, not built in v1).

**Laptop (>= 1024px)**
- Three columns: left nav (200px), item list (460px), detail pane (rest, content max 520px). Selecting an item in the list shows it in the detail pane. No separate detail route on desktop.
- Phone (< 1024px): single column with bottom nav, as designed.

## 5. Reminders (be honest about limits)

- Use the Notifications API and a service worker. Android Chrome can show a notification when the PWA is opened or via periodic background sync, but it is not guaranteed to fire on time. iOS only allows web push after the app is installed to the home screen.
- v1 approach: on app open, if the daily nudge is on and something is Overdue or newly Coming up, show a local notification once per day. Also show an in-app badge on the icon where supported (Badging API).
- Real scheduled push is a later step and needs a small backend.

## 6. PWA

- Manifest: name "Huli", short_name "Huli", display standalone, background #F4EFE6, theme #0B6B5C, start_url "/".
- Icons from logo A's app icon (teal rounded square, cream "hi" strokes, amber tick dot): 192, 512, and a maskable 512. Favicon uses the same icon.
- Precache the app shell so it works fully offline.

## 7. Accessibility and quality

- Every icon-only control has an aria-label. Done buttons say which item ("Mark LPG tank done today").
- Toggles use role="switch" with aria-checked.
- Contrast: use the text colors in the token table, not the bar colors, for status text.
- Works at 320px width. No horizontal scroll.
- Unit tests for the status and median logic (including 0, 1, 2 logs, outliers, backdated logs).

## 8. Milestones (do them in order, commit after each)

1. Scaffold Vite + React + TS + Tailwind + PWA plugin. Tokens in the Tailwind theme.
2. Data layer (Dexie), derived-value functions, and tests.
3. Today screen with seeded sample data, Done + Undo toast.
4. Item detail with status card, chart, history, Other date.
5. Add screen: starter packs + custom form.
6. Settings: export/import backup, notification nudge on open, install button.
7. Laptop layout.
8. PWA polish: icons, offline, install, Lighthouse PWA check.

Out of scope for v1: accounts, sync, household sharing, scheduled server push, categories beyond the three packs.

---

## The prompt to give Codex

Paste everything below into Codex in VS Code (with this file saved in your project folder as HULI-HANDOFF.md).

```
Build "Huli", a mobile-first PWA that tracks when recurring household and personal things were last done and predicts when they're due next. Follow HULI-HANDOFF.md in this folder exactly: it has the stack, design tokens, data model, prediction rules, screen-by-screen behavior, and milestones.

Rules:
- Vite + React + TypeScript + Tailwind + Dexie + vite-plugin-pwa + date-fns + Vitest. No backend, no accounts. All data stays on the device.
- Work through the 8 milestones in order. After each one, run the dev server, tell me what to check, and wait for my OK before the next.
- Put the prediction logic (median of the last 5 gaps, status thresholds 75% and 100%, outlier rule) in a pure, tested module. Include the LPG worked example from the spec as a test.
- Match the design: DM Sans, cream background, teal primary buttons, amber and coral status colors, big touch targets (44px min), status shown with icon + word, never color alone.
- Phone layout under 1024px with bottom nav; three-column layout at 1024px and up.
- Seed sample data in dev only so I can see every status.
- Keep components small and in separate files. No unused dependencies.
- If anything in the spec is ambiguous, pick the simplest option and list the assumption at the end of that milestone.

Start with milestone 1.
```