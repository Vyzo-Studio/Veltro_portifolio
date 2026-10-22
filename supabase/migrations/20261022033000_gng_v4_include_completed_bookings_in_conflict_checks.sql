-- Prevent double-registering completed attendance for same barber/time.
CREATE OR REPLACE FUNCTION public.barber_interval_has_conflict(p_barber_id uuid, p_booking_date date, p_booking_time time without time zone, p_duration_minutes integer)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_start timestamp;
  v_end timestamp;
  v_block_minutes integer;
begin
  if p_barber_id is null or p_booking_date is null or p_booking_time is null then
    return true;
  end if;

  if p_duration_minutes is null or p_duration_minutes <= 0 then
    return true;
  end if;

  select slot_interval_minutes
  into v_block_minutes
  from public.business_settings
  where id = 1;

  v_block_minutes := coalesce(v_block_minutes, 30);
  v_start := p_booking_date + p_booking_time;
  v_end := v_start + make_interval(mins => p_duration_minutes);

  return exists (
    select 1
    from public.bookings b
    where b.barber_id = p_barber_id
      and (
        b.status in ('confirmed','completed')
        or (b.status = 'pending' and b.expires_at > now())
      )
      and (b.booking_date + b.booking_time) < v_end
      and (
        (b.booking_date + b.booking_time)
        + make_interval(mins => coalesce(b.service_duration_minutes, public.service_duration_minutes(b.service), 30))
      ) > v_start
  )
  or exists (
    select 1
    from public.blocked_slots bs
    where (bs.barber_id = p_barber_id or bs.barber_id is null)
      and (bs.booking_date + bs.booking_time) < v_end
      and (
        bs.booking_date + bs.booking_time
        + make_interval(mins => v_block_minutes)
      ) > v_start
  );
end;
$function$;
