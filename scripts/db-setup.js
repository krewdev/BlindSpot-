const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=(.+)/);
if (!match) {
  console.error('DATABASE_URL not found in .env.local!');
  process.exit(1);
}

const connectionString = match[1].trim();

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  console.log('Connecting to Supabase Postgres database...');
  const client = await pool.connect();
  
  try {
    console.log('Starting migration transaction...');
    await client.query('BEGIN');

    // 1. Create profiles table
    console.log('Creating profiles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        username TEXT,
        wallet_address TEXT UNIQUE,
        reputation_score NUMERIC DEFAULT 50,
        matches_played INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Create matches table
    console.log('Creating matches table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'waiting',
        player1_id TEXT REFERENCES profiles(id),
        player2_id TEXT REFERENCES profiles(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 3. Create annotations table
    console.log('Creating annotations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS annotations (
        id BIGSERIAL PRIMARY KEY,
        match_id TEXT REFERENCES matches(id),
        player_id TEXT REFERENCES profiles(id),
        role TEXT,
        source TEXT DEFAULT 'human',
        class_name TEXT,
        x NUMERIC,
        y NUMERIC,
        width NUMERIC,
        height NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 4. Create verification_votes table
    console.log('Creating verification_votes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_votes (
        id BIGSERIAL PRIMARY KEY,
        match_id TEXT REFERENCES matches(id),
        voter_id TEXT REFERENCES profiles(id),
        annotation_id BIGINT REFERENCES annotations(id),
        is_correct BOOLEAN,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
