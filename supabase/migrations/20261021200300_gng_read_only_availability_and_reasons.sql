create or replace function public.gng_public_slot_reason(
  p_barber_id uuid,p_day date,p_time time without time zone,p_duration integer
)
returns text
language plpgsql
stable security definer
set search_path=''
as $fn$
declare
  v_start timestamp := p_day+p_time;
  v_end timestamp := v_start + make_interval(mins=>p_duration);
  v_block_minutes integer;
begin
  if not public.gng_schedule_allows(p_day,p_time,p_duration) then
    return 'outside_hours';
  end if;
  select slot_interval_minutes into v_block_minutes from public.business_settings where id=1;
  if exists(select 1 from public.blocked_slots s
      where (s.barber_id=p_barber_id or s.barber_id is null)
        and (s.booking_date+s.booking_time)<v_end
        and (s.booking_date+s.booking_time+make_interval(mins=>coalesce(v_block_minutes,30)))>v_start)
  then return 'blocked'; end if;
  if exists(select 1 from public.bookings b
      where b.barber_id=p_barber_id
        and (b.status='confirmed' or (b.status='pending' and b.expires_at>now()))
        and (b.booking_date+b.booking_time)<v_end
        and (b.booking_date+b.booking_time+
          make_interval(mins=>coalesce(b.service_duration_minutes,public.service_duration_minutes(b.service),30)))>v_start)
  then return 'occupied'; end if;
  return 'unavailable';
end;
$fn$;
revoke all on function public.gng_public_slot_reason(uuid,date,time without time zone,integer) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.get_public_unavailable_slots_by_barber(p_barber_id uuid, p_service text, p_start_date date, p_end_date date)
 RETURNS TABLE(booking_date date, booking_time time without time zone, slot_status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_duration integer;
  v_open time;
  v_close time;
  v_interval integer;
  v_max_offset integer;
begin
  if p_barber_id is null or not exists (
    select 1
    from public.barbers br
    where br.id = p_barber_id
      and br.active = true
  ) then
    raise exception 'Barbeiro inválido.';
  end if;

  v_duration := public.service_duration_minutes(p_service);

  if v_duration is null then
    raise exception 'Serviço inválido.';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Período inválido.';
  end if;

  if p_end_date > p_start_date + 31 then
    raise exception 'Período muito grande.';
  end if;

  select open_time, close_time, slot_interval_minutes
  into v_open, v_close, v_interval
  from public.business_settings
  where id = 1;

  v_open := coalesce(v_open, time '09:00');
  v_close := coalesce(v_close, time '19:30');
  v_interval := coalesce(v_interval, 30);
  v_max_offset := greatest(
    0,
    floor(extract(epoch from (v_close - v_open)) / 60)::integer
  );

  return query
  select
    d::date,
    (v_open + make_interval(mins => m))::time,
    public.gng_public_slot_reason(
      p_barber_id,d::date,(v_open + make_interval(mins => m))::time,v_duration
    )
  from generate_series(
    p_start_date::timestamp,
    p_end_date::timestamp,
    interval '1 day'
  ) as d
  cross join generate_series(
    0,
    v_max_offset,
    v_interval
  ) as m
  where
    not public.gng_schedule_allows(
      d::date,
      (v_open + make_interval(mins => m))::time,
      v_duration
    )
    or public.barber_interval_has_conflict(
      p_barber_id,
      d::date,
      (v_open + make_interval(mins => m))::time,
      v_duration
    )
  order by 1, 2;
end;
$function$;