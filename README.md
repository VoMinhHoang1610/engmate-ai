# EngMate-AI

Ứng dụng demo luyện tiếng Anh với AI. Frontend dùng React + TypeScript strict + Vite + Tailwind; backend dùng Python + FastAPI + Pydantic v2. AI mặc định là mock, không gọi API tính phí.

Kiểm chứng bản tích hợp ngày 2026-10-07: **57 backend + 56 frontend tests qua** (21 SQL integration), coverage backend 92,83%; frontend statements 85,88%, branches 84,34%, functions 81,36%, lines 88,27%. Lint/build qua; kết quả Docker/Git cuối và giới hạn xem [nhật ký tiến độ](docs/PROGRESS.md). CI mới chưa chạy trên GitHub.

Bản tích hợp `develop` có giao diện đa trang, backend và schema SQL Server. Frontend có 10 trang học tập và trang đăng nhập riêng, linh thú Mate, theme sáng/tối, giảm chuyển động và lưu dữ liệu trong trình duyệt. Hội thoại gọi `/api/ai/reply` dùng mock. Backend có API tài khoản/JWT, hồ sơ/cài đặt, catalog, hội thoại, luyện tập, từ vựng/flashcard, media và dashboard; xem [API.md](docs/API.md).

**Demo giao diện hiện dùng localStorage và tài khoản abc / 123 tại #dang-nhap.** Các API lưu dữ liệu SQL/JWT thử riêng qua Swagger; UI chưa nối chúng. Không cần DB/API key để demo giao diện và AI mock. OAuth, chấm nói/viết AI thật và STT chưa có.

## Cấu trúc

```text
backend/
  app/api/          Routes và dependency injection
  app/core/         Cấu hình được kiểm tra kiểu
  app/schemas/      Request/response Pydantic
  app/services/     Điều phối nghiệp vụ
  app/llm/          Interface và mock AI
  app/prompts/      Prompt có phiên bản
  app/db/, models/  SQLAlchemy Core/pyodbc, reflection và migration SQL Server
  tests/unit/       Test cấu hình và service
  tests/integration/ Test API, validation, CORS và timeout
frontend/
  src/api/          HTTP client và test hợp đồng
  src/components/   UI, icon, menu avatar và linh thú Mate
  src/demo/         Dữ liệu mẫu, localStorage và browser audio
  src/hooks/        Logic health API và test vòng đời
  src/pages/        10 trang học tập, đăng nhập và health cũ
  src/types/        Kiểu dữ liệu dùng chung
  tests/            Thiết lập Vitest/React Testing Library
  e2e/              Dành cho E2E khi triển khai luồng nghiệp vụ
scripts/            Bộ lệnh Python chung cho Windows/Linux và HTTP smoke
docs/               Yêu cầu, kiến trúc, API, kiểm thử và nhật ký tiến độ
.github/workflows/  CI lint, test, coverage, build và Docker smoke
```

## Cài đặt

Cần Python 3.11+ (Docker/CI dùng 3.13), Node.js 22.12+ (Docker/CI dùng 24), npm và Git. Docker Desktop chỉ cần khi chạy Compose. Không cần GNU Make trên Windows.

```powershell
# Windows, từ thư mục gốc repo
.\make.cmd setup
.\make.cmd hooks
```

`setup` tạo `.venv` nếu chưa có, cài backend editable và frontend từ lockfile, tạo `.env` nếu thiếu. Các cache nằm trong `.cache/`. Bản nguồn trước reset nằm trong `.artifacts/before-reset-*`, được Git bỏ qua.

Trên mọi hệ điều hành có thể dùng `python scripts/manage.py setup`. Linux/macOS có GNU Make có thể dùng `make setup`; Makefile gọi cùng bộ lệnh Python.

## Chạy local

Hướng dẫn trình diễn, tài khoản demo và bảng các nhánh đã hợp nhất: [DEMO_DEVELOP.md](docs/DEMO_DEVELOP.md).

```powershell
# Terminal 1
.\make.cmd dev-backend
# Terminal 2
.\make.cmd dev-frontend
```

- Web: http://127.0.0.1:5174
- API: http://127.0.0.1:8010/api/health
- Swagger: http://127.0.0.1:8010/docs

Frontend gọi `/api/health` qua Vite proxy. Proxy mặc định trỏ tới backend cổng 8010; không cần cấu hình URL API trong mã UI.

Đổi cổng bằng `dev-backend --port 8011` / `dev-frontend --port 5175`. Khi đổi cổng backend, đặt `$env:BACKEND_URL = 'http://127.0.0.1:8011'` trong terminal frontend. Nếu chạy web ngoài Vite proxy, cấu hình CORS theo origin thực tế.

## Chạy Docker

```powershell
.\make.cmd docker-up
.\make.cmd smoke
.\make.cmd down
```

Compose chạy backend/frontend, proxy qua mạng Docker. Đây là stack dev; production frontend build tạo `frontend/dist/`. Backend image có ODBC Driver 18 và ffmpeg; volume `learning-media` giữ upload. Mặc định không bật DB: health/mock demo vẫn chạy, API lưu dữ liệu trả 503. Cổng mặc định 8010/5174.

## Bật backend SQL Server

1. Cài dependencies bằng `python scripts/manage.py setup-backend`. Host Windows cần ODBC Driver 17 hoặc 18 và SQL Server 2019+; đã kiểm thử trên SQL Server 2022. WebM/Ogg cần ffmpeg/ffprobe trong PATH; WAV không cần công cụ ngoài.
2. Tạo database ứng dụng rỗng bằng quyền quản trị theo [hướng dẫn SQL Server](database/sqlserver/README.md); runner không tự tạo database. Không chạy bộ test rollback trên database ứng dụng.
3. Trong `.env` root, đặt `DATABASE_ODBC_CONNECTION` trỏ vào database đó và `JWT_SECRET` ngẫu nhiên ít nhất 32 ký tự. Ví dụ connection Windows auth (không có password): `DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=EngMateAI;Trusted_Connection=yes;TrustServerCertificate=yes`. Sinh secret riêng bằng Python secrets như `.env.example`, không đưa vào source/VITE_*.
4. Chạy migration và backend:

```powershell
python scripts/manage.py migrate-backend
python scripts/manage.py dev-backend
```

Runner áp dụng schema v1, seed và views trong transaction; chạy lại v1 không tạo schema lần hai, seed không thêm trùng. Version khác bị từ chối để yêu cầu migration được review. App không chạy DDL lúc startup. `/api/health` là liveness; `/api/ready` xác nhận SQL Server/schema sẵn sàng.

Mở `http://127.0.0.1:8010/docs`, gọi register, lấy access_token rồi bấm Authorize để thử các API riêng tư. Các lỗi DB/schema đều trả 503 có thông báo cấu hình; không trả connection string. Tài khoản demo frontend abc/123 không phải tài khoản backend.

Docker: connection dùng `ODBC Driver 18 for SQL Server`, SQL authentication và server TCP truy cập được từ container (Windows host thường là `host.docker.internal,<cổng>`), không dùng Windows Trusted_Connection khi chưa cấu hình Kerberos. Dùng TLS/certificate phù hợp với server; TrustServerCertificate chỉ dành cho môi trường dev với certificate tự ký. Compose chuyển biến DB/JWT/SMTP vào backend và mount scripts; có thể chạy `docker compose -p engmate-ai run --rm backend python -m app.db.migrate` sau khi cấu hình database. Không có SQL Server container mặc định trong stack app.

Không cấu hình DB/JWT thì chỉ có demo mock không lưu. Thêm API key không tự bật AI thật: LLM_PROVIDER hiện chỉ chấp nhận mock. SMTP host/sender cần cấu hình để gửi reset link; OAuth, STT, streaming và provider thật còn backlog.

## Lệnh kiểm chứng

```powershell
.\make.cmd lint          # Ruff, Black, mypy strict, ESLint, TypeScript, Prettier
.\make.cmd test          # pytest và Vitest
.\make.cmd coverage      # kiểm tra ngưỡng 80% cho hai phía
.\make.cmd build         # type-check và Vite production build
.\make.cmd pre-commit    # chạy các hook ngay
.\make.cmd docker-check  # kiểm tra Compose
.\make.cmd smoke         # cần stack đang chạy; kiểm tra cả proxy và AI mock
```

Lệnh tương ứng trên mọi hệ điều hành: `python scripts/manage.py <tên-lệnh>`. Lệnh `format` sửa định dạng; `lock` chỉ chạy khi chủ động đổi dependency, sau đó chạy lại setup và kiểm chứng. `smoke` đọc `SMOKE_BACKEND_URL` / `SMOKE_FRONTEND_URL` nếu cổng khác mặc định.

## Biến môi trường

| Biến | Giá trị mặc định / tác dụng |
| --- | --- |
| `APP_NAME` | `EngMate-AI`, tiêu đề OpenAPI |
| `LLM_PROVIDER` | `mock`; provider khác bị từ chối khi khởi động vì chưa có adapter |
| `CORS_ORIGINS` | Danh sách origin cách nhau bằng dấu phẩy; mặc định localhost/127.0.0.1:5174 |
| `BACKEND_PORT`, `FRONTEND_PORT` | Cổng host Compose; mặc định 8010/5174 |
| `BACKEND_URL` | Vite proxy local; mặc định `http://127.0.0.1:8010` |
| `SMOKE_BACKEND_URL`, `SMOKE_FRONTEND_URL` | URL stack cần kiểm tra HTTP |

Compose đọc `.env` ở root. Không đặt API key trong biến frontend `VITE_*`.

Backend hiện tự nạp `.env` root qua python-dotenv, không ghi đè biến đã đặt trong process. Biến mới: `DATABASE_ODBC_CONNECTION`, `JWT_SECRET`, `ACCESS_TOKEN_MINUTES=15`, `REFRESH_TOKEN_DAYS=30`, `AUTH_REQUESTS_PER_MINUTE=30`, `MEDIA_DIRECTORY=.artifacts/media`, `SMTP_HOST/PORT/USERNAME/PASSWORD/SENDER`, `FRONTEND_URL`; xem chú thích `.env.example`.

Để đo coverage đầy đủ, đặt connection kiểm thử chỉ vào **tempdb với schema em chưa tồn tại**:

```powershell
$env:SQLSERVER_TEST_ODBC_CONNECTION = 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=tempdb;Trusted_Connection=yes;TrustServerCertificate=yes'
python scripts/manage.py coverage
```

Tests tạo DDL/catalog trong outer transaction, rollback cả schema và dữ liệu; không dùng API trả phí hoặc gửi email thật. `test-backend` khi thiếu connection vẫn chạy test không cần DB và báo skip SQL integration; coverage đầy đủ cần SQL Server. CI chuẩn bị SQL Server Developer riêng và ODBC 18 để các test SQL không bị bỏ qua.

`python scripts/manage.py export-api` xuất OpenAPI vào `.artifacts/api/openapi.json`, không cần DB; có thể import Postman để gọi API.

## Tài liệu

- [Thiết kế SQL Server: khảo sát, ERD, từ điển dữ liệu và giao dịch](docs/DATABASE_SQLSERVER.md)
- [Script SQL Server và cách triển khai/kiểm thử](database/sqlserver/README.md) — 22 bảng, 2 view; backend đã có repository/API.

- [Quy tắc dành cho agent](AGENT.md) và [quy ước dự án](CLAUDE.md)

- [Yêu cầu và backlog](docs/REQUIREMENTS.md)
- [Kiến trúc](docs/ARCHITECTURE.md)
- [API hiện có](docs/API.md)
- [Kiểm thử và truy vết](docs/TESTING.md)
- [Tiến độ và kết quả chạy thật](docs/PROGRESS.md)
- [Quyết định kỹ thuật](docs/DECISIONS.md)
- [Changelog](docs/CHANGELOG.md)
- [Prompt](docs/PROMPTS.md)
- [Kế hoạch code tiếp theo](docs/IMPLEMENTATION_PLAN.md)

Bản develop đã hợp nhất frontend demo đa trang, backend SQL Server và auth/JWT. UI vẫn dùng localStorage, trừ hội thoại gọi API mock. Nối giao diện đa trang, OAuth, AI/STT thật và streaming là bước tiếp. Kết quả local không thay thế GitHub Actions; xem nhật ký để biết phạm vi đã kiểm chứng.
