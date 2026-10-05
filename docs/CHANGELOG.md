# Changelog

## [Unreleased]

### Added

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

- Thay mục sidebar Tài khoản bằng Cài đặt; đăng nhập/đăng ký/khôi phục tài khoản nằm trong mục Tài khoản của Cài đặt. Giữ liên kết cũ `#tai-khoan`.
- Thanh cuộn hiện và ẩn bằng hiệu ứng mờ dần 280 ms; menu mobile giữ hiệu ứng tương tự, bố cục 360 px không bị tràn do độ rộng thanh cuộn.
- Bỏ nhãn demo trên thanh trên cùng, tài khoản, hồ sơ, lịch flashcard và ghi chú chung; chỉ gắn `AI · Demo` cạnh chức năng AI.
- Thanh cuộn trang/menu/vùng nội dung mặc định trong suốt, chỉ hiện khi cuộn và tự ẩn sau 1 giây dừng cuộn, không làm xê dịch bố cục.
- Thay trang health khởi tạo bằng app EngMate-AI đa trang; endpoint AI mock hiện được dùng trong trang hội thoại.
- Health route chuyển thành `/api/health`; cổng local mặc định 8010/5174.
- Loại bỏ phụ thuộc GNU Make trong wrapper Windows và các cấu hình thừa của khung cũ.

Kết quả chạy thật và các giới hạn ghi trong `PROGRESS.md`.
