require('dotenv').config();

const app = require('./app');
const { getPool } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function checkDatabase() {
  const required = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(
      `[DB] .env에 ${missing.join(', ')} 가 없어 MySQL 연결을 건너뜁니다. backend/.env.example 참고.`
    );
    return;
  }
  try {
    await getPool().query('SELECT 1');
    console.log('[DB] MySQL 연결 성공');
  } catch (err) {
    console.warn('[DB] MySQL 연결 실패:', err.message);
  }
  if (!process.env.JWT_SECRET) {
    console.warn('[보안] JWT_SECRET 이 설정되지 않았습니다. 로그인 API가 동작하지 않습니다.');
  }
}

async function main() {
  await checkDatabase();
  app.listen(PORT, () => {
    console.log(`서버: http://localhost:${PORT}`);
    console.log(`헬스체크: http://localhost:${PORT}/api/health`);
  });
}

main();
