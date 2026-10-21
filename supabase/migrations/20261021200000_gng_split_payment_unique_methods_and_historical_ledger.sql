-- GNG: one booking may have two distinct in-person payment methods.
-- Existing receipts retain their IDs; only the incorrect per-booking uniqueness is replaced.
drop index if exists public.payment_transactions_one_payment_per_booking;
drop index if exists public.payment_transactions_one_refund_per_booking;
create unique index if not exists payment_transactions_once_per_method
  on public.payment_transactions(booking_id,payment_method)
  where transaction_type = 'payment';
create unique index if not exists payment_refunds_once_per_method
  on public.payment_transactions(booking_id,payment_method)
  where transaction_type = 'refund';
alter table public.bookings add column if not exists manual_request_id uuid;
create unique index if not exists bookings_manual_request_once
  on public.bookings(manual_request_id) where manual_request_id is not null;
alter table public.payment_transactions
  add column if not exists payment_effective_date date,
  add column if not exists is_historical_adjustment boolean not null default false,
  add column if not exists cash_session_id uuid references public.cash_sessions(id);
create index if not exists payment_transactions_effective_date_idx
  on public.payment_transactions(payment_effective_date);
