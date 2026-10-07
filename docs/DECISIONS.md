# Quyết định kỹ thuật

## 2026-10-07 — Hoàn thiện backend/API trên schema SQL Server

- Dùng SQLAlchemy Core + pyodbc reflect whitelist bảng/view. Script T-SQL đã thiết kế là nguồn schema duy nhất; không sinh DDL ORM trùng lặp. Migration runner được gọi chủ động, không tự tạo DB khi server khởi động.
- Giao dịch ngắn, khóa user và request UUID phối hợp retry; rowversion phát hiện sửa dữ liệu cũ. Mỗi request auth đối chiếu DB session để revoke có hiệu lực ngay. Argon2 cho mật khẩu, JWT access có issuer/audience/purpose; refresh/reset chỉ lưu hash.
- SQL đồng bộ chạy worker thread cho luồng chat/practice async; LLM ngoài transaction, timeout và trạng thái lỗi/hủy lưu lại. Mock có nhãn và không tạo điểm AI nói/viết. Listening chấm SQL, trả answer key sau nộp; transcript vẫn phục vụ browser TTS demo.
- Pillow xác thực/re-encode avatar; WAV đo duration từ frames; ffprobe kiểm tra WebM/Ogg. Media private, tải qua owner + Bearer. Image Docker có ODBC 18/ffmpeg; Windows local dùng driver hiện có, cần ffprobe riêng cho WebM/Ogg.
- Reset mật khẩu qua SMTP STARTTLS tùy chọn. Thiếu cấu hình trả 503 đồng nhất; lỗi gửi khi đã cấu hình trả 202 đồng nhất và log chung không tiết lộ recipient/token. Không gửi email hoặc paid API trong tests.
- Giới hạn body/auth work và semaphore hash mật khẩu chống chiếm hết tài nguyên trong một process. Rate limiter theo peer IP/process; deployment qua proxy/nhiều worker cần cấu hình riêng.
- Test schema/API trong tempdb với guard + outer rollback; CI có SQL Server service disposable. CI mới chưa push/chạy GitHub; kiểm chứng local không thay thế kết quả workflow.
- Giao diện đa trang giữ ở nhánh riêng; không tự merge hoặc sửa localStorage trong tác vụ backend. OAuth, email verification, STT, streaming, real LLM và account deletion còn trong backlog.

## 2026-10-07 — Thiết kế SQL Server theo chương trình hiện có

- Chọn SQL Server theo yêu cầu người dùng, thay phương án PostgreSQL ở backlog; chưa đổi runtime backend hoặc cài dependency database. Script mục tiêu SQL Server 2019+, kiểm chứng trên SQL Server 2022 Developer.
- Thiết kế 22 bảng/2 view trong schema `em`, bao phủ toàn bộ UI học tập và tài khoản. Không thêm bảng linh thú, admin, thanh toán hay memory vector vì chưa có nghiệp vụ tương ứng.
- Tách catalog có revision khỏi lịch sử từng người; notebook lưu nghĩa/ví dụ riêng thay vì từ điển chung. Từ archive giữ lịch sử ôn, filtered unique index cho phép thêm lại.
- StudySessions/FlashcardReviews là dữ liệu gốc của thống kê; view tổng hợp riêng trước join để tránh nhân số liệu. Ghi ngày địa phương/offset của sự kiện, UTC timestamps, rowversion cho optimistic concurrency. Chọn ngày hoàn thành khi phiên qua nửa đêm; chưa chia nhỏ thời lượng theo ngày.
- Khóa ghép enforce owner và loại phiên/bài/câu hỏi; request UUID chống replay trùng. AI/provider chạy ngoài transaction, kết quả mock có nhãn riêng. Chính sách cập nhật lịch ôn/đóng phiên nằm trong transaction service sẽ triển khai tiếp.
- Script tạo schema atomic và từ chối schema đã có, không dùng DROP/TRUNCATE/cascade. Seed catalog chạy lại được và không tạo tài khoản/mật khẩu. Kiểm thử trong tempdb với outer transaction, guards và rollback; 45/45 kiểm tra qua, xác nhận không còn schema thử.
- Giới hạn: localStorage không có lịch sử từng lượt nên không thể dựng lại counter cũ chính xác; cần baseline migration riêng nếu muốn giữ tổng cũ. Auth/ORM/concurrency và SQL Server 2019 riêng chưa kiểm thử.

## 2026-10-07 — Sửa cache CI và health check Docker

- Bỏ `cache: pip` và `cache-dependency-path` khỏi `setup-python` theo yêu cầu sửa CI. Task runner đặt `PIP_CACHE_DIR` thành `.cache/pip` chỉ trong tiến trình con, trong khi action dùng đường dẫn mặc định của runner; không còn bước lưu cache pip vào thư mục mặc định có thể chưa được tạo.
- Đây là vấn đề đường dẫn cache trong cấu hình hiện tại, không phải pip-tools không tương thích với cache. `setup-python` hỗ trợ requirements qua `cache-dependency-path`: [tài liệu chính thức](https://github.com/actions/setup-python/blob/main/docs/advanced-usage.md#caching-packages). Nếu thêm cache lại, cần thống nhất đường dẫn giữa action và task runner.
- Dùng curl trong image backend theo yêu cầu; cài với `--no-install-recommends` và dọn apt lists. Health check thất bại khi HTTP lỗi hoặc request quá 2 giây, với start period 15 giây và timeout Docker 3 giây.
- Thêm start period 30 giây cho frontend Compose. Docker vẫn chạy probe trong giai đoạn này; các lần thất bại chưa được tính vào số retries cho đến khi hết giai đoạn khởi động hoặc có probe thành công.
- Giữ Docker frontend ở chế độ dev. Mẫu production trong tài liệu tham chiếu là tùy chọn và stage cuối chưa có package/script để chạy lệnh dev; triển khai production cần server static và proxy API riêng khi có yêu cầu.

## 2026-10-04 — Dựng lại khung

- Giữ tên EngMate-AI và chọn React/TypeScript + FastAPI/Python theo yêu cầu reset.
- Dùng TypeScript strict, Pydantic, mypy và schema validation để phát hiện lỗi ở ranh giới dữ liệu.
- Tách route/service/provider, dùng mock mặc định. Chưa chọn provider thật hoặc ngân sách; không cần API key để phát triển khung.
- Task runner Python dùng argument list cho subprocess, xử lý đường dẫn Unicode đúng trên Windows; GNU Make chỉ còn là wrapper tùy chọn.
- Cổng local 8010/5174 tránh dịch vụ khác đang dùng 8000/8001/5173 trên máy hiện tại.
- Lockfile backend/npm được giữ đồng bộ với manifest. Vitest/coverage dùng 4.1.11; nguồn phiên bản vá: [advisory của Vitest](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).
- DB/auth/chat streaming được làm theo backlog khi bắt đầu nghiệp vụ; scaffold không tạo database hoặc giả lập đăng nhập.
- Bản nguồn cũ được sao lưu trong `.artifacts/before-reset-*`; Git history và môi trường cài dependency hiện có tiếp tục dùng cho checkout này.
