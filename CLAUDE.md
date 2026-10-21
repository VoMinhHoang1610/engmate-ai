# EngMate-AI — Quy tắc làm việc

Khung được dựng lại theo yêu cầu người dùng ngày 2026-10-04.

Đọc cùng `AGENT.md`; quy ước riêng của dự án trong file này được ưu tiên khi có mâu thuẫn.

- Frontend: React + TypeScript strict + Vite + Tailwind. Backend: Python 3.11+ + FastAPI + Pydantic v2.
- Giao diện sau đăng nhập dùng `WorkspaceSidebar.tsx` và `workspace.css` tối giản, nhấn xanh dương/tím/xanh ngọc qua `data-tone`; CSS scope `.workspace-shell` import cuối, giữ trang public riêng. Giữ chữ đủ rõ ở cả sáng/tối và trạng thái chọn có thêm vạch/độ đậm. Thanh bên desktop mở dạng overlay để không làm dịch mục tiêu click; mobile dùng drawer có focus trap/inert. Theme dùng chung trạng thái áp dụng giữa sidebar và Cài đặt.
- Trao đổi và tài liệu bằng tiếng Việt; code, tên biến, commit bằng tiếng Anh.
- Router gọi service; mọi lời gọi sinh nội dung đi qua interface trong `backend/app/llm/`. Theo yêu cầu ngày 2026-10-18, mặc định `LLM_PROVIDER=gemini` và `VOICE_PROVIDER=blaze`: Blaze STT nhận lời nói → Gemini GenerateContent SSE suy luận/sinh văn bản → Blaze TTS phát giọng. Toàn bộ giọng đọc dùng Blaze, không fallback sang giọng Gemini hoặc speechSynthesis của máy. Gemini Live/OpenAI Realtime chỉ là adapter tương thích khi chủ động đặt `VOICE_PROVIDER=native`; không fallback tự động. Runtime từ chối mock; doubles chỉ ở `backend/tests/fakes.py` và test frontend. Test tự động không gọi API tính phí.
- Prompt là file có phiên bản trong `backend/app/prompts/`. Mock chỉ để kiểm tra kỹ thuật, chưa chứng minh chất lượng học tiếng Anh.
- Lộ trình dùng catalog chuẩn `backend/app/content/toeic.v1.json`, prompt `lesson.v1.txt`, liên kết hội thoại `PromptVersion=toeic.v1` và bốn bảng `engmate_learning_*`. SQL khởi tạo mới đã có đủ 13 bảng; database cũ thiếu bảng lộ trình dùng `scripts/install_learning.py`, không bootstrap lại database người dùng. Hoàn thành bài dựa trên lượt luyện và kiểm tra server; không quy đổi thành điểm TOEIC hoặc phát âm.
- Thêm test cùng tính năng: pytest unit/integration, Vitest + React Testing Library; E2E khi có luồng nghiệp vụ.
- Chạy `python scripts/manage.py lint`, `test`, `coverage`, `build` trước khi bàn giao. Không báo qua nếu chưa chạy thật.
- Cập nhật `docs/PROGRESS.md` bằng mục mới ở đầu file; giữ lịch sử. Cập nhật yêu cầu, API, kiến trúc và changelog khi thay đổi tương ứng.
- Không hard-code secret hoặc commit `.env`. Commit theo Conventional Commits; không tự push.
- Phạm vi gồm tài khoản, lịch sử, Chat streaming và Voice Realtime có ngắt lời; giữ nguyên nhận diện giao diện gốc. Phiên thoại/registry hủy hiện dùng một backend worker; không bật nhiều worker trước khi có coordination dùng chung. Xem trạng thái kiểm chứng thật tại `docs/REQUIREMENTS.md`.
- Hướng dẫn chạy nằm trong README. Windows dùng `make.cmd` hoặc Python task runner; GNU Make là tùy chọn.
