---
name: gemini-with-antigravity
description: Phối hợp mô hình "Gemini Web suy nghĩ - Antigravity thực thi" (Anti with Gehihi) thông qua cầu nối Read-only MCP tại https://<your-tunnel-domain>/mcp hoặc local bridge http://127.0.0.1:48765. Sử dụng skill này khi cần kết nối Gemini Web với Antigravity, đổi thư mục làm việc (workspace), lấy Pairing Code, hoặc gửi yêu cầu/hỏi ý kiến Gemini Web làm kiến trúc sư trưởng (Chief Architect).
---

# Gemini Web + Antigravity Bridge (`Anti with Gehihi`)

Triết lý hoạt động: **"Gemini Web thinks. Antigravity works."**
- **Gemini Web (Bộ Não):** Đóng vai trò Kiến Trúc Sư Trưởng (Chief Architect). Kết nối trực tiếp vào máy tính qua máy chủ MCP Read-only (`https://<your-tunnel-domain>/mcp` hoặc local bridge) để đọc cấu trúc dự án, tìm kiếm file, kiểm tra mã nguồn, xem `git diff` và lên kế hoạch thực thi chi tiết.
- **Antigravity (Cánh Tay):** Đóng vai trò Kỹ Sư Thực Thi (Lead Engineer). Thực hiện các thao tác ghi file, refactor, chạy build, kiểm thử, quản lý git và báo cáo tiến độ.

---

## Các lệnh vận hành với CLI `a2g`

CLI chính của dự án là `a2g` (hoặc `gehihi`):

1. **Kiểm tra trạng thái Bridge & Tunnel:**
   ```powershell
   a2g status
   ```

2. **Khởi động / Khởi tạo kết nối cho Workspace hiện tại:**
   ```powershell
   a2g setup -w .
   ```
   Lệnh này sẽ tự động khởi động daemon nền nếu chưa chạy và hiển thị mã **Pairing Code** (hiệu lực 5 phút).

3. **Chuyển đổi Workspace nhanh chóng (Không cần cấp quyền lại trên Gemini):**
   ```powershell
   a2g workspace "<duong-dan-tuyet-doi-den-thu-muc-du-an>"
   ```

4. **Tạo Pairing Code mới:**
   ```powershell
   a2g pair
   ```

5. **Gửi câu hỏi tự động sang Gemini Web và chờ kết quả (Two-way Bridge):**
   ```powershell
   a2g ask "<câu hỏi hoặc nhiệm vụ>"
   # hoặc:
   .\scripts\ask-gemini.ps1 "<câu hỏi hoặc nhiệm vụ>"
   ```
   *(Yêu cầu tab Gemini Web đang mở và có cài Userscript `gemini-antigravity-bridge.user.js` trên Tampermonkey)*.

6. **Dừng / Khởi động lại daemon:**
   ```powershell
   a2g stop
   a2g restart
   ```

---

## Quy trình làm việc chuẩn (Standard Operating Procedure)

1. **Cấu hình trên Gemini Web:**
   - Vào khung chat Gemini Web -> Bật công cụ MCP (hoặc thêm máy chủ MCP).
   - Nhập URL: `https://<your-tunnel-domain>/mcp` (URL đường hầm Cloudflare Tunnel của bạn).
   - Chạy lệnh `a2g pair` trên Antigravity để lấy mã 6 ký tự.
   - Khi Gemini chuyển hướng tới trang xác thực OAuth, nhập mã 6 ký tự để kết nối.

2. **Cài đặt Userscript cho chế độ tự động 2 chiều:**
   - Cài extension Tampermonkey trên trình duyệt (Chrome, Edge, Brave...).
   - Thêm script `userscript/gemini-antigravity-bridge.user.js`.
   - Mở https://gemini.google.com, góc dưới bên phải sẽ xuất hiện widget trạng thái màu xanh lá: `🟢 Gehihi: Sẵn sàng (Idle)`.

3. **Thực thi nhiệm vụ:**
   - Khi gặp bài toán khó, Antigravity gọi `a2g ask "<yêu cầu thiết kế kiến trúc>"` để xin ý kiến của Gemini Web.
   - Nhận phản hồi và bản thiết kế từ Gemini Web, Antigravity tiến hành code và test.
   - Gemini Web có thể dùng các công cụ MCP `git_status`, `git_diff`, `read_file` để duyệt code (code review) trực tiếp.
