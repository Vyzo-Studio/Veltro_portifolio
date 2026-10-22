-- GNG-005: least-privilege for internal schedule helper; harden paths of verified read/finance helpers.
revoke all on function public.barber_interval_has_conflict(uuid,date,time without time zone,integer)
  from public,anon,authenticated;
revoke all on function public.gng_valid_brazil_phone(text) from public,anon,authenticated;
alter function public.is_gng_admin() set search_path = '';
alter function public.admin_financial_report(date,date) set search_path = '';
alter function public.admin_cash_summary(date) set search_path = '';
alter function public.system_close_cash() set search_path = '';
alter function public.get_public_site_config() set search_path = '';
-- Intentional public functions preserve their existing execute grants.
