// routes/authorRoutes.js
const express = require('express');
const router = express.Router();
const authors = require('../controllers/authorController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authors.list);
router.get('/:id', authors.getOne);
router.post('/', authenticateToken, authors.create);
router.put('/:id', authenticateToken, authors.update);
router.delete('/:id', authenticateToken, authors.remove);

module.exports = router;
