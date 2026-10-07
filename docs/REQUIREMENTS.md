# Yêu cầu và backlog

Cập nhật: 2026-10-07. Phạm vi nhánh này: khung API và thiết kế database SQL Server. Giao diện demo đa trang ở nhánh feature riêng; database chưa kết nối ứng dụng.

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

1. Triển khai models/repository và migration cho SQL Server theo [thiết kế database](DATABASE_SQLSERVER.md); lựa chọn driver/ORM tương thích khi tích hợp. Schema T-SQL đã thiết kế và kiểm thử, chưa nối backend.
2. Đăng ký/đăng nhập JWT, hồ sơ CEFR và kiểm tra quyền sở hữu; xóa dữ liệu tài khoản.
3. Hội thoại, lưu lịch sử và chat streaming; phân tích/sửa lỗi ngữ pháp/từ vựng.
4. Adapter LLM thật, retry/fallback/timeout, contract output và thử nghiệm sư phạm.
5. UI tài khoản/chat/gợi ý; MSW cho API nghiệp vụ và Playwright E2E khi có luồng hoàn chỉnh.
6. Đo độ trễ, xử lý client ngắt kết nối và lỗi hạ tầng.
7. Bộ nhớ dài hạn, tóm tắt và dashboard tiến bộ sau MVP. STT/TTS khi được yêu cầu.

Mock hiện chỉ trả response xác định và nhãn `provider=mock`, không phân tích lỗi hoặc tạo phản hồi AI thật.

## Database SQL Server

| ID | Yêu cầu | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| DB-01 | Khảo sát toàn bộ chức năng, ánh xạ dữ liệu, ERD và từ điển dữ liệu | `docs/DATABASE_SQLSERVER.md`, đối chiếu code frontend/backend | Xong |
| DB-02 | Schema SQL Server: tài khoản/hồ sơ/cài đặt, media, chủ đề/bài/câu hỏi, phiên học/hội thoại/lần làm, AI/lỗi, từ/flashcard | 22 bảng, PK/FK/UNIQUE/CHECK/index; script trên SQL Server 2022 | Đã test |
| DB-03 | Danh mục và thống kê tổng/ngày không trùng hoặc nhân dữ liệu | 8 chủ đề, 9 bài, seed chạy hai lần, 2 view, kiểm tra ngày Việt Nam | Đã test |
| DB-04 | Kiểm tra ownership, idempotency, dữ liệu sai và rollback môi trường thử | `database/sqlserver/tests/verify.sql`: 45/45 kiểm tra | Đã test |
| DB-05 | Kết nối FastAPI, auth/OAuth thật, migrations tự động, API và chuyển localStorage | Cần integration/E2E sau khi triển khai | Chưa làm |
