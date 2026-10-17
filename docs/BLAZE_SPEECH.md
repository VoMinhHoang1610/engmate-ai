# TTS/STT Blaze trong backend

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

Key trống trả 503. Model chọn từ cấu hình server. Chat `/api/ai/reply` tiếp tục dùng mock; key speech không kích hoạt LLM.

## POST /api/speech/tts

Body JSON:

```json
{"text":"Hello. Welcome to EngMate.","language":"en","speaker_id":"UK-Nu-1-TM","speed":1}
```

`text` 1–2000 ký tự sau trim; `language` en/vi (mặc định en); `speed` 0.5–2. Bỏ speaker_id sẽ dùng UK-Nu-1-TM cho tiếng Anh, HN-Nam-1-BL cho tiếng Việt.

Response 200 là MP3 với Content-Type `audio/mpeg`. Backend tạo một job qua `/v1/tts`, poll `/v1/tts/{id}/info`, rồi tải `/download`. Không chuyển token hoặc URL cần Bearer xuống trình duyệt. Giới hạn chờ job 90 giây, request mạng 30 giây, output 8 MiB. Không tự retry POST tạo job; mỗi lần gọi mới có thể tính thêm phí. Job ở Blaze có thể vẫn chạy khi client timeout/disconnect; backend chưa lưu job để khôi phục.

Kiểm tra thực tế: Blaze trả MP3 dù yêu cầu WAV và header audio/wav. Adapter yêu cầu MP3 và kiểm tra chữ ký trước khi trả audio/mpeg.

Frontend dùng NutDoc và docTiengAnh để phát tiếng Anh. Nút giữ nguyên biểu tượng/nhãn khi xử lý, không hiển thị “Đang tạo giọng nói…” hoặc bị làm mờ; một lần bấm đủ để phát, các lần bấm trùng trong khi chờ được gộp. MP3 đã chuẩn bị được nạp vào Audio trước và phát trực tiếp; khi chưa có MP3, dùng giọng tiếng Anh cục bộ trên máy nếu có. Không chuyển sang MP3 giữa lúc giọng máy đang đọc. Nút Nghe thử trong Cài đặt luôn dùng đúng giọng Blaze đã chọn. Tốc độ đọc được nhân với cài đặt người dùng, giới hạn 0.5–2. Speaking và Hội thoại dùng MediaRecorder (ưu tiên WebM/Opus, Ogg/Opus, M4A), tối đa 60 giây, dừng track micro trước khi gửi STT. Transcript được điền vào textarea/input để sửa; Hội thoại không tự gửi. Không có key Blaze trong trình duyệt.

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

## Chọn giọng trong Cài đặt

GET `/api/speech/voices?language=en` lấy danh sách speaker hiện tại từ `/v1/tts/options` của Blaze. Backend chỉ trả id/name/language/gender, lọc ngôn ngữ và giữ key server-side. UI chia giọng nam/nữ; có trạng thái tải, lỗi, tải lại, nghe thử và dừng. Cài đặt `giongDoc` lưu vào localStorage, ánh xạ vào speaker_id của mọi TTS request. Mức mặc định Helen giữ tương thích dữ liệu cũ; không thêm cột hoặc migration SQL. Giọng đã lưu chưa có trong catalog được giữ để người dùng chọn lại, không tự đổi lựa chọn.

Chrome đã kiểm tra 27 giọng en, chọn Alice, tải lại trang, nghe thử và phát câu Speaking bằng đúng speaker_id. Desktop/mobile hiển thị được selector.

## Giảm thời gian chờ khi bấm Nghe

Frontend chuẩn bị âm thanh của câu Speaking, bài Listening/tab đang dùng, flashcard hiện tại, câu AI mới nhất và preview khi danh sách giọng đã tải xong. Bắt đầu ở tick tiếp theo để context áp dụng giọng/tốc độ trước, bỏ thời gian chờ 250 ms. Các nút trong danh sách nhiều từ/chữ cái chỉ chuẩn bị khi rê chuột hoặc focus bàn phím; không tạo giọng cho cả danh sách. Chuẩn bị không tự phát âm thanh và có thể dùng credit Blaze dù chưa bấm Nghe.

Cache trong RAM giữ tối đa 32 clip/16 MiB, tái sử dụng trong 15 phút; key gồm text đã trim, ngôn ngữ, speaker_id và tốc độ hiệu dụng. Clip giữ Blob URL/Audio đã load để không tạo bộ phát mới mỗi lần bấm; dừng/đổi trang giữ clip, hết hạn/loại khỏi cache/logout thu hồi URL. Không lưu audio vào localStorage/SQL. Phát lại không gọi API. Nếu phải đợi Blaze (preview hoặc máy thiếu giọng English cục bộ), preload và click dùng chung request với hủy độc lập. Khi không còn ai chờ, request bị hủy; phản hồi muộn không được lưu/phát. Lỗi không được cache, click có thể thử lại. Đổi giọng/tốc độ chuẩn bị đúng phiên bản mới; logout xóa cache và dừng cả MP3 lẫn giọng máy. Backend vẫn có thể hoàn tất job Blaze sau khi client đã ngắt kết nối.

Giọng máy chọn từ `speechSynthesis.getVoices()`, chỉ English có `localService=true`, ưu tiên en-GB/en-US theo giọng đã chọn; không tự chọn giọng đám mây khác. Tham chiếu [MDN localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService) và [speak](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/speak). Giọng máy có thể khác Blaze; thiết bị thiếu giọng English cục bộ phải đợi Blaze. Thời gian khởi động bộ tổng hợp/thiết bị âm thanh vẫn phụ thuộc máy, không cam kết độ trễ bằng 0.

Cache mất khi tải lại trang. Đo bằng Chrome/Blaze thật ngày 2026-10-08 với cơ chế trước đó: cùng câu Speaking và giọng Alice, chưa cache 1.654 ms, đã chuẩn bị 76 ms, phát lại 47 ms. Ngày 2026-10-09 kiểm tra Chrome với API audio bị giữ lại để tái hiện mạng chậm (fixture WAV, không gọi Blaze): lệnh giọng máy 0,5 ms, event start 418,2 ms; Audio đã load gọi play 0,6 ms, event playing 13,7 ms, chỉ một request tạo clip. Đây là lần đo local của engine/luồng trình duyệt; không đo độ trễ Blaze thật hoặc bảo đảm đầu ra loa trên mọi máy.
