const express = require('express');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../config/database');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/token');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('비밀번호는 8자 이상이어야 합니다.'),
    body('full_name').trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, full_name: fullName } = req.body;
    const pool = getPool();
    try {
      const hash = await hashPassword(password);
      const [r] = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, 'claimant')`,
        [email, hash, fullName]
      );
      return res.status(201).json({
        id: r.insertId,
        email,
        full_name: fullName,
        role: 'claimant',
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
      }
      console.error(err);
      return res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다.' });
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const pool = getPool();
    try {
      const [rows] = await pool.query(
        `SELECT id, email, password_hash, full_name, role FROM users WHERE email = ? LIMIT 1`,
        [email]
      );
      const user = rows[0];
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }
      let token;
      try {
        token = signToken({
          sub: user.id,
          role: user.role,
          email: user.email,
        });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: '서버 설정 오류(JWT_SECRET).' });
      }
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
    }
  }
);

router.get('/me', requireAuth, async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      `SELECT id, email, full_name, role, created_at FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
