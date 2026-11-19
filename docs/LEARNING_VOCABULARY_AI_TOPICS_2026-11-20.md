# Chủ đề từ vựng do người dùng nhập — thiết kế kỹ thuật (20/11/2026)

**Trạng thái:** đã duyệt ngày 20/11/2026; Cổng A (backend) đang triển khai trên
nhánh `feat/vocabulary-ai-topics-20261120`, tách từ `7f2a4f7`. Thiết kế UX/schema
nền đã có ở [LEARNING_VOCABULARY_DESIGN_2026-11-15](LEARNING_VOCABULARY_DESIGN_2026-11-15.md);
tài liệu này ghi phần mới và các quyết định đã chốt.

## 1. Phạm vi và không-phạm-vi

| Trong phạm vi lát này | Ngoài phạm vi |
| --- | --- |
| Người dùng đã đăng nhập nhập chủ đề, server sinh **30 hoặc 60 từ** riêng | Chia sẻ chủ đề giữa người dùng; cache dùng chung (D3) |
| 6 từ/lô; tối đa 2.048 output token mỗi lời gọi; trần 60 từ/chủ đề (D6) | Nới batch, đo/tối ưu token bằng API thật, hoặc gọi provider trong lượt này |
| Lưu server, owner lấy từ phiên; danh sách/chi tiết/xóa/hủy job | Sửa/xóa chủ đề authored, 16 chủ đề còn lại, import hàng loạt |
| Quota 3 job + 30 lượt gọi/người/ngày; 2 job/process; 1 job/người; 2 start/phút (D5) | Hạn mức toàn hệ thống, thanh toán, multi-worker/lease phân tán |
| Validator nội dung hiện có, lô lỗi một phần, nhãn “AI tạo, chưa thẩm định” | Thẩm định chuyên môn, CEFR chính xác, spaced repetition |
| UI tái dùng `VocabularyPage`/`StudyViews`; provider giả trong test | Gọi Gemini/Blaze thật, TTS mới, thay persona/voice/eval/PROMPT_VERSION |

Ràng buộc: MySQL additive; không sửa bảng cũ, không FK/trigger mới; không
bootstrap khi startup; mọi route mới dùng auth và owner của 5 route từ vựng cũ.
Chỉ một worker backend cho cơ chế job này.

## 2. API

Tất cả dưới `/api/vocabulary`, dùng `User` hiện có (bearer + kiểm phiên trong
DB). Owner luôn là `user["UserId"]`; body `user_id`/`owner` bị `extra="forbid"`
trả 422. Không có route nào trả chủ đề của người khác: không tồn tại và không sở
hữu đều trả **404**, không dùng 403 để tránh dò ID.

| Method/path | Request chính | Response chính |
| --- | --- | --- |
| `POST /generations` | `{client_request_id: UUID, topic: string 2–80, target_count: 30\|60}` | 202 job mới; 200 replay cùng UUID/hash; 409 UUID khác payload; 429 quota/admission/rate; 422 input/refusal |
| `GET /generations/{request_id}` | — | 200 `{status, validated_count, target_count, topic_id?, error_code?, retry_after?}`; 404 nếu không sở hữu |
| `POST /generations/{request_id}/cancel` | — | 200 trạng thái hiện tại; job terminal là no-op; 404 nếu không sở hữu |
| `GET /me/topics` | `offset`, `limit` (≤50) | `{topics, active_jobs, usage}` của owner; topic mới nhất trước |
| `GET /me/topics/{topic_id}` | — | Chi tiết custom topic + toàn bộ `words`; 404 nếu không sở hữu |
| `DELETE /me/topics/{topic_id}` | — | 204 idempotent; xóa từ/state liên quan; job cũ thành `deleted` |
| `PUT /topics/{topic_id}/words/{word_id}/state` | Như route cũ | Mở rộng cho custom word của owner; route cũ không đổi contract |
| `GET /me/states` | — | Như cũ; có thể chứa state của custom topic |

Ví dụ tạo job:

```json
{"client_request_id": "6f1c…", "topic": "phỏng vấn xin việc", "target_count": 30}
```

```json
{"request_id": "6f1c…", "status": "pending", "target_count": 30,
 "validated_count": 0, "batch_size": 6, "poll_after_ms": 2000,
 "topic_id": null, "error_code": null}
```

Quy ước idempotency: tra `(UserId, RequestId)` **trước** admission/quota và
provider; cùng `PayloadHash` trả job hiện tại (kể cả terminal), khác hash trả
409. `PayloadHash` gồm kind, topic đã chuẩn hóa, target_count và phiên bản
prompt. Replay không tính thêm job/lượt gọi. `AuthSessionId` được lưu trong job;
job không nhận JWT hay token.

Mã lỗi ổn định: `vocabulary_not_installed`, `vocabulary_mysql_required`,
`vocabulary_quota_exhausted`, `vocabulary_too_many_jobs`,
`vocabulary_start_rate_limited`, `vocabulary_provider_not_configured`,
`vocabulary_token_cap_unsupported`, `vocabulary_refused`,
`vocabulary_needs_clarification`. Lỗi DB khác, lỗi quyền hoặc bảng core thiếu
không được gắn nhãn “chưa cài đặt”.

## 3. Bảng MySQL additive

Bốn bảng mới, cùng tiền tố hiện có, charset `utf8mb4`; DDL dùng
`utf8mb4_0900_as_ci` như hai bảng đã có. Không FK/trigger; quan hệ do service
kiểm. Cột thời gian dùng `DATETIME` UTC như schema hiện tại.

```sql
-- engmate_vocabulary_custom_topics
UserId BIGINT, TopicId VARCHAR(36),
TitleVi VARCHAR(60), TitleEn VARCHAR(60), Description VARCHAR(240),
WordCount SMALLINT, ReviewStatus VARCHAR(32), PromptVersion VARCHAR(16),
ContentHash VARCHAR(64), CreatedAt DATETIME,
PRIMARY KEY (UserId, TopicId),
KEY IX_VocabCustomTopics_OwnerCreated (UserId, CreatedAt)
```

```sql
-- engmate_vocabulary_custom_words
UserId BIGINT, TopicId VARCHAR(36), WordId VARCHAR(80),
Position SMALLINT, Term VARCHAR(80), PartOfSpeech VARCHAR(16),
Ipa VARCHAR(120), MeaningVi VARCHAR(180), ExampleEn VARCHAR(220),
ExampleVi VARCHAR(260), Cefr VARCHAR(2), CreatedAt DATETIME,
PRIMARY KEY (UserId, TopicId, WordId),
UNIQUE KEY UQ_VocabCustomWords_Position (UserId, TopicId, Position),
KEY IX_VocabCustomWords_OwnerTopic (UserId, TopicId)
```

```sql
-- engmate_vocabulary_generation_jobs
UserId BIGINT, RequestId VARCHAR(36), AuthSessionId BIGINT, Kind VARCHAR(24),
PayloadHash VARCHAR(64), TargetCount SMALLINT, BatchSize SMALLINT,
CefrLevel VARCHAR(8), Status VARCHAR(16), ValidatedCount SMALLINT,
CallsReserved SMALLINT, CallsUsed SMALLINT, TopicId VARCHAR(36) NULL,
ErrorCode VARCHAR(40) NULL, CreatedAt DATETIME, UpdatedAt DATETIME,
ExpiresAt DATETIME, FinishedAt DATETIME NULL,
PRIMARY KEY (UserId, RequestId),
KEY IX_VocabJobs_OwnerStatus (UserId, Status),
KEY IX_VocabJobs_StatusExpiry (Status, ExpiresAt),
KEY IX_VocabJobs_OwnerCreated (UserId, CreatedAt)
```

```sql
-- engmate_vocabulary_usage
UserId BIGINT, UsageDate DATE,
JobsStarted SMALLINT, CallsReserved SMALLINT, CallsUsed SMALLINT,
UpdatedAt DATETIME,
PRIMARY KEY (UserId, UsageDate)
```

Ghi chú thiết kế:

- `custom_topics` chỉ chứa chủ đề đã publish; không có bản nháp công khai.
  `ReviewStatus` luôn `ai_generated_unreviewed`; `ContentHash` để đối chiếu.
- `custom_words` bất biến sau publish; `Position` 1..N; `WordId` do server sinh.
- `generation_jobs` là receipt bền vững; không lưu nội dung người dùng nhập,
  chỉ `PayloadHash`. `Status`: `pending|running|completed|failed|cancelled|
  deleted`; `interrupted` là `ErrorCode` khi job quá hạn/bị gián đoạn. `TopicId`
  null sau khi xóa chủ đề.
- `usage` khóa theo ngày UTC; `CallsReserved` là ngân sách đã giữ,
  `CallsUsed` là lượt đã gửi thực tế. Xóa chủ đề không được giảm bất kỳ bộ đếm
  usage nào (Q7).
- Không có cột chứa API key, JWT, prompt thô, raw provider output hoặc PII.
  Tên chủ đề người dùng gõ không nằm ở bất kỳ bảng/log nào (Q4); tiêu đề hiển
  thị là output sinh đã validate, làm sạch và ≤60 ký tự.

Cập nhật bootstrap và installer giống commit 1:

1. Thêm bốn `CREATE TABLE` vào `gemini-code-1791478978574.sql` ngay sau
   `engmate_vocabulary_requests`, trước phần trigger; không sửa
   `CREATE DATABASE`/`USE`, không thêm `DROP`.
2. `backend/app/db/vocabulary.py` thêm bốn `Table` vào `metadata` hiện có;
   `scripts/install_vocabulary.py` dùng `create_all(checkfirst=True)` nên tự
   tạo đủ sáu bảng. Chỉ sửa docstring/thông báo của installer, giữ nguyên guard
   loopback/`_test`/non-root.
3. Test parity: MySQL `_test` sạch, chạy installer hai lần, đúng sáu bảng, PK/
   unique/index khớp metadata, bảng cũ không đổi, không FK/trigger mới. Không
   chạy installer trên `EngMateAI` nếu chưa có lệnh riêng.

Thiếu bảng: `VocabularyService.transaction` chỉ dịch MySQL 1146 khi tên bảng
thuộc `metadata.tables` của module từ vựng thành 503
`vocabulary_not_installed`. `GET /topics`, `GET /topics/{id}` và các màn
chat/học/phát âm vẫn chạy. `GET /me/states` chỉ cần hai bảng cũ; route custom
cần đủ bốn bảng mới. Nếu thiếu bảng, UI chỉ khóa khu “Chủ đề của bạn”, không
hiện 0 giả và không ghi local thay server.

`/api/ready` hiện kiểm schema chat và trả 503 khi thiếu bảng core. Đề xuất chỉ
**bổ sung** một khóa `vocabulary`:

```json
{"vocabulary": {"status": "ok|not_installed|not_supported|unknown",
 "missing": ["engmate_vocabulary_custom_topics"]}}
```

Chỉ kiểm sáu bảng từ vựng (hai bảng cũ + bốn bảng mới), không kiểm lại bảng
chat/học. Thiếu bảng từ vựng không
đổi status 200 của `/ready` (D7: catalog và màn khác vẫn dùng được); SQL Server
trả `not_supported`. Đây là quyết định Q2 bên dưới.

## 4. Quota, lô, trần từ và token

| Biến môi trường | Mặc định | Khoảng/ý nghĩa |
| --- | --- | --- |
| `VOCABULARY_DAILY_JOBS` | 3 | job bắt đầu/người/ngày UTC |
| `VOCABULARY_DAILY_PROVIDER_CALLS` | 30 | lượt gọi provider được giữ/người/ngày UTC |
| `VOCABULARY_MAX_JOBS` | 2 | job đồng thời toàn process |
| `VOCABULARY_MAX_JOBS_PER_USER` | 1 | job đồng thời/người |
| `VOCABULARY_GENERATIONS_PER_MINUTE` | 2 | start mới/người/phút (process-local) |
| `VOCABULARY_BATCH_SIZE` | 6 | từ/lời gọi; validate 4–10 |
| `VOCABULARY_MAX_WORDS` | 60 | trần tổng từ một chủ đề |
| `VOCABULARY_JOB_DEADLINE_SECONDS` | 660 | trần deadline; server dùng 360 cho 30 từ, 660 cho 60 từ |
| `VOCABULARY_JOB_RETENTION_DAYS` | 30 | job terminal được dọn lười khi tạo job mới |

Cách tính:

- Mỗi create hợp lệ giữ **1 job** và **worst-case call**:
  `2 × ceil(target_count / batch_size)` (30 từ = 10; 60 từ = 20). Không đủ
  ngân sách thì trả 429 trước khi gọi provider.
- Gọi provider thực tế tăng `CallsUsed` **trước khi gửi**; terminal hoàn
  `CallsReserved - CallsUsed` cho job completed/failed/cancelled. Lượt đã gửi
  (kể cả 429/502/timeout) vẫn tính quota; chỉ lượt chưa từng gửi được hoàn
  (Q5). Job quá hạn/process restart được đánh dấu `failed` + `interrupted` và
  hoàn theo đúng quy tắc đó (Q15).
- Qua nửa đêm UTC, job vẫn tính vào ngày đã giữ; usage ngày mới bắt đầu từ 0.
- `Admission` của chat/speech không đổi. Dùng một bộ đếm job riêng trong
  `VocabularyGenerationService` (reserve/release/cancel) và một instance
  `AuthLimiter` riêng, truyền `str(user_id)` làm khóa cho giới hạn 2 start/phút.
  Không sửa `AuthLimiter`, `Admission` hay limiter auth.
- Target mặc định 30, cho phép 30/60; trần 60. Chưa có route append/extension
  trong lát này; nếu thêm sau, tổng vẫn ≤60.
- Provider giả trong test; production dùng `get_llm_client` hiện có. Không đổi
  `backend/app/llm/` trong lát này.

Token: mặc định hiện tại `GEMINI_MAX_OUTPUT_TOKENS=2048` nhưng cấu hình cho
phép tới 8192 và `LLMClient.generate` không có tham số token từng lời gọi.
Để giữ đúng D6 mà không sửa vùng chat/voice, generation kiểm tra cap của
provider đang dùng trước khi bắt đầu: nếu cap > 2.048 thì trả 503
`vocabulary_token_cap_unsupported`; nếu cap thấp hơn thì dùng cap thấp hơn.
Chưa có tokenizer Gemini xác nhận offline và không gọi API để đo, nên 2.048 là
**trần cấu hình**, không phải bằng chứng token thực tế; batch 6 là giả định bảo
thủ. Đo token thật vẫn là cổng riêng trước khi tăng batch.

## 5. Validation và lô lỗi một phần

Tái dùng đúng `Word`/`VocabularyCatalog` hiện có, không tạo validator song song:

1. Model trả JSON strict `{status, words[], reason_code?, suggestions[]?}`;
   `status` chỉ `ok|refused|needs_clarification`; `extra="forbid"`; tối đa 6
   từ/lô (hoặc số còn thiếu nếu nhỏ hơn).
2. Với từng mục, server sinh `id` từ `term` (slug + hậu tố chống trùng), rồi
   chạy `Word.model_validate` với `id` đó. Validator hiện có kiểm độ dài,
   control/markup, IPA, tiếng Việt, ví dụ chứa nguyên term, POS/CEFR. Slug được
   cắt để ID ≤80; `CustomTopic` kiểm `title_vi`/`title_en`/`description` bằng
   cùng luật plain-text trước khi publish.
3. Từ trùng term chuẩn hóa (NFC/casefold/khoảng trắng) trong lô hoặc với từ đã
   nhận bị loại; ID do server sinh nên không thể trùng.
4. Lô lỗi một phần: nhận các mục hợp lệ, tăng `ValidatedCount`, chỉ xin bù số
   còn thiếu. Tối đa **một lần sửa/lô** dùng chung cho lỗi validation hoặc 502;
   không gửi raw output lỗi vào prompt, chỉ gửi số lượng và term đã nhận.
5. JSON hỏng/cắt/thiếu trường: sửa một lần; vẫn hỏng thì job fail
   `invalid_output`, không publish phần đã có. `refused`/`needs_clarification`
   là terminal, không tự retry.
6. Trước publish, kiểm lại toàn bộ danh sách: đúng `target_count`, unique ID/
   term, mọi `Word` hợp lệ, tổng ≤60. Chỉ khi đạt mới ghi `custom_topics` +
   `custom_words` + trạng thái job trong cùng transaction; không publish bản
   thiếu.

CEFR: đọc `LearnerProfiles.CefrLevel` trong transaction ngắn lúc tạo job, lưu
snapshot vào job; prompt dùng mức hồ sơ ±1 bậc trong A1–C2, `Pre-A1` coi là A1
kèm nhãn gợi ý. Không tin level từ client. Đây vẫn là gợi ý độ khó, không phải
chứng nhận.

## 6. An toàn

- **Làm sạch tên chủ đề:** NFC, trim, gộp khoảng trắng, 2–80 code point; loại
  control/C1, bidi, zero-width, xuống dòng, `< > { }`, backtick, URL/email và
  chuỗi điều khiển prompt rõ ràng (ví dụ “ignore previous instructions”,
  “system prompt”). Từ chối nếu còn nghi ngờ; đây là heuristic, không phải
  chứng minh an toàn ngữ nghĩa.
- **Prompt:** `vocab.v1.txt` mới, không sửa persona/voice/PROMPT_VERSION. Chủ
  đề nằm trong `message` dạng JSON như dữ liệu không tin cậy, không nối vào
  system prompt. Prompt dạy từ tiếng Anh cho người Việt, IPA Anh–Anh, JSON
  schema, không bịa từ/nghĩa; từ chối nội dung tình dục lộ liễu, thù ghét,
  hướng dẫn gây hại; chủ đề quá rộng thì `needs_clarification`.
- **Ngoài phạm vi học tiếng Anh:** lọc xác định trước cho trường hợp rõ; phần
  còn lại dựa vào prompt + `refused`/`needs_clarification` + validation. UI
  dùng thông báo Việt cố định theo mã, không hiển thị lý do thô của model.
- **Log:** chỉ ghi mã job đã băm/ngắn, status, counts, latency, error category.
  Không log tên chủ đề, danh sách từ, raw provider output, SQL, token hay PII.
  Không lưu nội dung nhập thô trong DB; chỉ `PayloadHash`.
- **Hiển thị:** React escape text; validator chặn markup; không
  `dangerouslySetInnerHTML`. Mọi chủ đề custom có nhãn **“AI tạo, chưa thẩm
  định”**; không tuyên bố CEFR/IPA đã được chuyên gia duyệt.
- **Cô lập owner:** mọi đọc/ghi/xóa có `UserId` trong WHERE; 404 cho người
  khác; không cache/chia sẻ chủ đề (D3); xóa chủ đề xóa luôn state của nó.

## 7. Lỗi và vòng đời job

| Tình huống | Hành vi server | Thông báo/UX |
| --- | --- | --- |
| Provider 429 | Dừng job ngay, `error_code=provider_rate_limited`; không retry | “AI đang giới hạn lượt; chưa tạo xong, thử lại sau” |
| Provider 502 | Một lần thử lại trong cùng batch; vẫn lỗi thì `provider_unavailable` | “Dịch vụ AI tạm thời không phản hồi; chưa có chủ đề mới” |
| Provider 503/504/timeout | Không retry; `provider_not_configured`/`provider_timeout` | Giữ ô nhập; nút tạo lại dùng UUID mới |
| Validation lỗi toàn lô | Một lần sửa; vẫn lỗi thì `invalid_output` | “AI trả về nội dung không hợp lệ; chưa công bố” |
| Thiếu từ sau ngân sách/deadline | `incomplete`; không publish | “Chưa đủ từ hợp lệ; chưa tạo chủ đề” |
| Hủy job | Conditional update sang `cancelled`, cancel task; kết quả muộn bị bỏ | “Đã hủy; không có chủ đề mới” |
| Process restart | Một worker; startup/lần đọc đầu đánh dấu `pending/running` quá hạn thành `failed`/`interrupted`, hoàn phần chưa gửi; không tự gọi lại provider | “Job bị gián đoạn; hãy tạo lại” |
| Quá deadline | GET/trước batch thấy `ExpiresAt` quá khứ thì `failed`/`interrupted`, hoàn phần chưa gửi | “Job quá hạn; chưa có chủ đề mới” |
| Xóa chủ đề | Xóa `custom_words`, state, `custom_topics`; job trỏ tới thành `deleted`, `TopicId=NULL` | Xác nhận hai bước; 204 idempotent |
| Publish đua với hủy/xóa | Transaction kiểm `Status=running` trước khi ghi; không hồi sinh topic đã hủy | Không có topic mồ côi |
| Shutdown app | Cancel task, best-effort đánh dấu; không tạo bảng/không gọi provider | Lần mở sau đọc trạng thái terminal |

Job manager: task nền `asyncio`, registry `(UserId, RequestId)`, reserve slot
trước khi trả 202, release khi terminal; DB ghi qua `run_in_threadpool` trong
transaction ngắn, **không giữ connection/lock qua await provider**. Gọi provider
tuần tự trong một job; kiểm `Status`, deadline và phiên (`AuthSessionId` chưa
bị thu hồi) trước mỗi lô. Late result sau cancel/delete bị bỏ. Chỉ một worker;
không có lease phân tán — nếu chạy nhiều worker phải thiết kế lại.

Polling UI: 2 giây/lần trong 3 lần đầu, sau đó 5 giây; dừng khi tab ẩn, rời
trang, đổi tài khoản hoặc terminal; khi quay lại đọc `active_jobs`. Không tự
POST lại; chỉ nút “Tạo lại” sinh UUID mới.

## 8. Kế hoạch kiểm thử và giao diện

Backend (provider giả, 0 lời gọi tính phí):

| Nhóm | Ca chính |
| --- | --- |
| Schema/input | thiếu/thừa trường, owner trong body, topic 1/81 ký tự, control/bidi/markup/URL, target 29/61, UUID sai |
| Batch/validator | 6 từ đúng; 4/6 hợp lệ; trùng term/ID; IPA sai; ví dụ không chứa term; tiếng Việt thiếu; JSON hỏng/cắt; refused/clarification |
| Job | 30/60 từ; đếm call; một lần sửa/lô; 429 dừng; 502 retry một lần; 504 không retry; deadline; cancel; late result; restart/orphan |
| Quota | 3 job, 30 call, reserve/refund, nửa đêm UTC, 1 job/người, 2 job/process, 2 start/phút, replay UUID không tính thêm |
| Quyền | 404 job/topic người khác; state custom chỉ owner; xóa không ảnh hưởng owner khác |
| Thiếu bảng | từng bảng mới → 503 `vocabulary_not_installed`; catalog authored vẫn 200; state cũ vẫn chạy khi chỉ thiếu bảng custom; `/ready` báo đúng |
| MySQL | parity 6 bảng/PK/index, installer hai lần, publish transaction, delete cascade app-level, concurrent cùng UUID một job |

Frontend (mock API, không gọi backend thật):

| Nhóm | Ca chính |
| --- | --- |
| Form | rỗng/quá 80, đếm ký tự, target 30/60, disable khi busy, UUID mới mỗi lần tạo lại |
| Job | 202 → tiến trình x/y; poll 2→5 giây; hoàn tất mở/refresh topic; active job sau reload; cancel; lỗi 429/503/502/timeout |
| Danh sách/chi tiết | “Chủ đề của bạn”, nhãn AI, đã nhớ x/y, mở detail đúng endpoint custom, xóa hai bước, 404 quay về |
| Trạng thái | thiếu bảng chỉ khóa khu custom; hết lượt kèm thời điểm reset; rỗng thật; mạng chậm; đổi tài khoản hủy poll |
| A11y/regression | live-region, focus heading, Tab/Enter/Escape, 44 px, reduced-motion; toàn bộ test vocabulary/App cũ |

Giao diện: giữ bố cục `VocabularyPage` và `StudyViews`; thêm khu “Chủ đề của
bạn” + form + thẻ job + quota. `TopicDetail` nhận thêm `source:
"authored"|"custom"` để gọi đúng API nhưng dùng lại lưới từ, tìm/lọc, thẻ,
quiz, TTS click-only và “Thực hành với Mate”. Không thêm dependency; icon dùng
`lucide-react` sẵn có; CSS mới chỉ trong `vocabulary.css` scope
`.workspace-shell .vocabulary-*`, không sửa `workspace.css` hay CSS chung.
Nhãn thường trực: “AI tạo, chưa thẩm định · IPA Anh–Anh · CEFR gợi ý”.

## 9. Hai cổng commit và ước lượng file

| Cổng | Nội dung | Ước lượng |
| --- | --- | --- |
| **A — Backend** | 4 bảng + metadata/installer/bootstrap, schema generation, service/job/quota, 6 route, prompt `vocab.v1`, config/main, fake + unit/integration tests, contract test, `.env.example`; docs API/DATABASE/ARCHITECTURE/DECISIONS/CHANGELOG/REQUIREMENTS/TESTING | **~25 file** (18 code/test/config + 7 docs) |
| **B — Frontend** | API client/types, form + hook polling, `VocabularyPage`/`TopicDetail`, CSS, test vocabulary + fixture `App.test`/`ui-audit` | **~9 file** |

Thứ tự: A trước (test fake + MySQL test riêng đã duyệt), rồi B (mock API, build/
Vitest). Mỗi cổng chạy `python scripts/manage.py lint|test|coverage|build` và
chỉ báo đạt khi có số liệu thật; không tăng timeout/sửa assertion. Không commit
trong lượt thiết kế này; thông điệp đề xuất:
`feat(vocabulary): add private AI topic generation backend`,
`feat(vocabulary): add AI topic generation UI`.

## 10. Quyết định đã duyệt

Người dùng đã duyệt ngày 20/11/2026, chấp nhận Q1, Q2, Q3, Q6, Q8-Q14 và sửa
Q3, Q4, Q5, Q7, Q15 như bảng dưới. Cổng A chỉ gồm backend + test + SQL/installer
+ tài liệu vùng từ vựng; frontend thuộc Cổng B.

| Mã | Câu hỏi | Quyết định |
| --- | --- | --- |
| Q1 | Chỉ 30 từ hay cho cả 30/60? | Giữ 30/60 như D6, mặc định 30; 60 từ tốn tối đa 20 call và 660 giây |
| Q2 | Thiếu bảng từ vựng thì `/ready` 503 hay chỉ báo? | Chỉ báo `not_installed`, giữ 200; D7 yêu cầu màn khác vẫn chạy |
| Q3 | Cap 2.048 token: guard cấu hình hay sửa `LLMClient`? | Guard: cap >2.048 trả 503 mã riêng `vocabulary_token_cap_unsupported` (không dùng 503 chung), có test; không sửa `app/llm/` |
| Q4 | Có lưu tên chủ đề người dùng nhập trong DB? | Không; chỉ `PayloadHash` cho idempotency. Tiêu đề hiển thị lưu riêng, lấy từ output sinh đã validate, làm sạch, ≤60 ký tự; không lưu chuỗi người dùng gõ ở bảng/log nào |
| Q5 | Hoàn ngân sách call khi job lỗi/hủy? | Chỉ hoàn lượt **chưa từng gửi**. `CallsUsed` tăng trước mỗi lần gọi; 429/502/timeout vẫn tính quota |
| Q6 | Hủy job đã terminal trả gì? | 200 no-op kèm trạng thái hiện tại, không 409 |
| Q7 | Xóa chủ đề cứng hay mềm? | Xóa cứng topic/từ/state; job thành `deleted`, `TopicId=NULL`; 204 idempotent; **không giảm** bất kỳ bộ đếm usage nào |
| Q8 | Danh sách job active ở đâu? | Gộp `active_jobs` + `usage` vào `GET /me/topics` để giảm round-trip |
| Q9 | State của từ custom dùng route cũ? | Có; mở rộng service kiểm owner, không thêm route state mới |
| Q10 | Rate limit 2 start/phút dùng lớp nào? | Instance `AuthLimiter` riêng, khóa `user_id`; không sửa auth |
| Q11 | Giữ job terminal bao lâu? | 30 ngày, dọn lười khi tạo job mới; không cần scheduler |
| Q12 | CEFR lấy từ đâu? | Snapshot `LearnerProfiles.CefrLevel` lúc tạo; ±1 bậc; Pre-A1→A1 |
| Q13 | Có chấp nhận prompt mới `vocab.v1.txt`? | Có; file mới, không đụng persona/voice/PROMPT_VERSION, cần review nội dung |
| Q14 | ID custom topic và word? | Topic UUID; word slug server sinh, không tin ID từ model |
| Q15 | Có hỗ trợ nhiều worker? | Không; một worker, không lease phân tán. Startup/lần đọc đầu đánh dấu job `pending/running` quá hạn thành `failed`/`interrupted`, hoàn phần chưa gửi (Q5); có test |

**Duyệt thiết kế này không đồng nghĩa duyệt gọi provider thật, chạy installer
trên DB ứng dụng, tạo DB/container mới, commit hay mở cổng frontend.**
