-- ============================================================
-- UMRoomFaultReporter — STUDENT DASHBOARD UPGRADE
-- Run in Supabase → SQL Editor, after all previous setup scripts.
-- ============================================================

-- 1. NEW COLUMNS on fault_tickets
alter table fault_tickets add column if not exists edited_at timestamptz;
alter table fault_tickets add column if not exists reference_point text; -- 'Nearest Exit/Entrance' or 'Whiteboard'

-- 2. STUDENTS CAN NOW EDIT THEIR OWN REPORTS (not just admins)
drop policy if exists "Students can update their own report" on fault_tickets;
create policy "Students can update their own report"
on fault_tickets
for update
to authenticated
using (student_user_id = auth.uid())
with check (student_user_id = auth.uid());

-- Note: this is a SEPARATE policy from "Admins can update reports" — Postgres
-- checks policies with OR logic, so either being the report's owner OR being
-- an admin is enough to pass. Neither policy needs to know about the other.


-- 3. ACTIVE REPORTS IS NO LONGER PUBLIC — must be logged in to view
drop policy if exists "Anyone can view reports" on fault_tickets;
create policy "Logged-in users can view reports"
on fault_tickets
for select
to authenticated
using (true);

-- ============================================================
-- Done. Nothing else to run manually for this update.
-- ============================================================
