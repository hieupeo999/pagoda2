# 📋 TEMPLE WEBSITE TEMPLATE – Hoàn chỉnh
> Tái sử dụng cho bất kỳ trang web nhà chùa nào. Copy & thay tên chùa là xong.
> **Đọc file này trước khi code** — giải thích mọi quyết định kỹ thuật, lỗi thường gặp, và pattern đúng.

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
├── temple-config.js    # Config riêng từng chùa (tên, địa chỉ, quotes, ngân hàng, giỗ tổ)
├── index.html          # Trang chủ (slider, section giới thiệu, nghi lễ)
├── thanh-toan.html     # Trang công đức (form + QR payment + Sepay)
├── admin.html          # Admin panel (dashboard + CRUD + lịch lễ + bảo mật)
├── admin-login.html    # Trang đăng nhập admin
├── package.json
└── brain.db            # SQLite database (tự tạo khi chạy lần đầu)
```

---

## 🗄️ DATABASE SCHEMA ĐẦY ĐỦ

> **QUAN TRỌNG:** `customers` bảng có cột `address TEXT` — cần để in sớ cầu an.
> Nếu deploy lên DB cũ chưa có cột này, dùng migration bên dưới.

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

  -- Phật tử (vừa online vừa admin nhập thủ công)
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    zalo TEXT,
    email TEXT,
    address TEXT,                  -- ← CẦN THIẾT để in sớ cầu an
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
    scheduled_at TEXT,
    sent_at TEXT,
    status TEXT DEFAULT 'pending'
  );

  -- Lịch lễ
  CREATE TABLE IF NOT EXISTS lich_le (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_id INTEGER NOT NULL,
    ngay_duong TEXT,
    ngay_am TEXT,
    trang_thai TEXT DEFAULT 'chua_hen',
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

// ── MIGRATION: thêm cột mới vào bảng cũ (không xóa data) ──
// Luôn wrap bằng try/catch — lỗi nếu cột đã tồn tại là bình thường
try { db.exec("ALTER TABLE customers ADD COLUMN address TEXT"); } catch(e) {}
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
function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  if (cookies.adm === makeToken(getAdminPass())) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/admin/login');
}
```

---

## 🔑 PHÂN QUYỀN API PHẬT TỬ (QUAN TRỌNG)

> **Quy tắc:** Chỉ admin mới thêm/sửa/xóa phật tử thủ công.
> Auto-add khi khách đặt nghi lễ/công đức → server tự INSERT trực tiếp DB (không qua API).

```
GET    /api/customers        → requireAdmin  (xem danh sách)
GET    /api/customers/check  → public        (check trùng SĐT trên form)
POST   /api/customers        → requireAdmin  (thêm thủ công từ admin panel)
PUT    /api/customers/:id    → requireAdmin  (sửa)
DELETE /api/customers/:id    → requireAdmin  (xóa)
```

**Auto-add trong POST /api/orders (public):**
```javascript
app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_phone, customer_email, customer_address, ... } = req.body;

  if (customer_phone) {
    const ex = db.prepare('SELECT id, email FROM customers WHERE phone=?').get(customer_phone);
    if (ex) {
      customer_id = ex.id;
      // Cập nhật email nếu chưa có
      if (!ex.email && customer_email) {
        db.prepare('UPDATE customers SET email=? WHERE id=?').run(customer_email, customer_id);
      }
    } else {
      // ← INSERT trực tiếp, KHÔNG gọi POST /api/customers
      const r = db.prepare('INSERT INTO customers (name,phone,email,address) VALUES (?,?,?,?)')
        .run(customer_name, customer_phone, customer_email||'', customer_address||'');
      customer_id = r.lastInsertRowid;
    }
  }
  // ... tạo order
});
```

---

## ⚙️ TEMPLE-CONFIG.JS (1 file thay đổi nội dung toàn bộ chùa)

> Mỗi chùa có 1 file `temple-config.js` riêng. Không cần sửa server.js hay HTML.

```javascript
// temple-config.js — Các section quan trọng:
const TEMPLE = {
  name: 'Chùa Đại Khánh',
  shortName: 'Đại Khánh',
  location: 'Thôn Trừng Xá, xã Trung Chính, tỉnh Bắc Ninh',
  phone: '0974 556 898',
  email: 'chuadaikhanh@gmail.com',

  // Giỗ tổ — ngày lễ lớn nhất, cố định theo âm lịch
  gioTo: {
    ngayAm: 15, thangAm: 1,
    ten: 'Lễ Giỗ Tổ Chùa Đại Khánh',
    soNgay: 3,
    nhacTruocNgay: 7,   // Server tự gửi email nhắc trước 7 ngày
  },

  // Các ngày lễ Phật giáo trong năm
  ngayLe: [
    { ten: 'Phật Đản',   ngayAm: 15, thangAm: 4 },
    { ten: 'Lễ Vu Lan',  ngayAm: 15, thangAm: 7 },
    { ten: 'Giỗ Tổ',     ngayAm: 15, thangAm: 1, isGioTo: true },
  ],

  bank: {
    primary:   { name:'VietinBank', accountNumber:'xxx', accountName:'NGUYEN VAN A' },
    secondary: { name:'Agribank',   accountNumber:'xxx', accountName:'NGUYEN THI B' },
  },

  system: { domain: 'chuadaikhanh-trungchinh-bn.com.vn' }
};

if (typeof module !== 'undefined') module.exports = TEMPLE;
```

> **Dùng trong server.js:** `const TEMPLE = require('./temple-config');`
> **Dùng trong HTML:** `<script src="/temple-config.js"></script>` rồi dùng `TEMPLE.name` v.v.

---

## 📧 RESEND EMAIL

```javascript
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM    = 'Chùa Tên <chua@domain.com.vn>';

async function sendResendEmail(to, subject, html) {
  if (!RESEND_API_KEY || !to?.includes('@')) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html })
  });
  return res.ok;
}
```

> **Resend DNS (123host):**
> | Record | Tên | Loại | Giá trị |
> |--------|-----|------|---------|
> | DKIM | `resend._domainkey` | TXT | `p=MIGf...` (lấy từ Resend dashboard, **KHÔNG copy "TTL Auto"**) |
> | MX | `send` | MX | `feedback-smtp.ap-northeast-1.amazonses.com` Priority: **10** |
> | SPF | `send` | TXT | `v=spf1 include:amazonses.com ~all` |

---

## 🗓️ ÂM LỊCH (Ho Ngoc Duc)

```javascript
// Paste full algorithm từ server.js của chuaDK — hàm: ll_jdFromDate, ll_newMoon,
// ll_sunLong, ll_month11, ll_leapOffset, solar2Lunar, formatLunar
// Không cần thư viện ngoài, chạy thuần server-side Node.js

app.get('/api/lunar', requireAdmin, (req, res) => {
  const { dd, mm, yy } = req.query;
  const r = solar2Lunar(+dd, +mm, +yy);
  res.json({ ...r, formatted: formatLunar(+dd, +mm, +yy) });
});
```

---

## 💳 PAYMENT PATTERN

```javascript
// VietQR
const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png`
            + `?amount=${amount}&addInfo=${encodeURIComponent('SEVQR '+orderCode)}`;

// Webhook Sepay (auto-confirm)
app.post('/webhook/sepay', async (req, res) => {
  if (req.body.transferType !== 'in') return res.json({ success: true });
  const content = (req.body.content || '').toUpperCase();
  const amount  = Number(req.body.transferAmount) || 0;
  const order   = db.prepare("SELECT * FROM orders WHERE status='pending' ORDER BY created_at DESC")
    .all().find(o => content.includes(o.order_code.toUpperCase()) && amount >= o.amount);
  if (order) {
    db.prepare("UPDATE orders SET status='success', paid_at=datetime('now') WHERE id=?").run(order.id);
  }
  res.json({ success: true });
});
```

---

## 🎨 DESIGN TOKENS

```css
:root {
  --crimson: #7a0c1e; --crimson-dark: #500a14;
  --gold: #c9921f;    --gold-light: #e8b84b;
  --cream: #faf5ea;   --ink: #1a0d05;  --border: #e5d8c0;
}
/* Font: Cormorant Garamond (tiêu đề) + Be Vietnam Pro (body) */
```

---

## 📊 ADMIN UI – PATTERN ĐÚNG (người cao tuổi)

```
Font: 16px base, 15px bảng, 20px header, 32px stat-card
Button: padding 11px 22px, font-size 15px, border-radius 10px
Input: padding 12px 16px, border 2px, font-size 15px
Info box hướng dẫn màu vàng nhạt ở đầu mỗi tab
Toast notification to rõ (15px, font-weight 600)
```

### setBtnLoading — LUÔN dùng khi fetch

```javascript
// Định nghĩa 1 lần, dùng cho mọi nút action
function setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) { btn._origText = btn.textContent; btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
  else         { btn.disabled = false; btn.textContent = btn._origText || btn.textContent; }
}

// Pattern dùng trong mọi saveXxx / deleteXxx:
async function saveProduct() {
  const btn = document.querySelector('#modal-product .btn-primary');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(url, { method, headers, body });
    const data = await res.json();
    if (data.error) { toast('❌ ' + data.error, 'error'); return; }
    closeModal('product');
    await loadProducts();          // ← await để bảng cập nhật xong mới hiện toast
    toast('✅ Đã lưu', 'success');
  } catch(e) { toast('❌ Lỗi kết nối', 'error'); }
  finally { setBtnLoading(btn, false); }
}

// Reload nhiều section song song:
await Promise.all([loadOrders(), loadDashboard()]);
```

### Modal Edit Bug — QUAN TRỌNG

> **Vấn đề:** `openModal('product')` gọi `clearForm()` → xóa data vừa set bởi `editProduct()`.
> **Fix:** Trong hàm editXxx(), **KHÔNG** gọi `openModal()` — mở modal trực tiếp:

```javascript
function editProduct(id) {
  const p = productsData.find(x => x.id === id);
  // Set các field trước
  document.getElementById('product-name').value = p.name || '';
  document.getElementById('product-price').value = p.price ?? 0;
  document.getElementById('product-description').value = p.description || '';
  document.getElementById('modal-product-title').textContent = '✏️ Sửa nghi lễ';
  // Mở modal TRỰC TIẾP — không qua openModal() để tránh clearForm reset data
  document.getElementById('modal-product').classList.add('open');
}
```

---

## 📅 LỊCH LỄ PATTERN

```
Luồng quản lý:
1. Admin thêm phật tử → tạo đơn công đức → chọn ngày dương → server convert âm lịch
2. Checkbox "Đã kiểm tra ngày âm" bắt buộc trước khi lưu
3. Trạng thái: chua_hen → da_hen → da_hoan_thanh (hoặc da_xin_doi_lich)
4. Mọi lần sửa ngày → lưu vào lich_su_sua
5. Calendar tháng hiển thị màu theo trạng thái

Tất cả routes lịch lễ đều requireAdmin.
```

---

## 🚀 RAILWAY DEPLOY

```
1. Push GitHub → Railway auto-detect và deploy
2. Biến môi trường cần set:
   RESEND_API_KEY = re_xxx...
   GMAIL_PASS     = xxxx xxxx xxxx xxxx  (App Password 16 ký tự)
   SITE_URL       = https://domain.com.vn
3. Custom domain: Settings → Networking → Add Custom Domain
   - www subdomain phải thêm riêng vào Railway (không tự nhận)
4. DNS 123host:
   A record @ → Railway IP
   CNAME www  → xxx.up.railway.app
```

---

## ⚡ LỖI THƯỜNG GẶP & FIX

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| DKIM failed Resend | Copy nhầm "TTL Auto" vào content | Xóa record, thêm lại đúng value |
| www domain 404 | Railway chưa add www subdomain | Vào Railway → Networking → Add Custom Domain → thêm www |
| node:sqlite not found | Node < 22 | Upgrade Node lên 22+ |
| Sửa nghi lễ (Sửa button) không làm gì | editProduct() gọi element không tồn tại → JS crash | Xóa dòng getElementById sai, mở modal trực tiếp |
| Sau thêm/sửa/xóa phải F5 | loadXxx() không có await | Dùng `await loadXxx()` + setBtnLoading |
| Cột address không có | Bảng customers cũ chưa có cột | Thêm migration: `try { db.exec("ALTER TABLE customers ADD COLUMN address TEXT") } catch(e) {}` |
| Modal mở bị trống khi edit | openModal() → clearForm() xóa data | Mở modal bằng classList.add('open') trực tiếp |
| GET /api/customers ai cũng xem được | Thiếu requireAdmin | Thêm requireAdmin middleware |
| Cookie auth fail sau đổi pass | Token cũ vẫn hợp lệ | Clear cookie sau khi đổi pass |
| Railway không detect start | Thiếu script start | Thêm `"start":"node server.js"` vào package.json |

---

## 📝 CHECKLIST DEPLOY MỚI

```
□ Sửa temple-config.js: tên chùa, địa chỉ, SĐT, ngân hàng, giỗ tổ
□ Thay ADMIN_USER, ADMIN_DEFAULT_PASS trong server.js
□ Kiểm tra migration address đã có trong server.js
□ Push lên GitHub
□ Tạo Railway project → link GitHub
□ Set biến môi trường: RESEND_API_KEY, GMAIL_PASS, SITE_URL
□ Add custom domain trên Railway (cả www và non-www)
□ Cấu hình DNS 123host (A record + CNAME www)
□ Verify domain Resend (DKIM + MX + SPF) — đừng copy "TTL Auto"
□ Test thêm phật tử thủ công → chỉ admin được
□ Test đặt nghi lễ public → phật tử auto-tạo đủ name/phone/email/address
□ Test thanh toán QR → check Sepay webhook
□ Test email automation → thêm customer có email
□ Đổi RESEND_FROM sang chua@domain sau khi verify domain
```
