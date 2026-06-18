-- ============================================================
-- Māka — Row-Level Security AUDIT + HARDENING
-- Run in Supabase → SQL Editor.
--
-- WHY: the moment a second teacher's data is in your database, the ONLY thing
-- stopping Teacher A reading Teacher B's students is Row-Level Security (RLS).
-- PART 1 (read-only) tells you whether every table is locked down.
-- PART 2 enables RLS + owner-only policies on the Māka tables if anything is
-- missing. PART 2 is safe to re-run and matches how the app already saves data.
-- ============================================================

-- ── PART 1 · AUDIT (read-only) ──────────────────────────────
-- Run this block first and read the "verdict" column.
-- Anything not "OK" must be fixed before another teacher joins.
select
  c.relname                                   as table_name,
  c.relrowsecurity                            as rls_enabled,
  count(p.policyname)                          as policy_count,
  case
    when not c.relrowsecurity                 then 'FIX: RLS is OFF — every signed-in user can read this table'
    when count(p.policyname) = 0              then 'FIX: RLS on but NO policies'
    else 'OK'
  end                                         as verdict
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by (c.relrowsecurity is true), c.relname;

-- Flag any policy that allows everyone (USING true / WITH CHECK true).
-- The only expected wide-open access is the student_hub() FUNCTION (security
-- definer, granted to anon) — that is intentional and is not a table policy.
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (qual = 'true' or with_check = 'true');


-- ── PART 2 · HARDENING (safe to run; idempotent) ────────────
-- Enables RLS and creates owner-only policies on every Māka table.
-- Teacher-owned tables are scoped to teacher_id = auth.uid().
-- profiles is keyed by the user id itself (id = auth.uid()).

-- profiles (id = auth.uid())
alter table if exists public.profiles enable row level security;
drop policy if exists "profiles owner select" on public.profiles;
drop policy if exists "profiles owner insert" on public.profiles;
drop policy if exists "profiles owner update" on public.profiles;
drop policy if exists "profiles owner delete" on public.profiles;
create policy "profiles owner select" on public.profiles for select using (auth.uid() = id);
create policy "profiles owner insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles owner update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles owner delete" on public.profiles for delete using (auth.uid() = id);

-- Teacher-owned tables (teacher_id = auth.uid())
do $$
declare t text;
begin
  foreach t in array array['students','sessions','student_results','rubrics','report_comments','answer_keys']
  loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists "%s owner all" on public.%I', t, t);
      execute format(
        'create policy "%s owner all" on public.%I for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id)',
        t, t);
    end if;
  end loop;
end $$;

-- ── Re-run PART 1 after this to confirm every row now reads "OK". ──

-- ── Storage note (do this in the dashboard, not here) ───────
-- Student work files live in the 'student-pdfs' bucket. Confirm in
-- Storage → student-pdfs → Configuration that the bucket is PRIVATE
-- (not public), and that any storage policies are scoped to the owner.
-- The app only ever serves these files through short-lived signed URLs.
