# Tài liệu flow hệ thống theo Role và Trạng thái (Tiếng Việt)

## 1) Mục tiêu

Tài liệu này mô tả luồng vận hành end-to-end của hệ thống Laptop Shop theo 5 role:

- CUSTOMER
- STAFF
- WAREHOUSE
- TECHNICIAN
- ADMIN

Mục tiêu là làm rõ:

1. Mỗi role được làm gì và không được làm gì
2. Luồng trạng thái chuẩn của Order và Warranty
3. Điểm giao giữa các role trong toàn hệ thống

---

## 2) Vai trò và phạm vi

### CUSTOMER

- Đăng ký/đăng nhập, mua hàng, theo dõi đơn, gửi ticket bảo hành
- Xem thông báo cá nhân
- Không được đổi trạng thái nội bộ của Order/Warranty

### STAFF

- Xác nhận đơn đầu vào và chốt các bước cuối đơn hàng
- Theo dõi thanh toán, xử lý nghiệp vụ chăm sóc khách hàng
- Không làm nghiệp vụ fulfillment kho trung gian

### WAREHOUSE

- Xử lý kho cho đơn đã xác nhận
- Thực hiện các bước processing, ready_to_ship, shipping
- Không xác nhận đơn đầu vào và không chốt delivered/completed

### TECHNICIAN

- Xử lý ticket bảo hành được giao
- Cập nhật chẩn đoán/sửa chữa/trả khách theo workflow
- Không can thiệp lifecycle của Order

### ADMIN

- Điều phối toàn cục, quản trị người dùng, cấu hình hệ thống
- Theo dõi dashboard tổng hợp, phân tích và cảnh báo
- Xử lý ngoại lệ, override theo chính sách nội bộ

---

## 3) Flow đơn hàng (Order lifecycle)

## Trạng thái chuẩn

`pending -> confirmed -> processing -> ready_to_ship -> shipping -> delivered -> completed`

## Quyền đổi trạng thái theo role

### STAFF

- `pending -> confirmed`
- `pending -> cancelled`
- `shipping -> delivered`
- `delivered -> completed`

### WAREHOUSE

- `confirmed -> processing`
- `processing -> ready_to_ship`
- `ready_to_ship -> shipping`

### CUSTOMER

- Tạo đơn (khởi tạo `pending`)
- Theo dõi trạng thái đơn
- Hủy đơn theo policy ở các bước cho phép

### TECHNICIAN

- Không có quyền đổi trạng thái Order

### ADMIN

- Quản trị, giám sát toàn flow
- Xử lý tình huống ngoại lệ theo quyền hệ thống

---

## 4) Flow bảo hành (Warranty lifecycle)

## Trạng thái chuẩn

`pending -> received -> diagnosing -> repairing -> waiting_parts -> completed -> returned`

Nhánh ngoại lệ:

- `pending -> rejected`
- `received/diagnosing/repairing -> rejected` (tùy policy)

## Quyền chính theo role

### CUSTOMER

- Tạo ticket bảo hành từ đơn đã mua
- Theo dõi tiến độ ticket

### TECHNICIAN

- Cập nhật trạng thái chuyên môn: `received`, `diagnosing`, `repairing`, `waiting_parts`, `completed`, `returned`
- Ghi nhận log xử lý kỹ thuật

### ADMIN

- Phân công technician
- Theo dõi SLA và xử lý ticket ngoại lệ

### STAFF / WAREHOUSE

- Phối hợp thông tin nghiệp vụ khi cần
- Không thay thế vai trò xử lý kỹ thuật cốt lõi

---

## 5) Flow tổng thể hệ thống (E2E)

1. CUSTOMER đặt hàng, tạo Order ở trạng thái `pending`.
2. STAFF xác nhận đơn (`pending -> confirmed`) hoặc hủy theo policy.
3. WAREHOUSE xử lý kho và đẩy đơn đến `shipping`.
4. STAFF chốt vòng đời giao hàng: `shipping -> delivered -> completed`.
5. Sau mua hàng, CUSTOMER có thể tạo ticket bảo hành.
6. ADMIN phân công TECHNICIAN xử lý ticket.
7. TECHNICIAN xử lý ticket đến `completed/returned` (hoặc `rejected` theo policy).
8. Hệ thống thông báo trạng thái theo user liên quan ở từng chặng.

---

## 6) Mapping nhanh theo dashboard hiện tại

- FE Admin Dashboard (role nội bộ):
  - ADMIN: tổng quan toàn cục + hành động quản trị
  - STAFF: trọng tâm đơn chờ xác nhận, đơn đang giao, thông báo vận hành
  - WAREHOUSE: trọng tâm backlog kho và điều phối tồn kho
  - TECHNICIAN: trọng tâm ticket bảo hành đang xử lý

- FE Client Profile/Dashboard:
  - CUSTOMER: trọng tâm đơn hàng, bảo hành, thông báo cá nhân, tracking

---

## 7) Tiêu chí vận hành chuẩn

Hệ thống đạt vận hành tốt khi đồng thời thỏa:

1. Đúng role, đúng quyền, đúng bước
2. Trạng thái đi đúng lifecycle, không nhảy bước trái policy
3. Có khả năng theo dõi tiến độ qua dashboard và thông báo
4. Có khả năng xử lý ngoại lệ bằng vai trò quản trị
