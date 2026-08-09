// server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const initSchema = require('./config/schema');
const authRoutes = require('./routes/authRoutes');
const authorRoutes = require('./routes/authorRoutes');
const genreRoutes = require('./routes/genreRoutes');
const bookRoutes = require('./routes/bookRoutes');
const errorHandler = require('./middleware/errorHandler');

initSchema();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded book cover images.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/books', bookRoutes);

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// Multer errors (e.g. bad file type / too large) land here too since it calls next(err).
app.use(errorHandler);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Library API running on http://localhost:${PORT}`);
});
