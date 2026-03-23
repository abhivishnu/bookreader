-- Run this in your Supabase SQL editor

-- Books table
create table public.books (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  author      text,
  format      text not null check (format in ('pdf', 'epub')),
  file_url    text not null,
  cover_url   text,
  created_at  timestamptz default now()
);

-- Reading progress table
create table public.reading_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  book_id     uuid not null references public.books(id) on delete cascade,
  location    text not null,       -- page number (PDF) or CFI string (EPUB)
  percentage  integer default 0,
  updated_at  timestamptz default now(),
  unique (user_id, book_id)
);

-- RLS: users can only see their own data
alter table public.books enable row level security;
alter table public.reading_progress enable row level security;

create policy "books: own rows" on public.books
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "progress: own rows" on public.reading_progress
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- View that joins last_percentage onto books for the library
create or replace view public.books_with_progress as
  select
    b.*,
    coalesce(p.percentage, 0) as last_percentage,
    p.updated_at as last_read_at
  from public.books b
  left join public.reading_progress p on p.book_id = b.id and p.user_id = b.user_id;
