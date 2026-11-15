# Hoàn thiện năm mục học tập — thiết kế đã duyệt có điều kiện

Đọc nhanh: [bản đề xuất duyệt](LEARNING_VOCABULARY_PROPOSAL.md).
Tài liệu này là phụ lục chi tiết và bằng chứng kiểm kê/kiểm thử.

**Cổng hiện tại: tiền triển khai, D1–D10 đã duyệt có điều kiện.** Ngày 15/11/2026.
Nhánh: `docs/learning-vocabulary-design-20261115`. Chưa triển khai tính năng hay
áp dụng cấu hình. Điều kiện mới tại đầu [bản đề xuất](LEARNING_VOCABULARY_PROPOSAL.md)
ưu tiên hơn mô tả đề xuất ban đầu bên dưới. Lệnh worktree/baseline/MySQL tại
[kế hoạch tiền triển khai](VOCABULARY_PREFLIGHT_2026-11-15.md) còn chờ duyệt.
Không gọi Gemini/Blaze thật. Chỉ được làm lát cắt 2×50 sau các cổng chuẩn bị;
chưa sinh AI hoặc mở rộng hàng loạt.

## 1. Kiểm kê và ưu tiên UX

| Mục | Code và nguồn hiện tại | Vấn đề cụ thể → cải tiến | Giá trị / rủi ro |
| --- | --- | --- | --- |
| Từ vựng | `tutor/TutorWorkspace.tsx:594–720`, `curriculum.ts`; 4 chủ đề × 3 cụm; `remembered` trong `engmate-learning:<username>` | Dropdown che nội dung; thiếu từ loại/dịch ví dụ/CEFR, tìm/lọc/nghe/thẻ/trắc nghiệm; nút “Xem lại bài giảng” mở thư viện TOEIC không cùng chủ đề; “Hoàn thành buổi học” chỉ tự xác nhận → lưới chủ đề, danh sách đủ từ, hoạt động ôn và nhãn nguồn rõ | Rất cao / vừa; AI và migration: cao |
| Phát âm | Cùng 4 chủ đề, 4 câu + hướng dẫn âm; `useThuAm` → Blaze STT, `speech/audio.ts` → TTS/cache; transcript trong RAM | Chưa có cặp âm/danh mục phong phú, chưa tô khác biệt; nút nghe dùng `audioBusy` kết thúc khi `play()` bắt đầu nên trạng thái không theo hết playback → thư viện âm/chủ đề, phản hồi từ STT, callback playback sẵn có | Cao / vừa; không sửa pipeline |
| Bài học | `learning/LearningPages.tsx`, `LessonGuide.tsx`, API catalog/progress/start/phase/check | Đã tìm không dấu, lọc chặng/thời lượng/trạng thái/cần ôn, tải thêm 12 bài, lỗi riêng từng nguồn. Thiếu lọc kỹ năng và liên kết từ vựng; thẻ “Bài đang mở” chỉ trong RAM; điều kiện hoàn thành chỉ rõ ở phase cuối → bổ sung bộ lọc, tiếp tục từ evidence server, checklist từ đầu | Cao / thấp–vừa |
| Lộ trình | `learning/RoadmapPage.tsx`, server plan/progress/catalog; form version/409; gợi ý bài và 3 bài ôn | Đã tải/lỗi/thử lại, xem catalog khi plan lỗi. Chưa chỉ rõ vị trí hiện tại so với chặng đang khám phá; hơn 3 bài ôn chỉ có chữ; mục tiêu ẩn trong details; catalog rỗng thiếu CTA riêng → thẻ “Đang học”, xem mọi bài ôn, tóm tắt mục tiêu, empty state | Vừa / thấp |
| Tiến độ | `LearningPages.tsx:295–456`; chỉ evidence TOEIC server | Đã bảng kết quả/chặng/ôn trực tiếp, lỗi không giả thành 0. Thiếu khối tự ghi nhận từ vựng/ngày học tại đây; “Câu trả lời đúng” là kết quả lưu gần nhất mỗi bài, không tổng lịch sử → ghi rõ nguồn và kỳ đo, khối riêng tự đánh giá, liên kết ôn từ | Cao / thấp–vừa |

Đối chiếu bản bàn giao: `TutorWorkspace` hiện **883 dòng**, các dòng từ vựng vẫn khớp;
catalog đọc lại đúng **5 chặng / 25 cụm / 100 bài, mọi bài có 3 mục từ**.
Không thấy API/bảng từ vựng trong runtime hiện hành. Không mở rộng catalog TOEIC.
`LearningViews.tsx` chỉ nằm trong nhánh `?mode=preview` từ `main.tsx`: 100 node
mẫu, điểm phát âm/timer mẫu và `speechSynthesis`, không phải dữ liệu học thật.
Không dùng các component này làm implementation hoặc bằng chứng kết quả học.

Các khác biệt/cạm bẫy hiện tại:
- `check.skill` là mô tả kỹ năng bằng câu, không phải enum để lọc; `check.mode`
  thực tế có `grammar|listening|reading`. Lọc theo mode/Part với nhãn trung thực.
- `request_limits.py` hiện chỉ rate-limit POST auth; chưa có limiter từ vựng/ngày.
  Tái sử dụng lớp `AuthLimiter` bằng instance riêng/key owner, không đổi limiter auth.
- Gemini dùng setting mặc định 2.048 token, output ≤12.000 ký tự, chỉ `STOP` thành công;
  `LLMClient` chưa nhận tùy chọn token từng lời gọi. Timeout HTTP không thay thế
  deadline toàn job từ vựng.
- Import thực tế `LiveApp.tsx` còn có `mate-listens.css` sau `workspace.css`;
  đây là code có sẵn. CSS mới chỉ bổ sung `.workspace-shell .vocabulary-*`
  trong file riêng, kiểm tra thứ tự bundle để style mới nằm sau lớp nền liên quan.
- Sidebar runtime mặc định ghim và chỉ nút thu/mở đổi độ rộng. Mô tả hover trong
  README/ARCHITECTURE cũ là lịch sử, không phải hành vi cần khôi phục.
- Hồ sơ/Cài đặt và dải chào hiện vẫn đọc `learning.remembered/completed/days`;
  sau chuyển state từ vựng cần dùng summary mới cho số từ đã nhớ ở mọi consumer,
  giữ nhãn riêng cho buổi/ngày tự ghi nhận cũ. Không để một trang hiện 0 trong khi
  trang chủ đề đã có dữ liệu server, không cộng trùng từ legacy đã import.
- Ảnh nền mobile 390 px: bộ tìm/lọc Bài học đẩy thẻ đầu xuống dưới màn hình;
  đề xuất gom bộ lọc phụ vào disclosure có số bộ lọc đang dùng. Thẻ từ hiện khá
  cao; module mới giảm khoảng trống nội bộ bằng selector riêng để đọc 50 từ thuận tiện.
- Topbar đang ghi `A1 → A2` từ mức tự chọn, không có phép đo lên trình độ;
  đề xuất nhãn “Mức tự chọn: A1”, tránh tạo cảm giác có chứng nhận tiến bộ.
- Chưa có `docs/DATABASE.md`; tài liệu hiện có là `database/mysql/README.md`
  và `docs/DATABASE_SQLSERVER.md` lịch sử. Thêm trang tổng quan DATABASE để chỉ đúng nguồn.

### Liên kết năm mục

`Lộ trình → Bài học → từ của bài/chủ đề liên quan ↔ Từ vựng → Phát âm → quay lại chủ đề`.
`Tiến độ → bài ôn (server TOEIC) / từ chưa nhớ (tự đánh giá)`.
Mapping bài–chủ đề nằm trong dữ liệu bổ sung, chỉ dùng lesson ID/public material;
không sửa JSON TOEIC và không đưa checks/answer/feedback vào model.
Từ có nhiều nghĩa chỉ nối khi đúng nghĩa/ngữ cảnh, không ghép mù theo chuỗi.
“Thực hành với Mate” chuẩn bị bản nháp tối đa 5 từ đã chọn, có nghĩa/ngữ cảnh công khai,
người học xem rồi gửi; không tự gửi/cấp thành tích hoặc đổi prompt/chat lifecycle.
Không lấy tên chủ đề thô làm chỉ dẫn; dùng từ đã xác thực, JSON dữ liệu có giới hạn.

## 2. Màn hình Từ vựng

```text
TỪ VỰNG · data-tone=amber
  Tìm chủ đề [........................]  Mức gợi ý [Tất cả]
  Chủ đề thường gặp
  [icon · Gia đình / Family · 50 từ · Đã nhớ x/50] [...]
  Chủ đề của bạn [các thẻ cùng kiểu, nguồn AI, trạng thái job]
  Chủ đề bạn muốn học [........................] [Tạo 30 từ]
  Gợi ý: [Phỏng vấn việc làm] [Đặt phòng khách sạn] [Email công việc]
       ↓ chọn thẻ / sinh thành công
  [← Các chủ đề]  Tên Việt / English · 50 từ · Đã nhớ x/50
  Tìm từ [...] [CEFR] [Tất cả / Chưa nhớ / Đã nhớ]
  [Danh sách] [Thẻ ghi nhớ] [Trắc nghiệm nhanh]
  .vocabulary-grid → .word-card (toàn bộ từ, không lấy 3 từ mẫu)
  term · từ loại · CEFR / IPA / nghĩa / ví dụ EN / dịch VI
  [Nghe/Dừng] [Đánh dấu đã nhớ] [Chọn để luyện cùng Mate]
  [Thực hành với Mate] [Luyện phát âm] [Bài học liên quan]
```

- Lưới tự co 1/2/3 cột theo vùng nội dung, tận dụng token/thẻ hiện có; không đổi font,
  palette, sidebar hay stylesheet cũ. Trang chủ không dropdown chọn chủ đề.
- Mặc định vào chủ đề thấy **tất cả** từ; không áp ngầm CEFR từ hồ sơ. Bộ lọc có số
  kết quả và “Xóa bộ lọc”; tìm tiếng Việt không dấu, tiếng Anh không phân biệt hoa.
- Back nội bộ giữ tìm/lọc/vị trí cuộn và trả focus về thẻ; heading nhận focus khi
  vào chi tiết. Không thay hash/session routing trong giai đoạn này.
- Thẻ lật là button có tên/trạng thái, Enter/Space, nút trước/sau; không lệ thuộc
  vuốt/hover hoặc animation 3D. Trắc nghiệm 5 câu xác định từ dữ liệu, seed cố định
  theo phiên ôn, 4 nghĩa khác nhau; bỏ câu mơ hồ/không đủ distractor, không bịa đáp án.
  Đúng quiz không tự đánh dấu đã nhớ; kết quả chỉ là tự luyện, không điểm TOEIC.
- TTS chỉ khi bấm, một clip/lần, phân biệt đang tải/đang phát, dừng/hủy khi đổi trang,
  đổi tài khoản hoặc từ; dùng `docVanBan(..., onFinished)`/cache hiện có, không preload.
  Nút nghe chỉ xuất hiện khi `capabilities.speech === true`; trạng thái false/chưa
  tải không được gọi TTS. Test cả hai nhánh bằng fake, không gọi provider.
  Giọng đọc theo lựa chọn hiện hành, không hứa accent TTS khớp IPA Anh–Anh nếu chọn giọng khác.
- `lang=en` cho term/ví dụ, icon trang trí `aria-hidden`, nút nghe có tên chứa từ,
  `aria-pressed` cho đã nhớ; một live-region thông báo kết quả/lô thay vì mỗi thẻ tự đọc.
  Focus-visible, vùng bấm tối thiểu 44 CSS px, chữ thường ≥4,5:1, UI ≥3:1 hai theme;
  tắt chuyển động theo cả preference ứng dụng và `prefers-reduced-motion`.

| Trạng thái | Phản hồi / phục hồi |
| --- | --- |
| Đang tải catalog/trạng thái | Skeleton cùng kích thước, `aria-busy`, status; trạng thái cá nhân lỗi không hiện x=0 |
| Mạng chậm >8 giây | Thông báo vẫn đang tải; không tự POST lại, không tăng timeout API chung |
| Lỗi một nguồn | Lỗi tại khu vực + Thử lại; catalog vẫn đọc được nếu trạng thái cá nhân lỗi, khóa ghi khi chưa biết version |
| Catalog/chủ đề thật sự rỗng | Nhãn rỗng + quay về/chọn chủ đề khác; không giả dữ liệu |
| Chưa cài bảng vocabulary | Chủ đề JSON vẫn hiển thị đầy đủ; state/import cần DB báo “chưa cài đặt”, không hiện đã nhớ 0 hoặc ghi local thay server |
| Lọc không có kết quả | Nêu bộ lọc hiện tại + Xóa bộ lọc |
| Chưa có chủ đề riêng | Gợi ý nhập chủ đề; không seed chủ đề giả |
| Đang sinh | “Đã tạo x/y từ”, chỉ đếm lô đã xác thực; có thể rời trang, quay lại đọc job server |
| Sinh lỗi / quota / hết hạn | Giữ ô nhập, mã lỗi an toàn, hướng dẫn; GET kiểm trạng thái nếu mạng mơ hồ; chỉ nút Tạo lại tạo UUID mới |
| Ghi đã nhớ lỗi / 409 | Giữ trạng thái server trước đó, retry cùng UUID/payload; 409 tải lại và báo lựa chọn mới nhất |
| Chủ đề bị xóa / mất phiên | 404 quay về danh sách, 401 dùng cơ chế phiên hiện tại, hủy request/kết quả cũ |

## 3. Nội dung và chất lượng

Đề xuất **18 chủ đề × 50 từ/cụm = 900 mục**, đủ 50 mục hợp lệ sau mỗi đợt rà;
mức chủ đạo A1–B1, bổ sung B2 phù hợp công việc. “Thường gặp” là lựa chọn sản phẩm
dựa vào tình huống đời sống/công việc lặp lại và khả năng dùng lại trong nhiều bài;
**không phải bảng xếp hạng tần suất đã đo** hay danh sách chính thức Oxford/ETS.

1. Gia đình & quan hệ / Family and relationships
2. Đồ ăn & thức uống / Food and drink
3. Thói quen hằng ngày / Daily routines
4. Mua sắm / Shopping
5. Du lịch & di chuyển / Travel and transport
6. Văn phòng & công việc / Office and work
7. Họp & email / Meetings and email
8. Sức khỏe / Health
9. Thời tiết / Weather
10. Nhà cửa / Home
11. Giáo dục / Education
12. Công nghệ / Technology
13. Tiền bạc & ngân hàng / Money and banking
14. Cảm xúc / Feelings
15. Sở thích / Hobbies
16. Địa điểm & chỉ đường / Places and directions
17. Thời gian & lịch hẹn / Time and appointments
18. Dịch vụ & khách sạn / Services and hotels

Lát cắt đầu: **Đồ ăn & thức uống + Văn phòng & công việc, đủ 50 từ/chủ đề**,
để đánh giá cả giao tiếp lẫn TOEIC. Tự biên soạn tại thời điểm phát triển, máy chủ
chỉ đọc `content/vocabulary.v1.json`; không sinh runtime cho catalog. Không dùng
danh sách tần suất bên ngoài ở phiên bản này. Nhãn: **“Nội dung do AI soạn,
chưa được chuyên gia thẩm định”** cho đến khi có xác nhận ghi nhận được.

Mỗi từ: `id`, `term` (1–80), `part_of_speech` enum (kể cả phrase), `ipa` (3–120,
`/.../`, ký tự IPA hợp lệ), `meaning_vi` (2–180), `example_en` (5–220),
`example_vi` (5–260), `cefr` A1–C2. ID không phụ thuộc chữ hiển thị;
term chuẩn hóa NFC/casefold/khoảng trắng phải duy nhất trong một chủ đề.
CEFR là **gợi ý độ khó**, không chứng nhận trình độ người học.

Loader Pydantic strict/extra-forbid kiểm toàn bộ catalog trước phục vụ; public
schema whitelist riêng. Validator kiểm ID trùng, đủ trường/độ dài, control/markup,
IPA, câu có term theo ranh giới từ. Bộ tĩnh có dạng biến cách rà tay; AI ưu tiên
term nguyên dạng, chỉ nhận biến cách qua luật/allowlist hữu hạn, không tin model
tự khai báo biến cách bất kỳ. Không dùng substring để nhận `team` trong `steam`.
Heuristic tiếng Việt/IPA/lọc nội dung chỉ là sàng lọc, **không chứng minh nghĩa đúng,
an toàn ngữ nghĩa hay CEFR đúng**; từ không dấu hợp lệ cần xét cụm/ngữ cảnh.

CSV rà tay: `topic_id,word_id,content_version,term,part_of_speech,ipa,meaning_vi,
example_en,example_vi,cefr,sampling_reason,meaning_ok,ipa_ok,example_ok,
translation_ok,level_ok,safety_ok,verdict,notes`. Lấy ngẫu nhiên có seed
`ceil(10% × số từ)` **mỗi chủ đề** (5/50), cộng mọi mục có cờ; giáo viên/người dùng
duyệt, mục lỗi sửa rồi rà lại. Lưu hash/version, không PII/audio/khóa API.

## 4. Module, dữ liệu và API dự kiến

Frontend `src/vocabulary/`: `VocabularyPage`, `TopicGrid`, `TopicDetail`,
`WordCard`, `FlashcardView`, `QuickQuiz`, `GenerationForm`, API/types/hooks và
`vocabulary.css` riêng. TutorWorkspace chỉ gắn view/callback điều hướng và dữ liệu
tự ghi nhận cần đồng bộ. Không thêm dependency.

Backend mới: `api/vocabulary_routes.py` → `services/vocabulary.py` →
`db/vocabulary.py`; `schemas/vocabulary.py`, loader nội dung riêng,
`prompts/vocab.v1.txt`, `scripts/install_vocabulary.py`. Chỉ gắn router và tài
nguyên module mới vào app; không sửa service/prompt persona/lesson/voice.

| Dữ liệu | Nguồn / khóa / lưu trữ đề xuất |
| --- | --- |
| Chủ đề biên soạn | JSON versioned: ID, tên VI/EN, mô tả, icon allowlist, từ; số từ/mức tính từ nội dung |
| Chủ đề riêng | Bảng mới `engmate_vocabulary_topics`: PK `(UserId,TopicId UUID)`, nội dung JSON đã xác thực ≤128 KiB/60 từ, version, source/prompt version, CEFR snapshot, created/updated; index owner/created |
| Trạng thái từ | `engmate_vocabulary_word_states`: PK `(UserId,TopicId,WordId)`, remembered, version, updated/source; topic namespace tách authored/custom/legacy |
| Job và receipt | `engmate_vocabulary_requests`: PK `(UserId,RequestId)`, kind/hash, status, SessionId ràng buộc (không JWT), target topic/version, count/validated_count, attempts, expiry, safe error/result, staging JSON có giới hạn; index owner/status/expiry |
| Hạn mức ngày | `engmate_vocabulary_usage`: PK `(UserId,UsageDate UTC)`, jobs_reserved, calls_reserved/attempted; transaction ngắn chống race |

Không đổi bảng cũ/ActivityType hoặc tạo khóa ngoại lên bảng cũ. Ownership từ session;
mọi truy vấn/mutation có owner, ID client chỉ là selector. Installer chỉ thêm bảng
thiếu, không chạy startup; SQL bootstrap mới bổ sung cùng metadata, không chạy lại
trên DB có dữ liệu. Test parity schema + installer chạy hai lần. Không drop để rollback.

Điều kiện D7 đã duyệt: GET catalog/chi tiết authored không phụ thuộc truy vấn
bảng vocabulary. Khi thiếu bảng mới, endpoint state/import trả 503 với mã ổn
định `vocabulary_not_installed`; UI khóa ghi riêng vùng đó và báo “chưa cài đặt”.
Chỉ phân loại lỗi thiếu đúng bảng mới (MySQL 1146), không biến mọi lỗi DB hoặc
lỗi quyền thành “chưa cài đặt”. DB mất kết nối vẫn là lỗi dịch vụ riêng; auth cần
DB hiện hữu vẫn giữ nguyên. Không bootstrap startup hoặc làm các router khác lỗi.
Kiểm thử thiếu bảng: danh sách đủ 50 từ vẫn đọc được, state/import không ghi,
không giả 0, điều hướng sang màn khác hoạt động; test lỗi DB khác đi nhánh riêng.

Các đường dẫn dưới là **hợp đồng nháp, chưa có runtime**, đều có xác thực/no-store:

| Method/path dưới `/api/vocabulary` | Request → response chính |
| --- | --- |
| GET `/topics` | Catalog metadata/version/count/levels, không nội dung riêng của người khác |
| GET `/topics/{topic_id}` | Topic + toàn bộ words đã công bố; hỗ trợ authored/custom/legacy đã định danh |
| GET `/me/topics` | Chủ đề riêng và job đang làm của owner, cursor/limit ≤50 |
| GET `/me/states?topic_id=...` | Trạng thái/version từng từ; summary counts qua GET `/me/summary` |
| PUT `/topics/{topic_id}/words/{word_id}/state` | `{client_request_id,remembered,version}` → trạng thái/version; đặt giá trị, không toggle |
| POST `/generations` | `{client_request_id,topic,target_count:30|60}` → 202 job hoặc replay terminal |
| GET `/generations/{request_id}` | `{status,validated_count,target_count,topic_id?,error_code?,retry_after?}` |
| POST `/topics/{topic_id}/extensions` | `{client_request_id,additional_count,version}`; thêm 6–30, tổng ≤60, cùng lifecycle |
| DELETE `/me/topics/{topic_id}` | 204 lặp an toàn với topic đã xóa của owner; hủy job pending, xóa nội dung/state trong bảng mới; giữ tombstone receipt để không sinh lại |
| POST `/me/import-legacy` | `{client_request_id,remembered_keys}` ≤12 → imported/skipped; server map whitelist, không nhận điểm/owner |

PUT/import dùng receipt: replay trước version check để retry không thành 409 giả;
UUID khác cùng state không tạo thành tích mới. Xóa và append khóa đúng owner/topic;
finalize phải so trạng thái/version để kết quả đến muộn không hồi sinh topic đã xóa.
Chủ đề đã xóa replay job chỉ trả tombstone, không trả lại nội dung đã xóa.

## 5. Sinh AI, hạn mức và tính bền vững

Đề xuất **không mở rộng adapter ở lượt đầu**: 6 từ/lô, 5 lô cho 30 từ,
10 lô cho 60; nhiều trường tiếng Việt/IPA nên 15–20 từ/lô ở 2.048 token còn rủi ro.
Ước lượng không phải bảo đảm token: `MAX_TOKENS`/JSON cắt luôn thất bại, không
lấy phần đầu làm danh sách hoàn chỉnh. Phương án khác cần duyệt: thêm tùy chọn
token keyword-only tương thích ngược cho generate/stream của mọi adapter/fake;
vẫn phải chia lô do giới hạn 12.000 ký tự, không đổi default chat.

Điều kiện D5–6: `VOCABULARY_BATCH_SIZE=6` là mặc định bảo thủ có thể cấu hình,
chưa được gọi là tối ưu. Các quota, target count, rate/admission và deadline của
module mới phải có biến môi trường và mô tả `.env.example`; không sửa `.env`.
Khi đổi cỡ lô B, reserve worst-case là `2 × ceil(số từ cần sinh / B)`, không giữ
cứng 10/20 attempts. Mọi giá trị được validate; trần output hiệu lực không vượt
2.048 hoặc mức adapter thấp hơn. Phép đo dùng tokenizer đúng model/usage thật,
bao gồm JSON, IPA, nghĩa và ví dụ tiếng Việt; số đo ký tự/byte chỉ là ước lượng.
Chưa có tokenizer tương thích được xác nhận hoặc output vocabulary có usage,
nên chưa có token/từ thực tế; không gọi API để lấp khoảng trống này. Chuẩn bị
payload 100 từ sau lát cắt để đo offline nếu có tokenizer phù hợp; nếu thiếu,
báo blocker và xin phương án đo riêng ở cổng AI, không tự thêm dependency/API.

Luồng đề xuất một worker hiện có, job manager mới có bounded tasks:
1. Xác thực → chuẩn hóa NFC/trim, ≤80 code point; từ chối control/newline/bidi,
   input thừa, rỗng; không log nội dung. Chủ đề là dữ liệu JSON trong `message`,
   không nối vào system prompt. CEFR đọc hồ sơ server, giữ snapshot lúc reserve;
   profile lỗi thì 503, không tin level client. Pre-A1 dùng A1 kèm nhãn gợi ý.
2. Transaction ngắn tìm `(owner,UUID)` **trước hạn mức/provider**; cùng payload
   trả job/kết quả cũ kể cả lỗi; khác trả 409. Hash payload chuẩn hóa có kind,
   target count/topic/version; đổi hồ sơ sau đó không đổi snapshot của request cũ.
3. Lấy slot admission mới (đề xuất 2 toàn process, 1/người), khóa quota ngắn và
   reserve job + ngân sách lượt tối đa rồi commit; không giữ DB connection/lock
   trong khi await provider. SQL đồng bộ chạy qua worker thread như mẫu hiện có,
   không chặn event loop. Đăng ký task xong trả 202; GET chỉ đọc, không tái sinh.
4. `vocab.v1.txt` chỉ dạy từ tiếng Anh cho người Việt; mức hồ sơ ±1 bậc trong A1–C2,
   IPA Anh–Anh, ví dụ ngắn tự nhiên, không bịa từ/nghĩa, JSON discriminated union:
   `ok(words)` / `needs_clarification(suggestions)` / `refused(reason_code)`.
   Mã lý do/suggestion được whitelist/giới hạn và UI dùng lời Việt an toàn.
   Từ chối nội dung tình dục lộ liễu, hướng dẫn gây hại và thù ghét; giáo dục sức
   khỏe trung tính vẫn hợp lệ. Prompt injection luôn là dữ liệu không tin cậy.
   Chủ đề quá rộng (“mọi thứ”, “tiếng Anh”) gợi ý thu hẹp; không tự tính là thành công.
   Không chặn từ “sức khỏe” chỉ vì liên quan cơ thể. Lọc xác định trước model cho
   trường hợp rõ; ngữ nghĩa còn lại qua prompt + validation + đánh giá tay.
5. Mỗi lô mang topic và danh sách term đã nhận (tối đa 60) như dữ liệu. Pydantic và
   luật kiểm sau sinh; sai schema/trùng/ví dụ sai được sửa **tối đa một lần/lô**.
   Dùng mã lỗi validator, không đưa raw output không tin cậy vào system prompt.
   Budget retry chung: một cơ hội cho lỗi validation **hoặc** 502, không nhân hai
   tầng retry thành 4 request. 429 dừng job ngay, 503/504 không tự retry.
6. Commit staging và validated_count mỗi lô; staging không phải topic hoàn chỉnh,
   không hiện word card công bố hoặc tính đã nhớ. Đủ số lượng, kiểm toàn danh sách
   rồi publish atomically. Append lỗi giữ nguyên version/danh sách trước đó.
7. Deadline riêng: 30 giây/lần, tối đa 360 giây job 30 từ, 660 giây job 60 từ;
   không sửa timeout chung. Frontend poll GET 2→5 giây, dừng khi ẩn/rời trang,
   tải lại khi quay về. Job manager expire/cancel task và finalize failed bằng
   điều kiện pending; scan expiry định kỳ trong module mới, reconcile pending
   orphan khi startup bằng thao tác bảng mới. Restart không tự gọi lại provider.
8. Trước mỗi lô và trước publish kiểm phiên vẫn hợp lệ bằng service xác thực
   hiện có; không đổi endpoint/logout lifecycle. Thu hồi phiên dừng lô tiếp theo;
   lô đã gửi có thể đã tính phí. Shutdown dọn task/slot; late result bị bỏ.

Quota đề xuất (chỉ thêm `.env.example` sau duyệt): `VOCABULARY_DAILY_JOBS=3`,
`VOCABULARY_DAILY_PROVIDER_CALLS=30`, `VOCABULARY_MAX_JOBS=2`,
`VOCABULARY_MAX_JOBS_PER_USER=1`, `VOCABULARY_GENERATIONS_PER_MINUTE=2`.
Mỗi create/append chủ động tính một job; 30 từ tối đa 10 request, 60 từ tối đa 20.
Reserve đủ worst-case trước khi gọi, trả phần chưa dùng sau terminal;
attempt đã gửi vẫn tính dù lỗi/refusal. Qua nửa đêm vẫn thuộc ngày reserve UTC.
Orphan không rõ đã gửi giữ ngân sách bảo thủ, không hoàn để gọi lại mất kiểm soát.
UI cho biết hạn mức còn lại; cap riêng theo ngày không phải ước lượng tiền hóa đơn.
Không chia sẻ cache chủ đề AI giữa người dùng; chỉ replay cùng UUID/owner.
Trùng chủ đề khác UUID có thể đề nghị mở bản đã có trước khi tạo mới.

Lỗi an toàn: 401 phiên, 404 không tồn tại/không quyền, 409 UUID/version,
422 input/refusal, 429 rate/day/admission, 502 output/provider lỗi, 503 cấu hình/DB,
504 deadline. Job đã nhận có error_code/status_code trong response terminal;
không trả raw upstream, prompt, SQL hay token. Chỉ ghi số attempts/status/latency,
không ghi chủ đề, danh sách từ riêng, PII, API key hoặc audio vào log/test fixture.

## 6. Di chuyển dữ liệu cũ

Đề xuất giữ nguyên khóa localStorage cũ, không xóa `lessons` khỏi `curriculum.ts`
trước cổng Phát âm vì còn consumer. Thêm vùng thu gọn **“Ôn giao tiếp cũ”** chứa
4 bộ 3 cụm, tách khỏi 18 chủ đề đầy đủ; giữ nghĩa nguồn, bổ sung trường mới qua
rà nội dung nếu phục vụ cùng schema. Mapping chính xác 12 khóa cũ → ID ổn định
`legacy:*`; không tự trải một dấu nhớ lên mọi từ đồng dạng ở các chủ đề mới.

Sau đăng nhập đúng tài khoản, một lần đề nghị “Chuyển x cụm đã nhớ lên tài khoản”.
Server chỉ nhận khóa whitelist, insert trạng thái còn thiếu; **không ghi đè false
đã có trên server**. Receipt/import-version ở server chống import lại; client
chỉ đánh dấu đã nhập sau ACK. LocalStorage hỏng/bị chặn thì bỏ qua an toàn.
`completed` và `days` cũ giữ phần “Tự ghi nhận trên thiết bị này”, không import
sang evidence TOEIC, không dựng lịch sử đã học hoặc streak từ remembered hiện tại.
Đây là xác nhận chuyển dữ liệu do yêu cầu migration, không thay luồng xác thực.

## 7. Cổng triển khai, kiểm thử và rollback

1. Duyệt thiết kế + các quyết định §8 rồi mới làm **2 chủ đề đủ 50 từ + giao diện
   danh sách/trạng thái/tìm-lọc/đã nhớ/thẻ/quiz**, API nội dung và trạng thái thật.
   TTS theo lựa chọn duyệt, fake trong test. Trình ảnh và CSV ≥5 mục/chủ đề rồi dừng.
2. Duyệt hình thức/chất lượng → mở rộng 16 chủ đề còn lại; từng chủ đề phải đủ từ,
   qua loader và xuất phiếu rà. Không tuyên bố đã thẩm định khi mới qua tự động.
3. Sinh chủ đề riêng/append/xóa theo §5 → cổng kiểm kỹ thuật fake, sau đó xin riêng
   quyền eval live. Tạo form AI chỉ khi endpoint sẵn sàng, không giả thành công.
4. Sau Từ vựng: đề xuất **Phát âm → Bài học → Lộ trình → Tiến độ**; từng mục có
   thiết kế ngắn, triển khai, test, báo cáo và dừng. Chưa cho phép triển khai cả bốn.

Kiểm thử cần bổ sung theo lát cắt:
- Loader/schema: trường thiếu/thừa, ID/term trùng, IPA/VI/độ dài/control, biến cách,
  từ nguyên ranh giới, sensitive flags; đủ từ mọi chủ đề, public whitelist.
- API/DB: 401/owner 404, input owner giả, idempotency state/import/create/append,
  UUID payload conflict, concurrent cùng UUID gọi một job, quota race/nửa đêm,
  pending expiry/restart, cancellation/late result/delete-vs-finalize, schema parity.
  MySQL thật biệt lập mới chứng minh locking/persistence; SQLite/fake không thay thế.
- Fake LLM: JSON đúng/hỏng/cắt, thiếu/lặp từ, ví dụ sai, refusal/clarification,
  injection, vượt quota/admission, 429 dừng, 502 chỉ một retry, retry không nhân phí.
- Frontend: lưới → đủ 50 từ, tìm/lọc/reset, save/retry/rollback/version conflict,
  chuyển tài khoản bỏ callback/cache cũ; loading/error/empty/slow/generating/replay,
  flashcard/quiz deterministic, TTS click-only/cancel/onFinished, bàn phím/aria.
- Hồi quy: `learning.test.tsx`, App/sidebar/curriculum/speech; test server learning
  completion và prompt không checks; không đổi timeout/assertion hoặc coverage.
- Mỗi cổng chạy `python scripts/manage.py lint|test|coverage|build`; nếu coverage
  dừng ở backend, đo frontend riêng, vẫn báo overall chưa đạt. Browser fixture chặn
  mọi API thật: 1440×900, 390×844, 320×568, landscape, hai theme/reduced-motion,
  Tab/Enter/Space/Escape, focus, overflow, console. Micro/loa/đọc màn hình và
  chất lượng nghĩa/IPA cần kiểm tay; jsdom không chứng minh hình học/phát âm.

Eval sinh thật **chưa được phép**: đề xuất 20 chủ đề × 30 từ, tối đa **200 request
Gemini** kể cả retry (100 lượt chính +100 dự phòng), **0 Blaze/LLM-judge**.
Corpus cân bằng: phổ biến/hẹp/rộng/sai chính tả/VI/EN/nhạy cảm hợp lệ/từ chối/injection;
dừng toàn chiến dịch ở 429, ledger trước request, không resume job mơ hồ tự động.
Phiếu tay ≥10% từ từng chủ đề thành công + mọi cờ; mọi refusal/clarification rà tay.
Đơn giá tiền chưa xác minh; chỉ cam kết trần request/token cấu hình, cần duyệt riêng.

Rollback thiết kế: bỏ đúng các đoạn tài liệu của tác vụ, không `git restore` toàn
file đang có sửa đổi khác. Rollback tính năng tương lai bằng bản build trước của
riêng module/integration; giữ bảng mới/receipt/localStorage, không DROP/ghi đè bảng cũ.
Không tự commit/push. Nhóm commit đề xuất: `docs: propose vocabulary-first learning
design`, `feat(vocabulary): add authored topics and study views`,
`feat(vocabulary): persist learner word states`, `feat(vocabulary): generate private
topics with bounded jobs`, `test(vocabulary): verify ownership and retry limits`.

## 8. Quyết định D1–D10 — đã duyệt cùng điều kiện bổ sung

Bảng dưới lưu phương án ban đầu; điều kiện mới tại đầu bản đề xuất và kế hoạch
tiền triển khai là nguồn hiện hành. Quyền tạo worktree/MySQL chưa được cấp.

| Mã | Đề xuất | Cần duyệt |
| --- | --- | --- |
| D1 | 18 chủ đề liệt kê trên ×50; lát cắt Food and drink + Office and work | Danh sách/số từ/hai chủ đề đầu |
| D2 | IPA Anh–Anh, giữ nhất quán nội dung cũ | Anh–Anh hay Anh–Mỹ |
| D3 | Chủ đề riêng lưu server, không chia sẻ cache người dùng | Lưu trữ và cache |
| D4 | Import whitelist 12 khóa có xác nhận, server state thắng; 4 bộ cũ ở vùng riêng | Migration và số phận dữ liệu cũ |
| D5 | 3 job/người/ngày +30 provider attempts/ngày, 2 job/process, 1/người, 2 start/phút | Hạn mức và cách tính |
| D6 | 6 từ/lô, 30 mặc định, tối đa 60; chưa mở adapter | Chia lô nhỏ hay mở token option tương thích ngược |
| D7 | Triển khai/kiểm chứng mới trên MySQL; SQL Server hiện có giữ nguyên | Chỉ MySQL hay thêm hỗ trợ SQL Server mới |
| D8 | Thẻ/quiz/tự đánh dấu trước, chưa scheduler giãn cách từ vựng | Có làm spaced repetition ngay không |
| D9 | TTS từng từ chỉ khi bấm, cache hiện có; test fake | Có bật tính năng TTS có phí không; live test xin trần riêng |
| D10 | Phát âm → Bài học → Lộ trình → Tiến độ, từng cổng dừng | Thứ tự bốn mục |

**Duyệt thiết kế không đồng nghĩa duyệt gọi API trả phí, tạo DB test, chạy installer,
thêm dependency hoặc triển khai toàn bộ các cổng tiếp theo.**

## 9. Kiểm chứng nền của lượt này

| Lệnh/kiểm tra | Kết quả thực tế |
| --- | --- |
| `python scripts/manage.py lint` | Qua Ruff, Black (108 file), mypy (90 source), ESLint/TypeScript/Prettier |
| `python scripts/manage.py test` | Backend 230 qua/24 skip; frontend 465 qua/7 timeout 5.000 ms, tổng lệnh thất bại |
| `python scripts/manage.py coverage` | Backend 230 qua/24 skip, **73,93% <80%**, dừng trước frontend |
| `python scripts/manage.py build` | Qua TypeScript/Vite, 2.485 module |
| `npm.cmd run test:coverage -- --maxWorkers=1` trong frontend | Thất bại (exit 1): 7 test timeout và unhandled rejection ENOENT mất `coverage/.tmp/coverage-15.json`; chưa có coverage hợp lệ |
| Cùng lệnh, thêm `--coverage.reportsDirectory=../.artifacts/learning-vocabulary-audit-20261115/frontend-coverage-isolated` | Thất bại (exit 1), 502,90 giây: **466 qua/6 lỗi**, 38/39 file qua; không tái hiện ENOENT, không xuất tổng coverage |
| Edge headless, fixture hiện có | **30 ảnh / 5 mục**, không tràn ngang/che bởi sidebar desktop ở mẫu đo, 0 runtime exception/console warning-error |
| `git diff --check` | Qua; Git có thông báo chuẩn hóa CRLF→LF, không phải lỗi runtime |

Bảy timeout frontend: App (mở lesson/voice, close lỗi + keyboard send, điều hướng,
khôi phục Settings voice/speed), Sidebar (ghim), preview (chặng 0 và 1).
Lượt coverage một worker có bảy timeout khác: App (tạo chat/menu mobile, microphone
draft/playback, khôi phục Settings, Gemini voice transport), preview (mở bài hiện
tại/xem bài khóa), VoiceSettings (tải hai catalog), Chat.history (phân trang/lưu).
Vitest báo thư mục coverage tạm bị mất; có thể do tiến trình khác dùng chung thư
mục, nhưng chưa xác định tác nhân. Lượt dùng thư mục báo cáo riêng trong artifact
không tái hiện ENOENT nhưng vẫn thất bại. Cả sáu lỗi ở `App.test.tsx`: năm timeout
5.000 ms (giữ draft qua các tab, mở lesson/voice, tải thêm lịch sử, microphone
draft/playback, khôi phục Settings) và một lỗi không tìm thấy thông báo tải giọng
trong ca `reports voice and history failures and recovers account loading`.
Không có tổng coverage được xuất trong lượt này; **frontend chưa chứng minh đạt
80% từng chỉ số**. Dừng đo nền tại đây, không chạy lặp để tìm lượt xanh hoặc sửa
runtime/test ngoài phạm vi thiết kế. Timeout/assertion/ngưỡng đều giữ nguyên.
Lượt này có một cảnh báo React `act(...)`; backend có một cảnh báo dependency
Starlette/httpx deprecated. Không sửa test, timeout, dependency hoặc ngưỡng.
Thiếu `MYSQL_TEST_URL` được kiểm bằng boolean, không đọc/in connection secret;
chưa chứng minh DB locking/persistence, không dựng DB test hoặc chạy installer.

Browser tool desktop không kết nối. Dùng Edge cài sẵn + Node built-ins qua CDP,
script ở `.artifacts/learning-vocabulary-audit-20261115/browser.cjs`, mọi API do
fixture trả dữ liệu giả, HTTPS ngoài bị chặn; không đăng nhập tài khoản thật.
Lượt đầu không thấy welcome trong 10 giây; lượt sau cùng ngưỡng khi build đã xong
qua, chưa xác định căn nguyên. Không sửa source để vượt kiểm tra.
Ảnh tại cùng thư mục: 1440×900 và 390×844 sáng/tối, 320×568 và 844×390 tối;
`results.json` có số đo/console. Đã xem ảnh Từ vựng desktop sáng/mobile tối,
Lộ trình desktop tối và Bài học mobile sáng. Từ vựng vẫn dropdown/3 thẻ đúng code.
Đây là ảnh **hiện trạng**, chưa có giao diện thiết kế mới; font từ mạng ngoài bị
chặn nên chưa nghiệm thu typography cuối. Chưa đo toàn bộ tương phản hoặc kiểm
screen reader/micro/loa/keyboard vật lý trong browser.

File tác vụ thêm: đề xuất duyệt ngắn, thiết kế này, `docs/DATABASE.md`; thêm mục vào README,
REQUIREMENTS, API, ARCHITECTURE, TESTING, DECISIONS, CHANGELOG. Script/ảnh browser
chỉ ở `.artifacts` bị Git bỏ qua. Không thay runtime, `.env`, CSS hoặc PROGRESS.md.
**0 request Gemini, 0 request Blaze; không phát sinh phí provider trong tác vụ.**
