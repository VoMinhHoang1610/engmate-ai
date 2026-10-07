# Kiểm thử

## Thiết kế database SQL Server (DB-01 đến DB-04)

- Chạy từ `database/sqlserver`: `sqlcmd -S localhost -E -d tempdb -b -f 65001 -i tests/verify.sql -W`.
- Nếu terminal ở thư mục gốc repo, chạy `Push-Location .\database\sqlserver` trước và `Pop-Location` sau lệnh kiểm thử. File đầu vào và các include `:r` đều cần thư mục làm việc này.
- Test bắt buộc tempdb và schema `em` chưa tồn tại; chạy DDL/seed hai lần/views/truy vấn mẫu trong outer transaction; rollback toàn bộ và kiểm tra schema biến mất. Không dùng database ứng dụng hoặc dữ liệu tài khoản thật.
- **45 kiểm tra qua trên SQL Server 2022 Developer 16.0.1200.5**: 22 bảng/2 views; seed/Unicode; UNIQUE/CHECK/FK; owner của hội thoại/tin/bài/media/AI/từ/ôn; đúng lesson/question/option/mode; retry idempotency; JSON/score/span; mock label; thống kê không nhân số liệu, ngày UTC/Vietnam khác nhau, ngày chỉ có lượt ôn, archive giữ lịch sử và thêm lại từ.
- DB-01 → đối chiếu code và tài liệu `DATABASE_SQLSERVER.md`; DB-02/03/04 → `tests/verify.sql`; DB-05 cần integration/E2E sau khi có kết nối backend. Chưa có coverage ứng dụng cho SQL artifacts; không xem backend coverage 100% là coverage database.
- Backend hiện có 16 tests; lỗi frontend có sẵn và kết quả chạy toàn dự án ghi trong PROGRESS.md. Chưa có thử tải/concurrency hoặc kiểm thử SQL Server 2019 riêng.

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

Test mới đặt cạnh mã frontend hoặc trong `tests/unit` / `tests/integration` backend, kiểm tra hành vi và lỗi có ý nghĩa. Khi có DB cần DB test riêng; khi có UI chat thêm MSW và Playwright E2E. Hiện `frontend/e2e/` chỉ là vị trí dự phòng.

CI dùng cùng task runner cho lint, coverage, build, Docker và smoke. Có workflow không đồng nghĩa GitHub Actions đã chạy thành công.
