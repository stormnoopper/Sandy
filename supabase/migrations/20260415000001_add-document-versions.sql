create table if not exists document_versions (
  id              uuid primary key default gen_random_uuid(),
  draft_id        uuid not null,
  draft_type      text not null check (draft_type in ('sow', 'srs')),
  project_id      uuid not null references projects(id) on delete cascade,
  content         text not null,
  label           text not null default '',
  created_by_name text,
  created_at      timestamptz not null default now()
);

create index if not exists document_versions_draft_id_idx on document_versions(draft_id);
create index if not exists document_versions_project_id_idx on document_versions(project_id);
