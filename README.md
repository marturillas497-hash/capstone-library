# Capstone Library

**Web-Based Capstone Studies with the Integration of Similarity Detection and AI Recommendation**

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Claude](https://img.shields.io/badge/AI-Claude%20Haiku%205.5-D97757)
![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)

A capstone system built for the Bachelor of Science in Information Systems (BSIS) program at **Makilala Institute of Science and Technology (MIST)**. Students get a searchable digital catalog of completed capstone studies and a semantic similarity checker, so a proposed topic can be tested against the institution's own library before formal advising, without a trip to the physical library.

**Live:** https://capstone-library-nine.vercel.app

> Internal and academic use. Not affiliated with or licensed for use outside MIST's BSIS program.

---

## Contents

- [What it does](#what-it-does)
- [How a scan works](#how-a-scan-works)
- [Risk levels](#risk-levels)
- [Features by role](#features-by-role)
- [Tech stack](#tech-stack)
- [Architecture decisions](#architecture-decisions)
- [Getting started](#getting-started)
- [Database](#database)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Roles and routing](#roles-and-routing)
- [API routes](#api-routes)
- [Rate limit and AI cost](#rate-limit-and-ai-cost)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)
- [Authors](#authors)

---

## What it does

- **Digital catalog** of completed BSIS capstone studies (title, authors, year, accession ID, abstract, keywords). Searchable by keyword, filterable by year and tag, with semantic search for longer queries.
- **Semantic similarity detection.** A proposed title and abstract are turned into a 384-dimension embedding in the browser and compared against the library with cosine similarity (pgvector). It matches meaning, not keywords.
- **AI advisory feedback** (Claude Haiku 5.5): a verdict, a critical analysis of the overlap, three alternative titles, and three alternative research directions, grounded only in MIST's own capstone records. If the AI call fails or times out, a structured fallback advisory is saved instead, so a scan never fails because of the AI provider.
- **Three roles**, each with its own portal: Student, Capstone Adviser, and Admin (the librarian).

This is a similarity and recommendation tool, **not** a plagiarism checker. It compares conceptual closeness of topics, not manuscript text, and it only compares against MIST's own BSIS library. A low score does not guarantee that no similar study exists elsewhere.

## How a scan works

```
Student types title + abstract
        |
        v
Browser: Xenova/all-MiniLM-L6-v2 (WebAssembly) -> 384-dim embedding
        |
        v   POST /api/analyze  (embedding + text)
Server: session + role check, daily limit check (5/day, Manila time)
        |
        v
pgvector: match_abstracts() -> top 5 matches by cosine similarity
        |
        v
Risk level from the top score (GREEN / YELLOW / ORANGE / RED)
        |
        v
Claude Haiku 5.5 gets the top matches (filtered) and writes the advisory
   on any failure or timeout -> structured fallback advisory
        |
        v
Report saved to similarity_reports -> user redirected to the report page
```

Details worth knowing:

- All 5 matches are saved and shown on the report page, but the AI only receives a filtered subset. GREEN reports send the top 2. Other bands send the top match plus any other match that is not GREEN on its own score. Weak matches invite the model to invent overlap.
- Each matched abstract is trimmed to 600 characters before it goes to the model.
- The AI call has a 34 second budget so the whole request stays under the 45 second client timeout. There are no retries.
- Thinking is switched off for the Claude call. Thinking tokens count against `max_tokens` and can leave the response empty.

## Risk levels

The risk level comes from the **top** cosine similarity score. The boundaries live in one place, `lib/risk.js`.

| Cosine score | Level | Label | What the user sees |
|---|---|---|---|
| 0.85 and above | RED | Critical Similarity | Strong overlap, major refinement suggestions |
| 0.70 to 0.84 | ORANGE | High Relevance | Related studies shown, a specific pivot suggested |
| 0.50 to 0.69 | YELLOW | Moderate Relevance | Shared themes, one clear change recommended |
| Below 0.50 | GREEN | Low Similarity | Topic reads as distinct from the catalog |

These thresholds were set for `all-MiniLM-L6-v2` and checked against this catalog. There is no universal cutoff across embedding models.

## Features by role

**Student**
- Register against the registrar's whitelist and confirm identity in an "Is this you?" step (the name is masked). A welcome email is sent when registration completes.
- Browse and search the library, open abstracts, run up to 5 similarity scans per day.
- View scan history and the full structured advisory for each report.
- Assign or change a capstone adviser, edit year level and section, change password.

**Capstone Adviser**
- Everything a student can do on the library and scanning side.
- See assigned students, their scan counts and latest risk, and each student's report history.
- Registration starts as pending. An email is sent when the admin approves or rejects the application.

**Admin**
- Manage the library: add and edit abstracts and keywords (no delete).
- Approve or reject adviser registrations, with email notification.
- Manage the student whitelist by CSV upload (with a classified preview) or one at a time.
- Search, suspend, unsuspend, and reset the password of any student or adviser account.
- Dashboard with stat cards, risk and account-status donut charts, trending abstracts, and recently added studies.
- Analytics: most viewed, trending this week, and view history.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Styling | Tailwind CSS 3, neomorphic design system |
| Icons | lucide-react |
| Database | Supabase (PostgreSQL) with pgvector |
| Auth | Supabase Auth |
| Embeddings | `@xenova/transformers`, `Xenova/all-MiniLM-L6-v2`, run client-side via WebAssembly |
| Vector search | Direct `pg` connection through Supabase's Transaction Pooler |
| AI advisory | Anthropic Claude Haiku 5.5 over plain `fetch` (no SDK) |
| Email | Nodemailer with Gmail SMTP |
| Hosting | Vercel |

## Architecture decisions

- **Embeddings run in the browser.** Vercel's serverless functions do not reliably run a WebAssembly ML model. The model loads once per session (3 to 8 seconds the first time, instant after) and only the resulting vector goes to the server.
- **Vector search bypasses the Supabase JS client.** PostgREST cannot convert a JS array into pgvector's `vector` type, so `/api/analyze` and `/api/library/search` query Postgres directly with `pg`. `next.config.mjs` lists `pg` under `serverExternalPackages` for this reason.
- **No ANN index on the embedding column.** With a small library, a sequential scan is faster and more exact than `ivfflat`. Revisit only if the library grows into the hundreds of rows.
- **Emails send after the response.** Register and approval routes use Next.js `after()`, so users never wait on SMTP and a mail failure can never undo a saved account or decision.
- **No middleware on `/api`.** Middleware redirects to `/login`, which is the wrong failure for `fetch` clients. Every API route checks the session and role itself, and must never trust the `x-user-*` headers that middleware sets for pages.
- **Defense in depth.** Route protection in `middleware.js` plus Row Level Security on every table, so a failure in one layer is caught by the other.
- **Single sources of truth.** Risk thresholds and colors in `lib/risk.js`, advisory parsing in `lib/advisory.js`, the AI call in `lib/claude.js`, all email in `lib/email.js`, shared dropdown values in `lib/constants.js`.

## Getting started

### Prerequisites

- Node.js 18.18 or newer (LTS recommended)
- A Supabase project with the `vector` extension enabled
- An Anthropic API key
- A Gmail account with an App Password (optional, for emails)

### Install

```bash
git clone https://github.com/marturillas497-hash/capstone-library.git
cd capstone-library
npm install
```

### Environment variables

Copy `env.local.sample.txt` to `.env.local` and fill it in:

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes | Admin client for registration, reports, admin routes |
| `SUPABASE_TRANSACTION_POOLER_URL` | Server only | Yes | `pg` connection for vector search and aggregates |
| `ANTHROPIC_API_KEY` | Server only | Yes | Claude advisory. Missing key means the fallback advisory is used |
| `ANTHROPIC_MODEL` | Server only | No | Defaults to `claude-haiku-5-5` |
| `GMAIL_USER` | Server only | No | Sender address for emails |
| `GMAIL_APP_PASSWORD` | Server only | No | Gmail App Password. Without Gmail vars, emails are skipped, not failed |
| `NEXT_PUBLIC_APP_URL` | Public | Yes | Base URL used for login links inside emails |

Never prefix a server-only variable with `NEXT_PUBLIC_`, and never commit `.env*` files (they are gitignored).

### Run locally

```bash
npm run dev      # development server on http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

The first scan after page load is slower while the embedding model downloads and initializes.

## Database

The app expects these tables in the `public` schema:

| Table | Purpose |
|---|---|
| `profiles` | Identity for every user (`role`: admin, capstone_adviser, student. `status`: active, pending, suspended, rejected) |
| `student_metadata` | Student-only fields: `id_number`, `adviser_id`, `year_level`, `section` |
| `abstracts` | The capstone library, including a `vector(384)` `embedding` column |
| `similarity_reports` | One row per scan, with the AI text and a JSONB snapshot of the matched abstracts |
| `abstract_views` | One row per abstract, student, and Manila calendar day |
| `student_whitelist` | Registrar-provided student IDs and names, used to gate registration |

Required database functions:

- `match_abstracts(query_embedding vector, match_threshold float, match_count int)` returns the closest abstracts by cosine similarity, including `similarity`.
- `get_my_role()` is `SECURITY DEFINER` and returns the caller's role for use in RLS policies.

Row Level Security is enabled on every table.

**Create the admin account manually.** It is not created through `/register`:

1. Create the user in Supabase Auth (email and password).
2. Insert one row into `profiles` with that user's UID, `role = 'admin'`, `status = 'active'`. No `student_metadata` row, and `terms_accepted_at` stays `NULL`.

> The full schema, RLS policies, and indexes are documented in the internal PRD, which is kept outside this repo.

## Deployment

Deployed on Vercel, with every push to `main` producing a production build.

- Set `ANTHROPIC_API_KEY` in both the **Production** and **Preview** scopes. A missing key on Preview makes scans fall back to the canned advisory.
- Set `NEXT_PUBLIC_APP_URL` to the production URL, since it builds the links inside emails.
- Keep the function region close to the Supabase project (Singapore for a Sydney-hosted database).
- `/api/analyze` sets `maxDuration = 60`.
- The `dev` and `build` scripts have no bundler flag on purpose. Next.js 15 defaults to Webpack, which this project needs.

## Project structure

```
capstone-library/
├── app/
│   ├── admin/          Admin portal: dashboard, archive, approvals, analytics, whitelist, users
│   ├── adviser/        Adviser portal: assigned students, own scans, student reports
│   ├── api/            API routes (analyze, library search, auth, admin actions)
│   ├── dashboard/      Student portal
│   ├── library/        Shared catalog for all roles
│   ├── submit/         Similarity scan form (student and adviser)
│   ├── login/ register/ profile/
│   └── layout.js, globals.css
├── components/shared/  Navbar, PageHeader, StatCard, DonutChart, RankedBars, modals, TagInput, ...
├── lib/                db, risk, advisory, claude, email, constants, embedding, supabase clients
├── public/             Logos and login background
└── middleware.js       Role-based route protection
```

Files worth reading before touching anything nearby:

| File | Why |
|---|---|
| `lib/risk.js` | Only place risk thresholds, labels, and colors are defined |
| `lib/advisory.js` | Advisory parsing, fallback text, per-match risk |
| `lib/claude.js` | The one place the AI provider is called |
| `lib/email.js` | All outgoing email and the shared branded layout. Add new emails here |
| `lib/constants.js` | Year levels, sections, daily scan display value, whitelist limits |
| `lib/dashboardStats.js` | Server-side aggregates for dashboards |
| `components/shared/PageHeader.js` | Page header pattern (editorial, banner, stats, dense) |

## Roles and routing

| Role | Home | Route access |
|---|---|---|
| Student | `/dashboard` | `/dashboard`, `/library`, `/submit`, `/profile` |
| Capstone Adviser | `/adviser` | `/adviser`, `/library`, `/submit`, `/profile` |
| Admin | `/admin` | `/admin/*`, `/library` (browse and edit only, no scanning) |

## API routes

| Route | Who | Purpose |
|---|---|---|
| `/api/analyze` | Student, Adviser | Run a scan: vector search, risk level, AI advisory, save report |
| `/api/library/search` | All active roles | Semantic library search (threshold 0.3, up to 20 results) |
| `/api/abstracts/[id]/view` | Student | Record an abstract view |
| `/api/auth/register` | Public | Create a student or adviser account |
| `/api/auth/register/verify-id` | Public | Check a student ID against the whitelist, returns a masked name |
| `/api/admin/abstracts` | Admin | Create and edit library records |
| `/api/admin/approvals/[id]` | Admin | Approve or reject an adviser |
| `/api/admin/whitelist` and `/check` | Admin | Whitelist upload, preview classification, single add |
| `/api/admin/users/*` | Admin | List students and advisers, suspend, reset password |
| `/api/admin/stats` | Admin | Risk breakdown and account counts for dashboard charts |
| `/api/adviser/students` | Adviser | Assigned students |
| `/api/students/[id]/reports/adviser` | Student | Re-point a student's reports when their adviser changes |

Each route performs its own session and role check.

## Rate limit and AI cost

Users get **5 similarity scans per calendar day**, resetting at **12:00 AM Philippine Standard Time (UTC+8)**. The limit is enforced server-side in `/api/analyze`. It exists for cost control and abuse prevention.

At roughly 2,300 input and 750 output tokens per scan, one scan costs a fraction of a cent. Embeddings run in the browser and add no API cost. Confirm current pricing at platform.claude.com before quoting figures.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Report shows a generic advisory instead of tailored feedback | The AI call failed or timed out, or `ANTHROPIC_API_KEY` is missing in that environment (check the Preview scope too) |
| First scan or search takes several seconds | The embedding model is downloading and initializing in the browser. Later scans are fast |
| No emails arrive | `GMAIL_USER` or `GMAIL_APP_PASSWORD` is missing or wrong. Emails are skipped silently by design |
| Vector queries fail or hang | `SUPABASE_TRANSACTION_POOLER_URL` is wrong, or the `vector` extension or `match_abstracts` function is missing |
| Preview deployment behaves differently from production | Env vars are scoped per environment in Vercel. Set them for Preview as well |
| Cannot log in as admin | The admin must be created manually (see [Database](#database)) |

## Limitations

- Compares only against MIST's own BSIS capstone library. It cannot detect similar work done elsewhere.
- English-language topics only, since the embedding model was trained mainly on English text.
- Metadata only: no PDF or file upload, no manuscript-level plagiarism detection, no citation tools.
- Needs an internet connection and a browser that can run WebAssembly.
- The AI advisory supports, and does not replace, formal guidance from a capstone adviser.
- Built for the BSIS program and not directly reusable for other departments or institutions without changes.

## Authors

**Beah Mae F. Dahan** and **Ralph Nico D. Marturillas**
BSIS, College of Technology and Information Systems, Makilala Institute of Science and Technology

---

Built as a capstone requirement for the BSIS program at MIST, A.Y. 2025-2026. Not licensed for use outside this context.
