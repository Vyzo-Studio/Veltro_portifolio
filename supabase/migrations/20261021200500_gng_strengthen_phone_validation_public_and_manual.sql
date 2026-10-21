CREATE OR REPLACE FUNCTION public.gng_valid_brazil_phone(p_phone text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_phone text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  v_national text;
  v_ddd integer;
begin
  if char_length(v_phone) in (12,13) and left(v_phone,2)='55' then
    v_phone:=substring(v_phone from 3);
  end if;
  if char_length(v_phone) not in (10,11) or length(translate(v_phone,left(v_phone,1),''))=0 then
    return false;
  end if;
  v_ddd:=left(v_phone,2)::integer;
  if v_ddd < 11 or v_ddd > 99 then return false; end if;
  v_national:=substring(v_phone from 3);
  if left(v_national,1)='0' then return false; end if;
  if char_length(v_national)=9 and left(v_national,1)<>'9' then return false; end if;
  return true;
end;
$function$;

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
      where regexp_replace(coalesce(b.customer_phone,''),'[^0-9]','','g') =
        regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g')
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

CREATE OR REPLACE FUNCTION public.admin_create_manual_booking_split_v1(p_customer_name text, p_customer_phone text, p_service text, p_barber_id uuid, p_booking_date date, p_booking_time time without time zone, p_mark_completed boolean, p_payments jsonb, p_cash_received_cents integer, p_payment_date date, p_historical_adjustment boolean, p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_booking_id uuid;
  v_method text;
  v_value text;
  v_cents integer;
  v_cash integer := 0;
  v_total bigint := 0;
  v_due integer;
  v_count integer := 0;
  v_primary_method text;
  v_today date := timezone('America/Sao_Paulo',now())::date;
  v_session_id uuid;
  v_session_status text;
  v_change integer;
  v_values jsonb := '{}'::jsonb;
begin
  if not public.is_gng_admin() then
    raise exception 'Acesso administrativo não autorizado.';
  end if;
  if coalesce(trim(p_customer_phone),'') <> ''
    and not public.gng_valid_brazil_phone(p_customer_phone) then
    raise exception 'Telefone brasileiro inválido.';
  end if;
  if p_request_id is null then
    raise exception 'Identificador de operação obrigatório.';
  end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended('gng-manual|' || p_request_id::text, 0));
  select b.id into v_booking_id from public.bookings b where b.manual_request_id = p_request_id;
  if found then
    return v_booking_id; -- Idempotent response, without inserting duplicate revenue.
  end if;

  if p_payments is not null and jsonb_typeof(p_payments) <> 'object' then
    raise exception 'Valores de pagamento inválidos.';
  end if;
  for v_method,v_value in select key,value from jsonb_each_text(coalesce(p_payments,'{}'::jsonb))
  loop
    if v_method not in ('cash','pix','debit','credit') then
      raise exception 'Forma de pagamento não permitida.';
    end if;
    if v_value !~ '^[0-9]{1,9}$' then
      raise exception 'Informe valores inteiros de centavos não negativos.';
    end if;
    v_cents := v_value::integer;
    if v_cents > 0 then
      v_count := v_count + 1;
      v_total := v_total + v_cents::bigint;
      v_values := v_values || jsonb_build_object(v_method,v_cents);
      if v_primary_method is null then v_primary_method := v_method; end if;
      if v_method='cash' then v_cash := v_cents; end if;
    end if;
  end loop;
  if v_count > 2 then
    raise exception 'Use no máximo duas formas de pagamento diferentes.';
  end if;
  if v_count > 0 then
    v_due := public.service_price_cents(p_service);
    if v_due is null or v_due <= 0 or v_total <> v_due::bigint then
      raise exception 'A soma dos pagamentos deve ser exatamente o valor do serviço.';
    end if;
    if p_payment_date is null or p_payment_date > v_today or p_payment_date < v_today - 3650 then
      raise exception 'Informe a data real válida do recebimento.';
    end if;
    if p_payment_date < v_today and p_historical_adjustment is distinct from true then
      raise exception 'Confirme que o recebimento será registrado retroativamente.';
    end if;
    select c.id,c.status into v_session_id,v_session_status
      from public.cash_sessions c where c.business_date = p_payment_date;
    if p_payment_date = v_today and coalesce(v_session_status,'closed') <> 'open' then
      raise exception 'Abra o caixa de hoje antes de registrar pagamentos recebidos.';
    end if;
    if v_cash > 0 then
      if p_cash_received_cents is not null and p_cash_received_cents < v_cash then
        raise exception 'O dinheiro entregue não cobre a parcela em dinheiro.';
      end if;
      v_change := coalesce(p_cash_received_cents,v_cash) - v_cash;
    elsif coalesce(p_cash_received_cents,0) <> 0 then
      raise exception 'Troco só é permitido para a parcela em dinheiro.';
    end if;
  elsif p_payment_date is not null or coalesce(p_cash_received_cents,0) <> 0 then
    raise exception 'Não informe recebimento para agendamento sem pagamento.';
  end if;

  v_booking_id := public.admin_create_booking_extended(
    p_customer_name,p_customer_phone,p_service,p_barber_id,
    p_booking_date,p_booking_time,coalesce(p_mark_completed,false),null
  );
  update public.bookings
    set manual_request_id = p_request_id,
        payment_status = case when v_count > 0 then 'paid' else 'unpaid' end,
        payment_method = case when v_count=2 then 'split'
                              when v_count=1 then v_primary_method else null end,
        payment_breakdown = case when v_count>0 then
          jsonb_build_object('cash',coalesce((v_values->>'cash')::integer,0),
             'pix',coalesce((v_values->>'pix')::integer,0),
             'debit',coalesce((v_values->>'debit')::integer,0),
             'credit',coalesce((v_values->>'credit')::integer,0))
          else null end,
        cash_received_cents = case when v_cash>0 then coalesce(p_cash_received_cents,v_cash) else null end,
        change_cents = v_change,
        paid_at = case when v_count>0 then now() else null end,
        updated_at = now()
    where id = v_booking_id;

  if v_count>0 then
    insert into public.payment_transactions(
      booking_id,transaction_type,amount_cents,payment_method,occurred_at,created_by,
      payment_effective_date,is_historical_adjustment,cash_session_id
    )
    select v_booking_id,'payment',value::integer,key,now(),lower(auth.jwt()->>'email'),
           p_payment_date,p_payment_date<v_today,
           case when v_session_status='open' then v_session_id else null end
      from jsonb_each_text(v_values)
      where value::integer>0;
  end if;
  return v_booking_id;
end;
$function$;