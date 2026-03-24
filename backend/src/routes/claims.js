const fs = require('fs');
const path = require('path');
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { getPool } = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { upload, uploadRoot } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/',
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected']),
    query('fiscal_year').optional().isInt({ min: 2000, max: 2100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const pool = getPool();
    const { status, fiscal_year: fiscalYear } = req.query;
    const isAdmin = req.user.role === 'admin';

    let sql = `
      SELECT c.id, c.user_id, c.budget_item_id, c.amount, c.description, c.receipt_image_path,
        c.status, c.created_at,
        bi.name AS budget_item_name, bi.fiscal_year,
        u.full_name AS claimant_name, u.email AS claimant_email
      FROM claims c
      INNER JOIN budget_items bi ON bi.id = c.budget_item_id
      INNER JOIN users u ON u.id = c.user_id
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin) {
      sql += ` AND c.user_id = ?`;
      params.push(req.user.id);
    }
    if (status) {
      sql += ` AND c.status = ?`;
      params.push(status);
    }
    if (fiscalYear !== undefined) {
      sql += ` AND bi.fiscal_year = ?`;
      params.push(Number(fiscalYear));
    }
    sql += ` ORDER BY c.created_at DESC`;

    try {
      const [rows] = await pool.query(sql, params);
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: '청구 목록 조회 중 오류가 발생했습니다.' });
    }
  }
);

router.post(
  '/',
  (req, res, next) => {
    upload.single('receipt')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || '파일 업로드 오류' });
      }
      next();
    });
  },
  [
    body('budget_item_id').isInt({ min: 1 }),
    body('amount').isFloat({ min: 0.01 }),
    body('description').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.file) {
      return res.status(400).json({ error: '영수증 이미지(receipt)를 첨부해 주세요.' });
    }

    const budgetItemId = Number(req.body.budget_item_id);
    const amount = Number(req.body.amount);
    const description = req.body.description || null;
    const receiptPath = req.file.filename;

    const pool = getPool();
    try {
      const [items] = await pool.query(
        `SELECT id FROM budget_items WHERE id = ? LIMIT 1`,
        [budgetItemId]
      );
      if (!items.length) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: '존재하지 않는 청구 항목입니다.' });
      }

      const [r] = await pool.query(
        `INSERT INTO claims (user_id, budget_item_id, amount, description, receipt_image_path, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [req.user.id, budgetItemId, amount, description, receiptPath]
      );
      const [rows] = await pool.query(
        `SELECT c.id, c.user_id, c.budget_item_id, c.amount, c.description, c.receipt_image_path,
          c.status, c.created_at, bi.name AS budget_item_name, bi.fiscal_year
         FROM claims c
         INNER JOIN budget_items bi ON bi.id = c.budget_item_id
         WHERE c.id = ?`,
        [r.insertId]
      );
      return res.status(201).json(rows[0]);
    } catch (err) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      console.error(err);
      return res.status(500).json({ error: '청구 등록 중 오류가 발생했습니다.' });
    }
  }
);

router.patch(
  '/:id/status',
  requireAdmin,
  [
    param('id').isInt({ min: 1 }),
    body('status').isIn(['approved', 'rejected']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const id = Number(req.params.id);
    const { status } = req.body;
    const pool = getPool();

    try {
      const [r] = await pool.query(`UPDATE claims SET status = ? WHERE id = ?`, [status, id]);
      if (r.affectedRows === 0) {
        return res.status(404).json({ error: '청구를 찾을 수 없습니다.' });
      }
      const [rows] = await pool.query(
        `SELECT c.id, c.user_id, c.budget_item_id, c.amount, c.description, c.receipt_image_path,
          c.status, c.created_at, bi.name AS budget_item_name, bi.fiscal_year,
          u.full_name AS claimant_name
         FROM claims c
         INNER JOIN budget_items bi ON bi.id = c.budget_item_id
         INNER JOIN users u ON u.id = c.user_id
         WHERE c.id = ?`,
        [id]
      );
      return res.json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: '상태 변경 중 오류가 발생했습니다.' });
    }
  }
);

router.get('/:id/receipt', [param('id').isInt({ min: 1 })], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const id = Number(req.params.id);
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      `SELECT user_id, receipt_image_path FROM claims WHERE id = ? LIMIT 1`,
      [id]
    );
    const row = rows[0];
    if (!row || !row.receipt_image_path) {
      return res.status(404).json({ error: '영수증을 찾을 수 없습니다.' });
    }
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && row.user_id !== req.user.id) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }
    const filePath = path.join(uploadRoot, row.receipt_image_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '파일이 서버에 없습니다.' });
    }
    return res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '파일 전송 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
