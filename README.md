# 🏛️ Chùa Đại Khánh – Website

Website quản lý chùa: trang chủ, công đức online, admin panel quản lý phật tử & nghi lễ.

## Deploy nhanh (5 bước)

### 1. Clone & cài đặt
```bash
git clone https://github.com/hieupeo999/pagoda2.git
cd pagoda2
npm install
```

### 2. Cấu hình chùa
Sửa file `temple-config.js` — đổi tên chùa, địa chỉ, SĐT, ngân hàng, ngày giỗ tổ.

### 3. Chạy local
```bash
node server.js
# Mở http://localhost:3000
# Admin: http://localhost:3000/admin
```

### 4. Deploy Railway
1. Push lên GitHub
2. Railway → New Project → Deploy from GitHub
3. Set Environment Variables:

| Biến | Giá trị |
|------|---------|
| `RESEND_API_KEY` | `re_xxx` (từ resend.com) |
| `GMAIL_PASS` | App Password Gmail 16 ký tự |
| `SITE_URL` | `https://domain.com.vn` |
| `ADMIN_USER` | Tên đăng nhập admin |
| `ADMIN_PASS` | Mật khẩu admin (đặt mạnh) |
| `ADMIN_EMAIL` | Email nhận thông báo |

### 5. DNS (123host)
```
A     @    → Railway IP
CNAME www  → xxx.up.railway.app
```
Thêm 3 record Resend (DKIM + MX + SPF) — xem TEMPLATE_NOTES.md.

## Tài khoản admin mặc định
- Username: `admindchua` (hoặc giá trị ADMIN_USER)
- Password: giá trị ADMIN_PASS trong env vars

**Đổi mật khẩu ngay sau khi deploy** tại Admin → Tab Bảo mật.

## Tính năng
- Trang chủ đẹp, mobile-friendly, slider ảnh
- Trang công đức: form đặt nghi lễ + QR VietQR + webhook Sepay tự động xác nhận
- Admin panel (mobile-friendly):
  - Dashboard thống kê
  - Quản lý nghi lễ (CRUD)
  - Quản lý phật tử (CRUD, auto-tạo khi đặt online)
  - Quản lý đơn hàng + xác nhận thanh toán
  - Lịch lễ + âm lịch tự động
  - Bảo mật: đổi mật khẩu
- Email tự động (Resend): welcome, nhắc lịch, xác nhận đơn
- Xuất CSV danh sách phật tử

## Cấu trúc file
```
server.js          # Backend (Node.js + Express + SQLite)
temple-config.js   # Config riêng từng chùa ← SỬA FILE NÀY
index.html         # Trang chủ
thanh-toan.html    # Trang công đức
admin.html         # Admin panel
admin-login.html   # Trang đăng nhập
TEMPLATE_NOTES.md  # Hướng dẫn kỹ thuật đầy đủ
deploy_checklist.md
```
