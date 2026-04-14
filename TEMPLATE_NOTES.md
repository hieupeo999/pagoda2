# 📋 TEMPLE WEBSITE TEMPLATE – Hoàn chỉnh
> Tái sử dụng cho bất kỳ trang web nhà chùa nào. Copy & thay tên chùa là xong.

---

## 🏗️ TECH STACK
- **Backend:** Node.js + Express (không cần framework phức tạp)
- **Database:** `node:sqlite` – DatabaseSync (built-in Node 22+, không cài thêm)
- **Email tự động:** Resend API (3,000 email/tháng miễn phí) qua native `fetch`
- **Email admin:** nodemailer + Gmail SMTP (App Password)
- **Hosting:** Railway (free tier, auto-deploy từ GitHub)
- **Domain:** 123host → A record trỏ về Railway IP
- **Payment:** Sepay webhook (VietinBank auto) + Agribank (manual)
- **Âm lịch:** Ho Ngoc Duc algorithm (thuần JavaScript, không cần thư viện)

---

## 📦 package.json
```json
{
  "name": "chua-ten-chua",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "express": "^4.18.2",
    "nodemailer": "^8.0.5"
  }
}
```

---

## 📁 CẤU TRÚC FILE
```
project/
├── server.js           # Toàn bộ backend: routes, DB, auth, email, âm lịch
├── index.html          # Trang chủ (đẹp, có slider, section)
├── thanh-toan.html     # Trang công đức (form + QR payment + Sepay)
├── admin.html          # Admin panel (dashboard + CRUD + lịch lễ + bảo mật)
├── admin-login.html    # Trang đăng nhập admin
├── package.json
└── brain.db            # SQLite database (tự tạo khi chạy lần đầu)
```

---

## 🗄️ DATABASE SCHEMA ĐẦY ĐỦ

```javascript
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(path.join(__dirname, 'brain.db'));

db.exec(`
  -- Nghi lễ / sản phẩm
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER DEFAULT 0,       -- 0 = tùy tâm
    description TEXT,
    quantity INTEGER DEFAULT -1,   -- -1 = không giới hạn
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Phật tử đăng ký ONLINE (qua trang thanh-toan.html)
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    zalo TEXT,
    email TEXT,
    registered_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Đơn công đức (từ website)
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT UNIQUE,
    customer_id INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    product_id INTEGER,
    product_name TEXT,
    amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',   -- pending | success
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    paid_at TEXT
  );

  -- Cấu hình hệ thống (admin pass, v.v.)
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Hàng đợi email tự động (Resend)
  CREATE TABLE IF NOT EXISTS email_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    customer_name TEXT,
    customer_email TEXT,
    email_type TEXT,        -- welcome | value | invite | confirm
    order_code TEXT,
    amount INTEGER,
    product_name TEXT,
    scheduled_at TEXT,      -- ISO datetime
    sent_at TEXT,
    status TEXT DEFAULT 'pending'  -- pending | sent | failed
  );

  -- ══ HỆ THỐNG LỊCH LỄ (Admin quản lý thủ công) ══

  -- Phật tử offline (admin nhập)
  CREATE TABLE IF NOT EXISTS phat_tu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ho_ten TEXT NOT NULL,
    so_dien_thoai TEXT,
    dia_chi TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Đơn công đức (admin nhập)
  CREATE TABLE IF NOT EXISTS don_cong_duc (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phat_tu_id INTEGER NOT NULL,
    dich_vu TEXT,
    noi_dung_cau_nguyen TEXT,
    so_tien INTEGER DEFAULT 0,
    ngay_tao TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Thanh toán lễ
  CREATE TABLE IF NOT EXISTS thanh_toan_le (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_id INTEGER NOT NULL,
    trang_thai TEXT DEFAULT 'chua_chuyen',  -- chua_chuyen | da_chuyen
    thoi_gian TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Lịch lễ
  CREATE TABLE IF NOT EXISTS lich_le (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_id INTEGER NOT NULL,
    ngay_duong TEXT,                    -- YYYY-MM-DD
    ngay_am TEXT,                       -- VD: 15/7/2026
    trang_thai TEXT DEFAULT 'chua_hen', -- chua_hen | da_hen | da_xin_doi_lich | da_hoan_thanh
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Lịch sử sửa lịch
  CREATE TABLE IF NOT EXISTS lich_su_sua (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_id INTEGER NOT NULL,
    ngay_cu TEXT,
    ngay_moi TEXT,
    thoi_gian_sua TEXT DEFAULT (datetime('now','localtime'))
  );
`);
```

---

## 🔐 ADMIN AUTH (cookie-based, không cần session library)

```javascript
const ADMIN_USER         = 'admindchua';
const ADMIN_DEFAULT_PASS = 'password123';  // Đổi ngay sau deploy

function makeToken(pass) {
  return Buffer.from(ADMIN_USER + ':' + pass + ':SALT2026').toString('base64');
}
function getAdminPass() {
  const row = db.prepare("SELECT value FROM settings WHERE key='admin_pass'").get();
  return row ? row.value : ADMIN_DEFAULT_PASS;
}
function setAdminPass(p) {
  db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('admin_pass',?)").run(p);
}
function parseCookies(req) {
  const list = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k,...v] = c.split('=');
    if (k) list[k.trim()] = decodeURIComponent(v.join('=').trim());
  });
  return list;
}
function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  if (cookies.adm === makeToken(getAdminPass())) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/admin/login');
}

// Login
app.post('/admin/login', express.urlencoded({ extended: false }), (req, res) => {
  if (req.body.username === ADMIN_USER && req.body.password === getAdminPass()) {
    res.setHeader('Set-Cookie', `adm=${makeToken(getAdminPass())}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?err=1');
});

// Logout
app.get('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'adm=; HttpOnly; Path=/; Max-Age=0');
  res.redirect('/admin/login');
});
```

---

## 📧 RESEND EMAIL (tự động chăm sóc khách hàng)

```javascript
// Config
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM    = 'Chùa Tên <chua@domain.com.vn>';  // Sau khi verify domain
const SITE_URL       = process.env.SITE_URL || 'https://domain.com.vn';

// Gửi email
async function sendResendEmail(to, subject, html) {
  if (!RESEND_API_KEY || !to?.includes('@')) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html })
  });
  return res.ok;
}

// Lên lịch email
function scheduleEmail(customerId, name, email, type, delayDays=0, extra={}) {
  if (!email?.includes('@')) return;
  const scheduledAt = new Date(Date.now() + delayDays*86400000).toISOString();
  db.prepare(`INSERT INTO email_queue (customer_id,customer_name,customer_email,email_type,order_code,amount,product_name,scheduled_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(customerId, name, email, type, extra.orderCode||null, extra.amount||null, extra.productName||null, scheduledAt);
}

// Xử lý hàng đợi (mỗi 30 phút)
async function processEmailQueue() {
  const now = new Date().toISOString();
  const pending = db.prepare(`SELECT * FROM email_queue WHERE status='pending' AND scheduled_at<=? LIMIT 20`).all(now);
  for (const item of pending) {
    let tpl;
    if (item.email_type==='welcome') tpl=EMAIL_TEMPLATES.welcome(item.customer_name);
    else if (item.email_type==='value') tpl=EMAIL_TEMPLATES.value(item.customer_name);
    else if (item.email_type==='invite') tpl=EMAIL_TEMPLATES.invite(item.customer_name);
    else if (item.email_type==='confirm') tpl=EMAIL_TEMPLATES.confirm(item.customer_name,item.order_code,item.product_name,item.amount);
    const ok = tpl ? await sendResendEmail(item.customer_email, tpl.subject, tpl.html) : false;
    db.prepare(`UPDATE email_queue SET status=?,sent_at=datetime('now') WHERE id=?`).run(ok?'sent':'failed',item.id);
  }
}
setTimeout(()=>processEmailQueue(), 5000);
setInterval(()=>processEmailQueue(), 30*60*1000);

// TRIGGERS (gắn vào các route):
// Khách đăng ký → welcome ngay, value sau 2 ngày, invite sau 3 ngày
scheduleEmail(id, name, email, 'welcome', 0);
scheduleEmail(id, name, email, 'value',   2);
scheduleEmail(id, name, email, 'invite',  3);

// Đơn thành công → confirm ngay
scheduleEmail(customerId, name, email, 'confirm', 0, { orderCode, productName, amount });
```

> **Resend DNS cần verify (123host):**
> | Record | Tên | Loại | Giá trị |
> |--------|-----|------|---------|
> | DKIM | `resend._domainkey` | TXT | `p=MIGf...` (lấy từ Resend dashboard) |
> | MX | `send` | MX | `feedback-smtp.ap-northeast-1.amazonses.com` Priority: 10 |
> | SPF | `send` | TXT | `v=spf1 include:amazonses.com ~all` |

---

## 🗓️ ÂM LỊCH (Ho Ngoc Duc Algorithm)

```javascript
// Paste nguyên hàm này vào server.js, không cần thư viện ngoài
function solar2Lunar(dd, mm, yy) {
  const tz=7;
  // [Paste full algorithm from chuaDK/server.js – hàm ll_jdFromDate, ll_newMoon, ll_sunLong, ll_month11, ll_leapOffset, solar2Lunar]
  // Trả về: { ngayAm, thangAm, namAm, nhuan }
}
function formatLunar(dd, mm, yy) {
  try {
    const {ngayAm,thangAm,namAm,nhuan} = solar2Lunar(dd,mm,yy);
    return `${ngayAm}/${thangAm}${nhuan?' (nhuận)':''}/${namAm}`;
  } catch(e) { return ''; }
}

// API endpoint
app.get('/api/lunar', requireAdmin, (req,res) => {
  const {dd,mm,yy} = req.query;
  const r = solar2Lunar(parseInt(dd),parseInt(mm),parseInt(yy));
  r.formatted = formatLunar(parseInt(dd),parseInt(mm),parseInt(yy));
  res.json(r);
});
```

---

## 💳 PAYMENT PATTERN

```javascript
// Config ngân hàng
const BANK = {
  vietinbank: { bankId:'vietinbank', accountNumber:'xxx', accountName:'NGUYEN VAN A' },
  agribank:   { bankId:'agribank',   accountNumber:'xxx', accountName:'NGUYEN THI B', description:'Trụ trì' },
};

// VietQR URL
const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent('SEVQR '+orderCode)}&accountName=${accountName}`;

// Webhook Sepay (auto match)
app.post('/webhook/sepay', async (req, res) => {
  if (req.body.transferType !== 'in') return res.json({ success: true });
  const content = (req.body.content || '').toUpperCase();
  const amount  = Number(req.body.transferAmount) || 0;
  const orders  = db.prepare("SELECT * FROM orders WHERE status='pending' ORDER BY created_at DESC").all();
  const order   = orders.find(o => content.includes(o.order_code.toUpperCase()) && amount >= o.amount);
  if (order) {
    db.prepare("UPDATE orders SET status='success', paid_at=datetime('now') WHERE id=?").run(order.id);
    // → scheduleEmail confirm
  }
  res.json({ success: true });
});
```

---

## 🎨 DESIGN TOKENS (màu chùa)

```css
:root {
  --crimson:      #7a0c1e;   /* đỏ chính */
  --crimson-dark: #500a14;   /* đỏ đậm */
  --gold:         #c9921f;   /* vàng chính */
  --gold-light:   #e8b84b;   /* vàng sáng */
  --cream:        #faf5ea;   /* nền kem */
  --ink:          #1a0d05;   /* chữ đậm */
  --border:       #e5d8c0;   /* viền */
}
/* Font: Cormorant Garamond (tiêu đề) + Be Vietnam Pro (body) */
/* Google Fonts: ?family=Cormorant+Garamond:wght@300;400;600&family=Be+Vietnam+Pro:wght@300;400;500;600 */
```

---

## 📊 ADMIN UI PATTERN (người cao tuổi – dễ dùng)

```
Nguyên tắc thiết kế:
• Font: 16px base, 15px bảng, 20px header, 32px stat-card
• Button: padding 11px 22px, font-size 15px, border-radius 10px, font-weight 600
• Input: padding 12px 16px, border 2px, font-size 15px
• Khoảng cách: gap 16-28px, margin-bottom 18-28px
• Màu sắc: contrast cao, badge màu rõ ràng
• Info box hướng dẫn ở đầu mỗi tab (màu vàng nhạt)
• Quick-action cards trên dashboard
• Toast notification to, rõ (font-size 15px, font-weight 600)
```

---

## 📅 LỊCH LỄ PATTERN (Admin-only)

```
Luồng:
1. Admin thêm phật tử → tạo đơn công đức → chọn ngày (dương) → hiện ngày âm
2. Checkbox bắt buộc "Đã kiểm tra ngày âm" mới cho lưu
3. Trạng thái: chua_hen → da_hen → (da_xin_doi_lich) → da_hoan_thanh
4. Mọi lần sửa ngày → lưu vào bảng lich_su_sua
5. Calendar tháng: màu theo trạng thái
6. Copy 1 click: 1 người / theo nhóm / toàn bộ danh sách

API routes cần: (tất cả requireAdmin)
GET  /api/phat-tu             – danh sách
POST /api/phat-tu             – thêm mới
GET  /api/phat-tu/tim-kiem    – tìm kiếm
GET  /api/don-cong-duc        – danh sách đơn (filter by trang_thai)
POST /api/don-cong-duc        – tạo đơn
POST /api/don-cong-duc/:id/dat-lich     – đặt lịch lần đầu
PUT  /api/lich-le/:id                   – sửa lịch (auto thêm vào lich_su_sua)
POST /api/lich-le/:id/hoan-thanh        – đánh dấu hoàn thành
POST /api/don-cong-duc/:id/thanh-toan   – cập nhật trạng thái tiền
GET  /api/lich-le/calendar?month&year   – lịch tháng
GET  /api/lich-le/stats                 – stats
GET  /api/copy-don/:id                  – copy 1 người
GET  /api/copy-nhom/:trang_thai         – copy nhóm
GET  /api/copy-tat-ca                   – copy tất cả
GET  /api/lich-su-sua/:don_id           – lịch sử sửa
GET  /api/lunar?dd&mm&yy                – convert âm lịch
```

---

## 🚀 RAILWAY DEPLOY

```
1. Tạo GitHub repo → push code
2. Railway → New Project → Deploy from GitHub
3. Biến môi trường Railway cần:
   - RESEND_API_KEY = re_xxx...  (lấy từ resend.com)
   - GMAIL_PASS     = xxxx xxxx xxxx xxxx  (Gmail App Password 16 ký tự)
   - SITE_URL       = https://domain.com.vn
4. Custom domain: Settings → Networking → Add Custom Domain
5. DNS 123host:
   - A record @ → Railway IP (ví dụ: 151.101.2.15)
   - CNAME www → xxx.up.railway.app
   - TXT _railway-verify → railway-verify=xxx
```

---

## ⚡ LỖI THƯỜNG GẶP & FIX

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| DKIM failed Resend | Copy nhầm "TTL Auto" vào content | Xóa record, thêm lại đúng value |
| DNS không propagate | CNAME @ bị từ chối | Dùng A record thay vì CNAME |
| MX record lỗi priority | Không điền Priority field | Điền `10` vào ô Priority riêng |
| Cookie auth fail sau đổi pass | Token cũ vẫn valid | Clear cookie sau khi đổi pass |
| Gmail không gửi | Chưa set GMAIL_PASS | Set App Password Railway Variables |
| Modal đóng khi click ngoài | onclick trên overlay | Xóa onclick, dùng addEventListener |
| node:sqlite không tồn tại | Node < 22 | Upgrade Node lên 22+ |
| Railway không detect start | Thiếu script start | Thêm `"start":"node server.js"` vào package.json |

---

## 📝 CHECKLIST DEPLOY MỚI

```
□ Thay ADMIN_USER, ADMIN_DEFAULT_PASS trong server.js
□ Thay tên chùa, địa chỉ, SĐT trong tất cả file HTML
□ Thay thông tin ngân hàng (SEPAY_CONFIG, AGRIBANK_CONFIG)
□ Thay ADMIN_EMAIL trong server.js
□ Push lên GitHub
□ Tạo Railway project → link GitHub
□ Set biến môi trường: RESEND_API_KEY, GMAIL_PASS, SITE_URL
□ Add custom domain trên Railway
□ Cấu hình DNS trên 123host (A record + CNAME www + _railway-verify)
□ Verify domain Resend (DKIM + MX + SPF)
□ Test thanh toán QR → check webhook
□ Test email automation → thêm customer có email
□ Đổi RESEND_FROM từ onboarding@resend.dev → chua@domain.com.vn sau khi verify
```
