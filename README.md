# EngMate-AI

EngMate-AI là ứng dụng luyện tiếng Anh dành cho người học nói tiếng Việt, với bài tập Speaking, Listening, Reading, Writing và hội thoại mô phỏng cùng Mate. Frontend dùng React/TypeScript; backend FastAPI lưu dữ liệu trên MySQL hoặc SQL Server.

**Chế độ MySQL lưu dữ liệu theo tài khoản:** đăng ký/đăng nhập, làm quen, hồ sơ, cài đặt giọng, sổ từ, flashcard, bài làm và hội thoại. Reading/Listening chấm bằng đáp án backend. Hội thoại và đánh giá Speaking/Writing vẫn dùng AI mock có nhãn. Chế độ demo chạy không cần database và lưu localStorage; giọng đọc/chép lời Blaze cần API key backend.

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

- Mate hỏi mức học lần đầu; lộ trình Pre-A1 đến C2, chữ cái/số/lời chào kèm giọng đọc Blaze.
- Bốn kỹ năng theo mức học; Reading có 7 bài/21 câu hỏi, Listening chấm theo đáp án có sẵn.
- Hội thoại và nhập vai dùng phản hồi mock có nhãn; kết quả nói/viết là minh họa.
- Sổ từ vựng, flashcard/lịch ôn, hồ sơ và cài đặt sáng/tối/giảm chuyển động.
- Backend MySQL/SQL Server: tài khoản/JWT, hồ sơ, catalog, lịch sử học, từ vựng/flashcard, media riêng tư và dashboard.

Giao diện có 12 trang học tập và trang đăng nhập riêng. MySQL hỗ trợ đủ bảy mức Pre-A1 đến C2. Adapter SQL Server v1 giữ giới hạn A2/B1/B2 và được dùng qua API. Phạm vi từng endpoint ở [docs/API.md](docs/API.md).

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
| `DATABASE_MYSQL_URL` | SQLAlchemy URL cho schema MySQL đã tạo | `mysql+pymysql://username:password@localhost:3307/EngMateAI?charset=utf8mb4`; chỉ chọn một driver |
| `VITE_DATA_SOURCE` | Chế độ frontend `mysql` hoặc `demo` | Local: `frontend/.env.local`; Compose: `.env` root; chỉ chứa lựa chọn chế độ |
| `MYSQL_TEST_URL` | MySQL riêng cho integration/coverage | Schema đã bootstrap, tên kết thúc `_test`, chưa có tài khoản |
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

**Chạy với MySQL:**

1. Tạo schema bằng [file SQL](gemini-code-1791478978574.sql) nếu chưa có bảng; nếu đã tạo thì giữ nguyên. Không chạy lại DDL trên dữ liệu hiện có.
2. Trong `.env` root, đặt `DATABASE_MYSQL_URL` trỏ đến `EngMateAI`, để trống `DATABASE_ODBC_CONNECTION`, tạo `JWT_SECRET` ngẫu nhiên ít nhất 32 ký tự. Ký tự đặc biệt trong mật khẩu URL cần percent-encode. Xem [hướng dẫn MySQL](database/mysql/README.md).
3. Tạo `frontend/.env.local` với `VITE_DATA_SOURCE=mysql`, khởi động lại Vite. Với Compose, đặt cùng lựa chọn trong `.env` root; MySQL trên Windows host dùng `host.docker.internal` thay `localhost` từ container.
4. Chạy hai lệnh dev ở trên, mở web và **đăng ký tài khoản mới** với mật khẩu ít nhất 10 ký tự. Tài khoản demo `abc / 123` chỉ dùng trong chế độ demo. `/api/ready` phải trả `database=mysql` và `schema_version=1`.

Môi trường local hiện tại dùng frontend [5175](http://127.0.0.1:5175) và backend [8011](http://127.0.0.1:8011/docs) do các cổng mặc định đang được ứng dụng khác sử dụng. Để chạy lại: terminal backend đặt `CORS_ORIGINS=http://localhost:5175,http://127.0.0.1:5175`, chạy `python scripts/manage.py dev-backend --port 8011`; terminal frontend đặt `BACKEND_URL=http://127.0.0.1:8011`, chạy `python scripts/manage.py dev-frontend --port 5175`.

LocalStorage demo cũ không được nhập tự động vào tài khoản MySQL. Khi mở hoặc tải lại trang MySQL, ứng dụng hiện đăng nhập trước. Đăng nhập thành công tải dữ liệu tài khoản rồi mở Tổng quan ngay, không cần F5; tài khoản mới hoàn thành bước làm quen trước. Token phiên chỉ giữ trong bộ nhớ trang đang mở; tài khoản, hồ sơ và tiến độ vẫn lưu trong MySQL để dùng lại sau khi đăng nhập. Mật khẩu và khóa dịch vụ ở backend. Có thể dùng [SQL Server qua Swagger](docs/LOCAL_DEVELOPMENT.md#bật-api-sql-server) nếu cần giữ schema cũ.

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

## TTS/STT Blaze

Backend có API speech dùng Blaze: cấu hình BLAZE_API_KEY trong .env riêng, thử tag speech trong Swagger. Xem [hướng dẫn](docs/BLAZE_SPEECH.md). Các nút Nghe dùng giọng Blaze. Speaking tự chép lời sau khi dừng micro; Hội thoại AI có micro điền bản nháp để bạn sửa và gửi. Demo local cần BLAZE_LOCAL_DEMO=true khi chưa có SQL/JWT.

Trong **Cài đặt → Giọng nói → Giọng đọc tiếng Anh**, chọn giọng nam/nữ và bấm **Nghe thử**. Lựa chọn được lưu trên trình duyệt, áp dụng cho mọi nút Nghe và giữ sau khi tải lại trang.

Ứng dụng chuẩn bị âm thanh của bài đang mở và giữ các đoạn đã tạo trong bộ nhớ để bấm Nghe/phát lại nhanh hơn. Lần tạo đầu vẫn phụ thuộc Blaze; chuẩn bị trước có thể dùng credit dù chưa bấm Nghe. Tải lại trang sẽ xóa cache âm thanh.
