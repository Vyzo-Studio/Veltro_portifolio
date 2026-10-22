-- Disable public access to superseded administrative booking routes.
-- The current panel uses admin_create_manual_booking_split_v1 (through the retired-portal capture handler)
-- and admin_block_slot_by_barber. Their definitions and grants are retained.
revoke all on function public.admin_create_booking(text,text,text,date,time without time zone) from public,anon,authenticated;
revoke all on function public.admin_create_booking_v2(text,text,text,uuid,date,time without time zone) from public,anon,authenticated;
revoke all on function public.admin_block_slot(date,time without time zone,text) from public,anon,authenticated;
revoke all on function public.admin_block_slot_v2(date,time without time zone,uuid,text) from public,anon,authenticated;
revoke all on function public.admin_create_booking_by_barber(text,text,text,uuid,date,time without time zone) from public,anon,authenticated;
