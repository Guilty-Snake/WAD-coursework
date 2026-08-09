// controllers/bookController.js
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { validateBook } = require('../middleware/validate');
const { LOW_STOCK_THRESHOLD } = require('../config/constants');

// Every book row is returned joined with author/genre names (never just the
// FK id) and annotated with a low_stock flag the frontend can highlight.
const BASE_SELECT = `
  SELECT
    books.*,
    authors.name AS author_name,
    genres.name  AS genre_name
  FROM books
  JOIN authors ON authors.id = books.author_id
  JOIN genres  ON genres.id  = books.genre_id
`;

function annotate(book) {
  return { ...book, low_stock: book.copies_available <= LOW_STOCK_THRESHOLD };
}

function list(req, res, next) {
  try {
    const { search, author_id, genre_id, low_stock } = req.query;
    const clauses = [];
    const params = [];

    if (search) {
      clauses.push('(books.title LIKE ? OR books.isbn LIKE ? OR authors.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (author_id) {
      clauses.push('books.author_id = ?');
      params.push(author_id);
    }
    if (genre_id) {
      clauses.push('books.genre_id = ?');
      params.push(genre_id);
    }

    let sql = BASE_SELECT;
    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
    sql += ' ORDER BY books.title ASC';

    let rows = db.prepare(sql).all(...params).map(annotate);

    if (low_stock === 'true') {
      rows = rows.filter((b) => b.low_stock);
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

function getOne(req, res, next) {
  try {
    const book = db.prepare(`${BASE_SELECT} WHERE books.id = ?`).get(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    res.json(annotate(book));
  } catch (err) {
    next(err);
  }
}

function deleteUploadedFile(filename) {
  if (!filename) return;
  const filePath = path.resolve(__dirname, '..', 'uploads', filename);
  fs.unlink(filePath, () => {}); // best-effort cleanup, ignore errors
}

function create(req, res, next) {
  try {
    const body = { ...req.body };
    const errors = validateBook(body);

    // Cross-reference checks: author/genre must actually exist.
    if (!errors.author_id) {
      const a = db.prepare('SELECT id FROM authors WHERE id = ?').get(body.author_id);
      if (!a) errors.author_id = 'Selected author does not exist.';
    }
    if (!errors.genre_id) {
      const g = db.prepare('SELECT id FROM genres WHERE id = ?').get(body.genre_id);
      if (!g) errors.genre_id = 'Selected genre does not exist.';
    }

    if (Object.keys(errors).length) {
      if (req.file) deleteUploadedFile(req.file.filename); // don't leave orphaned uploads
      return res.status(400).json({ errors });
    }

    const cover_image = req.file ? req.file.filename : null;
    const total_copies = Number(body.total_copies);
    const copies_available = body.copies_available !== undefined ? Number(body.copies_available) : total_copies;

    const result = db
      .prepare(
        `INSERT INTO books
          (title, isbn, author_id, genre_id, published_year, description, cover_image, total_copies, copies_available)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.title.trim(),
        body.isbn ? body.isbn.trim() : null,
        Number(body.author_id),
        Number(body.genre_id),
        body.published_year ? Number(body.published_year) : null,
        body.description ? body.description.trim() : null,
        cover_image,
        total_copies,
        copies_available
      );

    const book = db.prepare(`${BASE_SELECT} WHERE books.id = ?`).get(result.lastInsertRowid);
    res.status(201).json(annotate(book));
  } catch (err) {
    if (req.file) deleteUploadedFile(req.file.filename);
    next(err);
  }
}

function update(req, res, next) {
  try {
    const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!existing) {
      if (req.file) deleteUploadedFile(req.file.filename);
      return res.status(404).json({ error: 'Book not found.' });
    }

    const body = { ...req.body };
    const errors = validateBook(body, { partial: true });

    if (body.author_id !== undefined && !errors.author_id) {
      const a = db.prepare('SELECT id FROM authors WHERE id = ?').get(body.author_id);
      if (!a) errors.author_id = 'Selected author does not exist.';
    }
    if (body.genre_id !== undefined && !errors.genre_id) {
      const g = db.prepare('SELECT id FROM genres WHERE id = ?').get(body.genre_id);
      if (!g) errors.genre_id = 'Selected genre does not exist.';
    }

    if (Object.keys(errors).length) {
      if (req.file) deleteUploadedFile(req.file.filename);
      return res.status(400).json({ errors });
    }

    const merged = {
      title: body.title !== undefined ? body.title.trim() : existing.title,
      isbn: body.isbn !== undefined ? (body.isbn.trim() || null) : existing.isbn,
      author_id: body.author_id !== undefined ? Number(body.author_id) : existing.author_id,
      genre_id: body.genre_id !== undefined ? Number(body.genre_id) : existing.genre_id,
      published_year: body.published_year !== undefined ? (body.published_year ? Number(body.published_year) : null) : existing.published_year,
      description: body.description !== undefined ? body.description.trim() : existing.description,
      total_copies: body.total_copies !== undefined ? Number(body.total_copies) : existing.total_copies,
      copies_available: body.copies_available !== undefined ? Number(body.copies_available) : existing.copies_available,
    };

    let cover_image = existing.cover_image;
    if (req.file) {
      cover_image = req.file.filename;
      deleteUploadedFile(existing.cover_image); // replace old cover
    }

    db.prepare(
      `UPDATE books SET
        title = ?, isbn = ?, author_id = ?, genre_id = ?, published_year = ?,
        description = ?, cover_image = ?, total_copies = ?, copies_available = ?
       WHERE id = ?`
    ).run(
      merged.title,
      merged.isbn,
      merged.author_id,
      merged.genre_id,
      merged.published_year,
      merged.description,
      cover_image,
      merged.total_copies,
      merged.copies_available,
      req.params.id
    );

    const updated = db.prepare(`${BASE_SELECT} WHERE books.id = ?`).get(req.params.id);
    res.json(annotate(updated));
  } catch (err) {
    if (req.file) deleteUploadedFile(req.file.filename);
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Book not found.' });

    db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
    deleteUploadedFile(existing.cover_image);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
