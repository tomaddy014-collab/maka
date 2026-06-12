-- ============================================================
-- Māka — Harden student login codes
-- Run ONCE in Supabase → SQL Editor.
--
-- Why: the original codes (BIRD-4 digits) have only ~160,000
-- combinations, which a script could guess against the public
-- lookup endpoint. New format BIRD-6 digits has ~16,000,000 —
-- impractical to brute-force at PostgREST speeds.
-- ============================================================

-- 1. New codes use 6 digits
create or replace function public.gen_login_code()
returns text
language plpgsql
volatile
as $$
declare
  birds text[] := array['KEA','TUI','MOA','RURU','KIWI','WEKA','KAKA','HUIA','KAHU','TARA','TOROA','KOTARE','KERERU','TAKAHE','PUKEKO','KAKAPO'];
  c text;
begin
  loop
    c := birds[1 + floor(random() * array_length(birds,1))::int]
         || '-' || lpad(floor(random() * 1000000)::int::text, 6, '0');
    exit when not exists (select 1 from public.students where login_code = c);
  end loop;
  return c;
end $$;

-- 2. RECOMMENDED: regenerate all existing short codes.
--    NOTE: this invalidates codes already handed to students —
--    they will need their new code from you (Class tab shows it).
--    Comment this block out if you'd rather keep old codes working.
update public.students
  set login_code = public.gen_login_code()
  where login_code is null
     or login_code ~ '^[A-Z]+-[0-9]{4}$';
