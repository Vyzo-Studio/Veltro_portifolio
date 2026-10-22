-- Immutable closing snapshot, subsequent ledger entries, and today's reconciled value.
-- Read only. No UPDATE of payment_transactions or historical cash_sessions.
create or replace function public.admin_cash_reconciliation(
 p_start_date date, p_end_date date
) returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare
 v_start date:=coalesce(p_start_date,timezone('America/Sao_Paulo',now())::date);
 v_end date:=coalesce(p_end_date,timezone('America/Sao_Paulo',now())::date);
 v_result jsonb;
begin
 if not public.is_gng_admin() then raise exception 'Acesso administrativo não autorizado.'; end if;
 if v_end<v_start or v_end>v_start+366 then raise exception 'Período inválido (máximo 367 dias).'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
     'date',d.business_date,
     'status',coalesce(c.status,'sem_caixa'),
     'closed_at',c.closed_at,
     'original_close_cents',case when c.status='closed' then c.closing_amount_cents else null end,
     'post_close_adjustment_cents',coalesce(l.post_close_cents,0),
     'reconciled_cents',coalesce(l.effective_net_cents,0),
     'difference_cents',case when c.status='closed'
        then coalesce(l.effective_net_cents,0)-coalesce(c.closing_amount_cents,0)-coalesce(l.post_close_cents,0)
        else null end,
     'late_entries_count',coalesce(l.late_entries_count,0)
   ) order by d.business_date desc),'[]'::jsonb)
 into v_result
 from generate_series(v_start,v_end,interval '1 day') d(business_date)
 left join public.cash_sessions c on c.business_date=d.business_date::date
 left join lateral (
   select
     coalesce(sum(case when pt.transaction_type='payment' then pt.amount_cents else -pt.amount_cents end),0)::bigint as effective_net_cents,
     coalesce(sum(case when pt.transaction_type='payment' then pt.amount_cents else -pt.amount_cents end)
       filter(where c.closed_at is not null and pt.occurred_at>c.closed_at),0)::bigint as post_close_cents,
     count(*) filter(where c.closed_at is not null and pt.occurred_at>c.closed_at)::integer late_entries_count,
     count(*) total_entries_count
   from public.payment_transactions pt
   where coalesce(pt.payment_effective_date,timezone('America/Sao_Paulo',pt.occurred_at)::date)=d.business_date::date
 ) l on true
 where c.id is not null or l.total_entries_count>0;
 return jsonb_build_object('start_date',v_start,'end_date',v_end,'rows',v_result);
end;
$fn$;
revoke all on function public.admin_cash_reconciliation(date,date) from public,anon,authenticated;
grant execute on function public.admin_cash_reconciliation(date,date) to authenticated;