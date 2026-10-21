-- ============================================================================
-- Māka — Row-Level Security policies
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- What it does:
--   * Turns on Row-Level Security for every table that holds teacher/student data.
--   * Adds policies so each signed-in teacher can only ever read or change THEIR
--     OWN rows (matched by teacher_id = auth.uid(), or id = auth.uid() for profiles).
--   * Locks the storage bucket so a teacher can only touch files in their own folder.
--
-- Safe to re-run: every policy is dropped-if-exists first, so running twice is fine.
-- The student portal keeps working: get_student_portal() is SECURITY DEFINER, so it
-- reads the tables on the student's behalf without needing any anon table policy.
-- ============================================================================

-- ── profiles (owned by the auth user's own id) ──────────────────────────────
alter table profiles enable row level security;
drop policy if exists maka_profiles_all on profiles;
create policy maka_profiles_all on profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── students ────────────────────────────────────────────────────────────────
alter table students enable row level security;
drop policy if exists maka_students_all on students;
create policy maka_students_all on students
  for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ── sessions ──────────────────────────────────────────────────────────────--
alter table sessions enable row level security;
drop policy if exists maka_sessions_all on sessions;
create policy maka_sessions_all on sessions
  for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ── student_results ─────────────────────────────────────────────────────────
alter table student_results enable row level security;
drop policy if exists maka_student_results_all on student_results;
create policy maka_student_results_all on student_results
  for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ── report_comments ───────────────────────────────────────────────────────--
alter table report_comments enable row level security;
drop policy if exists maka_report_comments_all on report_comments;
create policy maka_report_comments_all on report_comments
  for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ── rubrics ───────────────────────────────────────────────────────────────--
alter table rubrics enable row level security;
drop policy if exists maka_rubrics_all on rubrics;
create policy maka_rubrics_all on rubrics
  for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ── Storage: student-pdfs bucket ─────────────────────────────────────────────
-- Files are stored under a folder named after the teacher's user id: "{uid}/filename".
-- These policies let a teacher only read/write/delete inside their own folder.
drop policy if exists maka_pdfs_select on storage.objects;
create policy maka_pdfs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'student-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists maka_pdfs_insert on storage.objects;
create policy maka_pdfs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'student-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists maka_pdfs_update on storage.objects;
create policy maka_pdfs_update on storage.objects
  for update to authenticated
  using (bucket_id = 'student-pdfs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'student-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists maka_pdfs_delete on storage.objects;
create policy maka_pdfs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'student-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Verify (optional) — run separately to see what's now in place ────────────
-- select tablename, policyname, cmd from pg_policies
-- where schemaname='public' and tablename in
--   ('profiles','students','sessions','student_results','report_comments','rubrics')
-- order by tablename, policyname;
