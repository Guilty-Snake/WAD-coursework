// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, register, me } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', login);
// Registration must be admin-gated: an open /register endpoint would let anyone
// mint themselves an admin account, defeating the whole point of authentication.
// Use scripts/seed.js to create the first admin instead of exposing this publicly.
router.post('/register', authenticateToken, register);
router.get('/me', authenticateToken, me);

module.exports = router;
