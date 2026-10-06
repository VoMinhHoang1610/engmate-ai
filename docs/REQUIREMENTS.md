# Yêu cầu và backlog

Cập nhật: 2026-10-06. Phạm vi hiện tại: khung API và bản demo frontend đa trang cho EngMate-AI.

| ID | Yêu cầu khung | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| S-01 | Web JavaScript/TypeScript, React/Vite, TypeScript strict | lint/type-check, build | Đã test |
| S-02 | Backend Python, FastAPI và schema Pydantic | pytest, mypy | Đã test |
| S-03 | AI qua interface; mock miễn phí và prompt tách file | Unit service, integration mock | Đã test |
| S-04 | Unit/integration test backend; test API client/component/hook frontend | pytest/Vitest và coverage ≥80% | Đã test |
| S-05 | Web kết nối backend với trạng thái tải/lỗi | UI tests, HTTP proxy smoke | Đã test |
| S-06 | Documentation để cập nhật tiến độ, quyết định và yêu cầu | Rà soát docs/PROGRESS | Đã rà soát |
| S-07 | Setup nhất quán, lockfile, Docker, pre-commit và CI | Setup, Docker smoke, hook local | Đã test local; CI chờ chạy GitHub |

## Bản demo frontend

| ID | Yêu cầu demo | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| D-01 | Giao diện hiện đại, sidebar desktop và menu drawer trên mobile | Responsive review, build | Đã hoàn thành |
| D-02 | 10 trang học tập: tổng quan, hội thoại AI, luyện nói, chủ đề nhập vai, luyện nghe, luyện viết, sổ từ vựng, flashcard, hồ sơ và cài đặt; trang đăng nhập độc lập | Vitest route/menu/tài khoản | Đã test |
| D-03 | Tên file, component và hash route tiếng Việt không dấu | Rà soát `frontend/src` | Đã hoàn thành |
| D-04 | Lưu hồ sơ, từ vựng, thống kê ngày và lịch ôn trong trình duyệt | Test lưu/khôi phục/lỗi storage | Đã test |
| D-05 | Hội thoại gọi `/api/ai/reply`; các phản hồi mô phỏng phải có nhãn rõ ràng | Test success/error/abort | Đã test với mock |
| D-06 | Dùng Web Speech và MediaRecorder khi trình duyệt hỗ trợ, có fallback khi không hỗ trợ | Unit/component test với browser API mock | Đã test mức component |
| D-07 | Tích hợp logo theo ảnh cung cấp, favicon và màu thương hiệu; bố trí vừa desktop/mobile | Build, ESLint/TypeScript, test shell/route, Chrome 1440/360/390/760 px | Đã kiểm chứng giao diện; test toàn bộ còn lỗi văn bản Việt hóa |
| D-08 | Thanh cuộn mờ dần khi hiện/ẩn, chỉ hiện khi cuộn và không làm đổi bố cục | Vitest timer/sự kiện/cleanup, Chrome alpha trung gian desktop/mobile, build | Đã test |
| D-09 | Chỉ chú thích demo cạnh tính năng AI, không có nhãn demo chung hoặc ở tài khoản/flashcard/hồ sơ | Vitest giới hạn nhãn và luồng tài khoản; Chrome 10 route, 1440/360/390 px | Đã test |
| D-10 | Cài đặt có giao diện sáng/tối/theo hệ thống, giảm chuyển động và tốc độ đọc; chỉ chứa tùy chọn học tập | Vitest lưu/khôi phục/migration/matchMedia/Web Speech, Chrome desktop/mobile/reload | Đã test |
| D-11 | Menu avatar mở qua hover hoặc bấm: khách chỉ có Đăng nhập; đã đăng nhập có Hồ sơ học tập và Đăng xuất | Vitest hover/click/route/Escape/outside/logout; Chrome trạng thái phiên | Đã test |
| D-12 | Đăng nhập/đăng ký/khôi phục tại `#dang-nhap` với bố cục riêng; không sidebar/topbar học tập, giữ liên kết cũ và có nút về học tập | Vitest tách bố cục/alias/chuyển trang/giữ theme, Chrome 360/390/760/1440 px và luồng phiên | Đã test |
| D-13 | Nội dung giao diện gọn; bỏ mô tả nhỏ dưới tên thành phần, chỉ giữ nội dung học và thông tin thao tác cần thiết; hướng dẫn phụ mở khi cần | Vitest nhãn/điều khiển/cài đặt/route/flashcard/details; lint/build/smoke; Chrome 11 trang sáng/tối từ 320–1440 px | Đã test |
| D-14 | Thêm trang trí và animation cho toàn giao diện: banner/nhân vật, thẻ màu, hover, chuyển trang, nút và các trang luyện tập; giữ chữ gọn, hỗ trợ giảm chuyển động | Chrome chuyển động thực/hover/giảm chuyển động/responsive; Vitest luồng đang có, lint/build/smoke | Đã test |
| D-15 | Dùng robot đã chọn làm linh thú Mate nhất quán; biểu cảm theo hoạt động/kết quả, giao diện học vui với thẻ nổi, giữ đăng nhập riêng/chữ gọn | Vitest kết quả nghe/ôn/mục tiêu; Chrome sáng/tối/mobile/giảm chuyển động, lint/build/smoke | Đã test |
| D-16 | Thêm giao diện Google/Facebook/GitHub; panel Mate cuộn đổi đăng nhập ↔ đăng ký theo brand EngMate, form mở theo hướng; chỉ hoàn thiện giao diện | Vitest không tạo phiên xã hội giả/giữ dữ liệu/luồng tài khoản; Chrome đo translate panel/form desktop + mobile xếp dọc/giảm chuyển động; lint/build | Đã test giao diện; OAuth chưa kết nối |

Ứng dụng chưa tạo tài khoản backend hoặc gửi email, chưa có STT/chấm phát âm thật và chưa phân tích bài viết bằng mô hình AI. Chú thích demo chỉ hiển thị cạnh tính năng AI; trang tài khoản ghi thông tin học tập được lưu trên trình duyệt.

## Backlog sản phẩm

1. SQLAlchemy async, PostgreSQL, Alembic và models User/LearnerProfile/Conversation/Message/ErrorRecord.
2. Đăng ký/đăng nhập JWT, hồ sơ CEFR và kiểm tra quyền sở hữu; xóa dữ liệu tài khoản.
3. Hội thoại, lưu lịch sử và chat streaming; phân tích/sửa lỗi ngữ pháp/từ vựng.
4. Adapter LLM thật, retry/fallback/timeout, contract output và thử nghiệm sư phạm.
5. Kết nối UI demo với auth/chat/DB thật; thêm MSW và Playwright E2E cho luồng trình duyệt hoàn chỉnh.
6. Đo độ trễ, xử lý client ngắt kết nối và lỗi hạ tầng.
7. Bộ nhớ dài hạn, tóm tắt và dashboard tiến bộ sau MVP. STT/TTS khi được yêu cầu.

Mock hiện chỉ trả response xác định và nhãn `provider=mock`, không phân tích lỗi hoặc tạo phản hồi AI thật.
