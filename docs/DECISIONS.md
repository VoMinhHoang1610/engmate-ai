# Quyết định kỹ thuật

## 2026-10-06 — Panel cuộn tài khoản theo brand EngMate

- Tham khảo logic đổi nửa form/nửa CTA của các tutorial đăng nhập, nhưng không dùng bố cục cyan đặc/trắng phẳng. Panel dùng gradient navy→cyan, Mate làm điểm nhấn, sóng SVG và quỹ đạo để khớp nhận diện dự án.
- Animation chính là `translate` đồng bộ giữa panel và form (~0.92s), kèm clip-path “mở cuộn”, stagger field, ribbon/tia sáng; không thêm thư viện. Mobile bỏ slide ngang, dùng pill; giảm chuyển động tắt CSS/WAAPI chiều cao.
- Giữ một form trong DOM, nút xã hội chỉ giao diện, khôi phục mật khẩu full-width.

## 2026-10-06 — Giao diện đăng nhập xã hội và chuyển cảnh

- Người dùng chọn hoàn thiện giao diện trước khi kết nối OAuth thật. Thêm ba nút có logo riêng, callback và thông báo chưa khả dụng; không tạo phiên mô phỏng nhà cung cấp, không mở trang ngoài hoặc thêm cấu hình OAuth chưa dùng.
- Chỉ giữ một biểu mẫu trong DOM, dùng key theo chế độ để làm mới ô mật khẩu nhưng giữ tên/email trong state. CSS chuyển mờ/trượt theo hướng, nghiêng nhẹ và dịch nền tab. Đo chiều cao tự nhiên trong layout effect rồi dùng Web Animations API 420 ms để khung không nhảy; khi bấm nhanh, hủy chuyển động cũ và bắt đầu từ vị trí hiện tại.
- Không thêm thư viện. Chế độ giảm chuyển động tắt CSS và bỏ/hủy animation chiều cao; listener tùy chọn hệ thống được dọn khi rời trang. Các nút và trạng thái vẫn dùng được bằng bàn phím/trình đọc màn hình.

## 2026-10-06 — Mate trở thành linh thú dự án

- Giữ robot trắng/xanh nhạt, mặt navy, mắt cyan và anten vàng đã được người dùng chọn; đặt tên Mate và dùng nhất quán. Thêm tay/biểu cảm và tai nghe, phát triển bản sắc riêng quanh sự đồng hành khi học.
- Tách nhân vật thành `LinhThu` để các trang chia sẻ tỷ lệ và biểu cảm; `TrangTri` chỉ phụ trách bối cảnh banner. Dùng CSS đang có, không thêm thư viện animation hay vòng render liên tục. Có bản vector tĩnh để tái sử dụng trong tài liệu.
- Biểu cảm ăn mừng dựa vào đáp án thật, phiên ôn hoàn thành hoặc mục tiêu ngày đạt; sai thì động viên. Không thêm thành tích/XP/chuỗi ngày giả, không biến phản hồi AI mẫu thành đánh giá thật. Giữ thông báo chữ và hai chế độ giảm chuyển động.

## 2026-10-06 — Bổ sung trang trí và chuyển động

- Theo phản hồi giao diện quá đơn điệu, thêm banner gradient, nhân vật CSS và các điểm nhấn màu theo nhóm thẻ; giữ nội dung nhãn gọn đã được yêu cầu trước đó.
- Dùng CSS keyframes/transition cho hiệu ứng vào trang, thẻ xuất hiện lần lượt, hover, nút, nhân vật/orbit và các trạng thái luyện tập. Không thêm thư viện hay JavaScript cập nhật mỗi khung hình; phần lớn chuyển động dùng transform/opacity.
- Trang trí tách trong `TrangTri`, bỏ khỏi cây trợ năng và không chặn chuột. Giảm chuyển động từ Cài đặt hoặc hệ thống tắt animation/transition nhưng vẫn giữ hình và nội dung.

## 2026-10-06 — Thiết kế tối giản và giảm mô tả phụ

- Dùng một màu nhấn xanh, nền trung tính, viền nhẹ và khoảng cách thống nhất; thay stylesheet trang trí cũ bằng biến màu sáng/tối để tránh các bảng màu riêng theo trang.
- Bỏ mô tả lặp lại nhãn/tiêu đề ngay trong JSX, thay vì chỉ ẩn bằng CSS. Giữ nội dung bài học, thông tin thay đổi quyết định thao tác (độ khó, chu kỳ ôn), lỗi/kết quả và nhãn phản hồi minh họa.
- Dùng `details` cho hướng dẫn luyện nói/flashcard nhằm giữ trợ giúp khi cần mà không chiếm bố cục ban đầu. Không thêm thư viện, không thay cơ chế lưu trữ hoặc API.

## 2026-10-06 — Tách đăng nhập khỏi không gian học tập

- Theo yêu cầu thiết kế lại, chọn trang hash riêng `#dang-nhap` thay cho nhúng biểu mẫu vào Cài đặt. Trang tài khoản có header/main/footer riêng, không hiển thị sidebar hoặc topbar học tập.
- Giữ Context/localStorage bên ngoài cả hai bố cục để chuyển trang không làm mất hồ sơ, tùy chọn hay phiên. Giữ alias tài khoản cũ; menu avatar trỏ trực tiếp đến trang mới.
- Không thêm thư viện routing; hash route hiện có đủ cho bản demo. Khách vẫn có thể học, đăng nhập thành công có nút vào tổng quan; xác thực backend tiếp tục nằm trong backlog.

## 2026-10-06 — Cài đặt và tài khoản trong app shell

- Đặt tài khoản trong `#cai-dat?muc=tai-khoan` theo yêu cầu; giữ alias `#tai-khoan` để liên kết cũ tiếp tục dùng được.
- Mở rộng Context/localStorage hiện có thay vì thêm thư viện hoặc kho dữ liệu riêng. Cài đặt được kiểm tra từng trường và bổ sung mặc định, giữ dữ liệu hồ sơ của bản cũ.
- Theme theo hệ thống dùng `matchMedia` và dataset, giảm chuyển động dùng CSS; tốc độ đọc áp dụng cho Web Speech hiện có. Không triển khai backend auth/email ngoài phạm vi thay đổi giao diện này.
- Avatar dùng disclosure có nút, liên kết và nhóm hành động, điều hướng Tab tự nhiên; thêm hover cho desktop và click cho mobile, không dùng menu ARIA giả thiếu hành vi bàn phím.

## 2026-10-04 — Dựng lại khung

- Giữ tên EngMate-AI và chọn React/TypeScript + FastAPI/Python theo yêu cầu reset.
- Dùng TypeScript strict, Pydantic, mypy và schema validation để phát hiện lỗi ở ranh giới dữ liệu.
- Tách route/service/provider, dùng mock mặc định. Chưa chọn provider thật hoặc ngân sách; không cần API key để phát triển khung.
- Task runner Python dùng argument list cho subprocess, xử lý đường dẫn Unicode đúng trên Windows; GNU Make chỉ còn là wrapper tùy chọn.
- Cổng local 8010/5174 tránh dịch vụ khác đang dùng 8000/8001/5173 trên máy hiện tại.
- Lockfile backend/npm được giữ đồng bộ với manifest. Vitest/coverage dùng 4.1.11; nguồn phiên bản vá: [advisory của Vitest](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).
- DB/auth/chat streaming được làm theo backlog khi bắt đầu nghiệp vụ; scaffold không tạo database hoặc giả lập đăng nhập.
- Bản nguồn cũ được sao lưu trong `.artifacts/before-reset-*`; Git history và môi trường cài dependency hiện có tiếp tục dùng cho checkout này.
