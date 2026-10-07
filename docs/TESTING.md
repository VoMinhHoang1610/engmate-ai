# Kiểm thử

## Backend API SQL Server (DB-05, B-01 đến B-09)

Chạy từ root bằng `python scripts/manage.py coverage` sau khi đặt connection test. Ví dụ PowerShell với SQL Server Windows Authentication:

```powershell
$env:SQLSERVER_TEST_ODBC_CONNECTION='DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=tempdb;Trusted_Connection=yes;TrustServerCertificate=yes'
python scripts/manage.py coverage
```

- `backend/tests/integration/test_sqlserver.py` bắt buộc DB_NAME là tempdb và schema em chưa tồn tại. DDL/seed/views chạy trong outer transaction; mỗi test có savepoint và cuối module rollback toàn bộ. Chạy tuần tự, không song song với bộ SQL standalone. Không trỏ biến test vào database ứng dụng.
- Khi thiếu biến trên, SQL integration bị skip; kết quả đó không kiểm chứng API nghiệp vụ. Coverage ≥80% toàn app cần bộ SQL này. CI mới cung cấp SQL Server 2022 và ODBC Driver 18 với tài khoản dùng một lần.
- Integration kiểm tra auth/revoke/reset, profile/settings/account version, ownership, catalog, chat/retry/fail/timeout/cancel, practice/answer rollback/feedback/abandon, notebook/search/mastery, flashcards/review schedule, dashboard/timezone, private media và migration version. Kiểm thử engine pool riêng chỉ đọc SELECT trên tempdb.
- Unit tests `test_security.py`, `test_request_limits.py`, `test_media.py`, `test_mailer.py` kiểm tra JWT/Argon2/input UTF-16, request size/auth 429/redacted validation, avatar/audio/truncated WAV, SMTP STARTTLS và lỗi giao thư. SMTP/LLM đều giả; không gửi email thật hoặc gọi paid API.
- SMTP đã cấu hình nhưng giao thư lỗi vẫn trả 202 như email không tồn tại; test so sánh hai response. Unit mailer kiểm tra chuyển lỗi giao thư thành lỗi service. Không tuyên bố đã kiểm chứng timing enumeration hoặc SMTP production.
- Chưa có test tải hoặc nhiều connection ghi đồng thời. Fixture dùng connection/savepoint chung; không suy rộng thành bằng chứng concurrency production.
- Lint bao gồm Ruff/Black/mypy và ESLint/TypeScript/Prettier; build là TypeScript/Vite. Smoke kiểm tra health, HTML và mock API qua Vite proxy, không kiểm chứng UI nghiệp vụ đa trang.
- Frontend trên nhánh backend là scaffold có 13 tests. Nhánh `feat/social-login-motion` chứa UI đa trang chưa được hợp nhất; kết quả lint/test/build scaffold không áp dụng cho nhánh đó.

Các kết quả chạy cuối, coverage và trạng thái Docker/CI xem [PROGRESS](PROGRESS.md).

## Thiết kế database SQL Server (DB-01 đến DB-04)

- Chạy từ `database/sqlserver`: `sqlcmd -S localhost -E -d tempdb -b -f 65001 -i tests/verify.sql -W`.
- Nếu terminal ở thư mục gốc repo, chạy `Push-Location .\database\sqlserver` trước và `Pop-Location` sau lệnh kiểm thử. File đầu vào và các include `:r` đều cần thư mục làm việc này.
- Test bắt buộc tempdb và schema `em` chưa tồn tại; chạy DDL/seed hai lần/views/truy vấn mẫu trong outer transaction; rollback toàn bộ và kiểm tra schema biến mất. Không dùng database ứng dụng hoặc dữ liệu tài khoản thật.
- **45 kiểm tra qua trên SQL Server 2022 Developer 16.0.1200.5**: 22 bảng/2 views; seed/Unicode; UNIQUE/CHECK/FK; owner của hội thoại/tin/bài/media/AI/từ/ôn; đúng lesson/question/option/mode; retry idempotency; JSON/score/span; mock label; thống kê không nhân số liệu, ngày UTC/Vietnam khác nhau, ngày chỉ có lượt ôn, archive giữ lịch sử và thêm lại từ.
- DB-01 → đối chiếu code và tài liệu `DATABASE_SQLSERVER.md`; DB-02/03/04 → `tests/verify.sql`; DB-05 có SQL integration ở mục trên; DB-06 cần UI integration/E2E. Chưa có coverage ứng dụng cho SQL artifacts; không xem backend coverage 100% là coverage database.
- Kết quả 16 backend tests và lỗi frontend trong nhật ký thiết kế là kết quả lịch sử trước khi tách nhánh. Xem mục mới nhất trong PROGRESS.md cho backend hiện tại. Chưa có thử tải/concurrency hoặc kiểm thử SQL Server 2019 riêng.

Chạy từ root bằng `python scripts/manage.py test` hoặc Windows `.\make.cmd test`. `coverage` chạy lại test và yêu cầu ít nhất 80% ở từng phía. Kết quả thật xem [PROGRESS.md](PROGRESS.md).

| Phạm vi | File test | Hành vi kiểm tra |
| --- | --- | --- |
| Config/application factory | `backend/tests/unit/test_config.py` | Env override, provider không hỗ trợ |
| AI service | `backend/tests/unit/test_ai_service.py` | Inject provider, prompt phiên bản và CEFR được truyền đúng |
| API | `backend/tests/integration/test_api.py` | Health, mock 3 trình độ, validation, timeout, CORS và OpenAPI |
| UI trạng thái | `frontend/src/App.test.tsx` | Loading/success/network error/fallback và abort |
| API client | `frontend/src/api/health.test.ts` | HTTP lỗi và JSON sai hợp đồng |
| Hook lifecycle | `frontend/src/hooks/useBackendHealth.test.tsx` | Bỏ qua kết quả/lỗi đến sau unmount |
| Stack chạy thật | `scripts/smoke.py` | Backend health, web HTML, Vite proxy và AI mock qua proxy |

Backend dùng pytest + httpx AsyncClient/ASGITransport; mỗi test có app riêng. Frontend dùng Vitest + React Testing Library; `fetch` được mock và globals/DOM được dọn sau mỗi test. Không gọi provider tính phí hay DB của người dùng.

Coverage backend đo toàn bộ `app/` (bỏ file package trống); frontend đo mã thực thi trong `src/`, bỏ entry DOM, test và types. Không suy rộng coverage khung thành coverage nghiệp vụ chưa triển khai.

Test mới đặt cạnh mã frontend hoặc trong `tests/unit` / `tests/integration` backend, kiểm tra hành vi và lỗi có ý nghĩa. DB integration dùng tempdb có guard/rollback như trên; khi nối UI chat thêm MSW và Playwright E2E. Hiện `frontend/e2e/` chỉ là vị trí dự phòng.

CI dùng cùng task runner cho lint, coverage, build, Docker và smoke. Có workflow không đồng nghĩa GitHub Actions đã chạy thành công.
