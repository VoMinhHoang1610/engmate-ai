# EngMate-AI

Ứng dụng hội thoại tiếng Anh: tài khoản riêng, lịch sử hội thoại, nhập chữ, ghi âm từng lượt và nghe phản hồi. Frontend React/TypeScript/Vite; backend FastAPI; lưu tài khoản và lịch sử bằng REST API trên MySQL. Adapter SQL Server v1 được giữ để tương thích dữ liệu cũ.

Giao diện giữ nhận diện và bố cục gốc: logo, màu xanh, linh vật Mate, sidebar/topbar, khung hội thoại cùng lịch sử và trang đăng nhập/đăng ký chuyển pane. Chỉ thu gọn chức năng; các trang học tập phụ không được khôi phục.

Khung chat nằm trong chiều cao màn hình; tin nhắn và lịch sử cuộn riêng, ô nhập giữ ở cuối khung. Trên màn hình hẹp, mở lịch sử bằng nút menu ở thanh trên.

**Trạng thái tích hợp:** mặc định dùng **Gemini** cho chat streaming và thoại trực tiếp Gemini Live theo yêu cầu mới. Blaze tiếp tục phục vụ STT/TTS từng lượt. Khóa ở backend; không fallback sang OpenAI hoặc câu trả lời giả. Đã nhận câu trả lời thật bằng adapter chat và Gemini Live tạo âm thanh thật bằng lời nhắc văn bản; kiểm chứng microphone/loa và ngắt lời trên trình duyệt thật còn cần thực hiện. Tests tự động dùng transport doubles, không gọi API tính phí.

Đã loại lộ trình, onboarding, dashboard, bài tập/chấm điểm bốn kỹ năng, flashcard, sổ từ, hồ sơ mở rộng, OAuth giả và các màn hình phụ. Ứng dụng luôn gọi backend; không còn tài khoản demo `abc/123`, localStorage demo hoặc `VITE_DATA_SOURCE`.

## Chạy local

Cần Python 3.11+ (khuyến nghị 3.13), Node >=22.12 (khuyến nghị 24), MySQL 8.0.16+ và database đã chuẩn bị.

```powershell
python scripts/manage.py setup
```

Chỉnh `.env` root theo `.env.example`: `DATABASE_MYSQL_URL`, `JWT_SECRET` ngẫu nhiên >=32 ký tự, `LLM_PROVIDER=gemini`, `GEMINI_API_KEY`; tùy chọn `BLAZE_API_KEY` cho micro/đọc từng lượt. Backend giữ toàn bộ secret. Ký tự đặc biệt trong mật khẩu URL phải percent-encode. `.env` không được commit. `LLM_PROVIDER=mock` bị từ chối khi khởi động runtime; tests inject doubles trực tiếp.

Mặc định `GEMINI_CHAT_MODEL=gemini-3.5-flash-lite`, `GEMINI_LIVE_MODEL=gemini-3.8-live`, `GEMINI_VOICE=Kore`, `GEMINI_MAX_OUTPUT_TOKENS=2048`. Khóa cần quyền truy cập model và quota khả dụng; có khóa không đồng nghĩa provider luôn sẵn sàng. Flash-Lite đã trả stream khi kiểm tra, trong khi lần gọi Gemini 3.8 Flash trả 503. Thay model bằng biến môi trường khi cần; không đặt khóa trong biến `VITE_*`. Sau khi đổi `.env`, khởi động lại backend. Các biến `OPENAI_*` chỉ phục vụ adapter cũ khi chủ động chọn `LLM_PROVIDER=openai`; không cần cho Gemini.

Database mới: chạy [SQL](gemini-code-1791478978574.sql) trên database **chưa có bảng ứng dụng**. File hiện tạo 9 bảng/4 trigger, chỉ seed mã CEFR tương thích và version; không seed tài khoản. Database EngMateAI v1 hiện có được dùng tiếp bằng các bảng tương thích; **không chạy lại bootstrap hoặc DROP bảng cũ**. [Chi tiết MySQL](database/mysql/README.md).

Mở hai terminal tại root:

```powershell
python scripts/manage.py dev-backend
```

```powershell
python scripts/manage.py dev-frontend
```

Web: http://127.0.0.1:5174 · Swagger: http://127.0.0.1:8010/docs · health: `/api/health` · readiness: `/api/ready` · khả năng dịch vụ: `/api/capabilities`.

Đăng ký tài khoản thật → đăng nhập → Hội thoại mới → gửi tin → mở lại lịch sử. Reload trang bắt đầu lại ở đăng nhập; token chỉ giữ trong bộ nhớ, lịch sử vẫn lưu trong database. Kết thúc hội thoại khóa gửi thêm nhưng vẫn đọc lại được. Lịch sử mới nhất trước, có tải thêm; tin nhắn tải đủ các trang theo thứ tự thời gian.

Chat hiển thị phản hồi từng phần, có nút Dừng phản hồi; retry vẫn dùng cùng UUID. Micro từng lượt vẫn chép lời vào bản nháp qua Blaze. Nghe/chọn giọng Blaze độc lập với Voice Realtime.

Chọn **Bắt đầu thoại trực tiếp**, cấp quyền micro, nói rồi ngừng khoảng 900 ms để AI phản hồi. Có thể nói chen khi AI đang nói; sự kiện ngắt lời từ Gemini xóa hàng đợi âm thanh. **Tắt microphone** là thao tác thủ công; hệ thống không tự tắt micro khi AI nói. **Kết thúc thoại** dừng tracks/audio/kết nối và đồng bộ lịch sử. Cần Web Audio/AudioWorklet và secure context (HTTPS hoặc localhost). Micro PCM16 16 kHz đi qua WebSocket backend đến Gemini; âm thanh phản hồi PCM16 24 kHz được phát theo hàng đợi có giới hạn. Không gửi text đồng thời trong cùng hội thoại đang gọi.

Voice hiện chạy **một backend worker**: tối đa 32 phiên/process, mỗi tài khoản một phiên, thời lượng mặc định 600 giây, heartbeat 12 giây/hết hạn sau 35 giây, reconnect tối đa 3 lần và không gửi lại audio cũ. `VOICE_MAX_SESSION_SECONDS`, `VOICE_VAD_SILENCE_MS`, `VOICE_VAD_THRESHOLD` cấu hình các giới hạn tương ứng. Chưa hỗ trợ registry phân tán/multi-worker. Quyền micro, echo/speaker và barge-in cần kiểm chứng trên thiết bị thật.

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

## Tài liệu

- [REST API](docs/API.md), [kiến trúc](docs/ARCHITECTURE.md), [kiểm thử](docs/TESTING.md).
- [Yêu cầu và trạng thái còn thiếu](docs/REQUIREMENTS.md), [nhật ký](docs/PROGRESS.md), [quyết định](docs/DECISIONS.md).
- Tuân thủ [AGENT.md](AGENT.md) và [CLAUDE.md](CLAUDE.md). Nhánh tiếng Việt không dấu; mô tả commit bằng tiếng Việt, giữ tiền tố Conventional Commits. Không tự commit/push khi chưa được yêu cầu.
