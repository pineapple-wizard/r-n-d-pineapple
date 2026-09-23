-- Run this once in the Supabase SQL editor, after supabase/profiles.sql.
-- One row per R&D item. Subitems use parent_id and cannot have children.
-- A parent leaves the main board only when its own status is completed.
-- Status is text with a check, because Postgres cannot use a new enum
-- value in the same SQL editor transaction that creates the type.

drop type if exists public.item_status;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.items (id) on delete cascade,
  name text not null,
  date_requested date,
  date_received date,
  status text not null default 'not_started',
  date_completed date,
  notes text not null default '',
  recap_form_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_name_not_blank check (char_length(btrim(name)) > 0),
  constraint items_status_check check (
    status in ('not_started', 'in_progress', 'blocked', 'completed')
  ),
  constraint items_recap_url_http check (
    recap_form_url is null or recap_form_url ~* '^https?://'
  )
);

create index if not exists items_parent_id_idx on public.items (parent_id);

create table if not exists public.item_owners (
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (item_id, user_id)
);

create table if not exists public.item_mentions (
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (item_id, user_id)
);

create or replace function public.prepare_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'completed' then
    if new.date_completed is null then
      new.date_completed := current_date;
    end if;
  else
    new.date_completed := null;
  end if;

  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'An item cannot be its own parent';
    end if;

    if exists (
      select 1 from public.items child where child.parent_id = new.id
    ) then
      raise exception 'An item with subitems cannot become a subitem';
    end if;

    if exists (
      select 1
      from public.items parent
      where parent.id = new.parent_id
        and parent.parent_id is not null
    ) then
      raise exception 'Subitems cannot have subitems';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists prepare_item on public.items;
create trigger prepare_item
  before insert or update on public.items
  for each row
  execute function public.prepare_item();

alter table public.items enable row level security;
alter table public.item_owners enable row level security;
alter table public.item_mentions enable row level security;

drop policy if exists "Authenticated users can read items" on public.items;
create policy "Authenticated users can read items"
  on public.items for select to authenticated using (true);

drop policy if exists "Authenticated users can insert items" on public.items;
create policy "Authenticated users can insert items"
  on public.items for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update items" on public.items;
create policy "Authenticated users can update items"
  on public.items for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete items" on public.items;
create policy "Authenticated users can delete items"
  on public.items for delete to authenticated using (true);

drop policy if exists "Authenticated users can read item owners" on public.item_owners;
create policy "Authenticated users can read item owners"
  on public.item_owners for select to authenticated using (true);

drop policy if exists "Authenticated users can insert item owners" on public.item_owners;
create policy "Authenticated users can insert item owners"
  on public.item_owners for insert to authenticated with check (true);

drop policy if exists "Authenticated users can delete item owners" on public.item_owners;
create policy "Authenticated users can delete item owners"
  on public.item_owners for delete to authenticated using (true);

drop policy if exists "Authenticated users can read item mentions" on public.item_mentions;
create policy "Authenticated users can read item mentions"
  on public.item_mentions for select to authenticated using (true);

drop policy if exists "Authenticated users can insert item mentions" on public.item_mentions;
create policy "Authenticated users can insert item mentions"
  on public.item_mentions for insert to authenticated with check (true);

drop policy if exists "Authenticated users can delete item mentions" on public.item_mentions;
create policy "Authenticated users can delete item mentions"
  on public.item_mentions for delete to authenticated using (true);

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated using (true);

grant select, insert, update, delete on public.items to authenticated;
grant select, insert, delete on public.item_owners to authenticated;
grant select, insert, delete on public.item_mentions to authenticated;
