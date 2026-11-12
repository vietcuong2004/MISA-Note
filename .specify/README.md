# Quy trình quản lý tài liệu BA và PBI — MISA Note

Tài liệu này quy chuẩn hóa cách lưu trữ tài liệu nghiệp vụ trong thư mục `.specify/` và quy trình bàn giao PBI qua **GitHub Issues** & **GitHub Projects**.

---

## 1. Cấu trúc thư mục

```text
MISA-Note/
├── .github/
│   └── ISSUE_TEMPLATE/
│       └── pbi.yml
├── .specify/
│   ├── README.md
│   ├── R1/
│   │   └── {PBI-ID}-{ten-tinh-nang-kebab-case}/
│   │       ├── spec.md
│   │       └── business.md
│   ├── R2/
│   └── R3/
└── src/
```

**Quy tắc bắt buộc:**
- `R1`, `R2`, `R3`... tương ứng với từng Round phát triển (tương tự Sprint trong Scrum). Chỉ tạo Round mới khi bắt đầu có yêu cầu PBI thuộc Round đó.
- Tên thư mục PBI tuân theo mẫu: `{PBI-ID}-{ten-tinh-nang-kebab-case}` (ví dụ: `123456-tinh-nang-chinh-sua-ghi-chu`).
- Sử dụng **bộ mã PBI riêng** do BA quản lý; nếu chưa có mã chính thức thì dùng mã tạm để BA xác nhận, không tự mặc định là mã chính thức.
- Mỗi thư mục PBI **chỉ chứa đúng 2 file**: `spec.md` và `business.md`.
- Không tự ý thay đổi cấu trúc tài liệu nghiệp vụ hoặc chỉnh sửa source code ứng dụng khi thao tác tài liệu BA.

---

## 2. Quy chuẩn và mẫu `spec.md`

File `spec.md` dùng để đặc tả **User Stories** và **Acceptance Criteria** cho Dev triển khai và Tester viết Test Case.

- Giữ nguyên nội dung nghiệp vụ đã được BA cung cấp.
- Không tự ý lược bỏ scenario hoặc thay đổi logic Given – When – Then.
- Các luồng thay thế phải được đánh số rõ ràng để xác định bước chính tương ứng (`2a`, `2b`...).

```markdown
# [PBI-{ID}] {Tên tính năng}

**Round:** R1  
**Tài liệu nghiệp vụ:** [business.md](./business.md)

### 1. User Stories

As a [vai trò người dùng],  
I want [nhu cầu],  
So that [giá trị đạt được].

### 2. Acceptance Criteria

**Luồng chính**

1. Given [điều kiện ban đầu], When [thao tác], Then [kết quả].
2. Given [điều kiện], When [thao tác], Then [kết quả].
3. Given [điều kiện], When [thao tác], Then [kết quả].

**Luồng thay thế**

2a. Given [điều kiện thay thế bước 2], When [thao tác], Then [kết quả].  
2b. Given [điều kiện thay thế khác bước 2], When [thao tác], Then [kết quả].

**Ngoại lệ / Lỗi**

- E1 (tại bước [X]). Given [điều kiện lỗi], When [thao tác], Then [kết quả/thông báo].
```

---

## 3. Quy chuẩn và mẫu `business.md`

File `business.md` đóng vai trò tương tự **BRD rút gọn**, viết rõ ràng để có thể sao chép trực tiếp vào phần **Business Description** của GitHub Issue.

- Bắt buộc gồm **đúng 3 phần chính** dưới đây.
- Chỉ ghi nhận nội dung đã được xác nhận; nếu thiếu thông tin, đánh dấu mục **Cần BA xác nhận**, không tự suy diễn thành yêu cầu chính thức.

```markdown
### 1. Câu chuyện nghiệp vụ

- **Bối cảnh nghiệp vụ:** ...
- **Vấn đề / Nhu cầu hiện tại:** ...
- **Đối tượng sử dụng:** ...
- **Tình huống thực tế:** ...

### 2. Mục tiêu

- **Mục tiêu nghiệp vụ:** ...
- **Giá trị mang lại cho người dùng:** ...
- **Kết quả mong muốn sau triển khai:** ...

### 3. Giải pháp phần mềm chi tiết

- **Giải pháp đề xuất:** ...
- **Hành vi hệ thống:** ...
- **Các màn hình liên quan:** ...
- **Thao tác và tương tác của người dùng:** ...
- **Quy tắc nghiệp vụ:** ...
- **Xử lý các trường hợp đặc biệt:** ...
- **Ràng buộc và lưu ý triển khai:** ...

> **Cần BA xác nhận:**
> - [ ] ...
```

---

## 4. Quy trình tạo PBI mới (9 bước)

1. Xác định Round phát triển (`R1`, `R2`...).
2. Xác định tên tính năng.
3. Kiểm tra mã PBI đã có hay chưa (chưa có thì hỏi BA hoặc dùng mã tạm).
4. Tạo thư mục `.specify/R{n}/{PBI-ID}-{ten-tinh-nang-kebab-case}/`.
5. Tạo `spec.md`.
6. Tạo `business.md`.
7. Kiểm tra tính nhất quán giữa `spec.md` và `business.md`.
8. Báo cáo các file đã tạo và danh sách nội dung cần BA xác nhận.
9. Sau khi BA hoàn thiện & push lên GitHub, đưa nội dung `business.md` vào GitHub Issue theo hướng dẫn ở mục 5.

---

## 5. Quy trình quản lý trên GitHub Issues & GitHub Projects

### Đưa `business.md` vào GitHub Issue (thao tác thủ công)

1. Hoàn thiện `spec.md` và `business.md`, commit & push lên nhánh `main` của repository.
2. Trên GitHub → **Issues** → **New issue** → chọn biểu mẫu **PBI - Product Backlog Item** (`.github/ISSUE_TEMPLATE/pbi.yml`).
3. Nhập **Title** (ví dụ `[PBI-123456] Tên tính năng`).
4. Copy toàn bộ nội dung `business.md` dán vào ô **Business Description**.
5. Dán URL tới file `spec.md` trên nhánh `main` vào ô **Link to spec.md**.
6. Bổ sung **Notes** nếu có, kiểm tra label `PBI` + gán label Round (`R1`, `R2`...), **Assignees** và thêm vào **GitHub Project**.

> **Lưu ý:** Không đồng bộ tự động hai chiều và không tự ghi đè nội dung Issue khi file Markdown thay đổi.

### Cấu hình trên GitHub Projects (thao tác trên GitHub Web)

- **Các trường:** `Title`, `Status` (`Todo`, `In Progress`, `In Review`, `Done`), `Assignee`, `Priority` (`High`, `Medium`, `Low`), `Iteration/Round` (`R1`, `R2`, `R3`...).
- **Views đề xuất:**
  - **Backlog:** Dạng Table, hiển thị tất cả PBI, group hoặc sort theo `Iteration/Round` và `Priority`.
  - **Board theo Round:** Dạng Board (cột `Todo` → `In Progress` → `In Review` → `Done`), đặt filter theo `Round` đang chạy (ví dụ `Round: R1`).
