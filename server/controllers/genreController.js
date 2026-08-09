// controllers/genreController.js
const db = require('../config/db');
const { validateGenre } = require('../middleware/validate');

function list(req, res, next) {
  try {
    const rows = db.prepare('SELECT * FROM genres ORDER BY name ASC').all();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

function getOne(req, res, next) {
  try {
    const genre = db.prepare('SELECT * FROM genres WHERE id = ?').get(req.params.id);
    if (!genre) return res.status(404).json({ error: 'Genre not found.' });
    res.json(genre);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const errors = validateGenre(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const result = db.prepare('INSERT INTO genres (name) VALUES (?)').run(req.body.name.trim());
    const genre = db.prepare('SELECT * FROM genres WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(genre);
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    const existing = db.prepare('SELECT * FROM genres WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Genre not found.' });

    const errors = validateGenre(req.body, { partial: true });
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;
    db.prepare('UPDATE genres SET name = ? WHERE id = ?').run(name, req.params.id);
    const updated = db.prepare('SELECT * FROM genres WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const existing = db.prepare('SELECT * FROM genres WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Genre not found.' });

    const bookCount = db.prepare('SELECT COUNT(*) AS c FROM books WHERE genre_id = ?').get(req.params.id).c;
    if (bookCount > 0) {
      return res.status(409).json({ error: `Cannot delete: ${bookCount} book(s) still reference this genre.` });
    }

    db.prepare('DELETE FROM genres WHERE id = ?').run(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
