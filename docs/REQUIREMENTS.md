# Yêu cầu EngMate-AI — lớp học đối thoại TOEIC, 2026-10-18

## Chọn giọng trong Cài đặt — yêu cầu mới 2026-10-18

| Mã           | Yêu cầu                                                                                                                                         | Trạng thái    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| VOICE-SET-01 | Cài đặt có lựa chọn giọng tiếng Anh/Việt riêng, danh sách lấy từ Blaze qua API đã xác thực; có trạng thái tải, rỗng, lỗi và thử lại             | Đang tích hợp |
| VOICE-SET-02 | Chỉ gọi/phát nghe thử khi người học bấm nút; cho dừng, hủy khi đổi lựa chọn, rời trang hoặc tài khoản; lỗi không fallback giọng khác            | Đang tích hợp |
| VOICE-SET-03 | Nhớ giọng và tốc độ theo tài khoản trên trình duyệt hiện tại; dùng chung với menu chat, nghe câu trả lời/câu mẫu và phiên thoại Blaze tiếp theo | Đang tích hợp |
| VOICE-SET-04 | Giữ Gemini xử lý nội dung, không đổi ngôn ngữ nhận dạng theo giọng đã chọn; không thêm bảng SQL hoặc ghi tùy chọn vào tài khoản khác            | Đang tích hợp |

Phạm vi lưu giọng là trình duyệt hiện tại, chưa đồng bộ thiết bị. Chất lượng giọng và quota Blaze cần kiểm tra với dịch vụ thật; kiểm thử giả lập chỉ xác minh lựa chọn, luồng gọi và hủy âm thanh.

## Màu tương tác và khả năng đọc — cập nhật 2026-10-18

| Mã          | Yêu cầu                                                                   | Trạng thái                                          |
| ----------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| UI-COLOR-01 | Màu chính/phân nhóm và trạng thái hover/focus/chọn rõ, giữ bố cục sidebar | Đã kiểm tra Chrome, hình học không dịch             |
| UI-COLOR-02 | Chữ mô tả/điều hướng/ô nhập dễ đọc, có bảng màu sáng/tối riêng            | Đã kiểm tra tương phản các trang/trạng thái lấy mẫu |
| UI-COLOR-03 | Giữ menu, hội thoại và luồng học, không tràn màn hình nhỏ                 | 226 frontend tests qua; browser 1440/900/390/320 px |

## Giao diện tối giản với thanh bên — yêu cầu mới 2026-10-18

Phạm vi này cập nhật không gian sau đăng nhập theo mẫu thanh bên người dùng cung cấp, thay cho thanh điều hướng ngang và hiệu ứng kính của bản lớp học trước. Trang đăng nhập, nhận diện Mate và các luồng học hiện có được giữ.

| Mã         | Yêu cầu                                                                                                               | Trạng thái                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| UI-SIDE-01 | Thanh bên gọn trên desktop, mở rộng khi di chuột hoặc dùng bàn phím, có thao tác thu/mở rõ ràng và mục đang chọn      | Đã kiểm thử sidebar và browser, nội dung không dịch |
| UI-SIDE-02 | Điện thoại dùng nút menu và ngăn điều hướng; hỗ trợ Escape, đóng khi chọn mục và trả focus về nút mở                  | Đã kiểm thử unit, App và Chrome mobile              |
| UI-SIDE-03 | Điều hướng tới Cùng Mate, Lộ trình, Bài học, Phát âm, Từ vựng, Tiến độ; truy cập lịch sử, hồ sơ, cài đặt và tài khoản | Đã kiểm thử điều hướng và giữ bản nháp              |
| UI-SIDE-04 | Nền trung tính, viền mảnh, bố cục thoáng, ít hiệu ứng; hỗ trợ sáng/tối, bàn phím và giảm chuyển động                  | Đã kiểm thử đồng bộ theme và browser 4 kích thước   |
| UI-SIDE-05 | Giữ Gemini xử lý nội dung, Blaze STT/TTS, chat streaming, lịch sử, hồ sơ và tiến độ TOEIC theo tài khoản              | Giữ luồng hiện có; kiểm thử hồi quy chat/voice      |

Các mô tả giao diện ngang, nền xanh tím và hiệu ứng kính bên dưới ghi lại các đợt trước; UI-SIDE là yêu cầu trình bày hiện tại. Không thêm thư viện giao diện chỉ để chạy đoạn demo; tích hợp bố cục vào React/TypeScript hiện có của dự án.

## SQL khởi tạo theo dự án hiện tại

| Mã         | Yêu cầu                                                                                   | Trạng thái                                                 |
| ---------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| DB-BOOT-01 | SQL root tạo đủ tài khoản, hồ sơ, chat và bốn bảng lộ trình theo metadata backend         | Đã thực thi trên MySQL test mới: 13 bảng/4 trigger         |
| DB-BOOT-02 | Giữ base version 1 và CEFR hỗ trợ mọi chặng; giáo án/khóa API/avatar theo nơi lưu hiện có | Đã đối chiếu code và schema test                           |
| DB-BOOT-03 | Phân biệt cài mới với bổ sung bảng cho database cũ, giữ dữ liệu ứng dụng                  | Đã cập nhật hướng dẫn; chỉ bootstrap vào schema test riêng |

## Lộ trình TOEIC lấy đối thoại giọng nói làm chính

| Mã        | Yêu cầu                                                                                                                                             | Trạng thái                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| COURSE-01 | Catalog có xác thực: 5 chặng, 25 cụm, 100 bài nhỏ từ nền tảng đến mục tiêu 900+; mỗi bài có kiến thức/ví dụ/từ vựng/nghe/đọc/tình huống/kiểm tra    | Đã kiểm chứng schema, API và browser                   |
| COURSE-02 | Chọn điểm mục tiêu, chặng bắt đầu, phút/ngày và ngày thi tùy chọn; lưu theo tài khoản và phát hiện xung đột phiên bản                               | Đã kiểm chứng MySQL rollback và frontend tests         |
| COURSE-03 | Mở/tiếp tục hội thoại bài học; Gemini giảng, Blaze STT/TTS; năm bước khởi động/giảng/luyện/đối thoại/kiểm tra; giữ chat tự do                       | Đã kiểm chứng tích hợp với audio/API fixture           |
| COURSE-04 | Ngữ cảnh giáo án do máy chủ cung cấp; kết quả chỉ đếm lượt luyện thực tế và kiểm tra bằng đáp án chuẩn; không lộ đáp án trước khi nộp               | Đã kiểm chứng ownership, prompt, lượt và chấm server   |
| COURSE-05 | Tiến độ máy chủ, hoàn thành khi có ít nhất 3 lượt đối thoại thực tế với phản hồi hoàn tất và đúng toàn bộ câu kiểm tra; lịch ôn, bài gợi ý, học lại | Đã kiểm chứng persistence, retry và browser hoàn thành |
| COURSE-06 | Duyệt mọi chặng, trình bày bài nhỏ gọn, có nghe Blaze theo thao tác rõ ràng; không gọi TTS khi render/hover; hủy khi rời bài                        | Đã kiểm chứng audio cleanup và browser 4 kích thước    |

Giới hạn hiện tại: các chặng là cách nhóm khóa học đề xuất, không phải mức chính thức của ETS. Chặng xuất phát do người học tự chọn, chưa có placement test chuẩn hóa. Chưa có ngân hàng ảnh Part 1 hay đề thi đủ 200 câu; các bài nghe/đọc ngắn hỗ trợ giáo án đối thoại. Kết quả kiểm tra bài, số lượt và hoàn thành không phải điểm TOEIC, CEFR hoặc điểm phát âm. Nội dung và khả năng đối thoại cần được giáo viên/người học thật đánh giá; không coi transport doubles là bằng chứng chất lượng sư phạm.

Những mục hội thoại/giao diện cũ bên dưới được giữ để truy vết. Phạm vi COURSE mới thay thế giới hạn bốn chủ đề và tiến độ tự đánh dấu trên trình duyệt của lộ trình cũ.

## Giọng Mate theo yêu cầu mới

| Mã        | Yêu cầu                                                                                | Trạng thái                                          |
| --------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| BVOICE-01 | Gemini xử lý nội dung, Blaze STT/TTS cho thoại và giọng đọc; không fallback giọng khác | Đã triển khai; backend/frontend transport tests     |
| BVOICE-02 | Tự nhận lượt nói, chép lời → chat SSE có lưu lịch sử → phát giọng Blaze                | Đã triển khai; kiểm thử với audio/transport doubles |
| BVOICE-03 | Chen lời, mute, đổi giọng, stop/rời trang/logout dọn tài nguyên và chặn kết quả cũ     | Đã triển khai; kiểm thử lifecycle/cancellation      |
| BVOICE-04 | Thiếu Blaze không mở native voice; catalog Việt/Anh có bearer, không lộ secret         | Đã kiểm thử backend; không thay schema              |

Chất lượng giọng, quota dịch vụ và echo/microphone/loa thật cần kiểm chứng riêng.
Giáo trình TOEIC hiện được triển khai theo các yêu cầu COURSE ở trên.

## Khôi phục hồ sơ theo yêu cầu 2026-10-18

| Mã         | Yêu cầu                                                                  | Trạng thái                                   |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| PROFILE-01 | Avatar → Hồ sơ học tập, bố cục biểu mẫu/thẻ thông tin từ giao diện cũ    | Xong, kiểm tra browser desktop/mobile        |
| PROFILE-02 | Lưu thông tin cá nhân và mục tiêu học vào MySQL, không ghi đè version cũ | Xong, integration rollback và frontend tests |
| PROFILE-03 | Đổi ảnh raster, giới hạn 2 MB, lưu riêng tư và cập nhật menu             | Xong, kiểm tra browser và quyền sở hữu API   |
| PROFILE-04 | Tải lại sau lỗi/xung đột; giữ nội dung form khi lưu thất bại             | Xong, kiểm thử tự động                       |

## Yêu cầu mới 2026-10-18 — Lớp học cùng thầy Mate

Yêu cầu này thay thế giới hạn giao diện chỉ hội thoại trong các mục lịch sử bên dưới.

| Mã       | Yêu cầu                                                                    | Trạng thái                                                                       |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| TUTOR-01 | Giao diện theo Figma: nền xanh tím, nav ngang, linh thú đăng nhập làm thầy | Xong, kiểm tra browser desktop/mobile                                            |
| TUTOR-02 | Mục tiêu, lộ trình và giảng bài qua chat/voice thật                        | Bốn chủ đề ban đầu được thay bằng COURSE-01–06                                   |
| TUTOR-03 | Phát âm nghe mẫu/ghi âm/bản chép lời, không dựng điểm số                   | Xong, kiểm thử với transport doubles; micro/loa thật chưa kiểm chứng             |
| TUTOR-04 | Từ đã nhớ và nhịp học giao tiếp cũ theo dữ liệu người dùng tự ghi nhận     | Từ giao tiếp cũ còn lưu trình duyệt; tiến độ TOEIC dùng máy chủ theo COURSE-05   |
| TUTOR-05 | Prompt người thầy dùng chung chat/voice, chờ người học và nhận xét phù hợp | Xong, kiểm tra prompt v5 trong integration; chất lượng sư phạm cần đánh giá thật |
| TUTOR-06 | Giữ tài khoản, chat streaming, lịch sử, voice và sáng/tối                  | Xong, kiểm thử hồi quy                                                           |

Phạm vi này thay thế sản phẩm học tập nhiều trang trước đây, theo kế hoạch người dùng đã duyệt. Nhật ký cũ được giữ trong PROGRESS.md.

| Mã      | Yêu cầu                                                                                                 | Trạng thái                                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CHAT-01 | Đăng ký/đăng nhập thật, JWT/refresh xoay vòng, logout thu hồi phiên, ownership                          | Đã triển khai; kiểm chứng bằng tests/integration/test_chat_database.py                                                                                                                                  |
| CHAT-02 | Tạo/mở/kết thúc hội thoại, lưu tin và đọc lại lịch sử                                                   | Đã triển khai; API/MySQL và UI tests                                                                                                                                                                    |
| CHAT-03 | Lịch sử mới nhất trước và phân trang >100; context có giới hạn                                          | Đã triển khai; test 105 hội thoại                                                                                                                                                                       |
| CHAT-04 | Retry không nhân đôi; trạng thái pending/completed/failed/cancelled, hủy và hết hạn pending             | Đã triển khai; tests provider lỗi/timeout/hủy/kết quả muộn                                                                                                                                              |
| CHAT-05 | Ghi âm từng lượt, chép lời vào bản nháp, nghe/dừng và chọn giọng Blaze                                  | Có mã và mock transport/lifecycle tests; chưa kiểm chứng Blaze trả phí/micro vật lý trong lượt này                                                                                                      |
| CHAT-06 | Model thật sinh phản hồi, không mock production                                                         | Đã chuyển Gemini theo yêu cầu mới; adapter GenerateContent SSE đã nhận câu trả lời thật từ Flash-Lite, có tests transport/SQL/UI                                                                        |
| CHAT-07 | Đàm thoại hai chiều realtime, ngắt lời, cleanup/reconnect                                               | Đã triển khai Gemini Live relay WebSocket/PCM, VAD, persistence/ownership/cleanup và tests offline. Provider đã tạo audio thật từ text; **chưa kiểm chứng microphone/echo/barge-in trên thiết bị thật** |
| CHAT-08 | REST schema, lỗi an toàn, request limits, CORS, health/ready/capabilities, cấu hình dev/build đồng nhất | Đã triển khai; kiểm chứng qua contract/security/smoke                                                                                                                                                   |
| CHAT-09 | Giao diện desktop/mobile và truy cập bàn phím                                                           | Có CSS responsive/RTL tests; chưa có browser E2E mới                                                                                                                                                    |
| CHAT-10 | Giữ giao diện gốc, gồm đăng nhập/đăng ký; chỉ bỏ chức năng phụ                                          | Đã khôi phục CSS/Logo/Mate và shell gốc; tests App/AuthForm/MenuNguoiDung, chưa kiểm tra trực quan bằng browser                                                                                         |
| CHAT-11 | Khóa Blaze chỉ nằm ở backend                                                                            | Đã cấu hình riêng trong `.env` bị Git bỏ qua; chưa gọi dịch vụ tính phí để xác minh khóa                                                                                                                |
| CHAT-12 | Chat stream hiển thị dần và hủy phản hồi cũ                                                             | Đã triển khai SSE start/delta/done/error, một assistant ID, cancel/disconnect; test transport/SQL/UI                                                                                                    |
| CHAT-13 | Khóa provider private; quota/error không fake success                                                   | Gemini key backend/.env, giá trị OpenAI key local đã xóa; không log provider body, kiểm tra lỗi/quota/partial/blocked SSE                                                                               |
| CHAT-14 | Thay OpenAI bằng Gemini, giữ giao diện và Blaze                                                         | Đã tích hợp, cấu hình Gemini mặc định cho chat/live, header đúng provider; kiểm tra wire contract, PCM, ticket/Origin, lifecycle và MySQL riêng                                                         |
| CHAT-15 | Khung chat cố định, ô nhập trong màn hình, tin nhắn/lịch sử cuộn riêng                                  | Đã test: App regression và 72 kiểm tra hình học Edge tại 8 viewport, gồm phụ đề thoại dài/ngang thấp; bàn phím ảo thiết bị thật chưa kiểm chứng                                                         |
| CHAT-16 | AI trả lời theo tiếng Việt/Anh của người dùng, chuyển ngôn ngữ theo lượt                                | Đã triển khai persona.v4 dùng chung chat/Live; test kiểm tra prompt thực đi qua hai đường, không coi transport double là kiểm chứng chất lượng ngôn ngữ model                                           |
| CHAT-17 | Chọn giọng AI đối thoại trực tiếp, tách khỏi giọng đọc tin nhắn                                         | Catalog REST có xác thực/whitelist; đổi giọng cả khi gọi bằng stop/start tuần tự trên cùng hội thoại, giữ mute/lịch sử, chống kết quả muộn và hủy nối lại; tests API/SQL/transport/UI                   |
| CHAT-18 | Cân đối diện tích giao diện, bỏ dòng thừa, giữ nhận diện và auth cũ                                     | Sidebar lịch sử, chat rộng, thanh nhập gọn, tùy chọn âm thanh ẩn theo yêu cầu; kiểm tra bằng browser nhiều kích thước và hồi quy App/AuthForm                                                           |
| CHAT-19 | Vào app mở lời chào mới, chỉ mở lịch sử theo lựa chọn, tạo hội thoại khi có tương tác                   | Tests App kiểm tra không tải tin cũ/tạo bản ghi trống, gửi đầu tiên và retry, bỏ kết quả tạo muộn; browser tại 6 viewport                                                                               |
| CHAT-20 | Gom ô chữ và nút âm thanh/thoại/gửi bằng icon trên cùng một hàng                                        | Tests nhãn truy cập/tooltip, menu Escape/click ngoài; browser đo canh giữa các nút và textarea, chiều cao khi trống, cả khi đang thoại                                                                  |
| CHAT-21 | Chuyển sáng/tối ở topbar và nhớ lựa chọn                                                                | ThemeToggle/theme tests: hai chiều, preference/system, storage bị chặn và metadata; browser ảnh sáng/tối desktop/mobile                                                                                 |

Bản hội thoại ngày 16/10 từng loại các trang học tập phụ; yêu cầu mới đã đưa lại hồ sơ/avatar, lớp học và lộ trình TOEIC. Hệ thống thi/chấm đầy đủ bốn kỹ năng, flashcard, OAuth giả, reset SMTP và trang demo vẫn ngoài phạm vi hiện tại. Kiểm tra auth/ownership/retry/speech tiếp tục được thực thi, không hạ coverage threshold.

Không cam kết hệ thống tuyệt đối không có lỗi. Chat Gemini đã được kiểm chứng provider thật; definition of done cho thoại còn cần kiểm tra cuộc thoại/interrupt bằng trình duyệt + microphone/loa thật. Tests dùng doubles không thay thế kiểm chứng thiết bị. Một backend worker là giới hạn triển khai hiện tại; Gemini không phụ thuộc quota OpenAI.
