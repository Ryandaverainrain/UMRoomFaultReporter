-- ============================================================
-- UMRoomFaultReporter — STUDENT ACCOUNTS
-- Run this in Supabase → SQL Editor. Safe to run after your
-- existing database_setup.sql (it only adds new things).
-- ============================================================

-- 1. STUDENTS TABLE (the roster)
create table if not exists students (
    id uuid primary key default gen_random_uuid(),
    student_id text unique not null,
    last_name text not null,
    first_name text not null,
    year_program text not null,
    umdc_email text unique not null,
    user_id uuid references auth.users(id),
    created_at timestamptz not null default now()
);

alter table students enable row level security;

-- Anyone can look up a student_id (needed for the "Find" step before login)
drop policy if exists "Anyone can look up a student id" on students;
create policy "Anyone can look up a student id"
on students
for select
to public
using (true);

-- A logged-in user can claim an UNCLAIMED roster row (Ryan pre-loaded it,
-- user_id is still null) — but ONLY if their verified email matches the
-- row's umdc_email. This is what stops someone claiming a classmate's row.
drop policy if exists "Users can claim their unclaimed roster row" on students;
create policy "Users can claim their unclaimed roster row"
on students
for update
to authenticated
using (user_id is null and umdc_email = auth.jwt() ->> 'email')
with check (user_id = auth.uid() and umdc_email = auth.jwt() ->> 'email');

-- A logged-in user can update their OWN already-claimed row
drop policy if exists "Users can update their own row" on students;
create policy "Users can update their own row"
on students
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- A logged-in user can insert their OWN new row (self-registration —
-- their student_id wasn't on the roster at all)
drop policy if exists "Users can insert their own new row" on students;
create policy "Users can insert their own new row"
on students
for insert
to authenticated
with check (user_id = auth.uid() and umdc_email = auth.jwt() ->> 'email');


-- 2. LINK fault_tickets TO LOGGED-IN STUDENTS
alter table fault_tickets add column if not exists student_user_id uuid references auth.users(id);

-- Replace the old "anyone can submit" policy — submitting now requires login
drop policy if exists "Anyone can submit a report" on fault_tickets;
create policy "Logged-in students can submit a report"
on fault_tickets
for insert
to authenticated
with check (student_user_id = auth.uid());

-- (select/view policy and admin update/delete policies from earlier scripts
--  are unaffected and still apply)

-- ============================================================
-- Done. Next steps in the Supabase Dashboard (not SQL):
-- 1. Authentication → Sign In / Providers → Email → set
--    "OTP Expiration" to 600 (10 minutes).
-- 2. Authentication → Email Templates → Magic Link → edit the
--    body to include {{ .Token }} so users get a typeable code.
-- 3. (Optional, recommended) Add your classmates' roster info
--    directly via Table Editor → students → Insert row, leaving
--    user_id empty. They'll "claim" it the first time they log in.
-- ============================================================
