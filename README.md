# EngMate-AI

## Đăng nhập Google/Facebook

GitHub đã được bỏ. Cấu hình ứng dụng OAuth, callback và bảng liên kết theo
[OAUTH_SETUP](docs/OAUTH_SETUP.md). Client Secret chỉ nằm trong `.env` backend;
cần cấu hình thật và cài bảng mới trước khi nghiệm thu với nhà cung cấp.

## Tối ưu chương trình — 23/10/2026

Lịch sử mở 100 tin gần nhất và có nút **Tải tin nhắn cũ**; lượt mới đồng bộ phần
thay đổi. Catalog giọng/bài học được cache, phản hồi có deadline đọc body, và
backend giới hạn tác vụ AI đồng thời. Voice lưu riêng phần clip đã phát xong để
ngắt lời không đưa toàn bộ đoạn chưa nghe vào context lượt sau.

Trong **Cài đặt → Chẩn đoán độ trễ thoại**, có thể bật thu số đo cho phiên hiện
tại rồi quay lại trò chuyện. Chỉ giữ tối đa 200 mẫu số trong RAM, không lưu âm
thanh/nội dung hoặc tự upload. Backend bật log số đo bằng `VOICE_TIMING_LOGS=true`.
Giới hạn mặc định: 16 chat/16 speech mỗi process; 2 chat/4 speech mỗi account,
cấu hình qua `.env.example`. Chạy một worker. Restart backend khi thay cấu hình.

Chi tiết triển khai và phần cần đo tiếp: [OPTIMIZATION_AUDIT](docs/OPTIMIZATION_AUDIT.md).
TTS vẫn là job/MP3, nhưng mệnh đề đầu được gửi sớm và poll nhanh hơn; VAD 900 ms,
model/giọng Blaze hiện tại được giữ. TTS/playback lỗi chỉ dừng audio, không kết thúc
phiên hay hủy Gemini đang stream; realtime STT lỗi có fallback batch một lần. Tạo
job TTS chỉ retry khi gặp `429`. Voice context dùng 12 tin/12.000 ký tự. Chưa có
p50/p95 provider/loa thật.

## STT realtime thử nghiệm (Blaze)

Để nhận dạng trong lúc nói thay vì đợi tải WAV, đặt trong `.env`, khởi động lại
backend và tải lại trang trước khi mở phiên thoại mới:

```dotenv
BLAZE_STT_MODE=realtime
BLAZE_STT_REALTIME_MODEL=stt-stream-1.5
```

Mặc định vẫn `BLAZE_STT_MODE=batch` để không tự chuyển tài khoản sang model chưa
xác minh quyền sử dụng. Realtime cần JWT/hội thoại đang mở và proxy WebSocket
(`/api` ở Vite đã có `ws: true`); không hỗ trợ demo speech không đăng nhập. Khóa
Blaze chỉ ở backend. Không tự kiểm quota bằng API trả phí; nếu realtime lỗi/timeout,
frontend gửi lại chính WAV bằng batch **một lần** rồi mới báo lỗi nếu batch cũng
thất bại. Fallback có thể phát sinh thêm phí. Đặt lại `batch`, restart và tải lại
trang để quay về luồng cũ.
Gemini, giọng/tốc độ TTS và khoảng im lặng 900 ms giữ nguyên. Đây chưa phải TTS
realtime hoặc cam kết độ trễ; cần kiểm độ chính xác, ngập ngừng, mạng chậm và chi
phí trên tài khoản Blaze thật trước khi dùng mặc định. Xem `docs/TESTING.md`.

## Lộ trình TOEIC đối thoại cùng Mate — 18/10/2026

Lộ trình gồm **5 chặng, 25 cụm bài, 100 bài học nhỏ**, đi từ nền tảng đến các mục tiêu 450, 650, 800 và 900+. Mỗi bài có mục tiêu, phần giảng ngắn, mẫu câu, ví dụ/dịch, từ vựng, tình huống, ba gợi ý thực hành, bài nghe/đọc và câu kiểm tra có đáp án ở máy chủ. Đây là cách tổ chức giáo trình do EngMate đề xuất, không phải cấp độ chính thức của ETS hay cam kết đạt điểm.

Mở **Lộ trình** hoặc **Bài học** → chọn bài → **Học bằng giọng nói** → cấp quyền micro. Mate dẫn qua năm bước **Khởi động → Mate giảng → Luyện cùng → Đối thoại → Tự kiểm tra**. Người học trò chuyện chủ yếu bằng giọng nói; **Gemini xử lý lời giảng, Blaze STT/TTS nhận và phát giọng nói**. Có thể gõ thay khi không dùng micro. Chuyển bước bằng nút hướng dẫn hoặc yêu cầu trong thoại; ngữ cảnh bài học do máy chủ cung cấp cho Gemini. Chat tự do vẫn được giữ riêng.

Mục tiêu điểm, chặng bắt đầu, phút/ngày và ngày dự kiến thi là lựa chọn của người học; chưa có bài kiểm tra đầu vào chuẩn hóa. Catalog cần đăng nhập; kế hoạch, hội thoại bài học, bước đang học, kết quả kiểm tra và lịch ôn lưu theo tài khoản trên máy chủ. **Tiến độ** chỉ dùng bằng chứng đã lưu. Hoàn thành bài cần ít nhất **3 lượt đối thoại thực tế với phản hồi hoàn tất và trả lời đúng toàn bộ câu kiểm tra**; không tự chấm từ số phút học hoặc một nút “đã xong”. Đáp án/giải thích kiểm tra chỉ trả sau khi nộp đủ câu, chấm bằng đáp án chuẩn, không để AI tự đặt điểm. Lịch ôn và gợi ý bài kế tiếp không khóa việc xem/học ở các chặng khác.

Giới hạn: đây là giáo trình thực hành và kiểm tra ngắn, **chưa có đề thi đủ 200 câu hay ngân hàng ảnh Part 1**. Luyện giọng nói hỗ trợ Listening & Reading; vẫn cần đọc văn bản. Số lượt, câu đúng và hoàn thành khóa không quy đổi thành điểm TOEIC, CEFR hoặc điểm phát âm. Nội dung cần tiếp tục được giáo viên đánh giá với người học thật; tests kỹ thuật và audio doubles không chứng minh chất lượng sư phạm hay micro/loa thực tế.

## Giao diện thầy Mate — cập nhật 18/10/2026

Màu tương tác được bổ sung theo phản hồi dễ nhìn: xanh dương cho thao tác chính,
tím cho học tập, xanh ngọc cho tiến độ. Điều hướng đang chọn có nền/vạch nhấn;
hover/focus rõ hơn, chữ mô tả và ô nhập lớn hơn, có bảng màu riêng cho sáng/tối.

Không gian sau đăng nhập tại `#hoi-thoai` dùng bố cục tối giản theo mẫu thanh bên người dùng cung cấp: thanh bên gọn trên desktop, mở rộng khi di chuột hoặc điều hướng bằng bàn phím; trên điện thoại mở bằng nút menu. Màu nền trung tính, viền mảnh và khoảng trống thay cho thanh điều hướng ngang và hiệu ứng kính trước đây. Các mục học, lịch sử, hồ sơ và cài đặt vẫn dẫn tới chức năng thật của ứng dụng; giữ sáng/tối, logo và linh vật Mate. Không cần cài thêm thư viện giao diện hoặc thay cấu hình chạy.

**Hồ sơ cá nhân:** chọn **Hồ sơ học tập** ở cuối thanh bên. Các mục **Cài đặt**, đổi sáng/tối và **Đăng xuất** cũng nằm tại đây. Bố cục thẻ hồ sơ/ảnh đại diện và biểu mẫu từ giao diện cũ được giữ; sửa họ tên, điện thoại, ngày sinh, giới tính, trình độ, mục tiêu và thời lượng học, rồi **Lưu thay đổi**. Thông tin này lưu MySQL theo tài khoản; username/email chỉ đọc. Ảnh PNG/JPEG/WebP tối đa 2 MB được xử lý lại trên trình duyệt trước khi tải lên API riêng tư. Ảnh lưu tại `.artifacts/avatars` hoặc `AVATAR_STORAGE_DIR`; cần sao lưu thư mục này cùng database. Compose mount thư mục ảnh vào `/data/avatars`, không public bằng static URL. Không cần bootstrap lại database hoặc chạy migration.

**Chọn giọng của Mate:** mở **Cài đặt → Âm thanh & giọng đọc**, chọn riêng giọng **tiếng Anh** và **tiếng Việt** từ danh sách Blaze. Bấm **Nghe thử** để nghe lựa chọn; chọn một mục hoặc mở trang không tự phát tiếng. Có thể điều chỉnh tốc độ đọc tại đây. Giọng đã chọn dùng cho nghe câu trả lời, câu mẫu và các phiên thoại Blaze tiếp theo, kể cả bài học TOEIC; menu âm thanh trong chat dùng chung lựa chọn. Cài đặt giọng được nhớ **riêng theo tài khoản trên trình duyệt hiện tại**, không đồng bộ sang thiết bị/trình duyệt khác. Khi danh sách giọng hoặc phát âm thanh gặp lỗi, giao diện cho thử lại và giữ lựa chọn; không thay bằng giọng trình duyệt. Việc nghe thử cần dịch vụ giọng nói sẵn sàng.

Linh thú gốc ở trang đăng nhập tiếp tục làm người thầy trong lớp học. Luồng học TOEIC, Gemini xử lý nội dung và Blaze nhận/phát giọng nói giữ nguyên khi đổi bố cục. [Figma Tutor journey](https://www.figma.com/design/HVCojKIt6s5jNrpUxCWKbO/Untitled?node-id=0-1) là tham chiếu của đợt lớp học trước; mẫu thanh bên tối giản mới được ưu tiên cho không gian sau đăng nhập.

- **Cùng Mate:** chat streaming/thoại trực tiếp và lịch sử trong ngăn kéo. Linh thú theo trạng thái nghe/suy nghĩ/hướng dẫn của phiên thoại thật.
- **Lộ trình và Bài học:** dùng giáo trình TOEIC 100 bài nhỏ ở trên; chọn chặng, cụm bài và học trực tiếp cùng Mate bằng giọng nói. Mục tiêu/chặng xuất phát do người học lựa chọn, không phải kết quả đánh giá đầu vào.
- **Phát âm:** nghe mẫu qua speech hiện có, ghi âm thành bản chép lời để đối chiếu và xem hướng dẫn từng âm. Chưa có bộ chấm phát âm; không hiển thị điểm mẫu 86/100.
- **Từ vựng:** các cụm giao tiếp cũ vẫn cho tự đánh dấu đã nhớ trên trình duyệt. Từ của bài TOEIC nằm trong nội dung bài. **Tiến độ TOEIC** đọc kế hoạch, lượt luyện, kết quả kiểm tra, hoàn thành và lịch ôn từ máy chủ; không dùng dấu hoàn thành cũ trong localStorage. Không tạo tài khoản demo hoặc giả lập AI.

Prompt `persona.v6` dùng chung cho chat và thoại: giải thích → làm mẫu → thực hành → nhận xét → ôn lại. Nội dung hội thoại vẫn theo tiếng Việt/Anh và yêu cầu của người học. Các đoạn mô tả phạm vi hội thoại ngày 16–18/10 dưới đây ghi lại nền tảng trước đợt thiết kế này; yêu cầu lớp học mới được ưu tiên.

Trên máy hiện tại, nếu lệnh `python` trỏ vào WindowsApps, dùng `.\.venv\Scripts\python.exe scripts/manage.py dev-backend` và `.\.venv\Scripts\python.exe scripts/manage.py dev-frontend` từ root. Provider local đang chọn Gemini; cấu hình khóa và model qua `.env` backend.

Ứng dụng hội thoại tiếng Việt và tiếng Anh: AI đáp theo ngôn ngữ người dùng, hỗ trợ tài khoản riêng, lịch sử, nhập chữ và thoại trực tiếp. Frontend React/TypeScript/Vite; backend FastAPI; lưu tài khoản và lịch sử bằng REST API trên MySQL. Adapter SQL Server v1 được giữ để tương thích dữ liệu cũ.

Giao diện giữ logo, linh vật Mate và trang đăng nhập/đăng ký gốc. Chọn lịch sử trong không gian học để mở ngăn hội thoại; vùng tin nhắn có ô nhập và các icon trên một hàng, icon tai nghe mở tùy chọn giọng/âm thanh. Nút mặt trăng/mặt trời chuyển sáng/tối và nhớ lựa chọn trên trình duyệt. Các mô tả bản chỉ hội thoại trước đây được thay bằng không gian lớp học và lộ trình TOEIC hiện tại.

Sau khi đăng nhập, app luôn mở khung chào mừng trống. Chỉ mở tin nhắn cũ khi chọn lịch sử; nút **Hội thoại mới** trở về khung chào và không tạo bản ghi trống. Hội thoại được tạo khi gửi tin đầu tiên hoặc bắt đầu thoại. Các icon tùy chọn âm thanh, thoại trực tiếp, ghi âm và gửi nằm chung trong khung nhập; rê chuột hoặc dùng trình đọc màn hình để biết chức năng.

URL đồng bộ theo phiên: `#hoi-thoai` khi đã đăng nhập, `#dang-nhap` khi chưa đăng nhập/đã đăng xuất hoặc hết phiên. Cập nhật URL không tải lại trang; sửa hash không cấp quyền truy cập. Reload vẫn yêu cầu đăng nhập lại theo cơ chế token trong bộ nhớ hiện có.

Khung chat nằm trong chiều cao màn hình; tin nhắn và lịch sử cuộn riêng, ô nhập giữ ở cuối khung. Trên màn hình hẹp, nút menu mở điều hướng; mục lịch sử mở danh sách hội thoại.

Chọn **Giọng đối thoại** trong icon tai nghe ở khung nhập để chọn giọng Blaze tiếng Việt/Anh trước hoặc trong cuộc gọi. Khi đổi giữa cuộc gọi, app dừng âm thanh và nối lại tuần tự trong cùng hội thoại, giữ lịch sử đã lưu và trạng thái tắt micro. Icon sóng âm bắt đầu/kết thúc thoại, icon micro ghi âm thành bản nháp. Ngôn ngữ nhận dạng dùng lựa chọn tiếng Việt/Anh trong menu âm thanh; Gemini vẫn theo yêu cầu ngôn ngữ, dịch hoặc luyện tập của người học. Prompt mới áp dụng cho cả hội thoại cũ khi gửi lượt mới.

Menu tai nghe chứa lựa chọn giọng Blaze cho **Nghe câu trả lời**, dùng chung lựa chọn với **Cài đặt**, và ngôn ngữ **Ghi âm** (mặc định tiếng Việt). Chọn giọng không đổi ngôn ngữ nhận dạng lời nói. Mỗi phiên giữ đúng một speaker/ngôn ngữ TTS đã chọn cho cả câu Việt/Anh; không tự đổi người đọc theo nội dung. Không dùng giọng trình duyệt thay Blaze khi TTS chậm hoặc lỗi.

**Phân công AI theo yêu cầu mới:** `LLM_PROVIDER=gemini`, `VOICE_PROVIDER=blaze`. Luồng thoại là **micro → Blaze STT → Gemini sinh lời giảng dạng chữ → Blaze TTS → loa**. Gemini phụ trách nội dung; giọng nói của Mate do Blaze tạo. Chat và thoại dùng chung lịch sử MySQL/prompt người thầy. Không mở Gemini Live trong chế độ này. Gemini Live/OpenAI Realtime chỉ còn là lựa chọn tương thích `VOICE_PROVIDER=native`, không tự bật khi Blaze lỗi. Kiểm chứng micro/loa/echo/ngắt lời và chất lượng giọng thực tế cần thực hiện riêng; tests tự động dùng transport doubles, không gọi API tính phí.

Lộ trình TOEIC và hồ sơ đã được đưa lại theo phạm vi mới; chưa đưa lại hệ thống thi/chấm đủ bốn kỹ năng, flashcard, OAuth giả hoặc SMTP reset. Ứng dụng luôn gọi backend; không còn tài khoản demo `abc/123`, localStorage demo hoặc `VITE_DATA_SOURCE`.

## Chạy local

Cần Python 3.11+ (khuyến nghị 3.13), Node >=22.12 (khuyến nghị 24), MySQL 8.0.16+ và database đã chuẩn bị.

```powershell
python scripts/manage.py setup
```

Chỉnh `.env` root theo `.env.example`: `DATABASE_MYSQL_URL`, `JWT_SECRET` ngẫu nhiên >=32 ký tự, `LLM_PROVIDER=gemini`, `VOICE_PROVIDER=blaze`, `GEMINI_API_KEY` và `BLAZE_API_KEY`. Thiếu khóa Blaze vẫn có thể chat chữ khi Gemini đã cấu hình, nhưng không có thoại/giọng đọc Blaze. Backend giữ toàn bộ secret. Ký tự đặc biệt trong mật khẩu URL phải percent-encode. `.env` không được commit. `LLM_PROVIDER=mock` bị từ chối khi khởi động runtime; tests inject doubles trực tiếp.

Mặc định `GEMINI_CHAT_MODEL=gemini-3.5-flash-lite`, `GEMINI_MAX_OUTPUT_TOKENS=2048`, `BLAZE_TTS_MODEL=v2.0_pro`, `BLAZE_STT_MODEL=stt-async-1.5`. Khóa cần quyền truy cập model và quota khả dụng; có khóa không đồng nghĩa provider luôn sẵn sàng. Thay model bằng biến môi trường khi cần; không đặt khóa trong biến `VITE_*`. Sau khi đổi `.env`, khởi động lại backend. `GEMINI_LIVE_MODEL`, `GEMINI_VOICE` và các biến OpenAI chỉ dùng cho adapter cũ khi chủ động chọn cấu hình tương ứng; không tạo giọng nói trong chế độ Blaze.

Database mới: chạy [SQL](gemini-code-1791478978574.sql) trên database **chưa có bảng ứng dụng**. File tạo **13 bảng/4 trigger**, gồm 9 bảng tài khoản/hội thoại và 4 bảng lộ trình TOEIC; cài mới không cần chạy thêm installer. SQL chỉ seed 7 mã CEFR và schema version **1**, không seed tài khoản hoặc giáo án. Nội dung/đáp án giáo án nằm trong JSON backend; ảnh đại diện nằm trong thư mục lưu ảnh riêng. [Chi tiết MySQL](database/mysql/README.md).

Database EngMateAI v1 hiện có tiếp tục dùng các bảng tương thích; **không chạy lại bootstrap hoặc DROP bảng cũ**. Nếu database này chưa có 4 bảng `engmate_learning_*`, chạy từ root để bổ sung các bảng còn thiếu, giữ dữ liệu cũ:

```powershell
.\.venv\Scripts\python.exe scripts/install_learning.py
```

Lệnh đọc cấu hình database backend hiện có và chỉ tạo bảng chưa có theo `backend/app/db/learning.py`; khởi động ứng dụng không tự chạy DDL. Với database test cũ riêng, đặt `MYSQL_TEST_URL` vào schema kết thúc `_test` rồi dùng `scripts/install_learning.py --test`; database test mới bootstrap bằng SQL cập nhật đã có đủ 13 bảng. Máy hiện tại đã cài phần bổ sung; không cần chạy lại bootstrap cũ.

Mở hai terminal tại root:

```powershell
python scripts/manage.py dev-backend
```

```powershell
python scripts/manage.py dev-frontend
```

Web: http://127.0.0.1:5174 · Swagger: http://127.0.0.1:8010/docs · health: `/api/health` · readiness: `/api/ready` · khả năng dịch vụ: `/api/capabilities`.

Đăng ký tài khoản thật → đăng nhập → gửi tin ngay từ khung chào → mở lại lịch sử khi cần. Reload trang bắt đầu lại ở đăng nhập; token chỉ giữ trong bộ nhớ, lịch sử vẫn lưu trong database. Kết thúc hội thoại khóa gửi thêm nhưng vẫn đọc lại được. Lịch sử mới nhất trước, có tải thêm; tin nhắn tải đủ các trang theo thứ tự thời gian.

Chat hiển thị phản hồi từng phần, có nút Dừng phản hồi; retry vẫn dùng cùng UUID. Micro từng lượt chép lời vào bản nháp qua Blaze để sửa trước khi gửi. Nút Nghe đọc phản hồi bằng Blaze; chế độ thoại tự chuyển bản chép lời qua Gemini rồi đọc câu trả lời bằng Blaze.

Chọn **Bắt đầu thoại trực tiếp**, cấp quyền micro, nói rồi ngừng để hệ thống nhận hết lượt. Trình duyệt dùng AudioWorklet/VAD thu PCM16 mono 16 kHz; gửi PCM realtime nếu bật, hoặc đóng gói WAV gửi Blaze batch (và gửi lại WAV một lần khi realtime lỗi); transcript gửi vào API chat streaming hiện có để Gemini trả lời và lưu lịch sử. Các câu đủ nghĩa chuyển sang Blaze TTS ngay khi Gemini còn đang sinh phần sau, rồi phát MP3 theo thứ tự; chuẩn bị trước tối đa một clip khi đang phát. Nói chen dừng âm thanh, hủy lượt xử lý cũ và bỏ clip đang chờ. **Kết thúc thoại**, đổi trang hoặc logout dừng micro/audio/request; không phát phản hồi đến muộn. Cần Web Audio/AudioWorklet, AbortSignal.any và secure context (HTTPS hoặc localhost). Giao diện khóa gửi chữ trong khi đang thoại.

Ở chế độ batch, Blaze vẫn chờ STT theo file; cả hai chế độ vẫn chờ mỗi clip TTS hoàn chỉnh, chưa phải streaming audio xuyên suốt. Gemini và TTS nay chồng lấp theo câu, các kết nối HTTP tới Gemini/Blaze tái sử dụng trong vòng đời backend. Chia câu có thể tăng số job/chi phí so với một đoạn dài; sau hai clip đầu, câu ngắn được gom tới 120 ký tự. TTS chỉ retry tạo job khi `429`; lỗi generation/audio không replay. STT chỉ chép lời, chưa chấm phát âm. Job Blaze đã được tạo có thể vẫn chạy phía nhà cung cấp sau khi trình duyệt hủy. Backend tiếp tục chạy **một worker** vì registry hủy reply/native voice chưa phân tán. Các giới hạn registry 32 phiên/process, một phiên/account, heartbeat/TTL và reconnect của adapter native chỉ áp dụng khi chọn `VOICE_PROVIDER=native`; không phải phép đo khả năng phục vụ của luồng Blaze. Quyền micro, echo/speaker và ngắt lời cần kiểm chứng trên thiết bị thật. Cách thu số đo và giới hạn phép đo tại [kiểm thử độ trễ](docs/TESTING.md#đo-độ-trễ-thoại-p0p1).

Vite đọc `BACKEND_URL` từ `.env` root hoặc terminal; mặc định `http://127.0.0.1:8010`, proxy cả HTTP và WebSocket `/api`. Reverse proxy khi triển khai cũng cần chuyển tiếp WebSocket Upgrade. Đổi port bằng `--port` và cập nhật proxy/CORS tương ứng. Dev và production dùng cùng backend, không còn lựa chọn demo ở build. Nếu báo `Port 5174 is already in use`, kiểm tra frontend đã chạy tại địa chỉ trên trước khi mở thêm tiến trình.

## Kiểm chứng

Chuẩn bị database test mới, tên kết thúc `_test`, chưa có tài khoản. Bootstrap bằng bản SQL đổi tên database sang schema test; đặt `MYSQL_TEST_URL` trong terminal, tuyệt đối không trỏ biến này vào database người dùng. Tests từ chối schema sai tên hoặc đã có tài khoản, ghi trong transaction rồi rollback.

```powershell
python scripts/manage.py lint
python scripts/manage.py test
python scripts/manage.py coverage
python scripts/manage.py build
python scripts/manage.py smoke
python scripts/manage.py export-api
```

Coverage yêu cầu >=80% cho backend và từng chỉ số frontend. Thiếu database test làm integration bị skip; kết quả đó chưa chứng minh persistence. Frontend dùng 2 worker để tránh timeout do chạy quá nhiều bộ jsdom cùng lúc. Không hạ timeout/assertion/ngưỡng coverage.

Smoke chỉ đọc health, HTML, proxy, capabilities, OpenAPI; không tạo tài khoản hoặc gọi Blaze tính phí. OpenAPI xuất tại `.artifacts/api/openapi.json`, có thể import Postman. CI được cấu hình MySQL 8.0/schema test riêng; kết quả CI từ xa phải được xác nhận sau khi chạy thực tế.

## Docker dev

```powershell
python scripts/manage.py docker-check
python scripts/manage.py docker-up
python scripts/manage.py smoke
```

MySQL là dịch vụ ngoài Compose. Với MySQL trên Windows host, đặt `DOCKER_DATABASE_MYSQL_URL` riêng dùng `host.docker.internal`; `DATABASE_MYSQL_URL` local vẫn dùng host local đã xác minh. Cổng mặc định 5174/8010 phải trống trước khi bật stack Docker. Không khởi chạy thêm các lệnh Compose khi có lệnh cũ treo. Health container là liveness; readiness/provider phải kiểm tra riêng.

## Link HTTPS tạm thời từ máy đang chạy

Build giao diện và mở reverse proxy riêng (frontend Vite 5174/backend 8010 vẫn chỉ trên máy):

```powershell
python scripts/manage.py build
docker compose -f docker-compose.yml -f docker-compose.share.yml up -d --wait share
ssh -T -p 443 -o ServerAliveInterval=30 -R 0:127.0.0.1:5180 free.pinggy.io
```

SSH in ra URL HTTPS ngẫu nhiên; nếu hỏi mật khẩu, nhấn Enter theo [hướng dẫn Pinggy](https://pinggy.io/help/). Giữ terminal SSH chạy; máy/Docker/MySQL phải hoạt động. Người khác dùng URL HTTPS đó, đăng ký/đăng nhập bằng giao diện hiện có. Phiên miễn phí hết hạn sau khoảng **60 phút**; khởi động lại tunnel sẽ có link mới. Đây là link chia sẻ tạm, không phải hosting cố định.

Lần đầu mở bằng trình duyệt, Pinggy hiện trang xác nhận của dịch vụ; chọn **Enter site** để vào app. Không cần nhập mật khẩu hoặc thông tin tài khoản trên trang xác nhận đó; form đăng nhập EngMate nằm ở bước sau.

Trong terminal khác, thêm **đúng origin HTTPS không có dấu `/` cuối** vào `CORS_ORIGINS` trong `.env` (giữ các origin local đã có), rồi chạy:

```powershell
docker compose -f docker-compose.yml -f docker-compose.share.yml up -d --wait backend
```

Bước này cho phép Origin của thoại WebSocket; không dùng wildcard hoặc bỏ kiểm tra ticket/xác thực. Proxy Nginx phục vụ `frontend/dist`, chuyển `/api` tới backend, chuyển tiếp WebSocket Upgrade và tắt buffering cho SSE. Không public Vite/source code, `.env`, SQL hoặc cổng MySQL. Cấu hình nằm ở `deploy/share.nginx.conf`; image Nginx được ghim digest. Không chọn [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) cho chế độ này vì không hỗ trợ SSE.

Để dừng chia sẻ, kết thúc SSH bằng Ctrl+C và dừng proxy:

```powershell
docker compose -f docker-compose.yml -f docker-compose.share.yml stop share
```

Lần chạy do agent thiết lập dùng SSH nền và khóa riêng tạm thời trong `.artifacts/share/`, bị Git bỏ qua; không dùng khóa SSH cá nhân. Trạng thái PID/thời điểm bắt đầu/URL nằm trong `.artifacts/share/tunnel-process.json`; bản sao origin trước chia sẻ trong `.artifacts/share/origins-before.json`. Có thể dừng proxy bằng lệnh trên để ngắt truy cập ứng dụng ngay; khi dừng SSH nền phải kiểm tra PID còn là đúng tiến trình `ssh` và đúng thời điểm bắt đầu, tránh dừng nhầm tiến trình đã tái sử dụng PID. Xóa origin tạm khỏi `.env` khi không dùng nữa và chạy lại backend nếu muốn thu hồi cấu hình Origin.

## Tài liệu

- [REST API](docs/API.md), [kiến trúc](docs/ARCHITECTURE.md), [kiểm thử](docs/TESTING.md).
- [Yêu cầu và trạng thái còn thiếu](docs/REQUIREMENTS.md), [nhật ký](docs/PROGRESS.md), [quyết định](docs/DECISIONS.md).
- Tuân thủ [AGENT.md](AGENT.md) và [CLAUDE.md](CLAUDE.md). Nhánh tiếng Việt không dấu; mô tả commit bằng tiếng Việt, giữ tiền tố Conventional Commits. Không tự commit/push khi chưa được yêu cầu.
