# REST API EngMate-AI — hội thoại

Base local: `http://127.0.0.1:8010`; frontend proxy `http://127.0.0.1:5174/api`. Swagger `/docs`, OpenAPI `/openapi.json`. Xuất bằng `python scripts/manage.py export-api`; import artifact `.artifacts/api/openapi.json` vào Postman.

## Quy ước

JSON snake_case, timestamp UTC ISO 8601. Private resource cần `Authorization: Bearer <access_token>`. Tài nguyên của người khác trả 404; client không gửi user_id/role/status. Body tối đa 10 MiB; auth POST giới hạn 30 yêu cầu/phút/IP/process mặc định; token và dữ liệu không được cache (`Cache-Control: no-store`).

Input thừa bị từ chối; lỗi `detail` không chứa password/token/SQL/provider body. 401 xác thực, 404 không có quyền/tài nguyên, 409 request ID khác nội dung hoặc chat/pending xung đột, 413 quá lớn, 422 input sai, 429 giới hạn, 502 upstream lỗi, 503 chưa cấu hình/database, 504 timeout. Các response account/conversation/message/token có schema riêng, không trả các trường chấm điểm cũ.

| Method | Path | Hợp đồng |
| --- | --- | --- |
| GET | `/api/health` | Liveness `status=ok, service=engmate-ai`; không gọi DB/AI |
| GET | `/api/capabilities` | provider, is_mock=false, chat, streaming, speech, realtime, reason; phản ánh cấu hình local, không xác minh credit/quyền model |
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
| GET | `/api/voice/voices` | Bearer; trả `{provider,default_voice,voices:[{id,name}]}` cho thoại trực tiếp, không gọi provider tính phí; tách khỏi Blaze TTS |
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

`LLM_PROVIDER=gemini` mặc định dùng Gemini thật; runtime từ chối `mock`. Thiếu key/config trả 503 trước khi reserve turn. Blaze giữ speech từng lượt. Không fallback sang OpenAI hoặc fake khi Gemini lỗi/quota. Adapter OpenAI cũ chỉ dùng khi chọn rõ `LLM_PROVIDER=openai`.

SSE dùng `Content-Type: text/event-stream`, `X-Accel-Buffering: no`. `start` mang message/reply đã reserve; `delta` mang response_id/delta; `done` mang turn đã finalize. Retry đã có turn chỉ phát done, không gọi model lại. `error` mang status/message an toàn; HTTP có thể đã là 200 nên client **phải kiểm tra event**, không coi HTTP 200 là hoàn tất. Đã gặp thực tế HTTP 200 rồi `credit_balance_exhausted`; chuyển thành lỗi quota 429 trong event, DB reply=failed.

Đọc/hủy stream dùng bearer và owner như JSON API; close stream hoặc cancel không cho kết quả muộn hồi sinh reply. Khung hình UI bỏ delta thuộc response_id không active. Request/provider/response đều có giới hạn; tổng lượt SSE tối đa 40 giây, frontend 45 giây, reply <=12000 ký tự.

Voice Gemini đi browser↔backend↔Gemini Live. REST xác thực owner và nạp history trước khi cấp ticket; chỉ kết nối provider sau khi browser dùng ticket. WS nhận `{audio:"<base64 PCM16 mono 16kHz>"}` tối đa 8192 byte giải mã/message, tốc độ trung bình 32000 byte/giây với burst 64000; `{audio_end:true}` khi mute. Không nhận prompt, transcript hoặc cấu hình model từ browser. Server phát `ready`, `transcript` (role/text), `audio` (data PCM16 mono 24kHz), `interrupted`, `done`, `error` (message an toàn). Client đợi ready rồi gửi micro; interrupted dừng toàn bộ audio đang phát/chờ. Không lưu ticket vào storage.

Transcript lưu từ Gemini, không tin assistant text do browser gửi. Turn thiếu input transcript khi provider báo hoàn tất sẽ đóng với lỗi thay vì gán nhầm lịch sử; giới hạn input 2000 UTF-16 units/output 12000 ký tự. Voice và text dùng chung ConversationService/prompt/context/schema. Text/close trong hội thoại đang gọi trả 409. Logout/server shutdown, mất heartbeat quá 35 giây hoặc hết thời lượng đóng cả hai socket. Registry hiện một worker; tối đa 32 phiên/process, một phiên/account, 200 lượt/phiên. OpenAI tùy chọn giữ giao thức WebRTC/sideband cũ.

Đã bỏ `/api/ai/reply`, topics, lessons, practice, vocabulary, flashcards, dashboard, media/avatar, profile/settings mở rộng, evaluations độc lập, forgot/reset/change password và account edit khỏi surface của bản hội thoại này. Đây là thay đổi API có chủ đích; client cũ phải cập nhật.
