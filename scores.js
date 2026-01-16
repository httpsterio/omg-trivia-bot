const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

let db = null;

function initDatabase() {
  const dataDir = "./data";
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(path.join(dataDir, "scores.db"));

  db.exec(`
    CREATE TABLE IF NOT EXISTS score_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nick TEXT NOT NULL,
      answered_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_nick ON score_events(nick);
    CREATE INDEX IF NOT EXISTS idx_answered_at ON score_events(answered_at);

    CREATE TABLE IF NOT EXISTS user_stats (
      nick TEXT PRIMARY KEY,
      all_time INTEGER DEFAULT 0
    );
  `);

  console.log("Score database initialized");
}

function recordScore(nick) {
  const now = Math.floor(Date.now() / 1000);

  db.prepare("INSERT INTO score_events (nick, answered_at) VALUES (?, ?)").run(
    nick,
    now,
  );

  db.prepare(
    `INSERT INTO user_stats (nick, all_time) VALUES (?, 1)
     ON CONFLICT(nick) DO UPDATE SET all_time = all_time + 1`,
  ).run(nick);
}

function getPlayerScore(nick) {
  const now = Math.floor(Date.now() / 1000);
  const startOfWeek = getStartOfWeek();
  const startOfMonth = getStartOfMonth();

  const allTime =
    db.prepare("SELECT all_time FROM user_stats WHERE nick = ?").get(nick)
      ?.all_time || 0;

  const week =
    db
      .prepare(
        "SELECT COUNT(*) as count FROM score_events WHERE nick = ? AND answered_at >= ?",
      )
      .get(nick, startOfWeek)?.count || 0;

  const month =
    db
      .prepare(
        "SELECT COUNT(*) as count FROM score_events WHERE nick = ? AND answered_at >= ?",
      )
      .get(nick, startOfMonth)?.count || 0;

  return { allTime, week, month };
}

function getTopScores(timeframe, limit = 10) {
  if (timeframe === "alltime") {
    return db
      .prepare(
        "SELECT nick, all_time as score FROM user_stats ORDER BY all_time DESC LIMIT ?",
      )
      .all(limit);
  }

  let startTime;
  if (timeframe === "week") {
    startTime = getStartOfWeek();
  } else if (timeframe === "month") {
    startTime = getStartOfMonth();
  } else {
    return [];
  }

  return db
    .prepare(
      `SELECT nick, COUNT(*) as score FROM score_events
       WHERE answered_at >= ?
       GROUP BY nick ORDER BY score DESC LIMIT ?`,
    )
    .all(startTime, limit);
}

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return Math.floor(monday.getTime() / 1000);
}

function getStartOfMonth() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  firstDay.setHours(0, 0, 0, 0);
  return Math.floor(firstDay.getTime() / 1000);
}

module.exports = {
  initDatabase,
  recordScore,
  getPlayerScore,
  getTopScores,
};
