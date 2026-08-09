// config/schema.js
// "Code-first" database design: the schema lives here in code and is applied
// to the SQLite file on startup. Running it repeatedly is safe (IF NOT EXISTS).
const db = require('./db');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS authors (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      bio        TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS genres (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS books (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      title            TEXT NOT NULL,
      isbn             TEXT UNIQUE,
      author_id        INTEGER NOT NULL,
      genre_id         INTEGER NOT NULL,
      published_year   INTEGER,
      description      TEXT,
      cover_image      TEXT,
      total_copies     INTEGER NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
      copies_available INTEGER NOT NULL DEFAULT 1 CHECK (copies_available >= 0),
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT,
      FOREIGN KEY (genre_id)  REFERENCES genres(id)  ON DELETE RESTRICT,
      CHECK (copies_available <= total_copies)
    );

    CREATE INDEX IF NOT EXISTS idx_books_author ON books(author_id);
    CREATE INDEX IF NOT EXISTS idx_books_genre  ON books(genre_id);
    CREATE INDEX IF NOT EXISTS idx_books_title  ON books(title);
  `);

  console.log('Database schema ready.');
}

module.exports = initSchema;
