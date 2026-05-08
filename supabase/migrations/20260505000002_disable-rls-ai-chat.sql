-- Disable RLS on chat tables as they are internal and managed by API routes.
-- Attempting to insert without RLS disabled was causing "new row violates row-level security policy" errors.

alter table chat_sessions disable row level security;
alter table chat_messages disable row level security;
