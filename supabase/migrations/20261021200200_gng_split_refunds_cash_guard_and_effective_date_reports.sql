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
      where c.business_date=timezone('America/Sao_Paulo',now())::date and c.status='open';
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

  if not exists (
    select 1 from public.cash_sessions c
    where c.business_date=timezone('America/Sao_Paulo',now())::date and c.status='open'
  ) then
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
    (select c.id from public.cash_sessions c where c.business_date=timezone('America/Sao_Paulo',now())::date and c.status='open')
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

CREATE OR REPLACE FUNCTION public.admin_financial_report(p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_start date := coalesce(p_start_date, timezone('America/Sao_Paulo', now())::date);
  v_end date := coalesce(p_end_date, timezone('America/Sao_Paulo', now())::date);
  v_received integer;
  v_payments integer;
  v_refunds integer;
  v_refund_total integer;
  v_cash integer;
  v_pix integer;
  v_debit integer;
  v_credit integer;
  v_transactions jsonb;
begin
  if not public.is_gng_admin() then
    raise exception 'Acesso não autorizado.';
  end if;

  if v_end < v_start or v_end > v_start + 366 then
    raise exception 'Período inválido. Use no máximo 367 dias.';
  end if;

  select
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end), 0)::integer,
    count(*) filter (where pt.transaction_type = 'payment')::integer,
    count(*) filter (where pt.transaction_type = 'refund')::integer,
    coalesce(sum(pt.amount_cents) filter (where pt.transaction_type = 'refund'), 0)::integer,
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end)
      filter (where pt.payment_method = 'cash'), 0)::integer,
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end)
      filter (where pt.payment_method = 'pix'), 0)::integer,
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end)
      filter (where pt.payment_method = 'debit'), 0)::integer,
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end)
      filter (where pt.payment_method = 'credit'), 0)::integer
  into
    v_received, v_payments, v_refunds, v_refund_total,
    v_cash, v_pix, v_debit, v_credit
  from public.payment_transactions pt
  where coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) between v_start and v_end;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pt.id,
        'transaction_type', pt.transaction_type,
        'amount_cents', case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end,
        'payment_method', pt.payment_method,
        'occurred_at', pt.occurred_at,
        'payment_effective_date', coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo',pt.occurred_at)::date),
        'is_historical_adjustment', pt.is_historical_adjustment,
        'booking_id', b.id,
        'customer_name', b.customer_name,
        'service', b.service,
        'barber_name', br.name,
        'appointment_date', b.booking_date,
        'appointment_time', b.booking_time
      )
      order by pt.occurred_at desc
    ),
    '[]'::jsonb
  )
  into v_transactions
  from public.payment_transactions pt
  join public.bookings b on b.id = pt.booking_id
  left join public.barbers br on br.id = b.barber_id
  where coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) between v_start and v_end;

  return jsonb_build_object(
    'start_date', v_start,
    'end_date', v_end,
    'net_total_cents', v_received,
    'payment_count', v_payments,
    'refund_count', v_refunds,
    'refund_total_cents', v_refund_total,
    'payment_totals', jsonb_build_object(
      'cash', v_cash,
      'pix', v_pix,
      'debit', v_debit,
      'credit', v_credit
    ),
    'transactions', v_transactions
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_cash_summary(p_business_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_date date := coalesce(p_business_date, timezone('America/Sao_Paulo', now())::date);
  v_month_start date := date_trunc('month', v_date)::date;
  v_year_start date := date_trunc('year', v_date)::date;
  v_status text;
  v_expected integer;
  v_received integer;
  v_month integer;
  v_year integer;
  v_expected_count integer;
  v_received_count integer;
  v_month_count integer;
  v_year_count integer;
  v_refund_count integer;
  v_refund_total integer;
  v_cash integer;
  v_pix integer;
  v_debit integer;
  v_credit integer;
  v_cash_count integer;
  v_pix_count integer;
  v_debit_count integer;
  v_credit_count integer;
begin
  if not public.is_gng_admin() then
    raise exception 'Acesso não autorizado.';
  end if;

  select status
  into v_status
  from public.cash_sessions
  where business_date = v_date;

  select
    coalesce(sum(service_amount_cents), 0)::integer,
    count(*)::integer
  into v_expected, v_expected_count
  from public.bookings
  where booking_date = v_date
    and status in ('confirmed','completed')
    and payment_status <> 'refunded';

  select
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end), 0)::integer,
    count(distinct pt.booking_id) filter (where pt.transaction_type = 'refund')::integer,
    coalesce(sum(pt.amount_cents) filter (where pt.transaction_type = 'refund'), 0)::integer
  into v_received, v_refund_count, v_refund_total
  from public.payment_transactions pt
  where coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) = v_date;

  select count(*)::integer
  into v_received_count
  from (
    select pt.booking_id
    from public.payment_transactions pt
    where coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) = v_date
    group by pt.booking_id
    having sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end) > 0
  ) received_bookings;

  select
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end), 0)::integer
  into v_month
  from public.payment_transactions pt
  where coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) >= v_month_start
    and coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) < (v_month_start + interval '1 month')::date;

  select count(*)::integer
  into v_month_count
  from (
    select pt.booking_id
    from public.payment_transactions pt
    where coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) >= v_month_start
      and coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) < (v_month_start + interval '1 month')::date
    group by pt.booking_id
    having sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end) > 0
  ) month_bookings;

  select
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end), 0)::integer
  into v_year
  from public.payment_transactions pt
  where coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) >= v_year_start
    and coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) < (v_year_start + interval '1 year')::date;

  select count(*)::integer
  into v_year_count
  from (
    select pt.booking_id
    from public.payment_transactions pt
    where coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) >= v_year_start
      and coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) < (v_year_start + interval '1 year')::date
    group by pt.booking_id
    having sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end) > 0
  ) year_bookings;

  select
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end)
      filter (where pt.payment_method = 'cash'), 0)::integer,
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end)
      filter (where pt.payment_method = 'pix'), 0)::integer,
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end)
      filter (where pt.payment_method = 'debit'), 0)::integer,
    coalesce(sum(case when pt.transaction_type = 'payment' then pt.amount_cents else -pt.amount_cents end)
      filter (where pt.payment_method = 'credit'), 0)::integer,
    count(distinct pt.booking_id) filter (where pt.payment_method = 'cash' and pt.transaction_type = 'payment')::integer,
    count(distinct pt.booking_id) filter (where pt.payment_method = 'pix' and pt.transaction_type = 'payment')::integer,
    count(distinct pt.booking_id) filter (where pt.payment_method = 'debit' and pt.transaction_type = 'payment')::integer,
    count(distinct pt.booking_id) filter (where pt.payment_method = 'credit' and pt.transaction_type = 'payment')::integer
  into
    v_cash, v_pix, v_debit, v_credit,
    v_cash_count, v_pix_count, v_debit_count, v_credit_count
  from public.payment_transactions pt
  where coalesce(pt.payment_effective_date, timezone('America/Sao_Paulo', pt.occurred_at)::date) = v_date;

  return jsonb_build_object(
    'business_date', v_date,
    'cash_status', coalesce(v_status, 'closed'),
    'expected_today_cents', v_expected,
    'received_today_cents', v_received,
    'month_total_cents', v_month,
    'year_total_cents', v_year,
    'expected_today_count', v_expected_count,
    'received_today_count', v_received_count,
    'month_count', v_month_count,
    'year_count', v_year_count,
    'refund_count', v_refund_count,
    'refund_total_cents', v_refund_total,
    'payment_totals', jsonb_build_object(
      'cash', v_cash,
      'pix', v_pix,
      'debit', v_debit,
      'credit', v_credit
    ),
    'payment_counts', jsonb_build_object(
      'cash', v_cash_count,
      'pix', v_pix_count,
      'debit', v_debit_count,
      'credit', v_credit_count
    )
  );
end;
$function$;