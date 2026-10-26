# Rà soát tối ưu toàn chương trình — 2026-10-22

## Triển khai sau phê duyệt — 2026-10-22/23

Người dùng đã duyệt triển khai, gồm Docker/proxy và admission theo account.
Nhánh `toi-uu/toan-bo-20261022` giữ thay đổi P0–P2 trước đó. Phần audit bên dưới
là **baseline lịch sử**, không phải mô tả runtime sau tối ưu.

| Mục | Thay đổi đã triển khai | Phần còn cần kiểm chứng/xử lý |
| --- | --- | --- |
| OPT-01 | API cursor `latest/before_id/after_id`; mở 100 tin gần nhất, tải cũ theo nút; merge Turn theo ID, chỉ đồng bộ tail khi voice/recovery | Test MySQL 1002 tin và UI 1000 tin đã có; chưa đo tải nhiều account |
| OPT-02 | Scope đếm practice vào conversation của thao tác start/phase/check; tổng progress chỉ xét conversation hiện tại của từng bài | Full progress vẫn đọc Content để giữ đúng normalization lệnh; chưa SQL aggregate/EXPLAIN/load lớn |
| OPT-03 | Gate fail-fast 16 chat/16 speech mỗi process; 2 chat/4 speech mỗi account; 429 và Retry-After trước upstream; dọn slot/cancel/disconnect/logout | Không phải ngân sách tiền/ngày; dừng polling không chứng minh provider đã hoàn tiền/hủy job; giới hạn chỉ một process |
| OPT-04 | `voice:true` và receipt monotonic theo response ID; giữ generated text để đọc, voice context chỉ dùng prefix clip đã kết thúc; receipt muộn không sửa context sau lượt mới | Clip bị ngắt giữa chừng không được tính đã nghe; không suy số ký tự từ thời lượng audio; chưa kiểm loa thật |
| OPT-05 | Giữ STT realtime opt-in và default batch; lỗi/timeout fallback batch một lần | Chưa có ACK/audio offset chứng minh final coverage; chưa xác minh provider, revision/segmentation và WER/CER |
| OPT-06 | Compose truyền mode/model STT, admission và logging; resolve bằng `.env.example` đã kiểm | Chưa rollout môi trường người dùng |
| OPT-07 | MySQL test riêng trong container/tmpfs; sửa setup import lazy, scope DOM query; format CSS cũ | Xem kết quả cuối tại PROGRESS; không đổi timeout, assertion, skip hoặc coverage threshold |
| OPT-08 | Giữ batch; mệnh đề đầu 32-96 ký tự, poll 0,2/0,35/0,5 giây, gom câu ngắn sau hai clip, retry `429`, lỗi audio không kết thúc phiên | Đã probe realtime WS (TTFB 0,595 giây) nhưng chưa tích hợp streaming PCM; cần duyệt |
| OPT-09 | JSON body deadline 45 giây, refresh 15 giây, cap 8 MiB; SSE total 45 giây và idle 30 giây, dọn reader | Header/body có deadline riêng; không phải tổng deadline duy nhất cho toàn request |
| OPT-10 | Cache giọng song ngữ app-local TTL 5 phút, lock single-flight, không cache lỗi; trả bản copy | Chưa có nút bypass TTL upstream; provider/config đổi bằng restart app; frontend vẫn GET endpoint đã cache |
| OPT-11 | Serialize public DTO một lần/process; catalog frontend TTL 5 phút/single-flight, abort riêng từng subscriber, xóa khi account đổi; gzip tại share nginx | Plan/progress vẫn đọc mới để tránh stale evidence; chưa chia list/detail hoặc thêm cache private |
| OPT-12 | Memo row ổn định theo ID, history initial bounded; chỉ auto-scroll gần đáy, stream không smooth-scroll mỗi delta | Orb/caption vẫn ở Chat; chưa virtualization/Profiler/batch delta |
| OPT-13 | Lazy LandingPage/TutorWorkspace, tách landing CSS; immutable hashed assets, gzip và ETag/304 ở nginx | Chưa dọn CSS hàng loạt, chưa LCP thiết bị chậm hoặc visual regression đầy đủ |
| OPT-14 | Trả connection trước Argon2; reacquire lock và revalidate password/status trước cấp session; cache prompt versioned | Giữ auth revocation DB mỗi request và account lock khi dọn pending; chưa đổi ORM/pool/index |
| OPT-15 | Settings có collector opt-in tối đa 200 mẫu RAM, mode/count/failure/cancel/p50/p95; VOICE_TIMING_LOGS; DB acquire/transaction/lock spans; Gemini token count khi có metadata | Chưa lưu usage vào DB/dashboard tập trung, chưa có sample provider thật; không đoán token hoặc phí |
| OPT-16 | Giữ một worker, không tin header forwarded tùy ý | Trusted-proxy policy/2-client stack test và điều phối đa worker cần thiết kế theo topology triển khai thực |

### Bằng chứng sau tối ưu

- Mock upstream: một lần lấy song ngữ và request sau trong TTL dùng một GET thành
  công; lỗi không cache. Test gate xác minh request quá tải không chạm provider.
- History: mở 100 tin trong hội thoại 1000+ tin; nhận Turn không phát GET history
  mới. Receipt kiểm quyền, monotonic, late-turn và prefix Unicode có test.
- Build: CSS LiveApp **186,68 kB**, gzip estimate **35,55 kB**; landing CSS nằm ở
  chunk riêng **29,55 kB**, không phải toàn bộ CSS bị loại bỏ.
- Nginx thật trên container test: HTML no-store; asset hash immutable + gzip,
  giải nén byte khớp build; conditional ETag trả 304; asset thiếu trả 404 không
  gắn immutable. Chưa xác minh proxy tới backend qua tunnel thật.
- Baseline này không sửa `.env` thật, không migration DB người dùng hoặc gọi
  provider trả phí; chưa có p50/p95 latency, WER/CER hoặc chứng minh naturalness.

### Cập nhật 2026-10-23 — Tối ưu chờ TTS

- Giữ batch TTS và VAD 900 ms; tách mệnh đề đầu sau 32 ký tự/tối đa 96 ký tự và
  poll 0,2 giây (5 lần), 0,35 giây (5 lần), sau đó 0,5 giây.
- Probe trả phí ngắn: Gemini first text ấm median 0,81 giây (5 mẫu); TTS batch pro
  median 1,30 giây, flash 1,57 giây (3 job/model); WebSocket realtime có byte đầu
  0,595 giây, hoàn tất 1,312 giây (1 mẫu).
- Flash không nhanh hơn nên tiếp tục `v2.0_pro`. Realtime WS chưa tích hợp vì
  frontend vẫn phát MP3 trọn clip; chưa có streaming PCM, p50/p95 100 lượt, kiểm
  micro/loa hoặc đánh giá chất lượng. Không giảm VAD để che latency.

## Kết luận và phạm vi

Đã rà soát luồng đăng nhập/tài khoản, lịch sử/chat, lộ trình học, AI/voice,
database/repository, tài nguyên frontend, Docker/proxy và kiểm thử. Có **16 hạng
mục nên xử lý hoặc đo thêm**, ưu tiên giảm công việc lặp và bảo toàn tính đúng
trước khi thay model, giảm VAD hoặc mở rộng số worker.

Đợt này **không sửa mã nguồn, `.env`, database, cấu hình xác thực hoặc hạ tầng**;
chỉ bổ sung báo cáo/nhật ký/yêu cầu trên nhánh `audit/toi-uu-tong-the-20261022`.
Các thay đổi P0–P2 từ trước vẫn giữ nguyên, chưa commit/push. Không gọi provider
trả phí, chạy migration hoặc dùng database người dùng để benchmark.

- **Xác nhận bằng code/test/build:** mô tả hành vi hiện có, kích thước tài nguyên,
  lệnh đã chạy và kết quả dưới đây.
- **Cần đo:** mức giảm ms, SQL execution plan, số người dùng đồng thời, WER/CER,
  hiệu năng thiết bị thật và chi phí provider. Không suy từ kích thước file thành
  LCP, từ timeout test thành latency ứng dụng, hoặc từ mock thành chất lượng AI.
- **P1:** nên xử lý trước rollout rộng hoặc khi tối ưu luồng chính.
  **P2:** cải thiện tiếp, chọn theo phép đo. **P3:** chỉ khi có nhu cầu mở rộng.

## Bằng chứng kiểm chứng trong đợt rà soát

| Kiểm tra | Kết quả |
| --- | --- |
| `python scripts/manage.py build` bằng Python `.venv` | Qua, Vite transform 2471 module |
| `python scripts/manage.py lint-backend` | Ruff/Black/mypy qua, 76 file được kiểm tra |
| `python scripts/manage.py lint-frontend` | ESLint/TypeScript qua; Prettier trượt file cũ `frontend/src/landing/landing.css` |
| `python scripts/manage.py coverage-backend` | 158 passed, 20 skipped; **lệnh trượt** do coverage **68,80% < 80%** |
| `npm.cmd test -- --maxWorkers=1` tại `frontend` | 27 file/293 test qua; **exit 1** do worker của `App.test.tsx` không khởi động kịp, không phải toàn bộ 337 test đã chạy |
| Gọi catalog route với `httpx.MockTransport`, không mạng thật | Một lần gọi catalog tạo **hai GET** cùng `/v1/tts/options` |
| Serialize catalog chuẩn offline | 100 bài, **263494 byte JSON UTF-8**, gzip thử offline **60675 byte** |
| Đọc output build/source | CSS `LiveApp` **230,46 kB**, gzip ước tính từ Vite **43,75 kB**; 14 file CSS nguồn tổng **353044 byte** |

20 test backend bỏ qua yêu cầu `MYSQL_TEST_URL` trỏ schema test riêng. CI đã có
service MySQL và cấu hình biến này; chưa chạy được các test đó ở môi trường local
hiện tại. Cảnh báo Starlette/httpx vẫn tồn tại. Lượt frontend coverage ở giai đoạn
trước từng timeout test UI; kết quả cũ **không thay thế** kết quả đợt kiểm tra này.
Kích thước gzip là phép nén/build offline, không khẳng định server đang gửi gzip.

## P1 — Ưu tiên cao

### OPT-01 — Lịch sử chat tải lại toàn bộ và tăng chi phí theo độ dài hội thoại

**Bằng chứng:** `frontend/src/Chat.tsx:104–115` đọc tuần tự các trang 100 tin cho
đến hết. `send()` tải lại tất cả ở dòng 234; `syncVoice()` làm tương tự ở dòng
286–297, chưa kể các nhánh phục hồi/hủy. Mỗi trang backend cũng kiểm ownership,
khóa account và kiểm pending (`backend/app/services/conversations.py:224–240`).

**Tác động:** hội thoại càng dài càng nhiều request, byte truyền và SQL; một lỗi
đồng bộ sau `done` còn có thể khiến UI báo gửi lỗi dù AI đã hoàn tất.

**Đề xuất:** merge `start/delta/done` theo ID, cập nhật hai tin cuối từ `Turn`,
đồng bộ incremental bằng cursor/sequence; mở ban đầu phần gần nhất, tải thêm khi
cuộn lên. Giữ đường full reconciliation khi phát hiện thiếu dữ liệu.

**Nghiệm thu:** test 1000+ tin, retry/cancel và đổi hội thoại; lượt mới không tải
lại các trang cũ, không trùng/mất tin. Không bỏ kiểm quyền hoặc idempotency.

### OPT-02 — Đếm lượt luyện đọc lại nội dung lịch sử của mọi bài

**Bằng chứng:** `backend/app/services/learning.py:108–144` self-join Messages rồi
lấy `ConversationId, Content` cho các cặp completed thuộc account và binding bài
học, lọc lệnh next/previous bằng Python. Hàm được gọi từ progress/start/phase/check;
`frontend/src/tutor/TutorWorkspace.tsx:179–198` tải progress sau đồng bộ lượt học.

**Tác động:** chi phí phụ thuộc tất cả lượt học cũ, kể cả khi chỉ cập nhật một bài.
Không phải truy vấn N+1, nhưng số row và LONGTEXT trả về tăng không giới hạn theo
lịch sử người dùng.

**Đề xuất:** giới hạn conversation cần tính ở thao tác đơn bài; với tổng tiến độ,
đánh giá aggregate SQL hoặc bộ đếm có cơ chế đối soát/idempotency. Dùng EXPLAIN
trên schema test trước khi chọn composite index; schema đã có unique sequence,
request và các index khác, không thêm index trùng một cách máy móc.

**Nghiệm thu:** giữ đúng quy tắc không tính lệnh điều hướng, pending, failed hoặc
cancelled; đo row đọc/query time với lịch sử lớn và nhiều bài.

### OPT-03 — Thiếu admission control cho API AI/speech trả phí

**Bằng chứng:** `backend/app/core/request_limits.py:62` giới hạn tần suất auth;
`backend/app/api/speech_routes.py:50–67` xác thực/giới hạn body nhưng chưa có quota
hay giới hạn job theo account. HTTP pool 32 connections trong `main.py` chỉ giới
hạn connection, không giới hạn số job TTS đang tồn tại/polling. Chat chống overlap
theo conversation, chưa giới hạn tổng các conversation đang sinh của một account.
Quota 32/hai lease của STT realtime không bao phủ REST STT/TTS và chat.

**Đề xuất:** gate theo account và toàn process, giới hạn hàng đợi/thời gian chờ,
ngân sách text/audio/token; trả 429/Retry-After trước khi tạo paid job. Theo dõi
disconnect và tài nguyên đang chạy; không coi browser abort là provider job đã hủy.

**Nghiệm thu:** burst nhiều tab với upstream giả; request vượt quota không chạm
provider, account khác vẫn hoạt động, slot được trả khi lỗi/cancel/logout. Chỉ
thay xác thực/quota sau khi được duyệt riêng. TTS chỉ retry POST khi `429` (tối đa
hai lần); realtime STT lỗi có fallback batch một lần và có thể phát sinh thêm phí.

### OPT-04 — Lịch sử có thể giữ phần trợ lý người học chưa nghe

**Bằng chứng:** `backend/app/services/conversations.py:450–459` lưu completed
trước khi trả SSE done. `frontend/src/voice/blaze.ts:329–341` đặt textActive false
và sync trước khi queue phát xong. `cancel()` backend dòng 532–558 chỉ hủy pending.
`discard_reply()` đã có ở adapter native nhưng chưa là playback receipt của Blaze.

**Tác động:** ngắt lời sau Gemini done có thể khiến context lượt sau chứa nguyên
đoạn chưa nghe, gây Mate nói tiếp sai nhịp và tăng ngữ cảnh không cần thiết.

**Đề xuất:** phân biệt generated/displayed/played; receipt theo response ID và
phrase với kiểm quyền, thứ tự và tính lặp an toàn. Quy định rõ việc giữ transcript
đầy đủ để đọc và chỉ dùng phần đã nghe cho voice context; không đơn giản xóa tin
completed dùng chung với text chat.

**Nghiệm thu:** ngắt ở đầu/giữa/cuối clip, sau SSE done, phát lỗi; context lượt sau
đúng chính sách, receipt muộn không sửa lượt mới hoặc hội thoại của người khác.

### OPT-05 — STT realtime cần chứng minh final phủ hết audio trước rollout

**Bằng chứng:** `frontend/src/voice/realtimeSTT.ts:90–97,107–110,149–154` dùng
voiced/partial để invalidate settled, nhưng final tới muộn của một segment cũ
vẫn có thể đặt settled cho lượt đã nói tiếp. Hiện chưa có ACK/offset frame cuối
từ protocol công khai; final được nối theo segment, chưa xác minh incremental
so với cumulative/revision trên tài khoản thật.

**Đề xuất:** giữ opt-in; xác minh segmentation/finalization với tài liệu hỗ trợ
hoặc fixture provider thật và tập câu có pause. Nếu có end/commit ACK thì kiểm
coverage tới frame cuối; nếu không, không tự gán độ trễ cố định là bằng chứng đủ.

**Nghiệm thu:** nói tiếp sau pause, final cũ trễ, partial sau final, revision,
timeout/mạng chậm; đo thiếu từ/lặp từ và WER/CER. Đây là **rủi ro từ state machine**,
chưa phải lỗi đã tái hiện với Blaze thật. Không tự bật realtime mặc định.

### OPT-06 — Cấu hình STT mới chưa đi vào container Docker

**Bằng chứng:** `backend/app/core/config.py:137–139` đọc BLAZE_STT_MODE và
BLAZE_STT_REALTIME_MODEL; `docker-compose.yml:23–26` chỉ truyền STT model batch.
Compose đọc `.env` để nội suy không có nghĩa tự inject mọi biến vào container;
hiện không mount `.env` hoặc khai báo `env_file` cho backend.

**Đề xuất:** khai báo tường minh hai biến mới ở environment, giữ default batch;
test parity `.env.example`/Settings/Compose mà không in secret. Cần duyệt thay đổi
cấu hình triển khai trước khi sửa.

**Nghiệm thu:** kiểm cấu hình container đã resolve bằng giá trị giả; chọn mode
realtime trong môi trường test được phản ánh ở catalog, không gọi paid provider.

### OPT-07 — Bộ kiểm thử chưa là hàng rào regression đáng tin cậy hoàn toàn

**Bằng chứng:** kết quả lệnh ở trên; phần Auth/Conversation/Learning/Repository có
coverage local thấp khi integration skip. Frontend lỗi startup worker trong đợt
này; trước đó có timeout test UI. CI lint sẽ dừng trước test ở lỗi format CSS.

**Đề xuất:** chạy MySQL schema test biệt lập theo CI đã có; điều tra worker startup
Windows/Node/Vitest và profile test UI lớn, thu timing trước khi đổi runner. Tách
unit/component/integration/E2E hợp lý; scope truy vấn DOM và cô lập animation/
timer bằng doubles nhưng giữ hành vi và assertion. Có E2E audio giả và kiểm thiết
bị thật riêng; định dạng CSS chỉ trong thay đổi đã duyệt.

**Nghiệm thu:** nhiều lượt suite liên tiếp ổn định với cấu hình chuẩn, đủ các test
nghiệp vụ database chạy và coverage >=80%; không nới timeout/ngưỡng hoặc skip
để báo xanh. Worker timeout không tự chứng minh lỗi runtime ứng dụng.

## P2 — Hiệu năng và vận hành nên cải thiện tiếp

### OPT-08 — TTS còn job polling và đợi MP3 hoàn chỉnh

`backend/app/services/speech.py:147–204` tạo job, poll 0,2/0,35/0,5 giây rồi
download toàn bộ. `frontend/src/voice/blaze.ts:412–435` cũng gom hết body mới phát.
Đây là điểm còn chờ trong cả batch lẫn realtime STT; chia câu P1 chỉ giảm độ dài clip.
Sau hai clip đầu, câu ngắn được gom tới ít nhất 120 ký tự để giảm số job.

Đánh giá Blaze realtime TTS WS/SSE, phát chunk có buffer giới hạn/cancel/ordered
playback. Cần xác minh model và speaker hiện tại được hỗ trợ, không tự đổi giọng.
Đo first audible audio, khoảng hở giữa câu, underflow và số job/chi phí; không chỉ
đo response headers. Giữ REST rollback. Chưa benchmark hoặc gọi TTS trả phí.

### OPT-09 — Timeout API thường chỉ bao phủ tới response headers

`frontend/src/api/database.ts:25–28` clear timer khi fetch trả Response, trước
`response.json()` trong `api()`. SSE parser `api/chatStream.ts` chưa có watchdog
idle riêng. TTS đã có deadline bọc body ở các caller, không nên báo phần đó chưa sửa.

Đề xuất helper JSON có deadline tới parse xong, SSE có total/idle deadline với
cleanup reader; giữ caller AbortSignal xuyên suốt. Test upstream trả headers rồi
đứng body, stream dừng giữa chừng và đổi tài khoản. Không dùng một timeout quá ngắn
áp đặt cho mọi stream dài.

### OPT-10 — Catalog giọng gọi trùng và chưa dùng cache chung

`backend/app/api/voice_routes.py:45–47` gọi voices(vi)/voices(en) song song;
`SpeechService.voices()` dòng 113–145 đều GET toàn `/v1/tts/options`. MockTransport
đã xác nhận hai GET giống nhau. Settings/menu/VoiceChat có thể tải lại khi remount.

Đề xuất fetch một catalog, validate rồi lọc hai ngôn ngữ; TTL ngắn và single-flight
để gom request đồng thời. Cho reload chủ động, invalidation khi provider/model
thay đổi; giữ lỗi giọng không còn tồn tại, không tự chọn thay người dùng. Nghiệm thu
một lần refresh upstream cho các caller chung, cache key không lẫn cấu hình/account.

### OPT-11 — Catalog 100 bài tải lại, private requests chưa được chia sẻ

`frontend/src/learning/api.ts:95–115` lấy catalog/plan/progress mỗi lần hook mount;
`TutorWorkspace.tsx:492–496` remount RoadmapPage khi đổi view. Backend cache source
`course()` nhưng `public_catalog()` vẫn dump/validate toàn bộ mỗi lần. Response
263494 byte, chưa có cấu hình gzip cho API trong app/share proxy hiện tại.

Đề xuất cache immutable public DTO/serialized catalog theo version hoặc metadata
list + detail theo nhu cầu; gzip ở một tầng phù hợp. Frontend chia sẻ catalog và
single-flight, đồng thời cache private plan/progress **theo account**, invalidate
sau mutation/logout; không mở public HTTP cache cho dữ liệu người học. Đo số GET
và payload qua chuỗi chuyển tab, bảo đảm answer keys không bị đưa vào catalog.

### OPT-12 — Cập nhật voice level và delta kéo theo render toàn Chat

`visualLevel.ts:18–22` phát mức âm mỗi 80 ms; VoiceChat chuyển lên `Chat` state
voiceLevel. `Chat.tsx:220–225` map mọi tin mỗi delta; JSX map mọi message ở dòng
552–584, mỗi tin trợ lý chứa một linh thú nhiều node. `useEffect` dòng 142–145
smooth-scroll theo mỗi thay đổi messages, kể cả khi người dùng đang đọc phía trên.

Đề xuất React Profiler trước; cô lập orb/caption, memo message row, batch delta
theo frame, chỉ auto-scroll khi gần đáy. Windowing lịch sử nếu số node thực tế lớn;
giữ đọc bằng bàn phím/screen reader và lựa chọn văn bản. Không memo hóa mọi nơi
hoặc thay đổi audio capture cadence chỉ để giảm render.

### OPT-13 — Tài nguyên giao diện/CSS và HTTP cache còn dư địa

LiveApp import toàn App và các CSS của workspace/profile/landing cùng lúc.
`App.tsx` import eager LandingPage/TutorWorkspace; TutorWorkspace import mọi màn
profile/settings/roadmap. CSS LiveApp 230,46 kB trước nén; nguồn index.css 6051
dòng, tutor.css 2920 dòng. `deploy/share.nginx.conf:18` áp no-store cả `/assets/`;
không khai báo gzip. Preview đã lazy riêng, **không coi cả bundle preview là tải
bắt buộc của luồng thật**.

Đề xuất lazy theo màn hình lớn, gom CSS trùng/override từng bước theo specificity,
cache immutable cho file hash trong assets, HTML và API private vẫn no-store.
Bật nén ở proxy nếu edge chưa nén; test header/304 và đo LCP trên thiết bị chậm.
Không xóa CSS hàng loạt dựa trên số dòng; cần screenshot/regression dark/light,
mobile và drawer/focus.

### OPT-14 — Giảm thời gian chiếm connection/lock thay vì đổi DB công nghệ ngay

`AuthService.login()` giữ transaction/connection từ query user qua Argon2 verify
(`auth.py:85–107`); HASH_SLOTS đã giới hạn bốn phép hash, nên không nên hạ Argon2
để tăng tốc. Mỗi authenticated request kiểm DB để revocation tức thời (đúng thiết
kế). `ConversationService.messages()` khóa user ngay cả đọc lịch sử để expire
pending; Repository MySQL update có select-for-update/update/readback.

Đề xuất đo connection wait, statement count và lock time. Cân nhắc tách snapshot
đăng nhập khỏi hash rồi revalidate trong transaction mới; tách đường đọc khỏi
dọn pending nếu giữ an toàn race. Tinh chỉnh pool/threadpool theo tải đo được,
không đổi sang async ORM/Redis cache auth trước khi chứng minh lợi ích. Nghiệm thu
revocation/rotation/idempotency/race vẫn đúng và không còn chờ DB vì hash chậm.

### OPT-15 — Thiếu dashboard đo bottleneck, token và job thực tế

`core/voice_timing.py` đã có UUID và INFO spans, frontend có p50/p95/events nhưng
không tự lưu/upload. Cấu hình chạy chưa chỉ định handler/level cho logger latency;
chưa có metrics request volume, queue/pool/DB wait, token usage hay paid-job count.
`conversations.py:354–362` lưu text/latency, chưa điền usage token/model vào các
cột vốn có. History budget text 20 tin/32.000 ký tự, voice 12 tin/12.000 ký tự đã
hữu hạn, không phải context vô hạn.

Đề xuất collector opt-in chỉ số/UUID/status, logger có cấu hình rõ và retention;
đo STT/LLM first-text/phrase/TTS/audio-play riêng theo mode/device. Thu usage/model
từ provider và job counts khi protocol có, không đoán token từ ký tự. Cache prompt
versioned đang đọc từ đĩa và thử voice prompt ngắn hơn chỉ sau quality evaluation.
Nghiệm thu dashboard có sample count/failed/cancelled/p95, không có transcript,
token bí mật hoặc thông tin tài khoản, không tự upload dữ liệu người dùng.

### OPT-16 — Giới hạn triển khai nhiều người dùng cần tách khỏi tối ưu local

`deploy/share.nginx.conf:20–32` chưa set X-Forwarded-For trong khi AuthLimiter
nhóm theo ASGI peer. Qua một nginx, nhiều người có thể chung bucket 30 auth/minute
mặc định; cần test bằng stack thật vì tunnel/trusted-proxy có thể làm khác.
Không khắc phục bằng tin mọi header client hoặc đặt forwarded-allow-ips='*'.

Đề xuất policy proxy tin cậy + limit theo peer/account phù hợp, thử hai client.
Health hiện chỉ liveness; cân nhắc readiness nhẹ DB/schema, không gọi paid API.

**P3 khi cần scale:** chat_jobs/native sessions/STT leases nằm trong RAM process,
đang chủ động chạy một worker. Chỉ thêm worker sau khi có ownership/cancel/TTL và
quota dùng chung hoặc routing bảo đảm; kiểm request đến worker khác vẫn hủy đúng.
Không xem tăng worker là cách sửa độ trễ mặc định ở giai đoạn này.

## Thứ tự triển khai đề nghị

1. **Bảo vệ và baseline:** OPT-07, OPT-15, OPT-03; bổ sung characterization cho
   OPT-04/05. Xử lý cấu hình OPT-06 theo môi trường được duyệt. Không hứa số ms.
2. **Ít rủi ro, giảm công việc lặp:** OPT-01, OPT-02, OPT-10, OPT-09, OPT-11.
   Đây là nhóm nên làm trước cho cả text chat và học bằng giọng nói.
3. **Voice nâng cao:** OPT-04 và xác minh OPT-05; thử OPT-08 với phê duyệt ngân sách
   và tương thích giọng. Sau đó mới thử endpoint ngắn hơn/prompt voice cô đọng.
4. **Frontend/DB/vận hành theo đo tải:** OPT-12–14, OPT-16; không refactor toàn bộ
   hoặc đổi công nghệ khi chưa có bottleneck chứng minh.

## Phần đang tốt, nên giữ

- Gemini SSE, HTTPX pool sống theo app; voice TTS theo câu, queue phát đúng thứ tự
  và prefetch có giới hạn đã có. Không đề xuất triển khai lại như tính năng mới.
- Query history đã join session thay vì N+1; LLM context text giới hạn 20 tin/32.000
  ký tự, voice 12 tin/12.000 ký tự; output có cap và yêu cầu kết thúc thành công.
- SQL parameterized, ownership/JWT/refresh revocation, Argon2 có giới hạn đồng thời,
  request body cap, audio cache có TTL/byte cap và dọn logout.
- Main/preview lazy riêng; mock được giới hạn vào test/preview, không fallback AI
  giả hay giọng hệ thống vào luồng thật.

Chưa kiểm chứng: SQL EXPLAIN/load thật, dependency CVE hiện hành, browser profiling,
micro/loa/echo/mobile E2E, provider entitlement/billing/quality và p50/p95 thực.
Đây là audit code + kiểm thử offline, không phải chứng nhận bảo mật hay production
readiness của mọi đường chạy.
