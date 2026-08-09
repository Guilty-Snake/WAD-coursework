// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { validateCredentials } = require('../middleware/validate');

const SALT_ROUNDS = 10;

function login(req, res, next) {
  try {
    const errors = validateCredentials(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    next(err);
  }
}

// Registration is optional per the brief and is admin-gated (see routes/authRoutes.js
// — POST /register requires an existing valid token). Useful for an already-logged-in
// admin to add a colleague; the very first admin account still comes from scripts/seed.js.
function register(req, res, next) {
  try {
    const errors = validateCredentials(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const { username, password } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (existing) return res.status(409).json({ error: 'That username is already taken.' });

    const password_hash = bcrypt.hashSync(password, SALT_ROUNDS);
    const result = db
      .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
      .run(username.trim(), password_hash, 'admin');

    res.status(201).json({ id: result.lastInsertRowid, username: username.trim() });
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, register, me };
