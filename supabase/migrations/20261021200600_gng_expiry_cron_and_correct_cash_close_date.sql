-- Expire pending requests once per minute independently of public availability reads.
select cron.schedule(
  'gng-expire-pending-bookings',
  '* * * * *',
  $$update public.bookings set status='expired',updated_at=now()
      where status='pending' and expires_at is not null and expires_at<=now();$$
);
-- Never count a historical payment retroactively entered today as today's closing receipt.
CREATE OR REPLACE FUNCTION public.system_close_cash()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_date date := timezone('America/Sao_Paulo', now())::date;
  v_total integer := 0;
begin
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