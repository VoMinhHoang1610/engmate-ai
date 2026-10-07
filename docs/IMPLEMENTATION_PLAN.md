# Bước code tiếp theo

Backend MVP đã triển khai trên `feat/backend-learning-api`: SQL Server repository/migration runner, auth JWT, hồ sơ/cài đặt, catalog, hội thoại, luyện tập, media, từ vựng/flashcard và dashboard. Xem [API](API.md), [kiểm thử](TESTING.md) và kết quả thực tế trong [PROGRESS](PROGRESS.md).

1. UI đa trang đã hợp nhất trong develop và lint/test/build qua. Tiếp tục nối UI với API nghiệp vụ: token/refresh, rowversion, request UUID, loading/error và media qua Bearer; thay localStorage bằng response server, thêm MSW/Playwright cho luồng hoàn chỉnh.
2. Xác định chính sách nhập localStorage cũ. Counter tổng không có lịch sử nên cần baseline riêng; không giả lập lượt ôn hoặc phiên học quá khứ.
3. Chọn provider/model và ngân sách để triển khai adapter LLM thật, structured output, retry/fallback và đánh giá prompt. Tests mặc định tiếp tục dùng mock; không coi mock là chấm nói/viết thật.
4. Cấu hình và tích hợp OAuth Google/Facebook/GitHub, xác minh email, giao diện reset password và xóa tài khoản nếu cần. SMTP reset backend đã có nhưng chưa gửi thử qua tài khoản thật.
5. STT/TTS server và streaming cần hợp đồng riêng; upload recording hiện chỉ lưu/kiểm tra audio, không chuyển giọng nói thành văn bản.
6. Kiểm thử tải và concurrency bằng nhiều connection, cancellation khi client ngắt, crash recovery của evaluation pending và đo độ trễ. Giới hạn auth hiện theo từng process; nhiều worker cần rate limiter chia sẻ.
7. Chuẩn bị production hosting, SQL credentials/TLS, backup, media lifecycle, migration version tiếp theo và chạy workflow mới trên GitHub. Memory dài hạn/tóm tắt thực hiện sau khi có yêu cầu.

Mỗi thay đổi cập nhật test, `REQUIREMENTS.md`, API/kiến trúc khi liên quan và thêm mục mới ở đầu `PROGRESS.md`. Nhật ký gồm ngày, phạm vi, file thay đổi, kết quả kiểm chứng, giới hạn và bước tiếp theo.
