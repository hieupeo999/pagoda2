# 🏛️ TEMPLE WEBSITE — Hướng dẫn hoàn chỉnh cho Claude Code

> **Mục đích:** Đọc file này là hiểu toàn bộ hệ thống. Copy repo → sửa `temple-config.js` → deploy → xong.

---

## MỤC LỤC NHANH
1. [Stack & Cấu trúc file](#1-stack--cấu-trúc-file)
2. [Tạo website chùa mới — 3 bước](#2-tạo-website-chùa-mới--3-bước)
3. [temple-config.js — File duy nhất cần sửa](#3-temple-configjs--file-duy-nhất-cần-sửa)
4. [Database Schema](#4-database-schema)
5. [Bảo mật & Mã hóa dữ liệu phật tử](#5-bảo-mật--mã-hóa-dữ-liệu-phật-tử)
6. [Admin Auth & Đổi mật khẩu](#6-admin-auth--đổi-mật-khẩu)
7. [Trang Login Admin](#7-trang-login-admin)
8. [API Routes](#8-api-routes)
9. [Email Templates & Queue](#9-email-templates--queue)
10. [Thanh toán & Webhook Sepay](#10-thanh-toán--webhook-sepay)
11. [Âm lịch](#11-âm-lịch)
12. [Admin UI — Thiết kế cho người cao tuổi](#12-admin-ui--thiết-kế-cho-người-cao-tuổi)
13. [Mobile — Hamburger Menu](#13-mobile--hamburger-menu)
14. [Deploy — Railway + 123host](#14-deploy--railway--123host)
15. [Bảo mật GitHub](#15-bảo-mật-github)
16. [Lỗi thường gặp](#16-lỗi-thường-gặp)
17. [Checklist deploy mới](#17-checklist-deploy-mới)

---

## 1. Stack & Cấu trúc file

```
Node.js 22+ + Express  |  node:sqlite (built-in, Node 22+)
Railway hosting        |  123host domain
Resend (email tự động) |  Sepay webhook (auto-confirm thanh toán)
Ho Ngoc Duc algorithm  |  Âm lịch (thuần JS, không thư viện)
AES-256-GCM            |  Mã hóa PII phật tử (crypto built-in)

project/
├── server.js            ← Backend: routes + DB + auth + email + âm lịch
├── temple-config.js     ← ★ CHỈ SỬA FILE NÀY cho chùa mới ★
├── index.html           ← Trang chủ (content tĩnh theo từng chùa)
├── thanh-toan.html      ← Trang công đức + QR payment
├── admin.html           ← Admin panel (6 tabs)
├── admin-login.html     ← Trang đăng nhập admin
├── .env.example         ← Template env vars (safe to commit)
├── .gitignore           ← Chặn .env, *.db, node_modules
└── package.json         ← "start": "node server.js" (BẮT BUỘC)
```

---

## 2. Tạo website chùa mới — 3 bước

### Bước 1: Clone repo & sửa temple-config.js
```bash
git clone <repo-url> chua-ten-moi
cd chua-ten-moi
# Sửa temple-config.js — xem section 3 bên dưới
```

### Bước 2: Thay ảnh
```
images/hero-1.jpg   → hero-2.jpg  → hero-3.jpg     (slider trang chủ, 16:9)
images/gallery-1.jpg → ... → gallery-6.jpg          (thư viện ảnh)
images/abbot.jpg                                     (ảnh trụ trì, để '' nếu không có)
```

### Bước 3: Deploy lên Railway
```
1. Push GitHub
2. Tạo Railway project → link repo
3. Set env vars (xem section 14)
4. Add custom domain
```

> ✅ **Không cần sửa server.js, admin.html, hay bất kỳ file nào khác.**
> Mọi nội dung hiển thị đều lấy từ `temple-config.js`.

---

## 3. temple-config.js — File duy nhất cần sửa

```javascript
const TEMPLE = {

  // ══ THÔNG TIN CHÙA ══════════════════════════════════════
  name:      'Chùa ABC',          // Tên đầy đủ — dùng khắp nơi trong server + email
  shortName: 'ABC',               // Tên ngắn (dùng trong câu văn)
  emoji:     '☸',                 // Logo emoji: ☸ ☯ 🪷 🏛️
  slogan:    'Nơi tâm linh...',   // Slogan hiển thị trang chủ
  subSlogan: 'Câu phụ...',

  // ══ ĐỊA CHỈ & LIÊN HỆ ══════════════════════════════════
  location:  'Thôn X, xã Y, tỉnh Z',          // Địa chỉ ngắn (header)
  address:   'Thôn X, xã Y, huyện A, tỉnh Z', // Địa chỉ đầy đủ (footer, liên hệ)
  phone:     '0912 345 678',
  phoneRaw:  '0912345678',    // Không dấu cách (dùng cho href="tel:")
  email:     'chuaabc@gmail.com',
  hours:     'Hàng ngày: 06:00 – 18:00',
  mapLink:   'https://maps.google.com/?q=...',
  fanpage:   '',              // URL Facebook (để '' nếu không có)
  youtube:   '',              // URL YouTube (để '' nếu không có)

  // ══ TRỤ TRÌ ════════════════════════════════════════════
  abbot: {
    name:  'Đại đức Thích ABC',
    title: 'Trụ trì – Chùa ABC',
    bio:   'Mô tả ngắn về trụ trì...'
  },

  // ══ NỘI DUNG TRANG CHỦ ══════════════════════════════════
  hero: {
    title:    'Chùa ABC',
    subtitle: 'Slogan trang chủ',
    badge:    '📍 Địa điểm ngắn',
    cta:      'Dâng hương & Cầu nguyện',
  },
  welcome: {
    label:      'Lời ngỏ',
    title:      'Tiêu đề lời ngỏ',
    paragraphs: ['Đoạn 1...', 'Đoạn 2...', 'Đoạn 3...'],
    signature:  '🙏 Kính cẩn',
    signatureName: 'Ban trị sự Chùa ABC'
  },
  story: {
    label: 'Giới thiệu',
    title: 'Tiêu đề giới thiệu',
    intro: 'Câu giới thiệu tổng quát...',
    features: [
      { icon: '🕯️', title: 'Tiêu đề 1', desc: 'Mô tả 1' },
      { icon: '🌸', title: 'Tiêu đề 2', desc: 'Mô tả 2' },
      { icon: '🪷', title: 'Tiêu đề 3', desc: 'Mô tả 3' },
      { icon: '📿', title: 'Tiêu đề 4', desc: 'Mô tả 4' },
    ]
  },

  // ══ KINH TRÍCH DẪN (3-5 câu) ════════════════════════════
  quotes: [
    { text: 'Câu kinh 1...', source: 'Kinh ABC', style: 'crimson' },
    { text: 'Câu kinh 2...', source: 'Thiền ngữ', style: 'gold' },
    { text: 'Câu kinh 3...', source: 'Kinh XYZ', style: 'ink' },
  ],
  // style: 'crimson' | 'gold' | 'ink'

  // ══ NGHI LỄ (dịch vụ chùa) ══════════════════════════════
  services: [
    { icon: '🌸', name: 'Dâng sớ cầu an', description: '...', price: 'Tùy tâm phật tử', highlight: true },
    { icon: '🕯️', name: 'Lễ cầu siêu',    description: '...', price: 'Tùy tâm phật tử', highlight: false },
    { icon: '👶', name: 'Lễ bán khoán',   description: '...', price: 'Tùy tâm phật tử', highlight: false },
    { icon: '🏠', name: 'Cầu an gia trạch', description: '...', price: 'Tùy tâm phật tử', highlight: false },
    { icon: '📿', name: 'Các nghi lễ khác', description: '...', price: 'Theo thỏa thuận', highlight: false },
  ],

  // ══ GIỖ TỔ (lễ lớn nhất) ════════════════════════════════
  gioTo: {
    ngayAm: 15, thangAm: 1,          // Ngày âm lịch cố định
    ten:    'Lễ Giỗ Tổ Chùa ABC',
    moTa:   'Mô tả ngày giỗ tổ...',
    soNgay: 3,                        // Kéo dài bao nhiêu ngày
    chuongTrinh: ['Lễ khai kinh...', 'Lễ dâng hương...'],
    nhacTruocNgay: 7,                 // Gửi email nhắc trước X ngày
  },

  // ══ NGÀY LỄ TRONG NĂM ═══════════════════════════════════
  ngayLe: [
    { ten: 'Rằm tháng Giêng', ngayAm: 15, thangAm: 1 },
    { ten: 'Phật Đản',         ngayAm: 15, thangAm: 4 },
    { ten: 'Lễ Vu Lan',        ngayAm: 15, thangAm: 7 },
    { ten: 'Lễ Thành Đạo',     ngayAm: 8,  thangAm: 12 },
    { ten: 'Giỗ Tổ',           ngayAm: 15, thangAm: 1, isGioTo: true },
  ],

  // ══ MÀU SẮC (CSS variables) ══════════════════════════════
  theme: {
    crimson:     '#7a0c1e',
    crimsonDark: '#500a14',
    gold:        '#c9921f',
    goldLight:   '#e8b84b',
    cream:       '#faf5ea',
  },

  // ══ ẢNH ═════════════════════════════════════════════════
  images: {
    hero:    ['/images/hero-1.jpg', '/images/hero-2.jpg', '/images/hero-3.jpg'],
    gallery: ['/images/gallery-1.jpg', '...', '/images/gallery-6.jpg'],
    abbot:   '/images/abbot.jpg',   // Để '' nếu không có
    logo:    '',                     // Để '' để dùng emoji mặc định
  },

  // ══ NGÂN HÀNG ════════════════════════════════════════════
  bank: {
    primary: {                        // Ngân hàng chính (Sepay auto-confirm)
      name:          'VietinBank',
      id:            'vietinbank',    // Bank ID cho VietQR API
      accountNumber: '102506196666',
      accountName:   'NGUYEN VAN A',
      description:   'Chuyển khoản công đức tự động',
    },
    secondary: {                      // Ngân hàng phụ (xác nhận thủ công)
      name:          'Agribank',
      id:            'agribank',
      accountNumber: '123456789',
      accountName:   'NGUYEN THI B',
      description:   'Sư Trụ Trì – Chùa ABC',
    }
  },

  // ══ HỆ THỐNG ════════════════════════════════════════════
  system: {
    domain:      'chuaabc.com.vn',          // Domain (không có https://)
    foundedYear: '2024',
    copyright:   '© 2025 Chùa ABC · Địa chỉ',
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = TEMPLE;
// Dùng trong HTML: <script src="/temple-config.js"></script> → TEMPLE.name
```

### Cách server.js dùng TEMPLE
```javascript
const TEMPLE = require('./temple-config');

// Tất cả giá trị động đều từ TEMPLE:
const RESEND_FROM = `${TEMPLE.name} <chua@${TEMPLE.system.domain}>`;
const SITE_URL    = process.env.SITE_URL || `https://${TEMPLE.system.domain}`;

const SEPAY_CONFIG = {
  BANK_ID:        TEMPLE.bank.primary.id,
  ACCOUNT_NUMBER: TEMPLE.bank.primary.accountNumber,
  ACCOUNT_NAME:   TEMPLE.bank.primary.accountName,
};

// Email templates dùng TEMPLE.name, TEMPLE.shortName
// Startup log dùng TEMPLE.name, TEMPLE.emoji
```

---

## 4. Database Schema

```javascript
// brain.db — SQLite (Node 22 built-in, không cần thư viện)
const db = new DatabaseSync(path.join(__dirname, 'brain.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (      -- nghi lễ
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, price INTEGER DEFAULT 0,
    description TEXT, quantity INTEGER DEFAULT -1,  -- -1 = vô hạn
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS customers (     -- phật tử (trang công đức)
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,         -- MÃ HÓA AES-256-GCM
    phone TEXT,                 -- MÃ HÓA AES-256-GCM
    phone_hash TEXT DEFAULT '', -- SHA-256 hash để tra cứu nhanh
    zalo TEXT,                  -- MÃ HÓA AES-256-GCM
    email TEXT,                 -- MÃ HÓA AES-256-GCM
    address TEXT,               -- MÃ HÓA AES-256-GCM
    registered_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS orders (        -- đơn công đức
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT UNIQUE,
    customer_id INTEGER,
    customer_name TEXT,         -- MÃ HÓA AES-256-GCM
    customer_phone TEXT,        -- MÃ HÓA AES-256-GCM
    product_id INTEGER, product_name TEXT,
    amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',  -- pending | success
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    paid_at TEXT
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS email_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    customer_name TEXT,         -- MÃ HÓA AES-256-GCM
    customer_email TEXT,        -- MÃ HÓA AES-256-GCM
    email_type TEXT,            -- welcome | value | invite | confirm
    order_code TEXT, amount INTEGER, product_name TEXT,
    scheduled_at TEXT, sent_at TEXT,
    status TEXT DEFAULT 'pending'
  );
  CREATE TABLE IF NOT EXISTS phat_tu (       -- phật tử (hệ thống lịch lễ)
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ho_ten TEXT NOT NULL,         -- MÃ HÓA AES-256-GCM
    so_dien_thoai TEXT,           -- MÃ HÓA AES-256-GCM
    phone_hash TEXT DEFAULT '',   -- SHA-256 hash để tra cứu
    dia_chi TEXT,                 -- MÃ HÓA AES-256-GCM
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS don_cong_duc (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phat_tu_id INTEGER NOT NULL,
    dich_vu TEXT,
    noi_dung_cau_nguyen TEXT,
    so_tien INTEGER DEFAULT 0,
    ngay_tao TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(phat_tu_id) REFERENCES phat_tu(id)
  );
  CREATE TABLE IF NOT EXISTS thanh_toan_le (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_id INTEGER NOT NULL,
    trang_thai TEXT DEFAULT 'chua_chuyen',  -- chua_chuyen | da_chuyen
    thoi_gian TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS lich_le (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_id INTEGER NOT NULL,
    ngay_duong TEXT, ngay_am TEXT,
    trang_thai TEXT DEFAULT 'chua_hen',  -- chua_hen|da_hen|da_xin_doi_lich|da_hoan_thanh
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS lich_su_sua (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_id INTEGER NOT NULL,
    ngay_cu TEXT, ngay_moi TEXT,
    thoi_gian_sua TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// Migration an toàn (chạy khi upgrade DB cũ)
try { db.exec("ALTER TABLE customers ADD COLUMN address TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE customers ADD COLUMN phone_hash TEXT DEFAULT ''"); } catch(e) {}
try { db.exec("ALTER TABLE phat_tu ADD COLUMN phone_hash TEXT DEFAULT ''"); } catch(e) {}
```

---

## 5. Bảo mật & Mã hóa dữ liệu phật tử

### Thuật toán
```
AES-256-GCM (authenticated encryption — chống giả mạo)
Node.js built-in crypto — không cài thêm thư viện
Key: ENCRYPTION_KEY env var (64 ký tự hex = 32 bytes)
Format: "enc:iv_b64:authTag_b64:ciphertext_b64"
```

### Các bảng được mã hóa
| Bảng | Trường mã hóa | Trường hash |
|------|--------------|-------------|
| `customers` | name, phone, zalo, email, address | `phone_hash` SHA-256 |
| `phat_tu` | ho_ten, so_dien_thoai, dia_chi | `phone_hash` SHA-256 |
| `orders` | customer_name, customer_phone | — |
| `email_queue` | customer_name, customer_email | — |

### Helper functions (server.js)
```javascript
const crypto = require('crypto');

function encrypt(text) {
  if (!text && text !== 0) return text ?? '';
  const key = _getKey(); // từ ENCRYPTION_KEY env var
  if (!key) return String(text);   // dev: không có key → plaintext
  const iv  = crypto.randomBytes(12);
  const cip = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cip.update(String(text), 'utf8'), cip.final()]);
  return 'enc:' + iv.toString('base64') + ':' + cip.getAuthTag().toString('base64')
                + ':' + enc.toString('base64');
}

function decrypt(text) {
  if (!text || !String(text).startsWith('enc:')) return text ?? '';
  try {
    const [,ivB64,tagB64,datB64] = String(text).split(':');
    const dec = crypto.createDecipheriv('aes-256-gcm', _getKey(), Buffer.from(ivB64,'base64'));
    dec.setAuthTag(Buffer.from(tagB64,'base64'));
    return Buffer.concat([dec.update(Buffer.from(datB64,'base64')), dec.final()]).toString('utf8');
  } catch(e) { return text; }  // lỗi decrypt → trả nguyên bản (không crash)
}

function phoneHash(phone) {
  if (!phone) return '';
  return crypto.createHash('sha256').update(String(phone).trim()).digest('hex');
}
```

### Tạo ENCRYPTION_KEY
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → copy 64 ký tự → paste vào Railway Variables
```

### Tra cứu SĐT (public API — không lộ dữ liệu)
```javascript
// ✅ ĐÚNG: dùng phone_hash
const hash = phoneHash(phone);
const row = db.prepare('SELECT id,name FROM customers WHERE phone_hash=?').get(hash);

// ❌ SAI: WHERE phone=? không hoạt động với cột mã hóa
```

### Tìm kiếm với dữ liệu mã hóa
```javascript
// Fetch all → decrypt in-memory → filter (an toàn với lượng dữ liệu chùa)
const rows = db.prepare('SELECT * FROM phat_tu ORDER BY id DESC LIMIT 500').all();
const filtered = rows
  .map(r => ({ ...r, ho_ten: decrypt(r.ho_ten), so_dien_thoai: decrypt(r.so_dien_thoai), dia_chi: decrypt(r.dia_chi) }))
  .filter(r => !q || r.ho_ten.toLowerCase().includes(q) || r.so_dien_thoai.includes(q))
  .slice(0, 100);
```

### Auto-migrate dữ liệu cũ
```javascript
// Server khởi động → tự detect plaintext cũ → mã hóa
if (ENCRYPTION_KEY_HEX) {
  const old = db.prepare("SELECT * FROM customers WHERE name NOT LIKE 'enc:%'").all();
  // encrypt từng row → UPDATE
}
```

### Backward compatible
- Chưa set ENCRYPTION_KEY → lưu plaintext, app chạy bình thường
- Set key lần đầu → auto-migrate khi restart
- Bản ghi plaintext → `decrypt()` trả về nguyên bản (không crash)

---

## 6. Admin Auth & Đổi mật khẩu

```javascript
// Ưu tiên: env var → DB → default
function getAdminPass() {
  if (process.env.ADMIN_PASS) return process.env.ADMIN_PASS; // luôn thắng
  const row = db.prepare("SELECT value FROM settings WHERE key='admin_pass'").get();
  return row ? row.value : ADMIN_DEFAULT_PASS;
}
function setAdminPass(newPass) {
  db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('admin_pass',?)").run(newPass);
}

// Token: Base64(username:password:chuaDK2026)
function makeToken(pass) {
  return Buffer.from(ADMIN_USER + ':' + pass + ':chuaDK2026').toString('base64');
}

// Cookie: adm=<token>; HttpOnly; SameSite=Strict; Max-Age=86400
function requireAdmin(req, res, next) {
  if (parseCookies(req).adm === makeToken(getAdminPass())) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/admin/login');
}
```

### Đổi mật khẩu — 2 cách
```
Cách 1: Admin panel → tab Bảo mật → form đổi mật khẩu
  → POST /api/admin/change-password → setAdminPass() → lưu DB → auto logout
  ⚠️ Nếu Railway ADMIN_PASS đang set → nó ghi đè DB → cần đổi cả Railway var

Cách 2 (khuyến nghị): Railway dashboard → Variables → sửa ADMIN_PASS
  → Railway restart → hiệu lực ngay
```

### Phần bảo mật admin.html — Panel có sẵn
- Form 3 ô: mật khẩu cũ / mới / xác nhận
- Nút 👁 toggle show/hide từng ô
- Thanh chỉ báo độ mạnh mật khẩu (Yếu → Rất mạnh)
- Info box nhắc set Railway var
- Bug cũ đã fix: check `data.success` (không phải `res.ok`)

---

## 7. Trang Login Admin

### Cấu trúc (admin-login.html)
```
body (gradient đỏ đen full screen)
└── .card (white, max-width 400px, căn giữa, animation fadeUp)
    ├── Logo TEMPLE.emoji + tên chùa + subtitle
    ├── Alert boxes (ẩn → hiện qua query string)
    │   ├── #err-box       ← ?err=1
    │   ├── #forgot-err-box ← ?forgot=err
    │   └── #forgot-ok-box  ← ?forgot=1
    ├── Form đăng nhập (POST /admin/login)
    │   ├── input username (autocomplete="username")
    │   ├── input password + nút 👁 toggle show/hide
    │   └── button Đăng nhập
    ├── Divider "hoặc"
    ├── button Quên mật khẩu (confirm() → POST /admin/forgot-password)
    ├── <a href="/">🏠 Quay về trang chủ</a>   ← QUAN TRỌNG: lối thoát khi quên pass
    └── Footer 🪷
```

### Server routes
```javascript
GET  /admin/login           → serve admin-login.html
POST /admin/login           → xác thực → redirect /admin hoặc ?err=1
GET  /admin/logout          → xóa cookie → redirect /admin/login
POST /admin/forgot-password → gửi Gmail → redirect ?forgot=1 hoặc ?forgot=err
```

### CSS mobile (3 điểm quan trọng)
```css
@media (max-width: 420px) {
  .form-group input { font-size: 16px; }  /* tránh iOS auto-zoom */
  .card { padding: 32px 20px 24px; }
}
@media (max-width: 320px) { body { padding: 10px; } }
.toggle-pw { min-width: 32px; min-height: 32px; } /* vùng chạm đủ lớn */
```

---

## 8. API Routes

### Public (không cần đăng nhập)
```
GET  /api/products           → thanh-toan.html load danh sách nghi lễ
GET  /api/customers/check    → check trùng SĐT (dùng phone_hash, không lộ PII)
POST /api/orders             → khách đặt nghi lễ / công đức
GET  /api/orders/code/:code  → khách kiểm tra đơn (SĐT bị che: ****123)
```

### Admin only (requireAdmin middleware)
```
GET/POST/PUT/DELETE /api/customers
GET/POST/PUT/DELETE /api/products
GET/PUT/DELETE      /api/orders
GET  /api/orders/export      → xuất CSV (đã decrypt PII)
GET  /api/stats              → dashboard statistics
GET  /api/lunar              → convert âm lịch
GET  /api/phat-tu            → danh sách phật tử (đã decrypt)
POST/PUT/DELETE /api/phat-tu/:id
GET  /api/phat-tu/tim-kiem   → tìm kiếm in-memory sau decrypt
GET  /api/phat-tu/:id        → chi tiết phật tử + đơn
GET  /api/don-cong-duc       → đơn công đức (join phat_tu, đã decrypt)
POST/PUT/DELETE /api/don-cong-duc/:id
POST /api/don-cong-duc/:id/thanh-toan
POST /api/don-cong-duc/:id/dat-lich
PUT  /api/lich-le/:id
GET  /api/lich-le/thong-ke
GET  /api/lich-le/stats
GET  /api/copy-don/:id
GET  /api/copy-nhom/:trang_thai
GET  /api/copy-tat-ca
POST /api/admin/change-password
```

### Quan trọng: API lỗi đúng cách
```javascript
// requireAdmin phải trả 401 JSON cho API routes, không redirect
function requireAdmin(req, res, next) {
  if (cookies.adm === makeToken(getAdminPass())) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/admin/login');  // chỉ redirect cho page routes
}
```

---

## 9. Email Templates & Queue

### 4 loại email tự động
```javascript
const EMAIL_TEMPLATES = {
  welcome: (name) => ({ subject: `🪷 Chào mừng đến với ${TEMPLE.name}`, html: ... }),
  // → Gửi ngay khi đăng ký (delayDays=0)

  value: (name) => ({ subject: `🙏 Ý nghĩa dâng sớ – ${TEMPLE.name}`, html: ... }),
  // → Gửi sau 2 ngày

  invite: (name) => ({ subject: `✨ Đăng ký nghi lễ tại ${TEMPLE.name}`, html: ... }),
  // → Gửi sau 3 ngày

  confirm: (name, orderCode, productName, amount) => ({ ... }),
  // → Gửi ngay khi thanh toán thành công
};
```

### scheduleEmail — PII được mã hóa khi lưu queue
```javascript
function scheduleEmail(customerId, customerName, customerEmail, emailType, delayDays=0, extra={}) {
  if (!customerEmail || !customerEmail.includes('@')) return;
  db.prepare('INSERT INTO email_queue (...) VALUES (?,?,?,?,?,?,?,?)')
    .run(customerId, encrypt(customerName), encrypt(customerEmail), emailType, ...);
}
```

### processEmailQueue — decrypt trước khi gửi
```javascript
async function processEmailQueue() {
  const pending = db.prepare("SELECT * FROM email_queue WHERE status='pending' AND scheduled_at<=?").all(now);
  for (const item of pending) {
    const custName  = decrypt(item.customer_name);   // decrypt
    const custEmail = decrypt(item.customer_email);  // decrypt
    const tpl = EMAIL_TEMPLATES[item.email_type](custName);
    await sendResendEmail(custEmail, tpl.subject, tpl.html);
  }
}
// Chạy mỗi 30 phút: setInterval(processEmailQueue, 30*60*1000)
```

### Resend DNS (trên 123host)
| Tên | Loại | Giá trị |
|-----|------|---------|
| `resend._domainkey` | TXT | `p=MIGf...` từ Resend dashboard |
| `send` | MX | `feedback-smtp.ap-northeast-1.amazonses.com` Priority 10 |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` |

---

## 10. Thanh toán & Webhook Sepay

```javascript
// VietQR URL
`https://img.vietqr.io/image/${TEMPLE.bank.primary.id}-${TEMPLE.bank.primary.accountNumber}-compact2.png?amount=${amt}&addInfo=${encodeURIComponent('SEVQR '+code)}`

// Webhook Sepay: POST /webhook/sepay
app.post('/webhook/sepay', async (req, res) => {
  if (data.transferType !== 'in') return res.json({ success: true });
  const content = (data.content||'').toUpperCase();
  const amount  = Number(data.transferAmount)||0;
  const pending = db.prepare("SELECT * FROM orders WHERE status='pending'").all();
  // Match theo order_code trong nội dung chuyển khoản
  const order = pending.find(o => content.includes(o.order_code.toUpperCase()) && amount >= o.amount);
  if (order) {
    db.prepare("UPDATE orders SET status='success', paid_at=... WHERE id=?").run(order.id);
    // Gửi email xác nhận → scheduleEmail(...)
  }
  res.json({ success: true });
});
```

**Format mã đơn:** `DK` + 8 số cuối timestamp (ví dụ: `DK12345678`)
**Nội dung CK cần có:** `SEVQR DK12345678`

---

## 11. Âm lịch

```javascript
// Thuần JS, không thư viện — copy nguyên từ server.js chuaDK
// Hàm chính:
function solar2Lunar(dd, mm, yy) → { ngayAm, thangAm, namAm, nhuan }
function formatLunar(dd, mm, yy) → "15/1/2026" hoặc "14/1 (nhuận)/2026"

// API:
app.get('/api/lunar', requireAdmin, (req, res) => {
  const { dd, mm, yy } = req.query;
  res.json({ ...solar2Lunar(+dd,+mm,+yy), formatted: formatLunar(+dd,+mm,+yy) });
});
```

---

## 12. Admin UI — Thiết kế cho người cao tuổi

```
Font:   16px base · 15px bảng · 20px header
Button: padding 11px 22px · font-size 15px · border-radius 10px · font-weight 600
Input:  padding 12px 16px · border 2px · font-size 15px
Info box màu vàng nhạt đầu mỗi tab
Toast: 15px, bold, auto-dismiss
6 tabs: Dashboard | Nghi lễ | Phật tử | Đơn hàng | Lịch Lễ | Bảo mật
```

### setBtnLoading — BẮT BUỘC dùng cho mọi nút fetch
```javascript
function setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) { btn._origText = btn.textContent; btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
  else         { btn.disabled = false; btn.textContent = btn._origText || btn.textContent; }
}

// Pattern chuẩn:
async function saveXxx() {
  const btn = document.getElementById('btn-xxx');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(url, { method, headers, body });
    if (!res.ok) { toast('❌ Lỗi', 'error'); return; }
    const data = await res.json();
    if (data.error) { toast('❌ ' + data.error, 'error'); return; }
    await loadXxx();   // ← await: load xong mới hiện toast
    toast('✅ Đã lưu', 'success');
  } catch(e) { toast('❌ Lỗi kết nối', 'error'); }
  finally { setBtnLoading(btn, false); }
}
```

### Modal edit — KHÔNG dùng openModal()
```javascript
// openModal() → clearForm() → xóa data
// ✅ ĐÚNG: mở trực tiếp
function editXxx(id) {
  const item = xxxData.find(x => x.id === id);
  document.getElementById('xxx-name').value = item.name || '';
  document.getElementById('modal-xxx').classList.add('open'); // ← trực tiếp
}
```

### Reload song song
```javascript
await Promise.all([loadOrders(), loadDashboard()]); // ← nhanh hơn tuần tự
```

---

## 13. Mobile — Hamburger Menu

```html
<!-- Trong <header> -->
<button class="menu-btn" id="menuBtn" onclick="toggleMobileMenu()">
  <span></span><span></span><span></span>
</button>
</header>
<!-- Ngay sau </header> -->
<div class="mobile-nav" id="mobileNav">
  <a href="#loingo"    onclick="closeMobileMenu()">Lời ngỏ</a>
  <a href="#gioithieu" onclick="closeMobileMenu()">Giới thiệu</a>
  <a href="/thanh-toan" class="mobile-cta">🪷 Dâng công đức</a>
  <a href="/admin"      class="mobile-admin">⚙️ Quản lý Admin</a>
</div>
```

```css
.menu-btn { display:none; flex-direction:column; gap:5px; width:40px; height:40px;
  background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2);
  border-radius:8px; cursor:pointer; padding:8px; }
.menu-btn span { display:block; width:100%; height:2px; background:var(--gold-light); border-radius:2px; }
.mobile-nav { display:none; position:fixed; inset:0; background:rgba(50,8,14,0.97);
  z-index:999; flex-direction:column; align-items:center; justify-content:center; padding:80px 24px 40px; }
.mobile-nav.open { display:flex; }
@media (max-width:900px) { nav { display:none; } .menu-btn { display:flex; } }
```

```javascript
function toggleMobileMenu() {
  document.getElementById('mobileNav').classList.toggle('open');
  document.getElementById('menuBtn').classList.toggle('open');
  document.body.style.overflow = document.getElementById('mobileNav').classList.contains('open') ? 'hidden' : '';
}
```

---

## 14. Deploy — Railway + 123host

### Railway env vars (tab Variables)
```
ADMIN_USER       = admindchua          (có thể đổi tên tài khoản)
ADMIN_PASS       = MatKhauManh@2026    (KHÔNG dùng default doipassngay123)
ADMIN_EMAIL      = email@gmail.com     (nhận mật khẩu khi quên)
GMAIL_PASS       = xxxx xxxx xxxx xxxx (Gmail App Password, 16 ký tự)
RESEND_API_KEY   = re_xxxxxxxxxxxx     (từ resend.com)
SITE_URL         = https://chua-abc.com.vn
ENCRYPTION_KEY   = (64 ký tự hex — tạo bằng lệnh bên dưới)
```

### Tạo ENCRYPTION_KEY (chạy 1 lần)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → copy 64 ký tự → paste vào Railway Variables
# ⚠️ LƯU KEY Ở NƠI AN TOÀN — mất key = không đọc được dữ liệu!
```

### Quy trình deploy
```
1. Sửa temple-config.js (xem section 3)
2. Kiểm tra .gitignore có: .env, *.db, node_modules/
3. git push → Railway auto-detect Node.js → tự build
4. Railway → Variables → set 7 env vars trên
5. Railway → Settings → Networking → Add Custom Domain:
     chua-abc.com.vn
     www.chua-abc.com.vn    ← phải add riêng
6. DNS 123host:
     A     @   → Railway IP
     CNAME www → xxx.up.railway.app
     + 3 record Resend (xem section 9)
```

### package.json — BẮT BUỘC có "start"
```json
{
  "scripts": { "start": "node server.js" },
  "engines": { "node": ">=22" }
}
```

---

## 15. Bảo mật GitHub

### Nguyên tắc
> GitHub là PUBLIC — ai cũng đọc được. Mật khẩu, key, email TUYỆT ĐỐI KHÔNG hardcode.

### Files KHÔNG commit
```
.env          ← secrets thật
*.db          ← dữ liệu phật tử + mật khẩu admin
*.db-shm      ← SQLite temp
*.db-wal      ← SQLite temp
node_modules/ ← dependencies (npm install tự tạo)
```

### .env.example — template an toàn (commit được)
```bash
ADMIN_USER=admindchua
ADMIN_PASS=doi_mat_khau_ngay
ADMIN_EMAIL=youremail@gmail.com
GMAIL_PASS=xxxx xxxx xxxx xxxx
RESEND_API_KEY=re_xxxxxxxxxxxx
SITE_URL=https://your-domain.com.vn
ENCRYPTION_KEY=your_64_char_hex_key_here
```

### Kiểm tra trước khi push
```bash
git status                   # xem file sắp commit
git diff --staged            # xem nội dung thay đổi
# Đảm bảo KHÔNG thấy .env hay *.db trong danh sách
```

### Xử lý nếu lỡ commit secret
```bash
git rm --cached .env
git commit -m "fix: remove .env from tracking"
git push
# Và đổi ngay mật khẩu/API key đã bị lộ!
```

---

## 16. Lỗi thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| Tên chùa vẫn là "Chùa Đại Khánh" | server.js chưa dùng TEMPLE config | `const TEMPLE = require('./temple-config')` + dùng `TEMPLE.name` |
| Tìm kiếm phật tử không ra | SQL LIKE trên cột mã hóa | Dùng in-memory filter sau decrypt (đã implement) |
| `/api/customers/check` trả `exists:false` | Lookup bằng phone thay vì phone_hash | `WHERE phone_hash=?` với `phoneHash(phone)` |
| Mất dữ liệu sau khi đổi ENCRYPTION_KEY | Key thay đổi, dữ liệu cũ không decrypt được | Giữ nguyên key, TUYỆT ĐỐI KHÔNG đổi key sau khi có data |
| Đổi ADMIN_PASS env nhưng vẫn sai pass | `getAdminPass()` đọc DB thay vì env | `if (process.env.ADMIN_PASS) return process.env.ADMIN_PASS` phải là dòng đầu |
| Nhấn "Cập nhật mật khẩu" không phản hồi | `if (res.ok)` thay vì `if (data.success)` | Server trả 200 dù lỗi → phải check `data.success` |
| iOS zoom vào input | font-size input < 16px | `@media (max-width:420px) { input { font-size:16px } }` |
| Mắc kẹt login khi quên mật khẩu | Không có lối thoát | `<a href="/">🏠 Quay về trang chủ</a>` trong admin-login.html |
| Email lộ trên GitHub | Hardcode email trong HTML/JS | Dùng text generic, set `ADMIN_EMAIL` qua Railway |
| DKIM fail Resend | Copy "TTL Auto" vào value | Xóa, thêm lại — chỉ copy `p=MIGf...` |
| www 404 | Railway chưa add www | Railway → Networking → Add Custom Domain → www riêng |
| node:sqlite not found | Node < 22 | Upgrade Node 22+ (Railway: engines.node ≥ 22) |
| Sau CRUD phải F5 | `loadXxx()` thiếu `await` | `await loadXxx()` + `setBtnLoading` |
| Modal edit bị trống | `openModal()` gọi `clearForm()` | Mở modal trực tiếp: `classList.add('open')` |
| Nav ẩn trên mobile | `nav { display:none }` | Thêm hamburger menu (section 13) |
| Link `/admin` không mở | Dùng `\admin` (backslash) | Sửa thành `/admin` (forward slash) |
| Railway không chạy | Thiếu `"start"` trong package.json | `"scripts": { "start": "node server.js" }` |
| Webhook Sepay không match | Order code viết thường | `content.toUpperCase()` + `order_code.toUpperCase()` |
| CSV export bị vỡ tiếng Việt | Thiếu BOM UTF-8 | `res.send('\uFEFF' + csv)` |

---

## 17. Checklist deploy mới

```
CHUẨN BỊ CONTENT
□ Sửa temple-config.js:
    - name, shortName, emoji, slogan, subSlogan
    - location, address, phone, phoneRaw, email, hours, mapLink
    - abbot (name, title, bio)
    - hero, welcome, story (paragraphs đủ 3)
    - quotes (3-5 câu kinh)
    - services (5 nghi lễ)
    - gioTo (ngayAm, thangAm, ten, moTa, chuongTrinh)
    - ngayLe (các ngày lễ trong năm)
    - bank.primary + bank.secondary (tên, số TK, tên TK)
    - system.domain (domain thật, không có https://)
    - system.copyright
□ Thay ảnh: hero-1/2/3.jpg, gallery-1~6.jpg, abbot.jpg
□ Kiểm tra .gitignore có: .env, *.db, node_modules/
□ KHÔNG có thông tin thật trong code (bank account → đã ở temple-config)

GITHUB + RAILWAY
□ git push (kiểm tra git status trước)
□ Tạo Railway project → Settings → link GitHub repo
□ Tạo ENCRYPTION_KEY:
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
□ Set 7 Railway Variables:
    ADMIN_USER, ADMIN_PASS, ADMIN_EMAIL, GMAIL_PASS,
    RESEND_API_KEY, SITE_URL, ENCRYPTION_KEY
□ LƯU ENCRYPTION_KEY vào password manager / ghi chú an toàn
□ Railway → Settings → Networking → Add Custom Domain:
    domain.com.vn  +  www.domain.com.vn (riêng biệt)

DNS 123HOST
□ A record: @ → Railway IP
□ CNAME: www → xxx.up.railway.app
□ TXT resend._domainkey → p=MIGf... (chỉ phần key, bỏ "TTL Auto")
□ MX send → feedback-smtp.ap-northeast-1.amazonses.com (Priority 10)
□ TXT send → v=spf1 include:amazonses.com ~all
□ Verify domain trên Resend dashboard

KIỂM TRA
□ Truy cập domain → tên chùa đúng, ảnh hiện
□ Đăng nhập admin (ADMIN_PASS đã set) → thành công
□ Server log: "🔐 Mã hóa PII: BẬT (key 64 chars)"
□ Thêm 1 phật tử → xem DB: trường ho_ten bắt đầu bằng "enc:"
□ Admin hiện tên bình thường (đã decrypt)
□ Trang login: nút 👁 toggle, nút Quay về trang chủ
□ Trang login mobile: không bị iOS zoom, nút đủ lớn
□ Thêm nghi lễ → hiện trang công đức
□ Đặt nghi lễ thử → email xác nhận gửi về
□ Test mobile: hamburger menu, nút Admin + Công đức hiện
□ Vào tab Bảo mật → thử đổi mật khẩu → login lại
□ Webhook Sepay: test chuyển khoản đúng mã → đơn → success
□ CSV export → mở Excel, tiếng Việt đúng
□ Đổi RESEND_FROM domain sau khi verify (chua@domain thay vì mặc định)
```

---

*Template version: 2025 · Stack: Node 22 + Express + SQLite + Railway*
*Liên hệ hỗ trợ: gửi repo + file này cho Claude Code là đủ để tạo website chùa mới.*
