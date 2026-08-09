// middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid. Please log in again.' });
    }
    req.user = payload; // { id, username, role }
    next();
  });
}

module.exports = { authenticateToken };
