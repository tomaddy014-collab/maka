-- ============================================================
-- Māka — Saved maths answer keys
-- Run ONCE in Supabase → SQL Editor. Safe to re-run.
-- Lets teachers save an answer key and reload it next time.
-- ============================================================

create table if not exists public.answer_keys (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_answer_keys_teacher on public.answer_keys(teacher_id);

alter table public.answer_keys enable row level security;

-- A teacher can only see and manage their own keys.
drop policy if exists "answer_keys read own" on public.answer_keys;
create policy "answer_keys read own"   on public.answer_keys for select using (auth.uid() = teacher_id);

drop policy if exists "answer_keys insert own" on public.answer_keys;
create policy "answer_keys insert own" on public.answer_keys for insert with check (auth.uid() = teacher_id);

drop policy if exists "answer_keys update own" on public.answer_keys;
create policy "answer_keys update own" on public.answer_keys for update using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

drop policy if exists "answer_keys delete own" on public.answer_keys;
create policy "answer_keys delete own" on public.answer_keys for delete using (auth.uid() = teacher_id);
