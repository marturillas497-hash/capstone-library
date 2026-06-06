# Chunk 4 Test Checklist

## Prerequisites
- Dev server running: `npm run dev`
- Admin account exists in Supabase
- At least one entry in `student_whitelist`
- At least one student account registered and logged in for view tracking tests

---

## Admin Dashboard (`/admin`)

- [ ] Log in as admin, confirm redirect to `/admin`
- [ ] All 4 stat cards load without error (students, abstracts, pending advisers, total reports)
- [ ] Pending adviser card shows amber highlight when count > 0
- [ ] All 5 quick action links navigate to the correct pages
- [ ] No console errors on load

---

## Admin Archive — Add Abstract (`/admin/archive`)

- [ ] Page loads, embedding model status message appears if model is still loading
- [ ] Last accession ID hint displays if at least one abstract exists
- [ ] Submitting with empty title or abstract text shows validation error
- [ ] Submitting with all fields filled: success message appears, form resets, recently added list updates
- [ ] Submitting a duplicate title returns a conflict error message
- [ ] Submitting a duplicate accession ID returns a conflict error message
- [ ] Recently added list shows up to 5 entries with Edit links

---

## Admin Archive — Edit Abstract (`/admin/archive/[id]`)

- [ ] Clicking Edit on a recently added entry navigates to the edit page
- [ ] All existing fields are pre-filled correctly
- [ ] Saving with valid data shows success message
- [ ] Saving with a duplicate title or accession ID shows conflict error
- [ ] No delete button or delete option exists anywhere on the page
- [ ] Back to Archive link works

---

## Admin Approvals (`/admin/approvals`)

- [ ] Page loads the list of pending adviser accounts
- [ ] Empty state shows correctly when no pending applications exist
- [ ] Clicking Approve updates the adviser status to active, removes them from the list, shows success toast
- [ ] Clicking Reject updates the adviser status to rejected, removes them from the list, shows toast
- [ ] Approved adviser can now log in and reach `/adviser`
- [ ] Rejected adviser sees error message on login attempt
- [ ] Email is sent on approval and rejection (requires GMAIL_USER and GMAIL_APP_PASSWORD in .env.local)

---

## Admin Whitelist (`/admin/whitelist`)

- [ ] Page loads existing whitelist entries
- [ ] Search by student ID filters results correctly
- [ ] Search by name filters results correctly
- [ ] Uploading a valid CSV with `id_number` and `full_name` columns succeeds, count shown in success message
- [ ] Uploading a CSV missing the header row shows: "Upload rejected. The CSV file must include a header row with columns: id_number, full_name."
- [ ] Uploading a CSV with a duplicate ID updates the existing record rather than erroring
- [ ] Uploading an empty CSV shows an appropriate error

---

## Admin Analytics (`/admin/analytics`)

- [ ] Page loads without error
- [ ] Total views and views this week stats display correctly
- [ ] Top 10 most viewed list renders (or shows empty state if no views yet)
- [ ] Top 5 trending this week list renders (or shows empty state)
- [ ] View history table shows up to 50 entries with student name, ID, abstract title, and timestamp
- [ ] Empty state renders cleanly when no view data exists

---

## Library (`/library`)

- [ ] Page loads and displays all abstracts in a card grid
- [ ] Each card shows title, authors, accession ID, year, and abstract preview
- [ ] Clicking a card opens the abstract modal with full details
- [ ] Modal shows the accession ID note about requesting the physical document
- [ ] Closing the modal works
- [ ] 1 or 2 word search filters results instantly (client-side, no submit needed)
- [ ] 3+ word search triggers semantic vector search on form submit
- [ ] Year filter narrows results correctly
- [ ] Semantic search warning appears if model is not yet ready
- [ ] Searching with no results shows empty state

### View Tracking (logged in as student)
- [ ] Opening an abstract modal fires a POST to `/api/abstracts/[id]/view`
- [ ] Opening the same modal again does not create a duplicate row (ON CONFLICT DO NOTHING)
- [ ] New view appears in admin analytics after refresh

### Admin edit from library
- [ ] Logged in as admin: Edit control is visible inside the abstract modal
- [ ] Editing from the modal saves correctly and updates the card in the grid
- [ ] No Edit control visible when logged in as student or adviser

---

## Nodemailer (if GMAIL_USER and GMAIL_APP_PASSWORD are set)

- [ ] Approval email arrives at the adviser's registered email with correct subject
- [ ] Rejection email arrives with correct subject
- [ ] Email body matches the plain text templates in the PRD (no HTML formatting)