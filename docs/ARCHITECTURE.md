# Kiến trúc hội thoại EngMate-AI

React/TypeScript → Vite proxy `/api` → FastAPI routers → services → SQLAlchemy Core → MySQL. Adapter SQL Server giữ tương thích dữ liệu cũ. Giao diện không có nhánh demo/localStorage và không nhận secret provider/database.

- `App.tsx`: theo dõi phiên trong bộ nhớ, tải tài khoản/lịch sử, phân trang, tạo và chọn hội thoại.
- `AuthForm.tsx`: đăng ký/đăng nhập bằng API, chặn gửi trùng, xóa password khi đổi form.
- `components/Logo`, `LinhThu`, `BieuTuong`, `TieuDeTrang` và CSS: tái sử dụng bản gốc; shell chỉ còn điều hướng hội thoại. `MenuNguoiDung` giữ menu avatar gốc và gọi callback thu hồi phiên qua REST. AuthForm giữ pane trượt/intro Mate và kiểm tra xác nhận mật khẩu.
- `Chat.tsx` + `api/chatStream.ts`: tải lịch sử, draft/UUID, start/delta/done/error SSE, cập nhật một assistant MessageId, bỏ phản hồi muộn và hủy body stream khi đổi hội thoại/dừng.
- Scope `conversation-shell` giới hạn workspace theo 100dvh; grid/flex min-height:0 giữ panel trong viewport. Messages/history cuộn riêng; controls thoại cuộn giới hạn để form nhập luôn ở cuối. Chat chỉ scrollTo trên message pane, không cuộn ancestor của trang. Lịch sử là drawer ở chiều rộng <=1050px; màn hình thấp thu gọn heading/footer/khoảng đệm.
- `api/database.ts`: bearer, refresh dùng chung cho request đồng thời, epoch chống hồi sinh phiên cũ, deadline và hủy request. Refresh có hạn 15 giây, request thường 45 giây, TTS 95 giây; body/provider được giới hạn ở backend.
- `speech/audio.ts`, `hooks/useThuAm.ts`: Blaze STT/TTS từng lượt, cache/controller/microphone cleanup; không tự preload trả phí. `voice/gemini.ts` và `capture.worklet.js` quản lý PCM/AudioWorklet, queue, mute/reconnect/cleanup cho Gemini; `voice/session.ts` giữ WebRTC tùy chọn OpenAI. `VoiceChat.tsx` chọn transport theo capabilities và giữ style gốc.
- `api/chat_routes.py`: tài khoản và conversation resources; `schemas/responses.py` giới hạn trường trả về và mô tả OpenAPI.
- `ConversationService`: short transaction/khóa user để reserve turn, commit trước provider, finalize atomic; JSON API giữ tương thích. Context role-typed tối đa 20 tin/32000 ký tự, tách khỏi prompt `persona.v3.txt`, chung text/voice. JSON provider timeout 30 giây, SSE 40 giây. Pending quá 90 giây chuyển failed; cancel chặn kết quả muộn. Reply thoại bị truncate chuyển cancelled và bỏ phần chưa nghe khỏi context.
- `llm/gemini.py`, `llm/gemini_live.py`: transport mặc định cho Gemini text/Live; khóa chỉ backend và wire DEBUG bị tắt. `llm/openai.py`, `llm/realtime.py` giữ transport OpenAI tùy chọn cho cấu hình cũ.
- `services/gemini_voice.py`: relay/PCM/ticket và transcript Gemini; tái sử dụng owner/session/SQL lifecycle từ `services/realtime.py`. `api/voice_routes.py` xác thực REST/Origin/ticket và gọi manager. Backend không tin assistant text do browser gửi.
- `SpeechService`: adapter Blaze STT/TTS, origin cố định, không theo URL trả về từ provider, quota/timeout/response size validation.

Readiness/capabilities chỉ phản ánh database/cấu hình local, không xác minh quota hoặc quyền model; health chỉ kiểm tra process. Runtime get_settings từ chối mock; factory AI mặc định tạo GeminiLLMClient, chỉ tạo OpenAI client khi được chọn rõ. Không fallback provider. Doubles tồn tại trong tests và được inject trực tiếp, không import từ application.

Schema MySQL mới gồm 9 bảng, 4 trigger, tương thích các bảng hội thoại v1. Danh mục CEFR và cột phiên học/profile tối thiểu là chi tiết tương thích nội bộ, không phải chức năng bài tập hoặc dashboard. Database cũ không bị DROP/migration; code chỉ phản chiếu phần cần dùng. Tài khoản mới tạo profile tối thiểu cho khóa ngoại phiên hội thoại.

Gemini mặc định: `llm/gemini.py` dùng GenerateContent SSE, x-goog-api-key ở header backend, systemInstruction tách history user/model, bỏ thought và chỉ hoàn tất khi finishReason=STOP. `llm/gemini_live.py` mở Live WebSocket, đợi setupComplete, nạp history bằng historyConfig/clientContent, cấu hình server VAD ngắt lời và input/output transcription. Không thêm SDK/dependency.

Voice Gemini: AudioWorklet microphone→PCM16 16 kHz→WebSocket cùng origin→GeminiVoiceManager→Gemini Live; đầu ra PCM16 24 kHz→hàng đợi AudioBufferSourceNode có giới hạn 8 giây. Ticket SHA-256 chỉ dùng một lần, 10 giây, cấp qua REST bearer; kiểm tra Origin trên WS. Chỉ relay audio, không chấp nhận client transcript/config. GeminiVoiceManager tái sử dụng ownership, ConversationService và lifecycle turn của RealtimeManager; ghi transcript provider vào MySQL. interrupted xóa audio chờ và hủy/discard reply bị ngắt; thiếu input transcript khi hoàn tất thì fail closed. Cleanup đóng sockets, worklet/AudioContext/tracks/timers; reconnect tối đa ba lần, không phát lại audio cũ. OpenAI adapter/WebRTC cũ vẫn có tests riêng và chỉ được chọn qua cấu hình.

Giới hạn hiện tại: một backend worker; registry/session state chưa phân tán. Một call/account, tối đa 32/process, 600 giây mặc định, heartbeat hết hạn 35 giây. Reconnect tạo transport mới từ history đã lưu. Gemini Live đã tạo audio thật từ text trong probe; chưa xác minh microphone/echo/ngắt lời bằng thiết bị thật. Trạng thái OpenAI hết credit là kết quả lịch sử, không còn chặn cấu hình Gemini.
