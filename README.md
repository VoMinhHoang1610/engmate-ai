# EngMate-AI

Ứng dụng demo luyện tiếng Anh với AI. Frontend dùng React + TypeScript strict + Vite + Tailwind; backend dùng Python + FastAPI + Pydantic v2. AI mặc định là mock, không gọi API tính phí.

Frontend hiện có 10 trang học tập responsive: tổng quan, hội thoại AI, luyện nói, chủ đề nhập vai, luyện nghe, luyện viết, sổ từ vựng, flashcard, hồ sơ và cài đặt. Đăng nhập/đăng ký/khôi phục tài khoản có trang riêng tại `#dang-nhap`, tách khỏi sidebar và thanh trên cùng của không gian học tập. Menu avatar dẫn đến trang đăng nhập; đăng nhập xong có nút vào không gian học tập. Dữ liệu và tùy chọn giao diện/âm thanh được lưu trong trình duyệt. Chi tiết kiểm chứng và giới hạn xem [nhật ký tiến độ](docs/PROGRESS.md).

Giao diện có linh thú **Mate** đồng hành ở tổng quan, hội thoại và luyện tập: chào, đeo tai nghe, suy nghĩ, động viên và ăn mừng theo kết quả học. Banner gradient, thẻ màu/cạnh nổi và hiệu ứng tương tác hỗ trợ sáng/tối và điện thoại. Tiêu đề và tùy chọn chỉ giữ nhãn cần thiết; hướng dẫn luyện nói/flashcard có thể mở khi cần. Chế độ Giảm chuyển động trong Cài đặt hoặc tùy chọn hệ thống tắt animation. Nguồn thiết kế và bản SVG của Mate nằm trong [hướng dẫn linh thú](docs/LINH_THU.md).

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
  src/components/   Thành phần giao diện và icon dùng chung
  src/demo/         Dữ liệu mẫu, lưu trữ và phát âm trình duyệt
  src/hooks/        Logic health API và test vòng đời
  src/pages/        10 trang demo và trang health cũ
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

Mở web tại `http://127.0.0.1:5174/#tong-quan`. Frontend gọi `/api/ai/reply` qua Vite proxy trên trang hội thoại; proxy mặc định trỏ tới backend cổng 8010 nên không cần cấu hình URL API trong mã UI.

Trang đăng nhập riêng: `http://127.0.0.1:5174/#dang-nhap`. Bố cục hai nửa với panel Mate navy/cyan cuộn sang khi đổi đăng nhập ↔ đăng ký; form “mở cuộn” theo hướng, sóng viền và tia sáng phụ. Có nút Google/Facebook/GitHub (mức giao diện, bấm sẽ báo chưa khả dụng). Các liên kết cũ `#tai-khoan` và `#cai-dat?muc=tai-khoan` cũng mở trang này. Cài đặt chỉ chứa tùy chọn học tập; khách có thể quay về học mà không đăng nhập. Phiên tài khoản hiện vẫn được mô phỏng trên trình duyệt, chưa có xác thực backend, OAuth hoặc gửi email.

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

Bản demo có tương tác cục bộ và AI mock. Auth, DB, chat streaming, STT/chấm phát âm, phân tích bài viết và provider thật nằm trong backlog; giao diện ghi rõ nơi đang dùng dữ liệu cố định hoặc mô phỏng. Kết quả local không thay thế kết quả GitHub Actions; xem nhật ký để biết phạm vi đã kiểm chứng.
