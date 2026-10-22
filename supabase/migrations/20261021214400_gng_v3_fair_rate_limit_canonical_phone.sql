-- GNG-002/003: fair per-phone limits; canonical E.164 BR identity.
-- Existing stored phone values remain unchanged; comparisons normalize at query time.
create or replace function public.gng_normalize_brazil_phone(p_phone text)
returns text
language sql immutable
set search_path=''
as $fn$
with extracted as (select regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') digits),
national as (
  select case when left(digits,2)='55' and length(digits) in (12,13)
    then substring(digits from 3) else digits end digits from extracted
)
select case when public.gng_valid_brazil_phone(p_phone)
  then '55'||digits else null end from national;
$fn$;
revoke all on function public.gng_normalize_brazil_phone(text) from public,anon,authenticated;

create or replace function public.create_booking_request_by_barber_privacy_v1(
  p_customer_name text, p_customer_phone text,p_service text,p_barber_id uuid,
  p_booking_date date,p_booking_time time without time zone,
  p_privacy_acknowledged boolean,p_whatsapp_share_opt_in boolean
)
returns uuid
language plpgsql security definer
set search_path=''
as $fn$
declare
  v_phone text := public.gng_normalize_brazil_phone(p_customer_phone);
  v_id uuid;
begin
  if p_privacy_acknowledged is distinct from true then
    raise exception 'Leia a Política de Privacidade antes de enviar sua solicitação.';
  end if;
  if v_phone is null then
    raise exception 'Informe um telefone brasileiro válido.';
  end if;

  -- Separate lock for each normalized phone. One busy client cannot exhaust a shared counter.
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended('gng-booking-phone:'||v_phone,0));

  if exists(
    select 1 from public.bookings b
    where public.gng_normalize_brazil_phone(b.customer_phone)=v_phone
      and b.barber_id=p_barber_id
      and b.booking_date=p_booking_date
      and b.booking_time=p_booking_time
      and (b.status='confirmed'
        or (b.status='pending' and b.expires_at>now()))
  ) then
    raise exception 'Você já possui uma solicitação para esse mesmo horário.';
  end if;

  if (select count(*) from public.bookings b
      where public.gng_normalize_brazil_phone(b.customer_phone)=v_phone
        and b.created_at>now()-interval '1 hour') >= 3 then
    raise exception 'Limite temporário de solicitações para este telefone. Entre em contato com a barbearia.';
  end if;

  if (select count(*) from public.bookings b
      where public.gng_normalize_brazil_phone(b.customer_phone)=v_phone
        and b.status='pending' and b.expires_at>now()) >= 2 then
    raise exception 'Você já tem solicitações aguardando confirmação. Aguarde ou entre em contato com a barbearia.';
  end if;

  v_id := public.create_booking_request_by_barber(
    p_customer_name,
    substring(v_phone from 3),
    p_service,p_barber_id,p_booking_date,p_booking_time
  );

  update public.bookings b
    set privacy_notice_version='2026-10-21',
        privacy_acknowledged_at=now(),
        whatsapp_share_opt_in_at=case when p_whatsapp_share_opt_in then now() else null end
    where b.id=v_id;
  if not found then raise exception 'Não foi possível registrar as preferências de privacidade.'; end if;
  return v_id;
end;
$fn$;
revoke all on function public.create_booking_request_by_barber_privacy_v1(
  text,text,text,uuid,date,time without time zone,boolean,boolean
) from public,anon,authenticated;
grant execute on function public.create_booking_request_by_barber_privacy_v1(
  text,text,text,uuid,date,time without time zone,boolean,boolean
) to anon,authenticated;