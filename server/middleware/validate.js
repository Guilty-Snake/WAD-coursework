// middleware/validate.js
// Small hand-rolled validators. Server-side validation is the source of
// truth — it re-checks everything the client already checked, because
// client-side checks can always be bypassed (Postman, curl, disabled JS...).

function isNonEmptyString(v, max = 255) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
}

function isPositiveInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0;
}

function isValidYear(v) {
  if (v === undefined || v === null || v === '') return true; // optional field
  const n = Number(v);
  const currentYear = new Date().getFullYear();
  return Number.isInteger(n) && n >= 1000 && n <= currentYear;
}

function validateBook(body, { partial = false } = {}) {
  const errors = {};
  const { title, isbn, author_id, genre_id, published_year, total_copies, copies_available } = body;

  if (!partial || title !== undefined) {
    if (!isNonEmptyString(title, 300)) errors.title = 'Title is required (max 300 characters).';
  }
  if (isbn !== undefined && isbn !== '' && !isNonEmptyString(isbn, 20)) {
    errors.isbn = 'ISBN must be 20 characters or fewer.';
  }
  if (!partial || author_id !== undefined) {
    if (!isPositiveInt(author_id) || Number(author_id) <= 0) errors.author_id = 'A valid author must be selected.';
  }
  if (!partial || genre_id !== undefined) {
    if (!isPositiveInt(genre_id) || Number(genre_id) <= 0) errors.genre_id = 'A valid genre must be selected.';
  }
  if (published_year !== undefined && !isValidYear(published_year)) {
    errors.published_year = `Published year must be between 1000 and ${new Date().getFullYear()}.`;
  }
  if (!partial || total_copies !== undefined) {
    if (!isPositiveInt(total_copies)) errors.total_copies = 'Total copies must be a whole number of 0 or more.';
  }
  if (!partial || copies_available !== undefined) {
    if (!isPositiveInt(copies_available)) errors.copies_available = 'Copies available must be a whole number of 0 or more.';
  }
  if (
    total_copies !== undefined &&
    copies_available !== undefined &&
    isPositiveInt(total_copies) &&
    isPositiveInt(copies_available) &&
    Number(copies_available) > Number(total_copies)
  ) {
    errors.copies_available = 'Copies available cannot exceed total copies.';
  }

  return errors;
}

function validateAuthor(body, { partial = false } = {}) {
  const errors = {};
  if (!partial || body.name !== undefined) {
    if (!isNonEmptyString(body.name, 150)) errors.name = 'Author name is required (max 150 characters).';
  }
  if (body.bio !== undefined && typeof body.bio === 'string' && body.bio.length > 2000) {
    errors.bio = 'Bio must be 2000 characters or fewer.';
  }
  return errors;
}

function validateGenre(body, { partial = false } = {}) {
  const errors = {};
  if (!partial || body.name !== undefined) {
    if (!isNonEmptyString(body.name, 100)) errors.name = 'Genre name is required (max 100 characters).';
  }
  return errors;
}

function validateCredentials(body) {
  const errors = {};
  if (!isNonEmptyString(body.username, 50)) errors.username = 'Username is required (max 50 characters).';
  if (typeof body.password !== 'string' || body.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }
  return errors;
}

module.exports = {
  validateBook,
  validateAuthor,
  validateGenre,
  validateCredentials,
};
