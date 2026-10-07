# Changelog

## [Unreleased]

### Thiết kế database SQL Server — 2026-10-07

- Khảo sát toàn bộ giao diện/nghiệp vụ; bổ sung tài liệu ERD, từ điển dữ liệu, ánh xạ localStorage và quy tắc giao dịch.
- Thêm schema 22 bảng, 2 view, seed 8 chủ đề/9 bài/4 câu hỏi/6 lựa chọn và truy vấn mẫu cho SQL Server; thay PostgreSQL trong kế hoạch triển khai tiếp.
- Bộ kiểm thử database chạy 45/45 kiểm tra trên SQL Server 2022, rollback toàn bộ môi trường thử. Chưa tích hợp database/auth/OAuth vào backend hoặc thay đổi cách chạy ứng dụng.

### Added

- Nút tiếp tục với Google/Facebook/GitHub trên đăng nhập và đăng ký; hiện hoàn thiện giao diện, báo rõ chưa kết nối khi bấm.
- Linh thú Mate với dáng chào, tai nghe, suy nghĩ, động viên và ăn mừng; component dùng chung, bản SVG nền trong suốt và hướng dẫn nhận diện.
- Cài đặt giao diện sáng/tối/theo hệ thống, giảm chuyển động và tốc độ đọc tiếng Anh; lưu tùy chọn trên trình duyệt và giữ tương thích dữ liệu cũ.
- Menu avatar theo trạng thái đăng nhập, hỗ trợ hover/bấm, bàn phím và đóng khi bấm ra ngoài.
- Logo EngMate AI dạng SVG nền trong suốt cho sidebar, mobile, trang tài khoản và favicon; banner/menu/nút chính dùng màu xanh theo thương hiệu.
- Bản demo frontend responsive gồm 10 trang học tiếng Anh, sidebar/menu mobile và hash routing không cần thêm dependency.
- Các luồng tương tác demo cho hội thoại AI, ghi âm, luyện nghe, luyện viết, sổ từ vựng, flashcard, hồ sơ và tài khoản.
- Lưu dữ liệu demo bằng `localStorage`, thống kê theo ngày, lịch ôn từ và cảnh báo khi trình duyệt không thể lưu.
- Bộ icon SVG nội bộ, phát âm bằng Web Speech và ghi âm bằng MediaRecorder khi trình duyệt hỗ trợ.
- Test giao diện cho route, lifecycle, lỗi API/storage và các luồng học chính.
- Khung React/TypeScript và FastAPI/Python mới theo yêu cầu reset ngày 2026-10-04.
- LLM interface, mock, AIService, prompt v1 và endpoint demo có validation/timeout.
- Health UI kết nối API qua proxy, các trạng thái tải/lỗi và hủy request.
- Tests unit/integration backend, frontend API/component/hook, HTTP smoke.
- Task runner Python, Docker dev stack, lockfile, pre-commit và CI.
- Documentation yêu cầu, kiến trúc, API, kiểm thử, prompt, quyết định và nhật ký tiến độ.

### Changed

- Bỏ pip cache của GitHub Actions để tránh lỗi đường dẫn cache khi kết thúc job.
- Backend Docker dùng curl cho health check, giới hạn request 2 giây và cho phép khởi động 15 giây; frontend Compose có start period 30 giây.
- Trang đăng nhập dùng panel Mate navy/cyan cuộn đổi chỗ với form khi đăng nhập ↔ đăng ký; form mở theo hướng, sóng viền và hiệu ứng phụ. Mobile xếp dọc với pill; giữ nút xã hội demo và giảm chuyển động.
- Chuyển giữa đăng nhập/đăng ký/khôi phục bằng nền tab trượt, tiêu đề/chữ chuyển mờ và biểu mẫu trượt/nghiêng nhẹ; chiều cao khung co giãn mượt. Bấm đổi nhanh không kẹt trạng thái; giữ tên/email, làm mới ô mật khẩu; hỗ trợ giảm chuyển động.
- Mate đồng hành ở banner, sidebar, đăng nhập, avatar/trợ lý hội thoại, ghi âm, nghe, viết, mục tiêu ngày và hoàn thành flashcard. Kết quả nghe đúng/sai dùng biểu cảm phù hợp; mục tiêu và phiên ôn dùng dữ liệu hiện có. Thẻ kỹ năng có màu nhẹ, cạnh nổi và phản hồi khi nhấn.
- Bổ sung trang trí và animation: banner gradient với nhân vật nổi/chớp mắt, vòng quay và sao; nền màu, thẻ xuất hiện lần lượt/nổi khi hover, nút ánh sáng, chuyển trang, tin nhắn, thẻ từ và các trạng thái luyện tập. Đăng nhập vẫn riêng, nhãn vẫn gọn; Giảm chuyển động tắt các hiệu ứng.
- Bỏ mô tả thừa dưới tên thành phần và slogan; chữ và khoảng cách thống nhất cho sáng/tối. Thu gọn nội dung tổng quan, chủ đề, hồ sơ và đăng nhập. Cài đặt chỉ hiện nhãn/điều khiển; gợi ý luyện nói và cách ôn flashcard mở khi cần.
- Đăng nhập/đăng ký/khôi phục tài khoản chuyển sang trang độc lập `#dang-nhap`, có bố cục desktop/mobile riêng và không hiển thị sidebar/topbar học tập. Cài đặt chỉ còn giao diện/âm thanh; avatar dẫn đến trang mới, đăng nhập xong có nút vào không gian học tập. Giữ liên kết cũ `#tai-khoan` và `#cai-dat?muc=tai-khoan`.
- Thanh cuộn hiện và ẩn bằng hiệu ứng mờ dần 280 ms; menu mobile giữ hiệu ứng tương tự, bố cục 360 px không bị tràn do độ rộng thanh cuộn.
- Bỏ nhãn demo trên thanh trên cùng, tài khoản, hồ sơ, lịch flashcard và ghi chú chung; chỉ gắn `AI · Demo` cạnh chức năng AI.
- Thanh cuộn trang/menu/vùng nội dung mặc định trong suốt, chỉ hiện khi cuộn và tự ẩn sau 1 giây dừng cuộn, không làm xê dịch bố cục.
- Thay trang health khởi tạo bằng app EngMate-AI đa trang; endpoint AI mock hiện được dùng trong trang hội thoại.
- Health route chuyển thành `/api/health`; cổng local mặc định 8010/5174.
- Loại bỏ phụ thuộc GNU Make trong wrapper Windows và các cấu hình thừa của khung cũ.

Kết quả chạy thật và các giới hạn ghi trong `PROGRESS.md`.
