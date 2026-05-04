const mysql = require('mysql2/promise');
require('dotenv').config();

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const SPEC_LABEL_MAP = {
  Hang: 'Hãng',
  Bao_hanh: 'Bảo hành',
  Xuat_xu: 'Xuất xứ',
  Tinh_trang: 'Tình trạng',
  O_cung: 'Ổ cứng',
  Man_hinh: 'Màn hình',
  Ket_noi: 'Kết nối',
  Trong_luong: 'Trọng lượng',
  He_dieu_hanh: 'Hệ điều hành',
  Do_phan_giai: 'Độ phân giải',
  So_nut_bam: 'Số nút bấm',
  Ban_phim: 'Bàn phím',
  Kich_thuoc: 'Kích thước',
  Chuan_ket_noi: 'Chuẩn kết nối',
  Toc_do_doc: 'Tốc độ đọc',
  Toc_do_ghi: 'Tốc độ ghi',
  Dien_ap: 'Điện áp',
  Loai_RAM: 'Loại RAM',
  Bus_RAM: 'Bus RAM',
  Tan_so_quet: 'Tần số quét',
  Cong_nghe_NAND: 'Công nghệ NAND',
  Ho_tro: 'Hỗ trợ',
  Tan_nhiet: 'Tản nhiệt',
  Toc_do_khung_hinh: 'Tốc độ khung hình',
  Goc_nhin: 'Góc nhìn',
  Ung_dung: 'Ứng dụng',
  Loai_loa: 'Loại loa',
  Cong_suat: 'Công suất',
  Tan_so_dap_ung: 'Tần số đáp ứng',
  Dieu_khien: 'Điều khiển',
  Tuong_thich: 'Tương thích',
  Chat_lieu: 'Chất liệu',
  Cong_suat_ho_tro: 'Công suất hỗ trợ',
  Cong_ket_noi: 'Cổng kết nối',
  Tinh_nang: 'Tính năng',
  Luu_y: 'Lưu ý',
};

const VN_REPLACEMENTS = [
  [/\bChuot\b/g, 'Chuột'],
  [/\bkhong\b/g, 'không'],
  [/\bBan phim\b/g, 'Bàn phím'],
  [/\bco\b/g, 'cơ'],
  [/\bMan hinh\b/g, 'Màn hình'],
  [/\bBo ban phim chuot\b/g, 'Bộ bàn phím chuột'],
  [/\bHub chuyen doi\b/g, 'Hub chuyển đổi'],
  [/\bDe tan nhiet\b/g, 'Đế tản nhiệt'],
  [/\bSac\b/g, 'Sạc'],
  [/\bdau tron\b/g, 'đầu tròn'],
  [/\bDich vu\b/g, 'Dịch vụ'],
  [/\bChinh hang\b/g, 'Chính hãng'],
  [/\bthang\b/g, 'tháng'],
  [/\bTrung Quoc\b/g, 'Trung Quốc'],
  [/\bMoi 100%\b/g, 'Mới 100%'],
  [/\bHieu nang on dinh\b/g, 'Hiệu năng ổn định'],
  [/\bKhoang\b/g, 'Khoảng'],
  [/\bKhong day\b/g, 'Không dây'],
  [/\bDo ben cao\b/g, 'Độ bền cao'],
  [/\bro rang\b/g, 'rõ ràng'],
  [/\bTich hop\b/g, 'Tích hợp'],
  [/\bHo tro\b/g, 'Hỗ trợ'],
  [/\bmot so\b/g, 'một số'],
  [/\bgio\b/g, 'giờ'],
  [/\bdo\b/g, 'độ'],
  [
    /\bla san pham phu hop cho nhu cau hoc tap, lam viec va giai tri hang ngay\.\b/g,
    'là sản phẩm phù hợp cho nhu cầu học tập, làm việc và giải trí hằng ngày.',
  ],
  [/\bThong tin noi bat\b/g, 'Thông tin nổi bật'],
  [
    /\bSan pham duoc toan bo thong tin ky thuat day du, giup de dang so sanh va lua chon theo nhu cau thuc te\.\b/g,
    'Sản phẩm được mô tả thông tin kỹ thuật đầy đủ, giúp dễ dàng so sánh và lựa chọn theo nhu cầu thực tế.',
  ],
  [/\bnhua\b/g, 'nhựa'],
  [/\bkim loai\b/g, 'kim loại'],
  [/\bneu co\b/g, 'nếu có'],
  [/\bTien loi\b/g, 'Tiện lợi'],
  [/\bOn dinh\b/g, 'Ổn định'],
  [/\bda nhiem\b/g, 'đa nhiệm'],
  [/\bnhac\b/g, 'nhạc'],
  [/\bviet\b/g, 'viết'],
  [/\bvien mong\b/g, 'viền mỏng'],
  [/\bco the nang ha\b/g, 'có thể nâng hạ'],
  [/\bHoc tap\b/g, 'Học tập'],
  [/\bxem phim\b/g, 'xem phim'],
  [/\bnghe nhac\b/g, 'nghe nhạc'],
  [/\bDa thiet bi\b/g, 'Đa thiết bị'],
  [/\bPhu kien laptop\b/g, 'Phụ kiện laptop'],
  [/\bTien loi cho hoc tap va lam viec\b/g, 'Tiện lợi cho học tập và làm việc'],
  [/\bKhong\b/g, 'Không'],
  [/\bOn\b/g, 'Ổn'],
  [/\bDo\b/g, 'Độ'],
];

function toVietnameseText(text) {
  return VN_REPLACEMENTS.reduce((result, [pattern, replacement]) => {
    return result.replace(pattern, replacement);
  }, text);
}

function normalizeSpecsForStorage(specs) {
  const normalized = {};

  for (const [key, value] of Object.entries(specs)) {
    const displayKey =
      SPEC_LABEL_MAP[key] || toVietnameseText(key.replace(/_/g, ' '));
    normalized[displayKey] = toVietnameseText(String(value));
  }

  return normalized;
}

function buildShortDescription(name, specs) {
  return `${name} | ${Object.entries(specs)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ')}`.slice(0, 500);
}

const requiredCategories = [
  'laptop',
  'chuot',
  'ban-phim',
  'tai-nghe',
  'man-hinh',
  'o-cung-ssd',
  'ram',
  'webcam',
  'loa-may-tinh',
  'phu-kien-laptop',
];

const requiredBrands = [
  ['Logitech', 'logitech'],
  ['Corsair', 'corsair'],
  ['Kingston', 'kingston'],
  ['Western Digital', 'western-digital'],
  ['Crucial', 'crucial'],
  ['SanDisk', 'sandisk'],
  ['G.SKILL', 'g-skill'],
  ['AOC', 'aoc'],
  ['Sony', 'sony'],
  ['Anker', 'anker'],
  ['JBL', 'jbl'],
  ['Edifier', 'edifier'],
  ['UGREEN', 'ugreen'],
];

const productsByCategory = {
  laptop: [
    [
      'hp',
      'Laptop HP 15 fd0302TU i5 1334U 16GB 512GB Win11',
      18990000,
      17490000,
    ],
    [
      'dell',
      'Laptop Dell Inspiron 15 3530 i5 1335U 16GB 512GB',
      20490000,
      18990000,
    ],
    [
      'lenovo',
      'Laptop Lenovo IdeaPad Slim 5 R7 7730U 16GB 512GB',
      19990000,
      18490000,
    ],
    [
      'asus',
      'Laptop ASUS Vivobook 15 OLED i5 13500H 16GB 512GB',
      22490000,
      20990000,
    ],
    [
      'acer',
      'Laptop Acer Aspire 7 R7 7735HS 16GB 512GB RTX3050',
      24990000,
      22990000,
    ],
    ['msi', 'Laptop MSI Modern 14 i7 1255U 16GB 512GB', 20990000, 19490000],
    ['apple', 'MacBook Air M2 13 inch 16GB 512GB', 31990000, 29990000],
    [
      'huawei',
      'Laptop Huawei MateBook D14 i5 1240P 16GB 512GB',
      19990000,
      18490000,
    ],
    ['lg', 'Laptop LG Gram 16 i7 1360P 16GB 1TB', 40990000, 38990000],
    [
      'gigabyte',
      'Laptop Gigabyte G5 i7 13620H 16GB 512GB RTX4060',
      31990000,
      29990000,
    ],
  ],
  chuot: [
    ['logitech', 'Chuot khong day Logitech M331 Silent Plus', 449000, 349000],
    ['logitech', 'Chuot Logitech G304 Lightspeed', 1090000, 890000],
    ['razer', 'Chuot gaming Razer DeathAdder Essential', 790000, 650000],
    ['asus', 'Chuot ASUS TUF M3 Gen II', 590000, 490000],
    ['hp', 'Chuot khong day HP 220', 390000, 290000],
    ['logitech', 'Chuot Logitech MX Master 3S', 2690000, 2390000],
    ['razer', 'Chuot Razer Basilisk V3', 1590000, 1390000],
    ['logitech', 'Chuot Logitech Pebble M350s', 790000, 690000],
    ['dell', 'Chuot khong day Dell MS3320W', 590000, 490000],
    ['xiaomi', 'Chuot Xiaomi Mi Dual Mode Wireless', 450000, 350000],
  ],
  'ban-phim': [
    ['logitech', 'Ban phim Logitech K120 USB', 299000, 219000],
    ['logitech', 'Ban phim co Logitech G413 SE', 1790000, 1490000],
    ['razer', 'Ban phim co Razer BlackWidow V4 X', 3490000, 3090000],
    ['asus', 'Ban phim ASUS TUF K1', 1290000, 1090000],
    ['corsair', 'Ban phim co Corsair K70 RGB Pro', 4490000, 4090000],
    ['hp', 'Ban phim HP 320K', 550000, 450000],
    ['microsoft', 'Ban phim Microsoft Designer Compact', 1690000, 1490000],
    ['logitech', 'Ban phim Logitech MX Keys S', 2890000, 2590000],
    ['razer', 'Ban phim Razer Ornata V3', 1990000, 1690000],
    ['xiaomi', 'Ban phim Xiaomi Mechanical Keyboard TKL', 1490000, 1290000],
  ],
  'tai-nghe': [
    ['sony', 'Tai nghe Sony WH CH520 Bluetooth', 1490000, 1190000],
    ['logitech', 'Tai nghe Logitech G435 Lightspeed', 1890000, 1590000],
    ['razer', 'Tai nghe Razer BlackShark V2 X', 1490000, 1190000],
    ['asus', 'Tai nghe ASUS TUF Gaming H3', 1390000, 1090000],
    ['hp', 'Tai nghe HP HyperX Cloud Stinger 2', 1790000, 1490000],
    ['jbl', 'Tai nghe JBL Tune 760NC', 2190000, 1790000],
    ['apple', 'Tai nghe Apple AirPods 3', 4790000, 4290000],
    ['samsung', 'Tai nghe Samsung Galaxy Buds FE', 2190000, 1790000],
    ['xiaomi', 'Tai nghe Xiaomi Buds 5', 1990000, 1590000],
    ['huawei', 'Tai nghe Huawei FreeBuds 5i', 1990000, 1690000],
  ],
  'man-hinh': [
    ['dell', 'Man hinh Dell P2422H 24 inch FHD IPS', 4990000, 4290000],
    ['lg', 'Man hinh LG 27UP850N W 27 inch 4K IPS', 11990000, 10990000],
    [
      'samsung',
      'Man hinh Samsung Odyssey G5 27 inch 2K 165Hz',
      7990000,
      6990000,
    ],
    ['asus', 'Man hinh ASUS TUF VG249Q3A 24 inch 180Hz', 5290000, 4590000],
    ['acer', 'Man hinh Acer Nitro VG270E 27 inch 100Hz', 4290000, 3690000],
    ['gigabyte', 'Man hinh Gigabyte M27Q 27 inch 2K 170Hz', 9990000, 8990000],
    ['aoc', 'Man hinh AOC 24G2SP 24 inch 165Hz', 4990000, 4390000],
    ['hp', 'Man hinh HP M24f 24 inch IPS', 3890000, 3390000],
    ['msi', 'Man hinh MSI G274F 27 inch 180Hz', 6590000, 5890000],
    ['lenovo', 'Man hinh Lenovo L24i 40 24 inch IPS', 3790000, 3290000],
  ],
  'o-cung-ssd': [
    ['samsung', 'SSD Samsung 990 EVO 1TB NVMe PCIe 4.0', 2790000, 2390000],
    ['kingston', 'SSD Kingston NV2 1TB NVMe', 1990000, 1690000],
    ['western-digital', 'SSD WD Blue SN580 1TB NVMe', 2290000, 1990000],
    ['crucial', 'SSD Crucial P3 Plus 1TB NVMe', 2190000, 1890000],
    ['sandisk', 'SSD SanDisk Extreme Portable 1TB', 3190000, 2790000],
    ['kingston', 'SSD Kingston A400 960GB SATA', 1690000, 1390000],
    ['samsung', 'SSD Samsung 870 EVO 1TB SATA', 2990000, 2690000],
    ['western-digital', 'SSD WD Green 480GB SATA', 1190000, 990000],
    ['crucial', 'SSD Crucial MX500 1TB SATA', 2590000, 2290000],
    ['sandisk', 'SSD SanDisk Ultra 3D 1TB SATA', 2490000, 2190000],
  ],
  ram: [
    ['kingston', 'RAM Kingston Fury Beast 16GB DDR4 3200MHz', 1290000, 1090000],
    [
      'corsair',
      'RAM Corsair Vengeance LPX 16GB DDR4 3200MHz',
      1390000,
      1190000,
    ],
    ['g-skill', 'RAM GSKILL Ripjaws V 16GB DDR4 3600MHz', 1590000, 1390000],
    ['kingston', 'RAM Kingston 8GB DDR4 2666MHz cho laptop', 690000, 590000],
    ['samsung', 'RAM Samsung 16GB DDR5 4800MHz SODIMM', 1790000, 1590000],
    ['kingston', 'RAM Kingston Fury Beast 32GB DDR5 5600MHz', 3290000, 2990000],
    ['corsair', 'RAM Corsair Vengeance 32GB DDR5 6000MHz', 3790000, 3490000],
    [
      'g-skill',
      'RAM GSKILL Trident Z5 RGB 32GB DDR5 6000MHz',
      4190000,
      3890000,
    ],
    ['crucial', 'RAM Crucial 16GB DDR5 5600MHz', 1990000, 1790000],
    ['kingston', 'RAM Kingston ValueRAM 8GB DDR4 3200MHz', 650000, 550000],
  ],
  webcam: [
    ['logitech', 'Webcam Logitech C270 HD 720p', 699000, 549000],
    ['logitech', 'Webcam Logitech C920e Full HD', 1890000, 1590000],
    ['microsoft', 'Webcam Microsoft Modern Webcam 1080p', 1690000, 1390000],
    ['razer', 'Webcam Razer Kiyo X 1080p', 2190000, 1890000],
    ['hp', 'Webcam HP 320 FHD', 1190000, 990000],
    ['anker', 'Webcam Anker PowerConf C200', 1790000, 1490000],
    ['huawei', 'Webcam Huawei AI Camera Full HD', 1490000, 1190000],
    ['dell', 'Webcam Dell WB3023 QHD', 2590000, 2290000],
    ['logitech', 'Webcam Logitech Brio 4K', 4690000, 4290000],
    ['asus', 'Webcam ASUS Webcam C3', 1490000, 1290000],
  ],
  'loa-may-tinh': [
    ['logitech', 'Loa vi tinh Logitech Z120 USB', 399000, 299000],
    ['logitech', 'Loa Logitech Z407 Bluetooth 2.1', 2590000, 2290000],
    ['jbl', 'Loa JBL Pebbles 2.0 USB', 1090000, 890000],
    ['edifier', 'Loa Edifier R1280DB', 2990000, 2690000],
    ['samsung', 'Loa Samsung Sound Tower MX ST40B', 4990000, 4490000],
    ['lg', 'Loa LG XBOOM Go XG5Q', 3190000, 2790000],
    ['sony', 'Loa Sony SRS XB23', 2890000, 2490000],
    ['hp', 'Loa HP DHS 2111S Soundbar', 990000, 790000],
    ['xiaomi', 'Loa Xiaomi Sound Pocket', 990000, 790000],
    ['dell', 'Loa Dell AC511M Soundbar', 1490000, 1290000],
  ],
  'phu-kien-laptop': [
    ['logitech', 'Bo ban phim chuot Logitech MK295 Silent', 990000, 790000],
    ['anker', 'Hub chuyen doi Anker 7 in 1 USB C', 1490000, 1290000],
    ['ugreen', 'De tan nhiet laptop UGREEN 2 quat', 690000, 550000],
    ['hp', 'Sac laptop HP USB C 65W', 890000, 750000],
    ['dell', 'Sac laptop Dell 65W dau tron', 790000, 650000],
    ['lenovo', 'Sac laptop Lenovo 65W USB C', 850000, 720000],
    ['asus', 'Sac laptop ASUS 90W', 950000, 790000],
    ['sandisk', 'USB SanDisk Ultra Flair 128GB', 450000, 350000],
    ['kingston', 'USB Kingston DataTraveler Exodia 64GB', 220000, 170000],
    ['xiaomi', 'Balo laptop Xiaomi Business Backpack 2', 790000, 650000],
  ],
};

function buildSpecs(categorySlug, itemName) {
  const shared = {
    Hang: 'Chinh hang',
    Bao_hanh: '12 thang',
    Xuat_xu: 'Trung Quoc',
    Tinh_trang: 'Moi 100%',
  };

  if (categorySlug === 'laptop') {
    return {
      ...shared,
      CPU: 'Hieu nang on dinh cho hoc tap va van phong',
      RAM: '16 GB',
      O_cung: '512 GB SSD NVMe',
      Man_hinh: '15.6 inch FHD',
      Ket_noi: 'Wi-Fi 6, Bluetooth 5.2, USB Type-C',
      Trong_luong: 'Khoang 1.5-1.9 kg',
      He_dieu_hanh: 'Windows 11 Home',
    };
  }

  if (categorySlug === 'chuot') {
    return {
      ...shared,
      Loai: 'Chuot may tinh',
      Ket_noi: 'Khong day 2.4GHz/Bluetooth hoac USB',
      Do_phan_giai: '1000-26000 DPI',
      So_nut_bam: '3-11 nut',
      Pin: 'AA hoac pin sac',
      Trong_luong: '70-140 g',
      Tuong_thich: 'Windows/macOS',
    };
  }

  if (categorySlug === 'ban-phim') {
    return {
      ...shared,
      Loai: 'Ban phim co hoac membrane',
      Ket_noi: 'USB/USB-C/Bluetooth',
      Layout: 'Full-size hoac TKL',
      Den_nen: 'Co/Khong',
      Switch: 'Tactile/Linear/Membrane',
      Chat_lieu: 'Nhua ABS/nhom',
      Tuong_thich: 'Windows/macOS',
    };
  }

  if (categorySlug === 'tai-nghe') {
    return {
      ...shared,
      Loai: 'Over-ear/In-ear/TWS',
      Ket_noi: 'Bluetooth/3.5mm/USB',
      Driver: '30-50 mm',
      Mic: 'Tich hop',
      Chong_on: 'Ho tro tren mot so mau',
      Thoi_luong_pin: '6-50 gio',
      Tuong_thich: 'Android/iOS/Windows',
    };
  }

  if (categorySlug === 'man-hinh') {
    return {
      ...shared,
      Kich_thuoc: '24-27 inch',
      Do_phan_giai: 'FHD/2K/4K',
      Tam_nen: 'IPS/VA',
      Tan_so_quet: '60-180Hz',
      Cong_ket_noi: 'HDMI/DisplayPort/USB-C',
      Do_phu_mau: '99% sRGB tro len',
      Thiet_ke: 'Vien mong, co the nang ha',
    };
  }

  if (categorySlug === 'o-cung-ssd') {
    return {
      ...shared,
      Dung_luong: '480GB-1TB',
      Chuan_ket_noi: 'SATA/NVMe/USB',
      Toc_do_doc: '500-5000 MB/s',
      Toc_do_ghi: '430-4200 MB/s',
      Kich_thuoc: '2.5 inch/M.2 2280',
      Cong_nghe_NAND: '3D TLC',
      Tuong_thich: 'Laptop/PC',
    };
  }

  if (categorySlug === 'ram') {
    return {
      ...shared,
      Dung_luong: '8GB-32GB',
      Loai_RAM: 'DDR4/DDR5',
      Bus_RAM: '2666-6000 MHz',
      Dien_ap: '1.1V-1.35V',
      Ho_tro: 'Desktop/Laptop',
      Tan_nhiet: 'Co/Khong',
      Tinh_nang: 'On dinh va da nhiem tot',
    };
  }

  if (categorySlug === 'webcam') {
    return {
      ...shared,
      Do_phan_giai: 'HD/Full HD/2K/4K',
      Toc_do_khung_hinh: '30-60fps',
      Focus: 'Auto focus/Fixed focus',
      Mic: 'Mono/Dual mic',
      Ket_noi: 'USB/USB-C',
      Goc_nhin: '78-90 do',
      Ung_dung: 'Hop truc tuyen, livestream',
    };
  }

  if (categorySlug === 'loa-may-tinh') {
    return {
      ...shared,
      Loai_loa: '2.0/2.1/Soundbar',
      Cong_suat: '2W-160W',
      Ket_noi: 'Bluetooth/USB/3.5mm',
      Tan_so_dap_ung: '20Hz-20kHz',
      Dieu_khien: 'Nut vat ly/remote',
      Tinh_nang: 'Am thanh ro rang, do ben cao',
      Ung_dung: 'Hoc tap, xem phim, nghe nhac',
    };
  }

  return {
    ...shared,
    Loai: 'Phu kien laptop',
    Tuong_thich: 'Da thiet bi',
    Chat_lieu: 'Nhua/kim loai',
    Cong_suat_ho_tro: '65W-100W (neu co)',
    Cong_ket_noi: 'USB-A/USB-C/HDMI',
    Tinh_nang: 'Tien loi cho hoc tap va lam viec',
    Luu_y: itemName,
  };
}

function buildDescription(name, specs) {
  const topSpecs = Object.entries(specs)
    .slice(0, 6)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  return `${name} là sản phẩm phù hợp cho nhu cầu học tập, làm việc và giải trí hằng ngày.\n\nThông tin nổi bật:\n${topSpecs}\n\nSản phẩm được mô tả thông tin kỹ thuật đầy đủ, giúp dễ dàng so sánh và lựa chọn theo nhu cầu thực tế.`;
}

async function seedProducts() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'laptop_shop',
  });

  try {
    const upsertBrandSql = `
      INSERT INTO brands (name, slug, description, logo, website, is_active, sort_order)
      VALUES (?, ?, NULL, NULL, NULL, 1, 999)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        is_active = 1
    `;

    for (const [name, slug] of requiredBrands) {
      await conn.query(upsertBrandSql, [name, slug]);
    }

    const [brandRows] = await conn.query('SELECT id, slug FROM brands');
    const [categoryRows] = await conn.query(
      'SELECT id, slug FROM categories WHERE parent_id IS NULL',
    );

    const brandBySlug = new Map(brandRows.map((item) => [item.slug, item.id]));
    const categoryBySlug = new Map(
      categoryRows.map((item) => [item.slug, item.id]),
    );

    for (const slug of requiredCategories) {
      if (!categoryBySlug.has(slug)) {
        throw new Error(`Missing category slug: ${slug}`);
      }
    }

    const insertProductSql = `
      INSERT INTO products (
        name, slug, description, short_description, price, sale_price, sku,
        stock_quantity, category_id, brand_id, seller_id, sold_count,
        rating_avg, review_count, status, specs, is_featured, view_count, sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        short_description = VALUES(short_description),
        price = VALUES(price),
        sale_price = VALUES(sale_price),
        sku = VALUES(sku),
        stock_quantity = VALUES(stock_quantity),
        category_id = VALUES(category_id),
        brand_id = VALUES(brand_id),
        sold_count = VALUES(sold_count),
        rating_avg = VALUES(rating_avg),
        review_count = VALUES(review_count),
        status = VALUES(status),
        specs = VALUES(specs),
        is_featured = VALUES(is_featured),
        view_count = VALUES(view_count),
        sort_order = VALUES(sort_order)
    `;

    let totalUpsert = 0;

    for (const categorySlug of requiredCategories) {
      const categoryId = categoryBySlug.get(categorySlug);
      const products = productsByCategory[categorySlug];

      if (!products || products.length !== 10) {
        throw new Error(
          `Category ${categorySlug} must have exactly 10 products.`,
        );
      }

      for (let index = 0; index < products.length; index += 1) {
        const [brandSlug, name, price, salePrice] = products[index];
        const brandId = brandBySlug.get(brandSlug);
        const displayName = toVietnameseText(name);

        if (!brandId) {
          throw new Error(
            `Missing brand slug: ${brandSlug} for product ${name}`,
          );
        }

        const slug = `${slugify(name)}-${categorySlug}`.slice(0, 280);
        const sku =
          `${categorySlug.replace(/-/g, '').toUpperCase()}-${String(index + 1).padStart(2, '0')}-${brandSlug
            .replace(/[^a-z0-9]/g, '')
            .toUpperCase()
            .slice(0, 8)}`.slice(0, 50);
        const rawSpecs = buildSpecs(categorySlug, displayName);
        const specs = normalizeSpecsForStorage(rawSpecs);
        const description = buildDescription(displayName, specs);
        const shortDescription = buildShortDescription(displayName, specs);

        await conn.query(insertProductSql, [
          displayName,
          slug,
          description,
          shortDescription,
          price,
          salePrice,
          sku,
          20 + index * 3,
          categoryId,
          brandId,
          100 + index * 13,
          Number((4.4 + (index % 5) * 0.1).toFixed(1)),
          30 + index * 8,
          'active',
          JSON.stringify(specs),
          index === 0 ? 1 : 0,
          400 + index * 25,
          index + 1,
        ]);

        totalUpsert += 1;
      }
    }

    const [summary] = await conn.query(`
      SELECT c.id, c.name, c.slug, COUNT(p.id) AS totalProducts
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      WHERE c.parent_id IS NULL
      GROUP BY c.id, c.name, c.slug
      ORDER BY c.sort_order ASC, c.id ASC
    `);

    const [sample] = await conn.query(`
      SELECT p.id, p.name, p.slug, p.sku, c.slug AS categorySlug, b.slug AS brandSlug,
             p.price, p.sale_price AS salePrice, p.status, JSON_LENGTH(p.specs) AS specsFields
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN brands b ON b.id = p.brand_id
      ORDER BY p.id DESC
      LIMIT 20
    `);

    console.log(
      JSON.stringify(
        {
          upsertedProducts: totalUpsert,
          summaryByCategory: summary,
          sampleLatest: sample,
        },
        null,
        2,
      ),
    );
  } finally {
    await conn.end();
  }
}

seedProducts().catch((error) => {
  console.error(error);
  process.exit(1);
});
