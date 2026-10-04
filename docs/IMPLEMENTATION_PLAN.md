# Bước code tiếp theo

1. Thiết kế schema DB, SQLAlchemy async/Alembic và migrations; viết test trên PostgreSQL test riêng.
2. Models, auth/JWT, hồ sơ CEFR, phân quyền và xóa dữ liệu tài khoản.
3. Hợp đồng hội thoại/chat streaming, lưu lịch sử, phân tích lỗi, retry/fallback và timeout.
4. Adapter LLM thật và đánh giá prompt; test mặc định vẫn dùng mock.
5. UI đăng nhập/chat/gợi ý, MSW và E2E cho luồng hoàn chỉnh.
6. Đo độ trễ, xử lý ngắt kết nối, rồi mới mở rộng memory/dashboard.

Mỗi thay đổi cập nhật test, `REQUIREMENTS.md`, API/kiến trúc khi liên quan và thêm mục mới ở đầu `PROGRESS.md`. Nhật ký gồm ngày, phạm vi, file thay đổi, kết quả kiểm chứng, giới hạn và bước tiếp theo.
