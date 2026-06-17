-- ============================================================
-- Māka — Maths marking mode
-- Run ONCE in Supabase → SQL Editor (after the earlier migrations).
-- Safe to re-run.
-- ============================================================

-- 1. Remember which mode a session / result was marked in.
--    'rubric' = the original 5-criteria writing/science marking.
--    'maths'  = right/wrong per-question marking (questions stored in the
--               existing jsonb `criteria` column).
alter table public.sessions
  add column if not exists mark_mode text not null default 'rubric';

alter table public.student_results
  add column if not exists mark_mode text not null default 'rubric';

-- 2. Student hub RPC now returns mark_mode so the student page can render
--    maths results (✓/✗ per question) instead of criterion bars.
create or replace function public.student_hub(code text)
returns json
language sql
security definer
set search_path = public
as $$
  with stu as (
    select * from students
    where share_code = code
       or upper(login_code) = upper(trim(code))
    limit 1
  )
  select json_build_object(
    'student', (
      select json_build_object('name', name, 'year_level', year_level)
      from stu
    ),
    'results', (
      select coalesce(json_agg(json_build_object(
        'id', r.id,
        'created_at', r.created_at,
        'mark_mode', coalesce(r.mark_mode,'rubric'),
        'criteria_total', r.criteria_total,
        'overall_score', r.overall_score,
        'criteria', r.criteria,
        'strengths', r.strengths,
        'next_steps', r.next_steps,
        'pdf_url', r.pdf_url,
        'session_name', se.name,
        'learning_area', se.learning_area,
        'session_date', se.created_at
      ) order by r.created_at), '[]'::json)
      from stu s
      join student_results r
        on r.teacher_id = s.teacher_id
       and (r.student_id = s.id
            or (r.student_id is null
                and r.file_name ilike '%' || split_part(s.name,' ',1) || '%'))
      left join sessions se on se.id = r.session_id
    )
  );
$$;

grant execute on function public.student_hub(text) to anon;
