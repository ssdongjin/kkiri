-- 끼리: 로그인 없이 닉네임만 사용하는 공개 밥약 데이터
create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  region text not null default '서울대입구' check (char_length(region) <= 80),
  people smallint not null check (people between 2 and 10),
  meal_time text not null default '',
  budget text not null,
  food_types jsonb not null default '["상관없음"]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  category text not null,
  price integer not null check (price >= 0 and price <= 1000000),
  description text not null default '' check (char_length(description) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists restaurants_room_id_idx on public.restaurants(room_id);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  created_at timestamptz not null default now()
);
create index if not exists participants_room_id_idx on public.participants(room_id);
create unique index if not exists participants_room_nickname_idx on public.participants(room_id, nickname);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  value text not null check (value in ('love', 'okay', 'dislike', 'cannot')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, restaurant_id)
);
create index if not exists votes_room_id_idx on public.votes(room_id);

-- Vercel의 정적 앱은 익명 키를 쓰므로, 개인정보를 전혀 담지 않는 이 네 테이블만 공개합니다.
alter table public.rooms enable row level security;
alter table public.restaurants enable row level security;
alter table public.participants enable row level security;
alter table public.votes enable row level security;
drop policy if exists "public room read" on public.rooms;
drop policy if exists "public room create" on public.rooms;
drop policy if exists "public restaurant read" on public.restaurants;
drop policy if exists "public restaurant create" on public.restaurants;
drop policy if exists "public participant read" on public.participants;
drop policy if exists "public participant create" on public.participants;
drop policy if exists "public vote read" on public.votes;
drop policy if exists "public vote create" on public.votes;
drop policy if exists "public vote update" on public.votes;
create policy "public room read" on public.rooms for select using (true);
create policy "public room create" on public.rooms for insert with check (true);
create policy "public restaurant read" on public.restaurants for select using (true);
create policy "public restaurant create" on public.restaurants for insert with check (true);
create policy "public participant read" on public.participants for select using (true);
create policy "public participant create" on public.participants for insert with check (true);
create policy "public vote read" on public.votes for select using (true);
create policy "public vote create" on public.votes for insert with check (true);
create policy "public vote update" on public.votes for update using (true) with check (true);

-- Database > Replication에서 아래 테이블을 publication에 포함합니다.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'restaurants') then alter publication supabase_realtime add table public.restaurants; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'participants') then alter publication supabase_realtime add table public.participants; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'votes') then alter publication supabase_realtime add table public.votes; end if;
end $$;
