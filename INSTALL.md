# Hướng Dẫn Cài Đặt Chi Tiết (Installation & Detailed Setup Guide)

Tài liệu này cung cấp hướng dẫn từng bước chi tiết từ A đến Z để thiết lập toàn bộ hệ thống **Anti with Gehihi** trên Windows, macOS và Linux.

---

## 📑 Mục lục
1. [Yêu cầu hệ thống (Prerequisites)](#1-yêu-cầu-hệ-thống-prerequisites)
2. [Cài đặt mã nguồn & Cấu hình CLI (`a2g`)](#2-cài-đặt-mã-nguồn--cấu-hình-cli-a2g)
3. [Hướng dẫn cấu hình URL MCP Server trên Gemini Web](#3-hướng-dẫn-cấu-hình-url-mcp-server-trên-gemini-web)
4. [Hướng dẫn cài đặt Extension Chrome (Tampermonkey) điều khiển](#4-hướng-dẫn-cài-đặt-extension-chrome-tampermonkey-điều-khiển)
5. [Cấu hình Cloudflare Tunnel riêng (Tuỳ chọn)](#5-cấu-hình-cloudflare-tunnel-riêng-tuỳ-chọn)
6. [Tích hợp Antigravity Skill](#6-tích-hợp-antigravity-skill)
7. [Kiểm tra hoạt động toàn diện (End-to-End Verification)](#7-kiểm-tra-hoạt-động-toàn-diện-end-to-end-verification)
8. [Xử lý lỗi thường gặp (Troubleshooting)](#8-xử-lý-lỗi-thường-gặp-troubleshooting)

---

## 1. Yêu cầu hệ thống (Prerequisites)

- **Node.js**: Phiên bản 20 trở lên (`node -v`).
- **Trình quản lý gói**: `pnpm` (khuyến nghị), `yarn` hoặc `npm`.
- **Trình duyệt web**: Google Chrome (khuyến nghị), Microsoft Edge, Brave hoặc bất kỳ trình duyệt Chromium nào.
- **Tiện ích mở rộng**: [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
- **Git**: Đã cài đặt trên máy (`git --version`).

---

## 2. Cài đặt mã nguồn & Cấu hình CLI (`a2g`)

### Bước 2.1: Clone repository về máy
```bash
git clone https://github.com/lecuong2512/anti-with-gehihi.git
cd anti-with-gehihi
```

### Bước 2.2: Cài đặt thư viện & build TypeScript
```bash
# Cài đặt thư viện với pnpm
pnpm install

# Build mã nguồn TypeScript sang thư mục dist
pnpm build
```

### Bước 2.3: Tạo liên kết CLI toàn cục (Global Symlink)
Để sử dụng lệnh `a2g` ở bất kỳ đâu trong Terminal mà không cần gõ đường dẫn đầy đủ:
```bash
npm link
```
Kiểm tra xem CLI đã sẵn sàng chưa:
```bash
a2g --version
# Kết quả hiển thị: 0.1.0
```

---

## 3. Hướng dẫn cấu hình URL MCP Server trên Gemini Web

> [!IMPORTANT]
> **Đoạn chat trên Gemini phải thuộc Nhiệm vụ (Task / Workspace) có bật MCP Tools**. Gemini Web chỉ kích hoạt khả năng gọi công cụ MCP trong không gian nhiệm vụ, không gọi được trong cuộc trò chuyện thông thường.

### Thông số MCP Server:
- **URL máy chủ MCP:** `https://<your-tunnel-domain>/mcp` *(hoặc `http://127.0.0.1:48765/mcp`)*
- **Client ID:** Bỏ trống
- **Client Secret:** Bỏ trống

### Các bước thực hiện:
1. Mở Chrome truy cập [gemini.google.com](https://gemini.google.com).
2. Vào đoạn chat thuộc **Nhiệm vụ (Task)** của bạn.
3. Bấm vào biểu tượng **Công cụ (Tools / MCP Server)** hoặc dấu `+` để thêm công cụ mới.
4. Chọn **Thêm máy chủ MCP (Add MCP Server)**:
   - Điền URL: `https://<your-tunnel-domain>/mcp`
   - Bỏ trống 2 ô Client ID và Client Secret.
5. Nhấn **Kết nối (Connect)**. Trình duyệt chuyển hướng đến màn hình xác thực OAuth `Authorize Antigravity Bridge`.
6. Mở terminal, chạy lệnh sau để lấy mã ghép đôi:
   ```powershell
   a2g pair
   ```
   Hệ thống sẽ in ra mã 6 số (ví dụ: `849201`, có hiệu lực 5 phút).
7. Nhập mã này vào ô xác thực trên trình duyệt và bấm **Xác nhận (Authorize)**.
8. Kết nối hoàn tất! Gemini Web sẽ nhận diện 6 công cụ Read-only: `read_file`, `list_directory`, `search_files`, `git_status`, `git_diff`, `get_workspace_info`.

---

## 4. Hướng dẫn cài đặt Extension Chrome (Tampermonkey) điều khiển

Extension đóng vai trò là "Người đưa thư" điều khiển trình duyệt: nhận câu hỏi từ Antigravity, tự động gõ vào ô chat Gemini, chờ Gemini suy nghĩ xong và gửi kết quả về.

### Bước 4.1: Cài đặt Tampermonkey trên Chrome
Truy cập [Tampermonkey trên Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) và chọn **Thêm vào Chrome (Add to Chrome)**.

### Bước 4.2: BẬT Chế độ nhà phát triển (Developer Mode) trên Chrome
> [!WARNING]
> Từ phiên bản Chrome Manifest V3, tiện ích mở rộng muốn chạy UserScripts bắt buộc phải bật Developer mode, nếu không Tampermonkey sẽ không chạy được script can thiệp vào trang web.

1. Trên thanh địa chỉ Chrome, nhập: `chrome://extensions/` và nhấn Enter.
2. Tìm công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên cùng bên phải và **BẬT (ON)** nó lên.

### Bước 4.3: Cài đặt Script điều khiển vào Tampermonkey
1. Bấm vào biểu tượng Tampermonkey trên thanh công cụ Chrome -> Chọn **Dashboard (Bảng điều khiển)**.
2. Chọn tab **Tiện ích (Utilities)**.
3. Trong phần **Cài đặt từ tệp (Install from file)**, nhấn **Choose File** và chọn file:
   `userscript/gemini-antigravity-bridge.user.js` nằm trong thư mục repository.
4. Nhấn **Cài đặt (Install)**.

### Bước 4.4: Sử dụng Widget điều khiển trên Gemini Web
1. Truy cập [gemini.google.com](https://gemini.google.com).
2. Góc dưới cùng bên phải màn hình sẽ xuất hiện một widget hình con nhộng:
   - 🟢 **`Gehihi: Sẵn sàng (Idle)`**: Đang chờ nhiệm vụ.
   - 🟡 **`Gehihi: Đang nạp câu hỏi...`**: Đang tự động dán văn bản vào ô chat `rich-textarea`.
   - 🟣 **`Gehihi: Đang suy nghĩ (Xs)...`**: Gemini đang suy nghĩ và gọi các công cụ MCP.
   - 🔵 **`Gehihi: Đang sinh câu trả lời (Xs)...`**: Gemini đang xuất câu trả lời.
   - 🟡 **`Gehihi: Đang gửi kết quả về...`**: Trích xuất nội dung sạch và gửi về Antigravity.
3. **Mẹo đổi URL:** Click chuột trực tiếp vào widget để đổi Bridge URL (ví dụ: chuyển giữa `https://<your-tunnel-domain>` và `http://127.0.0.1:48765`).

---

## 5. Cấu hình Cloudflare Tunnel riêng (Tuỳ chọn)

Để tạo tên miền public cho máy chủ của bạn qua Cloudflare Tunnel:

1. Cài đặt `cloudflared`:
   - Windows: `winget install Cloudflare.cloudflared`
   - macOS: `brew install cloudflared`
   - Linux: `sudo apt install cloudflared`
2. Đăng nhập và tạo tunnel:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create a2g-bridge
   cloudflared tunnel route dns a2g-bridge <ten-mien-cua-ban>
   ```
3. Cấu hình file `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: <TUNNEL_UUID>
   credentials-file: /path/to/<TUNNEL_UUID>.json
   ingress:
     - hostname: <ten-mien-cua-ban>
       service: http://127.0.0.1:48765
     - service: http_status:404
   ```
4. Khởi chạy tunnel:
   ```bash
   cloudflared tunnel run a2g-bridge
   ```

---

## 6. Tích hợp Antigravity Skill

Để Antigravity tự động kích hoạt chế độ phối hợp cùng Gemini Web:
Sao chép thư mục `skill/gemini-with-antigravity` vào thư mục skills của dự án:
```powershell
Copy-Item -Path "skill\gemini-with-antigravity" -Destination ".agents\skills\gemini-with-antigravity" -Recurse -Force
```

---

## 7. Kiểm tra hoạt động toàn diện (End-to-End Verification)

1. Kiểm tra trạng thái hệ thống:
   ```powershell
   a2g status
   ```
2. Gửi câu hỏi đầu tiên:
   ```powershell
   a2g ask "Xin chào Gemini! Bạn hãy kiểm tra xem dự án hiện tại có những file nào?"
   ```
3. Quan sát màn hình Chrome: Trình duyệt sẽ tự động gõ câu hỏi, Gemini gọi công cụ `list_directory` và trả lời, sau đó kết quả được in trực tiếp ra Terminal của bạn.

---

## 8. Xử lý lỗi thường gặp (Troubleshooting)

- **Lỗi `EADDRINUSE 48765`**: Chạy `a2g stop` để tắt tiến trình cũ.
- **Lỗi không gọi được MCP**: Đảm bảo đoạn chat thuộc **Nhiệm vụ (Task)**, không phải cuộc trò chuyện thông thường.
- **Extension không gõ được**: Đảm bảo đã bật **Developer mode** trong `chrome://extensions/` và widget hiển thị màu xanh lá.
