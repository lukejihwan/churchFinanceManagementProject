/**
 * 관리자 계정 생성: backend/.env 에 ADMIN_EMAIL, ADMIN_PASSWORD 설정 후 실행
 *   node scripts/create-admin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getPool } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('ADMIN_EMAIL, ADMIN_PASSWORD 를 .env 에 설정한 뒤 다시 실행하세요.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD 는 8자 이상이어야 합니다.');
    process.exit(1);
  }
  const fullName = process.env.ADMIN_NAME || '관리자';
  const pool = getPool();
  const hash = await hashPassword(password);
  try {
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')`,
      [email, hash, fullName]
    );
    console.log(`관리자 계정 생성됨: ${email}`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.error('이미 존재하는 이메일입니다.');
    } else {
      console.error(err);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
