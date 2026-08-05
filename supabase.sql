-- Nastavitev Supabase za Oglasni list.
-- Zaženeš enkrat: supabase.com -> svoj projekt -> SQL Editor -> New query -> Run.
-- Poganjanje več kot enkrat je varno: vsako pravilo se prej pobriše.
--
-- Potem še: Authentication -> Sign In / Providers -> Email -> izklopi "Confirm email".
-- Ko so računi ekipe narejeni, tam izklopi tudi "Allow new users to sign up".

-- ── besedila, številke in struktura map ──────────────────────────────────────
create table if not exists public.stanje (
  uporabnik   uuid primary key references auth.users(id) on delete cascade,
  podatki     jsonb not null default '{}'::jsonb,
  spremenjeno timestamptz not null default now()
);

alter table public.stanje enable row level security;

drop policy if exists "berem svoje"     on public.stanje;
drop policy if exists "vstavim svoje"   on public.stanje;
drop policy if exists "posodobim svoje" on public.stanje;

create policy "berem svoje"     on public.stanje for select using (auth.uid() = uporabnik);
create policy "vstavim svoje"   on public.stanje for insert with check (auth.uid() = uporabnik);
create policy "posodobim svoje" on public.stanje for update using (auth.uid() = uporabnik) with check (auth.uid() = uporabnik);

-- ── slike in videi kreativ ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('material', 'material', false)
on conflict (id) do nothing;

drop policy if exists "ekipa bere material"   on storage.objects;
drop policy if exists "ekipa nalaga material" on storage.objects;
drop policy if exists "ekipa menja material"  on storage.objects;
drop policy if exists "ekipa brise material"  on storage.objects;

create policy "ekipa bere material"   on storage.objects for select to authenticated using (bucket_id = 'material');
create policy "ekipa nalaga material" on storage.objects for insert to authenticated with check (bucket_id = 'material');
create policy "ekipa menja material"  on storage.objects for update to authenticated using (bucket_id = 'material');
create policy "ekipa brise material"  on storage.objects for delete to authenticated using (bucket_id = 'material');
