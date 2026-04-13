const express  = require('express');
const { DatabaseSync } = require('node:sqlite');
const path      = require('path');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── ADMIN CONFIG ─────────────────────────────────────────────
const ADMIN_USER        = 'admindchua';
const ADMIN_DEFAULT_PASS = '23061999';
const ADMIN_EMAIL       = 'minhhieubg99@gmail.com';
// Gmail App Password – đặt biến môi trường GMAIL_PASS trên Railway
const GMAIL_PASS = process.env.GMAIL_PASS || '';

// ─── COOKIE HELPERS ───────────────────────────────────────────
function parseCookies(req) {
  const list = {};
  const h = req.headers.cookie;
  if (!h) return list;
  h.split(';').forEach(c => {
    const [k, ...v] = c.split('=');
    if (k) list[k.trim()] = decodeURIComponent(v.join('=').trim());
  });
  return list;
}

function makeToken(pass) {
  return Buffer.from(ADMIN_USER + ':' + pass + ':chuaDK2026').toString('base64');
}

function requireAdmin(req, res, next) {
  const cookies  = parseCookies(req);
  const curPass  = getAdminPass();
  if (cookies.adm === makeToken(curPass)) return next();
  res.redirect('/admin/login');
}

// ─── EMAIL HELPER ─────────────────────────────────────────────
async function sendMail(to, subject, html) {
  if (!GMAIL_PASS) { console.log('⚠️ GMAIL_PASS chưa cấu hình'); return false; }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: ADMIN_EMAIL, pass: GMAIL_PASS }
  });
  await transporter.sendMail({ from: `"Chùa Đại Khánh" <${ADMIN_EMAIL}>`, to, subject, html });
  return true;
}

// ─── CẤU HÌNH SEPAY (VietinBank) ─────────────────────────────
// Vào Sepay Dashboard → Tài khoản ngân hàng → lấy số TK VietinBank
const SEPAY_CONFIG = {
  BANK_ID: 'vietinbank',        // VietinBank (đã đăng ký Sepay)
  ACCOUNT_NUMBER: '102506196666',
  ACCOUNT_NAME: 'NGUYEN MINH HIEU',
  WEBHOOK_TOKEN: '',            // ← Điền API token từ Sepay Settings (tuỳ chọn)
};

// ─── CẤU HÌNH AGRIBANK (Sư Trụ Trì) ─────────────────────────
// Phật tử có thể chọn công đức trực tiếp cho sư trụ trì qua Agribank
const AGRIBANK_CONFIG = {
  BANK_ID: 'agribank',
  ACCOUNT_NUMBER: '2608205306753',
  ACCOUNT_NAME: 'NGUYEN THI BAC',
  DESCRIPTION: 'Sư Trụ Trì – Chùa Đại Khánh',
};

// ─── DATABASE ─────────────────────────────────────────────────
const db = new DatabaseSync(path.join(__dirname, 'brain.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    price       INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    quantity    INTEGER DEFAULT -1,
    created_at  TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    phone         TEXT,
    zalo          TEXT,
    email         TEXT,
    registered_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code     TEXT UNIQUE,
    customer_id    INTEGER,
    customer_name  TEXT,
    customer_phone TEXT,
    product_id     INTEGER,
    product_name   TEXT,
    amount         INTEGER NOT NULL DEFAULT 0,
    status         TEXT    DEFAULT 'pending',
    note           TEXT,
    created_at     TEXT DEFAULT (datetime('now','localtime')),
    paid_at        TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ─── ADMIN PASSWORD LƯU TRONG DB ──────────────────────────────
function getAdminPass() {
  const row = db.prepare("SELECT value FROM settings WHERE key='admin_pass'").get();
  return row ? row.value : ADMIN_DEFAULT_PASS;
}
function setAdminPass(newPass) {
  db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('admin_pass',?)").run(newPass);
}
// Khởi tạo mật khẩu mặc định nếu chưa có
if (!db.prepare("SELECT value FROM settings WHERE key='admin_pass'").get()) {
  setAdminPass(ADMIN_DEFAULT_PASS);
}

// Seed sản phẩm mẫu nếu chưa có
const { cnt } = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
if (cnt === 0) {
  const seed = db.prepare('INSERT INTO products (name, price, description, quantity) VALUES (?,?,?,?)');
  seed.run('Dâng sớ cầu an', 0, 'Dịch vụ dâng sớ cầu an cho gia đình, người thân. Giá tùy tâm phật tử.', -1);
  seed.run('Làm lễ cầu siêu', 0, 'Lễ cầu siêu cho hương linh người đã khuất. Giá tùy tâm phật tử.', -1);
  seed.run('Lễ bán khoán', 0, 'Lễ bán khoán cho trẻ em, cầu bình an khỏe mạnh. Giá tùy tâm phật tử.', -1);
  console.log('✅ Đã seed 4 sản phẩm mẫu');
}

// ─── MIDDLEWARE ────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── ROUTES ───────────────────────────────────────────────────
app.get('/',           (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/thanh-toan', (req, res) => res.sendFile(path.join(__dirname, 'thanh-toan.html')));

// ─── ADMIN LOGIN ───────────────────────────────────────────────
app.get('/admin/login', (req, res) => res.sendFile(path.join(__dirname, 'admin-login.html')));

app.post('/admin/login', express.urlencoded({ extended: false }), (req, res) => {
  const { username, password } = req.body;
  const curPass = getAdminPass();
  if (username === ADMIN_USER && password === curPass) {
    res.setHeader('Set-Cookie', `adm=${makeToken(curPass)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?err=1');
});

app.get('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'adm=; HttpOnly; Path=/; Max-Age=0');
  res.redirect('/admin/login');
});

// ─── API: ĐỔI MẬT KHẨU ───────────────────────────────────────
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { oldPass, newPass, confirmPass } = req.body;
  const curPass = getAdminPass();

  if (oldPass !== curPass)
    return res.json({ success: false, error: 'Mật khẩu cũ không đúng' });
  if (!newPass || newPass.length < 6)
    return res.json({ success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  if (newPass !== confirmPass)
    return res.json({ success: false, error: 'Mật khẩu mới không khớp nhau' });
  if (newPass === oldPass)
    return res.json({ success: false, error: 'Mật khẩu mới không được trùng mật khẩu cũ' });

  setAdminPass(newPass);
  // Xóa cookie cũ — yêu cầu đăng nhập lại
  res.setHeader('Set-Cookie', 'adm=; HttpOnly; Path=/; Max-Age=0');
  res.json({ success: true });
});

// ─── API: QUÊN MẬT KHẨU (gửi email) ─────────────────────────
app.post('/admin/forgot-password', express.urlencoded({ extended: false }), async (req, res) => {
  const curPass = getAdminPass();
  try {
    const sent = await sendMail(
      ADMIN_EMAIL,
      '🔐 Mật khẩu Admin – Chùa Đại Khánh',
      `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e5d8c0">
        <h2 style="color:#500a14;font-size:22px">🏛️ Chùa Đại Khánh – Admin</h2>
        <p style="color:#555;margin:16px 0">Bạn vừa yêu cầu lấy lại mật khẩu admin.</p>
        <div style="background:#fdf9f0;border:1px dashed #c9921f;border-radius:8px;padding:16px 20px;margin:20px 0">
          <div style="font-size:13px;color:#888;margin-bottom:4px">Tài khoản</div>
          <div style="font-size:18px;font-weight:700;color:#1a0d05">${ADMIN_USER}</div>
          <div style="font-size:13px;color:#888;margin:12px 0 4px">Mật khẩu hiện tại</div>
          <div style="font-size:24px;font-weight:700;color:#7a0c1e;letter-spacing:0.1em">${curPass}</div>
        </div>
        <p style="color:#888;font-size:12px">🔒 Hãy đổi mật khẩu ngay sau khi đăng nhập.</p>
        <p style="color:#c9921f;font-size:13px;margin-top:16px">🪷 Nam Mô A Di Đà Phật 🪷</p>
      </div>`
    );
    if (sent) res.redirect('/admin/login?forgot=1');
    else res.redirect('/admin/login?forgot=err');
  } catch(e) {
    console.error('Email error:', e);
    res.redirect('/admin/login?forgot=err');
  }
});

app.get('/admin', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ─── API: CONFIG (cho trang công đức) ────────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    sepay: {
      bankId:        SEPAY_CONFIG.BANK_ID,
      accountNumber: SEPAY_CONFIG.ACCOUNT_NUMBER,
      accountName:   SEPAY_CONFIG.ACCOUNT_NAME,
      configured:    !!(SEPAY_CONFIG.ACCOUNT_NUMBER),
    },
    agribank: {
      bankId:        AGRIBANK_CONFIG.BANK_ID,
      accountNumber: AGRIBANK_CONFIG.ACCOUNT_NUMBER,
      accountName:   AGRIBANK_CONFIG.ACCOUNT_NAME,
      description:   AGRIBANK_CONFIG.DESCRIPTION,
    },
  });
});

// ─── API: PRODUCTS ─────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all());
});

app.post('/api/products', (req, res) => {
  const { name, price, description, quantity } = req.body;
  if (!name) return res.status(400).json({ error: 'Thiếu tên' });
  const r = db.prepare('INSERT INTO products (name,price,description,quantity) VALUES (?,?,?,?)')
    .run(name, price ?? 0, description ?? '', quantity ?? -1);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/products/:id', (req, res) => {
  const { name, price, description, quantity } = req.body;
  db.prepare('UPDATE products SET name=?,price=?,description=?,quantity=? WHERE id=?')
    .run(name, price, description, quantity, req.params.id);
  res.json({ success: true });
});

app.delete('/api/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── API: CUSTOMERS ────────────────────────────────────────────
app.get('/api/customers', (req, res) => {
  res.json(db.prepare('SELECT * FROM customers ORDER BY id DESC').all());
});

app.post('/api/customers', (req, res) => {
  const { name, phone, zalo, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Thiếu tên' });
  if (phone) {
    const ex = db.prepare('SELECT id FROM customers WHERE phone=?').get(phone);
    if (ex) return res.json({ id: ex.id, existing: true });
  }
  const r = db.prepare('INSERT INTO customers (name,phone,zalo,email) VALUES (?,?,?,?)')
    .run(name, phone ?? '', zalo ?? '', email ?? '');
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/customers/:id', (req, res) => {
  const { name, phone, zalo, email } = req.body;
  db.prepare('UPDATE customers SET name=?,phone=?,zalo=?,email=? WHERE id=?')
    .run(name, phone, zalo, email, req.params.id);
  res.json({ success: true });
});

app.delete('/api/customers/:id', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── API: ORDERS ───────────────────────────────────────────────
app.get('/api/orders', (req, res) => {
  res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC').all());
});

// QUAN TRỌNG: route /code/:code phải đứng TRƯỚC /:id
app.get('/api/orders/code/:code', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_code=?').get(req.params.code);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  res.json(order);
});

// ─── API: STATS ────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const totalRevenue   = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM orders WHERE status='success'").get().v;
  const todayRevenue   = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM orders WHERE status='success' AND DATE(created_at)=?").get(today).v;
  const totalOrders    = db.prepare("SELECT COUNT(*) as v FROM orders").get().v;
  const pendingOrders  = db.prepare("SELECT COUNT(*) as v FROM orders WHERE status='pending'").get().v;
  const successOrders  = db.prepare("SELECT COUNT(*) as v FROM orders WHERE status='success'").get().v;
  const totalCustomers = db.prepare("SELECT COUNT(*) as v FROM customers").get().v;
  res.json({ totalRevenue, todayRevenue, totalOrders, pendingOrders, successOrders, totalCustomers });
});

// ─── API: EXPORT CSV ───────────────────────────────────────────
app.get('/api/orders/export', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const rows = [
    ['Mã đơn','Phật tử','SĐT','Nghi lễ','Số tiền','Trạng thái','Ghi chú (Gia đình)','Ngày tạo','Ngày CĐ']
  ];
  orders.forEach(o => {
    rows.push([
      o.order_code, o.customer_name, o.customer_phone,
      o.product_name, o.amount,
      o.status === 'success' ? 'Đã Công Đức' : 'Chờ Công Đức',
      (o.note || '').replace(/\|/g, ';'),
      o.created_at, o.paid_at || ''
    ]);
  });
  const csv = rows.map(r => r.map(c => '"' + String(c || '').replace(/"/g,'""') + '"').join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="cong-duc-chua-dai-khanh.csv"');
  res.send('\uFEFF' + csv); // BOM for Excel Vietnamese
});

app.post('/api/orders', (req, res) => {
  const { customer_name, customer_phone, product_id, product_name, amount, note } = req.body;
  if (!customer_name || !amount) return res.status(400).json({ error: 'Thiếu thông tin' });

  const order_code = 'DK' + Date.now().toString().slice(-8);

  // Tìm hoặc tạo khách hàng
  let customer_id = null;
  if (customer_phone) {
    const ex = db.prepare('SELECT id FROM customers WHERE phone=?').get(customer_phone);
    if (ex) {
      customer_id = ex.id;
    } else {
      const r = db.prepare('INSERT INTO customers (name,phone) VALUES (?,?)').run(customer_name, customer_phone);
      customer_id = r.lastInsertRowid;
    }
  }

  const r = db.prepare(`
    INSERT INTO orders (order_code,customer_id,customer_name,customer_phone,product_id,product_name,amount,note)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(order_code, customer_id, customer_name, customer_phone ?? '', product_id ?? null,
         product_name ?? '', amount, note ?? '');

  // Trừ tồn kho nếu có giới hạn
  if (product_id) {
    db.prepare('UPDATE products SET quantity=quantity-1 WHERE id=? AND quantity>0').run(product_id);
  }

  res.json({ id: r.lastInsertRowid, order_code });
});

app.put('/api/orders/:id', (req, res) => {
  const { status, customer_name, customer_phone, product_name, amount, note } = req.body;
  const paid_at = status === 'success'
    ? db.prepare("SELECT paid_at FROM orders WHERE id=?").get(req.params.id)?.paid_at || new Date().toISOString()
    : null;
  db.prepare(`
    UPDATE orders SET status=?,customer_name=?,customer_phone=?,product_name=?,amount=?,note=?,
    paid_at=COALESCE(paid_at,?) WHERE id=?
  `).run(status, customer_name, customer_phone, product_name, amount, note, paid_at, req.params.id);
  res.json({ success: true });
});

app.delete('/api/orders/:id', (req, res) => {
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── WEBHOOK SEPAY ─────────────────────────────────────────────
// Cấu hình URL này trong Sepay Dashboard: http://your-domain/webhook/sepay
app.post('/webhook/sepay', (req, res) => {
  const data = req.body;
  console.log('📥 Webhook Sepay:', JSON.stringify(data));

  // Chỉ xử lý tiền vào
  if (data.transferType !== 'in') return res.json({ success: true });

  const content = (data.content || '').toUpperCase();
  const amount  = Number(data.transferAmount) || 0;

  // Tìm đơn pending có mã khớp với nội dung chuyển khoản
  const pending = db.prepare("SELECT * FROM orders WHERE status='pending' ORDER BY created_at DESC").all();

  let matched = false;
  for (const order of pending) {
    if (content.includes(order.order_code.toUpperCase())) {
      if (amount >= order.amount) {
        db.prepare("UPDATE orders SET status='success', paid_at=datetime('now','localtime') WHERE id=?")
          .run(order.id);
        console.log(`✅ Đơn ${order.order_code} đã thanh toán: ${amount.toLocaleString()}đ`);
        matched = true;
      } else {
        console.log(`⚠️  Số tiền không khớp: nhận ${amount}, cần ${order.amount}`);
      }
      break;
    }
  }

  if (!matched) console.log(`ℹ️  Không khớp đơn nào: "${data.content}" (${amount}đ)`);

  // Sepay yêu cầu { success: true } HTTP 200
  res.json({ success: true });
});

// ─── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  🏛️  Chùa Đại Khánh – Server đang chạy');
  console.log('══════════════════════════════════════════════════');
  console.log(`  🌐  Website:      http://localhost:${PORT}`);
  console.log(`  📊  Admin Panel:  http://localhost:${PORT}/admin`);
  console.log(`  🪷  Công đức:     http://localhost:${PORT}/thanh-toan`);
  console.log(`  🔗  Webhook:      http://localhost:${PORT}/webhook/sepay`);
  console.log('══════════════════════════════════════════════════');
  if (!SEPAY_CONFIG.ACCOUNT_NUMBER) {
    console.log('  ⚠️  Chưa điền ACCOUNT_NUMBER trong server.js!');
  }
  console.log('');
});
