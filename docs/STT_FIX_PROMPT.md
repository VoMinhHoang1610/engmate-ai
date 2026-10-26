# Prompt sửa lỗi Blaze STT realtime — 2026-10-23

## Bằng chứng rà soát

- `.env` được kiểm bằng allowlist: `BLAZE_STT_MODE=realtime`, model
  `stt-stream-1.5`. Không đọc/in API key vào báo cáo.
- `frontend/src/voice/realtimeSTT.ts`: nhánh onmessage trước sửa chỉ nhận ready,
  partial/final. Error envelope của backend cũng rơi vào catch báo “Blaze chưa
  chốt được bản chép lời hợp lệ”, kể cả khi upstream chưa ready.
- `backend/app/services/blaze_stt.py`: open_provider và receive_text ném lỗi chung;
  relay trước sửa gom thành `{type:error,message:...}`, làm mất nguyên nhân và
  giai đoạn. Không có log phân loại để truy nguyên từ báo lỗi người dùng.
- Tài liệu công khai https://app.blaze.vn/api/documentation/stt và bundle tham
  chiếu `/assets/index-86fe5948.js` mô tả init token/language/model, ready,
  PCM16 mono 16 kHz, partial/final, error và các sự kiện billing
  `insufficient-credits`, `invoice-not-paid`, `subscription-not-found`,
  `plan-upgrade-required`. Ví dụ auth: `{type:error,text:"Authentication failed"}`.
- Worklet tạo 1600 sample PCM16/frame 100 ms; Blaze session có VAD trước khi tạo
  RealtimeSTT. Do đó thông báo hiện tại không đủ để kết luận micro không thu.
- Log backend sẵn có được thống kê không nội dung: có một request STT WebSocket,
  không có stage ready/partial/final hoặc traceback. Đây không phải bằng chứng
  upstream không ready vì timing logger có thể chưa bật.

## Prompt thực hiện

Sửa lỗi hội thoại Blaze realtime STT dựa trên bằng chứng, giữ Gemini và giọng
Blaze hiện tại. Không tuyên bố đã xác định lỗi tài khoản/micro khi thiếu dữ liệu.

1. Chuẩn hóa lỗi trong backend bằng mã nội bộ cố định và phase setup/stream.
   Phân biệt lỗi auth, billing/gói, rate limit, timeout, kết nối, sai giao thức,
   audio cap và transcript cap. Xử lý error cả trước ready lẫn đang stream.
2. Không forward/log raw payload, exception, token, transcript hay URL chứa secret.
   Mỗi relay lỗi ghi một dòng mã/phase/trace UUID. Generic provider error vẫn phải
   là lỗi dịch vụ, không suy diễn thành lỗi micro hoặc lỗi bản chép lời.
3. Frontend nhận error envelope trước điều kiện ready; map code qua whitelist
   thông báo an toàn. Tương thích backend cũ không có code, bỏ qua raw message.
   JSON/envelope sai vẫn fail closed, không chấp nhận sự kiện không rõ giao thức.
4. Giữ ticket JWT/Origin/TTL, giới hạn PCM/backlog/duration và cleanup. Partial chỉ
   là phụ đề; final mới được gửi Gemini sau endpoint. Không tự chế flush/EOS,
   tự nối lại hoặc gửi lại audio tính phí; không tự đổi `.env` sang batch.
5. Thêm test hồi quy cho error bị báo thành transcript lỗi; kiểm
   handshake reject, billing trước/sau ready, malformed frame, PCM roundtrip,
   late callbacks, stop/logout, và khởi động lại chủ động sau lỗi. Không giảm
   assertion/timeout/coverage. Kiểm lại capture resampling và Blaze→Gemini→TTS.
6. Chạy test mục tiêu, lint backend/frontend và build. Áp dụng backend sau khi
   test qua; frontend dev nhận source mới. Báo rõ nếu upstream thật vẫn chưa
   xác minh; paid benchmark/audio thật cần phê duyệt riêng theo yêu cầu trước đó.

## Phạm vi xác nhận

Sửa chắc chắn việc phân loại/che mất lỗi và kiểm hồi quy luồng audio bằng doubles.
Lỗi upstream cụ thể của lần người dùng gặp trước đó không thể khôi phục từ log cũ.
Không khẳng định cấp thêm credit, mở quyền model hoặc sửa microphone vật lý bằng
thay đổi này. Sau bản sửa, lỗi tiếp theo phải trả đúng mã để xử lý đúng nguyên nhân.

## Kết quả thực hiện

**Nguyên nhân upstream đã xác định sau lần thử kế tiếp:** probe handshake thực
trả `successful-authentication` → `ready`, còn backend trước đó yêu cầu frame đầu
là ready. Đã sửa nhận một auth acknowledgement, giữ deadline chung 10 giây và chỉ
cho PCM đi sau ready. 59 test STT/voice/timing và lint backend qua; restart backend
và kiểm chính adapter mới với Blaze thật đã đạt ready, không gửi audio. Nhận định
"chưa xác định upstream" bên dưới ghi lại trạng thái trước khi có bằng chứng này;
chất lượng transcript/hội thoại thật vẫn chưa được kiểm chứng.

**Cập nhật sau lần người dùng thử lại:** Vite cổng 5174 vẫn trả module transform
cũ dù source bind mount đã mới. Đã restart/recreate frontend, bật Chokidar polling
trong Compose và kiểm chứng HTTP cùng URL cập nhật sau sửa file trên Windows.
Log mới chỉ xác định lỗi ở setup; bổ sung reason/exception allowlist để phân biệt
frame sai, event không phải ready và lỗi nội bộ mà không ghi payload.

- Đã triển khai `STTError`/parser provider ở backend, envelope error có code/phase,
  và log `stt_failure code=... phase=... trace_id=...` không raw payload.
- Frontend nhận cả error trước ready, map mã nội bộ qua whitelist, hỗ trợ backend
  cũ không có code và không phản chiếu message tùy ý. PCM/partial/final giữ hợp đồng.
- 47 test backend STT/voice/timing và 62 test frontend realtimeSTT/Blaze/capture
  qua; có test lỗi setup rồi restart chủ động, nhận final và phát câu trả lời giả lập.
- Ruff/Black/mypy, ESLint/TypeScript/Prettier và production build qua. Lượt build
  đầu vượt deadline shell 120 giây; lượt chạy riêng với 300 giây qua, không tăng
  timeout test hoặc đổi cấu hình build.
- Đã restart container backend hiện có. Smoke health/frontend/proxy/capabilities/
  OpenAPI qua; share nginx cổng 5180 phục vụ đúng byte asset mới có handler STT mới.
- Không gọi provider trả phí/audio thật; chưa thể kết luận lỗi upstream cụ thể của
  phiên báo lỗi trước hoặc xác nhận chất lượng microphone/nhận dạng trên thiết bị.
