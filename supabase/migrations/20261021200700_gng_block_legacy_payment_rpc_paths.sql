-- Disable deprecated write RPCs that bypass the new verified cash/ledger model.
-- The atomic manual RPC invokes the legacy helper internally under its definer role.
revoke all on function public.admin_create_booking_extended(
  text,text,text,uuid,date,time without time zone,boolean,text
) from authenticated,anon,public;
revoke all on function public.admin_complete_booking(uuid,text)
  from authenticated,anon,public;
