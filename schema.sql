PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS players (
 id TEXT PRIMARY KEY CHECK(length(id)=36),
 display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 3 AND 20),
 token_hash TEXT NOT NULL CHECK(length(token_hash)=64),
 registration_ip_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL DEFAULT (unixepoch()),
 updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS players_registration ON players(registration_ip_hash,created_at);
CREATE TABLE IF NOT EXISTS scores (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 mode TEXT NOT NULL CHECK(mode IN ('easy','medium','hard')),
 score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 2000000),
 population INTEGER NOT NULL CHECK(population BETWEEN 0 AND 100000),
 happiness INTEGER NOT NULL CHECK(happiness BETWEEN 0 AND 100),
 treasury INTEGER NOT NULL CHECK(treasury BETWEEN -10000000 AND 1000000000),
 employment INTEGER NOT NULL CHECK(employment BETWEEN 0 AND 100),
 milestones INTEGER NOT NULL CHECK(milestones BETWEEN 0 AND 5),
 submitted_at INTEGER NOT NULL DEFAULT (unixepoch()),
 best_at INTEGER NOT NULL DEFAULT (unixepoch()),
 UNIQUE(player_id, mode)
);
CREATE INDEX IF NOT EXISTS scores_ranking ON scores(mode,score DESC,best_at ASC,player_id);
