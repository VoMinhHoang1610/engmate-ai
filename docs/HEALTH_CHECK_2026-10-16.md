# Kiểm tra EngMate-AI — 2026-10-16

Ứng dụng local có frontend và backend hoạt động, nhưng chưa sẵn sàng cho các chức năng dùng MySQL. `/api/ready` trả 503; địa chỉ MySQL đã cấu hình là `localhost:3307/EngMateAI`, trong khi cổng 3307 không lắng nghe.

## Phạm vi và cách kiểm tra

- Rà soát cấu trúc React/TypeScript, FastAPI, cấu hình, task runner, CI, schema MySQL và các luồng tài khoản, bài tập, hội thoại, media, flashcard.
- Chạy lint/type-check/format, backend và frontend tests kèm coverage, production build và HTTP smoke trên stack local đang chạy.
- Đọc danh sách tiến trình Windows, cổng TCP, dịch vụ database, trạng thái container và mức dùng RAM tại thời điểm kiểm tra.
- Không thay đổi mã ứng dụng, cấu hình hoặc dữ liệu; không chạy SQL bootstrap/migration, không tạo tài khoản, không gọi speech trả phí. Chỉ thêm báo cáo và nhật ký tiến trình. Thay đổi `.env.example` đã tồn tại trước lượt này được giữ nguyên.

## Trạng thái tiến trình và dịch vụ

| Thành phần | PID / cổng | Kết quả |
| --- | --- | --- |
| Vite local | 8860 / `127.0.0.1:5174` | HTML 200, proxy `/api/health` 200; module do Vite phục vụ có `VITE_DATA_SOURCE=mysql` |
| Uvicorn local | 29464 / `127.0.0.1:8010` | `/api/health` 200; `/api/ready` 503 |
| MySQL hiện có | 13752 / 3306 | Có TCP listener; chưa kiểm chứng schema/tài khoản của instance này |
| MySQL backend đang cần | 3307 | Không có TCP listener |
| SQL Server instance 1 | 13892 / 1433 | Có TCP listener; dịch vụ `MSSQL$MSSQLSERVER01` chạy |
| SQL Server instance 2 | 27824 / loopback 1434 | Có TCP listener; dịch vụ `MSSQLSERVER` chạy |
| Docker Engine | 29.8.0 | `docker info` và `docker ps -a` trả lời khi chạy ngoài sandbox |
| Container EngMate | `engmate-ai-frontend-1`, `engmate-ai-backend-1` | Cả hai có trạng thái `exited`; web đang phục vụ bằng tiến trình local |
| Docker Compose tồn đọng | 13 tiến trình | Cùng lệnh `compose --project-name engmate-ai start`, tuổi khoảng 6,9–7 ngày |
| Cổng theo ghi chú local cũ | 5175 / 8011 | Không kết nối được |

Nhiều tiến trình Python thuộc chuỗi task runner, virtualenv và Uvicorn reload; không xem số lượng Python đơn thuần là bằng chứng backend chạy trùng. Có một lượt `test-frontend` khác đã chạy trước lúc khởi động các kiểm tra của báo cáo này.

Snapshot tài nguyên: khoảng 31,71 GiB RAM khả dụng toàn hệ thống theo Windows, còn trống 7,56 GiB. Docker backend dùng khoảng 1,2 GiB working set. Đây là ảnh chụp một thời điểm, chưa phải phép đo tải hoặc bằng chứng rò rỉ bộ nhớ.

## Phát hiện cần xử lý

### 1. Ưu tiên cao: backend không truy cập được MySQL đã cấu hình

Đọc cấu hình theo cách chỉ hiển thị driver/host/port/database: `mysql+pymysql`, `localhost`, `3307`, `EngMateAI`. JWT và kết nối MySQL có cấu hình; SQL Server không được chọn. Kiểm tra TCP xác nhận 3307 đóng, 3306 mở. HTTP `/api/ready` trả:

```json
{"detail":"Database unavailable; check connection and apply migrations."}
```

Health và mock reply không truy cập DB nên vẫn qua smoke. Kết quả đó không chứng minh đăng ký, đăng nhập hoặc lưu dữ liệu dùng được. Cần khôi phục đúng instance MySQL ở 3307 hoặc xác minh instance/schema/credentials tại 3306 trước khi đổi cấu hình. Chưa kết luận schema bị thiếu hoặc hỏng vì hiện chưa kết nối được đích cấu hình.

### 2. Ưu tiên vừa: nhiều lệnh Docker Compose tồn đọng

13 PID có sẵn: `45796`, `868`, `18620`, `11128`, `37228`, `21308`, `14008`, `31728`, `14944`, `28036`, `34952`, `44680`, `44508`. Các lệnh `start` còn tồn tại khoảng một tuần, trong khi hai container EngMate đã dừng. Lệnh đọc `docker compose -p engmate-ai ps --all --format json` cũng không hoàn thành trong 20 giây; `docker ps -a` trực tiếp vẫn trả lời.

Cần điều tra nhóm Compose và dọn các lệnh tồn đọng trước khi khởi chạy thêm. Chưa xác định nguyên nhân treo. Không dừng 13 tiến trình có sẵn trong lượt kiểm tra. Đã dọn riêng PID 15588 của lệnh đọc `compose ps` do lượt kiểm tra này tạo ra sau timeout.

### 3. Ưu tiên vừa: chế độ frontend hiện tại chưa tái lập được bằng cấu hình file

Vite đang chạy phục vụ `VITE_DATA_SOURCE=mysql`. Tuy nhiên `frontend/.env.local` không tồn tại; `loadEnv('production', frontend)` và `process.env.VITE_DATA_SOURCE` trong terminal kiểm tra đều không có giá trị. `frontend/src/api/database.ts:2` chỉ bật MySQL khi giá trị bằng `mysql`.

Vì vậy production build từ terminal kiểm tra chọn demo; việc khởi động lại Vite từ terminal không đặt biến cũng có thể chuyển sang demo. Cần lưu lựa chọn MySQL trong cấu hình frontend local phù hợp hoặc đặt biến rõ ràng trong lệnh build/chạy. Không đưa connection string hoặc secret vào frontend.

### 4. Ưu tiên vừa: lịch sử bỏ sót bản ghi mới sau mốc 100

Phát hiện qua đối chiếu mã, chưa tái hiện trên database thật trong lượt này:

- `backend/app/db/repository.py:45` phân trang tăng dần theo ID.
- `frontend/src/pages/HoiThoaiMySQL.tsx:39` và `:79` chỉ lấy `/conversations?limit=100`, rồi đảo thứ tự mảng khi hiển thị.
- `frontend/src/pages/ThucHanhMySQL.tsx:96` chỉ lấy `/practice/attempts?limit=100`; phần “Bài làm gần đây” đảo mảng rồi lấy 10 bản ghi.

Khi có 101 bản ghi, API trả 100 bản ghi cũ đầu tiên; đảo thứ tự phía frontend không thể đưa bản ghi 101 vào kết quả. Cần truy vấn mới nhất trước hoặc phân trang đầy đủ, kèm kiểm thử vượt 100 bản ghi.

### 5. Khoảng trống kiểm chứng database và CI

Môi trường không có `MYSQL_TEST_URL` hoặc `SQLSERVER_TEST_ODBC_CONNECTION`: 20 ca MySQL và 22 ca SQL Server bị skip. `.github/workflows/ci.yml` hiện cung cấp SQL Server và biến test tương ứng, chưa cung cấp MySQL test, nên các ca MySQL cũng chưa được workflow này thực thi.

File `gemini-code-1791478978574.sql` có 24 bảng, 2 view và 7 trigger theo kiểm tra tĩnh. Chưa thực thi lại DDL, seed hoặc `verify_catalog.sql`; không coi kết quả kiểm thử trong tài liệu lịch sử là kết quả mới. Cần database test riêng theo `docs/TESTING.md` để kiểm chứng lưu dữ liệu và coverage đầy đủ.

## Kết quả kiểm tra thực tế

| Kiểm tra | Lệnh | Kết quả |
| --- | --- | --- |
| Lint, types, format | `.venv/Scripts/python.exe scripts/manage.py lint` | Qua Ruff, Black, mypy, ESLint, TypeScript, Prettier |
| Backend tests và coverage | `.venv/Scripts/python.exe scripts/manage.py coverage-backend` | 77 qua, 42 skip; coverage 51,13%; lệnh thất bại do dưới ngưỡng 80% |
| Frontend tests và coverage | `npm.cmd --prefix frontend run test:coverage -- --maxWorkers=2` | 19 file, 167 ca qua; tất cả chỉ số đạt ngưỡng 80% |
| Production build | `.venv/Scripts/python.exe scripts/manage.py build` | Qua; JS 349,09 kB / gzip 110,23 kB; chế độ demo trong môi trường build này |
| HTTP smoke | `.venv/Scripts/python.exe scripts/manage.py smoke` | Qua backend health, frontend HTML, Vite proxy, mock AI reply |
| Readiness | `GET http://127.0.0.1:8010/api/ready` | 503 |

Coverage frontend: statements **88,02%**, branches **82,42%**, functions **85,66%**, lines **90,74%**. Artifact: `frontend/coverage/index.html`; backend: `backend/htmlcov/index.html` và `backend/coverage.xml`.

Lượt frontend đầu dùng cấu hình worker mặc định: 161 qua, 6 timeout ở ngưỡng 5 giây. Chạy lại toàn bộ với 2 worker qua 167/167; không thay timeout, assertion hoặc cấu hình đã commit. Kết quả phù hợp với khả năng tranh chấp tài nguyên khi chạy song song, chưa đủ để kết luận nguyên nhân tuyệt đối.

Lượt build trong sandbox gặp `spawn EPERM` từ esbuild; lượt backend trong sandbox gặp lỗi quyền thư mục tạm pytest. Chạy lại ngoài sandbox đã giải quyết các lỗi quyền này. Coverage backend vẫn không đạt do phần database chưa được thực thi.

## Giới hạn và thứ tự xử lý đề xuất

1. Xác minh và khôi phục đúng MySQL cho backend, kiểm tra `/api/ready` trả 200 và schema version 1.
2. Ghi cấu hình chế độ frontend có thể tái lập; đối chiếu lại cổng local trong README với môi trường hiện tại.
3. Điều tra và dọn nhóm Docker Compose tồn đọng theo phương thức chạy local hoặc Docker đã chọn.
4. Sửa phân trang lịch sử; kiểm thử với trên 100 bản ghi.
5. Cấu hình database test riêng và chạy lại integration/coverage; bổ sung kiểm chứng MySQL trong CI khi thực hiện thay đổi CI.

Chưa kiểm tra E2E đăng nhập/lưu dữ liệu bằng trình duyệt trên stack hiện tại, chưa kiểm tra Blaze thật, SMTP thật, tải/concurrency hoặc CI từ xa. AI hội thoại và đánh giá nói/viết trong mã vẫn là mock. Báo cáo này không khẳng định toàn bộ luồng nghiệp vụ đã hoạt động trên database thật.
