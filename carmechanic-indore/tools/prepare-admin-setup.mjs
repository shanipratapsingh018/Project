// Combine the reviewed initial migrations for the owner's SQL Editor.
// This contains schema/policies only; it never creates accounts or stores keys.
import { readFile, readdir, writeFile } from "node:fs/promises";
const directory = new URL("../supabase/migrations/", import.meta.url);
const files = (await readdir(directory)).filter(name => name.endsWith(".sql")).sort();
let sql = `-- Garagewala: initial database setup for a NEW Supabase project.
-- Target project: oraooxeefxcwmwgycrei
-- Run in Supabase Dashboard > SQL Editor, as the project administrator.
-- If the two initial migrations have already succeeded, DO NOT run again.
-- This script creates no owner account and does not enable website intake.
-- Generated from supabase/migrations; edit the migrations, then regenerate.
\n`;
for (const name of files) {
  sql += `\n-- Source: ${name}\n` + await readFile(new URL(name, directory), "utf8") + "\n";
}
sql += `\n-- Both transactions finished. Create your owner account in Authentication,
-- then run bootstrap-owner.sql with that account's User UID.
select 'Database setup complete. Owner account setup is still required.' as next_step;\n`;
await writeFile(new URL("../supabase/setup-admin.sql", import.meta.url), sql);
console.log(`Prepared one SQL Editor file from ${files.length} migrations.`);
