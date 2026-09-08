-- ============================================================
-- UMRoomFaultReporter — ADMIN ROLES + APP SETTINGS
-- Run this in Supabase → SQL Editor, after your other setup scripts.
-- ============================================================

-- 1. ADMINS TABLE — the real fix for "students can access admin.html"
-- Only user_ids listed here are treated as admins anywhere in the app.
create table if not exists admins (
    user_id uuid primary key references auth.users(id),
    created_at timestamptz not null default now()
);

alter table admins enable row level security;

-- A logged-in user can check whether THEY are an admin (needed for the
-- admin.html access check) — but can't see who else is an admin.
drop policy if exists "Users can check their own admin status" on admins;
create policy "Users can check their own admin status"
on admins
for select
to authenticated
using (user_id = auth.uid());


-- 2. LOCK DOWN fault_tickets UPDATE/DELETE TO REAL ADMINS ONLY
-- (previously any authenticated user — including students — passed these)
drop policy if exists "Admins can update reports" on fault_tickets;
create policy "Admins can update reports"
on fault_tickets
for update
to authenticated
using (auth.uid() in (select user_id from admins))
with check (auth.uid() in (select user_id from admins));

drop policy if exists "Admins can delete reports" on fault_tickets;
create policy "Admins can delete reports"
on fault_tickets
for delete
to authenticated
using (auth.uid() in (select user_id from admins));


-- 3. APP SETTINGS TABLE — holds the admin-configurable report cooldown
create table if not exists app_settings (
    key text primary key,
    value text not null,
    updated_at timestamptz not null default now()
);

insert into app_settings (key, value)
values ('report_cooldown_minutes', '10')
on conflict (key) do nothing;

alter table app_settings enable row level security;

-- Anyone can read settings (report.js needs this to know the cooldown)
drop policy if exists "Anyone can read settings" on app_settings;
create policy "Anyone can read settings"
on app_settings
for select
to public
using (true);

-- Only admins can change settings
drop policy if exists "Admins can update settings" on app_settings;
create policy "Admins can update settings"
on app_settings
for update
to authenticated
using (auth.uid() in (select user_id from admins))
with check (auth.uid() in (select user_id from admins));


-- ============================================================
-- LAST STEP — make yourself an admin (run this separately):
--
-- 1. Find your admin auth user's ID:
--      select id, email from auth.users;
--
-- 2. Copy the id for the account you use to log into admin.html, then run:
--      insert into admins (user_id) values ('paste-that-uuid-here');
-- ============================================================
