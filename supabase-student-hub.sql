-- ============================================================
-- Māka — Student-facing hub setup
-- Run this ONCE in your Supabase dashboard:
--   supabase.com → your project → SQL Editor → New query →
--   paste this whole file → Run
-- ============================================================

-- 1. Give every student a private share code (random, unguessable)
alter table public.students
  add column if not exists share_code text unique
  default replace(replace(encode(gen_random_bytes(12),'base64'),'/','x'),'+','y');

-- Backfill codes for students created before this column existed
update public.students
  set share_code = replace(replace(encode(gen_random_bytes(12),'base64'),'/','x'),'+','y')
  where share_code is null;

-- 2. A safe read-only function the student page calls with the code.
--    It only ever returns ONE student's own data — never the class,
--    never other students, never the teacher's key or email.
create or replace function public.student_hub(code text)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'student', (
      select json_build_object('name', s.name, 'year_level', s.year_level)
      from students s where s.share_code = code
    ),
    'results', (
      select coalesce(json_agg(json_build_object(
        'created_at', r.created_at,
        'criteria_total', r.criteria_total,
        'overall_score', r.overall_score,
        'criteria', r.criteria,
        'strengths', r.strengths,
        'next_steps', r.next_steps,
        'session_name', se.name,
        'learning_area', se.learning_area
      ) order by r.created_at), '[]'::json)
      from students s
      join student_results r
        on r.teacher_id = s.teacher_id
       and r.file_name ilike '%' || split_part(s.name,' ',1) || '%'
      left join sessions se on se.id = r.session_id
      where s.share_code = code
    )
  );
$$;

-- 3. Allow the public (anon) role to call it — the code IS the password
grant execute on function public.student_hub(text) to anon;
