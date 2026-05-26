create table if not exists users (
  id text primary key,
  login text not null unique,
  subdivision text not null default 'ogk' check (subdivision in ('ogk', 'oyit')),
  name text not null,
  role text not null check (role in ('admin', 'user')),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sections (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists models (
  id text primary key,
  section_id text not null references sections(id) on delete cascade,
  name text not null,
  code text not null,
  description text not null default '',
  dimensions text not null default '',
  length_mm integer not null default 0,
  width_mm integer not null default 0,
  height_mm integer not null default 0,
  material text not null default '',
  weight_kg numeric(12, 2) not null default 0,
  recommended_box text not null default '',
  model_path text not null,
  source_file_name text not null,
  primitive text not null check (primitive in ('box', 'cylinder', 'radar', 'support')),
  created_at timestamptz not null default now()
);

create index if not exists idx_models_section_id on models(section_id);
create index if not exists idx_models_model_path on models(model_path);

alter table users add column if not exists subdivision text not null default 'ogk';
alter table models add column if not exists length_mm integer not null default 0;
alter table models add column if not exists width_mm integer not null default 0;
alter table models add column if not exists height_mm integer not null default 0;
alter table models add column if not exists recommended_box text not null default '';
