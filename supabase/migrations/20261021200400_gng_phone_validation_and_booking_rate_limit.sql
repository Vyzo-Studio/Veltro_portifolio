-- GNG: validate Brazilian numbers on server and limit abusive booking requests.
create or replace function public.gng_valid_brazil_phone(p_phone text)
returns boolean
language plpgsql
immutable
set search_path=''
as $fn$
declare
  v_phone text := regexp_replace(coalesce(p_phone,''),'\\D','','g');
  v_national text;
  v_ddd integer;
begin
  if char_length(v_phone) in (12,13) and left(v_phone,2)='55' then
    v_phone:=substring(v_phone from 3);
  end if;
  if char_length(v_phone) not in (10,11) or v_phone ~ '^([0-9])\\1+$' then
    return false;
  end if;
  v_ddd:=left(v_phone,2)::integer;
  if v_ddd < 11 or v_ddd > 99 then return false; end if;
  v_national:=substring(v_phone from 3);
  if left(v_national,1)='0' then return false; end if;
  if char_length(v_national)=9 and left(v_national,1)<>'9' then return false; end if;
  return true;
end;
$fn$;
create index if not exists bookings_created_at_for_rate_limit on public.bookings(created_at);
CREATE OR REPLACE FUNCTION public.create_booking_request_by_barber_privacy_v1(p_customer_name text, p_customer_phone text, p_service text, p_barber_id uuid, p_booking_date date, p_booking_time time without time zone, p_privacy_acknowledged boolean, p_whatsapp_share_opt_in boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
begin
  if p_privacy_acknowledged is distinct from true then
    raise exception 'Leia a Política de Privacidade antes de enviar sua solicitação.';
  end if;

  if not public.gng_valid_brazil_phone(p_customer_phone) then
    raise exception 'Informe um telefone brasileiro válido.';
  end if;

  -- Prevent basic booking floods without requiring tracking cookies.
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended('gng-public-rate-v1',0));
  if (select count(*) from public.bookings b
      where b.created_at > now()-interval '1 minute') >= 20 then
    raise exception 'Muitas solicitações recentes. Aguarde um momento antes de tentar novamente.';
  end if;
  if (select count(*) from public.bookings b
      where regexp_replace(coalesce(b.customer_phone,''),'\\D','','g') =
        regexp_replace(coalesce(p_customer_phone,''),'\\D','','g')
        and b.created_at > now()-interval '1 hour') >= 3 then
    raise exception 'Limite temporário de solicitações para este telefone. Entre em contato com a barbearia.';
  end if;

  v_id := public.create_booking_request_by_barber(
    p_customer_name,
    p_customer_phone,
    p_service,
    p_barber_id,
    p_booking_date,
    p_booking_time
  );

  update public.bookings
     set privacy_notice_version = '2026-10-21',
         privacy_acknowledged_at = now(),
         whatsapp_share_opt_in_at =
           case when p_whatsapp_share_opt_in is true then now() else null end
   where id = v_id;

  if not found then
    raise exception 'Não foi possível registrar as preferências de privacidade.';
  end if;
  return v_id;
end;
$function$;
