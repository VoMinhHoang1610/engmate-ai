# Bàn giao kiểm chứng và demo Từ vựng — 16/11/2026

## Phạm vi thực tế

Mã nằm trong worktree `EngMate-AI-vocabulary-20261115`, nhánh
`feat/vocabulary-authored-topics-20261115`, đã commit feature trên nhánh ngày
17/11/2026, chưa merge/push. Docker demo đang source-mount từ worktree (xác nhận
lần cuối 16/11/2026); chưa build image. **Không báo hoàn tất prompt chính năm
mục hoặc demo dữ liệu thật chỉ từ các ảnh fixture.**

Đã có hai chủ đề đủ 50 từ, schema/loader, năm API, hai bảng additive và installer,
state theo owner/version/UUID, import 12 dấu nhớ cũ có xác nhận; UI tìm/lọc,
thẻ/quiz, TTS click-only và draft tối đa 5 từ. Giữ bốn bộ giao tiếp cũ riêng.
Nội dung vẫn `ai_authored_unreviewed`, CEFR gợi ý, tự nhớ không phải điểm TOEIC.
Đã sửa lỗi label checkbox xếp dọc bằng CSS scoped, không sửa CSS chung.

## Hồ sơ nghiệm thu

- [API](API.md), [kiến trúc](ARCHITECTURE.md), [database](DATABASE.md),
  [kiểm thử](TESTING.md), [nhật ký chi tiết](VOCABULARY_TEST_INVESTIGATION_2026-11-15.md).
- [Phiếu xem ảnh và rà nội dung](VOCABULARY_REVIEW_2026-11-16.md) có bốn ảnh
  được chọn dưới `docs/assets/vocabulary-20261116/`, có thể bàn giao cùng docs.
- [CSV 17 mục](VOCABULARY_CONTENT_REVIEW_2026-11-16.csv): 5/50 ngẫu nhiên mỗi
  chủ đề, seed `20261116:<topic_id>`, cộng 7 mục có cờ. Toàn bộ chờ người duyệt;
  ghi chú của trợ lý không phải chứng nhận chuyên môn. Dữ liệu CSV đã đối chiếu
  lại catalog, không sửa nghĩa/IPA chỉ để làm bản rà trông “đã qua”.
- Ảnh: `.artifacts/vocabulary-ui-20261116/desktop-connected-01/`,
  `demo-readiness-01/` và hồ sơ sau sửa CSS. Artifact bị gitignore không tự đi
  theo commit; giữ log/bằng chứng chi tiết cục bộ, bốn ảnh chọn lọc đã ở docs.
- Backend 282/282, coverage 93,44% từ lượt full gần nhất. Không đổi backend sau
  lượt đó. Installer đã qua M1/M2 trên DB test riêng; DB ứng dụng đã chạy
  additive, 0 dòng (xác nhận lần cuối 16/11/2026), chưa kiểm save/import bằng
  tài khoản thật.
- Sau CSS: lint/type/format qua, regression Vocabulary 11/11 qua.
  **Gate coverage toàn frontend vẫn thất bại:** lượt có kiểm soát
  `...-controlled-02` **487/490**, 3 timeout, **2 lỗi ngoài ngoại lệ**
  (Vocabulary 5.359,7 ms, VoiceFirst stage 2 5.618,26 ms; ca App server-bound
  thuộc ngoại lệ đã duyệt). Lượt đầu 466/490 có 24 timeout, 19 ngoài ngoại lệ.
  Coverage vẫn 90,08 / 82,64 / 86,20 / 93,17%. **Build sau CSS đã qua**
  (2.491 module, Vite 33,11 giây, tổng 72,15 giây). Canary profile/settings qua
  4.213 ms sau khi đóng preview/Vite; không dùng lượt cũ thay thế.

## Docker demo đã cập nhật

Người dùng duyệt cập nhật Docker để demo. Ba container
`engmate-ai-backend-1`, `engmate-ai-frontend-1`, `engmate-ai-share-1` đã recreate
và healthy; chỉ đổi bind-mount sang worktree, giữ nguyên image/dependency và
không đụng MySQL test. Override ở
`.artifacts/docker-demo-20261116/docker-compose.override.yml`.

- Dev UI: `http://127.0.0.1:5174`; share: `http://127.0.0.1:5180`; backend:
  `http://127.0.0.1:8010`.
- Xác minh: OpenAPI có 5 route vocabulary; catalog `vocabulary.v1` 2×50; frontend
  và share trả 200; asset share khớp `frontend/dist` vừa build; log ba container
  không có error/traceback. Browser 5174 tải trang đăng nhập, console error 0;
  route topics trả 401 khi chưa đăng nhập (đúng auth).
- Build host: 2.491 module, Vite 33,11 giây, tổng 72,15 giây, exit 0.
- **DB ứng dụng:** đã chạy installer additive với cấu hình hiện tại, exit 0;
  chỉ tạo `engmate_vocabulary_word_states` và `engmate_vocabulary_requests`
  (rows=0), không sửa bảng cũ. Log:
  `.artifacts/docker-demo-20261116/install-vocabulary-app-db.log`.
  **Chưa kiểm save/import bằng tài khoản thật**; cần đăng nhập để nghiệm thu
  nút lưu và bộ lọc “Đã nhớ”.
- Rollback: chạy lại compose gốc không kèm override, cùng project `engmate-ai`.

## Demo fixture không tốn provider

Preview chỉ bind loopback 127.0.0.1:5176 trong worktree. Kiểm còn đúng server
trước khi dùng; không giả định sống sau restart. Nếu cần mở lại, từ `frontend`,
sau kiểm tải máy/cổng không trùng tiến trình khác:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5176 --strictPort
```

Không dùng cổng 5174 của ứng dụng Docker. URL fixture:

- `http://127.0.0.1:5176/tests/ui-audit.html?theme=light`
- `http://127.0.0.1:5176/tests/ui-audit.html?theme=dark`
- `http://127.0.0.1:5176/tests/ui-audit.html?theme=light&width=375&height=812`
- `http://127.0.0.1:5176/tests/ui-audit.html?theme=light&width=1365&height=900`
- `http://127.0.0.1:5176/tests/ui-audit.html?theme=dark&vocabulary=missing`

Fixture chặn mọi fetch và dùng tài khoản mẫu/speech false; mọi mutation trả
fallback 503 nếu không có nhánh fixture, **không demo lưu thành công bằng fixture
này**. Không bật speech/gửi chat/provider thật chỉ để demo nghe hoặc tạo đáp án.
Không dùng tab fixture và tài khoản thật lẫn nhau. Muốn demo lưu thật cần môi
trường backend/MySQL và tài khoản test được duyệt, không đổi auth hoặc hardcode
token trong mã/tài liệu.

### Kịch bản trình diễn

1. Mở Từ vựng, nêu rõ hai chủ đề/nhãn chưa thẩm định, mỗi chủ đề 50 từ.
2. Mở Đồ ăn, tìm `qua tao` → apple, xóa lọc; thử A2/Đã nhớ.
3. Lật thẻ bằng click/Space, sang thẻ tiếp. Quiz 5 câu, chỉ điểm tự luyện.
4. Chọn tối đa 5 từ, nút thứ sáu bị khóa; Thực hành với Mate chỉ điền nháp.
   Cho xem nháp, **không bấm Gửi** khi demo offline.
5. Quay lại Văn phòng, xem đủ 50 từ, IPA/từ loại/ví dụ và dịch.
6. Đổi sáng/tối, xem mobile. Khi browser chụp ảnh, giữ Desktop/Review visible.
   Iframe fullPage chụp cả ngoài viewport; trước native input phải cuộn control
   vào vùng nhìn thực, không coi click không tác dụng là ứng dụng đã lỗi.
7. URL missing DB: catalog vẫn xem/ôn, báo chưa cài đặt và không giả dấu nhớ 0;
   nút lưu cùng filter dấu nhớ disabled. Không chạy installer để chữa demo tạm.

Đã kiểm trực tiếp iframe danh nghĩa 375/1365, số đo thực 374/1364 CSS px.
Không tuyên bố đã kiểm trên điện thoại thật. Settings bật/tắt reduce đã kiểm
Tab/Space đúng trạng thái; browser báo hệ điều hành `prefers-reduced-motion:
reduce`, nên **chưa kiểm được môi trường motion thường/no-preference**.

## Trước khi người dùng commit/main

1. Gate coverage sau CSS **đã chạy và thất bại**: 487/490, hai lỗi ngoài ngoại
   lệ. Người dùng đã chọn **dừng, bàn giao trạng thái**: không chạy thêm
   test/build, không commit/push; chỉ tiếp tục nếu có duyệt riêng.
2. Duyệt ảnh và CSV hai chủ đề. Không sửa `human_review` thành đã duyệt khi chưa
   có người rà. Chưa mở rộng hàng loạt/chủ đề AI trước cổng này.
3. Rà diff/staging có chủ đích. **Không `git add .`**: có WIP khác, file SQL và
   các helper test được duyệt cần xem riêng; không xóa/revert công việc có sẵn.
   Không stage secret/.env, AI_HANDOFF hoặc artifact eval đã loại khỏi snapshot.
4. Không phục hồi/tạo lại PROGRESS; giữ deletion chưa stage ở repo gốc theo yêu
   cầu. Không reset/checkout/discard để làm status sạch.
5. Chỉ người dùng quyết định commit/merge/main. Trợ lý không tự thực hiện.
   Docker demo đã cập nhật từ worktree và hai bảng vocabulary đã cài additive;
   commit/merge, triển khai production hoặc thay đổi DB khác vẫn cần duyệt riêng.

## Những phần của prompt chính chưa hoàn tất

| Phần | Trạng thái/cổng |
| --- | --- |
| Hai chủ đề đầu | Có mã/ảnh/phiếu rà; coverage sau CSS chưa đạt, chờ người dùng nghiệm thu |
| 16 chủ đề còn lại | Chưa biên soạn hàng loạt, cần qua cổng nội dung trước |
| Chủ đề AI riêng | Chưa implement job/quota/usage/generation; không gọi API trả phí |
| Phát âm | Chưa nâng cấp theo thiết kế, là mục tiếp theo sau nghiệm thu |
| Bài học | Chưa thêm các cải tiến thiết kế mới |
| Lộ trình | Chưa thêm các cải tiến thiết kế mới |
| Tiến độ | Có summary vocabulary tích hợp; chưa hoàn tất nâng cấp toàn mục |
| Persistence/account/provider thật | Chưa nghiệm thu browser thực; không lấy fixture thay thế |
| Motion thường/thiết bị thật | Chưa kiểm trong môi trường tương ứng |
| Docker/DB ứng dụng | Docker đã cập nhật từ worktree, healthy; hai bảng vocabulary đã cài additive, chưa kiểm save/import tài khoản thật |
| MySQL M3 | Chưa dọn, phải xác nhận mới đúng tên/label |

Ưu tiên tốc độ không thay đổi các cổng an toàn, chất lượng nội dung hoặc phạm vi
không được sửa (auth/OAuth, chat lifecycle, voice/VAD/prompts, catalog/chấm TOEIC).
