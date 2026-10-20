-- ============================================================================
-- Māka — database fixes (safe to re-run)
-- Run in the Supabase SQL editor (Dashboard → SQL Editor → New query → Run).
--
-- WHAT IT DOES
--   1. Adds a unique constraint on student_results(session_id, file_name).
--      The app saves results with
--        upsert(..., { onConflict: 'session_id,file_name' })
--      and Postgres REJECTS that upsert unless a unique constraint (or unique
--      index) exists on exactly those columns. Without it, saving results fails.
--      Before adding the constraint, any existing duplicate rows (same session
--      and same file name) are removed, keeping the NEWEST row of each group.
--      Note: a removed duplicate's stored PDF (pdf_path) is not deleted from
--      Storage by this script; it simply stops being referenced.
--
--   2. At the bottom: read-only CHECK queries (commented out) to confirm that
--      Row-Level Security is on for every table and that the 'student-pdfs'
--      storage bucket is private. Select one, uncomment it, and run it on its own.
--
-- Re-running is harmless: if the constraint (or an equivalent unique index)
-- already exists, step 1 does nothing.
-- ============================================================================

do $$
declare
  v_removed integer := 0;
begin
  if exists (
       select 1 from pg_constraint
       where conname = 'sr_sess_file_uniq'
         and conrelid = 'public.student_results'::regclass
     )
     or exists (
       -- an equivalent unique index created some other way also satisfies onConflict
       select 1
       from pg_index i
       where i.indrelid = 'public.student_results'::regclass
         and i.indisunique
         and i.indpred is null
         and i.indnkeyatts = 2
         and (select array_agg(a.attname::text order by a.attname::text)
              from pg_attribute a
              where a.attrelid = i.indrelid
                and a.attnum = any (i.indkey)) = array['file_name', 'session_id']
     )
  then
    raise notice 'student_results already has a unique (session_id, file_name) — nothing to do.';
  else
    -- Remove duplicates, keeping the newest row per (session_id, file_name).
    -- Rows with a NULL session_id or file_name never conflict, so they are left alone.
    delete from public.student_results t
    using (
      select ctid as row_ctid,
             row_number() over (
               partition by session_id, file_name
               order by created_at desc nulls last, ctid desc
             ) as rn
      from public.student_results
      where session_id is not null and file_name is not null
    ) d
    where t.ctid = d.row_ctid
      and d.rn > 1;
    get diagnostics v_removed = row_count;
    raise notice 'Removed % duplicate student_results row(s).', v_removed;

    alter table public.student_results
      add constraint sr_sess_file_uniq unique (session_id, file_name);
    raise notice 'Added constraint sr_sess_file_uniq on student_results(session_id, file_name).';
  end if;
end
$$;


-- ============================================================================
-- CHECK QUERIES (read-only). Uncomment ONE at a time and run it.
-- ============================================================================

-- (a) Is Row-Level Security ON for every table?
--     Every row should show relrowsecurity = true. Any "false" means anyone with
--     the public anon key could read that table — run supabase-rls-policies.sql.
--
-- select c.relname as table_name, c.relrowsecurity as rls_enabled
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'r'
-- order by c.relname;

-- (a2) Which policies exist? (Each Māka table should have a maka_*_all policy.)
--
-- select tablename, policyname, roles, cmd
-- from pg_policies
-- where schemaname in ('public', 'storage')
-- order by schemaname, tablename, policyname;

-- (b) Is the 'student-pdfs' bucket PRIVATE?
--     Expect one row with public = false. If public = true, anyone who learns a
--     file path can download a student's work: Dashboard → Storage → student-pdfs
--     → Edit bucket → turn OFF "Public bucket".
--
-- select id, public from storage.buckets where id = 'student-pdfs';

-- (c) Did step 1 work? Expect one row named sr_sess_file_uniq (or see the
--     notice printed when you ran this file).
--
-- select conname from pg_constraint
-- where conrelid = 'public.student_results'::regclass and contype = 'u';
