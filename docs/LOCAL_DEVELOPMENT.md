# Chạy và cấu hình EngMate-AI

Các lệnh trong tài liệu chạy từ root repo. [README](../README.md) có luồng demo ngắn; [API](API.md) mô tả hợp đồng và [TESTING](TESTING.md) hướng dẫn môi trường kiểm thử riêng.

## Bộ lệnh dùng chung

`python scripts/manage.py <task>` chạy trên Windows/Linux/macOS. Windows PowerShell có wrapper dùng Python trong `.venv` nếu đã cài; không cần activate venv hoặc GNU Make:

```bash
.\make.cmd setup
.\make.cmd docker-up
```

Linux/macOS có GNU Make có thể dùng wrapper tương ứng:

```bash
make setup
make dev
```

`setup` tạo `.venv`, cài backend từ `requirements-dev.txt` và editable package, frontend bằng `npm ci`, rồi tạo `.env` nếu chưa có. Lockfile là `backend/requirements*.txt` và `frontend/package-lock.json`; cache nằm trong `.cache/`. Task runner gọi `npm.cmd` trên Windows để tránh phụ thuộc quyền chạy `npm.ps1`.

Các task bổ trợ:

```bash
python scripts/manage.py hooks
python scripts/manage.py pre-commit
python scripts/manage.py format
```

`hooks` cài Git hook lint; `pre-commit` kiểm tra toàn bộ file; `format` sửa định dạng. Khi chủ động đổi dependency, cập nhật khai báo và lockfile bằng:

```bash
python scripts/manage.py lock
python scripts/manage.py setup
```

Không cần chạy `lock` để sử dụng repo. Sau khi thay dependency, chạy lại lint/test/coverage/build theo [TESTING](TESTING.md).

## Đổi cổng và proxy

Port trong `.env` chỉ điều khiển cổng host Compose. Backend container lắng nghe 8000, frontend container 5174. Compose đặt proxy frontend thành `http://backend:8000` và tự nạp `.env` root. Backend local cũng nạp `.env` root nhưng không ghi đè biến terminal.

Local dùng `--port` của task runner. Ví dụ Windows PowerShell, trong hai terminal:

```bash
# Terminal backend
python scripts/manage.py dev-backend --port 8011
```

```bash
# Terminal frontend (PowerShell)
$env:BACKEND_URL = 'http://127.0.0.1:8011'
python scripts/manage.py dev-frontend --port 5175
```

Nếu web gọi trực tiếp backend từ origin khác, cập nhật `CORS_ORIGINS`. `BACKEND_URL` của frontend cần đặt trong process chạy Vite; frontend không tự dùng `.env` root cho proxy local. Không đưa key/token vào biến `VITE_*`.

Smoke có thể kiểm tra cổng khác. Ví dụ PowerShell:

```bash
$env:SMOKE_BACKEND_URL = 'http://127.0.0.1:8011'
$env:SMOKE_FRONTEND_URL = 'http://127.0.0.1:5175'
python scripts/manage.py smoke
```

Kiểm tra cấu hình Compose mà không khởi động stack:

```bash
python scripts/manage.py docker-check
```

Compose là môi trường dev, frontend dùng Vite proxy. `build` xuất frontend static vào `frontend/dist/`; hướng dẫn này chưa cấu hình server/proxy production. Docker backend có ODBC Driver 18 và ffmpeg; media nằm ở volume `learning-media`, không bị xóa bởi task `down`.

## Bật API SQL Server

1. Cài dependencies local theo README. Host Windows cần ODBC Driver 17 hoặc 18, SQL Server 2019+; bộ API đã test trên SQL Server 2022. Host Linux cần thư viện ODBC hệ thống để import pyodbc; Docker image cài sẵn. WebM/Ogg cần `ffprobe` trong PATH; WAV không cần decoder ngoài.
2. Tạo database ứng dụng rỗng bằng SSMS/quyền quản trị theo [database/sqlserver/README.md](../database/sqlserver/README.md). Backend không tự tạo database, không chạy DDL lúc startup.
3. Đặt `DATABASE_ODBC_CONNECTION` và `JWT_SECRET` trong `.env` root. Mẫu Windows Authentication không chứa mật khẩu:

```dotenv
DATABASE_ODBC_CONNECTION=DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=EngMateAI;Trusted_Connection=yes;TrustServerCertificate=yes
JWT_SECRET=<chuoi-ngau-nhien-rieng-it-nhat-32-ky-tu>
```

Thay placeholder bằng secret riêng. `.env.example` có cách sinh secret; không ghi secret thật vào source/log/PR. Ví dụ trên dành cho dev với certificate tự ký; môi trường khác cần TLS/certificate phù hợp.

4. Chạy migration chủ động, sau đó backend:

```bash
python scripts/manage.py migrate-backend
python scripts/manage.py dev-backend
```

Runner áp dụng schema/seed/views 001–003 trong transaction, kiểm tra schema version; chạy lại v1 không tạo schema hoặc seed trùng. Version không hỗ trợ bị từ chối để yêu cầu migration được review. Test rollback luôn dùng `tempdb`, không dùng database ứng dụng.

Mở `/docs`, gọi `/api/auth/register`, lấy access token rồi dùng Authorize để thử API riêng tư. Tài khoản `abc / 123` trên frontend chỉ là dữ liệu demo. `/api/health` kiểm tra tiến trình; `/api/ready` kiểm tra kết nối/schema SQL. Thiếu DB/schema trả 503, không trả connection string.

Schema SQL v1 chỉ lưu CEFR A2/B1/B2, 22 bảng/2 view, seed 8 chủ đề/9 bài. UI/mock có bảy mức và Reading/làm quen lưu localStorage; xem ánh xạ ở [API](API.md). UI không tự nhập dữ liệu localStorage hoặc dùng các token SQL.

### SQL từ Docker

Connection cần `ODBC Driver 18 for SQL Server`, server TCP truy cập được từ container và SQL Authentication. SQL trên Windows host thường dùng `host.docker.internal,<cong-TCP>`. Không dùng Windows `Trusted_Connection` từ Linux container khi chưa cấu hình Kerberos. Compose không tạo SQL Server container.

Sau khi tạo database và cấu hình `.env` riêng cho Docker:

```bash
docker compose -p engmate-ai run --rm backend python -m app.db.migrate
```

Lệnh này ghi schema/catalog vào database đã chỉ định. Chỉ chạy sau khi đã kiểm tra database đích; không dùng connection test hoặc production để thử hướng dẫn. Cấu hình SMTP host/sender chỉ cần khi thử reset mật khẩu; delivery thật phụ thuộc server SMTP của bạn.

## OpenAPI và công cụ API

```bash
python scripts/manage.py export-api
```

Xuất `.artifacts/api/openapi.json` để import Postman hoặc sinh client. Không cần database. Swagger luôn ở `/docs`; Postman không phải điều kiện chạy demo.

## Phạm vi kiểm chứng lệnh

Setup, lint/test/coverage/build, export-api và docker-check được chạy trên Windows; local dev/smoke được thử trên cổng 18012/15176 và đã dừng process test. Docker Compose/smoke đã qua bằng project riêng trong tác vụ merge cùng ngày; lần viết README không chạy lại docker-up/down mặc định vì project `engmate-ai` của người dùng đang chạy. Chi tiết kết quả ở [PROGRESS](PROGRESS.md).

Các wrapper GNU Make/Linux/macOS, `lock`, cài hooks và migration bằng CLI trên database ứng dụng được đối chiếu với task runner nhưng không chạy lại trong lần viết README này. Python/Node tối thiểu được lấy từ manifest; máy kiểm chứng dùng Python 3.13.11 và Node 25.9.0, Docker/CI khai báo 3.13/24. Migration logic đã có integration test rollback. SMTP thật, Kerberos và triển khai production không thuộc phép thử local.
