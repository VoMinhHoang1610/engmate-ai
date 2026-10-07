# Changelog

## [Unreleased]

### Thiết kế database SQL Server — 2026-10-07

- Khảo sát toàn bộ giao diện/nghiệp vụ; bổ sung tài liệu ERD, từ điển dữ liệu, ánh xạ localStorage và quy tắc giao dịch.
- Thêm schema 22 bảng, 2 view, seed 8 chủ đề/9 bài/4 câu hỏi/6 lựa chọn và truy vấn mẫu cho SQL Server; thay PostgreSQL trong kế hoạch triển khai tiếp.
- Bộ kiểm thử database chạy 45/45 kiểm tra trên SQL Server 2022, rollback toàn bộ môi trường thử. Chưa tích hợp database/auth/OAuth vào backend hoặc thay đổi cách chạy ứng dụng.

### Added

- Khung React/TypeScript và FastAPI/Python mới theo yêu cầu reset ngày 2026-10-04.
- LLM interface, mock, AIService, prompt v1 và endpoint demo có validation/timeout.
- Health UI kết nối API qua proxy, các trạng thái tải/lỗi và hủy request.
- Tests unit/integration backend, frontend API/component/hook, HTTP smoke.
- Task runner Python, Docker dev stack, lockfile, pre-commit và CI.
- Documentation yêu cầu, kiến trúc, API, kiểm thử, prompt, quyết định và nhật ký tiến độ.

### Changed

- Bỏ pip cache của GitHub Actions để tránh lỗi đường dẫn cache khi kết thúc job.
- Backend Docker dùng curl cho health check, giới hạn request 2 giây và cho phép khởi động 15 giây; frontend Compose có start period 30 giây.
- Health route chuyển thành `/api/health`; cổng local mặc định 8010/5174.
- Loại bỏ phụ thuộc GNU Make trong wrapper Windows và các cấu hình thừa của khung cũ.

Kết quả chạy thật và các giới hạn ghi trong `PROGRESS.md`.
