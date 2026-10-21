# Changelog

## 2026-10-18 — Chọn giọng của Mate trong Cài đặt

- Thêm lựa chọn giọng tiếng Anh và tiếng Việt trong **Cài đặt → Âm thanh & giọng đọc**, lấy danh sách từ dịch vụ Blaze.
- Có nút nghe thử/dừng theo thao tác người học, trạng thái tải và thử lại khi danh sách hoặc âm thanh gặp lỗi.
- Nhớ giọng và tốc độ riêng theo tài khoản trên trình duyệt hiện tại; dùng chung với menu âm thanh trong chat, giọng đọc mẫu và phiên thoại Blaze tiếp theo. Không đồng bộ sang thiết bị khác.
- Giữ Gemini xử lý nội dung, Blaze phát giọng và ngôn ngữ nhận dạng hiện có; không thay schema database.

## 2026-10-18 — Màu tương tác và chữ dễ đọc hơn

- Bổ sung xanh dương cho thao tác chính, tím cho học tập, xanh ngọc cho tiến độ;
  sidebar, thẻ và chặng học có màu phân nhóm ở cả giao diện sáng và tối.
- Mục đang chọn có nền màu/vạch nhấn, hover đổi viền/nền, focus có vòng rõ;
  nút gửi, micro, trạng thái thoại và câu trả lời được phân biệt dễ hơn.
- Tăng cỡ và độ tương phản chữ mô tả, điều hướng, ô nhập và tin nhắn;
  giữ bố cục ổn định khi tương tác và hỗ trợ điện thoại.

## 2026-10-18 — Không gian học tối giản với thanh bên

- Chuyển không gian sau đăng nhập sang bố cục thanh bên thu gọn/mở rộng theo mẫu người dùng cung cấp; trên điện thoại mở điều hướng bằng nút menu.
- Dùng nền trung tính, viền mảnh và khoảng cách rõ ràng cho chat, lộ trình, lớp học, hồ sơ và cài đặt; giữ sáng/tối và linh vật Mate.
- Giữ điều hướng bài học, phát âm, từ vựng, tiến độ và lịch sử hội thoại; hồ sơ/cài đặt vẫn dùng dữ liệu tài khoản hiện có.
- Giữ luồng học TOEIC và đối thoại Gemini + Blaze; không thay API, database hay cách tính hoàn thành bài trong đợt chỉnh giao diện này.

## 2026-10-18 — Đồng bộ SQL khởi tạo với dự án hiện tại

- File SQL root tạo đủ 13 bảng/4 trigger, gồm bốn bảng lưu kế hoạch, tiến độ,
  liên kết hội thoại và receipt của lộ trình TOEIC, khớp metadata backend.
- Giữ base schema version 1, bảy mức CEFR và các bảng tài khoản/hồ sơ/hội thoại
  hiện có. Giáo án vẫn dùng JSON của server, avatar lưu ở thư mục riêng.
- Bản cài mới không cần chạy thêm installer. Database cũ thiếu bảng lộ trình
  dùng installer bổ sung; không chạy lại bootstrap lên dữ liệu đang dùng.
- Thêm kiểm thử cấu trúc MySQL và mở rộng SQL kiểm tra chỉ đọc.

## 2026-10-18 — Lộ trình TOEIC đối thoại bằng giọng nói

- Thay lộ trình bốn chủ đề bằng **5 chặng, 25 cụm, 100 bài học nhỏ** từ nền tảng đến các mục tiêu 450/650/800/900+. Mỗi bài có lời giảng, mẫu câu, ví dụ/dịch, từ vựng, tình huống đối thoại, thực hành nghe/đọc và câu kiểm tra.
- Học cùng Mate qua năm bước: khởi động, nghe giảng, luyện cùng, đối thoại và tự kiểm tra. Giọng nói là cách học chính: Gemini xử lý nội dung, Blaze nhận và đọc lời nói; vẫn gõ được khi không bật micro. Giữ chat tự do riêng.
- Kế hoạch, bước đang học, hội thoại, số lượt luyện thực tế, kết quả kiểm tra và lịch ôn lưu theo tài khoản trên máy chủ. Lưu mục tiêu có kiểm tra phiên bản; lỗi/xung đột giữ lựa chọn để người học kiểm tra và thử lại.
- Kiểm tra chấm bằng đáp án chuẩn ở máy chủ; chỉ trả đáp án/giải thích sau khi nộp. Hoàn thành cần ít nhất 3 lượt đối thoại thực tế có phản hồi hoàn tất và đúng toàn bộ câu kiểm tra. Có gợi ý bài tiếp theo, bài đến lịch ôn và tiến độ theo bằng chứng đã lưu.
- Các chặng là cách nhóm giáo trình đề xuất; số lượt/câu đúng không phải điểm TOEIC hay điểm phát âm. Chưa có placement test chuẩn hóa, ngân hàng ảnh Part 1 hoặc đề đủ 200 câu. Nội dung cần được đánh giá sư phạm với người học thật.

## Giọng nói Mate: Blaze, nội dung: Gemini

- Thoại tự nhận lượt nói, dùng Blaze chép lời và đọc câu trả lời Gemini.
- Danh sách giọng đối thoại đổi sang catalog Blaze Việt/Anh; có ngắt lời, mute,
  đổi giọng và dọn tài nguyên khi kết thúc/rời trang.
- Bỏ nhánh đọc bằng giọng máy. Thiếu/lỗi Blaze báo lỗi thay vì phát giọng Gemini.
- Mặc định `VOICE_PROVIDER=blaze`; Gemini Live/OpenAI Realtime chỉ còn adapter
  tương thích khi chủ động chọn `native`. Không thay database hoặc giáo trình.

## 2026-10-18 — Khôi phục hồ sơ cá nhân

- Mở avatar → Hồ sơ học tập để dùng lại trang thông tin cá nhân từ giao diện cũ, phù hợp màu sáng/tối của lớp học hiện tại.
- Đọc/lưu họ tên, điện thoại, ngày sinh, giới tính, trình độ, mục tiêu và thời lượng học vào tài khoản thật; báo xung đột khi hồ sơ đã được sửa từ phiên khác.
- Đổi ảnh đại diện PNG/JPEG/WebP và cập nhật avatar menu; ảnh lưu riêng tư, truy cập có xác thực.
- Sửa thao tác hover rồi click avatar để menu không đóng ngay trước khi chọn hồ sơ.

## 2026-10-18 — Lớp học cùng thầy Mate

- Thiết kế lại đăng nhập và không gian học theo Figma Tutor journey, dùng linh thú Mate gốc làm người thầy.
- Thêm điều hướng Cùng Mate, Lộ trình, Bài học, Phát âm, Từ vựng và Tiến độ; giữ chat/voice thật, lịch sử trong ngăn kéo và theme sáng/tối.
- Bốn chủ đề có bài giảng, ví dụ và yêu cầu thực hành; mục tiêu/thời lượng/mức bắt đầu có thể điều chỉnh.
- Nghe mẫu, ghi âm chép lời, tự đánh dấu từ đã nhớ và bài hoàn thành; hiển thị dữ liệu thật do người học ghi nhận, không giả lập điểm. Dữ liệu học mới lưu trên trình duyệt riêng từng tài khoản.
- Prompt v5 hướng dẫn Mate giảng giải, làm mẫu, chờ câu trả lời rồi nhận xét cho cả chat và thoại.

## 2026-10-18 — Link HTTPS chia sẻ tạm thời

- Thêm Compose/proxy Nginx riêng phục vụ bản build qua HTTPS tunnel, hỗ trợ cấu hình SSE/WebSocket và giữ các cổng dev/database ở loopback.
- Hướng dẫn bật/dừng chia sẻ, cấu hình Origin và giới hạn 60 phút của phiên Pinggy miễn phí trong README.

## 2026-10-18 — Đồng bộ URL sau đăng nhập

- Đăng nhập/đăng ký thành công đổi URL sang `#hoi-thoai`; đăng xuất hoặc hết phiên trả về `#dang-nhap`, không tải lại trang.
- Sửa hash hoặc quay lại URL cũ không làm mất bản nháp hay thay đổi quyền truy cập.

## 2026-10-18 — Ô nhập một hàng, sáng/tối và đổi giọng khi gọi

- Canh ô nhập và các icon trên một hàng, bỏ toolbar tầng dưới và viền focus lồng bên trong; placeholder không tự làm khung cao thêm trên điện thoại.
- Icon tai nghe mở tùy chọn giọng. Nút mặt trăng/mặt trời chuyển sáng/tối nằm trên topbar cạnh tài khoản và nhớ lựa chọn.
- Cho phép đổi giọng đang thoại: tự nối lại trong cùng hội thoại, giữ lịch sử đã lưu/mute; bấm kết thúc hoặc rời chat sẽ hủy lần nối lại đang chờ.

## 2026-10-17 — Khung chào mới và thanh nhập bằng icon

- Vào app mở lời chào và ô nhập trống; lịch sử chỉ mở khi được chọn. Hội thoại mới chỉ được lưu khi gửi tin đầu tiên hoặc bắt đầu gọi thoại.
- Gom tùy chọn âm thanh, ghi âm, thoại trực tiếp và gửi vào cùng khung nhập. Chọn giọng trong menu bánh răng, có nhãn truy cập/tooltip; Escape và click ngoài đóng menu.
- Chỉ hiển thị phụ đề khi đang thoại; kết thúc cuộc gọi trả lại thanh nhập gọn.

## 2026-10-16 — Hội thoại Việt/Anh, giọng Live và giao diện gọn

- AI theo tiếng Việt/Anh của lượt nói hoặc tin nhắn mới nhất; có thể yêu cầu dịch/song ngữ/luyện tiếng Anh rõ ràng.
- Chọn giọng Gemini cho thoại trực tiếp trước khi gọi, tách khỏi giọng Blaze đọc tin nhắn; không đổi giọng giữa phiên.
- Lịch sử chuyển sang sidebar trái, vùng chat rộng hơn; ô nhập gọn, tùy chọn âm thanh trong nút bánh răng, bỏ dòng thông tin lặp. Giữ trang đăng nhập/đăng ký và nhận diện EngMate.
- Nghe câu trả lời hỗ trợ giọng Việt/Anh; ghi âm từng lượt chọn ngôn ngữ trong menu âm thanh.

## 2026-10-16 — Cố định khung hội thoại

- Khung chat vừa chiều cao màn hình; tin nhắn và lịch sử cuộn riêng, gửi/nhận tin không kéo cả trang.
- Ô nhập giữ trong khung khi nội dung thoại dài; lịch sử chuyển sang drawer trên màn hình hẹp. Giữ giao diện gốc và thu gọn khoảng trống khi màn hình thấp.

## 2026-10-16 — Hội thoại dùng Gemini thay OpenAI

- Gemini là provider mặc định cho chat streaming và thoại trực tiếp Live; giữ giao diện cũ, tài khoản/lịch sử/MySQL và Blaze STT/TTS.
- Khóa Gemini chỉ ở backend. Thoại dùng relay WebSocket, ticket một lần, PCM capture/playback có giới hạn, mute/cleanup/reconnect và xóa audio khi ngắt lời. Header hiển thị đúng GEMINI.
- Không cần credit OpenAI cho cấu hình mới; lỗi Gemini vẫn được báo thật, không fallback. Chưa xác minh thoại bằng microphone/loa vật lý.

## 2026-10-16 — Chat OpenAI streaming và Voice WebRTC

- Chat dùng OpenAI Responses, hiển thị từng delta vào cùng assistant message; có Dừng phản hồi, giữ draft/retry UUID và lưu kết quả thật trong MySQL. Lỗi/quota không fallback câu trả lời giả.
- Thêm Bắt đầu/Kết thúc thoại, Mute và trạng thái theo WebRTC/VAD; nói chen hủy/clear/truncate audio cũ. Backend sideband lưu transcript provider vào cùng lịch sử; cleanup/reconnect có hạn. Giữ phong cách giao diện cũ và Blaze STT/TTS từng lượt.
- Key OpenAI chỉ backend/.env; runtime từ chối mock. Đã triển khai và test offline; kiểm chứng live chưa hoàn tất vì OpenAI trả credit_balance_exhausted. Chưa khẳng định giọng nói/echo/interrupt hoạt động trên thiết bị thật.

## 2026-10-16 — Khôi phục giao diện gốc theo yêu cầu

- Khôi phục màu sắc, CSS, logo, linh vật Mate, sidebar/topbar và bố cục hội thoại/lịch sử gốc. Đăng nhập/đăng ký trở lại pane trượt, nền/hiệu ứng Mate và xác nhận mật khẩu.
- Menu avatar giữ tương tác hover/touch/bàn phím; đăng xuất vẫn thu hồi phiên qua REST. Giữ xử lý tài khoản/lịch sử/chat/speech đã sửa; không đưa lại các tính năng học tập phụ.
- Cấu hình khóa Blaze riêng trong `.env` backend, không đưa vào source/frontend. Chưa gọi upstream tính phí; Blaze Chat/realtime vẫn phụ thuộc hợp đồng API.

## 2026-10-16 — Bản hội thoại (breaking API)

- Thay giao diện học tập nhiều trang bằng tài khoản và không gian hội thoại; giữ lịch sử riêng, tạo/mở/kết thúc, chat chữ và speech từng lượt.
- Bỏ lộ trình/bài tập/chấm điểm/flashcard/sổ từ/dashboard/onboarding/hồ sơ mở rộng và API phụ. Bỏ tài khoản demo/OAuth giả/SMTP reset; xem API.md cho endpoint đã loại.
- Lịch sử mới nhất trước, phân trang vượt 100; retry/draft/cancel/stale pending, response schema và lỗi mạng rõ ràng.
- Schema cài mới chỉ có 9 bảng; database cũ được bảo toàn. Dev/build cùng gọi REST API.
- Hiển thị rõ trạng thái mock và cấu hình Blaze chưa sẵn sàng. AI thật và realtime còn chờ contract upstream; không được công bố là đã hoạt động.

2026-10-09: bỏ trạng thái “Đang tạo giọng nói…” và giữ biểu tượng nút Nghe. Nạp sẵn bộ phát/tái dùng clip, bỏ chờ preload 250 ms; khi Blaze chưa có âm thanh, dùng giọng tiếng Anh cục bộ để phát nhanh. Nghe thử giọng luôn giữ đúng lựa chọn Blaze. Dừng/đổi trang/logout dừng cả hai loại tiếng, không phát MP3 muộn chồng lên giọng máy.

2026-10-09: mở/tải lại ứng dụng MySQL hiện đăng nhập trước; đăng nhập chờ tải dữ liệu rồi vào Tổng quan ngay, không cần tải lại hay bấm thêm liên kết. Nút giữ trạng thái xử lý trong khi tải; lỗi tải cho thử lại. Tài khoản mới vẫn qua bước làm quen, dữ liệu MySQL giữ nguyên sau đăng nhập lại.

2026-10-09: kết nối backend và giao diện với MySQL EngMateAI. Đăng ký/đăng nhập thật; lưu onboarding/bảy mức, hồ sơ, giọng/cài đặt, từ/flashcard, bài làm, hội thoại và thống kê theo tài khoản. Reading/Listening chấm server, dictation nghe MP3 không lộ text key. Tải lại/đăng nhập lại giữ dữ liệu; retry flashcard giữ request ID. AI chat/nói/viết vẫn mock có nhãn.

2026-10-09: hoàn thiện gemini-code-1791478978574.sql cho MySQL: bảy mức học, Reading, lựa chọn giọng, trạng thái làm quen, timestamp và seed khớp frontend. Đã thực thi thử schema với 45 kiểm tra trên MySQL 8.0.45; chưa chuyển backend.

## [Unreleased]

### Hợp nhất giao diện mới vào develop — 2026-10-08

- Bổ sung Reading, lộ trình Pre-A1 đến C2, nhập môn, Mate làm quen sau đăng nhập và nút hỗ trợ mới; giữ backend/API SQL Server đã hoàn thiện.
- Giữ sửa lỗi intro một lần mỗi tab, username/email và storage jsdom; cập nhật test đăng ký/đăng nhập theo bước làm quen, giữ kiểm tra luyện tập và kéo hỗ trợ.
- API mock reply nhận bảy mức với prompt v2; API lưu SQL v1 vẫn nhận A2/B1/B2 và trả 422 cho mức chưa hỗ trợ.

### Bản demo develop — 2026-10-07

- Hợp nhất UI đa trang, schema SQL Server, backend API và CI/Docker; thêm hướng dẫn demo và bảng các nhánh nguồn.
- Sửa lỗi build/lint của nút hỗ trợ/profile/intro; tên hồ sơ rỗng không được lưu, login không xóa email, ô mật khẩu được xóa khi đổi chế độ và title khớp trạng thái đăng nhập.
- Khôi phục bộ test UI theo đăng nhập demo abc/123 và storage jsdom; kiểm tra trọn backend/frontend cùng ngưỡng coverage 80%.

### Backend/API SQL Server — 2026-10-07

- Hoàn thiện API auth JWT/Argon2, reset/đổi mật khẩu và thu hồi phiên; hồ sơ/cài đặt/account dùng rowversion.
- Thêm catalog, hội thoại/lịch sử/evaluation, luyện nghe/nói/viết, notebook/mastery, flashcard/review và dashboard theo schema hiện có.
- Media private: avatar và recording kiểm tra định dạng/duration; chấm listening bằng đáp án SQL, AI mock được ghi nhãn rõ.
- Hoàn thiện ownership, request UUID/retry, rollback, worker thread/timeout/cancel, input limits và error responses không lộ bí mật.
- Thêm migration runner, OpenAPI export cho Postman, hướng dẫn DB/JWT/SMTP, Docker ODBC/ffmpeg/media volume và workflow SQL Server tests.
- Giao diện nghiệp vụ vẫn ở nhánh riêng chưa nối API. Chưa thêm OAuth, STT, streaming, provider AI thật hoặc gửi thử SMTP thật. Kết quả test cụ thể xem PROGRESS.

### Thiết kế database SQL Server — 2026-10-07

- Khảo sát toàn bộ giao diện/nghiệp vụ; bổ sung tài liệu ERD, từ điển dữ liệu, ánh xạ localStorage và quy tắc giao dịch.
- Thêm schema 22 bảng, 2 view, seed 8 chủ đề/9 bài/4 câu hỏi/6 lựa chọn và truy vấn mẫu cho SQL Server; thay PostgreSQL trong kế hoạch triển khai tiếp.
- Bộ kiểm thử database chạy 45/45 kiểm tra trên SQL Server 2022, rollback toàn bộ môi trường thử. Chưa tích hợp database/auth/OAuth vào backend hoặc thay đổi cách chạy ứng dụng.

### Added

- Mate chào và hỏi khả năng tiếng Anh ngay sau đăng nhập đầu tiên bằng bảy mô tả dễ hiểu, từ bắt đầu số 0 đến diễn đạt tự nhiên; không hiện mã A1/A2 trong lựa chọn. Câu trả lời tự đặt mức học, lưu và đưa vào tổng quan; lần đăng nhập sau không hỏi lại. Người đăng ký mới được làm quen lại.
- Trang Lộ trình học từ Pre-A1 đến C2, điểm bắt đầu cho người chưa từng học, phần chữ cái/số đếm/lời chào có phát âm chậm; chọn chặng lưu trong hồ sơ.
- Nội dung Speaking, Listening, Reading, Writing và nhập vai theo cả bảy mức; API hội thoại chấp nhận Pre-A1/A1/C1/C2 cùng ba mức cũ. Người mới mặc định Pre-A1; dữ liệu trình độ cũ được giữ.

- Mate hỗ trợ cầm ống nghe điện thoại bàn cổ điển có dây xoắn, rung nhẹ tự động theo nhịp; tạm dừng khi kéo và tắt theo tùy chọn giảm chuyển động.

- Nút hỗ trợ dùng Mate đang nghe điện thoại, nền kính mờ lúc nghỉ và đậm khi hover/kéo. Kéo bằng chuột/cảm ứng, giới hạn nút và hộp hỗ trợ trong màn hình; hỗ trợ Escape và bàn phím.

- Reading: 3 bài A2/B1/B2 với 9 câu hỏi đọc hiểu, chấm điểm và giải thích, làm lại, lưu từ vựng và ghi nhận phút luyện tập. Thêm trong menu và tổng quan; tên kỹ năng đổi thành Speaking, Listening, Reading, Writing.

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

## 2026-10-08 — Blaze speech

Thêm POST /api/speech/tts (MP3) và /api/speech/stt (transcript), cấu hình server-only và test. UI đã dùng giọng đọc Blaze, tự chép lời Speaking và có micro nhập bản nháp Hội thoại.

Cài đặt có mục Giọng nói: chọn giọng tiếng Anh theo nhóm nam/nữ, nghe thử/dừng; tự lưu và áp dụng cho toàn bộ nút Nghe.

Giảm độ trễ nút Nghe: chuẩn bị clip hiện tại trước click, cache RAM có giới hạn, chia sẻ lượt tải và phát lại không gọi TTS lần nữa. Đổi giọng/tốc độ không dùng nhầm clip; logout xóa âm thanh đã lưu. Lần chưa chuẩn bị vẫn chờ provider.
