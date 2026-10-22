-- Serialize daily cash sessions against payment and refund writes.
CREATE OR REPLACE FUNCTION public.admin_close_cash(p_business_date date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_date date := coalesce(p_business_date, timezone('America/Sao_Paulo',now())::date);
  v_total integer;
begin
  perform 1 from public.cash_sessions
   where business_date=v_date and status='open' for update;
  if not found then raise exception 'O caixa não está aberto.'; end if;
  if not public.is_gng_admin() then
    raise exception 'Acesso não autorizado.';
  end if;

  select coalesce(sum(case when pt.transaction_type='payment'
      then pt.amount_cents else -pt.amount_cents end),0)::integer
  into v_total
  from public.payment_transactions pt
  where coalesce(pt.payment_effective_date,
    timezone('America/Sao_Paulo',pt.occurred_at)::date)=v_date;

  update public.cash_sessions c
     set status='closed',
         closing_amount_cents=v_total,
         closed_at=now(),
         closed_by=lower(auth.jwt()->>'email'),
         updated_at=now()
   where c.business_date=v_date and c.status='open';

  if not found then
    raise exception 'O caixa não está aberto.';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.system_close_cash()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_date date := timezone('America/Sao_Paulo', now())::date;
  v_total integer := 0;
begin
  perform 1 from public.cash_sessions
   where business_date=v_date and status='open' for update;
  if not found then return; end if;
  select
    coalesce(
      sum(
        case
          when transaction_type = 'payment'
            then amount_cents
          else -amount_cents
        end
      ),
      0
    )::integer
  into v_total
  from public.payment_transactions
  where coalesce(payment_effective_date,
    timezone('America/Sao_Paulo',occurred_at)::date) = v_date;

  update public.cash_sessions
  set
    status = 'closed',
    closing_amount_cents = v_total,
    closed_at = now(),
    closed_by = 'system:auto-23:59',
    updated_at = now()
  where business_date = v_date
    and status = 'open';
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_complete_booking_split(p_booking_id uuid, p_payments jsonb, p_cash_received_cents integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_booking public.bookings%rowtype;
  v_cash integer := 0;
  v_pix integer := 0;
  v_debit integer := 0;
  v_credit integer := 0;
  v_total integer := 0;
  v_due integer := 0;
  v_method_count integer := 0;
  v_booking_method text;
  v_session_id uuid;
  v_cash_received integer;
  v_change integer;
begin
  if not public.is_gng_admin() then
    raise exception 'Acesso não autorizado.';
  end if;

  if p_payments is null or jsonb_typeof(p_payments) <> 'object' then
    raise exception 'Informe as formas de pagamento.';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found or v_booking.status <> 'confirmed' then
    raise exception 'Agendamento não pode ser finalizado.';
  end if;

  if v_booking.payment_status = 'refunded' then
    raise exception 'Pagamento estornado. Registre um novo pagamento antes de finalizar.';
  end if;

  if v_booking.payment_status <> 'paid' then
    select c.id into v_session_id from public.cash_sessions c
      where c.business_date=timezone('America/Sao_Paulo',now())::date and c.status='open' for update;
    if v_session_id is null then
      raise exception 'Abra o caixa de hoje antes de registrar pagamentos recebidos.';
    end if;
    begin
      v_cash := coalesce((p_payments ->> 'cash')::integer, 0);
      v_pix := coalesce((p_payments ->> 'pix')::integer, 0);
      v_debit := coalesce((p_payments ->> 'debit')::integer, 0);
      v_credit := coalesce((p_payments ->> 'credit')::integer, 0);
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'Os valores de pagamento são inválidos.';
    end;

    if v_cash < 0 or v_pix < 0 or v_debit < 0 or v_credit < 0 then
      raise exception 'Os valores de pagamento não podem ser negativos.';
    end if;

    v_due := greatest(v_booking.service_amount_cents, 1);
    v_total := v_cash + v_pix + v_debit + v_credit;

    if v_total <> v_due then
      raise exception 'A soma das formas de pagamento deve ser igual ao valor do atendimento.';
    end if;

    v_method_count :=
      (case when v_cash > 0 then 1 else 0 end) +
      (case when v_pix > 0 then 1 else 0 end) +
      (case when v_debit > 0 then 1 else 0 end) +
      (case when v_credit > 0 then 1 else 0 end);

    if v_method_count = 0 then
      raise exception 'Selecione pelo menos uma forma de pagamento.';
    end if;

    if v_cash > 0 then
      v_cash_received := coalesce(p_cash_received_cents, v_cash);

      if v_cash_received < v_cash then
        raise exception 'O valor entregue em dinheiro é menor que a parte paga em dinheiro.';
      end if;

      v_change := v_cash_received - v_cash;
    else
      v_cash_received := null;
      v_change := null;
    end if;

    if v_method_count > 1 then
      v_booking_method := 'split';
    elsif v_cash > 0 then
      v_booking_method := 'cash';
    elsif v_pix > 0 then
      v_booking_method := 'pix';
    elsif v_debit > 0 then
      v_booking_method := 'debit';
    else
      v_booking_method := 'credit';
    end if;

    if v_cash > 0 then
      insert into public.payment_transactions (
        booking_id, transaction_type, amount_cents, payment_method, occurred_at, created_by,
        payment_effective_date, cash_session_id
      ) values (
        v_booking.id, 'payment', v_cash, 'cash', now(), lower(auth.jwt() ->> 'email'),
        timezone('America/Sao_Paulo',now())::date, v_session_id
      );
    end if;

    if v_pix > 0 then
      insert into public.payment_transactions (
        booking_id, transaction_type, amount_cents, payment_method, occurred_at, created_by,
        payment_effective_date, cash_session_id
      ) values (
        v_booking.id, 'payment', v_pix, 'pix', now(), lower(auth.jwt() ->> 'email'),
        timezone('America/Sao_Paulo',now())::date, v_session_id
      );
    end if;

    if v_debit > 0 then
      insert into public.payment_transactions (
        booking_id, transaction_type, amount_cents, payment_method, occurred_at, created_by,
        payment_effective_date, cash_session_id
      ) values (
        v_booking.id, 'payment', v_debit, 'debit', now(), lower(auth.jwt() ->> 'email'),
        timezone('America/Sao_Paulo',now())::date, v_session_id
      );
    end if;

    if v_credit > 0 then
      insert into public.payment_transactions (
        booking_id, transaction_type, amount_cents, payment_method, occurred_at, created_by,
        payment_effective_date, cash_session_id
      ) values (
        v_booking.id, 'payment', v_credit, 'credit', now(), lower(auth.jwt() ->> 'email'),
        timezone('America/Sao_Paulo',now())::date, v_session_id
      );
    end if;

    update public.bookings
    set
      payment_status = 'paid',
      payment_method = v_booking_method,
      payment_breakdown = jsonb_build_object(
        'cash', v_cash,
        'pix', v_pix,
        'debit', v_debit,
        'credit', v_credit
      ),
      cash_received_cents = v_cash_received,
      change_cents = v_change,
      paid_at = now(),
      updated_at = now()
    where id = v_booking.id;
  end if;

  update public.bookings
  set
    status = 'completed',
    completed_at = now(),
    expires_at = null,
    updated_at = now()
  where id = v_booking.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_refund_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_booking public.bookings%rowtype;
  v_session_id uuid;
begin
  if not public.is_gng_admin() then
    raise exception 'Acesso não autorizado.';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found or v_booking.payment_status <> 'paid' then
    raise exception 'Pagamento não pode ser estornado.';
  end if;

  select c.id into v_session_id from public.cash_sessions c
    where c.business_date=timezone('America/Sao_Paulo',now())::date and c.status='open'
    for update;
  if v_session_id is null then
    raise exception 'Abra o caixa antes de registrar estornos financeiros.';
  end if;

  if not exists (
    select 1
    from public.payment_transactions pt
    where pt.booking_id = v_booking.id
      and pt.transaction_type = 'payment'
  ) then
    raise exception 'Nenhum pagamento foi encontrado para este atendimento.';
  end if;

  if exists (
    select 1
    from public.payment_transactions pt
    where pt.booking_id = v_booking.id
      and pt.transaction_type = 'refund'
  ) then
    raise exception 'Este pagamento já foi estornado.';
  end if;

  insert into public.payment_transactions (
    booking_id, transaction_type, amount_cents, payment_method, occurred_at, created_by,
    payment_effective_date, cash_session_id
  )
  select
    pt.booking_id,
    'refund',
    pt.amount_cents,
    pt.payment_method,
    now(),
    lower(auth.jwt() ->> 'email'),
    timezone('America/Sao_Paulo',now())::date,
    v_session_id
  from public.payment_transactions pt
  where pt.booking_id = v_booking.id
    and pt.transaction_type = 'payment';

  update public.bookings
  set
    payment_status = 'refunded',
    updated_at = now()
  where id = v_booking.id;
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
      from public.cash_sessions c where c.business_date = p_payment_date for update;
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
