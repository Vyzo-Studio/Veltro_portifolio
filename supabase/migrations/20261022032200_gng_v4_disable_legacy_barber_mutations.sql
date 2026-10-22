-- Legacy barber portal is retired. No barber Auth user IDs or active claim codes exist.
-- Preserve SQL definitions for recoverability; remove external EXECUTE grants only.
revoke all on function public.barber_complete_booking(uuid,text) from public,anon,authenticated;
revoke all on function public.barber_cancel_booking(uuid) from public,anon,authenticated;
revoke all on function public.barber_confirm_booking(uuid) from public,anon,authenticated;
revoke all on function public.barber_reject_booking(uuid) from public,anon,authenticated;
revoke all on function public.claim_gng_barber_access(text) from public,anon,authenticated;
alter function public.barber_complete_booking(uuid,text) set search_path='';
alter function public.barber_cancel_booking(uuid) set search_path='';
alter function public.barber_confirm_booking(uuid) set search_path='';
alter function public.barber_reject_booking(uuid) set search_path='';
alter function public.claim_gng_barber_access(text) set search_path='';
