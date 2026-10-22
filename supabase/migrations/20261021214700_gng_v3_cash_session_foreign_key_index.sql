-- GNG-006: support session FK lookups/deletes; no existing duplicate index.
create index if not exists payment_transactions_cash_session_id_idx
  on public.payment_transactions (cash_session_id)
  where cash_session_id is not null;
