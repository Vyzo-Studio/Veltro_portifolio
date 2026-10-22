-- GNG V4 read/write integration regression. NEVER remove BEGIN/ROLLBACK.
-- Requires an empty production booking/payment dataset; refuse otherwise.
-- It creates temporary data within a single transaction, and always rolls it back.
begin;
do $pre$
begin
 if (select count(*) from public.bookings)<>0 or
    (select count(*) from public.payment_transactions)<>0
 then raise exception 'Integration test requires isolated empty data; use a staging project.'; end if;
end $pre$;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from public.admin_users where active limit 1),true);
select set_config('request.jwt.claims',json_build_object(
 'sub',(select auth_user_id::text from public.admin_users where active limit 1),
 'role','authenticated',
 'email',(select email from public.admin_users where active limit 1))::text,true);
do $qa$
declare
 v_date date;
 v_barber uuid:=(select id from public.barbers where active order by id limit 1);
 v_booking uuid;
 v_second uuid;
 v_idempotency uuid:=gen_random_uuid();
 v_fail boolean;
 v_reconciliation jsonb;
 v_original integer;
begin
 if not public.is_gng_admin() then raise exception 'Admin UID not authorized'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 if public.is_gng_admin() then raise exception 'Unknown UID incorrectly authorized';end if;
 perform set_config('request.jwt.claim.sub',(select auth_user_id::text from public.admin_users where active limit 1),true);
 select d::date into v_date from generate_series(
  timezone('America/Sao_Paulo',now())::date-30,
  timezone('America/Sao_Paulo',now())::date-2,
  interval '1 day') d
 where extract(isodow from d)::integer < 7 and
   not exists(select 1 from public.cash_sessions c where c.business_date=d::date)
 order by d desc limit 1;
 if v_date is null or v_barber is null then raise exception 'No test date/barber available';end if;
 insert into public.cash_sessions(business_date,status,opening_amount_cents,opened_at,opened_by)
 values(v_date,'open',0,now(),'qa:v4:rollback');
 v_fail:=false;
 begin
   perform public.admin_create_manual_booking_split_v1(
     'Cliente QA inválido',null,'Corte',v_barber,v_date,time '12:00',
     true,'{"cash":2000,"pix":900}'::jsonb,2500,v_date,true,gen_random_uuid());
 exception when others then v_fail:=true; end;
 if not v_fail then raise exception 'Wrong split amount unexpectedly accepted'; end if;
 v_booking:=public.admin_create_manual_booking_split_v1(
   'Cliente QA validado',null,'Corte',v_barber,v_date,time '12:00',
   true,'{"cash":2000,"pix":1000}'::jsonb,2500,v_date,true,v_idempotency);
 if public.admin_create_manual_booking_split_v1(
   'Cliente QA validado',null,'Corte',v_barber,v_date,time '12:00',
   true,'{"cash":2000,"pix":1000}'::jsonb,2500,v_date,true,v_idempotency)<>v_booking
 then raise exception 'Retry generated duplicate booking';end if;
 if (select count(*) from public.payment_transactions where booking_id=v_booking)<>2
 then raise exception 'Retry duplicated financial ledger';end if;
 v_fail:=false;
 begin
   perform public.admin_create_manual_booking_split_v1(
     'Cliente QA sobreposição',null,'Corte',v_barber,v_date,time '12:00',
     false,null,null,null,false,gen_random_uuid());
 exception when others then v_fail:=true;end;
 if not v_fail then raise exception 'Overlapping appointment accepted';end if;
 update public.payment_transactions set occurred_at=now()-interval '2 minutes'
 where booking_id=v_booking;
 perform public.admin_close_cash(v_date);
 select closing_amount_cents into v_original from public.cash_sessions where business_date=v_date;
 if v_original<>3000 then raise exception 'Original close was not 3000';end if;
 update public.cash_sessions set closed_at=now()-interval '1 minute' where business_date=v_date;
 v_second:=public.admin_create_manual_booking_split_v1(
   'Cliente QA retroativo',null,'Corte',v_barber,v_date,time '13:00',
   true,'{"pix":3000}'::jsonb,null,v_date,true,gen_random_uuid());
 v_reconciliation:=public.admin_cash_reconciliation(v_date,v_date)->'rows'->0;
 if (v_reconciliation->>'original_close_cents')::integer<>3000
    or (v_reconciliation->>'post_close_adjustment_cents')::integer<>3000
    or (v_reconciliation->>'reconciled_cents')::integer<>6000
 then raise exception 'Retro reconciliation wrong: %',v_reconciliation;end if;
 if (select closing_amount_cents from public.cash_sessions where business_date=v_date)<>3000
 then raise exception 'Closed snapshot was changed';end if;
 -- Refunds must have an open current-day cash session.
 if not exists(select 1 from public.cash_sessions c
   where c.business_date=timezone('America/Sao_Paulo',now())::date) then
   insert into public.cash_sessions(business_date,status,opening_amount_cents,opened_at,opened_by)
   values(timezone('America/Sao_Paulo',now())::date,'open',0,now(),'qa:v4:rollback');
 end if;
 perform public.admin_refund_booking(v_second);
 v_fail:=false;
 begin
   perform public.admin_refund_booking(v_second);
 exception when others then v_fail:=true;end;
 if not v_fail then raise exception 'Duplicate refund accepted';end if;
 if (select count(*) from public.payment_transactions
      where booking_id=v_second and transaction_type='refund')<>1
 then raise exception 'Refund count is invalid';end if;
end $qa$;
rollback;