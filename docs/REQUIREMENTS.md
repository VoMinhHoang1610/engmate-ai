# Yêu cầu và backlog

Cập nhật: 2026-10-07. Nhánh `feat/backend-learning-api` đã có backend nghiệp vụ và kết nối SQL Server. Giao diện demo đa trang ở nhánh feature riêng, chưa được nối các API nghiệp vụ.

| ID | Yêu cầu khung | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| S-01 | Web JavaScript/TypeScript, React/Vite, TypeScript strict | lint/type-check, build | Đã test |
| S-02 | Backend Python, FastAPI và schema Pydantic | pytest, mypy | Đã test |
| S-03 | AI qua interface; mock miễn phí và prompt tách file | Unit service, integration mock | Đã test |
| S-04 | Unit/integration test backend; test API client/component/hook frontend | pytest/Vitest và coverage ≥80% | Đã test |
| S-05 | Web kết nối backend với trạng thái tải/lỗi | UI tests, HTTP proxy smoke | Đã test |
| S-06 | Documentation để cập nhật tiến độ, quyết định và yêu cầu | Rà soát docs/PROGRESS | Đã rà soát |
| S-07 | Setup nhất quán, lockfile, Docker, pre-commit và CI | Setup, Docker smoke, hook local, [GitHub Actions](https://github.com/VoMinhHoang1610/engmate-ai/actions/runs/37506823374) | Đã test local và GitHub Actions |

## Backlog sản phẩm

1. Nối giao diện đa trang với API SQL Server theo [hợp đồng](API.md); chính sách nhập localStorage cũ và E2E.
2. OAuth, xác minh email và xóa dữ liệu tài khoản. Đăng ký/đăng nhập JWT, reset mật khẩu, hồ sơ/cài đặt và ownership đã triển khai.
3. Chat streaming và phân tích/sửa lỗi thật. Hội thoại/lịch sử/evaluation mock đã triển khai.
4. Adapter LLM thật, retry/fallback/timeout, contract output và thử nghiệm sư phạm.
5. UI tài khoản/chat/gợi ý; MSW cho API nghiệp vụ và Playwright E2E khi có luồng hoàn chỉnh.
6. Đo độ trễ, xử lý client ngắt kết nối và lỗi hạ tầng.
7. Bộ nhớ dài hạn và tóm tắt sau MVP. Dashboard SQL đã triển khai; STT/TTS server khi được yêu cầu.

Mock hiện chỉ trả response xác định và nhãn `provider=mock`, không phân tích lỗi hoặc tạo phản hồi AI thật.

## Database SQL Server

| ID | Yêu cầu | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| DB-01 | Khảo sát toàn bộ chức năng, ánh xạ dữ liệu, ERD và từ điển dữ liệu | `docs/DATABASE_SQLSERVER.md`, đối chiếu code frontend/backend | Xong |
| DB-02 | Schema SQL Server: tài khoản/hồ sơ/cài đặt, media, chủ đề/bài/câu hỏi, phiên học/hội thoại/lần làm, AI/lỗi, từ/flashcard | 22 bảng, PK/FK/UNIQUE/CHECK/index; script trên SQL Server 2022 | Đã test |
| DB-03 | Danh mục và thống kê tổng/ngày không trùng hoặc nhân dữ liệu | 8 chủ đề, 9 bài, seed chạy hai lần, 2 view, kiểm tra ngày Việt Nam | Đã test |
| DB-04 | Kiểm tra ownership, idempotency, dữ liệu sai và rollback môi trường thử | `database/sqlserver/tests/verify.sql`: 45/45 kiểm tra | Đã test |
| DB-05 | Kết nối FastAPI bằng SQLAlchemy Core/pyodbc, repository và migration runner chủ động | SQL integration trên SQL Server 2022 | Đã test |
| DB-06 | Nối UI, nhập localStorage và OAuth | Cần integration/E2E khi triển khai | Chưa làm |

## Backend nghiệp vụ MVP

| ID | Yêu cầu | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| B-01 | Auth Argon2/JWT, refresh xoay vòng, logout/reset/đổi mật khẩu thu hồi phiên | SQL integration + security/mailer unit tests | Đã test; SMTP giả |
| B-02 | Account/profile/settings với version; private avatar và recording | SQL integration + media/security unit tests | Đã test |
| B-03 | Catalog published/active và question payload chưa lộ answer key | SQL integration | Đã test; transcript public cho browser TTS |
| B-04 | Hội thoại/lịch sử, request UUID, ownership, timeout/cancel | SQL integration với LLM giả | Đã test; chưa streaming/AI thật |
| B-05 | Luyện nghe chấm SQL; nói/viết lưu input và phản hồi mock; retry/abandon | SQL integration | Đã test; không chấm AI thật |
| B-06 | Notebook CRUD/archive/tìm kiếm/mastery; flashcard lịch ôn và retry | SQL integration | Đã test |
| B-07 | Dashboard tổng/ngày, timezone và thời lượng server | SQL integration | Đã test |
| B-08 | Validation, body/auth limits, errors không lộ bí mật, OpenAPI | Unit/integration + export-api | Đã test; rate limit theo process |
| B-09 | Docker ODBC/audio decoder, workflow SQL Server test | Docker local + cấu hình CI | Local đã test; workflow mới chưa chạy GitHub |

S-07 ở trên là kết quả CI lịch sử của scaffold. Workflow SQL Server hiện tại chưa push hoặc xác nhận bằng GitHub Actions run mới. Kết quả cuối trên nhánh backend xem [PROGRESS](PROGRESS.md); không suy rộng sang nhánh giao diện đa trang.
