# Đề xuất duyệt: năm mục học tập, ưu tiên Từ vựng

**15/11/2026 · D1–D10 đã được duyệt có điều kiện · Chưa triển khai tính năng.**
Phụ lục [kiểm toán, hợp đồng và bằng chứng kiểm thử](LEARNING_VOCABULARY_DESIGN_2026-11-15.md).

## Điều kiện duyệt mới nhất

- D2: mặc định TTS tiếng Anh là `UK-Nu-1-TM` ở preferences, audio và backend;
  IPA cũ có `/ɡəʊ/`, `/tɜːn/`, `/ˈʃedjuːl/`, phù hợp giữ Anh–Anh. Settings có
  thể đổi giọng; chưa kiểm giọng của tài khoản thật hoặc nghe provider thật.
- D5–6: mọi quota và cỡ lô cấu hình bằng biến môi trường, ghi `.env.example`,
  không sửa `.env`. Mặc định lô bảo thủ 6; đo token cả JSON/IPA/tiếng Việt trước
  tối ưu, không dùng ước lượng ký tự thay cho token thật, không vượt 2.048 token.
  Sinh AI chưa thuộc lát cắt; chưa có phép đo token vocabulary thực tế.
- D7: thiếu bảng vocabulary vẫn đọc chủ đề JSON; tính năng cần DB báo
  **“chưa cài đặt”**, không làm hỏng các màn khác.
- D9: ẩn nút nghe khi `capabilities.speech` tắt (hoặc chưa biết), không gọi TTS.
- D10: được sửa riêng chữ topbar thành “Mức tự chọn: {level}”, kèm test;
  giữ logic chọn/lưu/trình độ hiện có.
- Trước code: duyệt từng lệnh worktree, chạy một baseline frontend sạch khi
  không có tác vụ khác tranh tài nguyên; nếu App lỗi thì điều tra nguyên nhân
  gốc, không tăng timeout hoặc sửa assertion. MySQL test tạm cần duyệt lệnh riêng.

[Trạng thái repo, cách tách worktree và lệnh MySQL xin duyệt](VOCABULARY_PREFLIGHT_2026-11-15.md).
Sau các cổng này chỉ làm 2×50 từ + UI/API rồi dừng trình ảnh/phiếu rà; chưa mở
16 chủ đề còn lại hoặc sinh AI, không gọi API trả phí, không tự commit/push.

## A. Giá trị và phạm vi

| Ưu tiên | Hiện trạng xác minh | Cải tiến đề xuất |
| --- | --- | --- |
| 1 — Từ vựng | 4×3 cụm localStorage, dropdown, chưa API | Lưới chủ đề, đủ từ từng chủ đề, học/ôn và chủ đề AI riêng; rủi ro chính là chất lượng nội dung và chi phí |
| 2 — Phát âm | 4 câu, TTS/STT thật, không điểm | Nội dung theo âm/chủ đề, liên kết từ vựng, tô khác biệt STT; giữ pipeline |
| 3 — Bài học | 100 bài server, đã tìm/lọc/trạng thái/ôn | Thêm lọc kỹ năng theo metadata thật, tiếp tục bài từ server, liên kết từ; gọn bộ lọc mobile |
| 4 — Lộ trình | Server plan/progress, đã có gợi ý/409/lỗi | Rõ vị trí hiện tại/mục tiêu, xem toàn bộ bài ôn, trạng thái rỗng |
| 5 — Tiến độ | Evidence TOEIC server, đã tách local | Thêm khối từ/ngày tự đánh giá riêng, nhãn nguồn/kết quả gần nhất và đường dẫn ôn |

Luồng liên kết: **Lộ trình → Bài học ↔ Từ vựng ↔ Phát âm**;
**Tiến độ → bài cần ôn / từ chưa nhớ**. Mapping mới không sửa catalog TOEIC.
“Thực hành với Mate” chuẩn bị nháp tối đa 5 từ đã xác thực; người học gửi bằng
chat hiện có, không tự gọi AI hoặc thay persona/logic hoàn thành.
`LearningViews.tsx` là preview có số mẫu; không dùng làm màn học thật.

## B. Từ vựng

**Màn mặc định:** tìm chủ đề + lọc CEFR → lưới thẻ tên VI/EN, icon, số từ,
“đã nhớ x/y” → khu “Chủ đề của bạn” → ô “Chủ đề bạn muốn học” và chip gợi ý.

**Trang chủ đề:** Back giữ focus/bộ lọc → toàn bộ 50 từ trong `.vocabulary-grid`
và `.word-card` → tìm từ/lọc mức/đã nhớ → nghe từng từ, thẻ lật và quiz xác định
không LLM → thực hành Mate/phát âm/bài liên quan. AI sinh xong dùng đúng view này.
Giữ màu amber/token hiện có, CSS mới scope `.workspace-shell`, responsive,
bàn phím/aria/focus/reduced-motion; không thêm dependency.

**Trạng thái:** tải/mạng chậm, lỗi từng nguồn + thử lại, thật sự rỗng/không khớp
bộ lọc, đang sinh x/y, cần thu hẹp chủ đề, từ chối an toàn, quota/timeout, lưu lỗi
hoặc xung đột. Chưa tải trạng thái không hiển thị “đã nhớ 0”. Không publish lô dở.

**Nội dung:** đề xuất 18×50 mục tự biên soạn trong `vocabulary.v1.json`;
“thường gặp” dựa trên tình huống sinh hoạt/công việc, không tuyên bố xếp hạng tần
suất thống kê. Mỗi từ có ID, term, từ loại, IPA, nghĩa VI, ví dụ EN/dịch VI, CEFR
gợi ý. Loader Pydantic + luật trùng/độ dài/ví dụ/IPA/tiếng Việt/nội dung; CSV rà
ngẫu nhiên ≥10% mỗi chủ đề cộng mọi mục có cờ. Nhãn AI soạn/chưa thẩm định.

**Kiến trúc:** `src/vocabulary/` riêng; backend router → service → DB,
schema/JSON/prompt `vocab.v1.txt`. Bốn bảng mới: topics, word_states, requests,
usage; mọi dữ liệu riêng theo owner từ session. API `/api/vocabulary` phục vụ
catalog/chi tiết, state idempotent, chủ đề riêng, create/append/delete, GET job
và import legacy. Installer cộng thêm, không bootstrap lại hoặc sửa bảng cũ.

**AI:** 30 từ mặc định, tối đa 60; đề xuất 6 từ/lô giữ mặc định adapter 2.048 token.
UUID + hash payload reserve trong transaction ngắn → gọi LLM ngoài DB lock →
validate → publish atomic. Cùng UUID replay cả lỗi, không gọi lại; khác payload
409. Một retry/lô dùng chung cho validation hoặc 502; 429 dừng. Có expiry/orphan
recovery không tái sinh, chặn kết quả muộn. Đầu vào ≤80 ký tự, VI/EN, không control;
topic là dữ liệu JSON, không system instruction; CEFR lấy hồ sơ server.

**Chi phí:** đề xuất 3 job/người/ngày và 30 provider attempts/ngày, kể cả retry;
30 từ tối đa 10 request, 60 từ tối đa 20. Reserve worst-case, không chia sẻ cache
AI giữa người dùng. TTS chỉ click/cache. Chưa duyệt hoặc chạy eval thật.

**Migration:** đề xuất import có xác nhận đúng 12 khóa cũ; server state đã có
thắng, có receipt chống nhập lại, không xóa localStorage. Giữ 4 bộ cũ trong vùng
“Ôn giao tiếp cũ”, không trộn vào 18 chủ đề đầy đủ hay evidence TOEIC.

**Kiểm thử:** fake LLM cho schema/cắt/trùng/injection/refusal/timeout/quota/UUID;
MySQL biệt lập cho quyền/locking/atomic/installer; frontend cho lưới đủ từ,
tìm/lọc/state/AI/quiz/TTS/bàn phím. Giữ coverage ≥80%, hồi quy chat/voice/TOEIC.
Eval live 20 chủ đề và CSV cần duyệt trần riêng trước khi chạy.

## C. D1–D10 đã duyệt, áp dụng cùng điều kiện phía trên

| Mã | Đề xuất để bạn xác nhận hoặc sửa |
| --- | --- |
| D1 | 18 chủ đề trong phụ lục, mỗi chủ đề 50 từ; làm trước Đồ ăn & thức uống + Văn phòng & công việc |
| D2 | IPA Anh–Anh |
| D3 | Chủ đề riêng lưu server, không chia sẻ cache giữa người dùng |
| D4 | Import 12 dấu nhớ có xác nhận; giữ 4 bộ cũ ở khu riêng |
| D5 | 3 job +30 provider attempts/ngày/người; đồng thời 2 toàn process/1 người, 2 start/phút/người |
| D6 | 6 từ/lô, chưa mở adapter; mặc định 30, tổng tối đa 60 |
| D7 | Phần mới chỉ hỗ trợ/kiểm chứng MySQL |
| D8 | Chưa ôn giãn cách; có thẻ lật/quiz/tự đánh dấu |
| D9 | Có TTS từng từ khi bấm, theo cache/giọng hiện tại; kiểm thật xin ngân sách riêng |
| D10 | Phát âm → Bài học → Lộ trình → Tiến độ, từng mục dừng chờ duyệt |

**Sau duyệt:** chỉ triển khai lát cắt **2×50 từ + giao diện/API hoàn chỉnh**,
trình ảnh và phiếu rà trước khi biên soạn hàng loạt. Sinh AI là cổng kỹ thuật
tiếp theo. Không tự commit/push, chạy installer, tạo DB hoặc gọi dịch vụ trả phí.
