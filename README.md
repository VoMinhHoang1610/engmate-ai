# EngMate-AI

Ứng dụng hội thoại tiếng Việt và tiếng Anh: AI đáp theo ngôn ngữ người dùng, hỗ trợ tài khoản riêng, lịch sử, nhập chữ và thoại trực tiếp. Frontend React/TypeScript/Vite; backend FastAPI; lưu tài khoản và lịch sử bằng REST API trên MySQL. Adapter SQL Server v1 được giữ để tương thích dữ liệu cũ.

Giao diện giữ logo, màu xanh, linh vật Mate và trang đăng nhập/đăng ký gốc. Lịch sử và nút hội thoại mới nằm ở thanh bên trái; vùng tin nhắn chiếm phần còn lại. Ô nhập và các icon nằm trên một hàng; icon tai nghe mở tùy chọn giọng/âm thanh. Nút mặt trăng/mặt trời cạnh tài khoản chuyển sáng/tối và nhớ lựa chọn trên trình duyệt. Các trang học tập phụ không được khôi phục.

Sau khi đăng nhập, app luôn mở khung chào mừng trống. Chỉ mở tin nhắn cũ khi chọn lịch sử; nút **Hội thoại mới** trở về khung chào và không tạo bản ghi trống. Hội thoại được tạo khi gửi tin đầu tiên hoặc bắt đầu thoại. Các icon tùy chọn âm thanh, thoại trực tiếp, ghi âm và gửi nằm chung trong khung nhập; rê chuột hoặc dùng trình đọc màn hình để biết chức năng.

URL đồng bộ theo phiên: `#hoi-thoai` khi đã đăng nhập, `#dang-nhap` khi chưa đăng nhập/đã đăng xuất hoặc hết phiên. Cập nhật URL không tải lại trang; sửa hash không cấp quyền truy cập. Reload vẫn yêu cầu đăng nhập lại theo cơ chế token trong bộ nhớ hiện có.

Khung chat nằm trong chiều cao màn hình; tin nhắn và lịch sử cuộn riêng, ô nhập giữ ở cuối khung. Trên màn hình hẹp, mở lịch sử bằng nút menu ở thanh trên.

Chọn **Giọng đối thoại** trong icon tai nghe ở khung nhập để đổi giọng Gemini trước hoặc trong cuộc gọi. Khi đang thoại, app hiển thị “Đang đổi giọng…” và tự nối lại trong cùng hội thoại sau khi đóng kết nối cũ; giữ lịch sử đã lưu và trạng thái tắt micro. Âm thanh đang phát sẽ dừng khi đổi. Có thể bấm kết thúc trong lúc đổi để hủy nối lại; lỗi đóng phiên được báo rõ, không mở chồng cuộc gọi. Icon sóng âm bắt đầu/kết thúc thoại, icon micro ghi âm thành bản nháp. Live tự nhận tiếng Việt/Anh, dùng chung quy tắc ngôn ngữ với chat. Yêu cầu dịch, trả lời song ngữ hoặc luyện tiếng Anh được ưu tiên nếu bạn nói rõ. Prompt mới áp dụng cho cả hội thoại cũ khi gửi lượt mới.

Menu tai nghe chứa lựa chọn giọng Blaze cho **Nghe câu trả lời** và ngôn ngữ **Ghi âm** từng lượt (mặc định tiếng Việt). Giọng đọc nhận diện dấu tiếng Việt trong văn bản để chọn giọng Việt/Anh tương ứng; văn bản không dấu hoặc pha trộn có thể nhận diện chưa chính xác. Ghi âm từng lượt dùng ngôn ngữ đã chọn; thoại Live tự nhận ngôn ngữ.

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

Đăng ký tài khoản thật → đăng nhập → gửi tin ngay từ khung chào → mở lại lịch sử khi cần. Reload trang bắt đầu lại ở đăng nhập; token chỉ giữ trong bộ nhớ, lịch sử vẫn lưu trong database. Kết thúc hội thoại khóa gửi thêm nhưng vẫn đọc lại được. Lịch sử mới nhất trước, có tải thêm; tin nhắn tải đủ các trang theo thứ tự thời gian.

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
