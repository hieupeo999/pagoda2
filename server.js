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
const GMAIL_PASS        = process.env.GMAIL_PASS || '';

// ─── RESEND CONFIG (email tự động cho khách hàng) ─────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM    = 'Chùa Đại Khánh <onboarding@resend.dev>';
const SITE_URL       = process.env.SITE_URL || 'https://chuadaikhanh-trungchinh-bn.com.vn';

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

// ─── EMAIL ADMIN (Gmail – quên mật khẩu) ─────────────────────
async function sendMail(to, subject, html) {
  if (!GMAIL_PASS) { console.log('⚠️ GMAIL_PASS chưa cấu hình'); return false; }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: ADMIN_EMAIL, pass: GMAIL_PASS }
  });
  await transporter.sendMail({ from: `"Chùa Đại Khánh" <${ADMIN_EMAIL}>`, to, subject, html });
  return true;
}

// ─── EMAIL KHÁCH HÀNG (Resend – tự động) ─────────────────────
async function sendResendEmail(to, subject, html) {
  if (!RESEND_API_KEY) { console.log('⚠️ RESEND_API_KEY chưa cấu hình'); return false; }
  if (!to || !to.includes('@')) { console.log('⚠️ Email không hợp lệ:', to); return false; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html })
    });
    const data = await res.json();
    if (!res.ok) { console.error('Resend error:', data); return false; }
    console.log(`📧 Đã gửi email "${subject}" → ${to}`);
    return true;
  } catch(e) {
    console.error('Resend exception:', e.message);
    return false;
  }
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────
function emailBase(content) {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f5f0e8;font-family:'Segoe UI',Arial,sans-serif}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#500a14,#7a0c1e);padding:32px 40px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;font-weight:600;letter-spacing:.02em}
  .header p{color:rgba(255,255,255,.75);margin:8px 0 0;font-size:14px}
  .body{padding:32px 40px;color:#1a0d05;line-height:1.7}
  .body h2{color:#500a14;font-size:18px;margin:0 0 12px}
  .body p{margin:0 0 16px;font-size:15px;color:#444}
  .btn{display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7a0c1e,#500a14);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;margin:8px 0 16px}
  .box{background:#faf5ea;border:1px solid #e5d8c0;border-radius:10px;padding:20px 24px;margin:16px 0}
  .box p{margin:0;font-size:14px;color:#555}
  .footer{background:#f5f0e8;padding:20px 40px;text-align:center;color:#999;font-size:12px}
  .gold{color:#c9921f;font-weight:600}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>🏛️ Chùa Đại Khánh</h1>
    <p>Nam Mô A Di Đà Phật 🪷</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>🪷 Nam Mô A Di Đà Phật 🪷</p>
    <p>Chùa Đại Khánh – Trung Chính, Bắc Ninh</p>
    <p style="margin-top:8px"><a href="${SITE_URL}" style="color:#7a0c1e">Xem trang web</a></p>
  </div>
</div></body></html>`;
}

const EMAIL_TEMPLATES = {
  // Email 1: Chào mừng (gửi ngay)
  welcome: (name) => ({
    subject: '🪷 Chào mừng bạn đến với Chùa Đại Khánh',
    html: emailBase(`
      <h2>Kính chào Phật tử ${name},</h2>
      <p>Chùa Đại Khánh trân trọng cảm ơn bạn đã quan tâm và tin tưởng. Đây là bước đầu tiên trên hành trình kết nối tâm linh cùng chúng tôi.</p>
      <div class="box">
        <p>🙏 <strong>Tại Chùa Đại Khánh, chúng tôi cung cấp:</strong></p>
        <p>• Dâng sớ cầu an cho gia đình, người thân<br>
           • Làm lễ cầu siêu cho hương linh người đã khuất<br>
           • Lễ bán khoán cầu bình an cho trẻ em<br>
           • Và nhiều nghi lễ khác theo nhu cầu</p>
      </div>
      <p>Mọi nghi lễ đều được thực hiện trang nghiêm, thành tâm. Số tiền công đức hoàn toàn <span class="gold">tùy tâm phật tử</span> — chùa không có mức quy định.</p>
      <p style="text-align:center">
        <a href="${SITE_URL}/thanh-toan" class="btn">🙏 Xem các nghi lễ</a>
      </p>
      <p>Nếu có bất kỳ câu hỏi nào, xin hoan nghênh Phật tử liên hệ với chúng tôi.</p>
      <p>Kính chúc Phật tử và gia đình thân tâm an lạc! 🪷</p>
    `)
  }),

  // Email 2: Giá trị (2 ngày sau)
  value: (name) => ({
    subject: '🙏 Ý nghĩa của việc dâng sớ cầu an – Chùa Đại Khánh',
    html: emailBase(`
      <h2>Kính Phật tử ${name},</h2>
      <p>Nhiều người hỏi chúng tôi: <em>"Dâng sớ cầu an có ý nghĩa gì?"</em> — Hôm nay chúng tôi muốn chia sẻ điều này với bạn.</p>
      <div class="box">
        <p>📖 <strong>Dâng sớ cầu an là gì?</strong></p>
        <p>Dâng sớ là việc viết một bản văn bày tỏ tâm nguyện, cầu xin chư Phật và Bồ Tát gia hộ cho bản thân và gia đình được bình an, khỏe mạnh, thuận duyên trong công việc và cuộc sống.</p>
      </div>
      <p>Theo quan niệm Phật giáo, khi tâm thành tâm cầu — chư Phật sẽ lắng nghe. Điều quan trọng không phải là số tiền công đức nhiều hay ít, mà là <span class="gold">tâm thành và sự thành tâm</span> của người cầu nguyện.</p>
      <div class="box">
        <p>🕯️ <strong>3 lợi ích khi làm lễ tại chùa:</strong></p>
        <p>1. <strong>Giải trừ nghiệp chướng</strong> – giúp cuộc sống bớt trở ngại<br>
           2. <strong>Tăng phước báu</strong> – gia đình bình an, con cái học hành tốt<br>
           3. <strong>Tâm an định</strong> – giảm lo lắng, sống thanh thản hơn</p>
      </div>
      <p>Nhiều Phật tử sau khi làm lễ cầu an tại Chùa Đại Khánh đã chia sẻ cảm nhận về sự bình yên trong tâm hồn và những chuyển biến tích cực trong cuộc sống.</p>
      <p>🌸 Nếu bạn đang trải qua giai đoạn khó khăn hoặc muốn cầu nguyện cho gia đình, chúng tôi luôn sẵn lòng hỗ trợ.</p>
      <p>Kính chúc Phật tử thân tâm thường lạc! 🪷</p>
    `)
  }),

  // Email 3: Mời đăng ký (3 ngày sau)
  invite: (name) => ({
    subject: '✨ Đăng ký nghi lễ tại Chùa Đại Khánh – Còn chỗ nhận sớ tháng này',
    html: emailBase(`
      <h2>Kính Phật tử ${name},</h2>
      <p>Tháng này Chùa Đại Khánh vẫn đang nhận đăng ký các nghi lễ. Nếu bạn đang có tâm nguyện muốn cầu an, cầu siêu hay làm lễ cho gia đình — đây là thời điểm thích hợp.</p>
      <div class="box">
        <p>🙏 <strong>Các nghi lễ hiện đang nhận đăng ký:</strong></p>
        <p>• 🌸 <strong>Dâng sớ cầu an</strong> – Cầu gia đình bình an, công việc thuận lợi<br>
           • 🕯️ <strong>Lễ cầu siêu</strong> – Cho hương linh người thân đã khuất<br>
           • 👶 <strong>Lễ bán khoán</strong> – Cầu bình an cho trẻ em<br>
           • 📿 <strong>Và các nghi lễ theo yêu cầu</strong></p>
      </div>
      <p>💛 Mọi khoản công đức đều <span class="gold">tùy tâm</span> — chúng tôi không có mức quy định. Điều quan trọng là tâm thành của Phật tử.</p>
      <p>Đăng ký chỉ mất <strong>2 phút</strong> — điền thông tin và chọn nghi lễ phù hợp:</p>
      <p style="text-align:center">
        <a href="${SITE_URL}/thanh-toan" class="btn">🙏 Đăng ký nghi lễ ngay</a>
      </p>
      <p>Hoặc nếu có câu hỏi, bạn có thể liên hệ trực tiếp với nhà chùa. Chúng tôi rất vui được hỗ trợ.</p>
      <p>Kính chúc Phật tử và gia đình vạn sự cát tường! 🪷</p>
    `)
  }),

  // Email 4: Xác nhận đơn hàng (ngay khi có đơn thành công)
  confirm: (name, orderCode, productName, amount) => ({
    subject: `✅ Xác nhận công đức thành công – ${orderCode}`,
    html: emailBase(`
      <h2>Nam Mô A Di Đà Phật! 🙏</h2>
      <p>Kính chào Phật tử <strong>${name}</strong>,</p>
      <p>Chùa Đại Khánh đã nhận được tấm lòng công đức của bạn. Chúng tôi thành tâm cảm ơn và ghi nhận tâm nguyện của Phật tử.</p>
      <div class="box">
        <p>📋 <strong>Chi tiết công đức:</strong></p>
        <p>• Mã đơn: <strong style="color:#7a0c1e">${orderCode}</strong><br>
           • Nghi lễ: <strong>${productName || 'Công đức chùa'}</strong><br>
           • Số tiền: <strong class="gold">${amount ? Number(amount).toLocaleString('vi-VN') + 'đ' : 'Tùy tâm'}</strong><br>
           • Trạng thái: <strong style="color:#166534">✅ Đã xác nhận</strong></p>
      </div>
      <p>🕯️ Chùa Đại Khánh sẽ thành tâm thực hiện nghi lễ và hồi hướng công đức đến Phật tử và gia đình. Cầu cho gia đình bạn <span class="gold">phước lành viên mãn, thân tâm an lạc</span>.</p>
      <div class="box">
        <p>🙏 <em>"Công đức vô lượng vô biên, hồi hướng pháp giới chúng sinh, đồng nguyện vãng sinh Cực Lạc."</em></p>
      </div>
      <p>Nếu có bất kỳ thắc mắc nào về nghi lễ, xin hoan nghênh Phật tử liên hệ với chúng tôi.</p>
      <p>Kính chúc Phật tử thân tâm thường lạc, vạn sự cát tường! 🪷</p>
    `)
  }),
};

// ─── LỊCH GỬI EMAIL (queue) ───────────────────────────────────
function scheduleEmail(customerId, customerName, customerEmail, emailType, delayDays = 0, extra = {}) {
  if (!customerEmail || !customerEmail.includes('@')) return;
  const scheduledAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO email_queue (customer_id, customer_name, customer_email, email_type, order_code, amount, product_name, scheduled_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(customerId, customerName, customerEmail, emailType,
         extra.orderCode || null, extra.amount || null, extra.productName || null,
         scheduledAt);
  console.log(`📅 Lên lịch email "${emailType}" cho ${customerEmail} sau ${delayDays} ngày`);
}

// Xử lý hàng đợi email (chạy mỗi 30 phút)
async function processEmailQueue() {
  const now = new Date().toISOString();
  const pending = db.prepare(`
    SELECT * FROM email_queue WHERE status='pending' AND scheduled_at <= ? ORDER BY scheduled_at ASC LIMIT 20
  `).all(now);

  for (const item of pending) {
    try {
      let tpl;
      if (item.email_type === 'welcome') tpl = EMAIL_TEMPLATES.welcome(item.customer_name);
      else if (item.email_type === 'value') tpl = EMAIL_TEMPLATES.value(item.customer_name);
      else if (item.email_type === 'invite') tpl = EMAIL_TEMPLATES.invite(item.customer_name);
      else if (item.email_type === 'confirm') tpl = EMAIL_TEMPLATES.confirm(item.customer_name, item.order_code, item.product_name, item.amount);
      else continue;

      const ok = await sendResendEmail(item.customer_email, tpl.subject, tpl.html);
      db.prepare(`UPDATE email_queue SET status=?, sent_at=datetime('now') WHERE id=?`)
        .run(ok ? 'sent' : 'failed', item.id);
    } catch(e) {
      console.error('Queue error:', e.message);
      db.prepare(`UPDATE email_queue SET status='failed' WHERE id=?`).run(item.id);
    }
  }
}

// ─── CẤU HÌNH SEPAY (VietinBank) ─────────────────────────────
const SEPAY_CONFIG = {
  BANK_ID: 'vietinbank',
  ACCOUNT_NUMBER: '102506196666',
  ACCOUNT_NAME: 'NGUYEN MINH HIEU',
  WEBHOOK_TOKEN: '',
};

// ─── CẤU HÌNH AGRIBANK ────────────────────────────────────────
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

  CREATE TABLE IF NOT EXISTS email_queue (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id    INTEGER,
    customer_name  TEXT,
    customer_email TEXT,
    email_type     TEXT,
    order_code     TEXT,
    amount         INTEGER,
    product_name   TEXT,
    scheduled_at   TEXT,
    sent_at        TEXT,
    status         TEXT DEFAULT 'pending'
  );
`);

// ─── ADMIN PASSWORD ────────────────────────────────────────────
function getAdminPass() {
  const row = db.prepare("SELECT value FROM settings WHERE key='admin_pass'").get();
  return row ? row.value : ADMIN_DEFAULT_PASS;
}
function setAdminPass(newPass) {
  db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('admin_pass',?)").run(newPass);
}
if (!db.prepare("SELECT value FROM settings WHERE key='admin_pass'").get()) {
  setAdminPass(ADMIN_DEFAULT_PASS);
}

// Seed sản phẩm mẫu
const { cnt } = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
if (cnt === 0) {
  const seed = db.prepare('INSERT INTO products (name, price, description, quantity) VALUES (?,?,?,?)');
  seed.run('Dâng sớ cầu an', 0, 'Dịch vụ dâng sớ cầu an cho gia đình, người thân. Giá tùy tâm phật tử.', -1);
  seed.run('Làm lễ cầu siêu', 0, 'Lễ cầu siêu cho hương linh người đã khuất. Giá tùy tâm phật tử.', -1);
  seed.run('Lễ bán khoán', 0, 'Lễ bán khoán cho trẻ em, cầu bình an khỏe mạnh. Giá tùy tâm phật tử.', -1);
  console.log('✅ Đã seed 3 sản phẩm mẫu');
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
  if (oldPass !== curPass) return res.json({ success: false, error: 'Mật khẩu cũ không đúng' });
  if (!newPass || newPass.length < 6) return res.json({ success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  if (newPass !== confirmPass) return res.json({ success: false, error: 'Mật khẩu mới không khớp nhau' });
  if (newPass === oldPass) return res.json({ success: false, error: 'Mật khẩu mới không được trùng mật khẩu cũ' });
  setAdminPass(newPass);
  res.setHeader('Set-Cookie', 'adm=; HttpOnly; Path=/; Max-Age=0');
  res.json({ success: true });
});

// ─── API: QUÊN MẬT KHẨU ──────────────────────────────────────
app.post('/admin/forgot-password', express.urlencoded({ extended: false }), async (req, res) => {
  const curPass = getAdminPass();
  try {
    const sent = await sendMail(ADMIN_EMAIL, '🔐 Mật khẩu Admin – Chùa Đại Khánh',
      `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e5d8c0">
        <h2 style="color:#500a14">🏛️ Chùa Đại Khánh – Admin</h2>
        <p style="color:#555">Bạn vừa yêu cầu lấy lại mật khẩu admin.</p>
        <div style="background:#fdf9f0;border:1px dashed #c9921f;border-radius:8px;padding:16px 20px;margin:20px 0">
          <div style="font-size:13px;color:#888">Tài khoản</div>
          <div style="font-size:18px;font-weight:700;color:#1a0d05">${ADMIN_USER}</div>
          <div style="font-size:13px;color:#888;margin-top:12px">Mật khẩu hiện tại</div>
          <div style="font-size:24px;font-weight:700;color:#7a0c1e;letter-spacing:0.1em">${curPass}</div>
        </div>
        <p style="color:#888;font-size:12px">🔒 Hãy đổi mật khẩu ngay sau khi đăng nhập.</p>
        <p style="color:#c9921f;font-size:13px">🪷 Nam Mô A Di Đà Phật 🪷</p>
      </div>`
    );
    if (sent) res.redirect('/admin/login?forgot=1');
    else res.redirect('/admin/login?forgot=err');
  } catch(e) {
    res.redirect('/admin/login?forgot=err');
  }
});

app.get('/admin', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ─── API: EMAIL QUEUE (xem trong admin) ───────────────────────
app.get('/api/email-queue', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM email_queue ORDER BY id DESC LIMIT 100').all();
  res.json(rows);
});

// ─── API: CONFIG ──────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    sepay: {
      bankId: SEPAY_CONFIG.BANK_ID,
      accountNumber: SEPAY_CONFIG.ACCOUNT_NUMBER,
      accountName: SEPAY_CONFIG.ACCOUNT_NAME,
      configured: !!(SEPAY_CONFIG.ACCOUNT_NUMBER),
    },
    agribank: {
      bankId: AGRIBANK_CONFIG.BANK_ID,
      accountNumber: AGRIBANK_CONFIG.ACCOUNT_NUMBER,
      accountName: AGRIBANK_CONFIG.ACCOUNT_NAME,
      description: AGRIBANK_CONFIG.DESCRIPTION,
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

app.post('/api/customers', async (req, res) => {
  const { name, phone, zalo, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Thiếu tên' });

  // Kiểm tra khách cũ
  if (phone) {
    const ex = db.prepare('SELECT id FROM customers WHERE phone=?').get(phone);
    if (ex) return res.json({ id: ex.id, existing: true });
  }

  const r = db.prepare('INSERT INTO customers (name,phone,zalo,email) VALUES (?,?,?,?)')
    .run(name, phone ?? '', zalo ?? '', email ?? '');
  const customerId = r.lastInsertRowid;

  // 🤖 TỰ ĐỘNG GỬI EMAIL CHÀO MỪNG + LÊN LỊCH EMAIL TIẾP THEO
  if (email && email.includes('@')) {
    scheduleEmail(customerId, name, email, 'welcome', 0);   // Gửi ngay
    scheduleEmail(customerId, name, email, 'value',   2);   // 2 ngày sau
    scheduleEmail(customerId, name, email, 'invite',  3);   // 3 ngày sau
  }

  res.json({ id: customerId });
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
app.get('/api/orders/code/:code', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_code=?').get(req.params.code);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  res.json(order);
});

// ─── API: STATS ────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    totalRevenue:   db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM orders WHERE status='success'").get().v,
    todayRevenue:   db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM orders WHERE status='success' AND DATE(created_at)=?").get(today).v,
    totalOrders:    db.prepare("SELECT COUNT(*) as v FROM orders").get().v,
    pendingOrders:  db.prepare("SELECT COUNT(*) as v FROM orders WHERE status='pending'").get().v,
    successOrders:  db.prepare("SELECT COUNT(*) as v FROM orders WHERE status='success'").get().v,
    totalCustomers: db.prepare("SELECT COUNT(*) as v FROM customers").get().v,
  });
});

// ─── API: EXPORT CSV ───────────────────────────────────────────
app.get('/api/orders/export', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const rows = [['Mã đơn','Phật tử','SĐT','Nghi lễ','Số tiền','Trạng thái','Ghi chú','Ngày tạo','Ngày CĐ']];
  orders.forEach(o => {
    rows.push([o.order_code, o.customer_name, o.customer_phone,
      o.product_name, o.amount,
      o.status === 'success' ? 'Đã Công Đức' : 'Chờ Công Đức',
      (o.note || '').replace(/\|/g, ';'), o.created_at, o.paid_at || '']);
  });
  const csv = rows.map(r => r.map(c => '"' + String(c || '').replace(/"/g,'""') + '"').join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="cong-duc-chua-dai-khanh.csv"');
  res.send('\uFEFF' + csv);
});

app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_phone, product_id, product_name, amount, note } = req.body;
  if (!customer_name || !amount) return res.status(400).json({ error: 'Thiếu thông tin' });

  const order_code = 'DK' + Date.now().toString().slice(-8);

  let customer_id = null;
  let customer_email = null;
  if (customer_phone) {
    const ex = db.prepare('SELECT id, email FROM customers WHERE phone=?').get(customer_phone);
    if (ex) {
      customer_id = ex.id;
      customer_email = ex.email;
    } else {
      const r = db.prepare('INSERT INTO customers (name,phone) VALUES (?,?)').run(customer_name, customer_phone);
      customer_id = r.lastInsertRowid;
    }
  }

  const r = db.prepare(`
    INSERT INTO orders (order_code,customer_id,customer_name,customer_phone,product_id,product_name,amount,note)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(order_code, customer_id, customer_name, customer_phone ?? '',
         product_id ?? null, product_name ?? '', amount, note ?? '');

  if (product_id) {
    db.prepare('UPDATE products SET quantity=quantity-1 WHERE id=? AND quantity>0').run(product_id);
  }

  res.json({ id: r.lastInsertRowid, order_code });
});

app.put('/api/orders/:id', async (req, res) => {
  const { status, customer_name, customer_phone, product_name, amount, note } = req.body;
  const existing = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  const paid_at = status === 'success'
    ? existing?.paid_at || new Date().toISOString()
    : null;

  db.prepare(`
    UPDATE orders SET status=?,customer_name=?,customer_phone=?,product_name=?,amount=?,note=?,
    paid_at=COALESCE(paid_at,?) WHERE id=?
  `).run(status, customer_name, customer_phone, product_name, amount, note, paid_at, req.params.id);

  // 🤖 GỬI EMAIL XÁC NHẬN khi đơn thành công lần đầu
  if (status === 'success' && existing?.status !== 'success' && existing) {
    const customer = existing.customer_id
      ? db.prepare('SELECT email FROM customers WHERE id=?').get(existing.customer_id)
      : null;
    const email = customer?.email;
    if (email) {
      scheduleEmail(existing.customer_id, customer_name, email, 'confirm', 0, {
        orderCode: existing.order_code,
        productName: product_name || existing.product_name,
        amount: amount || existing.amount
      });
    }
  }

  res.json({ success: true });
});

app.delete('/api/orders/:id', (req, res) => {
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── WEBHOOK SEPAY ─────────────────────────────────────────────
app.post('/webhook/sepay', async (req, res) => {
  const data = req.body;
  console.log('📥 Webhook Sepay:', JSON.stringify(data));

  if (data.transferType !== 'in') return res.json({ success: true });

  const content = (data.content || '').toUpperCase();
  const amount  = Number(data.transferAmount) || 0;
  const pending = db.prepare("SELECT * FROM orders WHERE status='pending' ORDER BY created_at DESC").all();

  let matched = false;
  for (const order of pending) {
    if (content.includes(order.order_code.toUpperCase())) {
      if (amount >= order.amount) {
        db.prepare("UPDATE orders SET status='success', paid_at=datetime('now','localtime') WHERE id=?")
          .run(order.id);
        console.log(`✅ Đơn ${order.order_code} đã thanh toán: ${amount.toLocaleString()}đ`);
        matched = true;

        // 🤖 GỬI EMAIL XÁC NHẬN tự động
        const customer = order.customer_id
          ? db.prepare('SELECT email FROM customers WHERE id=?').get(order.customer_id)
          : null;
        if (customer?.email) {
          scheduleEmail(order.customer_id, order.customer_name, customer.email, 'confirm', 0, {
            orderCode: order.order_code,
            productName: order.product_name,
            amount: order.amount
          });
        }
      } else {
        console.log(`⚠️ Số tiền không khớp: nhận ${amount}, cần ${order.amount}`);
      }
      break;
    }
  }

  if (!matched) console.log(`ℹ️ Không khớp đơn nào: "${data.content}" (${amount}đ)`);
  res.json({ success: true });
});

// ─── SCHEDULER: XỬ LÝ EMAIL QUEUE ────────────────────────────
// Chạy ngay khi server khởi động, sau đó mỗi 30 phút
setTimeout(() => processEmailQueue(), 5000); // 5 giây sau khởi động
setInterval(() => processEmailQueue(), 30 * 60 * 1000); // Mỗi 30 phút

// ─── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  🏛️  Chùa Đại Khánh – Server đang chạy');
  console.log('══════════════════════════════════════════════════');
  console.log(`  🌐  Website:      http://localhost:${PORT}`);
  console.log(`  📊  Admin Panel:  http://localhost:${PORT}/admin`);
  console.log(`  🪷  Công đức:     http://localhost:${PORT}/thanh-toan`);
  console.log(`  📧  Email queue:  ${RESEND_API_KEY ? '✅ Resend đã cấu hình' : '⚠️ Chưa có RESEND_API_KEY'}`);
  console.log('══════════════════════════════════════════════════');
  console.log('');
});
