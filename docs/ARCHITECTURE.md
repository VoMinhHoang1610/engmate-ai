# Kiến trúc hội thoại EngMate-AI

## Xác nhận liên kết Google — 2026-10-30

Google đã xác minh nhưng trùng email cũ sẽ tạo PendingGoogleLink trong app một
worker, thay vì tự gộp tài khoản. Ticket và cookie browser độc lập, hạn 5 phút,
consume một lần. Xác minh Argon2 ngoài kết nối DB, sau đó khóa user và kiểm tra lại
hash/status/email; insert binding và issue session trong một transaction. Không
update bản ghi user/profile/learning. Không thêm bảng hoặc migration cho bước này.

## Đăng nhập nền tảng — 2026-10-29

- `api/oauth_routes.py` và `services/oauth.py`: authorization code server-side,
  state một lần gắn cookie browser, PKCE Google và kiểm tra token Facebook.
- `db/oauth.py`: bảng bổ sung `engmate_oauth_identities` có khóa provider/subject
  SHA-256 và ràng buộc một provider cho mỗi user. Chỉ installer tường minh tạo
  bảng; dùng chung transaction tạo account/profile/session để tránh bản ghi dở.
- `frontend/src/api/socialAuth.ts`: popup từ click, chỉ nhận kết quả khớp origin,
  popup, provider và state; lưu phiên vào bộ nhớ bằng API xác thực hiện có.
- Không tự liên kết theo email; không lưu provider token. Registry state nằm
  trong app một worker, không phù hợp triển khai nhiều worker chưa có kho chung.

## Tối ưu sau audit — 2026-10-23

- `core/admission.py`: gate event-loop fail-fast account/process, async context
  giữ slot cả body SSE/job; speech theo dõi ASGI disconnect sau body đã consume.
- History hỗ trợ cursor MessageId, latest/backwards trả lại thứ tự tăng dần;
  frontend merge ID và đọc tail, memo row; không thay JWT/ownership/idempotency.
- `voice:true` đánh dấu `AIEvaluations.ResultJson`; receipt played-prefix monotonic
  bảo toàn transcript đầy đủ nhưng giới hạn voice context theo clip ended và ngân
  sách 12 tin/12.000 ký tự (text: 20 tin/32.000 ký tự). `voice=false` giữ context
  text. Receipt không sửa prefix sau khi đã có lượt mới.
- Catalog giọng app-local TTL/lock, public course serialize từ schema whitelist;
  browser catalog Resource quản lý subscriber abort/TTL và account invalidation.
- Auth snapshot đọc nhanh, Argon2 ngoài transaction, lock/revalidate trước issue;
  prompt file versioned cache, practice count scope current lesson conversation.
- Landing/workspace lazy, share nginx gzip và immutable asset hash. Diagnostics
  opt-in trong RAM và INFO handler backend; chi tiết/cấu hình tại API/TESTING.

Vẫn một worker; cache/admission/voice registry chưa phối hợp giữa process. Chưa
thay protocol TTS hoặc bật mặc định STT realtime. Xem trạng thái từng hạng mục tại
`OPTIMIZATION_AUDIT.md`.

## STT realtime opt-in — 2026-10-22

`BLAZE_STT_MODE=batch|realtime` công bố qua catalog; `VoiceChat.tsx` truyền vào
`BlazeVoiceSession`, không đổi Gemini/TTS. Sau hai frame vượt RMS, `RealtimeSTT`
xin ticket JWT/owned conversation qua REST, mở WebSocket cùng origin và stream
PCM sau ready. Giữ pre-roll và backlog tối đa 160 KB; mạng chậm thì lỗi thay vì
bỏ frame. Không tự gửi audio im lặng trước lượt nói hoặc mở provider lúc tải trang.

`services/blaze_stt.py` sở hữu lease/account, hash SHA-256 ticket và constant-time
compare, một lần attach trong 10 giây. Relay kiểm frame/tổng audio/rate/duration,
cap transcript 2000 ký tự, bỏ trường phụ provider. Hai chiều hủy lẫn nhau khi lỗi/
disconnect; cleanup đóng socket provider trước khi chờ cancel task con để một lần
hủy thứ hai không bỏ qua upstream. Logout/lifespan dọn manager. Không thêm
dependency hoặc migration.

Frontend giữ final segments; partial chỉ hiện phụ đề. Nói tiếp vô hiệu trạng
thái settled; chờ im lặng 900 ms mới gửi tổng final cho chat. Nếu chưa settled,
gửi silent PCM tail tối đa 5 giây để provider tự chốt. Timeout/lỗi setup/relay
không promote partial: frontend chép lại WAV đã thu bằng batch **một lần**; nếu
batch cũng lỗi mới báo lỗi và giữ phiên. Fallback có thể phát sinh thêm một lượt
STT trả phí. Mute/stop/ngắt lời bỏ backlog/socket/callback cũ; lỗi kết nối không
còn kết thúc phiên ngay khi người học đang nói.

Protocol công khai chưa có flush ACK/audio offset, nên final-to-audio association
vẫn dựa trên thứ tự sự kiện và trạng thái voiced/partial; chưa chứng minh coverage
frame cuối khi provider lag/segment. Giữ opt-in mặc định batch đến khi kiểm chứng
thực tế, không tuyên bố đã giải quyết dứt điểm cắt lời.

Trace UUID tạo lúc STT bắt đầu, dùng cho ticket/relay/chat/TTS. Relay log
`stt_ready`, `stt_first_partial`, `stt_first_final` (final segment đầu tiên, không
phải toàn lượt). Report thêm `sttMode`; `stt_requested` có thể âm vì trước cuối
speech. `sttMs` có thể gồm thời gian người dùng nói; `sttAfterEndpointMs` đo phần
chờ còn lại sau endpoint. Không gộp mẫu batch/realtime khi so sánh.

## Không gian học tối giản với thanh bên, 2026-10-18

Sau phản hồi khó nhìn, `workspace.css` bổ sung token xanh dương/tím/xanh ngọc
và biến thể sáng/tối. `data-tone` ở mục điều hướng/thẻ xác định màu icon,
nền/viền hover và trạng thái chọn. Mục đang chọn thêm chữ đậm/vạch nhấn để
không chỉ dựa vào màu. Cỡ chữ mô tả, menu và ô nhập được tăng; các màu này
chỉ thuộc lớp trình bày, không thay đổi dữ liệu hoặc trạng thái nghiệp vụ.

`TutorWorkspace` dùng shell sau đăng nhập gồm `WorkspaceSidebar`, thanh tiêu đề
gọn và vùng nội dung. Thanh bên desktop rộng 72 px, mở lên 240 px khi hover,
focus hoặc ghim. Bản hiện tại đặt thanh bên trong luồng flex; vùng nội dung
co giãn theo chiều rộng thanh bên. Cần kiểm tra hình học và thao tác click trong
browser khi nghiệm thu thay đổi này; các kết quả overlay cũ chỉ là lịch sử.
Màn hình dưới 768 px dùng nút menu và drawer có backdrop, aria-modal, inert khi
đóng, focus trap, Escape và trả focus. Chuyển từ menu sang lịch sử đóng menu
trước; lịch sử nhận focus và khi đóng trả về nút menu đang nhìn thấy trên mobile.

`workspace.css` được import cuối, chỉ tác động `.workspace-shell`. Màu trung tính
sáng/tối, viền mảnh và vùng cuộn của chat thay các hiệu ứng kính trong không gian
đã đăng nhập. CSS đăng nhập/trang giới thiệu và nhận diện Mate được giữ riêng.
Không thêm thư viện sidebar/motion/icon; dùng React, CSS và icon SVG hiện có.
Màn hình chào hiển thị Mate nhỏ, ba lối vào bài học/phát âm/tiến độ và ô nhập
luôn trong viewport; các số liệu học tập vẫn do API trả về.

Sidebar chứa điều hướng, hội thoại mới/lịch sử và nhóm hồ sơ/cài đặt/theme/đăng
xuất. Chat, catalog, hồ sơ và Gemini/Blaze giữ service/API cũ. Rời trang chat
vẫn dọn microphone, playback và request như trước. Không thay SQL hoặc dữ liệu.
Theme áp dụng được đọc qua `readAppliedTheme`/`subscribeTheme` và
`useSyncExternalStore`; đổi ở sidebar hay Cài đặt cập nhật cùng một trạng thái,
kể cả khi trình duyệt không cho lưu localStorage.

## Giáo án nhỏ và lộ trình thoại TOEIC, 2026-10-18

`content/toeic.v1.json` là nguồn giáo án có phiên bản `toeic-voice-v1` của server:
năm chặng nền tảng → mục tiêu 450 → 650 → 800 → 900+, 25 cụm bài × bốn bài nhỏ
= 100 bài. Nội
dung tự biên soạn, không sao chép đề ETS. Mỗi bài có mục tiêu, mẫu câu, tình
huống, lời mở đầu, ba hoạt động nói, từ vựng có ngữ cảnh, đoạn nghe/đọc và câu
kiểm tra cố định. `services/curriculum.py` kiểm tra cấu trúc, ID trùng và chỉ số
đáp án khi tải; response catalog dùng schema riêng loại đáp án/giải thích câu
kiểm tra. File chứa khóa đáp án chỉ ở backend.

Hồ sơ lộ trình và kết quả không dựa vào localStorage:

| Bảng bổ sung | Trách nhiệm |
| --- | --- |
| `engmate_learning_plans` | Mục tiêu điểm, chặng bắt đầu, phút/ngày, ngày thi, version số nguyên chống ghi đè |
| `engmate_learning_progress` | Một dòng owner/bài: hội thoại hiện tại, phase, trạng thái hoàn thành, kết quả check, ngày ôn |
| `engmate_learning_bindings` | Ràng buộc owner/hội thoại với ID giáo án chuẩn; không nhận prompt từ browser |
| `engmate_learning_receipts` | Receipt start/check theo owner/UUID; loại thao tác, hash payload và JSON kết quả chống gửi lặp |

`db/learning.py` khai báo bốn bảng SQLAlchemy Core độc lập với ModelCatalog legacy.
Bootstrap MySQL ở `gemini-code-1791478978574.sql` đã khai báo cùng cột, kiểu dữ
liệu và khóa chính cho bốn bảng này; database mới có đủ 13 bảng và không cần chạy
thêm installer. Không thêm khóa ngoại vào bảng cũ hoặc thay schema hội thoại.
Schema version vẫn là 1, tách biệt với phiên bản giáo án `toeic-voice-v1`.
Với database v1 cũ còn thiếu bảng lộ trình, cài tường minh bằng
`.venv\Scripts\python.exe scripts/install_learning.py` ở root; `--test` chỉ nhận
`MYSQL_TEST_URL` trỏ schema kết thúc `_test`. Installer chỉ tạo bảng chưa có với
`checkfirst=True`, không tự chạy ở startup và không drop/update/seed bảng cũ.
`plans.Version` do service tăng; không áp dụng trigger Version của bảng legacy.
Luồng giáo án hiện được kiểm chứng trên MySQL. Adapter SQL Server v1 vẫn giới
hạn level lưu hội thoại ở A2/B1/B2; chưa mở các chặng dùng A1/C1 trên schema đó.

`learning_routes.py` dùng xác thực hiện có và gọi `LearningService`. Các thay đổi
khóa dòng user trong transaction ngắn. Bắt đầu bài gọi ConversationService trên
cùng connection, dùng lại chat của bài nếu còn mở và không gọi AI. Retry receipt
trả kết quả đã lưu; xung đột payload trả 409. Khi hội thoại đã đóng, lần bắt đầu
mới tạo chat khác và giữ tiến độ cũ. Mỗi lesson binding kiểm tra owner và không
cho đổi một conversation sang lesson khác.

Chat giáo án có `PromptVersion=toeic.v1`. Với marker này, ConversationService
ghép `persona.v6.txt`, hướng dẫn `prompts/lesson.v1.txt` và JSON giáo án chuẩn
không có câu kiểm tra/khóa đáp án vào system prompt. JSON chứa phase hiện tại và
lời mở đầu để hiểu câu trả lời đầu tiên của người học. Chat tự do giữ lifecycle
và prompt hiện hành; không truy vấn bảng học tập khi không có marker. Ngữ cảnh dùng
chung cho text/thoại; Gemini vẫn chỉ suy luận và tạo văn bản, Blaze nhận và phát
giọng. Client chủ động bắt đầu học bằng giọng mới phát lời chào qua Blaze, không
preload hoặc tự gọi provider khi duyệt lộ trình.

Năm bước giảng là khởi động → giải thích → luyện có hướng dẫn → đóng vai → ôn
lại. Người học chọn bước hoặc nói lệnh “Mate, bước tiếp theo”/“Mate, quay lại”
(có biến thể tiếng Anh); server chỉ nhận lệnh rõ ràng, chuẩn hóa chữ hoa/khoảng
trắng/dấu kết thúc, tiến tối đa một bước và loại lệnh khỏi số lượt luyện. Lệnh
được xử lý sau kiểm tra UUID nên retry không nhảy thêm bước. Gemini không được
tự ghi tiến độ hoặc tuyên bố điểm/hoàn thành.

`practice_turns` được tính từ cặp user/assistant kề nhau đã completed và có nội
dung trong đúng hội thoại bài, không dựa trên số phút hoặc tự đánh dấu. Check
chấm lựa chọn từ catalog, yêu cầu đủ câu, đúng tất cả và ít nhất ba cặp lượt
thật trước khi hoàn thành. Đây là tiêu chí hoàn thành bài hướng dẫn; chưa là đo
khả năng phát âm, kiểm tra đầu vào chuẩn hóa, kỳ thi độc lập hay dự đoán TOEIC.
Feedback có đáp án sau nộp nên lần làm lại không được coi là bài thi mới. Ôn lại
đặt sau một ngày khi chưa đạt, ba ngày khi đạt; thất bại khi ôn không xóa lần
hoàn thành trước. Đề xuất nằm từ chặng bắt đầu đến mục tiêu đã lưu, trả null nếu
đã hoàn tất; tất cả bài vẫn truy cập được để học thử hoặc ôn.

## Luồng thoại hiện hành: Blaze STT → Gemini text → Blaze TTS

Mặc định `VOICE_PROVIDER=blaze`. `voice/blaze.ts` dùng AudioWorklet PCM16 mono
16 kHz, nhận diện bắt đầu nói qua hai frame 100 ms, giữ ba frame đầu và kết thúc
lượt sau 900 ms im lặng hoặc tối đa 30 giây. Phiên giới hạn 10 phút. Không gửi
âm thanh im lặng và không tự gọi AI chào khi mở trang/bắt đầu nghe.

WAV được chép lời qua Blaze batch hoặc realtime tùy cấu hình; transcript gửi API
chat SSE có UUID và lưu MySQL như chat chữ, Gemini chỉ sinh văn bản. `SpokenText`
gom delta thành câu đủ nghĩa, không chờ toàn bộ phản hồi; mệnh đề đầu có thể được
nhả tại dấu phẩy/chấm phẩy/hai chấm sau 32 ký tự hoặc tối đa 96 ký tự để bắt đầu
TTS sớm. Giữ phần chưa đủ câu và flush sau terminal completed. Mỗi đoạn tối đa 600
ký tự, ưu tiên ngắt tại khoảng trắng; bỏ Markdown khi đọc. Sau hai clip đầu, câu ngắn
được gom tới ít nhất 120 ký tự để giảm số job TTS.
`SpeechQueue` giữ một clip đang phát và tối đa một clip đã chuẩn bị/đang tải trước,
không phát chồng, không tạo trước toàn bộ job. Mỗi phiên giữ một speaker_id và
ngôn ngữ TTS theo catalog giọng đã chọn, kể cả câu Anh/Việt trộn; không đổi người
đọc theo nội dung từng chunk. Mỗi lượt gửi voice_gender để prompt xưng cô/thầy,
metadata không rõ dùng mình/Mate. Đổi giọng tạo phiên mới sau cleanup như trước.
STT dùng ngôn ngữ người học chọn trong menu, độc lập với ngôn ngữ TTS.
Không dùng giọng máy/Gemini để thay Blaze khi chậm hoặc lỗi. Voice context chỉ giữ
12 tin/12.000 ký tự; text chat giữ 20 tin/32.000 ký tự. Prompt thoại yêu cầu trả lời
1–2 câu ngắn, tối đa một câu hỏi, trừ khi người học yêu cầu giải thích dài.

Micro vẫn thu khi phát để phát hiện chen lời. AbortController và số lượt chặn
phản hồi cũ; hủy Gemini đang xử lý qua API cancel trước lượt text mới. Dừng/đổi
giọng/rời trang/logout giải phóng tracks, AudioContext, audio URL và request.
TTS/playback có AbortController riêng: lỗi audio (kể cả lời mở đầu) chỉ dừng
clip/queue và hiện thông báo, không hủy Gemini đang stream hay kết thúc phiên; Gemini lỗi sau khi đã đọc một
phần thì dừng audio, báo lỗi và không tự đọc lại. Realtime STT lỗi/timeout fallback
batch một lần; batch lỗi mới kết thúc lượt nhưng vẫn giữ phiên. TTS chỉ retry POST
khi provider trả `429`, tối đa hai lần; lỗi generation/audio không replay. Có thể đã
nghe một phần trước terminal lỗi. Chưa kiểm chứng echo và chất lượng
microphone/loa trên thiết bị thật.

Backend lifespan sở hữu hai HTTPX pool riêng cho Blaze/Gemini (32 connections,
16 keepalive/pool, idle expiry 60 giây), đóng cả khi shutdown voice lỗi. Adapter mượn pool, không đóng
theo từng lượt; tests không chạy lifespan vẫn dùng transport scoped. Header khóa
được gắn theo request, không đưa tới browser. Registry hủy vẫn một worker.

`voice/latency.ts` phát sự kiện `engmate-voice-latency` chứa UUID và các mốc số,
không chứa transcript/tài khoản/audio và không tự lưu. Query `voice_trace_id` liên
kết STT/chat/TTS; middleware chỉ nhận UUID, dùng ContextVar xuyên suốt SSE và reset
sau request. Logger `engmate.voice.latency` ghi span bằng perf_counter tại backend.
Mốc gốc frontend là lúc nhận frame cuối vượt RMS, chỉ là **ước lượng** cuối lời
nói, không phải ground truth vật lý. `playing` không chứng minh onset tại loa.
STT batch mặc định, realtime opt-in; TTS vẫn job/poll (0,2–0,5 giây)/MP3 đủ.
Streaming TTS, streaming PCM và VAD thích nghi để sau.

Phản hồi text vẫn completed trước khi phát hết; receipt theo clip đã phát cập nhật
context voice, nhưng lịch sử/tiến độ vẫn giữ toàn văn để đọc. Không coi P0–P1 là
đạt SLO thực tế hoặc đã kiểm chứng thiết bị âm thanh.

Backend trả catalog Blaze song ngữ ở `/api/voice/voices`, metadata `voice_provider`
ở capabilities và chặn signaling native trong chế độ Blaze. Các mô tả Gemini
Live/OpenAI Realtime phía dưới là adapter tương thích, chỉ chạy khi chủ động chọn
`VOICE_PROVIDER=native`. Không thay schema hoặc dữ liệu người dùng cho luồng mới.

## Hồ sơ cá nhân, 2026-10-18

`profile/ProfilePage.tsx` đưa lại bố cục trang HoSo cũ, form gọi GET/PUT `/api/me/profile` và hiển thị trạng thái lưu/lỗi/xung đột. `useAccountProfile` tải thông tin/ảnh sau xác thực, không giữ dữ liệu cá nhân trong localStorage. Menu tài khoản có mục Hồ sơ học tập và dùng ảnh/tên thật đã tải. Lựa chọn trình độ/mục tiêu/thời lượng đã lưu đồng bộ vào phiên giao diện thầy Mate; thống kê từ/bài vẫn do người học tự ghi nhận trên trình duyệt như trước.

`ProfileService` đọc/ghi bảng LearnerProfiles/HoSoNguoiHoc sẵn có, khóa theo user và dùng Version để chống ghi đè. Không migration. Chỉ serialize danh sách trường công khai; mọi route lấy owner từ bearer. Ảnh không phụ thuộc bảng media cũ: lưu riêng theo UUID tài khoản trong `AVATAR_STORAGE_DIR` (mặc định root `.artifacts/avatars`), thay file atomically, đọc qua GET có xác thực; MIME raster/no-store/nosniff, giới hạn 2 MiB. Trình duyệt decode/crop/resize 256×256 và encode JPEG để bỏ metadata. Compose có volume riêng cho ảnh; cần backup thư mục này khi chuyển máy.

## Lớp giao diện gia sư, 2026-10-18

`App.tsx` tiếp tục quản lý phiên, tải và phân trang lịch sử;
`tutor/TutorWorkspace.tsx` quản lý điều hướng nội bộ Cùng Mate/Lộ trình/Bài học/
Phát âm/Từ vựng/Tiến độ. `curriculum.ts` và preference
`engmate-learning:<username>` còn phục vụ bốn bài giao tiếp cũ và kết quả tự ghi
nhận; không chứa token hoặc khóa API. Lộ trình TOEIC mới dùng nhóm API và bảng
riêng mô tả ở đầu tài liệu; các tự đánh dấu cũ không được chuyển thành kết quả
kiểm tra hoặc hoàn thành bài TOEIC.

`Chat.tsx` tái sử dụng lifecycle gửi/stream/cancel/idempotency; nhận bản nháp yêu cầu luyện tập do workspace chuẩn bị. `VoiceChat` thông báo trạng thái transport thật cho linh thú trong `TutorScene.tsx`. Khi rời màn chat, cleanup kết thúc phiên thoại như trước. Prompt hệ thống `persona.v6` được tải bởi ConversationService cho cả text và realtime; lượt thoại Blaze bổ sung `voice-identity.v1` theo giới tính giọng hiện tại, ưu tiên hơn cách xưng hô trong lịch sử.

`tutor.css` dùng token màu từ Figma, bố cục grid/flex responsive và giữ lựa chọn theme. SVG Figma tải về `public/tutor/`; không dùng URL asset tạm trong runtime. Linh thú là `LinhThu` hiện có theo yêu cầu người dùng. Animation ambient/orbit dựa trên chu kỳ 12 giây trong motion context; waveform chuyển động khi transport báo nói, có reduced-motion.

React/TypeScript → Vite proxy `/api` → FastAPI routers → services → SQLAlchemy Core → MySQL. Adapter SQL Server giữ tương thích dữ liệu cũ. Giao diện không có nhánh demo/localStorage và không nhận secret provider/database.

Chia sẻ HTTPS tạm thời: Pinggy → SSH reverse forward → `127.0.0.1:5180` → service `share` trong `docker-compose.share.yml`. Nginx chỉ mount `frontend/dist` và cấu hình proxy ở chế độ read-only; `/api` đi qua Docker network tới backend, WebSocket Upgrade được chuyển tiếp và SSE tắt buffering. Docker DNS được phân giải lại định kỳ để chịu được backend recreate. Các cổng backend/Vite/database không được mở công khai; cấu hình Origin thêm đúng domain HTTPS trong `.env`, giữ ticket/auth. Phiên Pinggy miễn phí giới hạn khoảng 60 phút, không có hosting cố định hoặc tự gia hạn.

- `App.tsx`: theo dõi phiên trong bộ nhớ, tải tài khoản/lịch sử và phân trang; mặc định không chọn hội thoại cũ. Nút tạo mới đổi workspace về bản nháp chào mừng; callback tạo thành công bổ sung sidebar và đánh dấu hội thoại đang mở.
- App dùng `history.replaceState` đồng bộ hash với phiên (`#hoi-thoai`/`#dang-nhap`), giữ pathname/query/history state, không thêm entry hoặc remount chat. `hashchange`/`popstate` được chuẩn hóa theo phiên thật; hash không quyết định quyền truy cập. Logout hoặc hết phiên trả URL về đăng nhập; token vẫn chỉ nằm trong bộ nhớ.
- `AuthForm.tsx`: đăng ký/đăng nhập bằng API, chặn gửi trùng, xóa password khi đổi form.
- `components/Logo`, `LinhThu`, `BieuTuong`, `TieuDeTrang` và CSS: tái sử dụng bản gốc; shell chỉ còn điều hướng hội thoại. `MenuNguoiDung` giữ menu avatar gốc và gọi callback thu hồi phiên qua REST. AuthForm giữ pane trượt/intro Mate và kiểm tra xác nhận mật khẩu.
- `Chat.tsx` + `api/chatStream.ts`: tải lịch sử, draft/UUID, start/delta/done/error SSE, cập nhật một assistant MessageId, bỏ phản hồi muộn và hủy body stream khi đổi hội thoại/dừng.
- Bản nháp chỉ POST tạo hội thoại khi gửi tin/khởi động thoại. Promise và UUID được giữ để chia sẻ lần tạo đang chờ/retry; kiểm tra generation và AbortSignal trước khi nhận kết quả muộn. `Chat` giữ instance khi tạo để không mất nội dung nhập hoặc hủy lượt gửi đầu tiên. Chọn lịch sử/tạo bản nháp mới thay instance và dọn tài nguyên cũ.
- Khung nhập và toolbar icon là một hàng flex; textarea chiếm phần co giãn, rút gọn placeholder ở màn hình hẹp, chỉ tăng chiều cao theo nội dung thật. `AudioSettingsMenu` dùng icon tai nghe cho chọn giọng Live/Blaze, đóng bằng click ngoài/Escape và trả focus khi Escape. `ThemeToggle` nằm trên topbar, áp dụng biến CSS sáng/tối và lưu riêng `engmate-theme`; main áp dụng trước khi render, storage bị chặn không làm hỏng app. Không lưu lịch sử/token vào preference này.
- `VoiceChat` chỉ tạo transport khi bắt đầu gọi. Khi đổi giọng đang hoạt động, vô hiệu callbacks cũ bằng epoch, chờ stop/DELETE hoàn tất rồi tạo transport mới với cùng conversation ID và voice mới; đồng bộ lịch sử và giữ mute. Không mở chồng phiên khi đóng lỗi; stop/unmount hủy nối lại đang chờ. Chỉ khóa picker trong thao tác bắt đầu/đổi/dừng, không khóa suốt cuộc gọi. Phụ đề chỉ hiển thị khi phiên đang hoạt động.
- Scope `conversation-shell` giới hạn workspace theo 100dvh; grid/flex min-height:0 giữ panel trong viewport. Lịch sử và tạo hội thoại ở sidebar trái, messages chiếm phần còn lại; bỏ cột lịch sử phải và thông tin trang lặp. Messages/history cuộn riêng; controls thoại cuộn giới hạn để form nhập luôn ở cuối. Ô nhập tự co sau gửi tin. Lịch sử là drawer ở chiều rộng <=900px; màn hình thấp thu gọn controls/khoảng đệm. Login/register giữ nguyên.
- `api/database.ts`: bearer, refresh dùng chung cho request đồng thời, epoch chống hồi sinh phiên cũ, deadline và hủy request. Refresh có hạn 15 giây, request thường 45 giây, TTS 95 giây; body/provider được giới hạn ở backend.
- `speech/preferences.ts`: store dùng `useSyncExternalStore` cho cặp giọng Anh/Việt, giọng đối thoại chọn gần nhất và tốc độ. `TutorWorkspace` kích hoạt theo username lúc vào tài khoản, dừng đọc và đặt lại khi rời tài khoản. Dữ liệu version 1 lưu tại `engmate-speech:<username>` trên trình duyệt; không lưu token/nội dung học, không đồng bộ thiết bị, không thêm bảng SQL. Storage hỏng trở về mặc định, storage bị chặn vẫn áp dụng trong bộ nhớ và báo chưa lưu.
- `settings/VoiceSettings.tsx` tải metadata riêng từng ngôn ngữ qua `/api/speech/voices`, kiểm tra danh sách/ID/ngôn ngữ, giữ lựa chọn không còn sẵn và cho thử lại khi lỗi. Nghe thử chỉ bắt đầu bằng click; một lượt phát tại một thời điểm, hủy khi đổi giọng/tốc độ hoặc rời trang. Chat, câu mẫu và phiên Blaze tiếp theo dùng cùng preference. Catalog đối thoại không còn giọng đã lưu sẽ báo và yêu cầu chọn lại; native adapter vẫn dùng catalog riêng.
- `speech/audio.ts`, `hooks/useThuAm.ts`: Blaze STT/TTS từng lượt, cache/controller/microphone cleanup; không tự preload trả phí. Cache phân biệt văn bản, giọng, ngôn ngữ và tốc độ; callback kết thúc phát tùy chọn bỏ qua lượt đã hủy/thay thế. `voice/gemini.ts` và `capture.worklet.js` quản lý PCM/AudioWorklet, queue, mute/reconnect/cleanup cho Gemini; `voice/session.ts` giữ WebRTC tùy chọn OpenAI. `VoiceChat.tsx` chọn transport theo capabilities và giữ style gốc.
- `api/chat_routes.py`: tài khoản và conversation resources; `schemas/responses.py` giới hạn trường trả về và mô tả OpenAPI.
- `ConversationService`: short transaction/khóa user để reserve turn, commit trước provider, finalize atomic; JSON API giữ tương thích. Context role-typed text tối đa 20 tin/32.000 ký tự, voice 12 tin/12.000 ký tự, tách khỏi prompt `persona.v6.txt`: theo ngôn ngữ lượt mới nhất (Việt/Anh), ưu tiên yêu cầu ngôn ngữ/dịch/luyện tập rõ ràng; không tự nhân đôi song ngữ. JSON provider timeout 30 giây, SSE 40 giây. Pending quá 90 giây chuyển failed; cancel chặn kết quả muộn. Reply thoại bị truncate chuyển cancelled và bỏ phần chưa nghe khỏi context.

Giọng Live chọn qua catalog REST có xác thực, lưu trên từng GeminiSession rồi chuyển thành speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName; không sửa settings chung và không nhận cấu hình model qua WS. Cho phép đổi khi đang gọi bằng cách nối lại tuần tự, reconnect sau đó dùng giọng mới. Catalog gồm tám giọng prebuilt và GEMINI_VOICE nếu có cấu hình riêng. Gemini native audio tự nhận ngôn ngữ, không truyền languageCode. Giọng Blaze đọc tin nhắn là lựa chọn riêng theo tiếng Việt/Anh; ghi âm từng lượt truyền en/vi được chọn trong menu âm thanh.
- `llm/gemini.py`, `llm/gemini_live.py`: transport mặc định cho Gemini text/Live; khóa chỉ backend và wire DEBUG bị tắt. `llm/openai.py`, `llm/realtime.py` giữ transport OpenAI tùy chọn cho cấu hình cũ.
- `services/gemini_voice.py`: relay/PCM/ticket và transcript Gemini; tái sử dụng owner/session/SQL lifecycle từ `services/realtime.py`. `api/voice_routes.py` xác thực REST/Origin/ticket và gọi manager. Backend không tin assistant text do browser gửi.
- `SpeechService`: adapter Blaze STT/TTS, origin cố định, không theo URL trả về từ provider, quota/timeout/response size validation.

Readiness/capabilities chỉ phản ánh database/cấu hình local, không xác minh quota hoặc quyền model; health chỉ kiểm tra process. Runtime get_settings từ chối mock; factory AI mặc định tạo GeminiLLMClient, chỉ tạo OpenAI client khi được chọn rõ. Không fallback provider. Doubles tồn tại trong tests và được inject trực tiếp, không import từ application.

Schema MySQL mới gồm **13 bảng, 4 trigger**: 9 bảng nền tài khoản/hồ sơ/hội thoại và 4 bảng lộ trình TOEIC nêu trên, giữ schema version 1. Danh mục seed gồm 7 mức CEFR; nội dung/đáp án giáo án vẫn ở JSON backend, avatar ở filesystem riêng. Database cũ không bị bootstrap lại hoặc DROP; code phản chiếu các bảng nền cần dùng, còn installer chỉ bổ sung bảng lộ trình thiếu. Tài khoản mới tạo profile tối thiểu cho khóa ngoại phiên hội thoại. Giới hạn schema SQL Server v1 được giữ riêng, không tự chuyển theo bootstrap MySQL này.

Gemini mặc định: `llm/gemini.py` dùng GenerateContent SSE, x-goog-api-key ở header backend, systemInstruction tách history user/model, bỏ thought và chỉ hoàn tất khi finishReason=STOP. `llm/gemini_live.py` mở Live WebSocket, đợi setupComplete, nạp history bằng historyConfig/clientContent, cấu hình server VAD ngắt lời và input/output transcription. Không thêm SDK/dependency.

Voice Gemini: AudioWorklet microphone→PCM16 16 kHz→WebSocket cùng origin→GeminiVoiceManager→Gemini Live; đầu ra PCM16 24 kHz→hàng đợi AudioBufferSourceNode có giới hạn 8 giây. Ticket SHA-256 chỉ dùng một lần, 10 giây, cấp qua REST bearer; kiểm tra Origin trên WS. Chỉ relay audio, không chấp nhận client transcript/config. GeminiVoiceManager tái sử dụng ownership, ConversationService và lifecycle turn của RealtimeManager; ghi transcript provider vào MySQL. interrupted xóa audio chờ và hủy/discard reply bị ngắt; thiếu input transcript khi hoàn tất thì fail closed. Cleanup đóng sockets, worklet/AudioContext/tracks/timers; reconnect tối đa ba lần, không phát lại audio cũ. OpenAI adapter/WebRTC cũ vẫn có tests riêng và chỉ được chọn qua cấu hình.

Giới hạn hiện tại: một backend worker; registry/session state chưa phân tán. Một call/account, tối đa 32/process, 600 giây mặc định, heartbeat hết hạn 35 giây. Reconnect tạo transport mới từ history đã lưu. Gemini Live đã tạo audio thật từ text trong probe; chưa xác minh microphone/echo/ngắt lời bằng thiết bị thật. Trạng thái OpenAI hết credit là kết quả lịch sử, không còn chặn cấu hình Gemini.
