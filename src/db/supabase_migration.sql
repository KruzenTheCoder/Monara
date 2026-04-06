-- ============================================================
-- MONARA FINANCIAL ECOSYSTEM — Supabase/PostgreSQL Schema
-- ============================================================
-- Run this migration in Supabase SQL Editor or via CLI:
--   supabase db push
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null default 'User',
  email           text,
  avatar_url      text,
  subscription_tier text not null default 'Free' check (subscription_tier in ('Free', 'Premium')),
  currency        text not null default 'USD',
  country_code    text not null default 'US',
  theme           text not null default 'default',
  tax_enabled     boolean not null default false,
  tax_mode        text not null default 'exclusive' check (tax_mode in ('inclusive', 'exclusive')),
  current_streak  integer not null default 0,
  total_points    integer not null default 0,
  last_log_date   date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 1B. ONBOARDING RESPONSES (per-user)
-- ============================================================
create table if not exists public.onboarding_responses (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null unique references public.profiles(id) on delete cascade,
  answers      jsonb not null default '{}'::jsonb,
  completed    boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_onboarding_responses_user_id
  on public.onboarding_responses (user_id);


-- ============================================================
-- 2. CATEGORIES (system + user custom)
-- ============================================================
create table if not exists public.categories (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete cascade,
  label         text not null,
  type          text not null default 'expense' check (type in ('expense', 'income')),
  color         text not null default '#6B7280',
  icon_name     text not null default 'Tag',
  is_system     boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Unique per-user category labels
create unique index if not exists idx_categories_user_label
  on public.categories (user_id, label) where user_id is not null;

-- System categories (user_id = null) — seeded below
create unique index if not exists idx_categories_system_label
  on public.categories (label) where is_system = true;


-- ============================================================
-- 3. TRANSACTIONS
-- ============================================================
create table if not exists public.transactions (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  type                text not null check (type in ('income', 'expense')),
  amount              numeric(14,2) not null check (amount > 0),
  category            text not null,
  date                timestamptz not null default now(),
  due_date            date,
  merchant_name       text,
  note                text,
  receipt_image_url   text,
  is_manual_entry     boolean not null default true,
  payment_status      text not null default 'paid' check (payment_status in ('paid', 'unpaid')),
  -- recurring fields (null = one-time)
  recurring_frequency text check (recurring_frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  recurring_stopped_at timestamptz,
  -- metadata
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.transactions
  add column if not exists payment_status text not null default 'paid' check (payment_status in ('paid', 'unpaid'));

alter table public.transactions
  add column if not exists due_date date;

-- Performance indexes
create index if not exists idx_transactions_user_id on public.transactions (user_id);
create index if not exists idx_transactions_user_date on public.transactions (user_id, date desc);
create index if not exists idx_transactions_user_category on public.transactions (user_id, category);
create index if not exists idx_transactions_user_type_date on public.transactions (user_id, type, date desc);
create index if not exists idx_transactions_recurring on public.transactions (user_id)
  where recurring_frequency is not null;


-- ============================================================
-- 4. BUDGETS
-- ============================================================
create table if not exists public.budgets (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      text not null,
  monthly_limit numeric(14,2) not null check (monthly_limit > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists idx_budgets_user_category
  on public.budgets (user_id, category);


-- ============================================================
-- 5. SAVINGS GOALS
-- ============================================================
create table if not exists public.savings_goals (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  target_amount  numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date    date,
  color          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_savings_goals_user_id on public.savings_goals (user_id);


-- ============================================================
-- 6. NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  message    text not null,
  type       text not null check (type in ('spending', 'budget', 'goals', 'streak', 'insights')),
  priority   text not null check (priority in ('high', 'medium', 'low')),
  is_read    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);


-- ============================================================
-- 7. BILLS & BILL PAYMENTS
-- ============================================================
create table if not exists public.bills (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  amount        numeric(14,2) not null check (amount > 0),
  category      text not null,
  schedule_type text not null check (schedule_type in ('monthly', 'once')),
  schedule_day  integer check (schedule_day between 1 and 31),
  schedule_date date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (
    (schedule_type = 'monthly' and schedule_day is not null and schedule_date is null)
    or
    (schedule_type = 'once' and schedule_date is not null and schedule_day is null)
  )
);

create index if not exists idx_bills_user_id on public.bills (user_id);

create table if not exists public.bill_payments (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  bill_id        uuid not null references public.bills(id) on delete cascade,
  due_month      date not null check (due_month = date_trunc('month', due_month)::date),
  paid_at        timestamptz not null default now(),
  transaction_id uuid references public.transactions(id) on delete cascade,
  proof_url      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists idx_bill_payments_bill_due_month
  on public.bill_payments (bill_id, due_month);

create index if not exists idx_bill_payments_user_due_month
  on public.bill_payments (user_id, due_month desc);


-- ============================================================
-- 8. REWARDS & REDEMPTIONS
-- ============================================================
create table if not exists public.rewards (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  description     text,
  cost_in_points  integer not null check (cost_in_points > 0),
  type            text not null default 'discount' check (type in ('discount', 'theme', 'content')),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.redemptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  reward_id   uuid not null references public.rewards(id) on delete cascade,
  points_spent integer not null,
  redeemed_at timestamptz not null default now()
);

create index if not exists idx_redemptions_user on public.redemptions (user_id, redeemed_at desc);


-- ============================================================
-- 9. STREAK HISTORY (audit trail)
-- ============================================================
create table if not exists public.streak_history (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  streak_date   date not null,
  streak_count  integer not null,
  points_earned integer not null default 0,
  logged_at     timestamptz not null default now()
);

create unique index if not exists idx_streak_history_user_date
  on public.streak_history (user_id, streak_date);


-- ============================================================
-- 10. UPDATED_AT AUTO-TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

drop trigger if exists set_budgets_updated_at on public.budgets;
create trigger set_budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

drop trigger if exists set_onboarding_responses_updated_at on public.onboarding_responses;
create trigger set_onboarding_responses_updated_at
  before update on public.onboarding_responses
  for each row execute function public.set_updated_at();

drop trigger if exists set_savings_goals_updated_at on public.savings_goals;
create trigger set_savings_goals_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

drop trigger if exists set_bills_updated_at on public.bills;
create trigger set_bills_updated_at
  before update on public.bills
  for each row execute function public.set_updated_at();

drop trigger if exists set_bill_payments_updated_at on public.bill_payments;
create trigger set_bill_payments_updated_at
  before update on public.bill_payments
  for each row execute function public.set_updated_at();


-- ============================================================
-- 11. ROW-LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.savings_goals enable row level security;
alter table public.notifications enable row level security;
alter table public.bills enable row level security;
alter table public.bill_payments enable row level security;
alter table public.categories enable row level security;
alter table public.redemptions enable row level security;
alter table public.streak_history enable row level security;

-- profiles: users can only read/update their own
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can read own onboarding" on public.onboarding_responses;
drop policy if exists "Users can insert own onboarding" on public.onboarding_responses;
drop policy if exists "Users can update own onboarding" on public.onboarding_responses;

create policy "Users can read own onboarding"
  on public.onboarding_responses for select using (auth.uid() = user_id);
create policy "Users can insert own onboarding"
  on public.onboarding_responses for insert with check (auth.uid() = user_id);
create policy "Users can update own onboarding"
  on public.onboarding_responses for update using (auth.uid() = user_id);

-- transactions: full CRUD on own rows
drop policy if exists "Users can read own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can read own transactions"
  on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions"
  on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions"
  on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions"
  on public.transactions for delete using (auth.uid() = user_id);

-- budgets: full CRUD on own rows
drop policy if exists "Users can read own budgets" on public.budgets;
drop policy if exists "Users can insert own budgets" on public.budgets;
drop policy if exists "Users can update own budgets" on public.budgets;
drop policy if exists "Users can delete own budgets" on public.budgets;
create policy "Users can read own budgets"
  on public.budgets for select using (auth.uid() = user_id);
create policy "Users can insert own budgets"
  on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets"
  on public.budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets"
  on public.budgets for delete using (auth.uid() = user_id);

-- savings_goals: full CRUD on own rows
drop policy if exists "Users can read own savings_goals" on public.savings_goals;
drop policy if exists "Users can insert own savings_goals" on public.savings_goals;
drop policy if exists "Users can update own savings_goals" on public.savings_goals;
drop policy if exists "Users can delete own savings_goals" on public.savings_goals;
create policy "Users can read own savings_goals"
  on public.savings_goals for select using (auth.uid() = user_id);
create policy "Users can insert own savings_goals"
  on public.savings_goals for insert with check (auth.uid() = user_id);
create policy "Users can update own savings_goals"
  on public.savings_goals for update using (auth.uid() = user_id);
create policy "Users can delete own savings_goals"
  on public.savings_goals for delete using (auth.uid() = user_id);

-- notifications: full CRUD on own rows
drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "Users can insert own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users can insert own notifications"
  on public.notifications for insert with check (auth.uid() = user_id);
create policy "Users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);
create policy "Users can delete own notifications"
  on public.notifications for delete using (auth.uid() = user_id);

-- bills: full CRUD on own rows
drop policy if exists "Users can read own bills" on public.bills;
drop policy if exists "Users can insert own bills" on public.bills;
drop policy if exists "Users can update own bills" on public.bills;
drop policy if exists "Users can delete own bills" on public.bills;
create policy "Users can read own bills"
  on public.bills for select using (auth.uid() = user_id);
create policy "Users can insert own bills"
  on public.bills for insert with check (auth.uid() = user_id);
create policy "Users can update own bills"
  on public.bills for update using (auth.uid() = user_id);
create policy "Users can delete own bills"
  on public.bills for delete using (auth.uid() = user_id);

-- bill_payments: full CRUD on own rows
drop policy if exists "Users can read own bill_payments" on public.bill_payments;
drop policy if exists "Users can insert own bill_payments" on public.bill_payments;
drop policy if exists "Users can update own bill_payments" on public.bill_payments;
drop policy if exists "Users can delete own bill_payments" on public.bill_payments;
create policy "Users can read own bill_payments"
  on public.bill_payments for select using (auth.uid() = user_id);
create policy "Users can insert own bill_payments"
  on public.bill_payments for insert with check (auth.uid() = user_id);
create policy "Users can update own bill_payments"
  on public.bill_payments for update using (auth.uid() = user_id);
create policy "Users can delete own bill_payments"
  on public.bill_payments for delete using (auth.uid() = user_id);

-- categories: system categories readable by all, custom by owner
drop policy if exists "Anyone can read system categories" on public.categories;
drop policy if exists "Users can read own categories" on public.categories;
drop policy if exists "Users can manage own categories" on public.categories;
create policy "Anyone can read system categories"
  on public.categories for select using (is_system = true);
create policy "Users can read own categories"
  on public.categories for select using (auth.uid() = user_id);
create policy "Users can manage own categories"
  on public.categories for all using (auth.uid() = user_id);

-- redemptions & streak_history
drop policy if exists "Users can read own redemptions" on public.redemptions;
drop policy if exists "Users can insert own redemptions" on public.redemptions;
create policy "Users can read own redemptions"
  on public.redemptions for select using (auth.uid() = user_id);
create policy "Users can insert own redemptions"
  on public.redemptions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can read own streak_history" on public.streak_history;
drop policy if exists "Users can insert own streak_history" on public.streak_history;
create policy "Users can read own streak_history"
  on public.streak_history for select using (auth.uid() = user_id);
create policy "Users can insert own streak_history"
  on public.streak_history for insert with check (auth.uid() = user_id);


-- ============================================================
-- 12. STORED PROCEDURES / RPC FUNCTIONS
-- ============================================================

-- 9a. Add transaction + update streak in one atomic call
drop function if exists public.add_transaction_with_streak(
  text,
  numeric,
  text,
  timestamptz,
  text,
  text,
  text,
  boolean,
  text
);

drop function if exists public.add_transaction_with_streak(
  text,
  numeric,
  text,
  timestamptz,
  text,
  text,
  text,
  boolean,
  text,
  text,
  date
);

drop function if exists public.add_transaction_with_streak(
  text,
  numeric,
  text,
  timestamptz,
  text,
  text,
  text,
  boolean,
  text,
  text
);

create or replace function public.add_transaction_with_streak(
  p_type text,
  p_amount numeric,
  p_category text,
  p_date timestamptz default now(),
  p_due_date date default null,
  p_merchant_name text default null,
  p_note text default null,
  p_receipt_image_url text default null,
  p_is_manual_entry boolean default true,
  p_recurring_frequency text default null,
  p_payment_status text default 'paid'
)
returns json as $$
declare
  v_user_id uuid := auth.uid();
  v_tx_id uuid;
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_profile record;
  v_new_streak integer;
  v_points_earned integer := 0;
  v_bonus integer := 0;
begin
  -- insert transaction
  insert into public.transactions (
    user_id, type, amount, category, date, due_date,
    merchant_name, note, receipt_image_url,
    is_manual_entry, recurring_frequency, payment_status
  ) values (
    v_user_id, p_type, p_amount, p_category, p_date, p_due_date,
    p_merchant_name, p_note, p_receipt_image_url,
    p_is_manual_entry, p_recurring_frequency,
    case when p_type = 'expense' then coalesce(p_payment_status, 'paid') else 'paid' end
  )
  returning id into v_tx_id;

  -- fetch current profile
  select * into v_profile from public.profiles where id = v_user_id;

  -- streak logic (only once per day)
  if v_profile.last_log_date is null or v_profile.last_log_date < v_today then
    if v_profile.last_log_date = v_yesterday then
      v_new_streak := v_profile.current_streak + 1;
    else
      v_new_streak := 1;
    end if;

    -- bonus points at milestones
    if v_new_streak % 7 = 0 then
      v_bonus := 100;
    elsif v_new_streak % 5 = 0 then
      v_bonus := 50;
    end if;

    v_points_earned := 10 + v_bonus;

    update public.profiles set
      current_streak = v_new_streak,
      total_points = total_points + v_points_earned,
      last_log_date = v_today
    where id = v_user_id;

    -- record streak history
    insert into public.streak_history (user_id, streak_date, streak_count, points_earned)
    values (v_user_id, v_today, v_new_streak, v_points_earned)
    on conflict (user_id, streak_date) do nothing;
  end if;

  return json_build_object(
    'transaction_id', v_tx_id,
    'points_earned', v_points_earned,
    'current_streak', coalesce(v_new_streak, v_profile.current_streak)
  );
end;
$$ language plpgsql security definer;


-- 9b. Stop a recurring payment
create or replace function public.stop_recurring(p_transaction_id uuid)
returns void as $$
begin
  update public.transactions
  set recurring_stopped_at = now()
  where id = p_transaction_id
    and user_id = auth.uid()
    and recurring_frequency is not null
    and recurring_stopped_at is null;
end;
$$ language plpgsql security definer;


-- 9c. Resume a recurring payment
create or replace function public.resume_recurring(p_transaction_id uuid)
returns void as $$
begin
  update public.transactions
  set recurring_stopped_at = null
  where id = p_transaction_id
    and user_id = auth.uid()
    and recurring_frequency is not null;
end;
$$ language plpgsql security definer;


-- 9d. Get monthly summary (for dashboard)
create or replace function public.get_monthly_summary(
  p_year integer default extract(year from current_date)::integer,
  p_month integer default extract(month from current_date)::integer
)
returns json as $$
declare
  v_user_id uuid := auth.uid();
  v_start date := make_date(p_year, p_month, 1);
  v_end date := (v_start + interval '1 month')::date;
  v_income numeric := 0;
  v_expenses numeric := 0;
  v_by_category json;
begin
  select coalesce(sum(amount), 0) into v_income
  from public.transactions
  where user_id = v_user_id and type = 'income'
    and date >= v_start and date < v_end;

  select coalesce(sum(amount), 0) into v_expenses
  from public.transactions
  where user_id = v_user_id and type = 'expense'
    and payment_status <> 'unpaid'
    and date >= v_start and date < v_end;

  select json_agg(row_to_json(r)) into v_by_category
  from (
    select category, sum(amount) as total, count(*) as count
    from public.transactions
    where user_id = v_user_id and type = 'expense' and payment_status <> 'unpaid'
      and date >= v_start and date < v_end
    group by category
    order by sum(amount) desc
  ) r;

  return json_build_object(
    'year', p_year,
    'month', p_month,
    'income', v_income,
    'expenses', v_expenses,
    'balance', v_income - v_expenses,
    'savings_rate', case when v_income > 0
      then round(((v_income - v_expenses) / v_income * 100)::numeric, 1)
      else 0 end,
    'by_category', coalesce(v_by_category, '[]'::json)
  );
end;
$$ language plpgsql security definer;


-- 9e. Get spending history (last N months for charts)
create or replace function public.get_spending_history(p_months integer default 6)
returns json as $$
declare
  v_user_id uuid := auth.uid();
begin
  return (
    select json_agg(row_to_json(r) order by r.month_start)
    from (
      select
        date_trunc('month', date)::date as month_start,
        to_char(date_trunc('month', date), 'Mon YYYY') as label,
        sum(case when type = 'income' then amount else 0 end) as income,
        sum(case when type = 'expense' and payment_status <> 'unpaid' then amount else 0 end) as expenses
      from public.transactions
      where user_id = v_user_id
        and date >= (date_trunc('month', current_date) - (p_months || ' months')::interval)
      group by date_trunc('month', date)
    ) r
  );
end;
$$ language plpgsql security definer;


-- 9f. Redeem a reward
create or replace function public.redeem_reward(p_reward_id uuid)
returns json as $$
declare
  v_user_id uuid := auth.uid();
  v_reward record;
  v_profile record;
begin
  select * into v_reward from public.rewards where id = p_reward_id and is_active = true;
  if not found then
    return json_build_object('error', 'Reward not found or inactive');
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if v_profile.total_points < v_reward.cost_in_points then
    return json_build_object('error', 'Not enough points', 'needed', v_reward.cost_in_points - v_profile.total_points);
  end if;

  -- deduct points
  update public.profiles
  set total_points = total_points - v_reward.cost_in_points
  where id = v_user_id;

  -- record redemption
  insert into public.redemptions (user_id, reward_id, points_spent)
  values (v_user_id, p_reward_id, v_reward.cost_in_points);

  return json_build_object('success', true, 'remaining_points', v_profile.total_points - v_reward.cost_in_points);
end;
$$ language plpgsql security definer;


-- 9g. Change currency and convert all amounts
create or replace function public.change_currency(
  p_new_currency text,
  p_conversion_rate numeric  -- rate: 1 unit old = N units new
)
returns void as $$
declare
  v_user_id uuid := auth.uid();
begin
  -- convert transactions
  update public.transactions
  set amount = round((amount * p_conversion_rate)::numeric, 2)
  where user_id = v_user_id;

  -- convert budgets
  update public.budgets
  set monthly_limit = round((monthly_limit * p_conversion_rate)::numeric, 2)
  where user_id = v_user_id;

  -- update user currency
  update public.profiles
  set currency = p_new_currency
  where id = v_user_id;
end;
$$ language plpgsql security definer;


-- ============================================================
-- 10. VIEWS (for convenience / analytics)
-- ============================================================

-- Active recurring payments view
create or replace view public.v_active_recurring as
select
  t.id,
  t.user_id,
  t.type,
  t.amount,
  t.category,
  t.date as anchor_date,
  t.merchant_name,
  t.note,
  t.recurring_frequency,
  t.created_at
from public.transactions t
where t.recurring_frequency is not null
  and t.recurring_stopped_at is null;

-- Monthly spending breakdown view
create or replace view public.v_monthly_spending as
select
  user_id,
  date_trunc('month', date)::date as month,
  type,
  category,
  sum(amount) as total,
  count(*) as tx_count
from public.transactions
where type = 'income' or payment_status <> 'unpaid'
group by user_id, date_trunc('month', date), type, category;


-- ============================================================
-- 11. SEED SYSTEM CATEGORIES
-- ============================================================
insert into public.categories (label, type, color, icon_name, is_system, sort_order)
values
  ('Food & Dining',     'expense', '#F59E0B', 'Coffee',          true, 1),
  ('Transport',         'expense', '#3B82F6', 'Car',             true, 2),
  ('Housing & Rent',    'expense', '#06B6D4', 'Home',            true, 3),
  ('Shopping',          'expense', '#EC4899', 'ShoppingBag',     true, 4),
  ('Entertainment',     'expense', '#8B5CF6', 'Tv',              true, 5),
  ('Health & Medical',  'expense', '#EF4444', 'Heart',           true, 6),
  ('Utilities',         'expense', '#10B981', 'Zap',             true, 7),
  ('Education',         'expense', '#F97316', 'BookOpen',        true, 8),
  ('Other',             'expense', '#6B7280', 'MoreHorizontal',  true, 9),
  ('Salary',            'income',  '#10B981', 'Briefcase',       true, 10),
  ('Freelance',         'income',  '#3B82F6', 'Laptop',          true, 11),
  ('Investment',        'income',  '#A78BFA', 'TrendingUp',      true, 12),
  ('Gift',              'income',  '#F472B6', 'Gift',            true, 13),
  ('Other',             'income',  '#6B7280', 'Plus',            true, 14)
on conflict do nothing;


-- ============================================================
-- 12. SEED DEFAULT REWARDS
-- ============================================================
insert into public.rewards (title, description, cost_in_points, type)
values
  ('Free Coffee Voucher', 'Partner café discount', 300, 'discount'),
  ('"Nebula" Theme',      'Visual customisation',  800, 'theme'),
  ('$5 Cashback',         'Direct wallet credit',  1200, 'discount'),
  ('Premium Month Free',  'Unlock all features',   2500, 'content')
on conflict do nothing;


-- ============================================================
-- 13. SEED DEFAULT BUDGETS (per-user, done via function)
-- ============================================================
create or replace function public.seed_default_budgets(p_user_id uuid)
returns void as $$
begin
  insert into public.budgets (user_id, category, monthly_limit)
  values
    (p_user_id, 'Housing & Rent',    1500),
    (p_user_id, 'Food & Dining',     500),
    (p_user_id, 'Transport',         150),
    (p_user_id, 'Entertainment',     200),
    (p_user_id, 'Shopping',          300),
    (p_user_id, 'Health & Medical',  100),
    (p_user_id, 'Utilities',         200)
  on conflict (user_id, category) do nothing;
end;
$$ language plpgsql security definer;
