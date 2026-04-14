/**
 * ╔══════════════════════════════════════════════════════╗
 * ║         TEMPLE CONFIG – Chùa Đại Khánh               ║
 * ║  Sửa file này để thay đổi nội dung trang web chùa    ║
 * ║  Không cần biết lập trình – chỉ cần thay text/số     ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * HƯỚNG DẪN:
 *  1. Mỗi chùa mới → copy file này → đổi nội dung bên dưới
 *  2. Ảnh: đặt vào thư mục /images/, đổi tên trong mảng heroImages / gallery
 *  3. Chạy lại server là xong
 */

const TEMPLE = {

  // ══════════════════════════════════════════════
  // 🏛️  THÔNG TIN CHÙA
  // ══════════════════════════════════════════════
  name:       'Chùa Đại Khánh',         // Tên đầy đủ (hiển thị trên header, title)
  shortName:  'Đại Khánh',              // Tên ngắn (dùng trong câu văn)
  emoji:      '☸',                      // Biểu tượng logo (☸ ☯ 🪷 🏛️)
  slogan:     'Nơi tâm linh hội tụ · Đất lành Phật ngự',
  subSlogan:  'Khói nhang trầm mặc bay lên như lời cầu nguyện gửi về chư Phật',

  // ══════════════════════════════════════════════
  // 📍  ĐỊA CHỈ & LIÊN HỆ
  // ══════════════════════════════════════════════
  location:   'Thôn Trừng Xá, xã Trung Chính, tỉnh Bắc Ninh',
  address:    'Thôn Trừng Xá, xã Trung Chính, huyện Lương Tài, tỉnh Bắc Ninh',
  phone:      '0974 556 898',
  phoneRaw:   '0974556898',
  email:      'chuadaikhanh@gmail.com',
  hours:      'Hàng ngày: 06:00 – 18:00',
  mapLink:    'https://maps.google.com/?q=Chùa+Đại+Khánh+Bắc+Ninh',
  fanpage:    '',                        // Link Facebook fanpage (để '' nếu không có)
  youtube:    '',                        // Link YouTube (để '' nếu không có)

  // ══════════════════════════════════════════════
  // 👨‍⚖️  TRỤ TRÌ
  // ══════════════════════════════════════════════
  abbot: {
    name:  'Đại đức Thích Trung Chinh',
    title: 'Trụ trì – Chùa Đại Khánh',
    bio:   'Đại đức trụ trì với tâm nguyện hoằng dương Phật pháp, phục vụ cộng đồng phật tử địa phương và xa quê.'
  },

  // ══════════════════════════════════════════════
  // 📖  CÂU CHUYỆN CHÙA (Lời ngỏ & Giới thiệu)
  // ══════════════════════════════════════════════
  hero: {
    title:    'Chùa Đại Khánh',
    subtitle: 'Nơi tâm linh hội tụ · Đất lành Phật ngự',
    badge:    '📍 Thôn Trừng Xá, xã Trung Chính, Bắc Ninh',
    cta:      'Dâng hương & Cầu nguyện',
  },

  welcome: {
    label:  'Lời ngỏ',
    title:  'Cửa Phật luôn rộng mở',
    paragraphs: [
      'Chùa Đại Khánh – nơi ngọn khói hương trầm mặc bay lên như lời cầu nguyện của bao thế hệ người con đất Kinh Bắc. Nơi đây không chỉ là chốn linh thiêng mà còn là ngôi nhà tâm linh của mọi phật tử, dù ở gần hay người con xa quê.',
      'Tiếng chuông chùa ngân vang mỗi sáng sớm như một lời nhắc nhở nhẹ nhàng: giữa cuộc đời bộn bề, vẫn luôn có một nơi để trở về — nơi tâm hồn được tĩnh lặng, phiền não được buông bỏ, và tình thương được nuôi dưỡng.',
      'Chúng tôi trân trọng mời quý phật tử — dù ở bất kỳ nơi nào trên đất nước hay hải ngoại — cùng dâng một nén hương, gửi một lời nguyện, để chư Phật và chư Bồ Tát gia hộ cho gia đình được bình an, cát tường, vạn sự như ý.',
    ],
    signature: '🙏 Kính cẩn',
    signatureName: 'Ban trị sự Chùa Đại Khánh'
  },

  story: {
    label:   'Giới thiệu',
    title:   'Tinh thần Phật giáo tại Đại Khánh',
    intro:   'Chùa Đại Khánh là ngôi cổ tự mang đậm nét văn hóa Phật giáo vùng Kinh Bắc, nơi lưu giữ những giá trị tâm linh và văn hóa truyền thống qua nhiều thế kỷ.',
    features: [
      { icon: '🕯️', title: 'Từ bi – Trí tuệ',   desc: 'Mọi nghi lễ tại chùa đều xuất phát từ lòng từ bi và ánh sáng trí tuệ Phật pháp.' },
      { icon: '🌸', title: 'Tâm an – Gia hòa',   desc: 'Khi tâm người an, gia đình hòa thuận, xã hội tự nhiên thái bình.' },
      { icon: '🪷', title: 'Cộng đồng – Kết nối', desc: 'Gắn kết người con xa quê với quê hương, gốc rễ và đạo pháp.' },
      { icon: '📿', title: 'Truyền thừa – Bền vững', desc: 'Giữ gìn và trao truyền các nghi lễ, kinh kệ cổ truyền cho thế hệ sau.' },
    ]
  },

  // ══════════════════════════════════════════════
  // 📜  KINH TRÍCH DẪN (3–5 câu, chọn câu đặc trưng)
  // ══════════════════════════════════════════════
  quotes: [
    {
      text:   'Tâm bình thì thế giới bình. Tâm thanh tịnh thì cõi Phật hiện tiền.',
      source: 'Kinh Duy Ma Cật',
      style:  'crimson',   // crimson | gold | ink
    },
    {
      text:   'Tiếng chuông chùa ngân — là lời nhắn của vô thường. Hãy sống trọn vẹn trong từng khoảnh khắc hiện tại.',
      source: 'Thiền ngữ Phật giáo',
      style:  'gold',
    },
    {
      text:   'Không phải vàng bạc mà chính lòng thành tâm của người con Phật mới là công đức vô lượng.',
      source: 'Kinh Địa Tạng Bồ Tát Bổn Nguyện',
      style:  'ink',
    },
    {
      text:   'Người con xa quê không bao giờ mất gốc — vì trong tim họ vẫn có hương khói tổ tiên và tiếng chuông chùa làng.',
      source: 'Lời chùa Đại Khánh',
      style:  'crimson',
    },
  ],

  // ══════════════════════════════════════════════
  // 🙏  NGHI LỄ (các dịch vụ chùa cung cấp)
  // ══════════════════════════════════════════════
  services: [
    {
      icon:        '🌸',
      name:        'Dâng sớ cầu an',
      description: 'Dâng sớ cầu bình an, sức khỏe, công danh cho bản thân và gia đình. Thực hiện trang nghiêm hàng ngày.',
      price:       'Tùy tâm phật tử',
      highlight:   true,
    },
    {
      icon:        '🕯️',
      name:        'Lễ cầu siêu',
      description: 'Cầu siêu cho hương linh người thân đã khuất, hồi hướng công đức để vong linh sớm được siêu thoát.',
      price:       'Tùy tâm phật tử',
      highlight:   false,
    },
    {
      icon:        '👶',
      name:        'Lễ bán khoán',
      description: 'Cầu bình an, khỏe mạnh cho trẻ nhỏ, cầu trẻ hay ăn chóng lớn, thông minh học giỏi.',
      price:       'Tùy tâm phật tử',
      highlight:   false,
    },
    {
      icon:        '🏠',
      name:        'Cầu an gia trạch',
      description: 'Cầu an cho ngôi nhà mới, tránh tà khí, gia đình hòa thuận, công việc thuận lợi.',
      price:       'Tùy tâm phật tử',
      highlight:   false,
    },
    {
      icon:        '📿',
      name:        'Các nghi lễ khác',
      description: 'Tiếp nhận các nghi lễ theo yêu cầu riêng của phật tử. Liên hệ trực tiếp với chùa để được tư vấn.',
      price:       'Theo thỏa thuận',
      highlight:   false,
    },
  ],

  // ══════════════════════════════════════════════
  // 🎎  NGÀY GIỖ TỔ (lễ lớn nhất trong năm)
  // ══════════════════════════════════════════════
  gioTo: {
    // Ngày âm lịch cố định hàng năm
    ngayAm:     15,     // Ngày âm (1-30)
    thangAm:    1,      // Tháng âm (1-12)

    // Tên đầy đủ lễ
    ten:     'Lễ Giỗ Tổ Chùa Đại Khánh',

    // Mô tả hiển thị trên website
    moTa:    'Ngày giỗ tổ khai sơn – Đại lễ quan trọng nhất trong năm của Chùa Đại Khánh, được tổ chức trang nghiêm vào ngày 15 tháng Giêng âm lịch hàng năm.',

    // Số ngày tổ chức (trước + trong ngày)
    soNgay:  3,         // VD: 3 = lễ kéo dài 3 ngày

    // Chương trình
    chuongTrinh: [
      'Lễ khai kinh – Tụng kinh cầu quốc thái dân an',
      'Lễ dâng hương tưởng niệm chư vị khai sơn',
      'Pháp hội – Thuyết giảng Phật pháp',
      'Đại lễ dâng sớ cầu an cho toàn thể phật tử',
    ],

    // Thông báo tự động (server sẽ gửi email nhắc trước X ngày)
    nhacTruocNgay: 7,
  },

  // ══════════════════════════════════════════════
  // 📅  CÁC NGÀY LỄ PHẬT GIÁO TRONG NĂM
  // ══════════════════════════════════════════════
  ngayLe: [
    { ten: 'Tết Nguyên Đán',          ngayAm: 1,  thangAm: 1  },
    { ten: 'Rằm tháng Giêng',         ngayAm: 15, thangAm: 1  },
    { ten: 'Phật Đản',                ngayAm: 15, thangAm: 4  },
    { ten: 'Lễ Vu Lan – Xá tội vong nhân', ngayAm: 15, thangAm: 7 },
    { ten: 'Rằm tháng 8',             ngayAm: 15, thangAm: 8  },
    { ten: 'Lễ Thành Đạo',            ngayAm: 8,  thangAm: 12 },
    { ten: 'Giỗ Tổ Chùa Đại Khánh',   ngayAm: 15, thangAm: 1, isGioTo: true },
  ],

  // ══════════════════════════════════════════════
  // 🎨  MÀU SẮC (tùy chỉnh nhẹ theo từng chùa)
  // ══════════════════════════════════════════════
  theme: {
    crimson:     '#7a0c1e',   // Màu đỏ chủ đạo
    crimsonDark: '#500a14',   // Màu đỏ đậm
    gold:        '#c9921f',   // Màu vàng chính
    goldLight:   '#e8b84b',   // Màu vàng sáng
    cream:       '#faf5ea',   // Màu nền kem
  },

  // ══════════════════════════════════════════════
  // 🖼️  ẢNH (đặt file vào thư mục /images/)
  // ══════════════════════════════════════════════
  images: {
    // Ảnh slider trang chủ (3-5 ảnh, tỉ lệ 16:9)
    hero: [
      '/images/hero-1.jpg',
      '/images/hero-2.jpg',
      '/images/hero-3.jpg',
    ],
    // Ảnh gallery (tùy số lượng)
    gallery: [
      '/images/gallery-1.jpg',
      '/images/gallery-2.jpg',
      '/images/gallery-3.jpg',
      '/images/gallery-4.jpg',
      '/images/gallery-5.jpg',
      '/images/gallery-6.jpg',
    ],
    // Ảnh trụ trì (để '' nếu không có)
    abbot: '/images/abbot.jpg',
    // Ảnh logo (để '' để dùng emoji mặc định)
    logo: '',
  },

  // ══════════════════════════════════════════════
  // 💳  NGÂN HÀNG (thanh toán công đức)
  // ══════════════════════════════════════════════
  bank: {
    // Ngân hàng chính (tích hợp Sepay auto-confirm)
    primary: {
      name:          'VietinBank',
      id:            'vietinbank',       // Bank ID cho VietQR
      accountNumber: '102506196666',
      accountName:   'NGUYEN MINH HIEU',
      description:   'Chuyển khoản công đức tự động',
    },
    // Ngân hàng phụ (xác nhận thủ công)
    secondary: {
      name:          'Agribank',
      id:            'agribank',
      accountNumber: '2608205306753',
      accountName:   'NGUYEN THI BAC',
      description:   'Sư Trụ Trì – Chùa Đại Khánh',
    }
  },

  // ══════════════════════════════════════════════
  // 🔧  CẤU HÌNH HỆ THỐNG (admin)
  // ══════════════════════════════════════════════
  system: {
    // Domain website
    domain: 'chuadaikhanh-trungchinh-bn.com.vn',
    // Năm thành lập (hiển thị footer)
    foundedYear: '2024',
    // Copyright
    copyright: '© 2025 Chùa Đại Khánh · Thôn Trừng Xá, xã Trung Chính, Bắc Ninh',
  }

};

// Export cho Node.js (server.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TEMPLE;
}
