# Hướng dẫn Upload Logo qua Cloudinary

## Cấu hình Backend

### 1. Cài đặt biến môi trường (.env)

Thêm các biến sau vào file `.env`:

```env
# =====================
# CLOUDINARY
# =====================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Lấy thông tin Cloudinary:**

1. Đăng ký tài khoản tại https://cloudinary.com
2. Vào Dashboard để lấy Cloud Name, API Key, API Secret

### 2. Khởi động Backend

```bash
npm run start:dev
```

## API Endpoints

### 1. Lấy thông tin logo (Public - không cần auth)

```
GET /api/v1/site-settings/public
```

**Response:**

```json
{
  "logoUrl": "https://res.cloudinary.com/...",
  "logoText": "SMART LAPTOP"
}
```

### 2. Upload logo (Admin only)

```
POST /api/v1/site-settings/logo
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>
```

**Body (FormData):**

- `file`: File ảnh (JPEG, PNG, GIF, WebP, max 5MB)
- `logoText`: (Optional) Text hiển thị bên cạnh logo

**Response:**

```json
{
  "message": "Logo uploaded successfully",
  "logoUrl": "https://res.cloudinary.com/...",
  "logoText": "SMART LAPTOP"
}
```

### 3. Cập nhật text logo (Admin only)

```
POST /api/v1/site-settings/logo-text
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Body:**

```json
{
  "logoText": "MY SHOP"
}
```

## Sử dụng trên Frontend

### Admin Panel (fe-admin-laptop)

1. Đăng nhập với tài khoản admin
2. Vào menu **Cài đặt** (Settings)
3. Upload logo mới hoặc cập nhật text logo
4. Logo sẽ được lưu trên Cloudinary và URL được lưu vào database

### Shop Frontend (FeShopLaptop)

Logo sẽ tự động hiển thị trên header sau khi admin upload. Frontend sẽ:

- Fetch logo từ API khi load trang
- Hiển thị logo từ Cloudinary nếu có
- Fallback về icon mặc định nếu chưa có logo

## Cấu trúc Database

Table: `site_settings`

| Column        | Type         | Description                                |
| ------------- | ------------ | ------------------------------------------ |
| id            | int          | Primary key                                |
| setting_key   | varchar(100) | Unique key (e.g., 'logo_url', 'logo_text') |
| setting_value | text         | Value của setting                          |
| description   | varchar(200) | Mô tả setting                              |
| created_at    | datetime     | Thời gian tạo                              |
| updated_at    | datetime     | Thời gian cập nhật                         |

## Lưu ý

1. **File size**: Tối đa 5MB
2. **File types**: JPEG, PNG, GIF, WebP
3. **Cloudinary folder**: Ảnh sẽ được lưu trong folder `laptop-shop/logo`
4. **Permissions**: Chỉ admin mới có quyền upload/cập nhật logo
5. **Caching**: Frontend cache logo trong context, reload trang để thấy thay đổi

## Troubleshooting

### Lỗi "No file uploaded"

- Đảm bảo gửi file với key `file` trong FormData
- Kiểm tra Content-Type header là `multipart/form-data`

### Lỗi "Invalid file type"

- Chỉ chấp nhận file ảnh: JPEG, PNG, GIF, WebP
- Kiểm tra MIME type của file

### Lỗi Cloudinary

- Kiểm tra biến môi trường CLOUDINARY\_\* đã đúng chưa
- Kiểm tra kết nối internet
- Xem log chi tiết trong console

### Logo không hiển thị trên FE

- Kiểm tra URL logo trong response API
- Kiểm tra next.config.ts đã có domain `res.cloudinary.com`
- Clear cache browser và reload
