const express  = require('express');
const { DatabaseSync } = require('node:sqlite');
const path      = require('path');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── ADMIN CONFIG ─────────────────────────────────────────────
const ADMIN_USER        = process.env.ADMIN_USER  || 'admindchua';
const ADMIN_DEFAULT_PASS = process.env.ADMIN_PASS || 'doipassngay123';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL || '';
const GMAIL_PASS        = process.env.GMAIL_PASS  || '';

// ─── RESEND CONFIG (email tự động cho khách hàng) ─────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM    = 'Chùa Đại Khánh <chua@chuadaikhanh-trungchinh-bn.com.vn>';
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
  // API routes trả về 401 JSON; page routes redirect về login
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
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
    address       TEXT,
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

  CREATE TABLE IF NOT EXISTS phat_tu (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ho_ten          TEXT NOT NULL,
    so_dien_thoai   TEXT,
    dia_chi         TEXT,
    created_at      TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS don_cong_duc (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    phat_tu_id            INTEGER NOT NULL,
    dich_vu               TEXT,
    noi_dung_cau_nguyen   TEXT,
    so_tien               INTEGER DEFAULT 0,
    ngay_tao              TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(phat_tu_id) REFERENCES phat_tu(id)
  );

  CREATE TABLE IF NOT EXISTS thanh_toan_le (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    don_id      INTEGER NOT NULL,
    trang_thai  TEXT DEFAULT 'chua_chuyen',
    thoi_gian   TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(don_id) REFERENCES don_cong_duc(id)
  );

  CREATE TABLE IF NOT EXISTS lich_le (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    don_id      INTEGER NOT NULL,
    ngay_duong  TEXT,
    ngay_am     TEXT,
    trang_thai  TEXT DEFAULT 'chua_hen',
    created_at  TEXT DEFAULT (datetime('now','localtime')),
    updated_at  TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(don_id) REFERENCES don_cong_duc(id)
  );

  CREATE TABLE IF NOT EXISTS lich_su_sua (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    don_id        INTEGER NOT NULL,
    ngay_cu       TEXT,
    ngay_moi      TEXT,
    thoi_gian_sua TEXT DEFAULT (datetime('now','localtime'))
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

// Migration: thêm cột address nếu chưa có (DB cũ)
try {
  db.exec("ALTER TABLE customers ADD COLUMN address TEXT");
  console.log('✅ Migration: đã thêm cột address vào customers');
} catch(e) { /* cột đã tồn tại, bỏ qua */ }

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
// GET: public (thanh-toan.html cần load danh sách nghi lễ)
app.get('/api/products', (req, res) => {
  res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all());
});
// POST/PUT/DELETE: chỉ admin
app.post('/api/products', requireAdmin, (req, res) => {
  const { name, price, description, quantity } = req.body;
  if (!name) return res.status(400).json({ error: 'Thiếu tên' });
  const r = db.prepare('INSERT INTO products (name,price,description,quantity) VALUES (?,?,?,?)')
    .run(name, price ?? 0, description ?? '', quantity ?? -1);
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/products/:id', requireAdmin, (req, res) => {
  const { name, price, description, quantity } = req.body;
  db.prepare('UPDATE products SET name=?,price=?,description=?,quantity=? WHERE id=?')
    .run(name, price, description, quantity, req.params.id);
  res.json({ success: true });
});
app.delete('/api/products/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── API: CUSTOMERS ────────────────────────────────────────────
// ─── API: CUSTOMERS ────────────────────────────────────────────
// GET: chỉ admin mới xem được danh sách phật tử
app.get('/api/customers', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM customers ORDER BY id DESC').all());
});

// GET 1: lấy thông tin 1 phật tử (dùng khi trang công đức check trùng SĐT)
app.get('/api/customers/check', (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.json({ exists: false });
  const row = db.prepare('SELECT id, name FROM customers WHERE phone=?').get(phone);
  res.json(row ? { exists: true, id: row.id, name: row.name } : { exists: false });
});

// POST: tạo mới thủ công (admin only) — auto-add qua /api/orders
app.post('/api/customers', requireAdmin, async (req, res) => {
  const { name, phone, zalo, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Thiếu tên' });

  // Kiểm tra trùng SĐT
  if (phone) {
    const ex = db.prepare('SELECT id FROM customers WHERE phone=?').get(phone);
    if (ex) return res.json({ id: ex.id, existing: true });
  }

  const r = db.prepare('INSERT INTO customers (name,phone,zalo,email,address) VALUES (?,?,?,?,?)')
    .run(name, phone||'', zalo||'', email||'', address||'');
  const customerId = r.lastInsertRowid;

  // Tự động gửi email chào mừng
  if (email && email.includes('@')) {
    scheduleEmail(customerId, name, email, 'welcome', 0);
    scheduleEmail(customerId, name, email, 'value',   2);
    scheduleEmail(customerId, name, email, 'invite',  3);
  }

  res.json({ id: customerId });
});

// PUT: sửa (admin only)
app.put('/api/customers/:id', requireAdmin, (req, res) => {
  const { name, phone, zalo, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Thiếu tên' });
  const id = parseInt(req.params.id);
  const exists = db.prepare('SELECT id FROM customers WHERE id=?').get(id);
  if (!exists) return res.status(404).json({ error: 'Không tìm thấy' });
  db.prepare('UPDATE customers SET name=?,phone=?,zalo=?,email=?,address=? WHERE id=?')
    .run(name, phone||'', zalo||'', email||'', address||'', id);
  res.json({ success: true });
});

// DELETE: xóa (admin only)
app.delete('/api/customers/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM customers WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── API: ORDERS ───────────────────────────────────────────────
// GET danh sách: chỉ admin (bảo vệ thông tin phật tử)
app.get('/api/orders', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC').all());
});
// GET theo code: public (phật tử kiểm tra đơn của mình)
app.get('/api/orders/code/:code', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_code=?').get(req.params.code);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  res.json(order);
});

// ─── API: STATS ────────────────────────────────────────────────
// Stats: chỉ admin
app.get('/api/stats', requireAdmin, (req, res) => {
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
app.get('/api/orders/export', requireAdmin, (req, res) => {
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
  const { customer_name, customer_phone, customer_email: reqEmail, customer_address,
          product_id, product_name, amount, note } = req.body;
  if (!customer_name || !amount) return res.status(400).json({ error: 'Thiếu thông tin' });

  const order_code = 'DK' + Date.now().toString().slice(-8);

  let customer_id = null;
  let customer_email = null;
  if (customer_phone) {
    const ex = db.prepare('SELECT id, email FROM customers WHERE phone=?').get(customer_phone);
    if (ex) {
      customer_id = ex.id;
      customer_email = ex.email;
      // Cập nhật email/address nếu phật tử chưa có
      if (!ex.email && reqEmail) {
        db.prepare('UPDATE customers SET email=? WHERE id=?').run(reqEmail, customer_id);
        customer_email = reqEmail;
      }
    } else {
      // Auto-tạo phật tử mới khi đặt nghi lễ/công đức
      const r = db.prepare('INSERT INTO customers (name,phone,email,address) VALUES (?,?,?,?)')
        .run(customer_name, customer_phone, reqEmail||'', customer_address||'');
      customer_id = r.lastInsertRowid;
      customer_email = reqEmail || null;
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

app.put('/api/orders/:id', requireAdmin, async (req, res) => {
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

app.delete('/api/orders/:id', requireAdmin, (req, res) => {
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

// ═══════════════════════════════════════════════════════════════
// 🗓️  HỆ THỐNG LỊCH LỄ – PHẬT TỬ (chỉ Admin)
// ═══════════════════════════════════════════════════════════════

// ─── CHUYỂN ĐỔI ÂM LỊCH (Ho Ngoc Duc algorithm) ──────────────
function ll_jdFromDate(dd, mm, yy) {
  let a = Math.floor((14-mm)/12), y = yy+4800-a, m = mm+12*a-3;
  let jd = dd + Math.floor((153*m+2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
  if (jd < 2299161) jd = dd + Math.floor((153*m+2)/5) + 365*y + Math.floor(y/4) - 32083;
  return jd;
}
function ll_newMoon(k, tz) {
  const T=k/1236.85, T2=T*T, T3=T2*T, dr=Math.PI/180;
  let Jd1=2415020.75933+29.53058868*k+0.0001178*T2-0.000000155*T3;
  Jd1+=0.00033*Math.sin((166.56+132.87*T-0.009173*T2)*dr);
  const M=357.5291+35999.0503*T-0.0001559*T2-0.00000048*T3;
  const Mpr=306.0253+385.81691806*k+0.0107306*T2+0.00001236*T3;
  const F=21.2964+390.67050646*k-0.0016528*T2-0.00000239*T3;
  let C1=(0.1734-0.000393*T)*Math.sin(M*dr)+0.0021*Math.sin(2*dr*M)
    -0.4068*Math.sin(Mpr*dr)+0.0161*Math.sin(dr*2*Mpr)-0.0004*Math.sin(dr*3*Mpr)
    +0.0104*Math.sin(dr*2*F)-0.0051*Math.sin(dr*(M+Mpr))
    -0.0074*Math.sin(dr*(M-Mpr))+0.0004*Math.sin(dr*(2*F+M))
    -0.0004*Math.sin(dr*(2*F-M))-0.0006*Math.sin(dr*(2*F+Mpr))
    +0.0010*Math.sin(dr*(2*F-Mpr))+0.0005*Math.sin(dr*(2*Mpr+M));
  const dt=T<-11?0.001+0.000839*T+0.0002261*T2-0.00000845*T3-0.000000081*T*T3
    :-0.000278+0.000265*T+0.000262*T2;
  return Math.floor(Jd1+C1-dt+0.5+tz/24);
}
function ll_sunLong(jdn, tz) {
  const T=(jdn-2451545.5-tz/24)/36525, T2=T*T, dr=Math.PI/180;
  const M=357.5291+35999.0503*T-0.0001559*T2-0.00000048*T*T2;
  const L0=280.46645+36000.76983*T+0.0003032*T2;
  let DL=(1.9146-0.004817*T-0.000014*T2)*Math.sin(dr*M)+(0.019993-0.000101*T)*Math.sin(dr*2*M)+0.00029*Math.sin(dr*3*M);
  let L=(L0+DL)*dr; L-=Math.PI*2*Math.floor(L/(Math.PI*2));
  return Math.floor(L/Math.PI*6);
}
function ll_month11(yy, tz) {
  const off=ll_jdFromDate(31,12,yy)-2415021;
  const k=Math.floor(off/29.530588853);
  let nm=ll_newMoon(k,tz);
  if (ll_sunLong(nm,tz)>=9) nm=ll_newMoon(k-1,tz);
  return nm;
}
function ll_leapOffset(a11, tz) {
  const k=Math.floor((a11-2415021.076998695)/29.530588853+0.5);
  let i=1, last=0, arc=ll_sunLong(ll_newMoon(k+i,tz),tz);
  do { last=arc; i++; arc=ll_sunLong(ll_newMoon(k+i,tz),tz); } while(arc!==last&&i<14);
  return i-1;
}
function solar2Lunar(dd, mm, yy) {
  const tz=7, dayNum=ll_jdFromDate(dd,mm,yy);
  const k=Math.floor((dayNum-2415021.076998695)/29.530588853);
  let ms=ll_newMoon(k+1,tz); if(ms>dayNum) ms=ll_newMoon(k,tz);
  let a11=ll_month11(yy,tz), b11=a11, lunarYear;
  if(a11>=ms){lunarYear=yy;a11=ll_month11(yy-1,tz);}else{lunarYear=yy+1;b11=ll_month11(yy+1,tz);}
  const lunarDay=dayNum-ms+1, diff=Math.floor((ms-a11)/29);
  let leap=false, lunarMonth=diff+11;
  if(b11-a11>365){const lo=ll_leapOffset(a11,tz);if(diff>=lo){lunarMonth=diff+10;if(diff===lo)leap=true;}}
  if(lunarMonth>12)lunarMonth-=12;
  if(lunarMonth>=11&&diff<4)lunarYear--;
  return {ngayAm:lunarDay,thangAm:lunarMonth,namAm:lunarYear,nhuan:leap};
}
function formatLunar(dd, mm, yy) {
  try {
    const {ngayAm,thangAm,namAm,nhuan}=solar2Lunar(dd,mm,yy);
    return `${ngayAm}/${thangAm}${nhuan?' (nhuận)':''}/${namAm}`;
  } catch(e){return '';}
}

// ─── API ÂM LỊCH ──────────────────────────────────────────────
app.get('/api/lunar', requireAdmin, (req,res) => {
  const {dd,mm,yy}=req.query;
  if(!dd||!mm||!yy) return res.json({error:'Thiếu tham số'});
  try {
    const r=solar2Lunar(parseInt(dd),parseInt(mm),parseInt(yy));
    r.formatted=`${r.ngayAm}/${r.thangAm}${r.nhuan?' (nhuận)':''}/${r.namAm}`;
    res.json(r);
  } catch(e){res.json({error:e.message});}
});

// ─── API: PHẬT TỬ (Admin only) ────────────────────────────────
app.get('/api/phat-tu', requireAdmin, (req,res) => {
  res.json(db.prepare('SELECT * FROM phat_tu ORDER BY id DESC').all());
});
app.post('/api/phat-tu', requireAdmin, (req,res) => {
  const {ho_ten,so_dien_thoai,dia_chi}=req.body;
  if(!ho_ten) return res.json({error:'Thiếu họ tên'});
  const r=db.prepare('INSERT INTO phat_tu (ho_ten,so_dien_thoai,dia_chi) VALUES (?,?,?)')
    .run(ho_ten.trim(),so_dien_thoai||'',dia_chi||'');
  res.json({id:r.lastInsertRowid});
});
app.put('/api/phat-tu/:id', requireAdmin, (req,res) => {
  const {ho_ten,so_dien_thoai,dia_chi}=req.body;
  db.prepare('UPDATE phat_tu SET ho_ten=?,so_dien_thoai=?,dia_chi=? WHERE id=?')
    .run(ho_ten,so_dien_thoai||'',dia_chi||'',req.params.id);
  res.json({success:true});
});
app.delete('/api/phat-tu/:id', requireAdmin, (req,res) => {
  db.prepare('DELETE FROM phat_tu WHERE id=?').run(req.params.id);
  res.json({success:true});
});
app.get('/api/phat-tu/tim-kiem', requireAdmin, (req,res) => {
  const q='%'+(req.query.q||'')+'%';
  const rows=db.prepare(`
    SELECT d.*,p.ho_ten,p.so_dien_thoai,p.dia_chi,
           tt.trang_thai as tt_tt,
           l.id as lich_id,l.ngay_duong,l.ngay_am,l.trang_thai as tt_lich
    FROM phat_tu p
    LEFT JOIN don_cong_duc d ON d.phat_tu_id=p.id
    LEFT JOIN thanh_toan_le tt ON tt.don_id=d.id
    LEFT JOIN lich_le l ON l.don_id=d.id
    WHERE p.ho_ten LIKE ? OR p.so_dien_thoai LIKE ? OR p.dia_chi LIKE ?
    ORDER BY d.id DESC LIMIT 100
  `).all(q,q,q);
  res.json(rows);
});
app.get('/api/phat-tu/:id', requireAdmin, (req,res) => {
  const pt=db.prepare('SELECT * FROM phat_tu WHERE id=?').get(req.params.id);
  if(!pt) return res.json({error:'Không tìm thấy'});
  const don=db.prepare(`
    SELECT d.*,tt.trang_thai as tt_tt,l.id as lich_id,l.ngay_duong,l.ngay_am,l.trang_thai as tt_lich
    FROM don_cong_duc d
    LEFT JOIN thanh_toan_le tt ON tt.don_id=d.id
    LEFT JOIN lich_le l ON l.don_id=d.id
    WHERE d.phat_tu_id=? ORDER BY d.id DESC
  `).all(req.params.id);
  res.json({...pt,don});
});

// ─── API: ĐƠN CÔNG ĐỨC (Admin only) ─────────────────────────
app.get('/api/don-cong-duc', requireAdmin, (req,res) => {
  const {trang_thai}=req.query;
  let where='', args=[];
  if(trang_thai&&trang_thai!=='all'){where='WHERE l.trang_thai=?';args.push(trang_thai);}
  const rows=db.prepare(`
    SELECT d.*,p.ho_ten,p.so_dien_thoai,p.dia_chi,
           tt.trang_thai as tt_tt,
           l.id as lich_id,l.ngay_duong,l.ngay_am,l.trang_thai as tt_lich
    FROM don_cong_duc d
    LEFT JOIN phat_tu p ON p.id=d.phat_tu_id
    LEFT JOIN thanh_toan_le tt ON tt.don_id=d.id
    LEFT JOIN lich_le l ON l.don_id=d.id
    ${where} ORDER BY d.id DESC LIMIT 500
  `).all(...args);
  res.json(rows);
});
app.post('/api/don-cong-duc', requireAdmin, (req,res) => {
  const {phat_tu_id,dich_vu,noi_dung_cau_nguyen,so_tien}=req.body;
  if(!phat_tu_id) return res.json({error:'Thiếu phật tử'});
  const r=db.prepare('INSERT INTO don_cong_duc (phat_tu_id,dich_vu,noi_dung_cau_nguyen,so_tien) VALUES (?,?,?,?)')
    .run(phat_tu_id,dich_vu||'',noi_dung_cau_nguyen||'',so_tien||0);
  db.prepare('INSERT INTO thanh_toan_le (don_id) VALUES (?)').run(r.lastInsertRowid);
  db.prepare('INSERT INTO lich_le (don_id) VALUES (?)').run(r.lastInsertRowid);
  res.json({id:r.lastInsertRowid});
});
app.put('/api/don-cong-duc/:id', requireAdmin, (req,res) => {
  const {dich_vu,noi_dung_cau_nguyen,so_tien}=req.body;
  db.prepare('UPDATE don_cong_duc SET dich_vu=?,noi_dung_cau_nguyen=?,so_tien=? WHERE id=?')
    .run(dich_vu||'',noi_dung_cau_nguyen||'',so_tien||0,req.params.id);
  res.json({success:true});
});
app.delete('/api/don-cong-duc/:id', requireAdmin, (req,res) => {
  const id=req.params.id;
  db.prepare('DELETE FROM lich_su_sua WHERE don_id=?').run(id);
  db.prepare('DELETE FROM lich_le WHERE don_id=?').run(id);
  db.prepare('DELETE FROM thanh_toan_le WHERE don_id=?').run(id);
  db.prepare('DELETE FROM don_cong_duc WHERE id=?').run(id);
  res.json({success:true});
});

// ─── API: THANH TOÁN LỄ ───────────────────────────────────────
app.post('/api/don-cong-duc/:id/thanh-toan', requireAdmin, (req,res) => {
  const {trang_thai}=req.body;
  db.prepare("UPDATE thanh_toan_le SET trang_thai=?,thoi_gian=datetime('now','localtime') WHERE don_id=?")
    .run(trang_thai||'da_chuyen',req.params.id);
  res.json({success:true});
});

// ─── API: ĐẶT LỊCH / SỬA LỊCH ───────────────────────────────
app.post('/api/don-cong-duc/:id/dat-lich', requireAdmin, (req,res) => {
  const {ngay_duong}=req.body;
  if(!ngay_duong) return res.json({error:'Thiếu ngày'});
  const [yy,mm,dd]=ngay_duong.split('-').map(Number);
  const ngay_am=formatLunar(dd,mm,yy);
  db.prepare("UPDATE lich_le SET ngay_duong=?,ngay_am=?,trang_thai='da_hen',updated_at=datetime('now','localtime') WHERE don_id=?")
    .run(ngay_duong,ngay_am,req.params.id);
  res.json({success:true,ngay_am});
});
app.put('/api/lich-le/:id', requireAdmin, (req,res) => {
  const {ngay_duong}=req.body;
  if(!ngay_duong) return res.json({error:'Thiếu ngày'});
  const old=db.prepare('SELECT ngay_duong,don_id FROM lich_le WHERE id=?').get(req.params.id);
  const [yy,mm,dd]=ngay_duong.split('-').map(Number);
  const ngay_am=formatLunar(dd,mm,yy);
  db.prepare("UPDATE lich_le SET ngay_duong=?,ngay_am=?,trang_thai='da_xin_doi_lich',updated_at=datetime('now','localtime') WHERE id=?")
    .run(ngay_duong,ngay_am,req.params.id);
  if(old) db.prepare('INSERT INTO lich_su_sua (don_id,ngay_cu,ngay_moi) VALUES (?,?,?)').run(old.don_id,old.ngay_duong,ngay_duong);
  res.json({success:true,ngay_am});
});
app.post('/api/lich-le/:id/hoan-thanh', requireAdmin, (req,res) => {
  db.prepare("UPDATE lich_le SET trang_thai='da_hoan_thanh',updated_at=datetime('now','localtime') WHERE id=?").run(req.params.id);
  res.json({success:true});
});

// ─── API: CALENDAR LỊCH LỄ ───────────────────────────────────
app.get('/api/lich-le/calendar', requireAdmin, (req,res) => {
  const {month,year}=req.query;
  if(!month||!year) return res.json({error:'Thiếu tháng/năm'});
  const from=`${year}-${String(month).padStart(2,'0')}-01`;
  const to  =`${year}-${String(month).padStart(2,'0')}-31`;
  const rows=db.prepare(`
    SELECT l.*,d.dich_vu,d.noi_dung_cau_nguyen,d.so_tien,
           p.ho_ten,p.so_dien_thoai,p.dia_chi,d.id as don_id
    FROM lich_le l
    LEFT JOIN don_cong_duc d ON d.id=l.don_id
    LEFT JOIN phat_tu p ON p.id=d.phat_tu_id
    WHERE l.ngay_duong>=? AND l.ngay_duong<=?
    ORDER BY l.ngay_duong ASC
  `).all(from,to);
  res.json(rows);
});

// ─── API: TÌM KIẾM PHẬT TỬ ───────────────────────────────────
app.get('/api/phat-tu/search', requireAdmin, (req,res) => {
  const q='%'+(req.query.q||'')+'%';
  const rows=db.prepare(`
    SELECT d.*,p.ho_ten,p.so_dien_thoai,p.dia_chi,
           tt.trang_thai as tt_tt,
           l.id as lich_id,l.ngay_duong,l.ngay_am,l.trang_thai as tt_lich
    FROM phat_tu p
    LEFT JOIN don_cong_duc d ON d.phat_tu_id=p.id
    LEFT JOIN thanh_toan_le tt ON tt.don_id=d.id
    LEFT JOIN lich_le l ON l.don_id=d.id
    WHERE p.ho_ten LIKE ? OR p.so_dien_thoai LIKE ? OR p.dia_chi LIKE ?
    ORDER BY d.id DESC LIMIT 100
  `).all(q,q,q);
  res.json(rows);
});

// ─── API: STATS LỊCH LỄ ──────────────────────────────────────
app.get('/api/lich-le/stats', requireAdmin, (req,res) => {
  const today=new Date().toISOString().slice(0,10);
  const soon =new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const thisYear=new Date().getFullYear();
  res.json({
    chuaHen: db.prepare("SELECT COUNT(*) as c FROM lich_le WHERE trang_thai='chua_hen'").get().c,
    sapDen:  db.prepare("SELECT COUNT(*) as c FROM lich_le WHERE trang_thai IN ('da_hen','da_xin_doi_lich') AND ngay_duong>=? AND ngay_duong<=?").get(today,soon).c,
    tongDon: db.prepare("SELECT COUNT(*) as c FROM don_cong_duc").get().c,
    tongPhatTu: db.prepare("SELECT COUNT(*) as c FROM phat_tu").get().c,
    tongTienLe: db.prepare("SELECT COALESCE(SUM(d.so_tien),0) as s FROM don_cong_duc d INNER JOIN thanh_toan_le t ON t.don_id=d.id WHERE t.trang_thai='da_chuyen'").get().s,
  });
});

// ─── API: COPY ────────────────────────────────────────────────
app.get('/api/copy-don/:id', requireAdmin, (req,res) => {
  const row=db.prepare(`
    SELECT d.*,p.ho_ten,p.so_dien_thoai,p.dia_chi,l.ngay_am
    FROM don_cong_duc d
    LEFT JOIN phat_tu p ON p.id=d.phat_tu_id
    LEFT JOIN lich_le l ON l.don_id=d.id
    WHERE d.id=?
  `).get(req.params.id);
  if(!row) return res.json({error:'Không tìm thấy'});
  const text=`Họ tên: ${row.ho_ten}\nSĐT: ${row.so_dien_thoai||''}\nĐịa chỉ: ${row.dia_chi||''}\nDịch vụ: ${row.dich_vu||''}\nNội dung: ${row.noi_dung_cau_nguyen||''}\nNgày lễ (âm): ${row.ngay_am||'Chưa đặt lịch'}`;
  res.json({text});
});
app.get('/api/copy-nhom/:trang_thai', requireAdmin, (req,res) => {
  const rows=db.prepare(`
    SELECT p.ho_ten,p.so_dien_thoai,d.dich_vu,l.ngay_am
    FROM lich_le l
    LEFT JOIN don_cong_duc d ON d.id=l.don_id
    LEFT JOIN phat_tu p ON p.id=d.phat_tu_id
    WHERE l.trang_thai=? ORDER BY l.ngay_duong ASC
  `).all(req.params.trang_thai);
  const labels={chua_hen:'CHƯA HẸN',da_hen:'ĐÃ HẸN',da_xin_doi_lich:'ĐÃ ĐỔI LỊCH',da_hoan_thanh:'ĐÃ HOÀN THÀNH'};
  const text=rows.length?`=== ${labels[req.params.trang_thai]||''} ===\n\n`+rows.map((r,i)=>`${i+1}. ${r.ho_ten} | SĐT: ${r.so_dien_thoai||''} | ${r.dich_vu||''} | Ngày âm: ${r.ngay_am||'Chưa đặt'}`).join('\n')
    :`=== ${labels[req.params.trang_thai]||''} ===\n(Không có)`;
  res.json({text});
});
app.get('/api/copy-tat-ca', requireAdmin, (req,res) => {
  const daHen=db.prepare(`SELECT p.ho_ten,p.so_dien_thoai,d.dich_vu,l.ngay_am FROM lich_le l LEFT JOIN don_cong_duc d ON d.id=l.don_id LEFT JOIN phat_tu p ON p.id=d.phat_tu_id WHERE l.trang_thai IN ('da_hen','da_xin_doi_lich') ORDER BY l.ngay_duong ASC`).all();
  const chuaHen=db.prepare(`SELECT p.ho_ten,p.so_dien_thoai,d.dich_vu,l.ngay_am FROM lich_le l LEFT JOIN don_cong_duc d ON d.id=l.don_id LEFT JOIN phat_tu p ON p.id=d.phat_tu_id WHERE l.trang_thai='chua_hen' ORDER BY d.id ASC`).all();
  const fmt=(label,rows)=>rows.length?`=== ${label} ===\n\n`+rows.map((r,i)=>`${i+1}. ${r.ho_ten} | SĐT: ${r.so_dien_thoai||''} | ${r.dich_vu||''} | Ngày âm: ${r.ngay_am||'Chưa đặt'}`).join('\n'):`=== ${label} ===\n(Không có)`;
  res.json({text:fmt('DANH SÁCH ĐÃ HẸN',daHen)+'\n\n'+'─'.repeat(40)+'\n\n'+fmt('CHƯA HẸN',chuaHen)});
});

// ─── API: LỊCH SỬ SỬA ────────────────────────────────────────
app.get('/api/lich-su-sua/:don_id', requireAdmin, (req,res) => {
  res.json(db.prepare('SELECT * FROM lich_su_sua WHERE don_id=? ORDER BY id DESC').all(req.params.don_id));
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
