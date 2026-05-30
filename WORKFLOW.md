# WORKFLOW.md — InnDesk Session Discipline Guide
> This file is for YOU, the developer — not for Claude.
> It describes how to pilot Claude effectively across multiple sessions
> to prevent the drift that kills LLM-assisted projects.

---

## The Core Problem

Claude is not a compiler. It is a probabilistic system that:
- Reads recent context more strongly than old context
- Treats code it has already generated as "canonical" — and reproduces its patterns
- Drifts gradually across sessions, even with a perfect CLAUDE.md
- Performs best on small, bounded tasks with clear inputs and outputs

A good CLAUDE.md solves session 1.
Your discipline as a developer solves sessions 2 through 15.

---

## The Golden Rules

**1. One task per session**
Never ask Claude to do two things at once.
"Generate the reservation service AND the front-end planning grid" = disaster.

**2. Freeze what works**
When a module works correctly: mark it frozen. Never ask Claude to touch it again
unless a bug is discovered. Claude will "improve" working code and break it.

**3. Small surface, explicit scope**
Every prompt must state:
- What file(s) to create or modify
- What file(s) to NOT touch
- What the input is and what the output should be

**4. You read every line before moving on**
Not to understand every detail — but to catch:
- Code that duplicates something that already exists
- Functions that are split so small they are meaningless
- Patterns that conflict with what was generated before

**5. Context reset between modules**
Start a new Claude conversation for each isolated module.
Carrying too much context from a previous session pollutes the generation.

---

## Session Structure

### Before each session

Answer these 3 questions before opening Claude:

1. **What is the single deliverable of this session?**
   (one route, one service function, one JS page, one component)

2. **Which files does this session touch?**
   List them explicitly. Any file not on the list must not be modified.

3. **What already works and must not change?**
   Briefly state what is frozen so Claude does not "help" by refactoring it.

### The session prompt template

Use this structure every time. Do not skip sections.

```
Read CLAUDE.md completely before starting.

TASK:
[Single sentence describing what to build]

FILES TO CREATE OR MODIFY:
- backend/services/reservation_service.py
- backend/api/v1/reservations.py

FILES TO NOT TOUCH:
- Everything else, especially: auth.py, models/, core/

INPUTS:
[Describe what data comes in — schemas, parameters, dependencies]

EXPECTED OUTPUT:
[Describe what the endpoint/function returns on success and on error]

CONSTRAINTS FOR THIS TASK:
[Any task-specific rules beyond CLAUDE.md — e.g. "use the atomic pattern from Section 6"]

WHAT ALREADY EXISTS AND WORKS (do not rewrite):
[List what is frozen]
```

### After each session

Before closing Claude and before starting the next session:

**Review checklist (5-10 minutes max):**
```
□ Read every function signature — does it match what CLAUDE.md specifies?
□ Check for any SELECT * or naked fetch() calls — remove them
□ Check for duplicated logic — does this file do something another file already does?
□ Check comments — are they explaining WHY (good) or WHAT (remove them)?
□ Run the app — does it start without errors?
□ If it touches the DB — does seed.py still run cleanly?
```

**Freeze decision:**
If the module works after your review: write it in the Freeze Log below.
A frozen module is off-limits unless you explicitly unfreeze it.

---

## Phase Plan

### Phase 1 — Core backend (Days 1-7)

Work in this order. Complete and freeze each before moving to the next.

| Session | Task | Files touched | Freeze after? |
|---|---|---|---|
| 1 | PostgreSQL setup + all 6 SQLAlchemy models + create_all + schema.sql dump | `main.py`, `core/database.py`, `models/*` | ✓ models |
| 2 | Pydantic schemas (all 6 files) | `schemas/*` | ✓ schemas |
| 3 | core/security.py — JWT + bcrypt + get_current_user + require_admin | `core/security.py` | ✓ security |
| 4 | Auth endpoints — login, register, me | `api/v1/auth.py` | ✓ auth routes |
| 5 | Rooms CRUD endpoints | `api/v1/rooms.py` | ✓ rooms routes |
| 6 | Clients CRUD endpoints with GDPR enforcement | `api/v1/clients.py` | ✓ clients routes |
| 7 | reservation_service.py — overlap check + atomic create + state transitions | `services/reservation_service.py` | ✓ reservation service |
| 8 | Reservation endpoints + billing_service + housekeeping_service | `api/v1/reservations.py`, `services/billing_service.py`, `services/housekeeping_service.py` | ✓ all services |
| 9 | Dashboard + housekeeping endpoints | `api/v1/dashboard.py`, `api/v1/housekeeping.py`, `api/v1/invoices.py` | ✓ remaining routes |
| 10 | seed.py + 5 pytest tests | `seed.py`, `tests/*` | ✓ seed, tests |

**Milestone check after session 10:**
Run `python backend/seed.py` → no errors.
Run `pytest backend/tests/` → 5/5 pass.
Hit Swagger at `http://localhost:8000/docs` → all endpoints visible.
If all good: backend is frozen. Move to Phase 2.

---

### Phase 2 — Frontend (Days 8-18)

Work page by page. Each page is one session.

| Session | Task | Freeze after? |
|---|---|---|
| 11 | `base.css` + `components.css` + `layout.css` design tokens and shared styles | ✓ base CSS |
| 12 | `api.js` + `auth.js` + `utils.js` | ✓ JS utilities |
| 13 | `index.html` — login page, form, error handling, redirect on success | ✓ login |
| 14 | `dashboard.html` + `dashboard.js` | ✓ dashboard |
| 15 | `clients.html` + `clients.js` — list, create modal, GDPR checkbox | ✓ clients |
| 16 | `reservations.html` + `reservations.js` — list, create modal, status badges | ✓ reservations |
| 17 | `planning.html` + `planning.js` — 14-day custom grid | ✓ planning |
| 18 | `housekeeping.html` + `invoices.html` + their JS files | ✓ housekeeping, invoices |
| 19 | Responsive pass — mobile layout for all pages | review only |
| 20 | Accessibility pass — labels, aria, focus, contrast | review only |

**Milestone check after session 20:**
Walk through all 9 "Definition of Done" scenarios in CLAUDE.md without errors.
If all 9 pass: frontend is frozen. Move to Phase 3.

---

### Phase 3 — Dossier + Docker + Oral prep (Days 19-23)

| Session | Task |
|---|---|
| 21 | Docker — `docker-compose.yml` + `Dockerfile`. Test `docker-compose up`. |
| 22 | `README.md` in English — full setup + deployment procedure |
| 23 | Final review pass — remove console.log, verify response_model everywhere |

Dossier writing is done in parallel throughout phases 1 and 2 — not all at the end.
See the Dossier Writing Schedule below.

---

## Dossier Writing Schedule

Write in parallel with development. Do not leave this for the last 2 days.

| When | Write |
|---|---|
| After session 1 (models done) | Section: Schéma BDD with ERD diagram |
| After session 3 (auth done) | Section: Architecture technique + stack choices |
| After session 7 (reservation service) | Section: Logique métier — extrait reservation_service.py + explication |
| After session 10 (backend frozen) | Section: Sécurité (JWT, bcrypt, OWASP), RGPD, tests |
| After session 17 (planning done) | Section: Maquettes vs résultat final, captures d'écran |
| After session 20 (frontend frozen) | Section: Accessibilité RGAA, éco-conception |
| After session 21 (Docker done) | Section: Procédure de déploiement |
| Days 22-23 | Relecture complète, pagination, mise en page, introduction, conclusion |

**Target: 30-32 pages hors annexes.** Annexes can include full code extracts (up to 30 pages).

---

## Freeze Log

Fill this in as you progress. A frozen module is off-limits.

```
Module                              | Frozen on | Notes
------------------------------------|-----------|---------------------------
models/*                            |           |
schemas/*                           |           |
core/security.py                    |           |
api/v1/auth.py                      |           |
api/v1/rooms.py                     |           |
api/v1/clients.py                   |           |
services/reservation_service.py     |           |
services/billing_service.py         |           |
services/housekeeping_service.py    |           |
api/v1/reservations.py              |           |
api/v1/dashboard.py                 |           |
api/v1/housekeeping.py              |           |
api/v1/invoices.py                  |           |
seed.py                             |           |
tests/*                             |           |
css/base.css                        |           |
css/components.css                  |           |
api.js                              |           |
auth.js                             |           |
utils.js                            |           |
frontend/index.html                 |           |
frontend/dashboard.html             |           |
frontend/clients.html               |           |
frontend/reservations.html          |           |
frontend/planning.html              |           |
frontend/housekeeping.html          |           |
frontend/invoices.html              |           |
```

---

## Red Flags — Stop and Fix Before Continuing

If you see any of these during your post-session review, fix them
before starting the next session. Carrying a bad pattern forward compounds fast.

```
⛔ A fetch() call outside api.js
⛔ A SELECT * anywhere in SQLAlchemy code
⛔ An async def route function
⛔ A commit() without a matching rollback in the except block
⛔ The same validation logic appearing in both the route and the service
⛔ A file that is > 200 lines and does two different things
⛔ A response that returns password_hash or id_document in a list endpoint
⛔ A label missing on a form input
⛔ outline: none in CSS without :focus-visible replacement
⛔ datetime.utcnow() instead of datetime.now(timezone.utc)
```

---

## Preparing for the Oral

The examiner has 40 minutes for the technical interview.
They will pick 4-5 points from your dossier and ask you to explain them in detail.

**The 5 things you must be able to explain without hesitation:**

1. **The overlap algorithm** (reservation_service.py)
   "Two reservations conflict when existing.check_in < new.check_out
   AND existing.check_out > new.check_in. This covers all cases."

2. **Why the transaction is atomic** (create_reservation)
   "Reservation and invoice are created in the same db.commit().
   If anything fails, db.rollback() ensures we have neither or both — never a
   reservation without an invoice."

3. **How JWT authentication works**
   "The backend signs a token with a secret key. The token contains the user's
   email, id, and role. Every protected route decodes it with the same secret.
   If invalid or expired, it returns 401."

4. **Why sync SQLAlchemy with async FastAPI**
   "FastAPI runs sync functions in a thread pool — no blocking issue.
   Sync transactions are simpler to reason about: explicit commit/rollback,
   no event loops. Sufficient for a hotel with tens of users."

5. **The room status state machine**
   "check-in → occupied. check-out → dirty.
   Staff marks clean → available. Admin → maintenance.
   Room and reservation status are separate values, synchronized in the same
   transaction at check-in and check-out."

---

## Quick Reference — Most Common Mistakes

| Mistake | What Claude does | What to watch for |
|---|---|---|
| God object | api.js becomes 500+ lines | Check line count after session 12 |
| Over-splitting | Functions with 2 lines | Look for functions with no real logic |
| Defensive bloat | `if not x: raise` when x is guaranteed | Remove redundant guards |
| Pattern drift | New session introduces a new naming style | Check names match existing files |
| Silent refactor | Claude "cleans up" a frozen file | Always check git diff |
| Comment spam | Every line has a comment | Remove comments that restate the code |
