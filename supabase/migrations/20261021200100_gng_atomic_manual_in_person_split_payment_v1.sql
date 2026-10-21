-- Atomic manual appointment + up to two distinct in-person payment allocations.
-- The service date and actual payment date are independent. The creation time remains now().
create or replace function public.admin_create_manual_booking_split_v1(
  p_customer_name text,
  p_customer_phone text,
  p_service text,
  p_barber_id uuid,
  p_booking_date date,
  p_booking_time time without time zone,
  p_mark_completed boolean,
  p_payments jsonb,
  p_cash_received_cents integer,
  p_payment_date date,
  p_historical_adjustment boolean,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
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
$fn$;

revoke all on function public.admin_create_manual_booking_split_v1(
  text,text,text,uuid,date,time without time zone,boolean,jsonb,integer,date,boolean,uuid
) from public,anon,authenticated;
grant execute on function public.admin_create_manual_booking_split_v1(
  text,text,text,uuid,date,time without time zone,boolean,jsonb,integer,date,boolean,uuid
) to authenticated;