# Quyết định kỹ thuật

## 2026-10-23 — Lỗi âm thanh không kết thúc phiên, fallback STT có kiểm soát

Khi TTS hoặc phát MP3 lỗi, frontend dừng queue/clip hiện tại và báo lỗi nhưng giữ
phiên, mic và phần text Gemini đang stream; không đổi giọng và không gọi lại job
TTS đã thất bại. Lỗi Gemini vẫn dừng audio của lượt đó. Đây thay thế quy tắc cũ
“lỗi bên nào hủy cả pipeline”: audio là kênh phụ, còn câu trả lời text vẫn hữu ích
và đã/đang được lưu.

Realtime STT chỉ là tối ưu: lỗi setup/relay/final hoặc timeout được fallback sang
batch **một lần** với chính WAV đã thu; không promote partial. Fallback có thể phát
sinh thêm phí, nên realtime vẫn opt-in và chỉ dùng khi ngân sách thử nghiệm cho phép.
Batch vẫn là rollback. TTS chỉ retry POST khi `429` (tối đa hai lần, 0,6/1,2 giây);
không retry lỗi generation/audio để tránh nhân phí. Log chỉ ghi operation/status/
reason/số byte, không ghi job ID, URL, body, token hoặc nội dung câu.

Voice context giảm còn 12 tin/12.000 ký tự; text chat giữ 20 tin/32.000 ký tự. Sau
hai clip đầu, câu ngắn được gom tới ít nhất 120 ký tự để giảm job TTS nhưng không
trì hoãn clip đầu. Prompt thoại yêu cầu 1–2 câu ngắn, tối đa một câu hỏi, trừ khi
người học yêu cầu giải thích dài. Chưa có p50/p95 hoặc kiểm micro/loa thật.

## 2026-10-23 — Giữ batch TTS và VAD 900 ms sau đo thử

Tách mệnh đề đầu (32–96 ký tự) và poll TTS 0,2/0,35/0,5 giây để giảm chờ mà
không đổi chất lượng giọng. Đo 3 job mỗi model trên cùng câu cho median
`v2.0_pro` 1,30 giây, `v2.0_flash` 1,57 giây; flash không nhanh hơn nên giữ pro.
Probe WebSocket `2.0-realtime` có byte audio đầu sau 0,595 giây nhưng frontend
vẫn phát MP3 trọn clip, nên chưa tích hợp streaming PCM. Giữ VAD 900 ms vì giảm
xuống 700 ms có thể cắt lời người học; endpoint thích nghi/provider final cần
test riêng. Các phép đo này là smoke ngắn, không thay thế p50/p95 100 lượt hoặc
kiểm micro/loa thật.

## 2026-10-23 — Cố định người đọc và danh xưng theo phiên thoại

Chọn một speaker_id và ngôn ngữ TTS từ catalog ngay khi mở phiên, giữ qua mọi
chunk. Cách cũ dò dấu tiếng Việt rồi chọn cặp giọng Anh/Việt làm đổi người nói
ngay giữa phản hồi. Khi người học đổi giọng, lifecycle stop/start tạo identity
mới; ngôn ngữ STT độc lập. Một giọng có thể phát âm ngôn ngữ thứ hai kém hơn giọng
chuyên dụng, nhưng đáp ứng yêu cầu chỉ một người đọc; không tự chuyển giọng.

Giới tính catalog (fallback mã Blaze Nam/Nu, không rõ dùng trung tính) là enum
trong request mỗi lượt. Prompt phiên bản mới dùng danh xưng hiện tại thay vì
hard-code Thầy Mate hoặc thay chữ trong output, tránh sửa nhầm lời trích dẫn.
Giữ metadata trong ResultJson để retry khác identity bị từ chối, không đổi SQL.

## 2026-10-23 — Giảm công việc lặp, bảo toàn context khi ngắt lời

Theo phê duyệt toàn chương trình và riêng Docker/proxy/quota: chọn cursor/tail
sync, scope practice, TTL catalog, admission fail-fast và body deadline trước
khi đổi model hoặc VAD. Slot theo job chứ không theo connection HTTP, không có
queue chờ vô hạn hoặc retry paid POST. Giới hạn chỉ có hiệu lực trong một process.

Giữ generated reply để xem lại; voice context dùng Unicode prefix của clip đã
ended, giới hạn 12 tin/12.000 ký tự (text: 20 tin/32.000 ký tự). Không tính clip
đang phát dở: duration MP3 không ánh xạ chắc chắn tới ký tự. Receipt lưu trong
ResultJson hiện có, monotonic và không đổi context sau lượt mới; client chờ receipt
trước lượt tiếp theo. Không coi receipt là bằng chứng người học nghe vật lý hoặc
bằng chứng chấm điểm học tập.

Cache catalog/frontend chỉ có TTL/byte tối thiểu cần thiết; plan/progress và
auth revocation tiếp tục đọc DB. Argon2 giữ nguyên độ khó, chạy ngoài connection
pool rồi revalidate dưới lock. Chưa thêm index/schema/ORM hoặc worker mới.
STT realtime/TTS realtime/quality benchmark vẫn cần xác minh protocol, speaker
và ngân sách; không dùng số đo mocked để cam kết chất lượng hay ms cải thiện.

## 2026-10-22 — P2 STT realtime trước, rollout có kiểm soát

Người dùng xác nhận tối ưu thêm sau thử thoại thấy còn chờ lâu. Triển khai nhận
dạng song song với lời nói, giữ Gemini và TTS hiện tại. Không tự đổi model của
REST STT: realtime dùng model riêng `stt-stream-1.5`, bật bằng BLAZE_STT_MODE.
Mặc định batch vì chưa xác minh entitlement, phí và chất lượng trên tài khoản thật.

Một socket/lượt bắt đầu sau VAD, giữ pre-roll/backlog có giới hạn; chưa duy trì
kết nối tính phí suốt 10 phút im lặng. Tái sử dụng pattern ticket một lần của
native adapter, không đưa API key/JWT vào URL. JWT, quyền hội thoại và trạng thái
open kiểm tra qua REST trước khi trả ticket; Origin/ticket kiểm tra trước upstream.
Giới hạn toàn process/account, audio rate/bytes/time; logout và shutdown đóng relay.

Không cho partial kích hoạt Gemini; gom final qua pause và giữ endpoint 900 ms.
Provider chưa công bố flush/EOS ACK hoặc audio-offset: chỉ dùng binary silence
tail có timeout, không tự chế lệnh hoặc khẳng định đã kiểm chứng đầy đủ frame cuối.
Đây là điểm cần test thật trước rollout. Quyết định ngày 2026-10-23 bổ sung fallback
batch một lần khi realtime lỗi/timeout; fallback có thể phát sinh phí nên vẫn opt-in.
TTS realtime và VAD ngắn hơn để giai đoạn sau, cần kiểm model/giọng và accuracy.

## 2026-10-22 — P0–P1 giảm độ trễ nhưng giữ Gemini và giọng Blaze

Ưu tiên chồng lấp sinh văn bản/TTS thay vì đổi provider hoặc tự giảm VAD. Gom
delta theo câu, chờ khoảng trắng sau dấu câu để tránh cắt số thập phân, giữ phần
chưa hoàn tất và đối chiếu terminal content với prefix đã nhận. Chặn tổng text
12000 ký tự như Gemini adapter, chia phrase tối đa 600 ký tự. Câu đầu không bị
ghép thành job 2000 ký tự. Hàng đợi chỉ phát một clip và chuẩn bị trước một clip;
không tạo hàng loạt job. Từ 2026-10-23 chỉ retry POST khi `429`, không replay job
generation/audio đã lỗi. Chi phí có thể tăng theo số job; chưa có phép đo thực để
khẳng định mức giảm độ trễ hoặc giá.

TTS/playback và Gemini chạy đồng thời; quy tắc hiện hành (2026-10-23) là lỗi audio
chỉ dừng audio, còn lỗi Gemini mới dừng audio của lượt. Giữ barrier cancel server
trước lượt text mới và bỏ callbacks cũ. Không phát lại nội dung đã đọc; lỗi Gemini
sau khi phát một phần không thể thu hồi phần đã nghe.
Không đổi mô hình hoàn tất lịch sử/tiến độ trong P1; playback receipts/đánh dấu
heard cần thiết kế riêng. VAD, REST STT, job/poll/MP3 TTS giữ nguyên cho đợt này.

Pool HTTP riêng theo provider do FastAPI lifespan sở hữu, có giới hạn và đóng
trong finally. Không lưu khóa trong shared client Gemini; request speech gắn
Bearer riêng. Không mở nhiều backend worker. Test inject pool/transport và không
gọi provider thật. AbortSignal.any giữ tín hiệu hủy body sau headers; yêu cầu
trình duyệt hiện đại, không thay timeout/assertion để làm test qua.

Telemetry chỉ có UUID/stage/thời gian, không tự lưu hoặc tải đi. Log backend
opt-in theo trace và logging INFO. Mốc cuối voiced frame tại main thread và
`playing` là proxy được đặt tên rõ; không trình bày như ground truth vật lý.

## 2026-10-18 — Sidebar tối giản cho không gian sau đăng nhập

Theo mẫu người dùng, chọn rail điều hướng trung tính thu/mở và menu trượt trên
điện thoại. Tái sử dụng React/CSS/icon hiện có thay vì thêm các dependency trong
đoạn demo. CSS mới có phạm vi `.workspace-shell`, import cuối để giữ giao diện
trang giới thiệu/đăng nhập và tránh thay đổi các service học tập.

Desktop mở thanh bên dạng overlay, vùng nội dung luôn chừa 72 px. Kiểm thử browser
phát hiện việc đẩy nội dung theo độ rộng sidebar có thể làm mất click khi blur
giữa pointerdown/up. Giữ hình học nội dung ổn định giải quyết trực tiếp lỗi này;
không trì hoãn blur bằng timer. Mobile dùng focus trap/inert và chuyển focus
rõ ràng khi mở lịch sử từ menu. Không thay API, SQL, provider giọng nói hay tiến độ.

## Lộ trình nhỏ, hội thoại chính, tiến độ có bằng chứng

Triển khai giáo án đã bàn thành catalog server `toeic.v1.json`: 5 chặng, 25 cụm,
100 bài, mỗi bài 10–14 phút, gồm mục tiêu, giải thích, ví dụ, ba câu thực hành,
tình huống, từ vựng, đoạn nghe/đọc và kiểm tra. Phân nhóm theo mục tiêu khóa học,
không xem đây là phân loại chính thức hoặc cam kết điểm TOEIC.

Buổi học tái sử dụng chat/Blaze, gắn lesson ID chuẩn ở server qua
ConversationService. Gemini nhận đúng giáo án và bước hiện hành; Blaze đọc mở
bài chỉ sau thao tác vào lớp, rồi người học đối thoại. Lệnh “Mate next step” hoặc
“Mate, bước tiếp theo” chuyển bước bằng lời nói; không tính lệnh vào lượt luyện.
Mặc định ghi âm tiếng Anh trong lớp, chat tự do giữ tiếng Việt. Menu âm thanh
cho đổi ngôn ngữ khi dừng thoại. Native audio không thay Blaze.

Thêm bốn bảng độc lập bằng installer tạo mới có kiểm tra tồn tại; giữ dữ liệu
cũ, không bootstrap lại hoặc nâng schema legacy. Plan có optimistic version;
start/check có receipt idempotent, mọi thao tác theo owner. Hoàn thành nghĩa là
đã có ít nhất ba cặp lượt thành công và đúng các câu kiểm tra của bài; đây là
bằng chứng hoàn thành hoạt động, chưa phải thành thạo hay điểm phát âm. Gợi ý
bài dừng ở mục tiêu khóa học; lịch ôn một/ba ngày là quy tắc sản phẩm ban đầu.
Người học vẫn được khám phá chặng cao hơn. Không thêm dependency.

Chưa có ảnh Part 1 hoặc bộ đề đủ 200 câu theo cấu trúc thi. Nội dung tự biên
soạn cần giáo viên duyệt trước khi gọi là giáo trình được thẩm định. Các câu
kiểm tra nhỏ được chữa ngay để phục vụ học, không dùng làm dự đoán điểm thi.

## Mate dùng Blaze cho giọng nói, Gemini cho nội dung

Người dùng yêu cầu giữ Gemini làm đầu não và bắt buộc giọng Blaze. Chọn mặc định
`VOICE_PROVIDER=blaze`, tái sử dụng SpeechService và chat SSE có persistence; thêm
VAD/capture và điều phối lượt nói trong `BlazeVoiceSession`. Không thêm dependency
hoặc migration. Chấp nhận độ trễ STT → text → TTS; không tự retry job generation
tính phí và không thay giọng khi lỗi. Từ 2026-10-23, TTS chỉ retry POST khi `429`;
realtime STT lỗi có fallback batch một lần. Giữ native adapter để tương thích khi chủ động chọn
`VOICE_PROVIDER=native`; chặn signaling native trong chế độ Blaze. Browser
speechSynthesis bị bỏ để bảo đảm toàn bộ giọng đọc là Blaze. Test dùng doubles;
không suy ra chất lượng sư phạm, độ chính xác phát âm hoặc quota từ kết quả test.

## 2026-10-18 — Khôi phục hồ sơ thật và ảnh riêng tư

Khôi phục HoSo từ lịch sử Git, chuyển từ demo provider cũ sang API hồ sơ lấy owner từ bearer. Dùng bảng profile đang có và cơ chế Version/lock hiện tại, không phục hồi toàn bộ API học tập/media cũ hoặc thay schema. Username/email chỉ đọc như form MySQL cũ. Trình độ là người học tự chọn; thống kê thời gian dùng DurationSeconds thật, không dùng số demo.

Ảnh được encode lại thành JPEG ở trình duyệt, giới hạn raster/dung lượng ở server, lưu theo UUID tài khoản và chỉ cấp qua route có xác thực. Chọn file storage riêng để hỗ trợ cả schema hội thoại mới không có bảng media cũ; thêm AVATAR_STORAGE_DIR và Docker bind mount để giữ ảnh khi recreate container. Không thêm thư viện. Dữ liệu form lưu MySQL, ảnh cần được backup riêng.

## 2026-10-18 — Giao diện người thầy và dữ liệu học tự ghi nhận

Theo yêu cầu mới, triển khai các màn của Figma Tutor journey trên React hiện có. Dùng linh thú trang đăng nhập thay orb trong bản mẫu; giữ token màu, nhịp bố cục, các orbit/ambient SVG và chuyển động nhẹ, không cài thêm thư viện giao diện. Chat/voice/auth dùng nguyên API và cơ chế bảo vệ hiện có.

Backend hiện chưa có API đánh giá phát âm hoặc tiến độ học. Vì vậy, bài giảng và từ vựng là curriculum xác định, bài/từ hoàn thành được người học chủ động ghi nhận, lưu theo username trong localStorage. Không trình bày dữ liệu demo như kết quả thật; không hứa đồng bộ nhiều thiết bị. Nếu bổ sung đồng bộ, cần endpoint/schema có quyền sở hữu và kiểm thử riêng. Mọi yêu cầu thực hành được người học xem/gửi qua ô chat; không tự gọi provider khi chuyển tab.

Prompt mới `persona.v5` định nghĩa cách giảng dạy chung cho text/voice, giữ quy tắc ngôn ngữ, chờ học viên trả lời trước khi nhận xét và không bịa điểm số. Không đổi provider/model local trong tác vụ giao diện.

## 2026-10-18 — Chia sẻ HTTPS tạm thời bằng SSH tunnel và Nginx

Người dùng chọn chia sẻ bản đang chạy trên máy bằng link HTTPS tạm thời. Dùng reverse proxy riêng cho bản build để không đưa Vite/source code ra Internet; giữ base Compose bind loopback và không đổi schema/auth. Nginx chính thức được ghim digest đã pull, chạy read-only với tmpfs cần thiết, chuyển Upgrade cho thoại và tắt buffering cho chat SSE theo [Nginx](https://nginx.org/en/docs/http/websocket.html).

[Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) không hỗ trợ SSE. Thử localhost.run đã chuyển được HTTP/WebSocket nhưng domain tự đổi khi đang QA, làm link cũ trả “no tunnel”; đã dừng đúng tiến trình cũ. Chọn [Pinggy HTTP tunnel](https://pinggy.io/docs/http_tunnels/), có [hỗ trợ SSE](https://pinggy.io/docs/guides/pocketbase/) và [giới hạn phiên miễn phí 60 phút](https://pinggy.io/help/). Không đăng ký dịch vụ trả phí hoặc dùng khóa SSH cá nhân; khóa tunnel riêng nằm trong artifact bị Git bỏ qua và chỉ tài khoản hiện tại đọc được. Origin thêm đúng domain nhận từ SSH; không dùng wildcard hoặc bỏ kiểm tra Origin/ticket.

## 2026-10-18 — Canh một hàng, tách theme khỏi giọng và đổi giọng trong cuộc gọi

Theo phản hồi người dùng, thay composer hai tầng bằng một hàng flex, icon tai nghe cho giọng và nút sáng/tối trên topbar. Tái sử dụng biến màu dark đã có; lưu preference giao diện riêng, không thêm dependency hoặc trộn với token/lịch sử.

Giọng được truyền trong setup theo [Google Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities). Adapter hiện tại không có lệnh đổi cấu hình trên kết nối đang mở, nên ứng dụng thực hiện stop/start tuần tự trong cùng conversation thay vì gửi setup mới qua socket. Chờ server cleanup/xử lý lượt dở trước khi mở tiếp, giữ mute và context đã lưu; epoch bỏ callbacks cũ, stop/unmount vô hiệu việc nối lại. Có thể gián đoạn ngắn khi đổi và phần âm thanh đang phát dừng lại; không coi đây là đổi giọng liên tục không ngắt âm thanh.

## 2026-10-17 — Bản nháp chào mừng và toolbar trong ô nhập

Không tự chọn bản ghi lịch sử đầu tiên sau đăng nhập. Giữ màn hình chào và chỉ tạo hội thoại khi gửi tin hoặc bắt đầu thoại, tránh phát sinh bản ghi trống mỗi lần mở app/bấm tạo mới. Tái sử dụng API hiện có, giữ UUID khi retry; không thay backend/schema hoặc di chuyển dữ liệu lịch sử.

Gom thao tác vào khung nhập, dùng icon kèm aria-label/title; tùy chọn giọng chuyển vào menu bánh răng. Tham khảo cách đặt nút thoại trong ô nhập của [ChatGPT](https://help.openai.com/en/articles/20001274-chatgpt-voice), [Gemini](https://support.google.com/gemini/answer/16363185) và [Claude](https://support.claude.com/en/articles/11101966-use-voice-mode); giữ màu/logo/Mate của ứng dụng. Menu dùng chung, hỗ trợ Escape/click ngoài và focus; phụ đề chỉ tồn tại trên giao diện khi cuộc gọi đang hoạt động.

## 2026-10-16 — Ngôn ngữ theo lượt, giọng theo phiên và bố cục tập trung hội thoại

Theo yêu cầu mới, persona.v4 thay quy tắc mặc định luyện tiếng Anh bằng phản hồi theo ngôn ngữ lượt mới nhất. Yêu cầu dịch/song ngữ/luyện tập rõ ràng được ưu tiên; không tự tạo hai bản dịch cho mọi câu. Chat và Live cùng đọc prompt mới, không cần sửa bản ghi hoặc migration. Giữ prompt v3 để truy vết lịch sử.

Giọng Gemini Live được chọn trước cuộc gọi qua catalog nội bộ có xác thực và whitelist; lưu trên phiên thay vì sửa cấu hình toàn cục. Catalog dùng tám giọng prebuilt đã có trong tài liệu cùng giọng mặc định admin; không gọi catalog trả phí. Giọng Blaze TTS/STT là lựa chọn riêng trong menu âm thanh. Live native audio tự chọn ngôn ngữ; ghi âm Blaze từng lượt dùng en/vi do người dùng chọn vì hợp đồng STT hiện có không có chế độ auto.

Tham khảo cấu trúc [ChatGPT công khai](https://chatgpt.com/): lịch sử/tạo mới ở sidebar và vùng nhập tập trung. Chuyển lịch sử phải vào sidebar hiện có, bỏ quảng bá Mate/nhãn trang lặp/footer khỏi workspace để mở rộng messages; giữ logo, màu, linh vật ở trạng thái trống và trang auth. Không thêm thư viện, thay công nghệ hoặc bắt chước nguyên giao diện sản phẩm khác.

Hợp đồng giọng/ngôn ngữ: [Google Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [prebuilt voices](https://ai.google.dev/gemini-api/docs/speech-generation#voice-options). Tests dùng transport giả lập; microphone/echo/barge-in và chất lượng song ngữ của model cần kiểm chứng thiết bị/provider riêng.

## 2026-10-16 — Chuyển provider mặc định sang Gemini

Người dùng yêu cầu thay OpenAI bằng Gemini và đã cấp khóa. Chọn Gemini GenerateContent SSE (HTTPX sẵn có) và Gemini Live WebSocket (websockets sẵn có); không dùng khóa Gemini gửi đến endpoint OpenAI. Mặc định chat `gemini-3.5-flash-lite`, thoại `gemini-3.8-live`, voice Kore; đã xác nhận các model qua models API và tài liệu Google. Trong probe, 3.8 Flash trả 503, còn Flash-Lite trả SSE với STOP; không tự đổi model/provider khi lỗi runtime.

Chọn relay backend thay phát standard key hoặc để browser tự báo assistant transcript. REST bearer cấp ticket một lần, WS kiểm tra Origin, chỉ nhận PCM có giới hạn; history và transcript provider giữ ở server. Gemini Live dùng PCM16 input 16 kHz/output 24 kHz và server VAD. AudioWorklet xử lý sample rate thiết bị; hàng đợi phát có giới hạn và xóa khi ngắt lời. Không đổi schema/login/giao diện, không thêm dependency hoặc coordination phân tán. Adapter OpenAI cũ được giữ để tương thích và test; `.env` local chuyển Gemini và xóa giá trị OPENAI_API_KEY.

Nguồn chính thức: [GenerateContent API](https://ai.google.dev/api/generate-content), [Live WebSocket](https://ai.google.dev/api/live), [Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [danh mục model](https://ai.google.dev/gemini-api/docs/models). Không coi test doubles hoặc Live phát audio từ text là bằng chứng microphone/echo/barge-in trên thiết bị thật đã đạt.

## 2026-10-16 — OpenAI Responses và Realtime theo lựa chọn người dùng

Người dùng chọn OpenAI cho Chat/Realtime và giữ Blaze cho giọng đọc; đã cung cấp key riêng để cấu hình backend. Giữ React/FastAPI/MySQL/auth/layout cũ, JSON API tương thích. Responses dùng HTTPX có sẵn, SSE có typed lifecycle và assistant MessageId bền vững; history là role-typed input, không ghép dữ liệu người dùng vào system prompt. Prompt persona.v3 chung cho Chat/Voice.

Voice chọn WebRTC thay upload audio theo lượt: provider quản lý media/jitter/VAD và truncate khi ngắt lời. Backend tạo call bằng key bí mật và attach sideband để nạp lịch sử/lưu transcript authoritative; browser không được tự ghi assistant text. Tất cả wire contract/provider calls nằm trong app/llm. Registry hiện in-process, một worker, heartbeat/TTL/session limit; không thêm Redis hoặc thay schema trong lượt này. Multi-worker cần coordination bền vững và kiểm thử riêng trước khi bật.

Runtime không import model double; get_settings từ chối mock. Doubles chuyển vào tests/fakes.py và inject trong tests. Giữ assertions auth/retry/ownership/speech, bổ sung stream/voice tests; smoke đổi từ “realtime luôn false” sang kiểm tra cấu hình OpenAI/streaming và không mock, phù hợp chức năng mới.

Thêm websockets==15.0.1 (client sideband, BSD license), đã cài và ghim cùng hai requirements lock. Giữ nguyên các dependency đã khóa; pip-compile offline không resolve được bộ package hiện có nên bổ sung dependency không có transitive này vào lockfiles, không tự nâng phiên bản cả môi trường. Docker nhận biến OpenAI chỉ ở backend; không đưa secret sang frontend.

Kiểm chứng OpenAI live bị chặn bởi credit_balance_exhausted, không phải bằng chứng model đã trả lời. Người dùng hiện chưa thể bổ sung credit. Dừng các probe tính phí và không đổi sang provider/mock khác. Tài liệu OpenAI chính thức làm cơ sở hợp đồng: [Responses streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc), [sideband](https://developers.openai.com/api/docs/guides/voice-server-controls?api=realtime&voice-api=realtime), [interruption/truncation](https://developers.openai.com/api/docs/guides/realtime-conversations).

## 2026-10-16 — Giữ giao diện gốc khi thu gọn tính năng

Người dùng yêu cầu sửa việc tự thiết kế lại giao diện: giữ thiết kế cũ, kể cả đăng nhập/đăng ký. Khôi phục trực tiếp CSS và các component hình ảnh từ HEAD; App/AuthForm/Chat dùng lại cấu trúc/class gốc, ghép với transport REST và state đã kiểm thử. Không khôi phục demo/context cũ, OAuth giả hay trang học tập phụ. Menu avatar được giữ với callback logout gọi backend. Bổ sung xác nhận mật khẩu cùng kiểm tra mismatch, không thay đổi chính sách xác thực backend.

Khóa do người dùng cung cấp được lưu duy nhất trong `.env` root bị Git bỏ qua. Chỉ kiểm tra có cấu hình, không ghi giá trị vào tài liệu/log và không gọi dịch vụ tính phí. Có khóa speech chưa cung cấp hợp đồng sinh phản hồi Chat/Voice Agent; tiếp tục công khai giới hạn này.

## 2026-10-16 — Thu gọn về hội thoại

Người dùng duyệt loại toàn bộ chức năng học tập phụ, giữ tài khoản/lịch sử/chat chữ/speech và yêu cầu voice realtime bằng Blaze. Chọn tái sử dụng các bảng chat v1 và cơ chế JWT/ownership/idempotency, thu gọn schema bootstrap mới, bảo toàn database cũ. Một frontend luôn dùng REST, bỏ localStorage/demo switch để dev/build thống nhất. Lịch sử JOIN trạng thái phiên để tránh N+1.

Tài liệu https://blaze.vn/#api và https://app.blaze.vn/api/documentation/realTimeTts xác minh speech/TTS WebSocket nhưng chưa có hợp đồng Chat/Voice Agent. Chọn fail closed cho Blaze Chat và công khai realtime=false, không đoán endpoint hoặc âm thầm thay bằng mock. Mock chỉ hoạt động khi cấu hình rõ, có nhãn. Không chọn LLM khác thay yêu cầu Blaze khi chưa được người dùng cho phép.

CI đổi sang MySQL 8.0 với schema test riêng để kiểm chứng driver chính; giữ ngưỡng coverage. Tên nhánh dùng tiếng Việt không dấu `tai-cau-truc/chi-giu-hoi-thoai-ai`; nội dung commit/PR bằng tiếng Việt và tiền tố Conventional Commits. Chưa tự commit/push.

2026-10-09 — Luồng mở ứng dụng/đăng nhập: theo yêu cầu hiện đăng nhập trước mỗi lần mở trang MySQL, giữ token trong bộ nhớ thay vì khôi phục sessionStorage; không thay tài khoản/dữ liệu hay chính sách JWT của backend. Form chờ thao tác tải context sau authenticate rồi điều hướng Tổng quan. Chọn chờ Promise của context thay sự kiện `engmate-login` không có kết quả trả về để nút xử lý/lỗi gắn với toàn bộ quá trình. Demo cũng chuyển Tổng quan sau đăng nhập; các fixture demo đã đăng nhập vẫn kiểm tra trang học riêng. Assertion cũ chờ bấm thêm liên kết vào học/chuyển về trang Cài đặt được thay bằng kiểm tra vào Tổng quan tự động vì đây là hành vi người dùng yêu cầu.

2026-10-09 — Kết nối MySQL và frontend: sau khi người dùng cung cấp connection và yêu cầu đồng bộ, chọn SQLAlchemy Core/PyMySQL, giữ service/hợp đồng API và ánh xạ bảng tiếng Việt thay vì đổi DDL hoặc tạo ORM mới. PyMySQL[rsa] hỗ trợ xác thực caching_sha2_password của MySQL 8; dependencies được khóa trong requirements. Theo [SQLAlchemy MySQL dialect](https://docs.sqlalchemy.org/en/20/dialects/mysql.html), dùng INSERT + PK/SELECT và UPDATE + SELECT trong transaction, không dùng OUTPUT/RETURNING của SQL Server. READ COMMITTED + SELECT FOR UPDATE theo user bảo vệ retry; mỗi kết nối đặt UTC. Token Version giữ hex 16 ký tự để UI dùng cùng hợp đồng.

Frontend chọn `VITE_DATA_SOURCE=mysql`, lấy dữ liệu có xác thực từ server; demo vẫn có thể chạy độc lập. Không nhập tự động localStorage vì dữ liệu demo không có ownership đáng tin cậy. Chỉ token phiên ở sessionStorage; secrets DB/Blaze ở backend. MySQL lưu đủ bảy mức, onboarding và giọng; AI nói/viết/chat vẫn mock. Bộ test dùng schema riêng, rollback API workflows; browser E2E dùng schema riêng khác và mock speech để không ghi tài khoản thử vào database người dùng hoặc phát sinh phí.

2026-10-09: theo yêu cầu chuyển sang MySQL, chuẩn bị bootstrap riêng trong file SQL người dùng cung cấp trước khi sửa backend. Giữ tên bảng tiếng Việt của file; thêm TrinhDoCEFR/TuVungBaiHoc, mở Reading qua các bảng bài học hiện có, giữ ràng buộc ownership. Chọn OnboardingCompletedAt thay cờ lặp và SpeechVoiceId lấy catalog từ provider; không hard-code danh sách giọng/key. Seed đủ nội dung frontend và không sửa revision đã xuất bản khi chạy lại. Backend SQL Server chưa thay đổi; đổi adapter là bước sau khi người dùng chạy schema.

## 2026-10-08 — Hợp nhất UI mới với backend SQL v1

- Giữ luồng làm quen, Reading/lộ trình bảy mức, hỗ trợ Mate mới và toàn bộ backend đã có trên develop. Giữ sửa lỗi phiên intro, username và storage jsdom của develop.
- Tách kiểu mức SQL khỏi kiểu AI mock: database v1 có CHECK A2/B1/B2 và cột varchar(2), nên không thể dùng chung kiểu bảy mức. API lưu dữ liệu từ chối mức chưa hỗ trợ bằng validation 422.
- Chọn giữ schema v1; mở rộng schema/catalog lên bảy mức cần migration riêng được review. Merge không chạy migration trên database ứng dụng và không tự chuyển dữ liệu localStorage.
- Giữ prompt v1 bất biến; nội dung bảy mức được lưu thành persona.v2, service và PromptVersion của hội thoại mới dùng chung phiên bản để snapshot có thể truy vết.

## 2026-10-07 — Mate hỏi trình độ lần đầu bằng ngôn ngữ gần gũi

- Người mới không cần mở lộ trình và hiểu mã CEFR. Mate hỏi trực tiếp sau khi tạo phiên; bảy lựa chọn mô tả những việc người học làm được, mỗi lựa chọn có ví dụ và lời động viên. Ánh xạ nội bộ sang bảy chặng dùng chung cho kỹ năng; không hiển thị mã trong câu hỏi/câu trả lời.
- Dùng một bước làm quen riêng thay vì popup có thể đóng hoặc chọn mức mặc định âm thầm. Người học xác nhận để đặt mức; xem trước không đổi hồ sơ. Đây là tự mô tả khả năng để chọn bài phù hợp, chưa phải bài kiểm tra xếp lớp; vẫn có thể điều chỉnh ở lộ trình/hồ sơ.
- Cờ `daLamQuen` trong Context/localStorage giúp không hỏi lại khi reload hoặc đăng nhập lại. Dữ liệu demo cũ chưa có cờ được hỏi một lần, giữ nguyên tiến độ. Vì demo chưa có tài khoản backend riêng biệt, cờ thuộc hồ sơ trên trình duyệt; đăng ký mới đặt lại cờ. Không thêm OAuth, xác thực hoặc dịch vụ AI.

## 2026-10-07 — Lộ trình nhập môn đến thành thạo

- Dùng A1–C2 theo [các mức CEFR](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions), bổ sung Pre-A1 theo [CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions) làm điểm vào cho người chưa học; không gán A0 hoặc C3 thành mức CEFR.
- Người mới mặc định Pre-A1; hồ sơ cũ giữ nguyên. Một danh sách chung định nghĩa type, lựa chọn và mục tiêu frontend. API mở rộng Literal tương ứng; giữ default A2 để tương thích client cũ.
- Chặng được người học tự chọn, không tự coi đã đạt CEFR vì làm vài câu mẫu. Bài thực hành được biên soạn theo mức, chưa phải giáo trình đầy đủ/chuẩn hóa hay kiểm tra xếp lớp. Liên kết chặng truyền query cho đúng bài; đổi độ khó tại trang luyện không tự nâng hồ sơ.
- Giữ Web Speech/MediaRecorder và AI mock; không thêm dịch vụ trả phí hoặc dependency. Reading chấm đáp án biên soạn; phản hồi Speaking/Writing vẫn ghi rõ minh họa cố định.

## 2026-10-07 — Tích hợp develop phục vụ demo

- Merge backend/database và nhánh UI đã đồng bộ CI trên nhánh tích hợp; khi checks qua, develop nhận bằng fast-forward. Không merge backup WIP cũ, không sửa lịch sử nguồn/main hoặc push remote.
- Giữ UI mới yêu cầu đăng nhập demo abc/123; tests cho trang học tập seed phiên hợp lệ, guest menu kiểm tra riêng. Các assertion được cập nhật theo nội dung/bố cục mới, giữ kiểm tra thất bại và ngưỡng coverage.
- Vitest alias window về globalThis; Node 25 cung cấp Web Storage riêng nên lấy storage từ jsdom.window gốc. Không giả API storage để né lỗi; vẫn kiểm tra quota error/lưu/khôi phục bằng implementation trình duyệt giả của jsdom.
- UI/SQL API cùng bản demo nhưng chưa nối nghiệp vụ: localStorage + mock reply hoạt động không cần DB/key, auth SQL cần tài khoản thật qua Swagger. Hướng dẫn demo nêu rõ hai luồng để tránh nhầm tài khoản demo với JWT.

## 2026-10-07 — Hoàn thiện backend/API trên schema SQL Server

- Dùng SQLAlchemy Core + pyodbc reflect whitelist bảng/view. Script T-SQL đã thiết kế là nguồn schema duy nhất; không sinh DDL ORM trùng lặp. Migration runner được gọi chủ động, không tự tạo DB khi server khởi động.
- Giao dịch ngắn, khóa user và request UUID phối hợp retry; rowversion phát hiện sửa dữ liệu cũ. Mỗi request auth đối chiếu DB session để revoke có hiệu lực ngay. Argon2 cho mật khẩu, JWT access có issuer/audience/purpose; refresh/reset chỉ lưu hash.
- SQL đồng bộ chạy worker thread cho luồng chat/practice async; LLM ngoài transaction, timeout và trạng thái lỗi/hủy lưu lại. Mock có nhãn và không tạo điểm AI nói/viết. Listening chấm SQL, trả answer key sau nộp; transcript vẫn phục vụ browser TTS demo.
- Pillow xác thực/re-encode avatar; WAV đo duration từ frames; ffprobe kiểm tra WebM/Ogg. Media private, tải qua owner + Bearer. Image Docker có ODBC 18/ffmpeg; Windows local dùng driver hiện có, cần ffprobe riêng cho WebM/Ogg.
- Reset mật khẩu qua SMTP STARTTLS tùy chọn. Thiếu cấu hình trả 503 đồng nhất; lỗi gửi khi đã cấu hình trả 202 đồng nhất và log chung không tiết lộ recipient/token. Không gửi email hoặc paid API trong tests.
- Giới hạn body/auth work và semaphore hash mật khẩu chống chiếm hết tài nguyên trong một process. Rate limiter theo peer IP/process; deployment qua proxy/nhiều worker cần cấu hình riêng.
- Test schema/API trong tempdb với guard + outer rollback; CI có SQL Server service disposable. CI mới chưa push/chạy GitHub; kiểm chứng local không thay thế kết quả workflow.
- Giao diện đa trang giữ ở nhánh riêng; không tự merge hoặc sửa localStorage trong tác vụ backend. OAuth, email verification, STT, streaming, real LLM và account deletion còn trong backlog.

## 2026-10-07 — Thiết kế SQL Server theo chương trình hiện có

- Chọn SQL Server theo yêu cầu người dùng, thay phương án PostgreSQL ở backlog; chưa đổi runtime backend hoặc cài dependency database. Script mục tiêu SQL Server 2019+, kiểm chứng trên SQL Server 2022 Developer.
- Thiết kế 22 bảng/2 view trong schema `em`, bao phủ toàn bộ UI học tập và tài khoản. Không thêm bảng linh thú, admin, thanh toán hay memory vector vì chưa có nghiệp vụ tương ứng.
- Tách catalog có revision khỏi lịch sử từng người; notebook lưu nghĩa/ví dụ riêng thay vì từ điển chung. Từ archive giữ lịch sử ôn, filtered unique index cho phép thêm lại.
- StudySessions/FlashcardReviews là dữ liệu gốc của thống kê; view tổng hợp riêng trước join để tránh nhân số liệu. Ghi ngày địa phương/offset của sự kiện, UTC timestamps, rowversion cho optimistic concurrency. Chọn ngày hoàn thành khi phiên qua nửa đêm; chưa chia nhỏ thời lượng theo ngày.
- Khóa ghép enforce owner và loại phiên/bài/câu hỏi; request UUID chống replay trùng. AI/provider chạy ngoài transaction, kết quả mock có nhãn riêng. Chính sách cập nhật lịch ôn/đóng phiên nằm trong transaction service sẽ triển khai tiếp.
- Script tạo schema atomic và từ chối schema đã có, không dùng DROP/TRUNCATE/cascade. Seed catalog chạy lại được và không tạo tài khoản/mật khẩu. Kiểm thử trong tempdb với outer transaction, guards và rollback; 45/45 kiểm tra qua, xác nhận không còn schema thử.
- Giới hạn: localStorage không có lịch sử từng lượt nên không thể dựng lại counter cũ chính xác; cần baseline migration riêng nếu muốn giữ tổng cũ. Auth/ORM/concurrency và SQL Server 2019 riêng chưa kiểm thử.

## 2026-10-07 — Sửa cache CI và health check Docker

- Bỏ `cache: pip` và `cache-dependency-path` khỏi `setup-python` theo yêu cầu sửa CI. Task runner đặt `PIP_CACHE_DIR` thành `.cache/pip` chỉ trong tiến trình con, trong khi action dùng đường dẫn mặc định của runner; không còn bước lưu cache pip vào thư mục mặc định có thể chưa được tạo.
- Đây là vấn đề đường dẫn cache trong cấu hình hiện tại, không phải pip-tools không tương thích với cache. `setup-python` hỗ trợ requirements qua `cache-dependency-path`: [tài liệu chính thức](https://github.com/actions/setup-python/blob/main/docs/advanced-usage.md#caching-packages). Nếu thêm cache lại, cần thống nhất đường dẫn giữa action và task runner.
- Dùng curl trong image backend theo yêu cầu; cài với `--no-install-recommends` và dọn apt lists. Health check thất bại khi HTTP lỗi hoặc request quá 2 giây, với start period 15 giây và timeout Docker 3 giây.
- Thêm start period 30 giây cho frontend Compose. Docker vẫn chạy probe trong giai đoạn này; các lần thất bại chưa được tính vào số retries cho đến khi hết giai đoạn khởi động hoặc có probe thành công.
- Giữ Docker frontend ở chế độ dev. Mẫu production trong tài liệu tham chiếu là tùy chọn và stage cuối chưa có package/script để chạy lệnh dev; triển khai production cần server static và proxy API riêng khi có yêu cầu.

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

## 2026-10-08 — Blaze speech adapter

Theo yêu cầu nối key TTS/STT, dùng httpx async (đã có pin 0.28.1 trong dev lock) làm runtime dependency thay vì SDK mới. TTS poll trong timeout và trả MP3 vì payload Blaze thực tế là MP3; không tin URL audio từ provider. STT synchronous, không lưu DB; mặc định JWT, local demo opt-in. Không nối UI hoặc biến speech thành LLM/chấm phát âm.

2026-10-08: theo yêu cầu tiếp nối, đổi toàn bộ nút Nghe sang NutDoc gọi backend; chia sẻ useThuAm cho Speaking/Hội thoại. Văn bản STT là bản nháp sửa được, không tự gửi chat, không biến feedback mẫu thành chấm phát âm. Không giữ key ở frontend và không dùng browser speech synthesis để thay thế kết quả Blaze khi lỗi.

2026-10-08: lấy danh sách giọng qua endpoint backend thay vì hard-code 27 giọng vào UI. Giọng người dùng chọn là cài đặt trình duyệt, dùng cùng vòng đời localStorage hiện có; không mở rộng SQL ngoài phạm vi. Preview dùng TTS cùng giọng/tốc độ để phản ánh cách đọc trong bài học.

2026-10-08: giảm độ trễ bằng preload có chọn lọc và cache RAM theo text/voice/speed. Dùng chung generation giữa preload/click, mỗi caller hủy độc lập; cache bị chặn bởi số clip/bytes/TTL và xóa khi logout. Chưa thêm streaming, lưu audio lâu dài hoặc thay giọng người dùng bằng browser synthesis. Lần tạo đầu vẫn phụ thuộc Blaze; preload có thể tốn credit, nên danh sách nhiều nút không tải hàng loạt.
