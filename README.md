# EngMate-AI

Khung phát triển ứng dụng luyện tiếng Anh với AI. Frontend dùng React + TypeScript strict + Vite + Tailwind; backend dùng Python + FastAPI + Pydantic v2. AI mặc định là mock, không gọi API tính phí.

Khung đã kiểm chứng local ngày 2026-10-04: 29 test qua, coverage khung 100% hai phía; lint/build/pre-commit và Docker smoke đều qua. Chi tiết và giới hạn xem [nhật ký tiến độ](docs/PROGRESS.md).

## Cấu trúc

```text
backend/
  app/api/          Routes và dependency injection
  app/core/         Cấu hình được kiểm tra kiểu
  app/schemas/      Request/response Pydantic
  app/services/     Điều phối nghiệp vụ
  app/llm/          Interface và mock AI
  app/prompts/      Prompt có phiên bản
  app/db/, models/  Vị trí dành cho DB/migrations từ bước tiếp theo
  tests/unit/       Test cấu hình và service
  tests/integration/ Test API, validation, CORS và timeout
frontend/
  src/api/          HTTP client và test hợp đồng
  src/components/   UI trạng thái kết nối
  src/hooks/        Logic tải dữ liệu và test vòng đời
  src/pages/        Trang khởi tạo
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

Compose chạy backend và frontend, proxy trỏ tới backend qua mạng Docker. Đây là stack phát triển; production frontend build tạo thư mục `frontend/dist/`. DB chưa được tích hợp vào khung này. Cổng mặc định 8010/5174 giúp tránh các ứng dụng hiện có đang dùng 8000/5173.

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

Compose đọc `.env` ở root. Backend local đọc biến môi trường của tiến trình; task runner không tự nạp `.env`. Không đặt API key trong biến frontend `VITE_*`.

## Tài liệu

- [Thiết kế SQL Server: khảo sát, ERD, từ điển dữ liệu và giao dịch](docs/DATABASE_SQLSERVER.md)
- [Script SQL Server và cách triển khai/kiểm thử](database/sqlserver/README.md) — 22 bảng, 2 view; backend chưa kết nối DB.

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

Khung hiện có health, AI mock và trang trạng thái kết nối. Auth, DB, chat streaming, phân tích lỗi học tập và provider thật nằm trong backlog. Kết quả local không thay thế kết quả GitHub Actions; xem nhật ký để biết phạm vi đã kiểm chứng.
