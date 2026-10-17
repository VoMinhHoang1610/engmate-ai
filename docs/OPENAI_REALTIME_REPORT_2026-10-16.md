# Báo cáo Chat OpenAI và Voice Realtime — 2026-10-16

**Kết luận:** đã triển khai đường gọi OpenAI thật, SSE, Voice WebRTC/sideband, history và interrupt/cleanup trong source. **Chưa đạt toàn bộ Definition of Done live:** OpenAI trả `insufficient_quota / credit_balance_exhausted`; chưa có câu trả lời model hoàn tất hoặc cuộc thoại vật lý được xác minh. Người dùng cho biết hiện chưa bổ sung credit. Không thay bằng fake/mock và không tiếp tục probe tính phí.

## A. Kiến trúc hiện tại

React 19 + TypeScript strict + Vite, giữ CSS/logo/Mate/login/register gốc. FastAPI + Pydantic; router gọi service, AI adapter trong `backend/app/llm`. MySQL/SQLAlchemy Core lưu tài khoản và hội thoại; JWT/refresh/ownership tiếp tục dùng cơ chế hiện có. Adapter SQL Server cũ được giữ. State nằm trong React hooks, token chỉ ở bộ nhớ; reload bắt đầu lại đăng nhập, lịch sử ở DB.

## B. Vấn đề đã tìm thấy

- Runtime trước đây lấy MockLLMClient từ app/llm/mock.py, cấu hình local là mock; ConversationService chỉ cho provider mock đi qua. Blaze Chat chưa có contract nên không sinh phản hồi thật.
- API cũ trả JSON sau khi hoàn tất; chưa có SSE/UI delta. History ghép chuỗi vào system prompt; nay chuyển thành role-typed data riêng.
- Micro từng lượt dùng MediaRecorder → file STT → bản nháp và nút nghe TTS; chưa có phiên thoại/VAD/barge-in/WebRTC. Không coi luồng này là realtime.
- Tìm keyword mock/fake/dummy/demo/hardcoded/placeholder/setTimeout và các biến response trong source: model double đã chuyển vào tests. Placeholder input, intro timers, request deadlines và dummy password hash là chức năng UI/an toàn, không phải câu trả lời AI giả. Không xóa các test doubles cần thiết.
- Kiểm thử bắt được race controller khi vừa phục hồi tài khoản; đã khởi tạo signal trước tương tác đầu tiên. HTTP 200 cũng có thể mang sự kiện lỗi quota; đã xử lý như lỗi thật.

## C. Các file thay đổi trong giai đoạn này

| File | Thay đổi và lý do |
| --- | --- |
| backend/app/core/config.py, .env.example | OpenAI model/key/voice/limits; runtime từ chối mock |
| backend/app/llm/base.py | Typed history và interface generate/stream |
| backend/app/llm/openai.py | Responses/SSE HTTPX, bounds, lỗi/quota an toàn, không fallback |
| backend/app/llm/realtime.py | Hợp đồng SDP/call/sideband/hangup, key server-only |
| backend/app/llm/mock.py | Loại model double khỏi runtime, chuyển sang tests/fakes.py |
| backend/app/prompts/persona.v3.txt | Prompt chung text/voice, beginner English và interrupt intent |
| backend/app/services/conversations.py | Structured context, stream/finalize/cancel, discard phần voice chưa nghe |
| backend/app/services/realtime.py | Session owner/TTL, transcript provider, response identity, cleanup ngay cả khi DB lỗi |
| backend/app/api/dependencies.py, chat_routes.py, routes.py, voice_routes.py, main.py | Resolve provider thật, SSE/voice REST, capabilities, logout/shutdown cleanup |
| frontend/src/api/chatStream.ts | SSE từng chunk/UTF-8, deadline/abort sau headers, bỏ response ID cũ |
| frontend/src/Chat.tsx, App.tsx | Delta vào một message, Dừng phản hồi, controls voice và nhãn OpenAI trong style cũ |
| frontend/src/voice/session.ts, VoiceChat.tsx | WebRTC media/state/mute/reconnect, barge-in, End Voice cleanup |
| backend/tests/unit/test_openai.py, test_realtime.py | Offline wire contract, quota, race/interrupt/cleanup |
| backend/tests/integration/test_streaming.py, test_voice.py | SSE và voice authoritative persistence trên MySQL test |
| frontend/src/api/chatStream.test.ts, voice/session.test.ts, App.test.tsx | Chunk/UI/cancel/permission/interrupt/reconnect/cleanup |
| backend/pyproject.toml, requirements*.txt, docker-compose.yml | Thêm websockets 15.0.1, cấu hình backend OpenAI; không expose key frontend |
| README, CLAUDE, docs/*, scripts/smoke.py | Cách chạy, contract/giới hạn mới và kiểm tra capability trung thực |

Không chạy migration hoặc sửa dữ liệu ứng dụng. Nhánh `tinh-nang/hoi-thoai-openai-va-giong-noi`; chưa commit/push. Các thay đổi từ giai đoạn trước được giữ.

## D. AI architecture

User text → Chat → authenticated POST messages/stream → ConversationService reserve/commit user + assistant pending → OpenAILLMClient → OpenAI Responses → SSE delta → cập nhật cùng assistant MessageId → finalize MySQL completed.

System prompt lấy file versioned; history là input role user/assistant, không phải system instructions. JSON endpoint messages tiếp tục hoạt động qua cùng AI adapter. Retry cùng UUID trả turn đã lưu, không sinh lại. Error hoặc stream chưa complete để reply failed, không tạo câu thành công giả. Stop/cancel đóng transport, hủy task và giữ trạng thái cancelled; kết quả muộn không ghi đè. SSE response được lọc qua schema giống REST JSON.

## E. Voice architecture

Microphone → WebRTC audio track → OpenAI Realtime → WebRTC audio track/provider output buffer → speaker.

Backend nhận SDP offer có bearer, kiểm tra chủ hội thoại/open state rồi tạo call bằng secret server. Sau đó attach sideband WebSocket vào call ID do OpenAI cấp, nạp history role-typed và lưu transcript/response **provider xác nhận** vào cùng ConversationService/MySQL. Browser chỉ nhận app session UUID và SDP answer; không có key chuẩn hoặc endpoint tự ghi assistant transcript.

WebRTC/provider quản lý packet order, jitter/audio buffering và truncate. Không tự ghép audio base64 thành queue khác và không upload toàn bộ bản ghi cho phiên Realtime. Blaze STT/TTS từng lượt vẫn là controls độc lập.

## F. Interrupt flow

1. Server VAD phát speech_started trong khi micro vẫn bật. Không dùng cách tự tắt micro lúc AI nói.
2. Provider interrupt_response hủy phản hồi hiện tại; WebRTC provider bỏ/truncate audio chưa phát.
3. Client đánh dấu response ID cũ inactive, pause output và gửi clear buffer; delta/event cũ không cập nhật captions mới.
4. User tiếp tục nói; silence mặc định 900 ms tránh ngắt câu tại pause 400 ms. Provider sinh response ID mới cho intent mới.
5. Sideband ghép input item ID/response ID và xử lý transcript đến muộn, duplicate done hoặc truncate. Phần assistant bị truncate được đánh dấu cancelled và loại khỏi context bền vững.

End Voice dừng tracks/audio/data channel/peer, clear timers và cancel HTTP, gọi backend hangup/đóng sideband, settle pending. Cleanup upstream vẫn chạy khi lưu DB lỗi; lỗi đóng/lưu không báo thành công giả. Mute là lựa chọn thủ công của user.

## G. Conversation memory

User/assistant được lưu thật trong bảng Messages/TinNhan của cùng hội thoại theo sequence và owner. Job evaluation giữ provider/status/idempotency. Bounded context lấy tối đa 20 message completed gần nhất, tổng 32000 ký tự; không gửi history vô hạn. Realtime dùng prompt/identity/context giống Chat, khi reconnect lấy history đã lưu và không gửi lại audio cũ. Model text và Realtime là hai model chuyên biệt của cùng provider, dùng chung lớp conversation và quy tắc hệ thống.

State phiên thoại/registry hủy hiện ở một backend worker. Không bật multi-worker trước khi có coordination dùng chung. Transcript quá giới hạn lưu trữ bị báo lỗi, không cắt thầm thành lịch sử khác với câu user nói.

## H. Configuration

Backend `.env` bị Git bỏ qua: `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL=gpt-4.1-mini`, `OPENAI_REALTIME_MODEL=gpt-realtime`, `OPENAI_VOICE=marin`, `OPENAI_MAX_OUTPUT_TOKENS=800`. Giữ `DATABASE_MYSQL_URL`/JWT và tùy chọn `BLAZE_API_KEY` cho speech. Không có secret trong frontend hoặc tài liệu.

Voice: `VOICE_MAX_SESSION_SECONDS=600`, `VOICE_VAD_SILENCE_MS=900`, `VOICE_VAD_THRESHOLD=0.5`; tối đa 32 call/process, một call/account. Browser heartbeat 12 giây, server hết hạn sau 35 giây; reconnect tối đa 3 lần với backoff 1/2/4 giây, không replay audio cũ. Cần HTTPS hoặc localhost, WebRTC, quyền microphone và quyền model/quota.

Readiness/capabilities kiểm tra local configuration, **không chứng minh billing/model access**. Đã nhận lỗi credit_balance_exhausted với key cấu hình; không in giá trị key hoặc upstream body trong log.

## I. Tests performed

Đã chạy pytest với schema MySQL test riêng/rollback; Vitest + React Testing Library; transport doubles cho OpenAI/Blaze; kiểm tra auth/ownership/idempotency, SSE UTF-8/body cancellation, quota trong stream HTTP 200, sideband persistence/interrupt/truncate, micro permissions/reconnect/cleanup. Số lượng, coverage và lệnh kiểm tra cuối cùng nằm ở mục đầu [PROGRESS.md](PROGRESS.md).

Kết quả cuối: backend **92/92**, coverage **92,83%**; frontend **90/90**, coverage **92,44% statements / 83,75% branches / 92,27% functions / 96,69% lines**. Lint/TypeScript/mypy/format, build, smoke, Docker config và export OpenAPI đều qua. Build 43 modules; JS 272,36 kB/gzip 85,40 kB, CSS 86,54 kB/gzip 18,69 kB. Ready/frontend HTTP 200, provider=openai/is_mock=false; capability chỉ phản ánh cấu hình local.

Probe live gọi endpoint OpenAI thật: nhận HTTP 200 và response.created/in_progress, sau đó error/response.failed với insufficient_quota/credit_balance_exhausted; không có text delta hoàn tất. Không báo các ca hỏi mới/nhớ màu yêu thích/thoại thật đã qua dựa vào fixture. Người dùng hiện chưa thể bổ sung credit, nên dừng gọi live.

## J. Remaining limitations

- Chưa đạt DoD model response/live Voice: cần credit/quyền provider và kiểm chứng lại; không tiếp tục gọi tính phí trong tình trạng hiện tại.
- Chưa browser E2E/thiết bị micro/speaker/echo/barge-in vật lý. Unit tests không chứng minh chất lượng âm thanh hoặc độ trễ mạng thật.
- Một backend worker; chưa registry phân tán. Reconnect đóng phiên cũ rồi tạo phiên mới từ history, không đảm bảo phục hồi âm thanh/chữ chưa được provider xác nhận khi mất mạng.
- History bounded; chưa có memory tóm tắt dài hạn. Assistant transcript bị truncate được loại toàn bộ khỏi context bền vững để tránh ghi nhớ phần user chưa nghe.
- Blaze TTS từng lượt vẫn theo giới hạn endpoint 2000 ký tự; Realtime audio dùng OpenAI, không phải speech-to-speech của Blaze.

Hợp đồng tham chiếu: [Responses streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc), [trusted sideband](https://developers.openai.com/api/docs/guides/voice-server-controls?api=realtime&voice-api=realtime), [interruption/truncation](https://developers.openai.com/api/docs/guides/realtime-conversations).
