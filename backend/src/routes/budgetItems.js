const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { getPool } = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/',
  [query('fiscal_year').optional().isInt({ min: 2000, max: 2100 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const pool = getPool();
    const year = req.query.fiscal_year;
    try {
      let sql = `
        SELECT bi.id, bi.name, bi.fiscal_year, bi.total_amount, bi.description, bi.created_at,
          bi.total_amount - COALESCE((
            SELECT SUM(c.amount) FROM claims c
            WHERE c.budget_item_id = bi.id AND c.status = 'approved'
          ), 0) AS remaining_amount
        FROM budget_items bi
      `;
      const params = [];
      if (year !== undefined) {
        sql += ` WHERE bi.fiscal_year = ?`;
        params.push(Number(year));
      }
      sql += ` ORDER BY bi.fiscal_year DESC, bi.name ASC`;
      const [rows] = await pool.query(sql, params);
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: '예산 항목 조회 중 오류가 발생했습니다.' });
    }
  }
);

router.post(
  '/',
  requireAdmin,
  [
    body('name').trim().notEmpty(),
    body('fiscal_year').isInt({ min: 2000, max: 2100 }),
    body('total_amount').isFloat({ min: 0 }),
    body('description').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, fiscal_year: fiscalYear, total_amount: totalAmount, description } = req.body;
    const pool = getPool();
    try {
      const [r] = await pool.query(
        `INSERT INTO budget_items (name, fiscal_year, total_amount, description) VALUES (?, ?, ?, ?)`,
        [name, fiscalYear, totalAmount, description ?? null]
      );
      const [rows] = await pool.query(
        `SELECT id, name, fiscal_year, total_amount, description, created_at FROM budget_items WHERE id = ?`,
        [r.insertId]
      );
      return res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: '같은 연도에 동일한 항목명이 이미 있습니다.' });
      }
      console.error(err);
      return res.status(500).json({ error: '예산 항목 생성 중 오류가 발생했습니다.' });
    }
  }
);

router.put(
  '/:id',
  requireAdmin,
  [
    param('id').isInt({ min: 1 }),
    body('name').trim().notEmpty(),
    body('fiscal_year').isInt({ min: 2000, max: 2100 }),
    body('total_amount').isFloat({ min: 0 }),
    body('description').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const id = Number(req.params.id);
    const { name, fiscal_year: fiscalYear, total_amount: totalAmount, description } = req.body;
    const pool = getPool();
    try {
      const [r] = await pool.query(
        `UPDATE budget_items SET name = ?, fiscal_year = ?, total_amount = ?, description = ? WHERE id = ?`,
        [name, fiscalYear, totalAmount, description ?? null, id]
      );
      if (r.affectedRows === 0) {
        return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
      }
      const [rows] = await pool.query(
        `SELECT id, name, fiscal_year, total_amount, description, created_at FROM budget_items WHERE id = ?`,
        [id]
      );
      return res.json(rows[0]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: '같은 연도에 동일한 항목명이 이미 있습니다.' });
      }
      console.error(err);
      return res.status(500).json({ error: '예산 항목 수정 중 오류가 발생했습니다.' });
    }
  }
);

router.delete('/:id', requireAdmin, [param('id').isInt({ min: 1 })], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const id = Number(req.params.id);
  const pool = getPool();
  try {
    const [cnt] = await pool.query(
      `SELECT COUNT(*) AS c FROM claims WHERE budget_item_id = ?`,
      [id]
    );
    if (cnt[0].c > 0) {
      return res.status(400).json({ error: '청구 내역이 있는 항목은 삭제할 수 없습니다.' });
    }
    const [r] = await pool.query(`DELETE FROM budget_items WHERE id = ?`, [id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
