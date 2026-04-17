create table if not exists share_links (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique,
  project_id    uuid not null references projects(id) on delete cascade,
  document_type text not null check (document_type in ('sow', 'srs')),
  draft_id      uuid not null,
  draft_name    text not null default '',
  project_name  text not null default '',
  created_by    text not null default '',
  expires_at    timestamptz,
  view_count    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists share_links_token_idx on share_links(token);
create index if not exists share_links_project_id_idx on share_links(project_id);
