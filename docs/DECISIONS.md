# Quyết định kỹ thuật

## 2026-10-04 — Dựng lại khung

- Giữ tên EngMate-AI và chọn React/TypeScript + FastAPI/Python theo yêu cầu reset.
- Dùng TypeScript strict, Pydantic, mypy và schema validation để phát hiện lỗi ở ranh giới dữ liệu.
- Tách route/service/provider, dùng mock mặc định. Chưa chọn provider thật hoặc ngân sách; không cần API key để phát triển khung.
- Task runner Python dùng argument list cho subprocess, xử lý đường dẫn Unicode đúng trên Windows; GNU Make chỉ còn là wrapper tùy chọn.
- Cổng local 8010/5174 tránh dịch vụ khác đang dùng 8000/8001/5173 trên máy hiện tại.
- Lockfile backend/npm được giữ đồng bộ với manifest. Vitest/coverage dùng 4.1.11; nguồn phiên bản vá: [advisory của Vitest](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).
- DB/auth/chat streaming được làm theo backlog khi bắt đầu nghiệp vụ; scaffold không tạo database hoặc giả lập đăng nhập.
- Bản nguồn cũ được sao lưu trong `.artifacts/before-reset-*`; Git history và môi trường cài dependency hiện có tiếp tục dùng cho checkout này.
