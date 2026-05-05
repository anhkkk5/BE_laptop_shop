# SOP vận hành & test flow chuẩn doanh nghiệp

## 1) Mục tiêu

Tài liệu này dùng để chuẩn hóa hệ thống theo mô hình doanh nghiệp thực tế:

- Vận hành theo role rõ ràng, không chồng chéo trách nhiệm.
- Luồng đơn hàng + bảo hành chạy liên tục end-to-end.
- Có tiêu chí pass/fail để UAT, tránh test rời rạc.
- Có SLA và cảnh báo để kiểm soát vận hành theo ngày.

---

## 2) Mô hình vai trò (Operating Model)

| Role             | Nhiệm vụ chính                                                             | Không được làm                                         |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| CUSTOMER         | Đặt hàng, thanh toán, theo dõi đơn, tạo ticket bảo hành                    | Không đổi trạng thái nội bộ order/ticket               |
| STAFF (CS/Sales) | Duyệt đơn đầu vào, xác nhận đơn, chốt giao hàng, xử lý hủy ở giai đoạn sớm | Không làm bước fulfillment kho                         |
| WAREHOUSE        | Pick/pack/dispatch, xử lý kho cho đơn đã confirmed                         | Không confirm bán hàng, không chốt delivered/completed |
| TECHNICIAN       | Chẩn đoán/sửa chữa ticket đã assign                                        | Không đụng order lifecycle                             |
| ADMIN            | Điều phối toàn cục, assign technician, xử lý ngoại lệ/override             | Không thay thế vai trò tác nghiệp hằng ngày            |

---

## 3) RACI cho các mốc chính

| Công việc                                              | R (Responsible) | A (Accountable) | C (Consulted) | I (Informed)         |
| ------------------------------------------------------ | --------------- | --------------- | ------------- | -------------------- |
| Customer tạo đơn                                       | CUSTOMER        | STAFF           | -             | WAREHOUSE            |
| `pending -> confirmed`                                 | STAFF           | STAFF Lead      | ADMIN         | CUSTOMER, WAREHOUSE  |
| `confirmed -> processing -> ready_to_ship -> shipping` | WAREHOUSE       | Warehouse Lead  | STAFF         | CUSTOMER             |
| `shipping -> delivered -> completed`                   | STAFF           | STAFF Lead      | WAREHOUSE     | CUSTOMER             |
| Customer tạo warranty ticket                           | CUSTOMER        | STAFF           | TECHNICIAN    | ADMIN                |
| Assign technician                                      | ADMIN           | ADMIN           | STAFF         | TECHNICIAN, CUSTOMER |
| Xử lý ticket đến `returned`                            | TECHNICIAN      | TECH Lead       | ADMIN         | CUSTOMER             |

---

## 4) Quy tắc trạng thái bắt buộc

### 4.1 Order lifecycle chuẩn

`pending -> confirmed -> processing -> ready_to_ship -> shipping -> delivered -> completed`

### 4.2 Quyền đổi trạng thái

#### STAFF

- `pending -> confirmed`
- `pending -> cancelled`
- `shipping -> delivered`
- `delivered -> completed`

#### WAREHOUSE

- `confirmed -> processing`
- `processing -> ready_to_ship`
- `ready_to_ship -> shipping`

#### TECHNICIAN

- Không đổi order status.
- Chỉ xử lý ticket bảo hành đã assign cho chính mình.

### 4.3 Warranty lifecycle chuẩn

`pending -> received -> diagnosing -> repairing -> completed -> returned`

---

## 5) SLA vận hành đề xuất (thực chiến)

| Chặng                          | SLA mục tiêu                            | Cảnh báo                        |
| ------------------------------ | --------------------------------------- | ------------------------------- |
| `pending -> confirmed`         | <= 30 phút giờ làm việc                 | Quá 30 phút: cảnh báo Staff     |
| `confirmed -> processing`      | <= 60 phút                              | Quá 60 phút: cảnh báo Warehouse |
| `ready_to_ship -> shipping`    | <= 4 giờ                                | Quá 4 giờ: cảnh báo kho + CS    |
| `shipping -> delivered`        | Theo SLA hãng vận chuyển                | Quá ETA: cảnh báo CS            |
| Ticket `pending -> received`   | <= 4 giờ làm việc                       | Quá hạn: cảnh báo Admin         |
| Ticket `received -> completed` | <= 2 ngày (lỗi nhẹ) / 5 ngày (lỗi nặng) | Quá hạn: escalated              |

---

## 6) UAT matrix (Pass/Fail rõ ràng)

## 6.1 Happy path (bắt buộc pass)

| ID    | Kịch bản                | Kết quả mong đợi                                       | Pass/Fail |
| ----- | ----------------------- | ------------------------------------------------------ | --------- |
| HP-01 | Customer đặt hàng       | Tạo order thành công, status `pending`                 | [ ]       |
| HP-02 | Staff confirm đơn       | `pending -> confirmed` thành công                      | [ ]       |
| HP-03 | Warehouse xử lý kho     | `confirmed -> processing -> ready_to_ship -> shipping` | [ ]       |
| HP-04 | Staff chốt giao         | `shipping -> delivered -> completed`                   | [ ]       |
| HP-05 | Customer tạo bảo hành   | Ticket tạo thành công, status `pending`                | [ ]       |
| HP-06 | Admin assign technician | Ticket có `assignedTo` hợp lệ                          | [ ]       |
| HP-07 | Technician xử lý ticket | Ticket đi tới `returned`                               | [ ]       |

## 6.2 RBAC/Negative path (bắt buộc pass)

| ID      | Kịch bản sai                                       | Kết quả mong đợi | Pass/Fail |
| ------- | -------------------------------------------------- | ---------------- | --------- |
| RBAC-01 | Staff đổi `confirmed -> processing`                | Bị chặn          | [ ]       |
| RBAC-02 | Warehouse đổi `shipping -> delivered`              | Bị chặn          | [ ]       |
| RBAC-03 | Technician chưa assign cập nhật ticket             | `Forbidden`      | [ ]       |
| RBAC-04 | Customer vào `/staff`, `/warehouse`, `/technician` | Bị chặn quyền    | [ ]       |

## 6.3 Exception path

| ID    | Kịch bản ngoại lệ                      | Kết quả mong đợi           | Pass/Fail |
| ----- | -------------------------------------- | -------------------------- | --------- |
| EX-01 | Cancel đơn ở `pending`                 | Thành công, trả tồn hợp lệ | [ ]       |
| EX-02 | Cancel đơn ở `shipping`                | Bị chặn theo policy        | [ ]       |
| EX-03 | Ticket trùng cho cùng orderItem còn mở | Bị chặn tạo ticket mới     | [ ]       |

---

## 7) Mapping UI hiện tại vs SOP

| Module                         | Trạng thái       | Ghi chú                                |
| ------------------------------ | ---------------- | -------------------------------------- |
| Customer mua hàng + checkout   | ✅ Có            | Dùng để chạy HP-01                     |
| Staff cập nhật order status    | ✅ Có            | Dùng HP-02, HP-04                      |
| Warehouse dashboard tồn kho    | ✅ Có            | Theo dõi tồn kho runtime               |
| Warehouse order fulfillment UI | ⚠️ Thiếu/Chưa đủ | Cần màn thao tác 3 bước kho theo order |
| Technician xử lý ticket        | ✅ Có            | Dùng HP-07                             |
| Notification theo đúng user    | ✅ Đã tăng cường | Đã lọc theo current user trong FE      |

---

## 8) Backlog ưu tiên để hệ thống “ra doanh nghiệp”

### P0 (bắt buộc)

1. Hoàn thiện màn Warehouse Fulfillment theo danh sách order cần xử lý.
2. SLA board cho các đơn/ticket bị kẹt theo ngưỡng thời gian.
3. Audit log thao tác trạng thái theo user/role.

### P1 (nên có sớm)

1. Quy tắc auto-advance cho happy path (event/queue).
2. Escalation workflow khi vi phạm SLA.
3. Dashboard vận hành theo ca/ngày (throughput, backlog, overdue).

---

## 9) Checklist vận hành đầu ngày (Ops Runbook)

- [ ] Staff kiểm tra backlog `pending` chưa confirm
- [ ] Warehouse kiểm tra backlog `confirmed` chưa processing
- [ ] CS kiểm tra đơn `shipping` quá ETA
- [ ] Technician kiểm tra ticket quá SLA
- [ ] Admin kiểm tra hàng đợi cảnh báo và xử lý escalation

---

## 10) Kết luận

Hệ thống đạt chuẩn vận hành khi đồng thời thỏa 3 điều kiện:

1. **Ownership rõ**: đúng role đúng trách nhiệm.
2. **Flow liền mạch**: không đứt đoạn giữa order và warranty.
3. **Control rõ**: có SLA, có cảnh báo, có audit, có UAT pass/fail.
