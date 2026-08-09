// routes/bookRoutes.js
const express = require('express');
const router = express.Router();
const books = require('../controllers/bookController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', books.list);
router.get('/:id', books.getOne);
router.post('/', authenticateToken, upload.single('cover_image'), books.create);
router.put('/:id', authenticateToken, upload.single('cover_image'), books.update);
router.delete('/:id', authenticateToken, books.remove);

module.exports = router;
