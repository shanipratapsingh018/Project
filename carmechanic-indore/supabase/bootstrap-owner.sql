-- Run AFTER creating your owner account in Supabase Authentication > Users.
-- Replace this placeholder with that account's User UID, not its email/password.
-- This file is for the SQL Editor as project administrator, never the browser.
insert into private.owner_access(user_id)
values ('REPLACE_WITH_OWNER_USER_UUID'::uuid)
on conflict(user_id) do nothing;
