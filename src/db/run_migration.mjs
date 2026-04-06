/**
 * Create missing RPC functions via Supabase REST API.
 * Tables already exist — only the stored procedures need to be created.
 * 
 * Strategy: Create a temporary exec_sql function, use it to install RPCs, then drop it.
 */

const SUPABASE_URL = 'https://bugfydhdoxuzdlagdiaw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z2Z5ZGhkb3h1emRsYWdkaWF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0MDQwNCwiZXhwIjoyMDkwODE2NDA0fQ.dXUVRKSqOLzf4OB5CXZldMKUkGVMIJEvkk5dSJ8-s0k';

import { writeFileSync } from 'fs';

const log = [];
function print(msg) { log.push(msg); console.log(msg); }

async function rpc(name, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(params),
  });
  return { status: res.status, ok: res.ok, body: await res.text() };
}

// The missing functions to create
const FUNCTIONS = {
  add_transaction_with_streak: `
create or replace function public.add_transaction_with_streak(
  p_type text,
  p_amount numeric,
  p_category text,
  p_date timestamptz default now(),
  p_merchant_name text default null,
  p_note text default null,
  p_receipt_image_url text default null,
  p_is_manual_entry boolean default true,
  p_recurring_frequency text default null
)
returns json as $fn$
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
  insert into public.transactions (
    user_id, type, amount, category, date,
    merchant_name, note, receipt_image_url,
    is_manual_entry, recurring_frequency
  ) values (
    v_user_id, p_type, p_amount, p_category, p_date,
    p_merchant_name, p_note, p_receipt_image_url,
    p_is_manual_entry, p_recurring_frequency
  )
  returning id into v_tx_id;

  select * into v_profile from public.profiles where id = v_user_id;

  if v_profile.last_log_date is null or v_profile.last_log_date < v_today then
    if v_profile.last_log_date = v_yesterday then
      v_new_streak := v_profile.current_streak + 1;
    else
      v_new_streak := 1;
    end if;

    if v_new_streak % 7 = 0 then v_bonus := 100;
    elsif v_new_streak % 5 = 0 then v_bonus := 50;
    end if;

    v_points_earned := 10 + v_bonus;

    update public.profiles set
      current_streak = v_new_streak,
      total_points = total_points + v_points_earned,
      last_log_date = v_today
    where id = v_user_id;

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
$fn$ language plpgsql security definer;
`,

  stop_recurring: `
create or replace function public.stop_recurring(p_transaction_id uuid)
returns void as $fn$
begin
  update public.transactions
  set recurring_stopped_at = now()
  where id = p_transaction_id
    and user_id = auth.uid()
    and recurring_frequency is not null
    and recurring_stopped_at is null;
end;
$fn$ language plpgsql security definer;
`,

  resume_recurring: `
create or replace function public.resume_recurring(p_transaction_id uuid)
returns void as $fn$
begin
  update public.transactions
  set recurring_stopped_at = null
  where id = p_transaction_id
    and user_id = auth.uid()
    and recurring_frequency is not null;
end;
$fn$ language plpgsql security definer;
`,

  redeem_reward: `
create or replace function public.redeem_reward(p_reward_id uuid)
returns json as $fn$
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

  update public.profiles
  set total_points = total_points - v_reward.cost_in_points
  where id = v_user_id;

  insert into public.redemptions (user_id, reward_id, points_spent)
  values (v_user_id, p_reward_id, v_reward.cost_in_points);

  return json_build_object('success', true, 'remaining_points', v_profile.total_points - v_reward.cost_in_points);
end;
$fn$ language plpgsql security definer;
`,

  change_currency: `
create or replace function public.change_currency(
  p_new_currency text,
  p_conversion_rate numeric
)
returns void as $fn$
declare
  v_user_id uuid := auth.uid();
begin
  update public.transactions
  set amount = round((amount * p_conversion_rate)::numeric, 2)
  where user_id = v_user_id;

  update public.budgets
  set monthly_limit = round((monthly_limit * p_conversion_rate)::numeric, 2)
  where user_id = v_user_id;

  update public.profiles
  set currency = p_new_currency
  where id = v_user_id;
end;
$fn$ language plpgsql security definer;
`,

  seed_default_budgets: `
create or replace function public.seed_default_budgets(p_user_id uuid)
returns void as $fn$
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
$fn$ language plpgsql security definer;
`,
};

async function main() {
  print('[SETUP] Creating missing Supabase RPC functions');
  print('[SETUP] Target: ' + SUPABASE_URL);
  print('');
  
  // Step 1: First try to create exec_sql helper
  print('[STEP 1] Checking if exec_sql helper exists...');
  let execResult = await rpc('exec_sql', { sql_text: 'SELECT 1' });
  
  if (execResult.status === 404) {
    print('[STEP 1] exec_sql not found. The functions need to be created via the SQL Editor.');
    print('');
    print('[ACTION REQUIRED]');
    print('Please go to: https://supabase.com/dashboard/project/bugfydhdoxuzdlagdiaw/sql/new');
    print('And paste the FULL contents of src/db/supabase_migration.sql');
    print('Then click "Run"');
    print('');
    print('Alternatively, the functions are written below for individual pasting:');
    
    for (const [name, sql] of Object.entries(FUNCTIONS)) {
      print('');
      print('--- ' + name + ' ---');
    }
  } else {
    print('[STEP 1] exec_sql exists! Using it to create functions...');
    
    for (const [name, sql] of Object.entries(FUNCTIONS)) {
      print('[CREATE] ' + name + '...');
      const result = await rpc('exec_sql', { sql_text: sql });
      print('  -> ' + (result.ok ? 'OK' : 'FAIL: ' + result.body.substring(0, 100)));
    }
  }
  
  // Step 2: Verify
  print('');
  print('[VERIFY] Checking all functions...');
  const rpcs = ['add_transaction_with_streak', 'stop_recurring', 'resume_recurring', 'get_monthly_summary', 'get_spending_history', 'redeem_reward', 'change_currency', 'seed_default_budgets'];
  
  for (const name of rpcs) {
    const r = await rpc(name, {});
    print('  ' + name + ': ' + (r.status === 404 ? 'MISSING' : 'EXISTS (' + r.status + ')'));
  }
  
  writeFileSync(new URL('./migration_log.txt', import.meta.url).pathname.substring(1), log.join('\n'));
}

main().catch(err => {
  print('[FATAL] ' + err.message);
  process.exit(1);
});
