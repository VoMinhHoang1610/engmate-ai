# Yêu cầu EngMate-AI — lớp học đối thoại TOEIC, 2026-10-18

## Liên kết Google với tài khoản cũ — 2026-10-30

- Đã được người dùng đồng ý cụ thể: Google trùng email chỉ liên kết sau khi xác
  nhận mật khẩu EngMate. Có thể hủy; lần sau đăng nhập Google trực tiếp.
- Đã triển khai, kiểm thử trạng thái/lỗi và bảo toàn user/profile/progress, nạp
  website local. Chưa nghiệm thu mật khẩu/binding trên tài khoản thật do người
  dùng tự thao tác. Không tự liên kết Facebook hoặc tài khoản không có mật khẩu.

## Đăng nhập nền tảng — 2026-10-29

| Yêu cầu | Trạng thái |
| --- | --- |
| Chỉ giữ Google/Facebook, bỏ GitHub | Đã triển khai và kiểm thử |
| Code exchange ở server, state/cookie, kiểm tra popup/origin | Đã triển khai và kiểm thử ngoại tuyến |
| Tạo/đăng nhập tài khoản nền tảng qua session hiện có | Đã kiểm thử bằng provider doubles và database trong bộ nhớ |
| Cấu hình client, cài bảng liên kết, nghiệm thu provider thật | Chờ Client ID/Secret, cấu hình ứng dụng nhà cung cấp và installer tường minh |

Không tự liên kết email trùng tài khoản cũ. Hướng dẫn: [OAUTH_SETUP](OAUTH_SETUP.md).

## Hoàn thiện sau rà soát — 2026-10-29

- Lộ trình, Bài học, Tiến độ có trách nhiệm riêng. Điều hướng Bài học luôn mở thư viện, cho phép quay lại bài đang học.
- Thư viện tìm không dấu, lọc chặng/thời lượng/trạng thái/cần ôn và hiển thị tăng dần; Tiến độ mở bài ôn trực tiếp.
- Không diễn giải lỗi tải thành chưa học/0 tiến độ. Giáo trình và kết quả tải độc lập; lỗi nêu phần thiếu và có nút thử lại.
- Hồ sơ/Cài đặt lấy tổng kết TOEIC từ API tài khoản; mục tiêu giao tiếp và thống kê tự ghi nhận trên thiết bị được ghi nhãn riêng.
- Chỉ hiển thị chức năng đang được hỗ trợ như chức năng khả dụng; OAuth/âm báo chưa có tích hợp phải ghi rõ. Không đưa độ chính xác, tốc độ hoặc lời chứng thực chưa xác nhận lên trang giới thiệu.
- Khôi phục giảm chuyển động từ lúc khởi động; nút mật khẩu và công tắc có tên truy cập được. Desktop ghim sidebar mặc định; mobile có menu cố định và drawer, biểu mẫu thu gọn, nút cảm ứng đủ lớn.
- Giữ nguyên hợp đồng API và dữ liệu; kiểm thử trực quan dùng tài khoản/dữ liệu giả lập.

## Tinh chỉnh giao diện — 2026-10-29

- Ba nút Google/GitHub/Facebook cùng một hàng ở đăng nhập và đăng ký; giữ nguyên xử lý xác thực.
- Toàn bộ mục Giao diện là nút đổi theme, dùng hover/focus chung với điều hướng.
- Vùng chat và ô nhập tận dụng chiều rộng nội dung, phụ đề thoại 15–20px tùy màn hình.
- Khung ứng dụng giới hạn trong viewport; trang chức năng cuộn trong vùng nội dung để sidebar desktop luôn hiển thị. Mobile giữ drawer có focus trap.
- Không thay đổi schema, API, tài khoản hoặc dữ liệu học tập.

## Đồng nhất giọng và danh xưng — 2026-10-23

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| VOICE-ID-01 | Nữ xưng cô, nam xưng thầy; thay đổi theo giọng hiện tại thay vì danh xưng cũ trong history | Đã triển khai, đã test payload/prompt và chuyển phiên |
| VOICE-ID-02 | Chỉ một giọng qua toàn bộ lời mở đầu và phản hồi, kể cả trộn tiếng Việt/Anh | Đã test 4 cấu hình giọng với opening và streaming TTS |
| VOICE-ID-03 | “Xin chào” được đáp theo tiếng Việt, tránh lời giới thiệu lai Anh/Việt | Đã sửa persona.v6 và voice-identity.v1, cấm rõ câu lai; chưa đánh giá sinh lời trên Gemini thật |

Kiểm thử dùng provider/audio doubles; chưa nghe và đánh giá phát âm Blaze thật
trong lượt sửa này. Bản frontend HTTP và backend local đã xác nhận tải code mới.

## Rà soát tối ưu toàn chương trình — 2026-10-22

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| OPT-AUDIT-01 | Rà frontend/backend/DB/AI/voice/deploy/test, chỉ rõ ưu tiên và bằng chứng | Đã rà soát code và kiểm thử offline; báo cáo tại `OPTIMIZATION_AUDIT.md` |
| OPT-AUDIT-02 | Triển khai hạng mục tối ưu sau audit và đo hiệu quả thực | Đã duyệt và triển khai history cursor, scoped counts, admission, playback receipt, catalog/body timeout, lazy/static cache và diagnostics; trạng thái từng mục tại OPTIMIZATION_AUDIT; benchmark provider/thiết bị thật chưa làm |

## Độ trễ P2 — STT realtime thử nghiệm, 2026-10-22

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| LAT-06 | Stream PCM trong lúc nói, giữ pre-roll, partial chỉ caption và final mới vào Gemini | Đã triển khai opt-in; test offline, chưa xác minh provider thật |
| LAT-07 | Ticket JWT/owned-open conversation, Origin, một lần/TTL; quota audio và dọn logout/stop | Đã triển khai, test offline |
| LAT-08 | Không fallback giọng hoặc replay job TTS đã lỗi; TTS chỉ retry POST khi `429` (tối đa hai lần), realtime STT lỗi/timeout fallback batch một lần (có thể thêm phí); mode batch rollback; giữ Gemini xử lý text và giọng Blaze hiện tại | Đã triển khai; không đổi model TTS |
| LAT-09 | Phép đo riêng batch/realtime, thời gian STT chồng lấp và phần chờ sau endpoint | Đã triển khai proxy; chưa có p50/p95 thực |
| LAT-10 | TTS realtime, VAD thích nghi, final coverage xác minh trên provider thật | Chưa làm/chưa xác minh, không bật mặc định realtime |

## Độ trễ thoại P0–P1 — 2026-10-22

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| LAT-01 | Mốc endpoint/STT/LLM/TTS/playing, UUID liên kết và p50/p95 có số mẫu, không lưu nội dung riêng tư | Đã triển khai; chờ số đo provider/thiết bị thật |
| LAT-02 | TTS câu đủ nghĩa từ Gemini delta, phát có thứ tự, chuẩn bị trước tối đa một clip; gom câu ngắn sau hai clip | Đã triển khai; kiểm thử transport giả lập |
| LAT-03 | Hủy lượt/clip cũ, giữ cancellation xuyên body HTTP, không fallback giọng; TTS chỉ retry POST `429`, không replay job generation/audio | Đã triển khai; kiểm thử hủy và lỗi giữa luồng |
| LAT-04 | Tái sử dụng pool HTTP Gemini/Blaze, không đóng pool khi hủy một lượt | Đã triển khai; kiểm thử vòng đời và hủy |
| LAT-05 | Streaming STT/TTS thực, VAD thích nghi và xác nhận phần đã nghe trong lịch sử | STT opt-in tại LAT-06; playback receipt theo clip hoàn tất đã triển khai; TTS realtime/VAD thích nghi chưa triển khai |

Chưa có baseline hay cam kết SLO. Endpoint hiện vẫn 900 ms danh nghĩa; mốc cuối
frame RMS và event `playing` chỉ là proxy, chưa phải khoảng trễ người dùng nghe
được đo vật lý. Giữ model, giọng và schema; chia nhỏ câu có thể tăng số job TTS,
còn gom câu ngắn sau hai clip giảm job. Voice context 12 tin/12.000 ký tự; text
chat 20 tin/32.000 ký tự. TTS/playback lỗi chỉ dừng audio và không kết thúc phiên.

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
| UI-COLOR-01 | Màu chính/phân nhóm và trạng thái hover/focus/chọn rõ, giữ bố cục sidebar | Test tương tác qua; cần kiểm lại hình học sau thay đổi flex sidebar |
| UI-COLOR-02 | Chữ mô tả/điều hướng/ô nhập dễ đọc, có bảng màu sáng/tối riêng            | Đã kiểm tra tương phản các trang/trạng thái lấy mẫu |
| UI-COLOR-03 | Giữ menu, hội thoại và luồng học, không tràn màn hình nhỏ                 | 226 frontend tests qua; browser 1440/900/390/320 px |

## Giao diện tối giản với thanh bên — yêu cầu mới 2026-10-18

Phạm vi này cập nhật không gian sau đăng nhập theo mẫu thanh bên người dùng cung cấp, thay cho thanh điều hướng ngang và hiệu ứng kính của bản lớp học trước. Trang đăng nhập, nhận diện Mate và các luồng học hiện có được giữ.

| Mã         | Yêu cầu                                                                                                               | Trạng thái                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| UI-SIDE-01 | Thanh bên gọn trên desktop, mở rộng khi di chuột hoặc dùng bàn phím, có thao tác thu/mở rõ ràng và mục đang chọn      | Test tương tác qua; bản hiện tại co giãn nội dung theo sidebar, cần nghiệm thu browser |
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
