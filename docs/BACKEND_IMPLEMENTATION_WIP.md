# Backend/API — công việc đang thực hiện

> **Checkpoint lịch sử:** nội dung WIP dưới đây ghi lại lúc tách nhánh, trước tác vụ hoàn thiện backend. Trạng thái hiện tại và kết quả kiểm chứng ở [PROGRESS](PROGRESS.md), hợp đồng ở [API](API.md); không dùng các số test WIP làm kết quả hiện tại.

Nhánh `feat/backend-learning-api` được tách ngày 2026-10-07 từ `feat/sqlserver-schema`. Schema dựa trên `develop`; nhánh backend không mang các commit giao diện của `feat/social-login-motion`.

Đã bảo toàn các thay đổi SQLAlchemy Core/pyodbc, cấu hình DB/JWT, Argon2, tài khoản/refresh/reset mật khẩu, hồ sơ/cài đặt, danh mục, từ vựng/flashcard, hội thoại, bài luyện/thống kê, media riêng tư, migration runner, lockfile và Docker/Compose. AI vẫn là mock; frontend chưa nối các API nghiệp vụ mới.

Kiểm chứng trước khi tạm dừng: 16 tests cũ + 11 luồng SQL Server thật qua; coverage 84,59%. Sau đó đã thêm chuyển SQL sang worker thread, timeout/cancel evaluation, cấu hình môi trường và Docker ODBC; các chỉnh sửa mới nhất này chưa được kiểm chứng đầy đủ. Commit WIP chỉ lưu và phân loại công việc, không phải bản backend đã hoàn thiện.

Việc tiếp tục: format/lint/mypy, mở rộng các test lỗi/quyền sở hữu/cancel, chạy lại toàn bộ integration/coverage SQL Server trong tempdb với rollback; cập nhật hợp đồng API, README, trạng thái yêu cầu và cấu hình CI khi được thực hiện. Không dùng database ứng dụng để chạy bộ test rollback này. Chưa triển khai hay push nhánh.

Các nhánh liên quan:

- `feat/social-login-motion`: các commit giao diện hiện có, không có thay đổi SQL/backend mới.
- `chore/sync-ci-social-login`: bản đồng bộ CI/main vào feature và tài liệu đã giải quyết xung đột.
- `feat/sqlserver-schema`: 22 bảng, 2 view, seed/truy vấn/test SQL và tài liệu database.
- `feat/backend-learning-api`: backend/API và cấu hình chạy trên schema SQL Server.

Bản sao đầy đủ trước khi tách nằm ở nhánh backup và stash an toàn được ghi trong báo cáo `.artifacts/branch-cleanup-*`; không sửa lịch sử hoặc nội dung `main`/`develop`.
