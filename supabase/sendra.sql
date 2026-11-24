-- Sendra Studio
-- Paste this once in Supabase → SQL Editor → Run.
-- Until this table exists, the app saves into `universes` (Lumen's table)
-- with an snd_… id so you can try it now.
-- Once this table exists, new saves go here and the snd_ row is removed from universes.

create table if not exists public.sendra_protocols (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  local_id text unique,
  slug text unique,
  title text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists sendra_protocols_owner_idx
  on public.sendra_protocols (owner_id, updated_at desc);

create index if not exists sendra_protocols_slug_idx
  on public.sendra_protocols (slug) where status = 'published';

alter table public.sendra_protocols enable row level security;

drop policy if exists "protocol owner" on public.sendra_protocols;
create policy "protocol owner" on public.sendra_protocols
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "published protocol" on public.sendra_protocols;
create policy "published protocol" on public.sendra_protocols
  for select using (status = 'published');

grant select, insert, update, delete on public.sendra_protocols to authenticated;
grant select on public.sendra_protocols to anon;

-- Public logos. The studio uploads to sendra/{user id}/…
insert into storage.buckets (id, name, public)
values ('sendra', 'sendra', true)
on conflict (id) do update set public = true;

drop policy if exists "sendra logo read" on storage.objects;
create policy "sendra logo read" on storage.objects
  for select using (bucket_id = 'sendra');

drop policy if exists "sendra logo insert" on storage.objects;
create policy "sendra logo insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sendra'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
