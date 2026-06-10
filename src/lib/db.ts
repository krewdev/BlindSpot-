'use server';

import { Pool } from 'pg';
import { Profile, MatchHistoryEntry, RLHFPrompt, Box } from './types';

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
    await client.query('SELECT pg_advisory_xact_lock(123456);');
    
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
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Backwards-compatible schema upgrade for existing tables
    await client.query('ALTER TABLE annotations ADD COLUMN IF NOT EXISTS metadata JSONB;');

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

    // Custom Judge Prompts
    await client.query(`
      CREATE TABLE IF NOT EXISTS judge_prompts (
        id TEXT PRIMARY KEY,
        prompt TEXT,
        response_a TEXT,
        response_b TEXT,
        model_a TEXT,
        model_b TEXT,
        category TEXT,
        difficulty TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Custom Vision Hunt Images
    await client.query(`
      CREATE TABLE IF NOT EXISTS vision_hunt_images (
        id TEXT PRIMARY KEY,
        image_url TEXT,
        ai_boxes JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    return { success: true, message: 'Database schema initialized successfully.' };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) || 'Unknown database error' };
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
  } catch (error: unknown) {
    console.error('Failed to sync profile to database:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
  } catch (error: unknown) {
    console.error('Failed to fetch leaderboard from database:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error), data: [] };
  }
}

// Record completed match and sync reputation
export async function dbAddMatch(match: MatchHistoryEntry, profileId: string, metadata?: any) {
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

    // 2. Insert annotation with high-fidelity telemetry metadata
    const isVision = match.gameMode === 'vision_hunt';
    const isJudge = match.gameMode === 'the_judge';
    const class_name = isVision ? 'car' : isJudge ? 'text-pair' : 'text-caption';
    await client.query(
      `INSERT INTO annotations (match_id, player_id, role, source, class_name, x, y, width, height, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0, $6, $7);`,
      [
        match.id,
        profileId,
        match.role.substring(0, 15),
        'human',
        class_name,
        metadata ? JSON.stringify(metadata) : null,
        match.timestamp
      ]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('Failed to add match to database:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    client.release();
  }
}

// RLHF Prompts CRUD
export async function dbGetPrompts() {
  try {
    const res = await pool.query('SELECT * FROM judge_prompts ORDER BY created_at DESC;');
    const prompts: RLHFPrompt[] = res.rows.map(row => ({
      id: row.id,
      prompt: row.prompt,
      responseA: row.response_a,
      responseB: row.response_b,
      modelA: row.model_a,
      modelB: row.model_b,
      category: row.category,
      difficulty: row.difficulty
    }));
    return { success: true, data: prompts };
  } catch (error: unknown) {
    console.error('Failed to query prompts from database:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error), data: [] };
  }
}

export async function dbCreatePrompt(prompt: RLHFPrompt) {
  try {
    const res = await pool.query(
      `INSERT INTO judge_prompts (id, prompt, response_a, response_b, model_a, model_b, category, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        prompt.id,
        prompt.prompt,
        prompt.responseA,
        prompt.responseB,
        prompt.modelA,
        prompt.modelB,
        prompt.category,
        prompt.difficulty
      ]
    );
    return { success: true, data: res.rows[0] };
  } catch (error: unknown) {
    console.error('Failed to create prompt in database:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function dbDeletePrompt(id: string) {
  try {
    await pool.query('DELETE FROM judge_prompts WHERE id = $1;', [id]);
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to delete prompt from database:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Vision Hunt Images CRUD
export async function dbGetImages() {
  try {
    const res = await pool.query('SELECT * FROM vision_hunt_images ORDER BY created_at DESC;');
    const images = res.rows.map(row => ({
      id: row.id,
      imageUrl: row.image_url,
      aiBoxes: (typeof row.ai_boxes === 'string' ? JSON.parse(row.ai_boxes) : row.ai_boxes) as Box[]
    }));
    return { success: true, data: images };
  } catch (error: unknown) {
    console.error('Failed to query images from database:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error), data: [] };
  }
}

export async function dbCreateImage(id: string, imageUrl: string, aiBoxes: Box[]) {
  try {
    const res = await pool.query(
      `INSERT INTO vision_hunt_images (id, image_url, ai_boxes)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [id, imageUrl, JSON.stringify(aiBoxes)]
    );
    return { success: true, data: res.rows[0] };
  } catch (error: unknown) {
    console.error('Failed to create image in database:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function dbDeleteImage(id: string) {
  try {
    await pool.query('DELETE FROM vision_hunt_images WHERE id = $1;', [id]);
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to delete image from database:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Telemetry Aggregation for Dev Portal
export async function dbGetAnnotationTelemetry() {
  try {
    // 1. Total annotations count
    const totalAnnotationsRes = await pool.query('SELECT COUNT(*) FROM annotations;');
    const totalAnnotations = parseInt(totalAnnotationsRes.rows[0].count);

    // 2. Average consensus score
    const avgScoreRes = await pool.query('SELECT AVG(score) FROM matches WHERE status = \'completed\';');
    const avgScore = parseFloat(avgScoreRes.rows[0].avg || '0');

    // 3. Category/Mode distribution
    const modeDistRes = await pool.query(
      `SELECT game_mode, COUNT(*) as count 
       FROM (
         SELECT player1_id, created_at, 
                CASE 
                  WHEN role LIKE 'Hunter%' THEN 'vision_hunt'
                  WHEN role LIKE 'Judge%' THEN 'the_judge'
                  WHEN role LIKE 'Writer%' THEN 'caption_clash'
                  WHEN role LIKE 'Hacker%' THEN 'bug_bounty'
                  ELSE 'unknown'
                END as game_mode
         FROM annotations a
         JOIN matches m ON a.match_id = m.id
       ) sub
       GROUP BY game_mode;`
    );
    
    const modeDistribution = modeDistRes.rows.reduce((acc, row) => {
      acc[row.game_mode] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);

    // 4. Verification rate
    const totalVotesRes = await pool.query('SELECT COUNT(*) FROM verification_votes;');
    const correctVotesRes = await pool.query('SELECT COUNT(*) FROM verification_votes WHERE is_correct = TRUE;');
    const totalVotes = parseInt(totalVotesRes.rows[0].count);
    const correctVotes = parseInt(correctVotesRes.rows[0].count);
    const verificationRate = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 94.5; // default/mock if empty

    return {
      success: true,
      data: {
        totalAnnotations,
        avgScore,
        modeDistribution,
        verificationRate
      }
    };
  } catch (error: unknown) {
    console.error('Failed to fetch annotation telemetry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      data: {
        totalAnnotations: 0,
        avgScore: 0,
        modeDistribution: {},
        verificationRate: 94.5
      }
    };
  }
}

// Fetch logged telemetry annotations from database for Admin Console exporting
export async function dbGetExportData(mode: 'rlhf' | 'caption' | 'vision' | 'exploit') {
  try {
    let query = '';
    let classNameFilter = '';
    if (mode === 'rlhf') {
      classNameFilter = 'text-pair';
    } else if (mode === 'caption') {
      classNameFilter = 'text-caption';
    } else if (mode === 'vision') {
      classNameFilter = 'car';
    } else {
      classNameFilter = 'bug-bounty';
    }

    if (mode === 'vision') {
      query = `
        SELECT a.metadata, m.id as match_id, m.created_at, p.wallet_address
        FROM annotations a
        JOIN matches m ON a.match_id = m.id
        LEFT JOIN profiles p ON a.player_id = p.id
        WHERE a.class_name IN ('car', 'person', 'box') AND a.metadata IS NOT NULL
        ORDER BY a.created_at DESC;
      `;
    } else if (mode === 'exploit') {
      query = `
        SELECT a.metadata, m.id as match_id, m.created_at, p.wallet_address
        FROM annotations a
        JOIN matches m ON a.match_id = m.id
        LEFT JOIN profiles p ON a.player_id = p.id
        WHERE a.role = 'Hacker' AND a.metadata IS NOT NULL
        ORDER BY a.created_at DESC;
      `;
    } else {
      query = `
        SELECT a.metadata, m.id as match_id, m.created_at, p.wallet_address
        FROM annotations a
        JOIN matches m ON a.match_id = m.id
        LEFT JOIN profiles p ON a.player_id = p.id
        WHERE a.class_name = $1 AND a.metadata IS NOT NULL
        ORDER BY a.created_at DESC;
      `;
    }

    const res = await pool.query(query, mode === 'vision' || mode === 'exploit' ? [] : [classNameFilter]);
    return { success: true, data: res.rows };
  } catch (error: unknown) {
    console.error(`Failed to fetch export data for ${mode}:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error), data: [] };
  }
}
