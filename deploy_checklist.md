# Deploy Checklist – Chùa Đại Khánh

## CODE & BẢO MẬT
- [x] Không có mật khẩu/API key hardcode trong code (dùng process.env)
- [x] brain.db trong .gitignore (không push DB lên GitHub)
- [x] node_modules trong .gitignore
- [x] .env trong .gitignore
- [x] adm_test=x trong .gitignore
- [x] ADMIN_USER, ADMIN_PASS, ADMIN_EMAIL đọc từ env vars
- [x] requireAdmin bảo vệ đúng tất cả routes nhạy cảm
- [x] POST /api/customers yêu cầu admin (thêm thủ công)
- [x] GET /api/orders, stats, export yêu cầu admin

## RAILWAY
- [ ] Tạo project Railway → link GitHub repo
- [ ] Set env vars:
  - [ ] RESEND_API_KEY = re_xxx
  - [ ] GMAIL_PASS = xxxx xxxx xxxx xxxx
  - [ ] SITE_URL = https://domain.com.vn
  - [ ] ADMIN_USER = (tên đăng nhập admin)
  - [ ] ADMIN_PASS = (mật khẩu mạnh)
  - [ ] ADMIN_EMAIL = (email nhận thông báo)
- [ ] Add custom domain: domain.com.vn
- [ ] Add custom domain: www.domain.com.vn (riêng)

## DNS (123host)
- [ ] A record @ → Railway IP
- [ ] CNAME www → xxx.up.railway.app
- [ ] TXT resend._domainkey → DKIM value (từ Resend dashboard)
- [ ] MX send → feedback-smtp.ap-northeast-1.amazonses.com (priority 10)
- [ ] TXT send → v=spf1 include:amazonses.com ~all

## TEMPLE-CONFIG.JS
- [ ] Tên chùa, slogan, địa chỉ đã đúng
- [ ] SĐT, email chùa đã đúng
- [ ] Thông tin trụ trì đã đúng
- [ ] Ngân hàng: số tài khoản, tên chủ TK đã đúng
- [ ] Ngày giỗ tổ (ngayAm, thangAm) đã đúng
- [ ] Domain trong system.domain đã đúng

## TEST TRƯỚC KHI LIVE
- [ ] Trang chủ load đúng trên điện thoại
- [ ] Hamburger menu mở/đóng, nút Admin + Công đức hiện đủ
- [ ] Form công đức điền được + hiện QR
- [ ] Đặt nghi lễ → phật tử tự tạo trong DB
- [ ] Admin đăng nhập được
- [ ] Admin: thêm/sửa/xóa nghi lễ không cần F5
- [ ] Admin: thêm/sửa/xóa phật tử không cần F5
- [ ] Admin: xem/xác nhận đơn hàng không cần F5
- [ ] Test trên điện thoại: toàn bộ admin panel dùng được
- [ ] Webhook Sepay: chuyển khoản đúng mã → đơn chuyển success
- [ ] Email auto gửi khi có đơn mới (nếu có RESEND_API_KEY)
