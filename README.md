# Hướng Dẫn Đăng Tải Lên GitHub Pages (Publish to GitHub Pages)

Dự án thiệp cưới trực tuyến của bạn đã được cấu hình hoàn tất để sẵn sàng xuất bản và lưu trữ miễn phí trên **GitHub Pages**. Dưới đây là các bước chi tiết để bạn đưa trang web lên internet.

---

## 📌 Các bước chuẩn bị trước khi deploy

### Bước 1: Khởi tạo Repository trên GitHub
1. Truy cập vào trang [GitHub](https://github.com/) và đăng nhập vào tài khoản của bạn.
2. Nhấp vào nút **New** (hoặc dấu `+` ở góc phải) để tạo một Repository mới.
3. Đặt tên cho Repository (ví dụ: `Wedding-Inv` hoặc `thiep-cuoi`).
4. Để chế độ **Public** (Bắt buộc phải công khai để sử dụng GitHub Pages miễn phí).
5. Nhấp **Create repository** (Giữ nguyên các tùy chọn khác, không tích chọn thêm README hay .gitignore mới).

### Bước 2: Đường dẫn trang web của bạn đã được cấu hình tối ưu nhất!
Để thuận tiện và giải quyết dứt điểm lỗi màn hình trắng, tôi đã trực tiếp cập nhật cấu hình:
- **Đường dẫn tương đối (`base: './'`)** trong `vite.config.ts`: Giúp toàn bộ tài nguyên (JS, CSS, hình ảnh, nhạc) tải chính xác tuyệt đối mà không cần phụ thuộc cứng vào tên Repository `wedding_invitation` hay cấu hình tên miền riêng.
- **Tệp loại bỏ bộ lọc Jekyll (`.nojekyll`)** trong thư mục `/public`: Đã được thêm vào và sẽ tự động được sao chép vào thư mục `/dist` khi build. Tệp này thông báo cho máy chủ GitHub Pages bỏ qua trình xử lý Jekyll, giúp toàn bộ mã nguồn React & Vite được tải đầy đủ và nguyên vẹn, sửa tận gốc lỗi trắng màn hình do một số tệp tin bị hệ thống của GitHub chặn.

> **⚠️ LƯU Ý QUAN TRỌNG:** Vì các thay đổi này được cập nhật trên công cụ AI Studio, bạn **bắt buộc phải Export/Tải về dự án mới nhất** (hoặc đồng bộ mã nguồn mới nhất từ AI Studio về máy tính của bạn) sau đó thực hiện lệnh **`npm run deploy`** một lần nữa để các cấu hình này được áp dụng và ghi đè phiên bản cũ đang bị lỗi trên GitHub Pages của bạn!

---

## 🚀 Thực hiện đẩy code và Deploy lên GitHub Pages

Sử dụng Terminal hoặc Git Bash trên máy tính của bạn và thực hiện tuần tự các lệnh sau:

### 1. Khởi tạo Git và liên kết với GitHub
Di chuyển vào thư mục dự án của bạn và chạy:
```bash
# Khởi tạo git cục bộ
git init

# Thêm tất cả các file vào git
git add .

# Tạo commit đầu tiên
git commit -m "Initial commit - Wedding Invitation"

# Tạo nhánh chính là main
git branch -M main

# Liên kết với repository trên GitHub của bạn
# (Thay đường dẫn bên dưới bằng đường dẫn repository thực tế của bạn)
git remote add origin https://github.com/<TÊN_TÀI_KHOẢN_GITHUB>/<TÊN_REPOSITORY_CỦA_BẠN>.git
```

### 2. Đẩy mã nguồn lên nhánh chính (main)
```bash
git push -u origin main
```

### 3. Deploy lên GitHub Pages tự động bằng 1 lệnh duy nhất!
Chúng tôi đã tích hợp sẵn thư viện `gh-pages` và cấu hình lệnh tự động xây dựng sản phẩm tối ưu. Bạn chỉ cần chạy lệnh sau:
```bash
npm run deploy
```

> **Lệnh này tự động làm gì?**
> 1. Chạy `npm run build` để đóng gói toàn bộ mã nguồn của bạn vào thư mục `/dist`.
> 2. Đẩy riêng thư mục `/dist` đã biên dịch lên một nhánh đặc biệt có tên là `gh-pages` trên GitHub của bạn.

---

## ⚙️ Thiết lập trên giao diện GitHub (Nếu cần)

Thông thường sau khi chạy `npm run deploy`, GitHub Pages sẽ tự động kích hoạt. Để chắc chắn:
1. Trên repository GitHub của bạn, truy cập vào mục **Settings** (Cài đặt).
2. Tìm và chọn mục **Pages** ở thanh menu bên trái.
3. Ở phần **Build and deployment**, đảm bảo:
   - **Source**: Chọn `Deploy from a branch`
   - **Branch**: Chọn `gh-pages` và thư mục `/ (root)`.
4. Nhấn **Save** (Lưu).

Chờ từ 1-2 phút, trang web của bạn sẽ hoạt động tại địa chỉ URL đã cấu hình trong mục `"homepage"`!

---

## 💍 Các tính năng đã được tối ưu cho GitHub Pages của bạn
- **Đường dẫn tương đối (`base: './'`)**: Giúp website tải hình ảnh, nhạc, font chữ chính xác kể cả khi chạy ở thư mục con của GitHub Pages.
- **Điều hướng Hash-routing (`#schedule`)**: Người xem có thể chuyển đổi mượt mà giữa thiệp cưới và lịch trình trực tiếp mà không gặp lỗi `404 Not Found` khi tải lại trang.
- **Lưu trữ trạng thái (Local Storage)**: Trạng thái lịch trình và cài đặt được ghi nhớ trực tiếp trên trình duyệt của khách mời hoặc thiết bị của bạn.
