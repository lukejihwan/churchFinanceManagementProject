const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadRoot = path.resolve(
  process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads/receipts')
);

function ensureDir() {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureDir();
    cb(null, uploadRoot);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '') || '.bin';
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

function fileFilter(_req, file, cb) {
  const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error('이미지 파일(jpeg, png, gif, webp)만 업로드할 수 있습니다.'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES) || 5 * 1024 * 1024 },
});

module.exports = { upload, uploadRoot };
