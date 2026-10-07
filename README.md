# EngMate-AI

EngMate-AI là ứng dụng luyện tiếng Anh dành cho người học nói tiếng Việt, với bài tập Speaking, Listening, Reading, Writing và hội thoại mô phỏng cùng Mate. Frontend dùng React/TypeScript; backend dùng FastAPI và có API lưu dữ liệu trên SQL Server.

**Demo chạy không cần database hoặc API key.** Giao diện lưu dữ liệu trong localStorage; hội thoại gọi AI mock. API SQL/JWT được thử riêng qua Swagger, chưa được giao diện demo sử dụng.

## Ví dụ đầu ra

Gửi `Hello` với `level=B1` tới `POST /api/ai/reply` nhận phản hồi mock:

```json
{
  "reply": "[Mock/B1] You said: Hello. What would you like to practice?",
  "provider": "mock",
  "level": "B1"
}
```

## Tính năng chính

- Mate hỏi mức học lần đầu; lộ trình Pre-A1 đến C2, chữ cái/số/lời chào kèm giọng đọc trình duyệt.
- Bốn kỹ năng theo mức học; Reading có 7 bài/21 câu hỏi, Listening chấm theo đáp án có sẵn.
- Hội thoại và nhập vai dùng phản hồi mock có nhãn; kết quả nói/viết là minh họa.
- Sổ từ vựng, flashcard/lịch ôn, hồ sơ và cài đặt sáng/tối/giảm chuyển động.
- Backend SQL Server: tài khoản/JWT, hồ sơ, catalog, lịch sử học, từ vựng/flashcard, media riêng tư và dashboard.

Giao diện có 12 trang học tập và trang đăng nhập riêng. UI/mock hỗ trợ bảy mức; API lưu hồ sơ/hội thoại theo schema SQL v1 chỉ nhận A2/B1/B2. Phạm vi từng endpoint ở [docs/API.md](docs/API.md).

## Yêu cầu hệ thống

- **Python 3.13 khuyến nghị**; [backend/pyproject.toml](backend/pyproject.toml) khai báo Python ≥3.11. Cần Python để dùng bộ lệnh bên dưới, kể cả khi chạy Docker.
- **Node.js 24 và npm** nếu chạy local; [frontend/package.json](frontend/package.json) yêu cầu Node ≥22.12. Docker/CI dùng Python 3.13 và Node 24.
- **Git** để lấy mã nguồn. **Docker Desktop/Engine với Compose v2 đang chạy** nếu chọn Docker; không cần Node/npm trên host cho cách này.
- Chỉ khi dùng API lưu dữ liệu: SQL Server 2019+ và ODBC Driver 17/18. SQL Server 2022 đã được kiểm thử; Docker backend có ODBC 18 và ffmpeg. Xem [hướng dẫn SQL](docs/LOCAL_DEVELOPMENT.md#bật-api-sql-server).

## Cài đặt

Sau khi tải/clone repo, mở terminal tại thư mục gốc chứa `README.md`, `scripts/`, `backend/` và `frontend/`. Chọn một cách:

**Docker — demo nhanh:**

```bash
python scripts/manage.py env
```

**Local — phát triển và chạy test:**

```bash
python scripts/manage.py setup
```

`setup` tạo `.venv`, cài backend editable/frontend theo lockfile và tạo `.env` nếu thiếu. `env` chỉ sao chép `.env.example` khi chưa có `.env`. Cả hai giữ nguyên cấu hình đã tồn tại.

## Cấu hình

Mẫu cấu hình: [.env.example](.env.example). Demo dùng các giá trị mặc định; để trống `DATABASE_ODBC_CONNECTION` và `JWT_SECRET`. Backend local và Compose đọc `.env` ở root; biến đã đặt trong terminal được ưu tiên. Không lưu secret vào Git hoặc biến frontend `VITE_*`.

| Biến | Ý nghĩa | Mặc định / ví dụ |
| --- | --- | --- |
| `APP_NAME` | Tiêu đề API | `EngMate-AI` |
| `LLM_PROVIDER` | Provider hiện được hỗ trợ | `mock`; không cần API key |
| `BACKEND_PORT`, `FRONTEND_PORT` | Cổng host Docker; không đổi cổng dev local | `8010`, `5174` |
| `CORS_ORIGINS` | Các origin được phép, cách nhau bằng dấu phẩy | `http://localhost:5174,http://127.0.0.1:5174` |
| `BACKEND_URL` | Vite proxy local; đặt trong terminal frontend | `http://127.0.0.1:8010` |
| `DATABASE_ODBC_CONNECTION` | Connection string cho API SQL | Trống khi demo; mẫu theo host trong [hướng dẫn SQL](docs/LOCAL_DEVELOPMENT.md#bật-api-sql-server) |
| `JWT_SECRET` | Khóa ký token khi bật database | Trống khi demo; tự sinh chuỗi ngẫu nhiên ≥32 ký tự |
| `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS` | Thời hạn access/refresh token | `15` phút, `30` ngày |
| `AUTH_REQUESTS_PER_MINUTE` | Giới hạn auth theo IP/process | `30` |
| `MEDIA_DIRECTORY` | Nơi lưu file riêng tư của backend local | `.artifacts/media`; Docker dùng volume tại `/app/media` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SENDER` | Gửi link reset mật khẩu qua backend | Host/sender trống; port `587` |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | Xác thực SMTP, nếu server yêu cầu | Trống; điền riêng trên máy vận hành |
| `FRONTEND_URL` | URL frontend trong link reset | `http://127.0.0.1:5174` |
| `SQLSERVER_TEST_ODBC_CONNECTION` | Connection chỉ dành cho test SQL, đặt trong terminal | `tempdb` với schema `em` chưa tồn tại; xem [kiểm thử](docs/TESTING.md) |
| `SMOKE_BACKEND_URL`, `SMOKE_FRONTEND_URL` | URL stack cần HTTP smoke | `http://127.0.0.1:8010`, `http://127.0.0.1:5174` |

SMTP chỉ cần khi thử reset mật khẩu bằng API SQL. Hướng dẫn đổi cổng, Windows/Docker SQL và các lệnh bổ trợ nằm trong [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).

## Cách chạy

### Docker

```bash
python scripts/manage.py docker-up
python scripts/manage.py smoke
```

Dừng stack sau khi dùng:

```bash
python scripts/manage.py down
```

Compose chạy backend/frontend ở chế độ dev; SQL Server là dịch vụ bên ngoài. Với cấu hình demo mặc định, API cần database trả 503; health và mock reply vẫn chạy. Volume `learning-media` giữ upload khi dừng stack.

### Local

Mở hai terminal tại root repo:

```bash
# Terminal 1
python scripts/manage.py dev-backend
```

```bash
# Terminal 2
python scripts/manage.py dev-frontend
```

- Web: [http://127.0.0.1:5174](http://127.0.0.1:5174)
- Swagger: [http://127.0.0.1:8010/docs](http://127.0.0.1:8010/docs)
- Health: [http://127.0.0.1:8010/api/health](http://127.0.0.1:8010/api/health)

**Thử demo:** đăng nhập bằng tài khoản mẫu công khai `abc / 123` → trả lời Mate và xác nhận mức học → mở Reading để làm bài hoặc Hội thoại AI để gửi `Hello`. Dữ liệu được giữ trong trình duyệt; tài khoản mẫu này không dùng để xác thực API SQL.

Để thử lưu dữ liệu thật, làm theo [hướng dẫn bật SQL Server](docs/LOCAL_DEVELOPMENT.md#bật-api-sql-server), đăng ký tài khoản backend trong Swagger rồi dùng Bearer token. Hướng dẫn trình diễn: [docs/DEMO_DEVELOP.md](docs/DEMO_DEVELOP.md).

## Test và lint

Sau khi cài local:

```bash
python scripts/manage.py lint
python scripts/manage.py test
python scripts/manage.py build
```

`lint` gồm Ruff/Black/mypy, ESLint/TypeScript/Prettier. `test` chạy pytest và Vitest; nếu chưa đặt connection test, 22 SQL integration cases được bỏ qua và chưa kiểm chứng phần lưu dữ liệu. `build` tạo frontend production tại `frontend/dist/`.

Để đo coverage toàn bộ, trước tiên cấu hình `SQLSERVER_TEST_ODBC_CONNECTION` theo [docs/TESTING.md](docs/TESTING.md), chỉ dùng `tempdb` không có schema `em`:

```bash
python scripts/manage.py coverage
```

Tests SQL tạo dữ liệu trong transaction rồi rollback; không dùng database ứng dụng. Ngưỡng coverage là 80% cho backend và từng chỉ số frontend. CI chạy cùng task runner cho PR và push vào `main`; kết quả local không thay thế GitHub Actions.

## Cấu trúc thư mục

```text
backend/            FastAPI, cấu hình, schemas, services, LLM mock, repository và tests
frontend/           React/TypeScript/Vite/Tailwind, trang học, localStorage và tests
database/sqlserver/ Schema, seed, views, truy vấn mẫu và kiểm thử T-SQL
scripts/            Task runner Windows/Linux và HTTP smoke
docs/               API, kiến trúc, thiết kế database và hướng dẫn chi tiết
.github/workflows/  CI lint, coverage, build và Docker smoke
```

Tài liệu thêm: [kiến trúc](docs/ARCHITECTURE.md), [ERD/database](docs/DATABASE_SQLSERVER.md), [prompt](docs/PROMPTS.md), [linh thú Mate](docs/LINH_THU.md).

## Đóng góp

Tạo nhánh theo công việc (`feat/...`, `fix/...` hoặc `docs/...`), dùng Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`) với mô tả ngắn, dễ hiểu. PR vào `develop` cần nêu thay đổi và kết quả lint/test/build; chạy coverage khi thay đổi mã thực thi với môi trường SQL test. Không đưa `.env`, token hoặc file upload vào PR.
