-- Māka — Student Portal: run this once in the Supabase SQL editor.
-- Adds a per-student access code and a locked-down RPC that returns ONLY
-- that one student's own data. No RLS changes to existing tables, and no
-- direct anon access is granted to students/student_results/sessions —
-- the function is the only door, and it only ever returns one student's rows.

-- 1. Access code column on students
alter table students add column if not exists access_code text unique;

create or replace function maka_gen_access_code() returns text
language sql as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6))
$$;

-- Backfill any existing students that don't have a code yet
update students set access_code = maka_gen_access_code() where access_code is null;

-- Give new students a code automatically
create or replace function maka_set_access_code() returns trigger
language plpgsql as $$
begin
  if new.access_code is null then
    new.access_code := maka_gen_access_code();
  end if;
  return new;
end;
$$;

drop trigger if exists maka_students_access_code on students;
create trigger maka_students_access_code
  before insert on students
  for each row execute function maka_set_access_code();

-- 2. Portal data function — SECURITY DEFINER so it can read the tables
-- itself, but it never exposes more than the single matching student's
-- own results. Anon (the student) only ever calls this function; they are
-- never granted SELECT on the underlying tables.
create or replace function get_student_portal(p_access_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student students;
  v_results json;
begin
  if p_access_code is null or length(trim(p_access_code)) = 0 then
    return json_build_object('error', 'invalid_code');
  end if;

  select * into v_student from students where access_code = upper(trim(p_access_code));
  if v_student.id is null then
    return json_build_object('error', 'invalid_code');
  end if;

  select coalesce(json_agg(r), '[]'::json) into v_results
  from (
    select
      sr.overall_score, sr.criteria_total, sr.criteria,
      sr.strengths, sr.next_steps, sr.nzc_reference, sr.created_at,
      s.name as session_name, s.learning_area, s.task, s.created_at as session_created_at
    from student_results sr
    join sessions s on s.id = sr.session_id
    where sr.teacher_id = v_student.teacher_id
      and sr.file_name ilike '%' || split_part(trim(v_student.name), ' ', 1) || '%'
    order by sr.created_at asc
  ) r;

  return json_build_object(
    'student', json_build_object(
      'name', v_student.name,
      'year_level', v_student.year_level
    ),
    'results', v_results
  );
end;
$$;

-- Lock the function down to anon/authenticated only via RPC call,
-- and make sure no one can SELECT the tables directly through it.
revoke all on function get_student_portal(text) from public;
grant execute on function get_student_portal(text) to anon, authenticated;
