# TTS/STT Blaze trong backend

## STT realtime opt-in

Đặt `BLAZE_STT_MODE=realtime`, restart backend và reload trang để dùng model
`BLAZE_STT_REALTIME_MODEL=stt-stream-1.5`. Mặc định batch giữ model cũ. PCM thu
qua Worklet đi theo từng frame tới backend rồi `wss://api.blaze.vn/v1/stt/realtime`;
provider token chỉ trong init server-to-provider. Partial hiện phụ đề, không gửi
Gemini; final được gom qua khoảng pause, chờ endpoint 900 ms trước khi gửi chat.
Handshake thực tế xác minh ngày 2026-10-23 trả `successful-authentication` rồi
`ready`. Backend chấp nhận tối đa một acknowledgement này trước ready, với cùng
deadline 10 giây; vẫn hỗ trợ ready trực tiếp. Chỉ ready mới cho phép gửi PCM.
Adapter đã kết nối tới ready trên Blaze thật sau sửa, không gửi audio; đây chưa
phải kiểm chứng transcript hoặc chất lượng hội thoại.
Nếu cần, gửi silence tail tối đa 5 giây để chờ auto-final, không đoán lệnh flush.
Realtime là tối ưu, không phải phụ thuộc: nếu setup/relay/final lỗi hoặc timeout,
frontend chép lại chính WAV đã thu bằng batch **một lần** rồi mới báo lỗi nếu batch
cũng thất bại. Không promote partial thành final. Fallback này có thể phát sinh thêm
một lượt STT trả phí, nên chỉ bật realtime khi đã chấp nhận chi phí thử nghiệm; batch
vẫn là rollback.

Model realtime cần xác minh quyền tài khoản, billing và độ chính xác với giọng
người học. Chưa chạy STT realtime với audio thật để kiểm chứng; chưa chứng minh
final coverage khi sự kiện provider trễ hoặc segmented. Dùng batch làm rollback, không
giảm VAD để che latency. TTS vẫn job/MP3 theo câu; poll nhanh hơn nhưng chưa đổi
model/giọng/tốc độ.
Nguồn protocol: `https://app.blaze.vn/api/documentation/stt` và ví dụ
WebSocket trong bundle tài liệu công khai Blaze (kiểm tra ngày 2026-10-22).

## Luồng Mate hiện tại

Đặt `LLM_PROVIDER=gemini`, `VOICE_PROVIDER=blaze` và cấu hình hai khóa ở backend.
Mate dùng Blaze để nghe/chép lời và phát giọng, Gemini chỉ sinh câu trả lời bằng
văn bản. `voice/blaze.ts` tự phát hiện lượt nói, gửi WAV vào STT, gọi chat SSE có
lưu lịch sử; câu đủ nghĩa từ delta được TTS sớm, không chờ kết quả text cuối.
Ngôn ngữ ghi âm chọn Việt/Anh; câu trả lời được tách theo câu, nhưng mệnh đề đầu
tiên có thể được gửi TTS tại dấu phẩy/chấm phẩy/hai chấm sau ít nhất 32 ký tự và
tối đa 96 ký tự nếu chưa có dấu kết câu. Các đoạn sau tối đa 600 ký tự mỗi job
(API TTS vẫn nhận tối đa 2000); sau hai clip đầu, các câu ngắn được gom tới ít nhất
120 ký tự để giảm số job trả phí mà vẫn phát sớm clip đầu. Hàng đợi phát tuần tự
và chỉ chuẩn bị trước tối đa một clip. Phiên thoại giữ nguyên speaker_id và ngôn
ngữ TTS của giọng đã chọn cho mọi đoạn, gồm lời mở đầu và câu song ngữ.
Không đổi người đọc khi chuyển Anh/Việt. Giới tính từ catalog (hoặc mã Nam/Nu
của catalog cũ) được gửi cho Gemini ở từng lượt để xưng cô/thầy; không rõ dùng
mình/Mate. Chất lượng phát âm hai ngôn ngữ phụ thuộc giọng Blaze đã chọn.
Voice context dùng 12 tin gần nhất/tối đa 12.000 ký tự; text chat vẫn 20 tin/32.000
ký tự. Prompt thoại yêu cầu trả lời 1–2 câu ngắn, tối đa một câu hỏi, trừ khi người
học yêu cầu giải thích dài.

Nói chen dừng audio và hủy phản hồi trước khi xử lý lượt mới. Kết thúc thoại,
đổi giọng, đổi trang/logout dừng micro và thu hồi tài nguyên. Không gọi Gemini
Live, không dùng speechSynthesis và không tự fallback sang giọng khác. Nếu TTS
hoặc phát MP3 lỗi (kể cả lời mở đầu), frontend dừng audio, hiển thị lỗi nhưng **không kết thúc phiên
thoại** và không hủy Gemini đang stream; câu trả lời vẫn được lưu để đọc. Lỗi
Gemini thì dừng audio của lượt đó. Ghi âm từng lượt vẫn chỉ điền bản nháp; chế độ
thoại gửi transcript và đọc tự động.

Backend gọi `https://api.blaze.vn` bằng Bearer token. Tham chiếu: [Swagger Blaze](https://api.blaze.vn/docs), [TTS](https://app.blaze.vn/api/documentation/tts), [STT](https://app.blaze.vn/api/documentation/stt).

## Cấu hình

Thêm vào `.env` ở root; không đưa key vào Git hoặc biến `VITE_*`:

```dotenv
BLAZE_API_KEY=<key riêng của bạn>
BLAZE_TTS_MODEL=v2.0_pro
BLAZE_STT_MODEL=stt-async-1.5
BLAZE_LOCAL_DEMO=false
```

Để thử local không có SQL/JWT, đặt `BLAZE_LOCAL_DEMO=true` và khởi động lại backend. Chỉ request từ loopback được miễn JWT khi chưa cấu hình database. Khi DB được bật, endpoint luôn yêu cầu access token backend. Request có Origin ngoài CORS_ORIGINS và origin backend bị từ chối. Không bật demo sau proxy; không tin X-Forwarded-For. Compose luôn tắt demo speech.

Key trống trả 503. Model chọn từ cấu hình server. Chat dùng Gemini qua API hội thoại; khóa Blaze chỉ cấp quyền STT/TTS, không thay nhà cung cấp suy luận.

## POST /api/speech/tts

Body JSON:

```json
{"text":"Hello. Welcome to EngMate.","language":"en","speaker_id":"UK-Nu-1-TM","speed":1}
```

`text` 1–2000 ký tự sau trim; `language` en/vi (mặc định en); `speed` 0.5–2. Bỏ speaker_id sẽ dùng UK-Nu-1-TM cho tiếng Anh, HN-Nam-1-BL cho tiếng Việt.

Response 200 là MP3 với Content-Type `audio/mpeg`. Backend tạo một job qua `/v1/tts`, poll `/v1/tts/{id}/info` (0,2 giây trong 1 giây đầu, sau đó 0,35 giây rồi 0,5 giây), rồi tải `/download`. Không chuyển token hoặc URL cần Bearer xuống trình duyệt. Giới hạn chờ job 90 giây, request mạng 30 giây, output 8 MiB. Chỉ khi tạo job bị `429` mới thử lại tối đa hai lần sau 0,6/1,2 giây; lỗi tạo job khác, job `failed/error/cancelled`, audio sai hoặc lỗi mạng không được replay để tránh nhân phí. Log lỗi chỉ gồm operation/status/reason/số byte, không có job ID, URL, body, token hay nội dung câu. Job ở Blaze có thể vẫn chạy khi client timeout/disconnect; backend chưa lưu job để khôi phục.

Kiểm tra thực tế: Blaze trả MP3 dù yêu cầu WAV và header audio/wav. Adapter yêu cầu MP3 và kiểm tra chữ ký trước khi trả audio/mpeg.

Frontend dùng docVanBan/docTiengAnh để phát giọng Blaze, có cache trong phiên. Khi chưa có MP3, đợi Blaze; không dùng giọng máy. Tốc độ đọc giới hạn 0.5–2. Ghi âm từng lượt dùng MediaRecorder tối đa 60 giây, dừng track micro trước khi gửi STT; transcript điền bản nháp để sửa. Thoại liên tục dùng AudioWorklet và gửi tự động theo lượt như mô tả trên. Không có key Blaze trong trình duyệt.

## POST /api/speech/stt?language=en

Multipart field **file** chứa audio. Backend chuyển thành field `audio_file` cho Blaze, với `lazy_process=false`. Ngôn ngữ en/vi, mặc định en. MIME WAV, MP3, WebM, Ogg, FLAC, M4A, AAC; WebM/Ogg có codecs được chuẩn hóa. File không rỗng, tối đa 8 MiB; nội dung được Blaze giải mã.

```json
{"text":"Hello.","language":"en","provider":"blaze"}
```

Không lưu file/transcript vào SQL, không tạo điểm phát âm. Lỗi: 401 thiếu JWT, 403 Origin không được phép, 413 quá lớn, 422 đầu vào sai, 502 lỗi/response sai từ Blaze, 503 thiếu key/quota/rate limit, 504 timeout. Không trả nguyên body lỗi provider.

## Kiểm chứng

Test dùng httpx.MockTransport, không dùng key thật/credit. Chạy `python scripts/manage.py test-backend` và `python scripts/manage.py lint-backend`.

Trong Swagger local, tìm tag **speech**, thử TTS với câu ngắn, tải MP3 rồi upload lại qua STT. Request thật có thể dùng credit Blaze.

Ngày 2026-10-08 đã kiểm tra HTTP backend tại 8011: TTS `Hello.` trả 200 audio/mpeg, 19.200 bytes; STT trả 200 với text `Hello.`. Đây là smoke kết nối, không đánh giá độ chính xác cho mọi giọng/định dạng.

Ngày 2026-10-23 đo 3 job batch mỗi model qua kết nối HTTP dùng lại, cùng câu
`Xin chào, mình là Mate.` và speaker mặc định: median `v2.0_pro` 1,30 giây,
`v2.0_flash` 1,57 giây. Flash không nhanh hơn nên tiếp tục dùng pro. Một probe
WebSocket `2.0-realtime` trả byte audio đầu sau 0,595 giây và hoàn tất sau 1,312
giây, nhưng chưa tích hợp vì frontend vẫn phát MP3 trọn clip. Đây là smoke một
lượt, không phải p50/p95 hoặc đánh giá chất lượng/thiết bị thật.

## Chọn giọng trong Cài đặt

GET `/api/speech/voices?language=en` lấy danh sách speaker hiện tại từ `/v1/tts/options` của Blaze. Backend chỉ trả id/name/language/gender, lọc ngôn ngữ và giữ key server-side. UI chia giọng nam/nữ; có trạng thái tải, lỗi, tải lại, nghe thử và dừng. Cài đặt `giongDoc` lưu vào localStorage, ánh xạ vào speaker_id của mọi TTS request. Mức mặc định Helen giữ tương thích dữ liệu cũ; không thêm cột hoặc migration SQL. Giọng đã lưu chưa có trong catalog được giữ để người dùng chọn lại, không tự đổi lựa chọn.

Chrome đã kiểm tra 27 giọng en, chọn Alice, tải lại trang, nghe thử và phát câu Speaking bằng đúng speaker_id. Desktop/mobile hiển thị được selector.

## Lịch sử tối ưu giọng máy (đã thay thế)

Các mô tả tối ưu giọng máy và preload bên dưới ghi lại phiên bản cũ. Từ yêu cầu
Mate chỉ nói bằng Blaze, `docVanBan` không còn nhánh giọng máy và các màn hiện tại
không tự preload trả phí. Cache MP3 trong RAM vẫn giữ tối đa 32 clip/16 MiB/15 phút.

Frontend chuẩn bị âm thanh của câu Speaking, bài Listening/tab đang dùng, flashcard hiện tại, câu AI mới nhất và preview khi danh sách giọng đã tải xong. Bắt đầu ở tick tiếp theo để context áp dụng giọng/tốc độ trước, bỏ thời gian chờ 250 ms. Các nút trong danh sách nhiều từ/chữ cái chỉ chuẩn bị khi rê chuột hoặc focus bàn phím; không tạo giọng cho cả danh sách. Chuẩn bị không tự phát âm thanh và có thể dùng credit Blaze dù chưa bấm Nghe.

Cache trong RAM giữ tối đa 32 clip/16 MiB, tái sử dụng trong 15 phút; key gồm text đã trim, ngôn ngữ, speaker_id và tốc độ hiệu dụng. Clip giữ Blob URL/Audio đã load để không tạo bộ phát mới mỗi lần bấm; dừng/đổi trang giữ clip, hết hạn/loại khỏi cache/logout thu hồi URL. Không lưu audio vào localStorage/SQL. Phát lại không gọi API. Nếu phải đợi Blaze (preview hoặc máy thiếu giọng English cục bộ), preload và click dùng chung request với hủy độc lập. Khi không còn ai chờ, request bị hủy; phản hồi muộn không được lưu/phát. Lỗi không được cache, click có thể thử lại. Đổi giọng/tốc độ chuẩn bị đúng phiên bản mới; logout xóa cache và dừng cả MP3 lẫn giọng máy. Backend vẫn có thể hoàn tất job Blaze sau khi client đã ngắt kết nối.

Giọng máy chọn từ `speechSynthesis.getVoices()`, chỉ English có `localService=true`, ưu tiên en-GB/en-US theo giọng đã chọn; không tự chọn giọng đám mây khác. Tham chiếu [MDN localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService) và [speak](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/speak). Giọng máy có thể khác Blaze; thiết bị thiếu giọng English cục bộ phải đợi Blaze. Thời gian khởi động bộ tổng hợp/thiết bị âm thanh vẫn phụ thuộc máy, không cam kết độ trễ bằng 0.

Cache mất khi tải lại trang. Đo bằng Chrome/Blaze thật ngày 2026-10-08 với cơ chế trước đó: cùng câu Speaking và giọng Alice, chưa cache 1.654 ms, đã chuẩn bị 76 ms, phát lại 47 ms. Ngày 2026-10-09 kiểm tra Chrome với API audio bị giữ lại để tái hiện mạng chậm (fixture WAV, không gọi Blaze): lệnh giọng máy 0,5 ms, event start 418,2 ms; Audio đã load gọi play 0,6 ms, event playing 13,7 ms, chỉ một request tạo clip. Đây là lần đo local của engine/luồng trình duyệt; không đo độ trễ Blaze thật hoặc bảo đảm đầu ra loa trên mọi máy.
