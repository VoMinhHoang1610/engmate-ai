# EngMate-AI — Quy tắc làm việc

Khung được dựng lại theo yêu cầu người dùng ngày 2026-10-04.

Đọc cùng `AGENT.md`; quy ước riêng của dự án trong file này được ưu tiên khi có mâu thuẫn.

- Frontend: React + TypeScript strict + Vite + Tailwind. Backend: Python 3.11+ + FastAPI + Pydantic v2.
- Trao đổi và tài liệu bằng tiếng Việt; code, tên biến, commit bằng tiếng Anh.
- Router gọi service; mọi lời gọi AI đi qua interface trong `backend/app/llm/`. Theo yêu cầu mới ngày 2026-10-16, mặc định dùng Gemini GenerateContent SSE cho Chat và Gemini Live qua relay WebSocket cho thoại; Blaze giữ STT/TTS từng lượt. OpenAI chỉ là adapter tùy chọn cho cấu hình cũ, không fallback tự động. Runtime từ chối mock; doubles chỉ ở `backend/tests/fakes.py` và test frontend. Test tự động không gọi API tính phí.
- Prompt là file có phiên bản trong `backend/app/prompts/`. Mock chỉ để kiểm tra kỹ thuật, chưa chứng minh chất lượng học tiếng Anh.
- Thêm test cùng tính năng: pytest unit/integration, Vitest + React Testing Library; E2E khi có luồng nghiệp vụ.
- Chạy `python scripts/manage.py lint`, `test`, `coverage`, `build` trước khi bàn giao. Không báo qua nếu chưa chạy thật.
- Cập nhật `docs/PROGRESS.md` bằng mục mới ở đầu file; giữ lịch sử. Cập nhật yêu cầu, API, kiến trúc và changelog khi thay đổi tương ứng.
- Không hard-code secret hoặc commit `.env`. Commit theo Conventional Commits; không tự push.
- Phạm vi gồm tài khoản, lịch sử, Chat streaming và Voice Realtime có ngắt lời; giữ nguyên nhận diện giao diện gốc. Phiên thoại/registry hủy hiện dùng một backend worker; không bật nhiều worker trước khi có coordination dùng chung. Xem trạng thái kiểm chứng thật tại `docs/REQUIREMENTS.md`.
- Hướng dẫn chạy nằm trong README. Windows dùng `make.cmd` hoặc Python task runner; GNU Make là tùy chọn.
