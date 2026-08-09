// routes/genreRoutes.js
const express = require('express');
const router = express.Router();
const genres = require('../controllers/genreController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', genres.list);
router.get('/:id', genres.getOne);
router.post('/', authenticateToken, genres.create);
router.put('/:id', authenticateToken, genres.update);
router.delete('/:id', authenticateToken, genres.remove);

module.exports = router;
