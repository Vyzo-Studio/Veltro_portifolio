-- GNG-007: manual cash close reconciles by effective receipt date.
-- No existing cash sessions or payment rows are changed by this migration.
create or replace function public.admin_close_cash(p_business_date date default null)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_date date := coalesce(p_business_date, timezone('America/Sao_Paulo',now())::date);
  v_total integer;
begin
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
$fn$;
revoke all on function public.admin_close_cash(date) from public,anon,authenticated;
grant execute on function public.admin_close_cash(date) to authenticated;