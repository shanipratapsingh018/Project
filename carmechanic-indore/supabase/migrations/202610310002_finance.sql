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
