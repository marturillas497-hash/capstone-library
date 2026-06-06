# Admin Account Setup

The admin account is bootstrapped manually. There is no registration flow for the admin.
Do this once after the schema is set up.

---

## Step 1 — Create the Auth User

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Users**
3. Click **Add user → Create new user**
4. Fill in the form:
   - **Email:** your admin email
   - **Password:** a strong password
   - **Auto Confirm User:** toggle this ON
5. Click **Create User**
6. Copy the **User UID** from the user list — you will need it in Step 2

---

## Step 2 — Insert the Profile Row

1. Navigate to **SQL Editor**
2. Paste the query below, replacing the placeholder values with your actual data
3. Click **Run**

```sql
insert into public.profiles (id, full_name, role, status)
values (
  'PASTE_USER_UID_HERE',
  'PASTE_ADMIN_FULL_NAME_HERE',
  'admin',
  'active'
);
```

**Example:**

```sql
insert into public.profiles (id, full_name, role, status)
values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Juan Dela Cruz',
  'admin',
  'active'
);
```

---

## Step 3 — Verify

Run this query to confirm the admin row exists correctly:

```sql
select id, full_name, role, status from public.profiles
where role = 'admin';
```

You should see one row with `role = admin` and `status = active`.

---

## Notes

- Do **not** create a row in `student_metadata` for the admin account
- There should only ever be **one** admin account
- The admin account cannot be created through the registration page — the UI will not support it