const express = require('express');
const authRouter = require('./auth');
const budgetItemsRouter = require('./budgetItems');
const claimsRouter = require('./claims');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRouter);
router.use('/budget-items', budgetItemsRouter);
router.use('/claims', claimsRouter);

module.exports = router;
