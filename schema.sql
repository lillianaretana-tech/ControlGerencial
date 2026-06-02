create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  site_type text check (site_type in ('Grande', 'Pequeno')),
  frequency text check (frequency in ('Semanal', 'Quincenal', 'Mensual')),
  suggested_hours numeric default 0,
  client text,
  status text default 'Activo' check (status in ('Activo', 'Inactivo')),
  comments text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists scheduled_visits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  date date not null,
  day text,
  scheduled_hours numeric default 0,
  status text default 'Programada',
  comments text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists visit_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  date date not null,
  start_time time,
  end_time time,
  site_audit text,
  warehouse_review text,
  training_review text,
  supervision_followup text,
  findings text,
  comments text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ars (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  source text,
  finding_date date,
  finding text not null,
  required_action text not null,
  owner text,
  priority text default 'Media',
  due_date date,
  status text default 'Abierta',
  closing_comment text,
  closed_at timestamptz,
  evidence_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  url text,
  description text,
  responsible text,
  status text default 'Activa',
  type text default 'Interna',
  icon text,
  comments text,
  sort_order integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists evidence_files (
  id uuid primary key default gen_random_uuid(),
  ar_id uuid references ars(id) on delete cascade,
  file_name text,
  file_url text,
  file_type text,
  uploaded_at timestamptz default now()
);

create table if not exists recycle_bin (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  record_data jsonb not null,
  deleted_at timestamptz default now(),
  restore_until timestamptz default now() + interval '30 days'
);

alter table projects enable row level security;
alter table scheduled_visits enable row level security;
alter table visit_records enable row level security;
alter table ars enable row level security;
alter table tools enable row level security;
alter table evidence_files enable row level security;
alter table recycle_bin enable row level security;

drop policy if exists "Public read projects" on projects;
drop policy if exists "Public write projects" on projects;
drop policy if exists "Public read scheduled visits" on scheduled_visits;
drop policy if exists "Public write scheduled visits" on scheduled_visits;
drop policy if exists "Public read visit records" on visit_records;
drop policy if exists "Public write visit records" on visit_records;
drop policy if exists "Public read ars" on ars;
drop policy if exists "Public write ars" on ars;
drop policy if exists "Public read tools" on tools;
drop policy if exists "Public write tools" on tools;
drop policy if exists "Public read evidence" on evidence_files;
drop policy if exists "Public write evidence" on evidence_files;
drop policy if exists "Public read recycle bin" on recycle_bin;
drop policy if exists "Public write recycle bin" on recycle_bin;

create policy "Public read projects" on projects for select using (true);
create policy "Public write projects" on projects for all using (true) with check (true);
create policy "Public read scheduled visits" on scheduled_visits for select using (true);
create policy "Public write scheduled visits" on scheduled_visits for all using (true) with check (true);
create policy "Public read visit records" on visit_records for select using (true);
create policy "Public write visit records" on visit_records for all using (true) with check (true);
create policy "Public read ars" on ars for select using (true);
create policy "Public write ars" on ars for all using (true) with check (true);
create policy "Public read tools" on tools for select using (true);
create policy "Public write tools" on tools for all using (true) with check (true);
create policy "Public read evidence" on evidence_files for select using (true);
create policy "Public write evidence" on evidence_files for all using (true) with check (true);
create policy "Public read recycle bin" on recycle_bin for select using (true);
create policy "Public write recycle bin" on recycle_bin for all using (true) with check (true);
