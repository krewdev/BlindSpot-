'use server';

import { Pool } from 'pg';
import { Profile, MatchHistoryEntry } from './types';

// Ensure the client-side code doesn't bundle pg by using Server Actions
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Idempotent database initialization
export async function dbInitSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        username TEXT,
        wallet_address TEXT,
        reputation_score NUMERIC DEFAULT 50,
        matches_played INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Matches
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'waiting',
        player1_id TEXT REFERENCES profiles(id),
        player2_id TEXT REFERENCES profiles(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Annotations
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

    // Verification Votes
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
    return { success: true, message: 'Database schema initialized successfully.' };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', error);
    return { success: false, error: error?.message || 'Unknown database error' };
  } finally {
    client.release();
  }
}

// Upsert User Profile
export async function dbSyncProfile(profile: Profile) {
  try {
    const res = await pool.query(
      `INSERT INTO profiles (id, username, wallet_address, reputation_score, matches_played, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE 
       SET username = EXCLUDED.username,
           wallet_address = EXCLUDED.wallet_address,
           reputation_score = EXCLUDED.reputation_score,
           matches_played = EXCLUDED.matches_played
       RETURNING *;`,
      [
        profile.id,
        profile.username,
        profile.wallet_address,
        profile.reputation_score,
        profile.matches_played,
        profile.created_at
      ]
    );
    return { success: true, data: res.rows[0] };
  } catch (error: any) {
    console.error('Failed to sync profile to database:', error);
    return { success: false, error: error?.message };
  }
}

// Get Leaderboard Profiles
export async function dbGetLeaderboard() {
  try {
    const res = await pool.query(
      `SELECT id, username, wallet_address, reputation_score, matches_played, created_at 
       FROM profiles 
       ORDER BY reputation_score DESC, matches_played DESC 
       LIMIT 10;`
    );
    
    // Map rows to Profile types
    const profiles: Profile[] = res.rows.map(row => ({
      id: row.id,
      username: row.username,
      wallet_address: row.wallet_address,
      reputation_score: parseFloat(row.reputation_score),
      matches_played: parseInt(row.matches_played),
      created_at: row.created_at
    }));

    return { success: true, data: profiles };
  } catch (error: any) {
    console.error('Failed to fetch leaderboard from database:', error);
    return { success: false, error: error?.message, data: [] };
  }
}

// Record completed match and sync reputation
export async function dbAddMatch(match: MatchHistoryEntry, profileId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Insert match
    await client.query(
      `INSERT INTO matches (id, status, player1_id, created_at)
       VALUES ($1, 'completed', $2, $3)
       ON CONFLICT (id) DO NOTHING;`,
      [match.id, profileId, match.timestamp]
    );

    // 2. Insert mock annotation (just to populate schema columns)
    const isVision = match.gameMode === 'vision_hunt';
    const isJudge = match.gameMode === 'the_judge';
    const class_name = isVision ? 'car' : isJudge ? 'text-pair' : 'text-caption';
    await client.query(
      `INSERT INTO annotations (match_id, player_id, role, source, class_name, x, y, width, height, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0, $6);`,
      [
        match.id,
        profileId,
        match.role.substring(0, 15),
        'human',
        class_name,
        match.timestamp
      ]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Failed to add match to database:', error);
    return { success: false, error: error?.message };
  } finally {
    client.release();
  }
}
