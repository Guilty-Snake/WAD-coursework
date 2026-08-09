// controllers/authorController.js
const db = require('../config/db');
const { validateAuthor } = require('../middleware/validate');

function list(req, res, next) {
  try {
    const { search } = req.query;
    let rows;
    if (search) {
      rows = db
        .prepare('SELECT * FROM authors WHERE name LIKE ? ORDER BY name ASC')
        .all(`%${search}%`);
    } else {
      rows = db.prepare('SELECT * FROM authors ORDER BY name ASC').all();
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

function getOne(req, res, next) {
  try {
    const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(req.params.id);
    if (!author) return res.status(404).json({ error: 'Author not found.' });
    res.json(author);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const errors = validateAuthor(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const { name, bio } = req.body;
    const result = db
      .prepare('INSERT INTO authors (name, bio) VALUES (?, ?)')
      .run(name.trim(), bio ? bio.trim() : null);

    const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(author);
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    const existing = db.prepare('SELECT * FROM authors WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Author not found.' });

    const errors = validateAuthor(req.body, { partial: true });
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;
    const bio = req.body.bio !== undefined ? req.body.bio : existing.bio;

    db.prepare('UPDATE authors SET name = ?, bio = ? WHERE id = ?').run(name, bio, req.params.id);
    const updated = db.prepare('SELECT * FROM authors WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const existing = db.prepare('SELECT * FROM authors WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Author not found.' });

    const bookCount = db.prepare('SELECT COUNT(*) AS c FROM books WHERE author_id = ?').get(req.params.id).c;
    if (bookCount > 0) {
      return res.status(409).json({ error: `Cannot delete: ${bookCount} book(s) still reference this author.` });
    }

    db.prepare('DELETE FROM authors WHERE id = ?').run(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
