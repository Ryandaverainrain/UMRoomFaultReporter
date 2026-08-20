-- ============================================================
-- UMRoomFaultReporter — ADD DELETE PERMISSION FOR ADMINS
-- Run this in Supabase → SQL Editor (only needed once).
-- Only required if you already ran database_setup.sql earlier
-- and are now adding the delete-report feature.
-- ============================================================

drop policy if exists "Admins can delete reports" on fault_tickets;

create policy "Admins can delete reports"
on fault_tickets
for delete
to authenticated
using (true);
