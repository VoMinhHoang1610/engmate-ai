# Yêu cầu EngMate-AI — phạm vi hội thoại, 2026-10-16

Phạm vi này thay thế sản phẩm học tập nhiều trang trước đây, theo kế hoạch người dùng đã duyệt. Nhật ký cũ được giữ trong PROGRESS.md.

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| CHAT-01 | Đăng ký/đăng nhập thật, JWT/refresh xoay vòng, logout thu hồi phiên, ownership | Đã triển khai; kiểm chứng bằng tests/integration/test_chat_database.py |
| CHAT-02 | Tạo/mở/kết thúc hội thoại, lưu tin và đọc lại lịch sử | Đã triển khai; API/MySQL và UI tests |
| CHAT-03 | Lịch sử mới nhất trước và phân trang >100; context có giới hạn | Đã triển khai; test 105 hội thoại |
| CHAT-04 | Retry không nhân đôi; trạng thái pending/completed/failed/cancelled, hủy và hết hạn pending | Đã triển khai; tests provider lỗi/timeout/hủy/kết quả muộn |
| CHAT-05 | Ghi âm từng lượt, chép lời vào bản nháp, nghe/dừng và chọn giọng Blaze | Có mã và mock transport/lifecycle tests; chưa kiểm chứng Blaze trả phí/micro vật lý trong lượt này |
| CHAT-06 | Model thật sinh phản hồi, không mock production | Đã chuyển Gemini theo yêu cầu mới; adapter GenerateContent SSE đã nhận câu trả lời thật từ Flash-Lite, có tests transport/SQL/UI |
| CHAT-07 | Đàm thoại hai chiều realtime, ngắt lời, cleanup/reconnect | Đã triển khai Gemini Live relay WebSocket/PCM, VAD, persistence/ownership/cleanup và tests offline. Provider đã tạo audio thật từ text; **chưa kiểm chứng microphone/echo/barge-in trên thiết bị thật** |
| CHAT-08 | REST schema, lỗi an toàn, request limits, CORS, health/ready/capabilities, cấu hình dev/build đồng nhất | Đã triển khai; kiểm chứng qua contract/security/smoke |
| CHAT-09 | Giao diện desktop/mobile và truy cập bàn phím | Có CSS responsive/RTL tests; chưa có browser E2E mới |
| CHAT-10 | Giữ giao diện gốc, gồm đăng nhập/đăng ký; chỉ bỏ chức năng phụ | Đã khôi phục CSS/Logo/Mate và shell gốc; tests App/AuthForm/MenuNguoiDung, chưa kiểm tra trực quan bằng browser |
| CHAT-11 | Khóa Blaze chỉ nằm ở backend | Đã cấu hình riêng trong `.env` bị Git bỏ qua; chưa gọi dịch vụ tính phí để xác minh khóa |
| CHAT-12 | Chat stream hiển thị dần và hủy phản hồi cũ | Đã triển khai SSE start/delta/done/error, một assistant ID, cancel/disconnect; test transport/SQL/UI |
| CHAT-13 | Khóa provider private; quota/error không fake success | Gemini key backend/.env, giá trị OpenAI key local đã xóa; không log provider body, kiểm tra lỗi/quota/partial/blocked SSE |
| CHAT-14 | Thay OpenAI bằng Gemini, giữ giao diện và Blaze | Đã tích hợp, cấu hình Gemini mặc định cho chat/live, header đúng provider; kiểm tra wire contract, PCM, ticket/Origin, lifecycle và MySQL riêng |
| CHAT-15 | Khung chat cố định, ô nhập trong màn hình, tin nhắn/lịch sử cuộn riêng | Đã test: App regression và 72 kiểm tra hình học Edge tại 8 viewport, gồm phụ đề thoại dài/ngang thấp; bàn phím ảo thiết bị thật chưa kiểm chứng |

Đã loại khỏi phạm vi: bài tập Speaking/Listening/Reading/Writing, chấm điểm, lộ trình, onboarding, dashboard, vocabulary/flashcard, profile/avatar mở rộng, OAuth giả, reset qua SMTP và các trang demo. Tests chỉ phục vụ tính năng bị bỏ được thay cùng phạm vi; kiểm tra auth/ownership/retry/speech tiếp tục được thực thi trong suite mới, không hạ coverage threshold.

Không cam kết hệ thống tuyệt đối không có lỗi. Chat Gemini đã được kiểm chứng provider thật; definition of done cho thoại còn cần kiểm tra cuộc thoại/interrupt bằng trình duyệt + microphone/loa thật. Tests dùng doubles không thay thế kiểm chứng thiết bị. Một backend worker là giới hạn triển khai hiện tại; Gemini không phụ thuộc quota OpenAI.
