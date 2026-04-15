# 🏛️ TEMPLE WEBSITE TEMPLATE
> **Đọc trước khi code.** Copy repo chuaDK → sửa `temple-config.js` → deploy.

---

## STACK & CẤU TRÚC

```
Node.js + Express  |  node:sqlite (Node 22+)  |  Railway hosting  |  123host domain
Resend (email auto)  |  Sepay webhook (payment)  |  Ho Ngoc Duc (âm lịch)

project/
├── server.js          # backend: routes + DB + auth + email + âm lịch
├── temple-config.js   # ← CHỈ SỬA FILE NÀY cho chùa mới
├── index.html         # trang chủ
├── thanh-toan.html    # trang công đức + QR
├── admin.html         # admin panel
├── admin-login.html
└── package.json       # "start": "node server.js"  ← BẮT BUỘC có dòng này
```

---

## TEMPLE-CONFIG.JS — Sửa cho mỗi chùa mới

```javascript
const TEMPLE = {
  name: 'Chùa Đại Khánh',
  shortName: 'Đại Khánh',
  emoji: '☸',
  slogan: 'Nơi tâm linh hội tụ · Đất lành Phật ngự',
  location: 'Thôn Trừng Xá, xã Trung Chính, tỉnh Bắc Ninh',
  address:  'Thôn Trừng Xá, xã Trung Chính, huyện Lương Tài, tỉnh Bắc Ninh',
  phone: '0974 556 898', phoneRaw: '0974556898',
  email: 'chuadaikhanh@gmail.com',
  hours: 'Hàng ngày: 06:00 – 18:00',

  abbot: { name: 'Đại đức Thích Trung Chinh', title: 'Trụ trì – Chùa Đại Khánh' },

  // Ngày giỗ tổ — cố định theo âm lịch, khác nhau mỗi chùa
  gioTo: {
    ngayAm: 15, thangAm: 1,
    ten: 'Lễ Giỗ Tổ Chùa Đại Khánh',
    soNgay: 3,
    nhacTruocNgay: 7,   // email nhắc tự động trước X ngày
  },

  ngayLe: [
    { ten: 'Rằm tháng Giêng', ngayAm: 15, thangAm: 1, isGioTo: true },
    { ten: 'Phật Đản',        ngayAm: 15, thangAm: 4 },
    { ten: 'Lễ Vu Lan',       ngayAm: 15, thangAm: 7 },
    { ten: 'Lễ Thành Đạo',    ngayAm: 8,  thangAm: 12 },
  ],

  bank: {
    primary:   { name:'VietinBank', id:'vietinbank', accountNumber:'102506196666', accountName:'NGUYEN MINH HIEU' },
    secondary: { name:'Agribank',   id:'agribank',   accountNumber:'2608205306753', accountName:'NGUYEN THI BAC', description:'Sư Trụ Trì' },
  },

  theme: { crimson:'#7a0c1e', crimsonDark:'#500a14', gold:'#c9921f', goldLight:'#e8b84b', cream:'#faf5ea' },

  system: { domain: 'chuadaikhanh-trungchinh-bn.com.vn', foundedYear: '2024' }
};

if (typeof module !== 'undefined') module.exports = TEMPLE;
// Dùng trong server.js: const TEMPLE = require('./temple-config');
// Dùng trong HTML:      <script src="/temple-config.js"></script>  → TEMPLE.name
```

---

## DATABASE SCHEMA

```javascript
db.exec(`
  CREATE TABLE IF NOT EXISTS products (      -- nghi lễ
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, price INTEGER DEFAULT 0,  -- 0 = tùy tâm
    description TEXT, quantity INTEGER DEFAULT -1, -- -1 = vô hạn
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS customers (     -- phật tử
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, phone TEXT, zalo TEXT, email TEXT,
    address TEXT,   -- ← CẦN để in sớ cầu an
    registered_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS orders (        -- đơn công đức
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT UNIQUE, customer_id INTEGER,
    customer_name TEXT, customer_phone TEXT,
    product_id INTEGER, product_name TEXT,
    amount INTEGER DEFAULT 0, status TEXT DEFAULT 'pending', -- pending|success
    note TEXT, created_at TEXT DEFAULT (datetime('now','localtime')), paid_at TEXT
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS email_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER, customer_name TEXT, customer_email TEXT,
    email_type TEXT,  -- welcome|value|invite|confirm
    order_code TEXT, amount INTEGER, product_name TEXT,
    scheduled_at TEXT, sent_at TEXT, status TEXT DEFAULT 'pending'
  );
  CREATE TABLE IF NOT EXISTS lich_le (
    id INTEGER PRIMARY KEY AUTOINCREMENT, don_id INTEGER NOT NULL,
    ngay_duong TEXT, ngay_am TEXT,
    trang_thai TEXT DEFAULT 'chua_hen',  -- chua_hen|da_hen|da_hoan_thanh
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS lich_su_sua (
    id INTEGER PRIMARY KEY AUTOINCREMENT, don_id INTEGER NOT NULL,
    ngay_cu TEXT, ngay_moi TEXT,
    thoi_gian_sua TEXT DEFAULT (datetime('now','localtime'))
  );
`);
// Migration an toàn — không crash nếu cột đã tồn tại
try { db.exec("ALTER TABLE customers ADD COLUMN address TEXT"); } catch(e) {}
```

---

## ADMIN AUTH

> ⚠️ **TUYỆT ĐỐI KHÔNG hardcode mật khẩu/email thật vào code** — GitHub là public, ai cũng đọc được.
> Mọi thông tin bí mật phải để trong Railway env vars.

```javascript
// ✅ ĐÚNG — đọc từ env vars, không có giá trị thật trong code
const ADMIN_USER         = process.env.ADMIN_USER  || 'admindchua';
const ADMIN_DEFAULT_PASS = process.env.ADMIN_PASS  || 'doipassngay123';
const ADMIN_EMAIL        = process.env.ADMIN_EMAIL || '';

// ✅ getAdminPass — ưu tiên env var, KHÔNG để DB cũ ghi đè
function getAdminPass() {
  if (process.env.ADMIN_PASS) return process.env.ADMIN_PASS; // env var luôn thắng
  const row = db.prepare("SELECT value FROM settings WHERE key='admin_pass'").get();
  return row ? row.value : ADMIN_DEFAULT_PASS;
}

function makeToken(pass) {
  return Buffer.from(ADMIN_USER + ':' + pass + ':SALT2026').toString('base64');
}
function requireAdmin(req, res, next) {
  if (parseCookies(req).adm === makeToken(getAdminPass())) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/admin/login');
}
```

**Tại sao phải dùng env vars?**
- Code trên GitHub là **public** — mật khẩu hardcode = ai cũng đọc được = vào được admin
- DB có thể lưu mật khẩu cũ từ lần deploy trước → nếu `getAdminPass()` chỉ đọc DB, env var mới set sẽ bị bỏ qua
- Env vars trên Railway là **private**, không lộ ra ngoài dù ai xem code

**Railway env vars cần set (tab Variables):**
```
ADMIN_USER   = admindchua
ADMIN_PASS   = (mật khẩu mạnh, ví dụ: Chua@2026!)
ADMIN_EMAIL  = email@gmail.com
GMAIL_PASS   = xxxx xxxx xxxx xxxx
RESEND_API_KEY = re_xxx
SITE_URL     = https://domain.com.vn
```

---

## PHÂN QUYỀN API

```
PUBLIC (không cần đăng nhập):
  GET  /api/products              → thanh-toan.html load danh sách nghi lễ
  GET  /api/customers/check       → check trùng SĐT khi khách điền form
  POST /api/orders                → khách đặt nghi lễ / công đức
  GET  /api/orders/code/:code     → khách kiểm tra đơn của mình

ADMIN ONLY (requireAdmin):
  GET/POST/PUT/DELETE /api/customers
  POST/PUT/DELETE     /api/products
  GET/PUT/DELETE      /api/orders
  GET /api/orders/export  (xuất CSV)
  GET /api/stats          (dashboard)
  GET /api/lunar          (convert âm lịch)
```

**Auto-tạo phật tử khi đặt nghi lễ (INSERT trực tiếp, không qua POST /api/customers):**
```javascript
app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_phone, customer_email, customer_address, ... } = req.body;
  if (customer_phone) {
    const ex = db.prepare('SELECT id,email FROM customers WHERE phone=?').get(customer_phone);
    if (ex) {
      customer_id = ex.id;
      if (!ex.email && customer_email)
        db.prepare('UPDATE customers SET email=? WHERE id=?').run(customer_email, customer_id);
    } else {
      const r = db.prepare('INSERT INTO customers (name,phone,email,address) VALUES (?,?,?,?)')
        .run(customer_name, customer_phone, customer_email||'', customer_address||'');
      customer_id = r.lastInsertRowid;
    }
  }
  // tạo order...
});
```

---

## PAYMENT

```javascript
// VietQR
`https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amt}&addInfo=${encodeURIComponent('SEVQR '+code)}`

// Webhook Sepay
app.post('/webhook/sepay', async (req, res) => {
  if (req.body.transferType !== 'in') return res.json({ success: true });
  const content = (req.body.content||'').toUpperCase();
  const amount  = Number(req.body.transferAmount)||0;
  const order = db.prepare("SELECT * FROM orders WHERE status='pending' ORDER BY created_at DESC")
    .all().find(o => content.includes(o.order_code.toUpperCase()) && amount >= o.amount);
  if (order) db.prepare("UPDATE orders SET status='success',paid_at=datetime('now') WHERE id=?").run(order.id);
  res.json({ success: true });
});
```

---

## EMAIL (Resend)

```javascript
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM    = `Chùa ${TEMPLE.shortName} <chua@${TEMPLE.system.domain}>`;

async function sendResendEmail(to, subject, html) {
  if (!RESEND_API_KEY || !to?.includes('@')) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{'Authorization':`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html })
  });
  return r.ok;
}
// Triggers: welcome(0), value(+2 ngày), invite(+3 ngày), confirm(0) khi thanh toán
```

**DNS Resend trên 123host:**
| Tên | Loại | Giá trị |
|-----|------|---------|
| `resend._domainkey` | TXT | `p=MIGf...` từ Resend dashboard — **KHÔNG copy "TTL Auto"** |
| `send` | MX | `feedback-smtp.ap-northeast-1.amazonses.com` · Priority: **10** |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` |

---

## ÂM LỊCH

```javascript
// Copy nguyên hàm từ server.js chuaDK:
// ll_jdFromDate → ll_newMoon → ll_sunLong → ll_month11 → ll_leapOffset → solar2Lunar → formatLunar
// Không cần thư viện, chạy thuần Node.js

app.get('/api/lunar', requireAdmin, (req, res) => {
  const {dd,mm,yy} = req.query;
  res.json({ ...solar2Lunar(+dd,+mm,+yy), formatted: formatLunar(+dd,+mm,+yy) });
});
```

---

## ADMIN UI — THIẾT KẾ CHO NGƯỜI CAO TUỔI

```
Font:   16px base · 15px bảng · 20px header · 32px stat-card
Button: padding 11px 22px · font-size 15px · border-radius 10px · font-weight 600
Input:  padding 12px 16px · border 2px · font-size 15px
Info box màu vàng nhạt đầu mỗi tab · Toast to rõ (15px, bold)
```

**setBtnLoading — bắt buộc dùng cho mọi nút fetch:**
```javascript
function setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) { btn._origText = btn.textContent; btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
  else         { btn.disabled = false; btn.textContent = btn._origText || btn.textContent; }
}

// Pattern chuẩn — mọi saveXxx/deleteXxx đều dùng:
async function saveProduct() {
  const btn = document.querySelector('#modal-product .btn-primary');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(url, {method, headers, body});
    if (!res.ok) { toast('❌ Lỗi', 'error'); return; }
    const data = await res.json();
    if (data.error) { toast('❌ ' + data.error, 'error'); return; }
    closeModal('product');
    await loadProducts();   // ← await: bảng cập nhật xong mới hiện toast
    toast('✅ Đã lưu', 'success');
  } catch(e) { toast('❌ Lỗi kết nối', 'error'); }
  finally { setBtnLoading(btn, false); }
}

// Reload song song: await Promise.all([loadOrders(), loadDashboard()]);
```

**Modal edit — KHÔNG dùng openModal() (sẽ gọi clearForm reset data):**
```javascript
function editProduct(id) {
  const p = productsData.find(x => x.id === id);
  document.getElementById('product-name').value        = p.name || '';
  document.getElementById('product-price').value       = p.price ?? 0;
  document.getElementById('product-description').value = p.description || '';
  document.getElementById('modal-product-title').textContent = '✏️ Sửa nghi lễ';
  document.getElementById('modal-product').classList.add('open'); // ← trực tiếp, không qua openModal()
}
```

---

## MOBILE — HAMBURGER MENU

> Trên mobile `nav { display:none }` ẩn hết — phải thêm hamburger riêng.

**HTML (trong `<header>` sau `</nav>`, và ngay sau `</header>`):**
```html
<button class="menu-btn" id="menuBtn" onclick="toggleMobileMenu()">
  <span></span><span></span><span></span>
</button>
</header>
<div class="mobile-nav" id="mobileNav">
  <a href="#loingo"    onclick="closeMobileMenu()">Lời ngỏ</a>
  <a href="#gioithieu" onclick="closeMobileMenu()">Giới thiệu</a>
  <a href="#hoatdong"  onclick="closeMobileMenu()">Hoạt động</a>
  <a href="#lichle"    onclick="closeMobileMenu()">Lịch lễ</a>
  <a href="#hinhanh"   onclick="closeMobileMenu()">Hình ảnh</a>
  <a href="#lienhe"    onclick="closeMobileMenu()">📞 Liên hệ</a>
  <a href="/thanh-toan" class="mobile-cta">🪷 Dâng công đức</a>
  <a href="/admin"      class="mobile-admin">⚙️ Quản lý Admin</a>
</div>
```

**CSS + JS (rút gọn — copy đủ từ index.html chuaDK):**
```css
.menu-btn { display:none; flex-direction:column; gap:5px; width:40px; height:40px;
  background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2);
  border-radius:8px; cursor:pointer; padding:8px; z-index:1100; }
.menu-btn span { display:block; width:100%; height:2px; background:var(--gold-light); border-radius:2px; }
.menu-btn.open span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
.menu-btn.open span:nth-child(2) { opacity:0; }
.menu-btn.open span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }
.mobile-nav { display:none; position:fixed; inset:0; background:rgba(50,8,14,0.97);
  backdrop-filter:blur(16px); z-index:999; flex-direction:column; align-items:center;
  justify-content:center; padding:80px 24px 40px; }
.mobile-nav.open { display:flex; }
.mobile-nav a { width:100%; text-align:center; color:rgba(255,255,255,0.88); text-decoration:none;
  font-size:18px; font-weight:500; padding:16px 0; border-bottom:1px solid rgba(201,146,31,0.15); }
.mobile-nav .mobile-cta   { margin-top:24px; background:linear-gradient(135deg,#c9921f,#e8b84b);
  color:#1a0d05!important; font-weight:700; border-radius:30px; border-bottom:none; padding:14px 40px; width:auto; }
.mobile-nav .mobile-admin { margin-top:12px; background:rgba(255,255,255,0.08);
  color:rgba(255,255,255,0.55)!important; font-size:13px!important; border-radius:8px;
  border-bottom:none; padding:10px 28px; width:auto; text-transform:uppercase; }
@media (max-width:900px) { nav { display:none; } .menu-btn { display:flex; } }
```
```javascript
function toggleMobileMenu() {
  document.getElementById('mobileNav').classList.toggle('open');
  document.getElementById('menuBtn').classList.toggle('open');
  document.body.style.overflow = document.getElementById('mobileNav').classList.contains('open') ? 'hidden' : '';
}
function closeMobileMenu() {
  ['mobileNav','menuBtn'].forEach(id => document.getElementById(id).classList.remove('open'));
  document.body.style.overflow = '';
}
document.getElementById('mobileNav').addEventListener('click', e => { if(e.target===e.currentTarget) closeMobileMenu(); });
```

---

## DEPLOY — RAILWAY + 123HOST

```
1. Push GitHub → Railway auto-deploy
2. Railway env vars:
     RESEND_API_KEY = re_xxx
     GMAIL_PASS     = xxxx xxxx xxxx xxxx  (Gmail App Password)
     SITE_URL       = https://domain.com.vn
3. Railway → Settings → Networking → Add Custom Domain:
     domain.com.vn   (và thêm riêng www.domain.com.vn)
4. DNS 123host:
     A     @    → Railway IP
     CNAME www  → xxx.up.railway.app
     (+ 3 record Resend: xem section Email)
```

---

## LỖI THƯỜNG GẶP

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| Mật khẩu lộ trên GitHub | Hardcode pass/email thật vào code | Dùng `process.env.ADMIN_PASS`, set trên Railway vars |
| Đổi ADMIN_PASS env var nhưng vẫn sai pass | `getAdminPass()` đọc DB cũ thay vì env var | Thêm `if (process.env.ADMIN_PASS) return process.env.ADMIN_PASS` làm dòng đầu tiên |
| DKIM fail Resend | Copy "TTL Auto" vào value | Xóa, thêm lại — chỉ copy `p=MIGf...` |
| www 404 | Railway chưa add www | Railway → Networking → Add Custom Domain → www |
| node:sqlite not found | Node < 22 | Upgrade Node 22+ |
| Sửa button không làm gì | editXxx() gọi element không tồn tại → JS crash | Kiểm tra tất cả getElementById trong editXxx, mở modal trực tiếp |
| Sau CRUD phải F5 | loadXxx() thiếu await | `await loadXxx()` + setBtnLoading |
| Modal edit bị trống | openModal() → clearForm() xóa data | Dùng `classList.add('open')` trực tiếp |
| Cột address không có | DB cũ thiếu cột | `try { db.exec("ALTER TABLE customers ADD COLUMN address TEXT") } catch(e) {}` |
| API trả HTML thay JSON | requireAdmin redirect thay 401 | `if (req.path.startsWith('/api/')) return res.status(401).json(...)` |
| loadXxx() crash 401 | fetch nhận HTML 302, `.json()` fail | Wrap `try/catch` + kiểm tra `res.ok` |
| Nav/Admin ẩn trên mobile | `nav { display:none }` | Thêm hamburger menu |
| Link admin không mở | Dùng `\admin` (backslash) | Sửa thành `/admin` (forward slash) |
| Routes thiếu bảo mật | Thiếu requireAdmin | POST/PUT/DELETE products; GET/PUT/DELETE orders; GET stats, export |
| Railway không chạy | Thiếu `"start"` trong package.json | `"scripts": { "start": "node server.js" }` |

---

## CHECKLIST DEPLOY MỚI

```
□ Sửa temple-config.js: tên, địa chỉ, SĐT, bank, giỗ tổ, domain
□ Thay ADMIN_USER + ADMIN_DEFAULT_PASS trong server.js
□ Xác nhận migration address có trong server.js
□ Push GitHub → tạo Railway project → link repo
□ Set env vars: RESEND_API_KEY, GMAIL_PASS, SITE_URL
□ Add custom domain Railway (www + non-www)
□ DNS 123host: A record + CNAME www + 3 record Resend
□ Verify Resend domain (DKIM + MX + SPF)
□ Test mobile: hamburger menu, nút Admin + Công đức hiện đủ
□ Test đặt nghi lễ public → phật tử tự tạo đủ name/phone/email/address
□ Test admin: thêm/sửa/xóa phật tử + nghi lễ + đơn (không cần F5)
□ Test webhook Sepay: chuyển khoản đúng mã → đơn chuyển success
□ Đổi RESEND_FROM sang chua@domain sau khi verify
□ Đổi mật khẩu admin mặc định
```
