// scripts/seed.js
// Run with: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const initSchema = require('../config/schema');

initSchema();

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'ChangeMe123!'; // change after first login, this is a coursework demo default

function upsertAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME);
  if (existing) {
    console.log(`Admin user "${ADMIN_USERNAME}" already exists, skipping.`);
    return;
  }
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
    ADMIN_USERNAME,
    hash,
    'admin'
  );
  console.log(`Created admin user -> username: ${ADMIN_USERNAME}  password: ${ADMIN_PASSWORD}`);
}

function seedRefData() {
  const authors = [
    { name: 'George Orwell', bio: 'English novelist and essayist, 1903-1950.' },
    { name: 'Jane Austen', bio: 'English novelist known for her wit and social commentary.' },
    { name: 'Haruki Murakami', bio: 'Japanese contemporary writer.' },
  ];
  const genres = ['Fiction', 'Dystopian', 'Romance', 'Fantasy'];

  const insertAuthor = db.prepare('INSERT INTO authors (name, bio) VALUES (?, ?)');
  const insertGenre = db.prepare('INSERT INTO genres (name) VALUES (?)');
  const getAuthorId = db.prepare('SELECT id FROM authors WHERE name = ?');
  const getGenreId = db.prepare('SELECT id FROM genres WHERE name = ?');

  for (const a of authors) {
    if (!getAuthorId.get(a.name)) insertAuthor.run(a.name, a.bio);
  }
  for (const g of genres) {
    if (!getGenreId.get(g)) insertGenre.run(g);
  }

  const bookCount = db.prepare('SELECT COUNT(*) AS c FROM books').get().c;
  if (bookCount > 0) {
    console.log('Books already exist, skipping book seed.');
    return;
  }

  const orwellId = getAuthorId.get('George Orwell').id;
  const austenId = getAuthorId.get('Jane Austen').id;
  const murakamiId = getAuthorId.get('Haruki Murakami').id;
  const dystopianId = getGenreId.get('Dystopian').id;
  const romanceId = getGenreId.get('Romance').id;
  const fictionId = getGenreId.get('Fiction').id;

  const insertBook = db.prepare(`
    INSERT INTO books (title, isbn, author_id, genre_id, published_year, description, total_copies, copies_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBook.run('Nineteen Eighty-Four', '9780451524935', orwellId, dystopianId, 1949, 'A dystopian social science fiction novel.', 8, 3);
  insertBook.run('Pride and Prejudice', '9780141439518', austenId, romanceId, 1813, 'A romantic novel of manners.', 6, 6);
  insertBook.run('Norwegian Wood', '9780375704024', murakamiId, fictionId, 1987, 'A nostalgic story of loss and burgeoning sexuality.', 4, 2);

  console.log('Seeded sample authors, genres and books.');
}

upsertAdmin();
seedRefData();
console.log('Seed complete.');
