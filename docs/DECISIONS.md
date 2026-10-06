# Quyết định kỹ thuật

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
