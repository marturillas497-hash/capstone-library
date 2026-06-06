# Capstone Library — Feature Status Breakdown

## DONE

### Auth and Registration (F1)
- [x] Student registration with whitelist validation
- [x] Student ID locked after account creation
- [x] Optional adviser selection at registration
- [x] Capstone adviser registration with pending status
- [x] Role-based redirect on login (student → /dashboard, adviser → /adviser, admin → /admin)
- [x] Middleware blocking unauthenticated access
- [x] Pending adviser blocked from accessing system before approval
- [x] Status messages for pending, rejected, registered states

### Similarity Detection (F3)
- [x] /submit form with title and abstract fields
- [x] Client-side Xenova embedding generation (title + abstract concatenated)
- [x] /api/analyze via direct pg connection to Transaction Pooler
- [x] match_abstracts pgvector cosine similarity search
- [x] Top 5 matched abstracts returned
- [x] Risk level calculation from top match score
- [x] Gemini 2.5 Flash AI advisory generation
- [x] Fallback advisory on Gemini API failure
- [x] Report saved to similarity_reports
- [x] Daily scan limit: 5 per user per calendar day, reset at 12:00 AM PHT
- [x] adviser_id auto-attached from student_metadata at scan time
- [x] Adviser scans saved with student_id = NULL

### Similarity Reports (F4) — Student side
- [x] /dashboard/report/[id] page with full report details
- [x] Risk level badge, similarity score, top 5 matches, AI advisory panel
- [x] Student can view all past reports from dashboard

### Student Dashboard (F4 partial)
- [x] /dashboard page fully implemented

### Student Profile (F11)
- [x] /profile page with editable year level, section, adviser
- [x] Read-only: full name, student ID, role, status
- [x] Retroactive adviser_id update on all existing reports when adviser changes

### Capstone Library Catalog (F2)
- [x] /library with abstract card grid
- [x] Hybrid search: instant keyword for 1-2 words, semantic vector search for 3+ words
- [x] Year filter
- [x] Abstract modal with full details and accession ID note
- [x] View tracking: silent POST to /api/abstracts/[id]/view on modal open
- [x] ON CONFLICT DO NOTHING on repeated modal opens
- [x] Admin Edit control inside modal
- [x] Admin can save edits and regenerate embedding from modal

### Admin Portal (F7, F8, F9, F10, F12)
- [x] /admin dashboard with 4 stat cards and quick action links
- [x] /admin/approvals: approve and reject pending adviser applications
- [x] Email notification on approval or rejection via Nodemailer Gmail SMTP
- [x] /admin/archive: add new abstracts with client-side embedding generation
- [x] /admin/archive/[id]: edit existing abstract, regenerate embedding
- [x] Abstract deletion permanently blocked (no policy, no endpoint, no UI)
- [x] /admin/whitelist: CSV upload with header validation, search by ID or name
- [x] /admin/analytics: total views, views this week, top 10 all time, top 5 trending, last 50 view history

### Shared Components
- [x] Navbar with hamburger mobile menu
- [x] AbstractModal (used by library and report pages)
- [x] EmbeddingProvider wrapping entire app

### Database
- [x] All 6 tables deployed (profiles, student_metadata, abstracts, similarity_reports, abstract_views, student_whitelist)
- [x] All RLS policies in place
- [x] match_abstracts and get_my_role functions created
- [x] Admin account manually bootstrapped

---

## PENDING (Chunk 5 — Adviser Portal)

### Adviser Portal (F6)
- [ ] /adviser page: list of explicitly assigned students with report count and latest scan activity
- [ ] /adviser/students/[id] page: student detail with full report history
- [ ] /adviser/students/[id]/report/[reportId] page: read-only view of a student's report
- [ ] /adviser/report/[id] page: adviser's own generated scan report view
- [ ] /api/adviser/students route: fetch students assigned to the authenticated adviser
- [ ] My Scans section: list of adviser's own generated reports

### Similarity Reports (F4) — Adviser side
- [ ] Adviser can view their own generated reports
- [ ] Adviser can view reports from explicitly assigned students (read-only)
- [ ] Reports from unassigned students are not visible

---

## PENDING (Chunk 6 — Final)

### Testing and Deployment
- [ ] End-to-end testing of all user flows
- [ ] Similarity threshold calibration with actual BSIS abstracts
- [ ] Gemini prompt refinement
- [ ] Mobile responsiveness checks at 375px minimum width
- [ ] MIST logo added to /public/mist-logo.png and referenced in Navbar
- [ ] GMAIL_USER and GMAIL_APP_PASSWORD added to .env.local
- [ ] GitHub repository initialized and pushed
- [ ] Vercel deployment