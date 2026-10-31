import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const env = { ...process.env };
for (const key of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete env[key];
const container = process.env.GW_TEST_CONTAINER || "garagewala-db-test";
let db = "postgres";
function sql(query) {
  return new Promise((resolve, reject) => {
    const p = spawn(
      "docker",
      [
        "--host=unix:///var/run/docker.sock",
        "exec",
        "-i",
        container,
        "psql",
        "-U",
        "postgres",
        "-d",
        db,
        "-v",
        "ON_ERROR_STOP=1",
        "-Atq",
      ],
      { env },
    );
    let out = "",
      err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) =>
      code ? reject(new Error(err.trim())) : resolve(out.trim()),
    );
    p.stdin.end(query);
  });
}
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const customer = "33333333-3333-4333-8333-333333333333",
  vehicle = "44444444-4444-4444-8444-444444444444";
const as = (q, id = owner) =>
  sql(
    `begin; set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true); ${q}; commit;`,
  ).then((s) => s.split("\n").slice(1).join("\n"));
let checks = 0;
function ok(value, expected) {
  assert.deepEqual(value, expected);
  checks++;
}
async function denied(p, pattern) {
  await assert.rejects(p, pattern);
  checks++;
}
const dbName = "gw_test_" + Date.now();
await sql(`create database ${dbName}`);
db = dbName;
await sql(`do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; end if; end $$;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;`);
const dir = new URL("../../supabase/migrations/", import.meta.url);
for (const file of (await readdir(dir))
  .filter((f) => f.endsWith(".sql"))
  .sort())
  await sql(await readFile(new URL(file, dir), "utf8"));
await sql(
  `insert into auth.users values('${owner}'),('${other}'); insert into private.owner_access(user_id) values('${owner}');`,
);
ok(await as("select public.admin_access()"), "t");
ok(await as("select public.admin_access()", other), "f");
await denied(
  sql("set role anon; select * from public.customers"),
  /permission denied/,
);
ok(await as("select count(*) from public.garage_profile", other), "0");
await denied(
  as(`insert into private.owner_access(user_id) values('${other}')`, other),
  /permission denied/,
);
await denied(
  as(
    `insert into public.customers(name,mobile) values('Blocked user','9000000000')`,
    other,
  ),
  /row-level security/,
);
await as(`insert into public.customers(id,name,mobile,address) values('${customer}','Test Customer','9000000000','Test billing address');
insert into public.vehicles(id,customer_id,model,registration) values('${vehicle}','${customer}','Test car','MP09TEST');
update public.garage_profile set address='Test garage address',billing_ready=true where id`);
ok(await as("select count(*) from public.customers"), "1");
ok(await as("select count(*) from public.admin_customers", other), "0");
await denied(
  as(`insert into public.invoices(customer_id) values('${customer}')`),
  /permission denied/,
);
await denied(
  as(
    `insert into public.jobs(customer_id,tasks) values('${customer}','[{"done":false}]')`,
  ),
  /check constraint/,
);
await denied(
  as(
    `insert into public.jobs(customer_id,status) values('${customer}','in_progress')`,
  ),
  /check constraint/,
);
const data = {
  customer_id: customer,
  vehicle_id: vehicle,
  issue_date: "2026-10-31",
  due_date: "",
  tax_mode: "none",
  supply_state: "23",
  notes: "Test bill",
};
const items = [
  {
    description: "Oil service",
    hsn_sac: "",
    quantity: "1.125",
    unit_price_paise: 9999,
    discount_paise: 100,
    tax_bps: 0,
  },
];
const json = (x) => `'${JSON.stringify(x).replaceAll("'", "''")}'::jsonb`;
const save = (id = null, version = null, d = data, it = items) =>
  as(
    `select public.save_invoice(${id ? `'${id}'` : "null"},${version ?? "null"},${json(d)},${json(it)})`,
  );
const invoice = await save();
ok(
  await as(`select total_paise from public.invoices where id='${invoice}'`),
  "11149",
);
await denied(save(invoice, 1), /Record changed/);
await denied(
  save(null, null, { ...data, tax_mode: "igst", supply_state: "27" }),
  /GSTIN/,
);
await denied(
  save(null, null, data, [{ ...items[0], discount_paise: 99999999 }]),
  /check constraint/,
);
let version = await as(
  `select version from public.invoices where id='${invoice}'`,
);
ok(await as(`select public.issue_invoice('${invoice}',${version})`), invoice);
ok(await as(`select public.issue_invoice('${invoice}',${version})`), invoice);
ok(
  await as(`select number from public.invoices where id='${invoice}'`),
  "GW/2026-27/0001",
);
await denied(save(invoice, version), /Only a draft/);
await denied(
  as(`update public.invoices set total_paise=1 where id='${invoice}'`),
  /permission denied/,
);
const req = "55555555-5555-4555-8555-555555555555";
const pay = (amount, request = req) =>
  as(
    `select public.record_payment('${invoice}','${request}',${amount},'cash','','2026-10-31','Received at workshop')`,
  );
const payment = await pay(1000);
ok(await pay(1000), payment);
await denied(pay(1001), /different details/);
ok(
  await as(`select due_paise from public.admin_invoices where id='${invoice}'`),
  "10149",
);
await denied(
  pay(10150, "66666666-6666-4666-8666-666666666666"),
  /exceeds balance/,
);
await denied(
  as(`select public.void_invoice('${invoice}','Duplicate entry')`),
  /Resolve recorded payments/,
);
const concurrent = await Promise.allSettled([
  pay(10149, "77777777-7777-4777-8777-777777777777"),
  pay(10149, "88888888-8888-4888-8888-888888888888"),
]);
ok(concurrent.filter((r) => r.status === "fulfilled").length, 1);
ok(
  await as(`select due_paise from public.admin_invoices where id='${invoice}'`),
  "0",
);
await as(`select public.reverse_payment('${payment}','Wrong ledger entry')`);
ok(
  await as(`select due_paise from public.admin_invoices where id='${invoice}'`),
  "1000",
);
await denied(as(`select public.admin_summary()`, other), /Owner access/);
await denied(
  as(
    `select public.save_invoice(null,null,${json(data)},${json(items)})`,
    other,
  ),
  /Owner access/,
);
ok(await as("select (public.admin_summary()->>'customers')::int"), "1");
await denied(
  as(
    `insert into storage.objects(bucket_id,name) values('garagewala-private','x')`,
    other,
  ),
  /row-level security/,
);
await as(
  `insert into storage.objects(bucket_id,name) values('garagewala-private','x')`,
);
ok(await sql(`set role anon; select count(*) from storage.objects`), "0");
ok(await as("select count(*) from storage.objects", other), "0");
await denied(
  as(
    `select public.submit_public_booking('${req}','{}','${"a".repeat(64)}','${"b".repeat(64)}')`,
  ),
  /permission denied/,
);
const b = {
  name: "Test Booking",
  mobile: "9000000001",
  model: "Test car",
  brand: "Test",
  fuel: "petrol",
  services: ["Oil change"],
  pickup: "no",
};
const submit = (rid, body = b) =>
  sql(
    `set role service_role; select public.submit_public_booking('${rid}',${json(body)},'${"a".repeat(64)}','${"b".repeat(64)}')`,
  );
const bid = await submit(req);
ok(await submit(req), bid);
await denied(
  submit(req, { ...b, name: "Changed booking" }),
  /REQUEST_CONFLICT/,
);
for (let i = 1; i < 5; i++)
  await submit(`99999999-9999-4999-8999-${String(i).padStart(12, "0")}`);
await denied(
  submit("99999999-9999-4999-8999-000000000005"),
  /BOOKING_RATE_LIMIT/,
);
const jid = await as(`select public.booking_to_job('${bid}')`);
ok(await as(`select public.booking_to_job('${bid}')`), jid);
ok(
  await as(`select count(*) from public.audit_events where entity='payments'`),
  "3",
);
// Check GST splitting, historical snapshots and concurrent financial-year numbering.
function gst(base) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = alphabet.indexOf(base[i]) * (i % 2 === 1 ? 2 : 1);
    sum += Math.floor(n / 36) + (n % 36);
  }
  return base + alphabet[(36 - (sum % 36)) % 36];
}
const gstin = gst("23ABCDE1234F1Z");
await as(`update public.garage_profile set gstin='${gstin}' where id`);
const local = await save(null, null, { ...data, tax_mode: "cgst_sgst" }, [
  { ...items[0], tax_bps: 1800, hsn_sac: "998714" },
]);
ok(
  await as(
    `select cgst_paise||','||sgst_paise||','||total_paise from public.invoices where id='${local}'`,
  ),
  "1003,1003,13155",
);
await denied(
  save(null, null, { ...data, tax_mode: "cgst_sgst" }, [
    { ...items[0], tax_bps: 1800, hsn_sac: "" },
  ]),
  /HSN/,
);
const second = await save();
const versions = await Promise.all(
  [local, second].map((id) =>
    as(`select version from public.invoices where id='${id}'`),
  ),
);
await Promise.all(
  [local, second].map((id, n) =>
    as(`select public.issue_invoice('${id}',${versions[n]})`),
  ),
);
ok(
  await as(
    `select count(distinct number) from public.invoices where status='issued'`,
  ),
  "3",
);
await as(
  `update public.customers set name='Changed after issue',address='Changed after issue',state_code='27' where id='${customer}'`,
);
ok(
  await as(
    `select buyer_snapshot->>'name' from public.invoices where id='${invoice}'`,
  ),
  "Test Customer",
);
const interstate = await save(
  null,
  null,
  { ...data, tax_mode: "igst", supply_state: "27" },
  [{ ...items[0], tax_bps: 1800, hsn_sac: "998714" }],
);
ok(
  await as(
    `select igst_paise||','||total_paise from public.invoices where id='${interstate}'`,
  ),
  "2007,13156",
);
await denied(
  as(
    `update public.invoice_items set total_paise=1 where invoice_id='${local}'`,
  ),
  /permission denied/,
);
await denied(
  as(`delete from public.payments where invoice_id='${invoice}'`),
  /permission denied/,
);
ok(
  await as(
    `update public.garage_profile set invoice_name='Blocked' where id returning invoice_name`,
    other,
  ),
  "",
);
ok(
  await as("select invoice_name from public.garage_profile where id"),
  "Garagewala",
);
console.log(
  `${checks} database checks passed: owner isolation, private files, invoices, payment races, booking replay and limits.`,
);
