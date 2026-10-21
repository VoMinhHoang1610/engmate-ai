# Mate lắng nghe

Hướng thiết kế đã được người dùng duyệt ngày 18/10/2026. Triển khai từ bản nguyên tắc đã chốt; không mở lại nguồn tham khảo khi viết giao diện. Không cài thêm package. Lucide và Motion đã có sẵn trong dự án.

## Bảy nguyên tắc và nơi áp dụng

| Nguyên tắc | Áp dụng |
| --- | --- |
| Một hành động nổi bật | Nút Nói cùng Mate ở trang bắt đầu; nút chính chờ danh sách giọng sẵn sàng. |
| Giọng nói dẫn đường | Orb và câu hiện tại là vùng chính; lịch sử phiên thật được mở bằng Xem bản chép lời. |
| Trạng thái thật | Map trạng thái phiên thật sang rảnh, nghe, nghĩ, nói; kết nối có nhãn riêng; tắt mic ngừng biểu cảm nghe. |
| Chuyển động có ý nghĩa | Thở nhẹ, nghiêng khi nghe, anten khi nghĩ, miệng và thân phản ứng khi nói; không có quỹ đạo hay hạt bay trên orb mới. |
| Thông tin từng chút | Một caption hiện tại; phiên thật có lịch sử thu gọn. Điện thoại hẹp giảm gợi ý để nút chính luôn nhìn thấy. |
| Tiến bộ có ngữ cảnh | Trạm học thẳng, tiêu đề tình huống, dấu hoàn thành vàng dịu; dữ liệu tài khoản không thay bằng điểm mô phỏng. |
| Dễ hiểu và điều khiển được | Nhãn trạng thái, focus và dialog hiện có, bàn phím, aria-expanded cho lịch sử, CSS giảm chuyển động. |

## Bản sắc

- Orb tự dựng bằng CSS: vỏ trắng xanh, mặt navy, mắt cyan, anten; giữ robot đầy đủ ở chào hỏi bản xem trước và phản hồi hoàn thành bài học.
- Nền `#F3F8FC`, chàm `#5146D9`, vàng anten `#FFDF77`. Vùng hoàn thành dùng nền vàng nhạt với chữ nâu đậm. Thành công của bài kiểm tra kiến thức không được gọi là điểm phát âm.
- Desktop có câu bên trái và Mate bên phải; điện thoại có thứ tự dọc. Lộ trình dùng trạm theo một trục thẳng thay đường node uốn lượn.
- Chuyển động mềm và đàn hồi nhẹ. Giảm chuyển động bỏ animation và transition của orb; trạng thái vẫn được mô tả bằng chữ và hình tĩnh.
- Microcopy tiếng Việt viết riêng; icon cũ được ánh xạ sang Lucide mà giữ API BieuTuong cho các màn hiện tại.

Ba khác biệt rõ nhất: khuôn mặt robot và anten trên orb, phối xanh lạnh–chàm–vàng, bố cục hội thoại lệch cùng trạm học thẳng.

## Giọng nói và dữ liệu

`MateOrb` được dùng chung cho bản đăng nhập và `?mode=preview`. Bản xem trước tiếp tục có nhãn mô phỏng và không thu micro.

Ở bản thật, `VoiceEvents.level` là callback tùy chọn. Bộ phân tích lấy RMS mỗi 80 ms từ nguồn micro/âm thanh đang phát của OpenAI, Gemini hoặc Blaze. Bộ đo không xin thêm micro, không tải âm thanh lên dịch vụ khác và chỉ ngắt nhánh analyser khi dừng. Khi không có Web Audio analyser, orb vẫn biểu thị trạng thái. Mỗi transport đóng bộ đo khi phát xong, ngắt lời hoặc đóng phiên. Giọng Blaze giữ đường phát hiện có và chỉ dùng nguồn media element khi API phân tích khả dụng.

Trong lúc tắt micro, Mate vẫn biểu thị giọng đang phát của trợ lý. Trong preview, tạm dừng/tắt mic ngừng chuyển động của orb.

## Kiểm chứng

- Frontend: toàn bộ 299 tests qua, gồm luồng mở phiên, đổi giọng, lỗi tạo hội thoại, caption, bài học và cleanup. Bộ đo có kiểm tra RMS, im lặng, đóng đúng nhánh âm thanh, dọn timer và fallback.
- ESLint, TypeScript và production build qua.
- Kiểm tra bằng trình duyệt: preview trang đầu, phiên thoại, lộ trình; workspace thực được render trong harness dữ liệu QA tách biệt, không đăng nhập và không gọi backend thật. Các kích thước gồm desktop, 390×844 và 320×740; kiểm tra không tràn ngang và nút nói không bị composer che.
- Ảnh chụp nằm trong `.artifacts/mate-listens-*.jpg`. Harness nguồn ở `.artifacts/mate-listens-review.html`; bản tạm trong frontend được xóa sau QA.
- Chưa kiểm chứng bằng micro/loa vật lý hay cuộc gọi AI tính phí trong đợt thiết kế này. Kiểm tra tự động dùng audio/transport doubles; không suy diễn thành chất lượng giọng hoặc phát âm thực tế.

## Cấu trúc chính

- `frontend/src/components/MateOrb.tsx`, `mate-orb.css`: tạo hình và bốn trạng thái.
- `frontend/src/components/mate-listens.css`: nhận diện, bố cục, responsive và giảm chuyển động.
- `frontend/src/components/BieuTuong.tsx`: dùng Lucide thống nhất.
- `frontend/src/Chat.tsx`, `voice/VoiceChat.tsx`: nút bắt đầu, caption và lịch sử thu gọn của phiên thật.
- `frontend/src/voice/visualLevel.ts`: bộ đo âm lượng và cleanup.
- `frontend/src/voice-first/`: bản xem trước có cùng orb, lộ trình thẳng và kết quả minh họa.

Tự đánh giá: bảy nguyên tắc đã có điểm áp dụng; các yêu cầu mascot, màu, bố cục, chuyển động, microcopy và icon đã được đối chiếu. Nhận diện khi che logo là đánh giá thiết kế nội bộ, chưa phải kết quả nghiên cứu người dùng.
