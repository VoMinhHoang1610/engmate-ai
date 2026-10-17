# Kiểm thử bản hội thoại

Từ root: `python scripts/manage.py lint`, `test`, `coverage`, `build`, `smoke`. Lint gồm Ruff/Black/mypy, ESLint/TypeScript/Prettier. Coverage >=80% giữ nguyên. Frontend chạy 2 worker, giữ timeout/assertion.

Chia sẻ HTTPS: build trước khi bật `docker-compose.share.yml`; kiểm tra Compose `config --quiet` và `exec -T share nginx -t`. Probe public tại `.artifacts/share/check.py` đọc HTML/assets/health/ready/capabilities, xác nhận source/`.env` trả 404, catalog cần auth trả 401, CORS đúng origin và WSS handshake 101 rồi đóng 4404 với ticket giả. Browser `.artifacts/check_share_browser.cjs` mở link thật, kiểm tra màn hình đăng nhập, secure context và API microphone, không đăng nhập hoặc gọi provider. Kết quả trong `.artifacts/share/`. Các probe này không thay thế thử chat trả phí/micro/loa thực.

## Database test

Tạo database MySQL **mới**, tên kết thúc `_test`, bằng SQL root với tên database được đổi. Cấu hình `MYSQL_TEST_URL` trong terminal, không đưa URL secret vào Git hoặc dùng database EngMateAI thật. Fixture từ chối database không có hậu tố `_test` hoặc đã có tài khoản. Mỗi test dùng transaction/savepoint và rollback. Không tự bootstrap hoặc DROP database khi pytest chạy.

Suite API sử dụng MySQL thật khi có biến test. Nếu thiếu, các ca này skip và chưa được xem là kiểm chứng persistence/coverage đầy đủ. CI đã được đổi sang MySQL 8.0, bootstrap schema test và chạy cùng task runner; chưa khẳng định CI từ xa qua trước khi workflow thực thi.

| Yêu cầu | Kiểm tra |
| --- | --- |
| Surface chỉ còn auth/chat/speech, capability trung thực, auth bắt buộc | integration/test_chat_contract.py |
| Đăng ký/login/refresh/revoke, trùng identity, password sai, user disabled, ownership | integration/test_chat_database.py; unit/test_security.py |
| Đăng ký → login → chat → bỏ token/login lại/đọc lịch sử → logout/401 qua HTTP thật | integration/test_chat_http.py, Uvicorn loopback + schema MySQL test/rollback |
| Lưu/mở/đóng chat, retry UUID, >100 lịch sử | integration/test_chat_database.py |
| Provider lỗi/timeout/empty/cancel, late result, stale pending | integration/test_chat_database.py |
| Engine pool/UTC/isolation/reflection/schema guard | integration/test_chat_database.py |
| Body limits, throttle, redacted validation, JWT claims, cấu hình | unit/test_request_limits.py, test_security.py, test_config.py |
| Blaze STT/TTS/job/voices, quota/network/errors/auth/origin | unit/test_speech.py, HTTP MockTransport |
| Login/register → workspace không F5, history pagination, drafts/retry/cancel/close/logout, không có menu học tập | src/App.test.tsx |
| URL đồng bộ login/register/logout/hết phiên; giữ query/history state/bản nháp khi sửa hash hoặc popstate; hash không vượt đăng nhập | src/App.test.tsx; browser local `.artifacts/check_auth_url.cjs` |
| Bearer/refresh concurrent/logout late response/deadline | src/api/database.test.ts |
| Âm thanh/cache/cancel và microphone cleanup/STT | src/speech/audio.test.ts, src/hooks/useThuAm.test.ts |
| Giữ shell/logo/Mate gốc và chỉ một trang hội thoại; menu lịch sử/Escape | src/App.test.tsx |
| Pane đăng nhập/đăng ký gốc, xác nhận mật khẩu, chống gửi trùng, intro một lần, reduced motion/storage bị chặn | src/AuthForm.test.tsx |
| Menu avatar: hover/touch, click ngoài, Escape/focus, logout pending | src/components/MenuNguoiDung.test.tsx |
| Responses wire contract, typed history, error/quota trong HTTP 200 stream, timeout/no fake fallback | unit/test_openai.py |
| SSE start/delta/done/error, retry không duplicate, disconnect finalize cancelled, MySQL context | integration/test_streaming.py |
| SDP/private key/sideband, out-of-order transcript/response, interruption/truncate, DB lỗi vẫn hangup | unit/test_realtime.py |
| Voice owner/heartbeat/end, chặn overlap text/close, provider transcript ghi SQL, truncate loại khỏi memory | integration/test_voice.py |
| UTF-8 SSE từng byte, body cancel sau headers, incomplete/error không fake success | src/api/chatStream.test.ts |
| Micro constraints/permission, WebRTC signaling, barge-in/late response, reconnect có hạn, tracks/audio/timers cleanup | src/voice/session.test.ts |
| Chat hiển thị delta vào cùng assistant; stop giữ draft; Voice UI/mute/sync trong layout gốc | src/App.test.tsx |
| Gemini header auth, user/model context, thought filtering, STOP/partial/quota/timeout, factory/key privacy | unit/test_gemini.py |
| Live setup/history, one-use/expired tickets, Origin/REST auth, PCM giới hạn, lỗi/lease/cleanup/barge-in | unit/test_gemini_live.py |
| Gemini SSE qua SQL, retry không duplicate, shared voice history/ownership và discard reply ngắt lời | integration/test_gemini_database.py |
| PCM 16/24/44.1/48 kHz → 16 kHz, mute reset, chunk/clamp | src/voice/capture.test.ts |
| Gemini capture/playback, interruption, ticket, deadline/reconnect/late permission/cleanup; chọn đúng UI provider | src/voice/gemini.test.ts; src/App.test.tsx |
| Tự cuộn đúng pane thay vì ancestor của trang | src/App.test.tsx: scrolls new replies inside the message pane |
| Prompt v4 Việt/Anh dùng trong cả chat và thoại; lịch sử giữ nguyên vai trò | integration/test_gemini_database.py, kiểm tra request systemInstruction và session.prompt thực |
| Catalog live cần auth, voice_id sai trả 422 không mở provider, giọng theo phiên không đổi default chung | unit/test_gemini_live.py, integration/test_gemini_database.py |
| Chọn/đổi giọng Live qua UI kể cả đang gọi, giữ khi kết thúc, retry catalog; REST offer mang đúng voice_id | src/App.test.tsx, src/voice/VoiceChat.test.tsx, src/voice/gemini.test.ts, src/voice/catalog.test.ts |
| Đọc tiếng Việt/Anh với giọng riêng và gửi ngôn ngữ STT được chọn | src/speech/audio.test.ts |
| CHAT-19: khung chào mặc định, không tự đọc tin cũ/tạo bản ghi, gửi đầu tiên/retry, kết quả tạo muộn, reload/đóng hội thoại vừa tạo | src/App.test.tsx |
| CHAT-20: toolbar icon chung khung nhập, nhãn/tooltip, menu đóng ngoài/Escape/focus, tạo chat trước khi gọi, phục hồi lỗi tạo và ẩn phụ đề khi dừng | src/App.test.tsx |
| Đổi giọng chờ stop xong mới start, cùng ID, giữ mute, bỏ callbacks cũ, stop/unmount khi đang đổi, đóng lỗi và đổi liên tiếp | src/voice/VoiceChat.test.tsx |
| CHAT-21: sáng/tối, khôi phục preference/system, storage bị chặn, màu browser | src/components/ThemeToggle.test.tsx |

Kiểm tra bản một hàng: `node .artifacts/check_inline_composer.cjs` dùng Edge thật với API, microphone/Web Audio và WebSocket giả lập hoàn toàn. Đo tâm icon/textarea cùng một hàng, chiều cao khung trống, ảnh sáng/tối và đổi giọng đang gọi giữ mute/cùng ID/stop trước start ở 6 viewport. Kết quả và ảnh trong `.artifacts/inline-composer/`. Các phép thử này không kiểm chứng chất lượng âm thanh provider thật.

Kiểm tra khung chào/toolbar mới: `node .artifacts/check_welcome_composer.cjs` (artifact local) giả lập toàn bộ API trong browser, không ghi database hoặc gọi AI. Tại 1440×900, 1366×768, 768×1024, 390×844, 320×568 và 844×390, kiểm tra khung chào không fetch tin cũ/tạo bản ghi; icon nằm trong composer, không tràn màn hình; chọn giọng/menu, gửi tin đầu tiên tạo đúng một hội thoại; đọc lại lịch sử dài và quay về bản nháp. Ảnh và số đo trong `.artifacts/welcome-composer/`. Bài kiểm tra bố cục cũ bên dưới phản ánh phiên bản trước khi gom toolbar.

Kiểm tra bố cục thủ công bằng Edge headless/Playwright có sẵn trong môi trường: `node .artifacts/check_chat_layout.cjs` (artifact local, không thuộc lệnh setup/CI). Script giả lập toàn bộ `/api/` trong browser, dùng giao diện React thật và 80 tin/50 hội thoại, không gọi backend/model hoặc ghi dữ liệu thật. Đo viewport/panel/composer/page scroll trước/sau gửi tin ở 1440×900, 1366×768, 900×768, 768×1024, 390×844, 390×667, 320×568, 844×390; thêm phụ đề thoại dài để kiểm tra form vẫn nhìn thấy. Ảnh và số đo tại `.artifacts/chat-layout/`. Không dùng jsdom để khẳng định kết quả hình học CSS; bàn phím ảo vẫn cần kiểm tra trên thiết bị thật.

Các test bài tập, flashcard, dashboard, onboarding và profile/media được loại cùng tính năng sau khi người dùng duyệt kế hoạch. Auth/chat/speech không bị bỏ kiểm chứng để làm xanh suite; được chuyển thành tests phù hợp surface mới. Giao diện gốc được khôi phục cho tài khoản và hội thoại; assertions tên nút gửi được đổi về “Gửi tin nhắn”, luồng đăng xuất mở menu avatar trước và đăng ký kiểm tra trường xác nhận; giữ toàn bộ kiểm tra REST/retry/lifecycle. Schema cài mới không còn seed bài học/đáp án/từ vựng.

`smoke` chỉ đọc liveness/capabilities/OpenAPI/proxy/HTML. Tests tự động không gọi OpenAI/Blaze trả phí, không gửi SMTP, không dùng tài khoản thật. Model double ở `backend/tests/fakes.py`, dependency override và HTTP MockTransport không thuộc runtime; get_settings từ chối LLM_PROVIDER=mock. Khác với smoke, kiểm chứng live cần khóa còn credit và được phép tính phí.

Ngày 2026-10-16 đã thử OpenAI thật: HTTP 200 nhận response.created/in_progress rồi error/response.failed với `insufficient_quota`, `credit_balance_exhausted`; không có text delta hay câu trả lời hoàn tất. Dừng gọi thêm sau khi xác định quota, theo phản hồi người dùng chưa thể bổ sung credit. Không đánh dấu các ca model nhớ ngữ cảnh/đáp câu mới/thoại thật thành công dựa vào doubles.

Sau đó người dùng yêu cầu Gemini thay OpenAI. Probe thủ công đã xác nhận models API HTTP 200, adapter Flash-Lite nhận text thật, Gemini Live setupComplete và tạo 10 audio chunks kèm transcript 35 ký tự từ lời nhắc text. Gemini 3.8 Flash trả HTTP 503 trong lần thử; chọn Flash-Lite qua cấu hình, không fallback tự động. Không dùng dữ liệu tài khoản thật trong probe. Kết quả OpenAI hết credit phía trên là lịch sử, không mô tả provider hiện tại.

Browser E2E/micro/echo/speaker thực và barge-in còn cần kiểm chứng riêng: đăng ký tài khoản trên schema test → chat câu mới → kiểm tra stream/nhớ ngữ cảnh/lưu lại sau đăng nhập → bắt đầu thoại Gemini → chen lời nhiều lần → kết thúc/mất mạng/thu hồi mic. Không tạo dữ liệu thử vào database người dùng. Không coi probe audio từ text là kiểm chứng microphone vật lý hoặc toàn bộ vòng relay trong browser.

Artifact: `backend/htmlcov/index.html`, `backend/coverage.xml`, `frontend/coverage/index.html`; kết quả chạy mới nhất và giới hạn ở PROGRESS.md.
