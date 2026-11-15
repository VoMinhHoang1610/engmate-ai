# Rà soát tổng quan và chạy Docker — 06/11/2026

## Kết quả

Dự án build được bằng Docker. Backend và frontend được khởi chạy bằng Compose
ở chế độ phát triển, dùng MySQL đã cấu hình bên ngoài Compose.

- Giao diện: <http://127.0.0.1:5174>.
- Backend/OpenAPI: <http://127.0.0.1:8010/docs>.
- Health API: <http://127.0.0.1:8010/api/health>.

## Tổng quan chương trình

| Thành phần | Vai trò và nhận xét |
| --- | --- |
| React/TypeScript/Vite | `src/main.tsx` mặc định mở `LiveApp` → `App`; quản lý đăng nhập, hội thoại, hồ sơ, cài đặt và không gian học. `?mode=preview` là giao diện minh họa riêng. |
| FastAPI | `app/main.py` lắp các router auth/OAuth, chat, learning, speech và voice; tách router, service, database và adapter LLM. |
| MySQL/SQLAlchemy | Lưu tài khoản, phiên, hồ sơ, lịch sử và tiến độ. SQL Server còn là adapter tương thích. Kết nối được mở lười; ứng dụng không tự chạy migration. |
| Xác thực | Mật khẩu Argon2, JWT access token và refresh token có thể thu hồi; token frontend giữ trong bộ nhớ. OAuth dùng state/cookie gắn trình duyệt và popup cùng origin. |
| Chat/thoại | Chat streaming SSE; luồng thoại mặc định Blaze STT → Gemini sinh văn bản → Blaze TTS. Có giới hạn tác vụ theo process/tài khoản, hủy request và xử lý ngắt lời. |
| Lộ trình TOEIC | Catalog có phiên bản, liên kết hội thoại với bài học; tiến độ dựa trên bằng chứng luyện tập và đáp án kiểm tra phía server. |
| Docker | Backend chạy bằng user không phải root; healthcheck, volume avatar và proxy HTTP/WebSocket frontend có sẵn. Hai cổng ứng dụng chỉ bind loopback. |

## Vấn đề đã sửa

Lệnh `docker compose build` ban đầu chỉ cài dependencies frontend, chưa biên
dịch TypeScript/Vite. Khi chạy `npm run build` trong container, TypeScript báo
`TS2307` tại `tests/ui-audit.tsx`: fixture đọc
`../../backend/app/content/toeic.v1.json`, nằm ngoài build context `./frontend`.

- Thêm `tests/ui-audit.*` vào `frontend/.dockerignore`: fixture trực quan vẫn
  dùng được local, không đóng gói trong image frontend.
- Thêm `RUN npm run build` sau bước copy source trong `frontend/Dockerfile`:
  Docker build hiện kiểm tra cả kiểu dữ liệu và bản biên dịch.
- Giữ nguyên unit tests, cấu hình TypeScript, assertions và ngưỡng coverage.
- Cập nhật phần Docker trong README. Không thay đổi nghiệp vụ hoặc cấu hình bí mật.

## Kết quả kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `scripts/manage.py lint` | Qua Ruff, Black, mypy, ESLint, TypeScript và Prettier. |
| `scripts/manage.py coverage-backend` | 210 passed, 24 skipped; coverage tổng hợp statement/branch **72,43%**, chưa đạt ngưỡng 80%; exit code 1 do coverage. |
| `npm run test:coverage -- --maxWorkers=1` | 35 file, 408 test qua; statements 89,49%, branches 81,67%, functions 85,70%, lines 92,71%; đạt toàn bộ ngưỡng 80%. |
| `scripts/manage.py build` | Production build frontend local qua. |
| `docker compose config --quiet` | Cấu hình hợp lệ. |
| `docker compose build` và build lại frontend sau sửa | Backend image qua; frontend image mới qua cả `tsc --noEmit` và `vite build`. |
| `docker compose up -d --wait --wait-timeout 180 backend frontend` | Backend và frontend khởi chạy, healthcheck qua. |
| `scripts/manage.py smoke` | Health trực tiếp và qua proxy, HTML, capabilities và các route chat/learning trong OpenAPI qua. |
| MySQL từ backend container | `SELECT 1` qua, schema version `[1]`; phản chiếu đủ các bảng nền, có các bảng learning và OAuth. Máy chủ dùng `lower_case_table_names=1`; đối chiếu tên bảng theo chế độ này. |

Lần chạy backend trong sandbox gặp hai lỗi quyền tạo thư mục tạm. Chạy lại
ngoài sandbox đã qua cả hai test; không sửa test để xử lý lỗi môi trường.
Build Vite local cũng cần chạy ngoài sandbox vì tiến trình esbuild bị chặn.

## Giới hạn và việc tiếp theo

1. Chưa cấu hình `MYSQL_TEST_URL`, nên 24 integration test MySQL bị bỏ qua.
   Cần database test mới có tên kết thúc `_test`, bootstrap riêng rồi chạy lại
   coverage. Không dùng database ứng dụng hiện có cho các test ghi dữ liệu.
2. Healthcheck chỉ xác nhận tiến trình HTTP hoạt động. Kiểm tra MySQL ở trên
   là phép đọc kết nối/schema, chưa chứng minh toàn bộ luồng lưu dữ liệu.
3. Không gọi Gemini/Blaze tính phí, không đăng nhập OAuth thật, không tạo tài
   khoản thử trên database đang dùng. Microphone, loa, độ trễ và ngắt lời trên
   thiết bị thật còn cần kiểm chứng riêng.
4. Compose hiện là môi trường dev, frontend phục vụ bằng Vite. Backend cần
   giữ một worker vì registry phiên, OAuth state và giới hạn tải nằm trong RAM.
5. Container `engmate-ai-share-1` cũ đang dừng, nằm ngoài stack hai dịch vụ
   được yêu cầu; không khởi chạy tunnel hoặc xóa container đó.

## Thao tác lại

Chạy tại root dự án:

```powershell
docker compose up -d --build --wait --wait-timeout 180 backend frontend
docker compose ps
docker compose logs -f backend frontend
```

Dừng hai dịch vụ khi không dùng:

```powershell
docker compose stop frontend backend
```

Báo cáo được ghi vào file riêng vì `docs/PROGRESS.md` đã ở trạng thái bị xóa
trước tác vụ; giữ nguyên thay đổi có sẵn đó. Không commit hoặc push.
