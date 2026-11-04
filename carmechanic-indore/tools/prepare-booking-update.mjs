// Make the dashboard deployment self-contained, while keeping handler tests on the source module.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const handler=await readFile(new URL('supabase/functions/submit-booking/handler.mjs',root),'utf8');
const entry=await readFile(new URL('supabase/functions/submit-booking/index.ts',root),'utf8');
const marker='import { createHandler } from "./handler.mjs";';
if(!entry.includes(marker))throw new Error('Booking handler import changed; inspect the deployment bundle generator.');
const result='// Car Repair Wala 2.3.0 — self-contained submit-booking function.\n// Uses the existing project secrets and database; no migration is required.\n'+entry.replace(marker,handler.replace(/^export /gm,''));
await mkdir(new URL('docs/deploy/',root),{recursive:true});
await writeFile(new URL('docs/deploy/submit-booking-v2.3.0.ts',root),result);
console.log('Prepared docs/deploy/submit-booking-v2.3.0.ts for the existing Supabase function.');
