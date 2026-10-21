# REST API EngMate-AI — hội thoại

## Lộ trình TOEIC học qua hội thoại, 2026-10-18

Các endpoint sau đều cần bearer hiện tại. Catalog là nội dung tự biên soạn của
EngMate; các chặng 450/650/800/900+ là mục tiêu khóa học, không phải thang xếp lớp
chính thức hoặc điểm TOEIC được chứng nhận. Việc mở bài không gọi Gemini/Blaze.

| Method | Endpoint | Hợp đồng |
| --- | --- | --- |
| GET | `/api/learning/catalog` | `{version,stages:[{id,title,target,description,level,modules:[{id,title,parts,lessons}]}]}`; mỗi bài có mục tiêu, lời mở đầu, giải thích, mẫu câu, ví dụ/dịch, tình huống, ba yêu cầu luyện tập, từ vựng, đọc/nghe và câu kiểm tra |
| GET | `/api/learning/plan` | `{version,goal_score,start_stage,minutes,exam_date}` của tài khoản; mặc định version 0, mục tiêu 650, chặng nền tảng, 15 phút/ngày, chưa có ngày thi |
| PUT | `/api/learning/plan` | Cùng các trường GET; `version` số nguyên là phiên bản mong đợi, `goal_score` 450/650/800/900/990, `minutes` 10–60, `exam_date` ngày ISO hoặc null; trả bản mới, 409 nếu cũ, 422 nếu chặng bắt đầu cao hơn mục tiêu |
| GET | `/api/learning/progress` | `{lessons,recommended_lesson_id,review_lesson_ids}`; đề xuất trong khoảng từ chặng bắt đầu đến mục tiêu, null khi hoàn tất khoảng đó; vẫn được duyệt/học bài ngoài khoảng |
| POST | `/api/learning/lessons/{lesson_id}/start` | `{client_request_id:UUID}`; trả `{conversation,progress}`, dùng lại hội thoại bài đang mở; hội thoại cũ đã đóng thì tạo hội thoại mới và giữ bằng chứng học đã lưu |
| PUT | `/api/learning/lessons/{lesson_id}/phase` | `{phase:0..4,conversation_id}`; đúng hội thoại bài của tài khoản, tiến tối đa một bước/lần, có thể quay lại; trả progress |
| POST | `/api/learning/lessons/{lesson_id}/check` | `{client_request_id:UUID,answers:[{question_id,choice}]}`; chỉ số choice bắt đầu từ 0, phải trả lời đủ từng câu đúng một lần; trả `{correct,total,passed,feedback,progress}` |

Progress mỗi bài gồm `lesson_id`, `conversation_id` hoặc null, `phase`,
`practice_turns`, `completed`, `check_correct`, `check_total`, `review_due` UTC
hoặc null. Phase 0–4 tương ứng khởi động, giảng, luyện có hướng dẫn, đóng vai,
ôn lại. Người học cũng có thể nói “Mate, bước tiếp theo”, “Mate, quay lại”,
“Mate next step” hoặc “Mate previous step”; server xử lý lệnh trong transaction
reserve lượt mới và không lặp lại thay đổi khi retry cùng UUID.

Catalog công khai từng câu kiểm tra chỉ gồm `id`, `prompt`, `options`, `skill`,
`mode`, `stimulus`; không trả `answer` hoặc `explanation`. Server chấm từ khóa
đáp án trong file nội dung có phiên bản; chỉ sau khi nộp đủ câu mới trả giải thích
và đáp án trong feedback. Không chấp nhận ID câu của bài khác, câu trùng hoặc
choice nằm ngoài options. `passed` cần đúng tất cả câu và ít nhất ba cặp tin
user/assistant đã hoàn tất trong hội thoại bài hiện tại. Lượt pending, failed,
cancelled, lệnh điều hướng và âm thanh chào mở bài không được tính. Đây là bằng
chứng tham gia và hoàn thành bài hướng dẫn; không đánh giá chất lượng phát âm,
không thay bài thi độc lập và không quy đổi thành điểm TOEIC.

Mỗi lần nộp đặt lịch ôn một ngày sau nếu chưa đạt, ba ngày sau nếu đạt; lần ôn
chưa đạt không xóa kết quả hoàn thành trước đó. Receipt lưu owner, UUID, loại
start/check và hash payload để replay ổn định; UUID dùng với payload/loại khác trả
409. Plan dùng version số nguyên riêng, không dùng version hex của hồ sơ.

`POST /api/conversations` nhận thêm `lesson_id` tùy chọn cho client cần tạo trực
tiếp. Khi có ID, server lấy title/level từ catalog, ghi binding theo owner và
`PromptVersion=toeic.v1`; không nhận nội dung giáo án do client truyền. Chat tự do
không có ID tiếp tục dùng prompt hiện có và không phụ thuộc bảng học tập mới.

Trước khi chạy luồng này, cài bốn bảng bổ sung bằng
`.venv\Scripts\python.exe scripts/install_learning.py`. Với schema test riêng,
đặt `MYSQL_TEST_URL` kết thúc `_test` rồi chạy cùng lệnh thêm `--test`. Installer
chỉ `create_all(checkfirst=True)` bốn bảng `engmate_learning_*`; không drop,
không sửa cấu trúc hoặc seed dữ liệu bảng cũ. `/api/ready` vẫn kiểm tra nhóm bảng
hội thoại; chưa kiểm tra catalog hoặc bốn bảng mới.

## Giọng Blaze và Gemini xử lý nội dung

Mặc định `VOICE_PROVIDER=blaze`, độc lập với `LLM_PROVIDER=gemini`.
`GET /api/capabilities` có thêm `voice_provider`; `realtime` chỉ bật khi cả khóa
Gemini và Blaze được cấu hình. Đây là trạng thái cấu hình, chưa xác minh quota.

`GET /api/voice/voices` cần bearer, gọi catalog Blaze và trả
`{provider:"blaze",default_voice,voices:[{id,name,language,gender}]}` cho cả `vi` và
`en`. Mặc định chọn `HN-Nam-1-BL` nếu có, nếu không chọn ID đầu trong catalog;
catalog rỗng không cho bắt đầu thoại. Không trả khóa API.

Trong chế độ Blaze, frontend gửi WAV vào `/api/speech/stt?language=vi|en`, gửi
transcript vào `/api/conversations/{identity}/messages/stream`, rồi gửi nội dung
Gemini đã hoàn tất vào `/api/speech/tts`. Hai tin nhắn được lưu bằng cơ chế chat
hiện có; không có session native, SDP hoặc WebSocket Gemini. Ngắt lời hủy request,
dừng audio và gọi `/api/conversations/{identity}/cancel` nếu đang sinh văn bản.

`POST /api/conversations/{identity}/voice` trả 409 và WebSocket audio trả 4403 trong
chế độ Blaze. Các hợp đồng Gemini Live/OpenAI Realtime bên dưới chỉ áp dụng khi
chủ động chọn `VOICE_PROVIDER=native`; không tự fallback khi Blaze lỗi.

## Hồ sơ cá nhân khôi phục ngày 2026-10-18

| Method | Endpoint | Hành vi |
| --- | --- | --- |
| GET | `/api/me/profile` | Hồ sơ của bearer hiện tại; version 16 ký tự hex, thông tin cá nhân/học tập, `has_avatar`, `total_study_minutes` đo từ phiên học |
| PUT | `/api/me/profile` | `version`, `display_name`, `phone_number`, `birth_date`, `gender`, `cefr_level`, `learning_goal`, `daily_goal_minutes`, `time_zone_id`; trả hồ sơ mới; 409 nếu version cũ |
| GET | `/api/me/avatar` | Byte ảnh riêng tư của tài khoản hiện tại; 404 nếu chưa có; MIME raster, no-store và nosniff |
| POST | `/api/me/avatar` | Multipart `file`; PNG/JPEG/WebP, tối đa 2 MiB; 204 sau khi thay ảnh atomically |

Không nhận `user_id` hoặc các trường thay username/email trong payload hồ sơ. Ngày sinh không được ở tương lai, daily goal 10–60 phút, timezone IANA hợp lệ. Trình độ tự chọn từ Pre-A1 đến C2 trên MySQL; adapter SQL Server v1 giữ A2/B1/B2. Các đường dẫn mới dùng lại bearer/session/lock và kiểm tra version đang có; không public dữ liệu hồ sơ hoặc đường dẫn file. Mục lịch sử “đã bỏ profile” bên dưới được thay thế bởi yêu cầu khôi phục này.

Base local: `http://127.0.0.1:8010`; frontend proxy `http://127.0.0.1:5174/api`. Swagger `/docs`, OpenAPI `/openapi.json`. Xuất bằng `python scripts/manage.py export-api`; import artifact `.artifacts/api/openapi.json` vào Postman.

## Quy ước

JSON snake_case, timestamp UTC ISO 8601. Private resource cần `Authorization: Bearer <access_token>`. Tài nguyên của người khác trả 404; client không gửi user_id/role/status. Body tối đa 10 MiB; auth POST giới hạn 30 yêu cầu/phút/IP/process mặc định; token và dữ liệu không được cache (`Cache-Control: no-store`).

Input thừa bị từ chối; lỗi `detail` không chứa password/token/SQL/provider body. 401 xác thực, 404 không có quyền/tài nguyên, 409 request ID khác nội dung hoặc chat/pending xung đột, 413 quá lớn, 422 input sai, 429 giới hạn, 502 upstream lỗi, 503 chưa cấu hình/database, 504 timeout. Các response account/conversation/message/token có schema riêng, không trả các trường chấm điểm cũ.

| Method | Path | Hợp đồng |
| --- | --- | --- |
| GET | `/api/health` | Liveness `status=ok, service=engmate-ai`; không gọi DB/AI |
| GET | `/api/capabilities` | provider, voice_provider, is_mock=false, chat, streaming, speech, realtime, reason; phản ánh cấu hình local, không xác minh credit/quyền model |
| GET | `/api/ready` | Bảng chat/schema version 1 và cấu hình provider được chọn; không gọi provider tính phí |
| POST | `/api/auth/register` | username, email, display_name, password; 201 token pair và user |
| POST | `/api/auth/login` | identifier (username/email), password; token pair |
| POST | `/api/auth/refresh` | refresh_token; xoay cặp token đúng một lần |
| POST | `/api/auth/logout` | Bearer; `all_sessions=false`, tùy chọn true; 204 |
| GET | `/api/me` | Tài khoản an toàn, không có hash |
| POST | `/api/conversations` | client_request_id UUID, title 1–200, level tùy chọn mặc định A2; 201 |
| GET | `/api/conversations` | offset=0, limit=50 (1–100), tăng dần offset; mới nhất trước |
| GET | `/api/conversations/{identity}` | Metadata và status in_progress/completed/abandoned |
| GET | `/api/conversations/{identity}/messages` | offset=0, limit=50 (1–100); sequence tăng dần; tải trang tiếp để đọc hết |
| POST | `/api/conversations/{identity}/messages` | client_request_id UUID, message 1–2000; trả message, reply, evaluation (chỉ trạng thái/provider/is_mock) |
| POST | `/api/conversations/{identity}/messages/stream` | Cùng payload; SSE start/delta/done/error, một response_id là MessageId assistant đã reserve |
| GET | `/api/voice/voices` | Bearer; mặc định catalog Blaze song ngữ như trên. Native trả `{provider,default_voice,voices:[{id,name}]}` của adapter cũ |
| POST | `/api/conversations/{identity}/voice` | Gemini: Bearer + `{voice_id?}`, trả `{session_id,transport:"websocket",ticket}`. Bỏ voice_id dùng GEMINI_VOICE; ID ngoài catalog trả 422 trước kết nối provider. OpenAI tùy chọn: `{sdp,voice_id?}` <=64000, chỉ nhận giọng mặc định cấu hình, trả `{session_id,sdp}` |
| WS | `/api/voice/{session_id}/audio` | Gemini: Origin trong CORS, message đầu `{ticket}` trong 5 giây; ticket dùng một lần, hết hạn 10 giây. Không truyền JWT/API key trong URL |
| POST | `/api/voice/{session_id}/heartbeat` | Bearer của chủ phiên, UUID app; trả state, gia hạn liveness |
| DELETE | `/api/voice/{session_id}` | Dừng phiên owned, chờ cleanup; 204/lặp an toàn, 404 nếu phiên thuộc user khác, 502 nếu chưa xác nhận đóng/lưu upstream |
| POST | `/api/conversations/{identity}/cancel` | Hủy reply đang pending, không đóng chat; lặp an toàn |
| POST | `/api/conversations/{identity}/close` | Đóng chat; lặp an toàn; pending cần hoàn tất hoặc hủy trước |
| GET | `/api/speech/voices?language=en` | Catalog giọng Blaze có xác thực; language en/vi |
| POST | `/api/speech/stt?language=en` | Multipart field file, <=8 MiB, language en/vi được chọn rõ; trả text/language/provider |
| POST | `/api/speech/tts` | text 1–2000, language en/vi, speaker_id tùy chọn, speed 0.5–2; trả audio/mpeg |

Mật khẩu mới 10–128 ký tự, Argon2; username 3–64 ASCII chữ/số/`_.-`, email <=254 và duy nhất. Access JWT 15 phút, refresh 30 ngày mặc định, refresh chỉ lưu SHA-256. Logout làm access token tương ứng mất hiệu lực ngay. Frontend bắt đầu ở login khi reload, không khôi phục token từ storage.

Retry gửi lại cùng UUID và cùng nội dung trả đúng bản đã lưu, không gọi model lần hai. UUID cũ với nội dung khác trả 409. Bản reply failed/cancelled không tự được chạy lại bằng network retry; người dùng có thể chủ động gửi thành lượt mới với UUID mới. Pending bị bỏ dở quá 90 giây được kết thúc failed; cancel không cho kết quả đến muộn hồi sinh job. Giới hạn level chỉ phục vụ tương thích record; không có onboarding hoặc bài kiểm tra CEFR.

`LLM_PROVIDER=gemini` mặc định dùng Gemini thật; runtime từ chối `mock`. Thiếu key/config trả 503 trước khi reserve turn. Blaze đảm nhận STT/TTS cho cả thoại và đọc từng lượt. Không fallback sang OpenAI hoặc fake khi Gemini lỗi/quota. Adapter OpenAI cũ chỉ dùng khi chọn rõ `LLM_PROVIDER=openai`.

SSE dùng `Content-Type: text/event-stream`, `X-Accel-Buffering: no`. `start` mang message/reply đã reserve; `delta` mang response_id/delta; `done` mang turn đã finalize. Retry đã có turn chỉ phát done, không gọi model lại. `error` mang status/message an toàn; HTTP có thể đã là 200 nên client **phải kiểm tra event**, không coi HTTP 200 là hoàn tất. Đã gặp thực tế HTTP 200 rồi `credit_balance_exhausted`; chuyển thành lỗi quota 429 trong event, DB reply=failed.

Đọc/hủy stream dùng bearer và owner như JSON API; close stream hoặc cancel không cho kết quả muộn hồi sinh reply. Khung hình UI bỏ delta thuộc response_id không active. Request/provider/response đều có giới hạn; tổng lượt SSE tối đa 40 giây, frontend 45 giây, reply <=12000 ký tự.

Voice Gemini đi browser↔backend↔Gemini Live. REST xác thực owner và nạp history trước khi cấp ticket; chỉ kết nối provider sau khi browser dùng ticket. WS nhận `{audio:"<base64 PCM16 mono 16kHz>"}` tối đa 8192 byte giải mã/message, tốc độ trung bình 32000 byte/giây với burst 64000; `{audio_end:true}` khi mute. Không nhận prompt, transcript hoặc cấu hình model từ browser. Server phát `ready`, `transcript` (role/text), `audio` (data PCM16 mono 24kHz), `interrupted`, `done`, `error` (message an toàn). Client đợi ready rồi gửi micro; interrupted dừng toàn bộ audio đang phát/chờ. Không lưu ticket vào storage.

Transcript lưu từ Gemini, không tin assistant text do browser gửi. Turn thiếu input transcript khi provider báo hoàn tất sẽ đóng với lỗi thay vì gán nhầm lịch sử; giới hạn input 2000 UTF-16 units/output 12000 ký tự. Voice và text dùng chung ConversationService/prompt/context/schema. Text/close trong hội thoại đang gọi trả 409. Logout/server shutdown, mất heartbeat quá 35 giây hoặc hết thời lượng đóng cả hai socket. Registry hiện một worker; tối đa 32 phiên/process, một phiên/account, 200 lượt/phiên. OpenAI tùy chọn giữ giao thức WebRTC/sideband cũ.

Các endpoint legacy `/api/ai/reply`, topics, lessons, practice, vocabulary,
flashcards, dashboard, media/avatar, profile/settings mở rộng, evaluations độc
lập, forgot/reset/change password và account edit không được khôi phục dưới URL
cũ. Hồ sơ `/api/me/profile`, avatar và nhóm `/api/learning/*` được bổ sung theo
các hợp đồng mới ở đầu tài liệu; client legacy phải cập nhật.
