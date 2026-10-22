-- GNG-010: distinguish revenue-bearing appointments from individual payment/refund transactions.
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
  v_paid_bookings integer;
  v_all_transactions integer;
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


  select count(*)::integer
  into v_paid_bookings
  from (
    select pt.booking_id
    from public.payment_transactions pt
    where coalesce(pt.payment_effective_date,
      timezone('America/Sao_Paulo',pt.occurred_at)::date)
      between v_start and v_end
    group by pt.booking_id
    having sum(case when pt.transaction_type='payment'
      then pt.amount_cents else -pt.amount_cents end) > 0
  ) received;

  v_all_transactions := v_payments + v_refunds;

  return jsonb_build_object(
    'start_date', v_start,
    'end_date', v_end,
    'net_total_cents', v_received,
    'paid_booking_count', v_paid_bookings,
    'financial_transaction_count', v_all_transactions,
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
