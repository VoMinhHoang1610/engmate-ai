# Build và chạy Docker — 11/11/2026

- Build thành công image backend và frontend bằng Docker Compose; các bước
  biên dịch frontend (`tsc --noEmit`, `vite build`) dùng cache build hợp lệ.
- Sửa dòng `.env` bị lặp tên biến thành
  `OAUTH_PUBLIC_ORIGIN=http://127.0.0.1:5174`. Lỗi này trước đó khiến backend
  thoát khi Pydantic kiểm tra cấu hình. Không ghi khóa hoặc mật khẩu vào báo cáo.
- Khởi chạy backend/frontend; tạo lại frontend với `--build --force-recreate`
  để dùng image mới. Cả hai container đạt trạng thái `healthy`.
- Giao diện: <http://127.0.0.1:5174>; Swagger: <http://127.0.0.1:8010/docs>.
- `scripts/smoke.py` qua health, frontend, proxy, capabilities và các route
  chat/learning trong OpenAPI.
- `/api/ready` trả HTTP 200: MySQL, schema version 1, provider Gemini.
- Không gọi API AI tính phí hoặc chạy test ghi vào database ứng dụng.
  Chưa kiểm chứng chat/thoại với nhà cung cấp hoặc đăng nhập OAuth thật.
- Không đổi mã nguồn; không chạy lại lint, unit test hoặc coverage trong tác vụ
  vận hành này. Không commit hoặc push.

Chạy lại tại thư mục gốc:

```powershell
docker compose up -d --build --wait --wait-timeout 180 backend frontend
```

Dừng khi không dùng:

```powershell
docker compose stop frontend backend
```

Ghi báo cáo riêng vì `docs/PROGRESS.md` đã bị xóa trong working tree trước tác
vụ. Giữ nguyên các thay đổi có sẵn và container chia sẻ cũ đang dừng.
