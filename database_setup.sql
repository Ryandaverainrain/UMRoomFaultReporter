-- ============================================================
-- UMRoomFaultReporter — CLEAN DATABASE REBUILD
-- Run this ENTIRE file in Supabase → SQL Editor → New Query → Run
-- This replaces everything Gemini created. Safe to run even if
-- the old tables/policies are messy or half-broken.
-- ============================================================

-- 1. DROP OLD TABLES (removes maintenance_staff & ticket_status_history entirely)
drop table if exists ticket_status_history cascade;
drop table if exists maintenance_staff cascade;
drop table if exists fault_tickets cascade;

-- 2. CREATE THE NEW SIMPLIFIED TABLE
create table fault_tickets (
    id uuid primary key default gen_random_uuid(),
    report_code text unique not null,
    reporter_type text not null,
    reporter_name text not null,
    reporter_id_number text not null,
    classroom_name text not null,
    equipment_name text not null,
    location_in_room text,
    issue_description text not null,
    image_url text,
    status text not null default 'Reported',
    created_at timestamptz not null default now(),
    resolved_at timestamptz
);

-- 3. ENABLE ROW LEVEL SECURITY
alter table fault_tickets enable row level security;

-- 4. TABLE POLICIES
-- Anyone (students/faculty, not logged in) can submit a report
create policy "Anyone can submit a report"
on fault_tickets
for insert
to public
with check (true);

-- Anyone can view reports (public Active Reports page + admin dashboard)
create policy "Anyone can view reports"
on fault_tickets
for select
to public
using (true);

-- Only logged-in admins can change a ticket's status
create policy "Admins can update reports"
on fault_tickets
for update
to authenticated
using (true)
with check (true);

-- 5. STORAGE POLICIES (clean slate — removes any old/duplicate ones first)
drop policy if exists "Allow public uploads to fault-images" on storage.objects;
drop policy if exists "Allow public reads on fault-images" on storage.objects;
drop policy if exists "Anyone can upload fault images" on storage.objects;
drop policy if exists "Anyone can view fault images" on storage.objects;

create policy "Anyone can upload fault images"
on storage.objects
for insert
to public
with check (bucket_id = 'fault-images');

create policy "Anyone can view fault images"
on storage.objects
for select
to public
using (bucket_id = 'fault-images');

-- ============================================================
-- Done. After running this, make sure the 'fault-images' bucket
-- still exists in Storage (it isn't affected by this script).
-- ============================================================
