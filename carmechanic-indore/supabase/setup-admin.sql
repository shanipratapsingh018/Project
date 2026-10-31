-- Garagewala: initial database setup for a NEW Supabase project.
-- Target project: oraooxeefxcwmwgycrei
-- Run in Supabase Dashboard > SQL Editor, as the project administrator.
-- If the two initial migrations have already succeeded, DO NOT run again.
-- This script creates no owner account and does not enable website intake.
-- Generated from supabase/migrations; edit the migrations, then regenerate.


-- Source: 202610310001_admin.sql
-- Garagewala owner workspace. Run in a dedicated Supabase project.
-- No browser account can grant itself ownership. Bootstrap the owner separately.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table private.owner_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.owner_access enable row level security;
revoke all on private.owner_access from public, anon, authenticated;

create function private.is_owner() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from private.owner_access where user_id = (select auth.uid()));
$$;
revoke all on function private.is_owner() from public;
grant execute on function private.is_owner() to authenticated;
create function private.require_owner() returns void language plpgsql security definer
set search_path = '' as $$ begin
  if not private.is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
end; $$;
revoke all on function private.require_owner() from public;
create function public.admin_access() returns boolean language sql stable security invoker
set search_path = '' as $$ select private.is_owner(); $$;
revoke all on function public.admin_access() from public, anon;
grant execute on function public.admin_access() to authenticated;

create function private.valid_gstin(value text) returns boolean language plpgsql immutable
set search_path = '' as $$
declare alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; total integer := 0; n integer; v integer; i integer;
begin
  if value is null then return false; end if;
  if value !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then return false; end if;
  for i in 1..14 loop
    v := strpos(alphabet, substr(value,i,1))-1;
    n := v * case when i % 2 = 0 then 2 else 1 end;
    total := total + n/36 + n%36;
  end loop;
  return substr(value,15,1) = substr(alphabet, ((36-total%36)%36)+1, 1);
end; $$;
revoke all on function private.valid_gstin(text) from public;
grant execute on function private.valid_gstin(text) to authenticated;

create table public.garage_profile (
  id boolean primary key default true check(id),
  invoice_name text not null default 'Garagewala' check(char_length(invoice_name) between 2 and 120),
  address text not null default '' check(char_length(address)<=600),
  phone text not null default '8965957978' check(phone ~ '^[6-9][0-9]{9}$'),
  state_code text not null default '23' check(state_code ~ '^[0-9]{2}$' and state_code::int between 1 and 38),
  gstin text check(gstin is null or private.valid_gstin(gstin)),
  invoice_prefix text not null default 'GW' check(invoice_prefix ~ '^[A-Z0-9-]{1,8}$'),
  invoice_footer text not null default 'Thank you for choosing Garagewala.' check(char_length(invoice_footer)<=500),
  billing_ready boolean not null default false,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  check(gstin is null or substr(gstin,1,2)=state_code),
  check(not billing_ready or char_length(btrim(address))>=5)
);
insert into public.garage_profile(id) values(true);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(btrim(name)) between 2 and 120),
  mobile text not null unique check(mobile ~ '^[6-9][0-9]{9}$'),
  email text not null default '' check(char_length(email)<=180),
  address text not null default '' check(char_length(address)<=600),
  state_code text not null default '23' check(state_code ~ '^[0-9]{2}$' and state_code::int between 1 and 38),
  gstin text check(gstin is null or private.valid_gstin(gstin)),
  notes text not null default '' check(char_length(notes)<=2000),
  archived boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(gstin is null or substr(gstin,1,2)=state_code)
);
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  make text not null default '' check(char_length(make)<=60),
  model text not null check(char_length(btrim(model)) between 1 and 80),
  registration text check(registration is null or registration ~ '^[A-Z0-9 -]{3,20}$'),
  year integer check(year between 1950 and 2100),
  fuel text not null default 'other' check(fuel in ('petrol','diesel','cng','electric','hybrid','other')),
  notes text not null default '' check(char_length(notes)<=1000),
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(customer_id, registration)
);
create sequence private.booking_ref_seq;
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique,
  reference text not null unique default ('GW-B'||lpad(nextval('private.booking_ref_seq')::text,6,'0')),
  customer_id uuid references public.customers(id), vehicle_id uuid references public.vehicles(id),
  name text not null check(char_length(btrim(name)) between 2 and 120),
  mobile text not null check(mobile ~ '^[6-9][0-9]{9}$'),
  make text not null default '' check(char_length(make)<=60),
  model text not null check(char_length(btrim(model)) between 1 and 80),
  registration text check(registration is null or registration ~ '^[A-Z0-9 -]{3,20}$'),
  year integer check(year between 1950 and 2100),
  fuel text not null default 'other' check(fuel in ('petrol','diesel','cng','electric','hybrid','other')),
  services text[] not null default '{}' check(cardinality(services)<=30),
  notes text not null default '' check(char_length(notes)<=3000),
  source text not null default 'walk_in' check(source in ('website','call','whatsapp','walk_in')),
  contact_method text not null default 'whatsapp' check(contact_method in ('call','whatsapp')),
  preferred_date date, preferred_time text not null default '' check(char_length(preferred_time)<=60),
  pickup boolean not null default false,
  address text not null default '' check(char_length(address)<=600),
  pin text not null default '' check(pin='' or pin ~ '^[1-9][0-9]{5}$'),
  estimate_text text not null default '' check(char_length(estimate_text)<=160),
  status text not null default 'new' check(status in ('new','confirmed','in_progress','ready','delivered','cancelled')),
  request_payload jsonb not null default '{}' check(octet_length(request_payload::text)<=20000),
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(not pickup or (char_length(btrim(address))>=5 and pin ~ '^[1-9][0-9]{5}$'))
);
create function private.valid_tasks(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare t jsonb; begin
  if jsonb_typeof(value) is distinct from 'array' then return false; end if;
  if jsonb_array_length(value)>50 then return false; end if;
  for t in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(t) is distinct from 'object' or jsonb_typeof(t->'description') is distinct from 'string'
      or char_length(btrim(t->>'description')) not between 1 and 200
      or jsonb_typeof(t->'done') is distinct from 'boolean' then return false; end if;
  end loop;
  return true;
end; $$;
revoke all on function private.valid_tasks(jsonb) from public;
grant execute on function private.valid_tasks(jsonb) to authenticated;
create sequence private.job_ref_seq;
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('GW-J'||lpad(nextval('private.job_ref_seq')::text,6,'0')),
  booking_id uuid unique references public.bookings(id),
  customer_id uuid not null references public.customers(id), vehicle_id uuid references public.vehicles(id),
  status text not null default 'new' check(status in ('new','inspection','awaiting_approval','in_progress','ready','delivered','cancelled')),
  services text[] not null default '{}' check(cardinality(services)<=30),
  tasks jsonb not null default '[]' check(private.valid_tasks(tasks)),
  notes text not null default '' check(char_length(notes)<=5000),
  quote_paise bigint check(quote_paise between 0 and 10000000000),
  approval text not null default 'pending' check(approval in ('pending','approved','declined')),
  approval_note text not null default '' check(char_length(approval_note)<=1000),
  target_date date,
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(status not in ('in_progress','ready','delivered') or approval='approved')
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id), vehicle_id uuid references public.vehicles(id),
  job_id uuid references public.jobs(id),
  status text not null default 'draft' check(status in ('draft','issued','void')),
  number text unique,
  issue_date date not null default (now() at time zone 'Asia/Kolkata')::date,
  due_date date,
  tax_mode text not null default 'none' check(tax_mode in ('none','cgst_sgst','igst')),
  supply_state text not null default '23' check(supply_state ~ '^[0-9]{2}$' and supply_state::int between 1 and 38),
  supplier_snapshot jsonb, buyer_snapshot jsonb, vehicle_snapshot jsonb,
  subtotal_paise bigint not null default 0 check(subtotal_paise>=0),
  discount_paise bigint not null default 0 check(discount_paise>=0),
  cgst_paise bigint not null default 0 check(cgst_paise>=0),
  sgst_paise bigint not null default 0 check(sgst_paise>=0),
  igst_paise bigint not null default 0 check(igst_paise>=0),
  total_paise bigint not null default 0 check(total_paise between 0 and 10000000000),
  notes text not null default '' check(char_length(notes)<=2000),
  issued_at timestamptz, voided_at timestamptz,
  void_reason text check(char_length(void_reason)<=1000),
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(due_date is null or due_date>=issue_date),
  check(status='draft' or (number is not null and issued_at is not null)),
  check(status<>'void' or (voided_at is not null and char_length(btrim(void_reason))>=5))
);
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
  position integer not null check(position between 1 and 50),
  description text not null check(char_length(btrim(description)) between 1 and 200),
  hsn_sac text not null default '' check(hsn_sac='' or hsn_sac ~ '^[0-9]{4,8}$'),
  quantity numeric(10,3) not null check(quantity>0 and quantity<=1000),
  unit_price_paise bigint not null check(unit_price_paise between 0 and 1000000000),
  base_paise bigint not null check(base_paise>=0),
  discount_paise bigint not null default 0 check(discount_paise between 0 and base_paise),
  tax_bps integer not null default 0 check(tax_bps in (0,500,1200,1800,2800)),
  cgst_paise bigint not null default 0 check(cgst_paise>=0),
  sgst_paise bigint not null default 0 check(sgst_paise>=0),
  igst_paise bigint not null default 0 check(igst_paise>=0),
  total_paise bigint not null check(total_paise>=0), unique(invoice_id,position)
);
create table private.invoice_counters(financial_year text primary key, last_number integer not null check(last_number>0));
revoke all on private.invoice_counters from public, anon, authenticated;
create table public.payments (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id),
  request_id uuid not null unique,
  amount_paise bigint not null check(amount_paise>0 and amount_paise<=10000000000),
  method text not null check(method in ('cash','upi','bank','card','other')),
  reference text not null default '' check(char_length(reference)<=160),
  paid_on date not null default (now() at time zone 'Asia/Kolkata')::date,
  note text not null default '' check(char_length(note)<=1000),
  voided_at timestamptz, void_reason text check(char_length(void_reason)<=1000),
  created_at timestamptz not null default now(),
  check(voided_at is null or char_length(btrim(void_reason))>=5)
);
create table public.job_files (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id),
  object_path text not null unique check(object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$'),
  label text not null check(char_length(label) between 1 and 160),
  mime text not null check(mime in ('image/jpeg','image/png','image/webp','application/pdf')),
  bytes integer not null check(bytes between 1 and 4194304), created_at timestamptz not null default now(),
  check(split_part(object_path,'/',1)=job_id::text)
);
create table public.audit_events (
  id bigint generated always as identity primary key, actor uuid, entity text not null,
  entity_id text not null, action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);

create function private.touch_row() returns trigger language plpgsql set search_path='' as $$ begin
  new.version:=old.version+1; new.updated_at:=now(); return new;
end; $$;
create function private.check_vehicle() returns trigger language plpgsql set search_path='' as $$ begin
  if new.vehicle_id is not null and not exists(select 1 from public.vehicles where id=new.vehicle_id and customer_id=new.customer_id) then
    raise exception 'Vehicle does not belong to the selected customer' using errcode='23514';
  end if; return new;
end; $$;
create function private.audit_row() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb:=to_jsonb(new); begin
  insert into public.audit_events(actor,entity,entity_id,action,details)
  values(auth.uid(),tg_table_name,coalesce(d->>'id',''),tg_op,
    jsonb_strip_nulls(jsonb_build_object('status',d->'status','version',d->'version','amount_paise',d->'amount_paise','total_paise',d->'total_paise','voided_at',d->'voided_at','void_reason',d->'void_reason')));
  return new;
end; $$;
revoke all on function private.touch_row(), private.check_vehicle(), private.audit_row() from public;
do $$ declare t text; begin
  foreach t in array array['garage_profile','customers','vehicles','bookings','jobs','invoices'] loop
    execute format('create trigger touch_row before update on public.%I for each row execute function private.touch_row()',t);
  end loop;
  foreach t in array array['bookings','jobs','invoices'] loop
    execute format('create trigger check_vehicle before insert or update on public.%I for each row execute function private.check_vehicle()',t);
  end loop;
  foreach t in array array['garage_profile','customers','vehicles','bookings','jobs','invoices','payments'] loop
    execute format('create trigger audit_row after insert or update on public.%I for each row execute function private.audit_row()',t);
  end loop;
end; $$;

-- All browser-facing data is private. Financial writes are RPC-only.
do $$ declare t text; begin
  foreach t in array array['garage_profile','customers','vehicles','bookings','jobs','invoices','invoice_items','payments','job_files','audit_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy owner_read on public.%I for select to authenticated using ((select private.is_owner()))',t);
  end loop;
  foreach t in array array['customers','vehicles','bookings','jobs','job_files'] loop
    execute format('grant insert, update on public.%I to authenticated',t);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select private.is_owner()))',t);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select private.is_owner())) with check ((select private.is_owner()))',t);
  end loop;
end; $$;
grant update on public.garage_profile to authenticated;
create policy owner_update on public.garage_profile for update to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
grant delete on public.job_files to authenticated;
create policy owner_delete on public.job_files for delete to authenticated using ((select private.is_owner()));
grant usage on sequence private.booking_ref_seq, private.job_ref_seq to authenticated;

create index bookings_status_created on public.bookings(status,created_at desc);
create index jobs_customer on public.jobs(customer_id,created_at desc);
create index invoices_customer on public.invoices(customer_id,created_at desc);
create index payments_invoice on public.payments(invoice_id) where voided_at is null;
create index job_files_job on public.job_files(job_id);

create view public.admin_customers with(security_invoker=true) as
select c.*, (select count(*) from public.vehicles v where v.customer_id=c.id) vehicle_count,
  concat_ws(' ',c.name,c.mobile,(select string_agg(v.registration,' ') from public.vehicles v where v.customer_id=c.id)) search_text
from public.customers c;
create view public.admin_bookings with(security_invoker=true) as
select b.*, (select j.id from public.jobs j where j.booking_id=b.id) job_id,
 concat_ws(' ',b.reference,b.name,b.mobile,b.model,b.registration) search_text from public.bookings b;
create view public.admin_jobs with(security_invoker=true) as
select j.*, c.name customer_name,c.mobile,c.address customer_address,v.make,v.model,v.registration,
 concat_ws(' ',j.reference,c.name,c.mobile,v.model,v.registration) search_text
from public.jobs j join public.customers c on c.id=j.customer_id left join public.vehicles v on v.id=j.vehicle_id;
create view public.admin_invoices with(security_invoker=true) as
select i.*,c.name customer_name,c.mobile,v.make,v.model,v.registration,
 coalesce(p.paid_paise,0)::bigint paid_paise,
 case when i.status='issued' then i.total_paise-coalesce(p.paid_paise,0) else 0 end::bigint due_paise,
 concat_ws(' ',i.number,c.name,c.mobile,v.registration) search_text
from public.invoices i join public.customers c on c.id=i.customer_id left join public.vehicles v on v.id=i.vehicle_id
left join lateral(select sum(amount_paise) paid_paise from public.payments where invoice_id=i.id and voided_at is null) p on true;
create view public.admin_payments with(security_invoker=true) as
select p.*,i.number invoice_number,c.name customer_name,c.mobile,
 concat_ws(' ',i.number,c.name,c.mobile,p.reference) search_text
from public.payments p join public.invoices i on i.id=p.invoice_id join public.customers c on c.id=i.customer_id;
grant select on public.admin_customers,public.admin_bookings,public.admin_jobs,public.admin_invoices,public.admin_payments to authenticated;
revoke all on public.admin_customers,public.admin_bookings,public.admin_jobs,public.admin_invoices,public.admin_payments from public,anon;

create function public.booking_to_job(p_booking uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.bookings; cid uuid; vid uuid; jid uuid;
begin
  perform private.require_owner();
  select * into b from public.bookings where id=p_booking for update;
  if not found then raise exception 'Booking not found'; end if;
  select id into jid from public.jobs where booking_id=b.id;
  if jid is not null then return jid; end if;
  if b.status='cancelled' then raise exception 'Reopen this booking before creating a job'; end if;
  insert into public.customers(name,mobile) values(b.name,b.mobile) on conflict(mobile) do nothing;
  select id into cid from public.customers where mobile=b.mobile;
  select id into vid from public.vehicles where customer_id=cid and
    ((b.registration is not null and registration=b.registration) or
     (b.registration is null and model=b.model and make=b.make and year is not distinct from b.year)) limit 1;
  if vid is null then
    insert into public.vehicles(customer_id,make,model,registration,year,fuel) values(cid,b.make,b.model,b.registration,b.year,b.fuel) returning id into vid;
  end if;
  insert into public.jobs(booking_id,customer_id,vehicle_id,services,notes) values(b.id,cid,vid,b.services,b.notes) returning id into jid;
  update public.bookings set customer_id=cid,vehicle_id=vid,status='confirmed' where id=b.id;
  return jid;
end; $$;
revoke all on function public.booking_to_job(uuid) from public,anon;
grant execute on function public.booking_to_job(uuid) to authenticated;

-- Public booking intake is callable by the Edge Function's service identity only.
create table private.booking_limits(key text not null,bucket timestamptz not null,hits integer not null,primary key(key,bucket));
revoke all on private.booking_limits from public,anon,authenticated;
create function public.submit_public_booking(p_request uuid,p_data jsonb,p_ip_key text,p_phone_key text) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.bookings; result uuid; k text; n integer; cap integer; hour_bucket timestamptz:=date_trunc('hour',now());
begin
  if p_request is null or p_ip_key !~ '^[0-9a-f]{64}$' or p_phone_key !~ '^[0-9a-f]{64}$' then raise exception 'Invalid request'; end if;
  perform pg_advisory_xact_lock(hashtextextended('booking:'||p_request::text,0));
  select * into existing from public.bookings where request_id=p_request;
  if found then
    if existing.request_payload<>p_data then raise exception 'REQUEST_CONFLICT'; end if;
    return existing.id;
  end if;
  if jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>16000 then raise exception 'Invalid request'; end if;
  foreach k in array array['global','ip:'||p_ip_key,'phone:'||p_phone_key] loop
    cap:=case when k='global' then 100 when k like 'ip:%' then 30 else 5 end;
    insert into private.booking_limits(key,bucket,hits) values(k,hour_bucket,1)
    on conflict(key,bucket) do update set hits=private.booking_limits.hits+1 returning hits into n;
    if n>cap then raise exception 'BOOKING_RATE_LIMIT'; end if;
  end loop;
  insert into public.bookings(request_id,name,mobile,make,model,registration,year,fuel,services,notes,source,contact_method,preferred_date,preferred_time,pickup,address,pin,estimate_text,request_payload)
  values(p_request,p_data->>'name',p_data->>'mobile',coalesce(p_data->>'brand',''),p_data->>'model',nullif(p_data->>'registration',''),
    nullif(p_data->>'year','')::int,coalesce(p_data->>'fuel','other'),array(select jsonb_array_elements_text(p_data->'services')),
    coalesce(p_data->>'notes',''),'website',coalesce(p_data->>'contactMethod','whatsapp'),nullif(p_data->>'date','')::date,coalesce(p_data->>'time',''),coalesce(p_data->>'pickup','no')='yes',
    coalesce(p_data->>'address',''),coalesce(p_data->>'pin',''),coalesce(p_data->>'estimate',''),p_data) returning id into result;
  delete from private.booking_limits where bucket<now()-interval '2 days';
  return result;
end; $$;
revoke all on function public.submit_public_booking(uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.submit_public_booking(uuid,jsonb,text,text) to service_role;

-- Private attachments: neither bucket nor object policies permit anonymous reads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('garagewala-private','garagewala-private',false,4194304,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=4194304,allowed_mime_types=excluded.allowed_mime_types;
create policy garage_owner_files on storage.objects for all to authenticated
using(bucket_id='garagewala-private' and (select private.is_owner()))
with check(bucket_id='garagewala-private' and (select private.is_owner()));
commit;


-- Source: 202610310002_finance.sql
begin;
-- No client-supplied total, invoice number or payment balance is trusted.
create function public.save_invoice(p_id uuid,p_version integer,p_data jsonb,p_items jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare inv public.invoices; profile public.garage_profile; item jsonb; pos integer:=0;
  qty numeric; price bigint; base bigint; disc bigint; rate integer; cg bigint; sg bigint; ig bigint;
  result uuid; mode text:=p_data->>'tax_mode';
begin
  perform private.require_owner();
  select * into profile from public.garage_profile where id;
  if mode is null or mode not in ('none','cgst_sgst','igst') then raise exception 'Choose a tax mode'; end if;
  if mode<>'none' and profile.gstin is null then raise exception 'Add your registered GSTIN before using GST'; end if;
  if mode='cgst_sgst' and p_data->>'supply_state'<>profile.state_code then raise exception 'Use IGST for interstate supply'; end if;
  if mode='igst' and p_data->>'supply_state'=profile.state_code then raise exception 'Use CGST + SGST for intrastate supply'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Invoice items required'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Add 1 to 50 items'; end if;
  if p_id is not null then
    select * into inv from public.invoices where id=p_id for update;
    if not found or inv.status<>'draft' then raise exception 'Only a draft invoice can be edited'; end if;
    if inv.version is distinct from p_version then raise exception 'Record changed. Reload before saving'; end if;
    result:=inv.id;
    update public.invoices set customer_id=(p_data->>'customer_id')::uuid,vehicle_id=nullif(p_data->>'vehicle_id','')::uuid,
      job_id=nullif(p_data->>'job_id','')::uuid,issue_date=(p_data->>'issue_date')::date,due_date=nullif(p_data->>'due_date','')::date,
      tax_mode=mode,supply_state=p_data->>'supply_state',notes=coalesce(p_data->>'notes','') where id=result;
    delete from public.invoice_items where invoice_id=result;
  else
    insert into public.invoices(customer_id,vehicle_id,job_id,issue_date,due_date,tax_mode,supply_state,notes)
    values((p_data->>'customer_id')::uuid,nullif(p_data->>'vehicle_id','')::uuid,nullif(p_data->>'job_id','')::uuid,
      (p_data->>'issue_date')::date,nullif(p_data->>'due_date','')::date,mode,p_data->>'supply_state',coalesce(p_data->>'notes','')) returning id into result;
  end if;
  if exists(select 1 from public.invoices i join public.jobs j on j.id=i.job_id where i.id=result and
    (j.customer_id<>i.customer_id or j.vehicle_id is distinct from i.vehicle_id)) then raise exception 'Job and invoice must refer to the same customer and vehicle'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    pos:=pos+1;
    if jsonb_typeof(item) is distinct from 'object' or (item->>'quantity') !~ '^[0-9]+(\.[0-9]{1,3})?$'
      or (item->>'unit_price_paise') !~ '^[0-9]+$' or (item->>'discount_paise') !~ '^[0-9]+$'
      or (item->>'tax_bps') !~ '^[0-9]+$' then raise exception 'Invalid item amounts'; end if;
    qty:=(item->>'quantity')::numeric; price:=(item->>'unit_price_paise')::bigint;
    base:=round(qty*price); disc:=(item->>'discount_paise')::bigint; rate:=(item->>'tax_bps')::integer;
    if mode='none' and rate<>0 then raise exception 'Tax must be zero in No GST mode'; end if;
    if rate>0 and coalesce(item->>'hsn_sac','') !~ '^[0-9]{4,8}$' then raise exception 'HSN/SAC required for taxable items'; end if;
    cg:=case when mode='cgst_sgst' then round((base-disc)::numeric*rate/20000) else 0 end;
    sg:=cg; ig:=case when mode='igst' then round((base-disc)::numeric*rate/10000) else 0 end;
    insert into public.invoice_items(invoice_id,position,description,hsn_sac,quantity,unit_price_paise,base_paise,discount_paise,tax_bps,cgst_paise,sgst_paise,igst_paise,total_paise)
    values(result,pos,item->>'description',coalesce(item->>'hsn_sac',''),qty,price,base,disc,rate,cg,sg,ig,base-disc+cg+sg+ig);
  end loop;
  update public.invoices set (subtotal_paise,discount_paise,cgst_paise,sgst_paise,igst_paise,total_paise)=
    (select sum(base_paise),sum(discount_paise),sum(cgst_paise),sum(sgst_paise),sum(igst_paise),sum(total_paise) from public.invoice_items where invoice_id=result)
    where id=result;
  return result;
end; $$;

create function public.issue_invoice(p_id uuid,p_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare inv public.invoices; profile public.garage_profile; buyer public.customers; yr integer; fy text; n integer;
begin
  perform private.require_owner();
  select * into inv from public.invoices where id=p_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if inv.status='issued' then return inv.id; end if;
  if inv.status<>'draft' then raise exception 'Only a draft can be issued'; end if;
  if inv.version is distinct from p_version then raise exception 'Record changed. Reload before issuing'; end if;
  select * into profile from public.garage_profile where id for share;
  select * into buyer from public.customers where id=inv.customer_id for share;
  if not profile.billing_ready then raise exception 'Complete invoice settings before issuing a bill'; end if;
  if char_length(btrim(buyer.address))<5 then raise exception 'Add the customer billing address before issuing'; end if;
  if inv.tax_mode<>'none' and (profile.gstin is null or buyer.state_code<>inv.supply_state) then raise exception 'Check GSTIN and customer supply state'; end if;
  if (inv.tax_mode='cgst_sgst' and inv.supply_state<>profile.state_code) or (inv.tax_mode='igst' and inv.supply_state=profile.state_code) then raise exception 'Tax mode does not match supply state'; end if;
  if not exists(select 1 from public.invoice_items where invoice_id=inv.id) then raise exception 'Invoice items required'; end if;
  yr:=extract(year from inv.issue_date)::int-case when extract(month from inv.issue_date)<4 then 1 else 0 end;
  fy:=yr::text||'-'||right((yr+1)::text,2);
  insert into private.invoice_counters(financial_year,last_number) values(fy,1)
    on conflict(financial_year) do update set last_number=private.invoice_counters.last_number+1 returning last_number into n;
  if inv.tax_mode<>'none' and char_length(profile.invoice_prefix)+char_length(fy)+2+greatest(4,char_length(n::text))>16 then
    raise exception 'GST invoice number exceeds 16 characters. Use a shorter invoice prefix'; end if;
  update public.invoices set status='issued',number=profile.invoice_prefix||'/'||fy||'/'||lpad(n::text,greatest(4,char_length(n::text)),'0'),issued_at=now(),
    supplier_snapshot=jsonb_build_object('name',profile.invoice_name,'address',profile.address,'phone',profile.phone,'gstin',profile.gstin,'state_code',profile.state_code,'footer',profile.invoice_footer),
    buyer_snapshot=jsonb_build_object('name',buyer.name,'mobile',buyer.mobile,'address',buyer.address,'gstin',buyer.gstin,'state_code',buyer.state_code),
    vehicle_snapshot=(select jsonb_build_object('make',make,'model',model,'registration',registration) from public.vehicles where id=inv.vehicle_id)
    where id=inv.id;
  return inv.id;
end; $$;

create function public.record_payment(p_invoice uuid,p_request uuid,p_amount bigint,p_method text,p_reference text,p_date date,p_note text) returns uuid
language plpgsql security definer set search_path='' as $$
declare inv public.invoices; existing public.payments; paid bigint; result uuid;
begin
  perform private.require_owner();
  if p_request is null then raise exception 'Payment request ID required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('payment:'||p_request::text,0));
  select * into existing from public.payments where request_id=p_request;
  if found then
    if existing.invoice_id is distinct from p_invoice or existing.amount_paise is distinct from p_amount or
      existing.method is distinct from p_method or existing.reference is distinct from p_reference or existing.paid_on is distinct from p_date or existing.note is distinct from p_note then
      raise exception 'Payment request already used with different details'; end if;
    return existing.id;
  end if;
  select * into inv from public.invoices where id=p_invoice for update;
  if not found or inv.status<>'issued' then raise exception 'Payment requires an issued invoice'; end if;
  select coalesce(sum(amount_paise),0) into paid from public.payments where invoice_id=p_invoice and voided_at is null;
  if p_amount is null or p_amount<=0 or p_amount>inv.total_paise-paid then raise exception 'Payment exceeds balance or is not positive'; end if;
  if p_date is null or p_date>(now() at time zone 'Asia/Kolkata')::date then raise exception 'Use the actual payment date, not a future date'; end if;
  insert into public.payments(invoice_id,request_id,amount_paise,method,reference,paid_on,note)
  values(p_invoice,p_request,p_amount,p_method,p_reference,p_date,p_note) returning id into result;
  return result;
end; $$;

create function public.reverse_payment(p_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare pid uuid; begin
  perform private.require_owner();
  if char_length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise exception 'Enter a reason of 5 to 1000 characters'; end if;
  select invoice_id into pid from public.payments where id=p_id;
  perform 1 from public.invoices where id=pid for update;
  update public.payments set voided_at=now(),void_reason=p_reason where id=p_id and voided_at is null;
  if not exists(select 1 from public.payments where id=p_id) then raise exception 'Payment not found'; end if;
  return p_id;
end; $$;

create function public.void_invoice(p_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare inv public.invoices; begin
  perform private.require_owner();
  if char_length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise exception 'Enter a reason of 5 to 1000 characters'; end if;
  select * into inv from public.invoices where id=p_id for update;
  if not found or inv.status<>'issued' then raise exception 'Only an issued invoice can be voided'; end if;
  if exists(select 1 from public.payments where invoice_id=p_id and voided_at is null) then raise exception 'Resolve recorded payments before voiding'; end if;
  update public.invoices set status='void',void_reason=p_reason,voided_at=now() where id=p_id;
  return p_id;
end; $$;

create function public.admin_summary() returns jsonb language plpgsql security definer set search_path='' as $$
declare today date:=(now() at time zone 'Asia/Kolkata')::date; begin
  perform private.require_owner();
  return jsonb_build_object(
    'customers',(select count(*) from public.customers where not archived),
    'new_bookings',(select count(*) from public.bookings where status='new'),
    'active_jobs',(select count(*) from public.jobs where status not in ('delivered','cancelled')),
    'collected_today',(select coalesce(sum(amount_paise),0) from public.payments where voided_at is null and paid_on=today),
    'collected_month',(select coalesce(sum(amount_paise),0) from public.payments where voided_at is null and paid_on>=date_trunc('month',today)::date and paid_on<=today),
    'outstanding',(select coalesce(sum(due_paise),0) from public.admin_invoices where status='issued'),
    'today',today);
end; $$;

revoke all on function public.save_invoice(uuid,integer,jsonb,jsonb),public.issue_invoice(uuid,integer),
 public.record_payment(uuid,uuid,bigint,text,text,date,text),public.reverse_payment(uuid,text),public.void_invoice(uuid,text),public.admin_summary() from public,anon;
grant execute on function public.save_invoice(uuid,integer,jsonb,jsonb),public.issue_invoice(uuid,integer),
 public.record_payment(uuid,uuid,bigint,text,text,date,text),public.reverse_payment(uuid,text),public.void_invoice(uuid,text),public.admin_summary() to authenticated;
commit;


-- Both transactions finished. Create your owner account in Authentication,
-- then run bootstrap-owner.sql with that account's User UID.
select 'Database setup complete. Owner account setup is still required.' as next_step;
