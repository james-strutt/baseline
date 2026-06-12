# /BASELINE — Product & Technical Plan

**A live tennis companion for web and iOS: scores in real time, players you actually care about, alerts in your own time zone.**

*Prepared 13 June 2026 · Grounded in the RapidAPI "Tennis API — ATP / WTA / ITF" (endpoints verified live against the production API on this date)*

---

## Table of contents

1. [Vision & positioning](#1-vision--positioning)
2. [What the API gives us (verified)](#2-what-the-api-gives-us-verified)
3. [Feature set](#3-feature-set)
4. [Design direction](#4-design-direction)
5. [System architecture](#5-system-architecture)
6. [Database options & recommendation](#6-database-options--recommendation)
7. [Notification & email pipeline (time-zone aware)](#7-notification--email-pipeline-time-zone-aware)
8. [API cost engineering](#8-api-cost-engineering)
9. [Commercial model](#9-commercial-model)
10. [Delivery roadmap](#10-delivery-roadmap)
11. [Team, costs & unit economics](#11-team-costs--unit-economics)
12. [KPIs](#12-kpis)
13. [Risks & mitigations](#13-risks--mitigations)

---

## 1. Vision & positioning

**The problem.** Tennis is the most time-zone-hostile sport on earth. The tour never stops moving — Melbourne in January, Indian Wells in March, Paris in May, New York in September — and a fan in Sydney who loves Alcaraz has no reliable way to know that his next match starts at 4:10am their time, on which court, against whom, without trawling draw PDFs and order-of-play pages. Flashscore and Sofascore are all-sports firehoses; the ATP/WTA official apps are tour-siloed (a fan follows *players*, not tours — and players move between ATP, Challengers, and ITF events week to week).

**The product.** Baseline is a *player-first* tennis app. You favourite players; everything else — scores, schedules, notifications, emails, head-to-heads — organises itself around them, rendered in your local time always. Live scores for every professional level (ATP, WTA, Challenger, ITF, UTR Pro) in one place, because the API covers them all.

**Positioning line:** *"Never miss a ball. Wherever they play, whenever you wake."*

**Initial market:** English-speaking time-zone-disadvantaged fans (Australia/NZ, then Asia, then the Americas for European-season coverage). Australia is an ideal beachhead: huge tennis culture, brutal time-zone offsets to Europe/US, and the Australian Open as an annual acquisition spike.

---

## 2. What the API gives us (verified)

The following endpoints were called live during planning. Data shapes are confirmed, not assumed.


| Capability              | Endpoint(s)                                                                                                                                                                  | Verified observations                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live scores, all levels | `Get Live Events`                                                                                                                                                            | Returns in-play matches with set scores, current game points (`40-30`), serve indicator, league name (ATP, WTA, Challenger, ITF W35/M25, UTR Pro). 29 concurrent matches at time of test. |
| Live match detail       | `Get Live Match Data`, `Get Match Timeline Data`, `Get PBP Stat`                                                                                                             | Point-by-point timeline, serve state, in-match stats — powers a "match centre" screen.                                                                                                    |
| Rankings                | `singlesRanking`, `doublesRanking`                                                                                                                                           | Full ATP/WTA tables with points, position, country; filterable by ranking date and country; paginated.                                                                                    |
| Player profile          | `getPlayerInfo` (+ `form,ranking` includes)                                                                                                                                  | Bio (plays, height, turned pro, residence), current rank, points, socials.                                                                                                                |
| Player schedule         | `getPlayerFixtures`                                                                                                                                                          | Upcoming matches per player — **the backbone of favourite-player notifications**.                                                                                                         |
| Player history & form   | `getPlayerPastMatches`, `getPlayerMatchStats`, `getPlayerPerformanceBreakdown`, `getPlayerSurfaceSummary`, `getPlayerTitles`, `getPlayerFinals`, `getPlayerTournamentRecord` | Deep stats: surface splits, titles, finals, tournament records.                                                                                                                           |
| Fixtures by date        | `getDateFixtures`, `getDateRangeFixtures`, `getAllFixtures`                                                                                                                  | **UTC timestamps confirmed** (e.g. `2026-06-13T15:30:00.000Z`) — clean local-time conversion. Includes seeds, round IDs, tournament IDs.                                                  |
| Head-to-head            | `getH2HInfo`, `getH2HStats`, `getH2HMatches`, `getH2HFixtures`, `getPlayerInterestingH2H`                                                                                    | Full H2H suite incl. "interesting H2H" for editorial surfacing.                                                                                                                           |
| Tournaments             | `getTournamentCalendar`, `getTournamentFixtures`, `getTournamentResults`, `getTournamentPastChampions`, `getTournamentSeasons`, `getTourInfo`                                | Season calendar, draws/results, history.                                                                                                                                                  |
| Odds                    | `Get Best Odds Only`, `Get Latest All Odds`, `Get Odds By Market Name`                                                                                                       | Multi-bookmaker odds — monetisation option (jurisdiction-dependent; see §9 and §13).                                                                                                      |
| Search & reference      | `search`, `countryList`, `courtList`, `roundList`                                                                                                                            | Player/tournament search for onboarding favourite-picking.                                                                                                                                |


**Key data facts that shape the architecture:**

- All fixture times are UTC ISO-8601 → time-zone conversion is purely a presentation/scheduling concern on our side. The API never tells us the user's clock; we own that.
- Live data is *poll-based* (no webhooks/streaming) → we must build our own ingestion poller and fan out to clients ourselves (WebSockets/push). This is the single most important architectural constraint.
- Coverage spans ATP → ITF → UTR Pro, which is our differentiator: follow a player through qualifying, Challengers, and the main tour with one favourite.
- `getDateFixtures` ranges only cover scheduled order-of-play; precise match start times shift constantly ("not before", rain delays) → notifications need a "scheduled vs. actually started" two-stage design (§7).

---

## 3. Feature set

### 3.1 Core (MVP)

**Live scores hub**

- All in-play matches grouped by tournament tier (Grand Slam → ATP/WTA → Challenger → ITF/UTR), with set score, game points, and serve indicator updating in near-real-time.
- Filter by tour, country, surface, favourites-only.
- Tap into a **match centre**: point-by-point timeline, momentum strip, in-match stats, H2H context.

**Favourites**

- Favourite players (and tournaments) from search, rankings, or any scoreline.
- A personal **"My Matches" feed**: every favourite's next match with countdown *in local time* ("Alcaraz plays in 6h 20m — 4:10am AEST Thursday"), recent results, live matches pinned to top.
- Favourite a *match* (e.g. a final you're anticipating) for one-off alerts.

**Rankings**

- ATP & WTA singles/doubles, sortable, country-filterable, with week-on-week movement arrows and ranking-history sparkline per player (we accumulate snapshots — see §6).

**Player pages**

- Bio, current form (last 10 with W/L strip), surface splits, season record, titles, upcoming schedule (local time), full H2H tool ("compare with…").

**Schedule / Order of play**

- Day view of all fixtures rendered in the user's time zone with a "your morning / your night" divider — the schedule literally reorganises around the user's clock rather than the tournament's.

**Notifications & email (the moat)** — detailed in §7

- Match scheduled / starts soon / started / set-by-set / result, per favourite, with per-player and global granularity controls, quiet hours, and digest emails.

### 3.2 Differentiators (post-MVP)

- **Wake-up Brief** (email + push, sent at user's chosen local morning time): "While you slept: Sinner won 7-6 7-5; Djokovic plays tonight 11pm your time." This is the retention engine for the AU/Asia beachhead.
- **Apple ecosystem depth (iOS):** Live Activities on the Lock Screen / Dynamic Island for a followed match's live score; home-screen widgets (next match countdown, live score); Apple Watch glance.
- **Race to the next tier:** visualise a favourite's live ranking points and what's at stake this week (defending points, projected rank).
- **H2H storylines:** auto-generated pre-match cards from `getPlayerInterestingH2H` + surface stats ("Fritz is 0-3 vs Bellucci on grass").
- **Following the journey:** because the API covers ITF/Challenger, follow a junior or comeback player end-to-end — no other consumer app does this well.
- **Social layer (later):** shareable match-result cards (image-rendered), prediction game with friends leagues during Slams.

### 3.3 Explicit non-goals (v1)

No video/streaming rights, no betting transactions (odds *display* only, geo-gated), no Android in phase 1 (architecture keeps it cheap to add — see §5), no doubles-specialist features beyond rankings.

---

## 4. Design direction — "The Club"

*(Developed with the frontend-design process: tokens → wireframe → signature → self-critique. Brief from the founder: tennis-esque, clearly not AI-generated-looking, with a hint of Wimbledon poshness.)*

**Thesis.** Poshness in tennis is not an abstract mood — it has a precise visual canon: Centre Court's deep evening green, championship-ribbon purple, the all-white dress code, gilt lettering on the honours boards, and the manual scoreboard whose plaques are still flipped by hand. Baseline borrows *only* from that canon. Every token below traces to a physical artefact of lawn tennis; nothing is decorative mood-boarding. The result should feel like a digital extension of the members' enclosure — warm, assured, slightly formal — while the live data underneath is ruthlessly modern.

### 4.1 Signature element: the Club Scoreboard

Every live score in the app is rendered as a **manual scoreboard plaque**: a deep-green panel, chalk-white tabular digits in stencilled slots, one gilt hairline frame. When a point changes, the affected digit flips on a 140ms vertical roll — the exact motion of the hand-flipped plaques still used at Wimbledon. That single object — green panel, white digit, gold line, mechanical flip — is the brand. It appears identically on the web live hub, the iOS Live Activity on the lock screen, the widget, and the result cards people share.

**Secondary motif — the Honours Board.** Rankings, titles, and career-high moments are set as gilt serif capitals on deep green, exactly like the engraved champions' boards in the Centre Court clubhouse. A player hitting a career-high rank gets a brief "engraving" moment (letters trace in gold). Used sparingly — honours boards are earned, not ambient.

Surface-adaptive tinting (terracotta for clay events, acrylic blue for hard courts) survives as a *quiet, contextual* layer inside tournament pages and match centres only. The brand itself stays Club green/purple/ivory year-round — the club doesn't redecorate for away tours.

### 4.2 Tokens

**Colour** — drawn from the lawn-tennis canon, not a palette generator:


| Token          | Hex       | Source artefact & role                                                                                                                                                                                                                                            |
| -------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `centre-court` | `#0E3B27` | Evening Centre Court grass — scoreboard plaques, dark-mode canvas (`#0A2A1C` at depth), honours boards                                                                                                                                                            |
| `whites`       | `#F7F4EC` | The all-white dress code — light-mode canvas. (Aware that cream canvases are an AI-design cliché; here it is the one colour the brief literally mandates — tennis whites — and it is paired with green/purple/gilt, never the cliché terracotta-serif treatment.) |
| `ribbon`       | `#46286E` | Championship-ribbon purple — interactive elements, links, selected states, premium (Plus/Pro) identity                                                                                                                                                            |
| `gilt`         | `#A8893B` | Trophy and honours-board gold — hairline rules, champion moments, plaque frames. Never used as a fill; gold is an edge, like engraving.                                                                                                                           |
| `chalk`        | `#FFFFFF` | Court lines — text on green, scoreboard digits                                                                                                                                                                                                                    |
| `optic`        | `#CFD916` | The tennis ball — reserved *exclusively* for LIVE indicators and the serve dot. One deliberately modern, loud note against the heritage palette; its scarcity is what keeps the design from tipping into pastiche.                                                |


**Type**


| Role         | Face                                   | Notes                                                                                                                                                                                                                                                                                                                                          |
| ------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display      | **Libre Caslon Display**               | Caslon is *the* British typeface — "when in doubt, use Caslon" was the trade's rule for two centuries. Player names, tournament mastheads, honours boards, the Wake-up Brief headline. Set generously, never bolded for emphasis (poshness whispers). Deliberately *not* Playfair Display, the default "elegant serif" of AI-generated design. |
| Body / UI    | **Albert Sans** (16/14)                | Quiet humanist sans; carries all functional UI so the Caslon stays special.                                                                                                                                                                                                                                                                    |
| Score / data | **Spline Sans Mono** (tabular figures) | Scoreboard digits, rankings, countdowns. Tabular numerals are non-negotiable — digits must not jiggle as points change. Stencil-slot rendering on plaques echoes the manual scoreboard's cut letterforms.                                                                                                                                      |


**Motion.** One orchestrated moment only: the scoreboard flip (140ms vertical roll, slight mechanical ease-out) and the serve dot sliding across. Nothing else in a score row animates. Page transitions are instant; reveals are restrained fades. Respect `prefers-reduced-motion` (cross-fade instead of flip). Skeletons shimmer in muted green, not grey. The absence of motion *is* the poshness — nothing in a members' enclosure bounces.

**Texture & spacing.** Generous whitespace and a strict 8pt rhythm; hairline gilt rules used the way engravers use them — one per surface, never stacked into the "broadsheet hairline grid" cliché. Corner radii small and consistent (4px): plaques have crisp edges, not pill shapes. No gradients anywhere except the single vertical light falloff on scoreboard plaques (the shadow inside a real scoreboard slot).

### 4.3 Layout concept (live hub, mobile)

```
┌─────────────────────────────────┐
│ Baseline           ◷ 21:42 AEST │  ← masthead in Libre Caslon; user clock always visible
│ ────────────────────────────────│  ← single gilt hairline under masthead
│ MY MATCHES                      │
│ ┌─────────────────────────────┐ │
│ │▌● LIVE · ATP Stuttgart      │ │  ← plaque: centre-court green panel,
│ │  BELLUCCI     7  5  5       │ │     gilt hairline frame
│ │  FRITZ      ● 5  7  6       │ │  ← optic serve dot; chalk stencil digits
│ │  15–40 · 3rd set · 2h 11m   │ │     that flip on point change
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ NEXT — Djokovic v Lehecka   │ │  ← "v", not "vs" — the order of play
│ │ in 6h 20m · 4:10am your time│ │     always says "v"
│ │ Alert set · In your Brief   │ │
│ └─────────────────────────────┘ │
│ ────────────────────────────────│
│ ALL COURTS (29)  [ATP][WTA][CH] │
│ …compact rows, optic dot = live │
│ ────────────────────────────────│
│  Live   Order of Play  Rankings │  ← "Order of Play", not "Schedule"
└─────────────────────────────────┘
```

**Copy voice — the courteous umpire.** Understated, precise, faintly formal; the vocabulary of the sport itself, never parody. Local-time-first everywhere ("4:10am your time Thursday", never "13:30 GMT" as primary). The schedule is the *Order of Play*. Empty live hub: "Quiet, please — no matches in play. The next order of play begins at 7:00pm your time." Errors: "Play suspended — scores last updated 40 seconds ago. Resuming shortly." Notifications stay crisp ("Djokovic is on court"), because a push notification is a tap on the shoulder, not a letter.

**Self-critique applied.** Three rejections shaped this direction: (1) an earlier near-black + acid-accent scheme — the generic AI dark-sports default, and the opposite of posh; (2) Playfair-on-cream-with-terracotta — the other AI default, posh-flavoured but anonymous; (3) full Wimbledon cosplay (strawberry illustrations, racquet icons, "fault!" error copy) — pastiche reads as a theme, not an identity. What survives is narrow and specific: one signature object (the scoreboard plaque), one serif with a genuinely British pedigree, one loud modern colour rationed to live moments, and silence everywhere else. The boldness budget is spent entirely on the Club Scoreboard.

### 4.4 Design tooling & workflow

- **Figma** as source of truth: token library (colours/type/spacing published as variables), component library (match card, score row, player chip, alert sheet), and clickable prototypes for the two money flows (onboarding→favourite→first alert; live hub→match centre).
- **Tokens pipeline:** Figma Variables → Style Dictionary → CSS custom properties (web) + Swift/TS theme constants (mobile), so the Club palette and contextual surface tints stay identical on every platform.
- **AI-assisted iteration:** v0/Claude for rapid HTML mockups of new screens before committing them to Figma; Storybook (web) and Expo Storybook (mobile) as the living component catalogue.

### 4.5 Wireframe set

Conventions: `════` double rule = scoreboard plaque frame (gilt hairline in build); `────` = single gilt rule; `●` optic-yellow live/serve dot; `▲▼` ranking movement; CAPS = Libre Caslon small caps; digits are always Spline Sans Mono tabular. The mobile live hub is in §4.3; the screens below complete the set.

**W1 — Onboarding: pick your players (mobile)**

```
┌─────────────────────────────────┐
│ Baseline                        │
│ Follow the players you love.    │  ← Caslon, two lines, nothing else
│ ────────────────────────────────│
│ ⌕  Search any player or event   │  ← `search` endpoint; covers ITF/
│                                 │     Challenger names too
│ FROM THE TOP TEN                │
│ ┌───────┐ ┌───────┐ ┌───────┐   │
│ │SINNER │ │ALCARAZ│ │ZVEREV │   │  ← tiles: chalk name on centre-court
│ │  ITA  │ │  ESP  │ │  GER  │   │     green, gilt frame when selected
│ └───────┘ └───────┘ └───────┘   │
│ ┌───────┐ ┌───────┐ ┌───────┐   │
│ │SABALEN│ │ SWIATEK│ │ GAUFF │  │
│ └───────┘ └───────┘ └───────┘   │
│                                 │
│ Selected: 2                     │
│ ┌─────────────────────────────┐ │
│ │  Continue — set your alerts │ │  ← ribbon-purple button; leads
│ └─────────────────────────────┘ │     straight to W7 (alerts), then
│ Skip for now                    │     tz auto-detect confirmation
└─────────────────────────────────┘
```

**W2 — Live hub (web, desktop)**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Baseline        Live   Order of Play   Rankings   Players      ◷ 21:42 AEST    │
│ ────────────────────────────────────────────────────────────────────────────── │
│                                          │                                     │
│  MY MATCHES                              │  ALL COURTS (29)  [ATP][WTA][CH][ITF]│
│  ╔══════════════════════════════════╗    │  ─────────────────────────────────  │
│  ║ ● LIVE · ATP STUTTGART · GRASS   ║    │  ● McNally v Tomljanovic   4-6 1-4  │
│  ║   BELLUCCI      7   5   5        ║    │    WTA Hertogenbosch        40-40   │
│  ║   FRITZ       ● 5   7   6        ║    │  ● Rybakina v Boulter        5-4    │
│  ║   15–40 · 3rd set · 2h 11m       ║    │    WTA Queens                0-30   │
│  ╚══════════════════════════════════╝    │  ● Medvedev v Cilic      6-2 3-6    │
│   full-size plaque, flip digits          │    ATP Hertogenbosch              ↑ │
│                                          │  ● Schoolkate v Tarvet   3-6 1-2    │
│  ┌──────────────────────────────────┐    │    Challenger Ilkley                │
│  │ NEXT — DJOKOVIC v LEHECKA        │    │  …                                  │
│  │ in 6h 20m · 4:10am your time     │    │   compact rows; click → W3.         │
│  │ Halle · QF · Alert set           │    │   Optic dot only signal of "live";  │
│  └──────────────────────────────────┘    │   no red badges anywhere            │
│                                          │                                     │
│  WHILE YOU SLEPT (3)            view all │   sidebar footer:                   │
│  Sinner d. Fonseca 7-6 7-5 · overnight   │   "Updated 12s ago" in Albert Sans  │
└────────────────────────────────────────────────────────────────────────────────┘
```

**W3 — Match centre (mobile)**

```
┌─────────────────────────────────┐
│ ‹ Back        ATP STUTTGART · QF│
│ ╔═════════════════════════════╗ │
│ ║ ● LIVE                2h 11m║ │
│ ║  BELLUCCI      7   5   5    ║ │  ← hero plaque, oversized digits;
│ ║  FRITZ       ● 5   7   6    ║ │     this exact component becomes
│ ║  15–40 · Fritz to serve     ║ │     the Live Activity (W9)
│ ╚═════════════════════════════╝ │
│ ────────────────────────────────│
│ MOMENTUM                        │
│ ▁▂▅▃▂▆▇▃▂▁▅▆▂▃▅  ← set 3        │  ← per-game momentum strip, muted
│ ────────────────────────────────│     green bars, optic tick = break
│ [Points] [Stats] [H2H] [Courts] │  ← tab row, ribbon underline
│                                 │
│ POINT BY POINT          set 3 ▾ │
│ 5-6  0-15   double fault        │  ← `Get Match Timeline Data` /
│ 5-6  15-15  ace (11th)          │     `Get PBP Stat`
│ 5-6  15-30  forehand winner     │
│ ────────────────────────────────│
│ FRITZ LEADS H2H 3–1             │  ← one-line storyline from
│ but 0–1 on grass · full H2H ›   │     `getPlayerInterestingH2H`
└─────────────────────────────────┘
```

**W4 — Player page (web; pre-rendered for SEO)**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Baseline        Live   Order of Play   Rankings   Players      ◷ 21:42 AEST    │
│ ────────────────────────────────────────────────────────────────────────────── │
│                                                                                │
│  NOVAK DJOKOVIC                                  ┌──────────────────────────┐  │
│  Serbia · No. 7 · 3,760 pts                      │  ♡ Following             │  │
│  Right-handed · Turned pro 2003                  │  Alerts: All on  ✎       │  │
│  ────────────────────────────────                └──────────────────────────┘  │
│                                                                                │
│  FORM   W W L W W W L W W W          NEXT MATCH                                │
│  last 10 · chalk W, muted L          ╔════════════════════════════╗            │
│                                      ║ v LEHECKA · Halle QF       ║            │
│  ── HONOURS ─────────────────        ║ Saturday 4:10am your time  ║            │
│  24 GRAND SLAM TITLES                ║ (12:10pm in Halle)         ║            │
│  100 CAREER TITLES                   ╚════════════════════════════╝            │
│  gilt caps on green — the            tournament tz always secondary            │
│  honours-board treatment                                                       │
│                                      RANKING  ──────────────────────           │
│  SURFACES   Hard 84% · Clay 80%       7 ▬▬▬▬▬▬▬▬▬▬▬▬▬╲▁▁╱▬▬  spark-           │
│  · Grass 86% win rate                 line from our weekly snapshots           │
│                                                                                │
│  [Compare with another player ›]     UPCOMING · RESULTS · TITLES               │
└────────────────────────────────────────────────────────────────────────────────┘
```

**W5 — Rankings: the Honours Board (mobile)**

```
┌─────────────────────────────────┐
│ RANKINGS      [ATP ▾] [Singles▾]│
│ Week of 8 June · ────────────── │
│ ╔═════════════════════════════╗ │
│ ║ 1  SINNER          13,500   ║ │  ← top 10 set as honours board:
│ ║ 2  ALCARAZ          9,960   ║ │     gilt Caslon caps on deep green,
│ ║ 3  ZVEREV           7,305   ║ │     no zebra striping, no avatars
│ ║ 4  AUGER ALIASSIME  4,440 ▲2║ │
│ ║ 5  SHELTON          3,920 ▼1║ │
│ ╚═════════════════════════════╝ │
│  6  De Minaur        3,905  —   │  ← 11+ revert to quiet list rows;
│  7  Djokovic ♡       3,760  ▲1  │     ♡ marks favourites
│  8  Medvedev         3,760  ▼1  │
│ ────────────────────────────────│
│ Filter: country ▾   Jump to ♡   │
│ tap row → W4 · weekly movement  │
│ + sparkline from our snapshots  │
└─────────────────────────────────┘
```

**W6 — Order of Play (mobile) — the time-zone signature screen**

```
┌─────────────────────────────────┐
│ ORDER OF PLAY    ‹ Sat 14 Jun › │
│ Times shown in AEST · change ▾  │
│ ────────────────────────────────│
│ YOUR EVENING                    │
│ 7:00pm  ● LIVE Halle            │
│         Mannarino v De Minaur ♡ │
│ 9:30pm  Queens — Rybakina v …   │
│ ────────────────────────────────│
│ OVERNIGHT          🌙 quiet hrs │
│ 1:00am  Stuttgart F (not before)│  ← "~" and "(not before)" carried
│ 4:10am  ~ DJOKOVIC v LEHECKA ♡  │     through from OOP; provisional
│         in your Wake-up Brief   │     times never pretend precision
│ ────────────────────────────────│
│ YOUR MORNING                    │
│ 8:00am  Tucumán CH — Kicker v … │
│ ────────────────────────────────│
│ day reorganised around the      │
│ user's clock, not the venue's   │
└─────────────────────────────────┘
```

**W7 — Alert controls (per-favourite sheet, mobile)**

```
┌─────────────────────────────────┐
│ ALERTS — NOVAK DJOKOVIC         │
│ ────────────────────────────────│
│ Day before, with local time  ◉  │
│ Thirty minutes before        ◉  │
│ When he walks on court       ◉  │
│ Every set                    ○  │  ← copy names what happens, in
│ Final result                 ◉  │     the user's terms — no jargon
│ ────────────────────────────────│
│ Channel   [Push ✓] [Email ✓]    │
│ ────────────────────────────────│
│ QUIET HOURS        11pm — 7am   │
│ Suppressed alerts join your     │
│ Wake-up Brief at 7:00am.        │  ← the rollup promise, stated
│ ────────────────────────────────│     where the trade-off is made
│ Use these for all my players ›  │
└─────────────────────────────────┘
```

**W8 — Wake-up Brief (email)**

```
┌─────────────────────────────────┐
│         B A S E L I N E         │  ← Caslon masthead, tennis-whites
│      Saturday 14 June · AEST    │     ground, one gilt rule
│ ────────────────────────────────│
│ WHILE YOU SLEPT                 │
│ ╔═════════════════════════════╗ │
│ ║ SINNER d. FONSECA           ║ │  ← results as miniature plaques,
│ ║ 7-6  7-5 · Halle SF         ║ │     green on white card
│ ╚═════════════════════════════╝ │
│ ╔═════════════════════════════╗ │
│ ║ FRITZ d. BELLUCCI           ║ │
│ ║ 5-7  7-5  7-6 · Stuttgart   ║ │
│ ╚═════════════════════════════╝ │
│ ────────────────────────────────│
│ TODAY, YOUR TIME                │
│ 4:10am ~ Djokovic v Lehecka  ♡  │
│ 9:30pm   Rybakina v Boulter  ♡  │
│ ────────────────────────────────│
│ ONE STORYLINE                   │
│ Djokovic and Lehecka have met   │
│ twice; both went the distance.  │
│ ────────────────────────────────│
│ Manage alerts · Unsubscribe     │
└─────────────────────────────────┘
```

**W9 — iOS Lock Screen Live Activity & Dynamic Island**

```
Lock Screen (ActivityKit):              Dynamic Island:
╔═══════════════════════════════╗       compact:  (● BEL 5-7-5 │ FRI 7-5-6)
║ ● LIVE · STUTTGART SF         ║       expanded:
║  BELLUCCI      7   5   5      ║       ┌───────────────────────────┐
║  FRITZ       ● 5   7   6      ║       │ ● BELLUCCI 7 5 5          │
║  15–40 · 3rd set              ║       │   FRITZ  ● 5 7 6 · 15–40  │
╚═══════════════════════════════╝       └───────────────────────────┘
 the plaque component, verbatim —        ← APNs token-pushed updates on
 green panel renders beautifully           point change (rate-limited to
 on the lock screen                        game boundaries to respect
                                           ActivityKit budgets)
```

**W10 — Home-screen widgets (iOS)**

```
Small (next match):            Medium (live):
┌──────────────┐               ┌────────────────────────────────┐
│ DJOKOVIC     │               │ ● LIVE · STUTTGART             │
│ v Lehecka    │               │  BELLUCCI      7   5   5       │
│ ──────────── │               │  FRITZ       ● 5   7   6       │
│ in 6h 20m    │               │  15–40 · 3rd set · 2h 11m      │
│ 4:10am AEST  │               └────────────────────────────────┘
└──────────────┘                timeline-refreshed; taps deep-link
 countdown re-renders            to W3 match centre
 via WidgetKit timeline
```

**W11 — Paywall: Baseline Plus (mobile, shown at the third-favourite moment)**

```
┌─────────────────────────────────┐
│ ╔═════════════════════════════╗ │
│ ║   MEMBERSHIP HAS ITS        ║ │  ← honours-board panel; the
│ ║   PRIVILEGES                ║ │     premium identity is ribbon
│ ╚═════════════════════════════╝ │     purple + gilt, used nowhere
│ Follow every player you love.   │     else in the free app
│                                 │
│   Unlimited players         ♡   │
│   Walk-on & set alerts          │
│   Live Activities & widgets     │
│   The daily Wake-up Brief       │
│   No advertising                │
│ ────────────────────────────────│
│ ┌─────────────────────────────┐ │
│ │ A$54.99/year — two months   │ │
│ │ free                        │ │
│ └─────────────────────────────┘ │
│   or A$6.99 monthly             │
│ Restore purchase · Terms        │
└─────────────────────────────────┘
```

Build order for the component library follows directly: the **plaque** (W2/W3/W8/W9/W10 reuse it verbatim) → compact score row → honours board → time-pill ("4:10am your time") → alert sheet. Five components carry the entire product.

---

## 5. System architecture

```
                    ┌─────────────────────────────────────────────┐
                    │      RapidAPI Tennis API (ATP/WTA/ITF)      │
                    └──────────────────┬──────────────────────────┘
                                       │ polled (we control cadence & cost)
                    ┌──────────────────▼──────────────────────────┐
                    │       INGESTION SERVICE (Node/TS)           │
                    │  • live poller: 10–20s in-play, adaptive    │
                    │  • fixtures/rankings sync: cron (15m/daily) │
                    │  • diff engine → emits domain events        │
                    │    (match.started, set.won, match.ended,    │
                    │     fixture.scheduled, fixture.time_changed)│
                    └───────┬──────────────────────┬──────────────┘
                            │ writes               │ events
                  ┌─────────▼─────────┐   ┌────────▼─────────────┐
                  │ Postgres (Supabase│   │ Redis                │
                  │ /Neon) + Timescale│   │ • live-state cache   │
                  │ ext. for PBP/series│  │ • pub/sub fan-out    │
                  └─────────┬─────────┘   │ • BullMQ job queues  │
                            │             └────┬───────────┬─────┘
                  ┌─────────▼─────────┐  ┌─────▼─────┐ ┌──▼───────────────┐
                  │ API LAYER         │  │ REALTIME  │ │ NOTIFICATION SVC │
                  │ tRPC/REST + edge  │  │ WS / SSE  │ │ • tz scheduler   │
                  │ cache (Vercel/CF) │  │ gateway   │ │ • APNs (+FCM v2) │
                  └───┬───────────┬───┘  └─┬───────┬─┘ │ • email (Resend) │
                      │           │        │       │   └──────────────────┘
              ┌───────▼───┐   ┌───▼────────▼──┐    │
              │ WEB        │  │ iOS            │◄──┘ push
              │ Vite +     │  │ Expo / React   │
              │ React SPA  │  │ Native + Live  │
              │ PWA-capable│  │ Activities     │
              └────────────┘  └────────────────┘
```

**Critical principle — poll once, fan out infinitely.** The API is polled by *our ingestion service only*. Clients never touch RapidAPI. One `Get Live Events` poll serves 10 users or 10 million; API cost is decoupled from user growth (full cost model in §8). The diff engine compares each poll against Redis state and emits semantic events; everything downstream (websockets, push, email, Live Activities) consumes events, not raw API payloads.

**Stack choices & rationale**


| Layer         | Choice                                                                                                                                                               | Why                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web           | **Vite + React 19 + TypeScript** (founder preference), TanStack Router + TanStack Query, Tailwind, shadcn/ui primitives under the Club token skin, `vite-plugin-pwa` | Fast dev loop, simple static hosting, PWA for "app-lite" users. SEO trade-off vs SSR is handled with a **pre-render step**: a nightly job (or `vite-ssg`) emits static HTML snapshots of player/H2H/tournament pages with schema.org markup, served to crawlers from the CDN while humans get the SPA. Revisit a thin SSR edge layer only if organic growth justifies it. |
| iOS           | **Expo / React Native** + native Swift modules for Live Activities & widgets                                                                                         | One TS codebase shared with web (types, API client, score-formatting logic); Android later is a config away. Native ActivityKit module is small and isolated.                                                                                                                                                                                                             |
| Shared        | Turborepo monorepo: `apps/web`, `apps/mobile`, `packages/api-client`, `packages/ui-tokens`, `packages/domain`                                                        | Score parsing, tz logic, and types written once, tested once.                                                                                                                                                                                                                                                                                                             |
| Backend       | Node/TypeScript (NestJS or Hono) on Fly.io/Railway; long-running poller is **not** serverless (needs persistent loop + Redis connection)                             | tRPC for end-to-end types web↔mobile↔server.                                                                                                                                                                                                                                                                                                                              |
| Realtime      | WebSocket gateway (or managed: Ably/Pusher early) backed by Redis pub/sub                                                                                            | Channels: `match:{id}`, `user:{id}:favourites`. SSE fallback on web.                                                                                                                                                                                                                                                                                                      |
| Auth          | **Supabase Auth** (project provisioned: ref `pzlvsljladbymdgtxger`) — Apple Sign-In mandatory on iOS, plus email magic-link                                          | Time zone + notification prefs captured at signup; tz auto-detected and re-confirmed on travel (device tz change event). Row-level security on `favourites`/`users`; the web/mobile clients talk to Supabase directly for auth + user data, while live-score reads go through our cached API layer.                                                                       |
| Email         | Resend (React Email templates)                                                                                                                                       | Wake-up Brief and digests as designed artefacts, same token system.                                                                                                                                                                                                                                                                                                       |
| Push          | APNs direct (Live Activities require it) via `apns2`; abstraction layer so FCM slots in for Android                                                                  | Token lifecycle handled in notification service.                                                                                                                                                                                                                                                                                                                          |
| Observability | Sentry (app + backend) + PostHog (product analytics, feature flags, A/B)                                                                                             | PostHog already in the team's toolkit.                                                                                                                                                                                                                                                                                                                                    |


---

## 6. Database options & recommendation

Three workload shapes coexist: **relational core** (users ↔ favourites ↔ players ↔ matches), **high-churn live state** (29+ matches updating every few seconds), and **append-heavy time series** (point-by-point, ranking snapshots).

### Options considered


| Option                                        | Strengths                                                                                                                                                                                           | Weaknesses                                                                                                                                        | Verdict              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **PostgreSQL** (Supabase or Neon) + **Redis** | Relational integrity for the favourites graph; JSONB for raw API payload archiving; Timescale/partitioning for time series; Supabase bundles auth + realtime + row-level security; huge talent pool | Needs Redis alongside for live-state churn (don't hammer Postgres with 3 writes/sec/match)                                                        | ✅ **Recommended**    |
| MongoDB Atlas                                 | Flexible documents map neatly to API payloads; Atlas Device Sync for mobile offline                                                                                                                 | Favourites/notification logic is fundamentally relational (joins across users×players×fixtures×deliveries); transactions weaker; two skill stacks | ❌                    |
| DynamoDB + Lambda                             | Infinite scale, pay-per-request                                                                                                                                                                     | Access patterns must be known upfront — wrong fit for a fast-evolving product; poor ad-hoc analytics; poller isn't serverless anyway              | ❌                    |
| PlanetScale (MySQL)                           | Branching workflow, serverless scale                                                                                                                                                                | No JSONB-grade payload archiving, no Timescale path; nothing Postgres lacks                                                                       | ❌                    |
| CockroachDB / Spanner                         | Global multi-region writes                                                                                                                                                                          | Premature: reads are global, writes are centralised (one poller). Read replicas on Postgres cover global latency for years                        | ❌ (revisit at scale) |


### Recommended: Postgres (Supabase) + Redis, Timescale extension when PBP storage lands

> **Status: decided and provisioned.** Supabase project created — ref `pzlvsljladbymdgtxger` (dashboard: [https://supabase.com/dashboard/project/pzlvsljladbymdgtxger](https://supabase.com/dashboard/project/pzlvsljladbymdgtxger)). Schema below lands there as the first migration (`supabase/migrations/` via the Supabase CLI, checked into the repo).

**Core schema (abridged):**

```sql
players        (id PK ← API id, tour, name, country, plays, current_rank, raw JSONB, synced_at)
tournaments    (id PK ← API id, name, tier, surface, location, start_date, end_date, raw JSONB)
fixtures       (id PK ← API id, tournament_id FK, round_id, p1_id FK, p2_id FK,
                scheduled_utc timestamptz, status, seeds, UNIQUE(api_source, id))
match_results  (fixture_id PK/FK, winner_id, score_text, sets JSONB, duration, stats JSONB)
ranking_snapshots (player_id FK, tour, ranking_date, position, points,
                PRIMARY KEY(player_id, tour, ranking_date))   -- accumulates history the API
                                                              -- only shows per-date → sparklines
users          (id PK, email, apple_sub, tz TEXT 'Australia/Sydney', locale,
                quiet_hours_start, quiet_hours_end, brief_local_time TIME, plan)
favourites     (user_id FK, entity_type ENUM(player|tournament|match), entity_id,
                notif_prefs JSONB,           -- per-favourite overrides
                PRIMARY KEY(user_id, entity_type, entity_id))
devices        (id PK, user_id FK, platform, push_token, live_activity_token, tz_at_register)
notifications  (id PK, user_id FK, fixture_id FK, kind ENUM(scheduled|starting|started|set|result|brief),
                send_after_utc timestamptz, sent_at, channel ENUM(push|email),
                dedupe_key UNIQUE)           -- idempotency: never double-fire
point_events   (fixture_id, seq, ts, payload JSONB)  -- Timescale hypertable, partitioned by week
```

**Why ranking_snapshots matters commercially:** the API serves rankings *by date*; by archiving weekly snapshots from day one we accumulate a proprietary ranking-history dataset that powers sparklines, "career-high" callouts, and race projections — an asset that grows with time and that a copycat starting later can't backfill.

**Redis usage:** `live:{fixture_id}` hash (current score state, 60s TTL refresh), pub/sub for fan-out, BullMQ for notification jobs, rate-limit counters, hot-page cache (rankings, live list).

---

## 7. Notification & email pipeline (time-zone aware)

The hardest — and most defensible — feature. Tennis scheduling is uniquely chaotic: order-of-play published the prior evening, "not before" times, rain delays, matches moved courts. A naive "schedule a push at fixture time" design fails weekly. Two-stage design:

### Stage 1 — Scheduled intents (calendar-driven)

Nightly per-tournament sync (`getDateFixtures` for D+1/D+2) upserts fixtures. For every (favourite, fixture) pair, the scheduler materialises *intents* in the `notifications` table, all computed in UTC but **derived from the user's IANA tz** (`Australia/Sydney`, never a fixed offset — DST safe):

- `match_scheduled` — "Djokovic plays Lehecka tomorrow ~4:10am your time" (sent at a civil hour in user tz, e.g. 6pm the evening before; respects quiet hours)
- `starting_soon` — T-30min (user-configurable: 1h/30m/10m)
- If `scheduled_utc` changes on a later sync (rain delay, OOP reshuffle) → intents are recomputed and, if material (>30min shift), a `time_changed` notice fires: "Moved to ~6:30pm your time due to rain."

### Stage 2 — Live truth (event-driven)

The ingestion diff engine emits ground-truth events that override the calendar:

- `match.started` → "🎾 Alcaraz is ON COURT now" + **starts the iOS Live Activity** (lock-screen score, no app-open needed)
- `set.completed` → opt-in set-score pushes
- `match.ended` → result push with score + H2H nugget; ends Live Activity
- A `starting_soon` intent whose match *already started* is cancelled by dedupe key — never notify about the past.

### Quiet hours & the Wake-up Brief

Per-user quiet hours (default 23:00–07:00 local). Anything suppressed overnight is *not dropped* — it rolls into the **Wake-up Brief**, assembled at send time (not queued ahead) at the user's chosen local morning time: results while you slept, today's favourite matches with local times, one storyline (interesting H2H). Push (premium: with score card image) + email (React Email — Caslon masthead on tennis-whites ground, results set as miniature scoreboard plaques, one gilt rule; it should read like the morning paper from the club). The brief is assembled fresh so a 5am retirement still makes a 7am brief.

### Delivery rules

- Idempotency via `dedupe_key` (`{user}:{fixture}:{kind}`); at-least-once queue (BullMQ) + dedupe = effectively exactly-once.
- Device tz change detected on app open → prompt: "You're in Paris! Show times in CEST?" (travel mode keeps home-tz overlay — fans at Slams love this).
- Channel preference per kind: push, email, both, off — per favourite override (superfan a player, mute another's set scores).
- Email throttle: max 1 digest + 2 event emails/day on free tier (deliverability protection).

---

## 8. API cost engineering

RapidAPI plans are quota-priced; the poller is our entire variable API cost. Because clients never call the API, **cost scales with tour activity, not users.**


| Job                             | Cadence                                                  | Calls/day (est.)                       |
| ------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| Live events list                | 15s during play windows (~18h/day in season)             | ~4,300                                 |
| Live match detail               | 20s × only matches with ≥1 favourite-watcher or featured | ~3,000–8,000                           |
| Fixtures D0–D2, per active tour | every 15 min                                             | ~600                                   |
| Rankings                        | weekly (Mondays) + daily race check                      | ~20                                    |
| Player/tournament back-fill     | on first-favourite + weekly refresh                      | ~500                                   |
| **Total**                       |                                                          | **~10–15k calls/day** ≈ 300–450k/month |


Tactics: adaptive cadence (30s early sets → 10s at set point/deciders/tiebreaks — the diff engine knows the score), sleep the poller when zero live events, tier match-detail polling by watcher count, archive every raw payload (JSONB) so historical features never re-call the API. Negotiate a direct/enterprise contract with the provider once we exceed RapidAPI's top public tier; abstract the provider behind a `TennisDataPort` interface so a second source (or a future official-data deal) is a swap, not a rewrite — this also de-risks provider failure (§13).

---

## 9. Commercial model

### 9.1 Revenue ladder

**Tier 0 — Free (acquisition)**
Live scores, rankings, 2 favourite players, result notifications only, Wake-up Brief (email, weekly), tasteful house ads/sponsorship slots. The free tier must be genuinely good — it feeds SEO, app-store ranking, and word of mouth.

**Tier 1 — Baseline Plus, A$6.99/mo or A$54.99/yr (core monetisation)**
Unlimited favourites; full notification suite (scheduled/starting/started/set-by-set, per-favourite control); daily Wake-up Brief; Live Activities + widgets; ad-free; H2H storyline cards; ranking sparklines & race projections; travel mode.

**Tier 2 — Baseline Pro, A$14.99/mo (superfans, coaches, punters)**
Point-by-point archive & momentum analytics; surface/form deep stats; odds display with line-movement history (geo-gated); CSV export; early access features. Pro exists to anchor Plus pricing and capture the long tail of high-willingness users.

**B2B (year 2+)**

- **White-label/API**: clubs, federations, tennis media buying our cleaned, cached data layer + components (we've built the hard ingestion/notification infra they all need).
- **Sponsorship**: surface-themed seasonal sponsorships ("Clay season presented by …") native to the design system rather than banner clutter.
- **Affiliate (jurisdiction-dependent)**: odds-comparison referral fees where legal (UK/AU licensing regimes differ; geo-gate hard, exclude under-25 targeting in AU, comply with NSW/ACMA gambling-ad rules). Treated as upside, *never* load-bearing revenue, and excluded entirely from the App Store build if Apple guidelines or local law make it marginal.

### 9.2 Funnel & growth mechanics

- **SEO surface**: pre-rendered player/H2H/tournament pages ("Sinner vs Alcaraz head to head") — evergreen, high-intent queries; static HTML snapshots regenerated nightly from our DB, structured data (schema.org SportsEvent) for rich results.
- **Slam spikes**: AO/RG/Wimbledon/USO quadruple traffic; pre-built "Slam mode" onboarding (pick favourites from the draw bracket) converts spike traffic to favourites — and a favourite with an alert set is the activation metric.
- **Shareable artefacts**: result cards and "my year in tennis" (Wrapped-style, December) rendered in the brand system — organic distribution.
- **Referral**: give-a-month/get-a-month of Plus.
- **Paywall moments** (PostHog-instrumented): 3rd favourite attempt, set-score notification toggle, Live Activity prompt during a followed match.

### 9.3 Scale economics

Costs are step-functions, not linear: API (~~flat per §8), infra (~~A$300/mo MVP → ~~A$2-4k/mo at 100k MAU mostly egress/websockets/Redis), email (~~A$0.001/send). At 100k MAU / 4% paid / A$5 ARPU-paid-month ≈ **A$20k MRR** against <A$8k/mo total run cost — gross margin >60% before payroll, improving with annual-plan mix. Break-even on infra at roughly 2,500 Plus subscribers.

---

## 10. Delivery roadmap

**Phase 0 — Foundations (wks 1–3)**
Monorepo, CI/CD (GitHub Actions → Fly/Vercel/EAS), Supabase project (✅ created: `pzlvsljladbymdgtxger`) — first migration of the §6 schema via Supabase CLI, Redis provisioning, ingestion poller + diff engine against live API, raw-payload archiving begins (data asset accrues from day 1), Figma token & component library.

**Phase 1 — Web MVP (wks 4–9)**
Vite/React SPA: live hub + match centre (WS-driven), rankings, player pages, search, Supabase auth, favourites, email notifications (scheduled/result) + Wake-up Brief, PWA install, pre-render job for SEO pages. *Ship publicly at wk 9 — web first because iteration is faster and SEO starts compounding.*

**Phase 2 — iOS (wks 8–16, overlapping)**
Expo app on shared packages; APNs pipeline; full notification suite; Live Activities + widget (the App Store review showpiece); TestFlight beta wk 13; App Store launch wk 16 — **timed to land ≥6 weeks before the Australian Open** for the acquisition spike.

**Phase 3 — Monetise & deepen (wks 17–26)**
RevenueCat paywall (Plus), PostHog A/B on paywall moments, set-by-set + Live Activity polish, H2H storylines, ranking sparklines, travel mode, Slam mode for AO.

**Phase 4 — Scale (months 7–12)**
Pro tier, Android (Expo build + FCM), read replicas/edge cache for EU+US latency, B2B data-layer pilot with one club/federation, Wrapped campaign, direct API contract renegotiation.

---

## 11. Team, costs & unit economics

**Build team (lean):** 1 full-stack TS lead (poller/notifications — the crux), 1 product engineer (web+RN, shared packages), 1 product designer (50%, heavy in P0–P2), founder/PM. Add 1 backend engineer in Phase 4.

**Run-rate (pre-payroll):** RapidAPI tier ~~A$200–750/mo (usage-tiered) · Fly/Railway + Supabase + Upstash ~A$250–600/mo · Vercel ~A$50–300/mo · Resend ~A$50–200/mo · Sentry/PostHog free→~~A$200/mo · Apple dev A$149/yr. **Total ≈ A$600/mo (MVP) → A$2–4k/mo (100k MAU).**

---

## 12. KPIs


| Stage               | Metric                                   | Target                                                              |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| Activation          | Signup → ≥1 favourite + ≥1 alert enabled | >55%                                                                |
| Engagement          | DAU/MAU in-season                        | >30% (notification-led re-entry)                                    |
| Notification health | Push opt-out rate                        | <8% (granularity controls are the defence)                          |
| Retention           | M1 retention, notified users vs not      | 2× lift validates the moat thesis                                   |
| Revenue             | Free→Plus conversion at 6mo              | 3–5%                                                                |
| Brief               | Wake-up Brief open rate                  | >45% (it's personal, it should crush generic newsletter benchmarks) |
| Cost                | API calls per DAU                        | trends **down** as users grow (proves §8 decoupling)                |


---

## 13. Risks & mitigations


| Risk                                                             | Severity | Mitigation                                                                                                                                                                     |
| ---------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Single data-provider dependency** (pricing, quality, shutdown) | High     | `TennisDataPort` abstraction; raw-payload archive (rebuild from our own history); evaluate second source (Sportradar/official feeds) before Phase 4; direct contract at scale. |
| Poll latency vs broadcast (~10–30s behind TV)                    | Medium   | Set expectation in UI ("updated 12s ago"); adaptive cadence at climax points; users following from another tz are rarely co-watching live TV.                                  |
| Notification fatigue → opt-outs kill the moat                    | High     | Per-favourite granularity, quiet hours, digest rollup defaults; monitor opt-out per kind in PostHog; default to fewer, better pushes.                                          |
| Apple review (Live Activities for sports scores, odds content)   | Medium   | Live sports scores are an Apple-sanctioned Live Activity use case; ship odds display web-only/geo-gated initially; no betting transactions ever in-app.                        |
| Gambling-content regulation (esp. AU)                            | Medium   | Odds behind geo + age gate, off by default, excluded from AU push/email marketing; affiliate treated as optional upside.                                                       |
| Slam-spike load (10–20× websocket fan-out)                       | Medium   | Managed realtime (Ably) early = elastic; load-test before AO; static-cache fallbacks (15s SSE polling) degrade gracefully.                                                     |
| Big incumbents copy the player-first model                       | Medium   | They're structurally all-sports or single-tour; our moats: cross-tour player following, tz-native UX, accumulated ranking/PBP archive, AU beachhead brand.                     |
| Order-of-play chaos breaks trust ("it said 4am, it was 7am")     | High     | Two-stage notification design (§7) is built for this; always communicate *change*, never silently re-time; "~" prefix on provisional times in all copy.                        |


---

## Appendix A — Feature → endpoint map


| Feature               | Endpoints                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live hub              | `Get Live Events` (list) → `Get Live Match Data`, `Get Match Timeline Data`, `Get PBP Stat` (detail)                                                |
| My Matches feed       | `getPlayerFixtures` per favourite + live-state join in Redis                                                                                        |
| Notifications         | `getDateFixtures`/`getDateRangeFixtures` (intents) + diff-engine events (truth)                                                                     |
| Rankings + history    | `singlesRanking`, `doublesRanking` (+ our `ranking_snapshots` archive)                                                                              |
| Player page           | `getPlayerInfo`, `getPlayerPastMatches`, `getPlayerSurfaceSummary`, `getPlayerTitles`, `getPlayerPerformanceBreakdown`, `getPlayerTournamentRecord` |
| H2H tool & storylines | `getH2HInfo`, `getH2HStats`, `getH2HMatches`, `getPlayerInterestingH2H`                                                                             |
| Tournament pages      | `getTournamentCalendar`, `getTournamentFixtures`, `getTournamentResults`, `getTournamentPastChampions`                                              |
| Onboarding search     | `search`, `countryList`                                                                                                                             |
| Pro odds module       | `Get Best Odds Only`, `Get Odds By Market Name`, `Get Latest All Odds`                                                                              |


## Appendix B — Open questions for next session

1. Confirm RapidAPI plan tier & hard quota → finalise poll cadences in §8.
2. WTA player IDs share the same `type` path param pattern — verify `wta` coverage depth (ITF women confirmed present in live feed).
3. Brand name check: "Baseline" trademark/domain search (baseline.tennis? getbaseline.app?).
4. Decide Supabase-bundled realtime vs Ably for Phase 1 (cost vs ops trade-off at AO spike).

