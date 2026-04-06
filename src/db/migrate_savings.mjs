import pg from 'pg';

const connectionString = 'postgresql://postgres:eqP1aO6cLHVwkyC9@db.bugfydhdoxuzdlagdiaw.supabase.co:5432/postgres';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const run = async () => {
  try {
    console.log('Running savings goals migration...');
    const result = await pool.query(`
      CREATE TABLE IF NOT EXISTS public.savings_goals (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users(id) on delete cascade not null,
        name text not null,
        target_amount numeric not null,
        current_amount numeric default 0,
        color text default '#BB86FC',
        created_at timestamptz default now(),
        completed_at timestamptz
      );

      ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Users can manage their own savings goals" ON public.savings_goals;

      CREATE POLICY "Users can manage their own savings goals"
        ON public.savings_goals FOR ALL USING (auth.uid() = user_id);
    `);
    console.log('Migration successful:', result);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
};

run();
