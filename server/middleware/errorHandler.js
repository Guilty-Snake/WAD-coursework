// middleware/errorHandler.js
// Central error handler so every route can just `next(err)` and get a
// consistent, non-generic JSON error response instead of an HTML stack trace.
//
// node:sqlite throws errors with a generic `code: 'ERR_SQLITE_ERROR'` but a
// specific numeric `errcode` (SQLite's "extended result code") that tells us
// exactly which constraint fired. Reference: https://www.sqlite.org/rescode.html
const SQLITE_CONSTRAINT_UNIQUE = 2067;
const SQLITE_CONSTRAINT_FOREIGNKEY = 787;
const SQLITE_CONSTRAINT_CHECK = 275;
const SQLITE_CONSTRAINT_NOTNULL = 1299;

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.errcode === SQLITE_CONSTRAINT_UNIQUE) {
    return res.status(409).json({ error: 'That value already exists and must be unique.' });
  }
  if (err.errcode === SQLITE_CONSTRAINT_FOREIGNKEY) {
    return res.status(409).json({ error: 'This record is referenced elsewhere and cannot be changed or removed.' });
  }
  if (err.errcode === SQLITE_CONSTRAINT_CHECK) {
    return res.status(400).json({ error: 'One of the submitted values is out of the allowed range.' });
  }
  if (err.errcode === SQLITE_CONSTRAINT_NOTNULL) {
    return res.status(400).json({ error: 'A required field was missing.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Unexpected server error.' });
}

module.exports = errorHandler;
