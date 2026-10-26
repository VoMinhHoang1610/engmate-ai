# Kiểm thử bản hội thoại

## Một giọng và xưng hô theo giọng — 2026-10-23

| Yêu cầu | Kiểm thử hồi quy |
| --- | --- |
| Giữ một speaker qua lời mở đầu và phản hồi Việt/Anh trộn | `voice/blaze.test.ts` (nữ/nam/custom/không rõ), cả STT language khác TTS |
| Đổi giọng nam → nữ cập nhật persona sau cleanup | `voice/VoiceChat.test.tsx`, `speech/identity.test.ts` |
| Nghe thử nữ giới thiệu cô Mate | `settings/VoiceSettings.test.tsx` |
| Prompt hiện tại ưu tiên lịch sử, lời chào không trộn ngôn ngữ | `backend/tests/unit/test_voice_identity.py` |
| Lượt thoại mang identity mới, giữ history và từ chối retry khác giới tính | `backend/tests/integration/test_voice_identity.py` (MySQL test riêng) |
| Catalog cũ thiếu gender vẫn dùng được, gender lạ bị từ chối | `api/voices.test.ts` |

Kiểm thử offline kiểm tra payload/prompt và playback lifecycle, không đánh giá
chất lượng sinh lời hoặc phát âm của Gemini/Blaze thật.

## Tối ưu toàn chương trình — 2026-10-23

- `backend/tests/unit/test_optimization.py`: overload account/process, release khi
  cancel, logout chỉ dừng đúng owner, disconnect dọn upstream, admission giữ tới
  hết SSE body, catalog single-flight/TTL/error, Compose/config parity.
- `backend/tests/integration/test_optimization.py`: cursor trên 1002 tin thật
  trong schema MySQL test, ownership và tổ hợp cursor sai; playback prefix
  monotonic, giữ generated text, loại khỏi voice context, bỏ receipt quá muộn;
  voice context 12 tin so với text 20 tin.
- `frontend/src/Chat.history.test.tsx`: 1000 tin, mở 100, tải cũ và merge done
  không phát history GET mới. `api/optimization.test.ts`: JSON stall/cancel,
  cache subscriber cancellation, TTL, account change và merge ID/pending tail.
- `voice/blaze.test.ts`/`spokenText.test.ts`: played-prefix chỉ tăng khi clip
  ended, ngắt lời sau SSE done, raw Unicode/Markdown boundary. Diagnostics test
  không thu khi tắt, cap 200 mẫu, chỉ numeric whitelist và xóa khi account đổi.
- `api/chatStream.test.ts`: idle watchdog reset khi có data, tổng lifetime vẫn
  bounded. UI tests preload module trong setup để transform không chiếm timeout
  tương tác; scope DOM query vẫn kiểm cùng role/name, không hạ assertion/ngưỡng.
  Test 100 bài chia thành năm case chặng độc lập, mỗi case đủ 20 nút và đúng số
  thứ tự; test modal current/locked riêng. Không tăng timeout 5000 ms trong repo;
  runner container chậm có thể dùng CLI override cho lượt xác minh và phải ghi rõ,
  không sửa assertion/ngưỡng.

Kiểm chứng offline bằng `scripts/manage.py lint-backend`, `lint-frontend`,
`coverage-backend`, `build`; frontend `npm.cmd run test:coverage -- --maxWorkers=1`.
Coverage giữ **80%**. Backend integration yêu cầu `MYSQL_TEST_URL` kết thúc `_test`;
dùng schema/container biệt lập theo phần MySQL bên dưới, tuyệt đối không trỏ DB
người dùng. Kết quả từng lượt và lỗi còn lại ghi tại `PROGRESS.md`.

Đợt này frontend **383/383** qua trên Windows native (33 file); backend unit/integration
**223/223** qua với MySQL test riêng. Windows vẫn có thể timeout UI khi máy tải;
không hạ assertion/ngưỡng để che lỗi. Lần chạy coverage Linux gần nhất: frontend
379/379, coverage 89,01% statements, 81,7% branches, 84,43% functions, 92,15% lines;
backend 219/219, coverage 93,04% với MySQL test.
Runner Linux dùng image frontend sẵn có với package-lock SHA-256 trùng repo, copy
snapshot source/tests/config vào container riêng (không copy `.env`), chạy cùng câu
lệnh và thresholds. Không chỉnh cấu hình CI để che lỗi local.

Chẩn đoán thủ công: bật checkbox trong Settings, mở thoại rồi quay lại xem số mẫu
và p50/p95 theo mode. Không dùng mock để khẳng định latency/quality thực. Cần phê
duyệt ngân sách riêng trước bất kỳ benchmark provider hay audio thật nào.

Nginx test bằng bản build và container biệt lập: GET HTML phải no-store; asset
hash phải immutable/gzip, byte giải nén khớp file build, ETag conditional trả 304;
asset không tồn tại trả 404 không immutable. Compose resolve với `.env.example`,
chỉ in allowlist mode/model/quota/logging để không lộ secret.

## STT realtime opt-in — P2

- `backend/tests/unit/test_blaze_stt.py`: init/model/token chỉ server, ready,
  ticket sai/expired/replay, Origin, JWT/ownership/open state, lỗi provider được
  che nội dung, chỉ PCM đúng kích thước, burst/rate/tổng frames, cap text, quota
  process/account, disconnect và logout hủy task/socket kể cả handshake đang chờ,
  đóng provider trước khi chờ cancel task con; REST logout revoke ticket; vòng
  ready/PCM/partial/final qua route WebSocket thật và upstream giả, không dùng
  credit provider.
- `voice/realtimeSTT.test.ts`: backlog pre-roll trước ready, little-endian PCM,
  partial không thành final, final segmented qua pause, nói tiếp invalidate settled,
  deadline/setup timeout, bỏ ticket/callback muộn, backpressure và lỗi send;
  `voice/blaze.test.ts` kiểm fallback batch một lần khi realtime lỗi/timeout, PCM
  trước endpoint, chỉ final vào chat, mute/ngắt lời/timeout/lỗi đang capture.
  Catalog/VoiceChat test truyền đúng mode.
- `voice/latency.test.ts`: STT bắt đầu trước cuối speech nên offset âm được giữ;
  duration vẫn dương. Report có `sttMode`, dùng filter khi so batch/realtime:
  `summarizeVoiceLatency(samples.filter(s => s.sttMode === 'realtime'))`.
  `sttMs` gồm cả thời gian nói, không coi tất cả là độ trễ sau lời nói;
  `sttAfterEndpointMs` mới phản ánh phần chờ final sau endpoint.

Tự động chỉ dùng doubles, không gọi Blaze/Gemini tính phí. Để thử thật: đặt
BLAZE_STT_MODE=realtime, restart backend/reload trang, mở phiên mới và kiểm WS
`/api/speech/realtime/<UUID>` có binary frames **trước khi nói xong**; lượt thành
công không có POST `/api/speech/stt`, chỉ fallback batch khi realtime lỗi/timeout;
giọng/tốc độ TTS không thay đổi. Cần ngân sách/API account được phép trước khi agent
gọi thật. Rollback bằng batch.

Giữ cùng tập câu và cấu hình để so p50/p95, WER/CER, tỷ lệ cắt lời/ngắt giả và phí.
Đặc biệt thử pause 300/600/800 ms rồi nói tiếp, provider final tới sớm/trễ, nhiều
final segments, mạng chậm/backlog setup, ngắt lời khi chờ final và khi đang phát,
mute/stop/logout; không chỉ thử một câu đọc liền. Protocol chưa có flush ACK/audio
offset nên tests giả lập **không chứng minh final phủ toàn bộ audio**. Cần đối chiếu
waveform/transcript provider thực và onset loa như mục P0P1 trước khi bật mặc định.

## Đo độ trễ thoại P0P1

Các test không gọi Gemini/Blaze thật và không chứng minh SLO hay chất lượng loa:

- `voice/spokenText.test.ts`: câu incremental, mệnh đề đầu tại dấu câu/96 ký tự,
  gom câu ngắn sau hai clip thành job >=120 ký tự, dấu/Markdown chia qua nhiều
  delta, số thập phân, đoạn dài, giới hạn và terminal content không khớp.
- `voice/speechQueue.test.ts`: một clip phát/một clip chuẩn bị trước, thứ tự,
  câu đến trong lúc phát, hủy dữ liệu muộn và lỗi prepare/playback.
- `voice/blaze.test.ts`: audio bắt đầu trước terminal Gemini, đúng giọng/tốc độ,
  không đọc trùng, sync một lần, chen lời bỏ clip chờ, TTS/playback lỗi (kể cả lời
  mở đầu) chỉ dừng audio và giữ Gemini/phiên, Gemini lỗi dừng audio, hủy mở bài
  không đóng lượt mới, timing từ `playing`.
- `api/database.test.ts`: tín hiệu hủy còn tác dụng sau khi headers đã tới.
- `voice/latency.test.ts`: giữ mốc đầu tiên, một report/lượt, tính interval và
  nearest-rank p50/p95 kèm số mẫu, loại cancelled/failed/forced endpoint.
- `backend/tests/unit/test_voice_timing.py`: pool lifecycle kể cả shutdown lỗi,
  dùng lại pool qua STT/TTS/catalog, hủy một Gemini request không đóng pool,
  header private theo request, UUID trace hợp lệ và reset context.
- `backend/tests/unit/test_speech.py`: poll 0,2/0,35/0,5 giây có biên, retry tạo
  job chỉ khi `429` và dừng sau hai lần, job/audio lỗi, catalog và các đường STT/TTS
  không gọi provider thật.

Thu mẫu trên Vite dev bằng DevTools **trước khi bắt đầu thoại**:

```js
const samples = [];
const collect = ({ detail }) => {
  samples.push(detail);
  if (samples.length > 100) samples.shift();
};
window.addEventListener('engmate-voice-latency', collect);
```

Sau thử nghiệm (import `/src` sau chỉ dùng được trên Vite dev, không dùng bản build):

```js
const { summarizeVoiceLatency } = await import('/src/voice/latency.ts');
console.table(summarizeVoiceLatency(samples));
console.table(samples.map(({ traceId, status, endpointReason }) => ({
  traceId, status, endpointReason,
})));
window.removeEventListener('engmate-voice-latency', collect);
```

Report chỉ có UUID, status, endpointReason và offset mốc số từ frame cuối vượt
RMS: endpoint, STT requested/final, LLM requested/first_text/completed, first_phrase,
TTS requested/headers/first_byte, audio_ready và playback_started. Không tự lưu
localStorage/SQL hoặc upload telemetry; xóa biến mẫu khi logout/đổi tài khoản.
Không có mẫu trả samples=0/p50=null/p95=null, không tự điền số giả.

`estimatedEndToPlaybackMs` bao gồm khoảng endpointing, **không phải phép đo vật lý**:
main thread có thể nhận frame trễ, RMS có thể bỏ tiếng nói nhỏ hoặc nhận tiếng ồn,
và `playing` chưa bao gồm độ trễ phần cứng. `ttsFirstByteMs` ở browser bao gồm
backend chờ job/tải MP3 vì REST hiện chưa stream audio; log `tts_first_audio` ở
backend là byte đầu tải từ Blaze sau khi job complete. Không đánh đồng hai mốc.

Bật logger Python `engmate.voice.latency` ở INFO và gắn StreamHandler trong môi
trường dev khi cần log backend; logger mặc định tuân cấu hình logging của host.
Chỉ các request có `voice_trace_id` UUID mới tạo log timing, dùng cùng UUID trong
report trình duyệt để ghép các span; `span_id` phân biệt các job TTS trong một lượt.
Elapsed mỗi span có gốc riêng, không trừ
timestamp backend với performance.now hoặc cộng p95 các stage chồng lấp.

Để đo **thực sự từ cuối lời nói tới âm đầu tiên nghe được**, phát bộ audio có
waveform đánh dấu `speech_end_reference` qua nguồn micro kiểm thử có kiểm soát,
ghi đầu ra/loopback và xác định `audible_onset_reference` (loại khoảng lặng đầu
file). Tính chênh lệch trên cùng đồng hồ ghi âm; nếu dùng loopback trước DAC thì
phải nêu rõ chưa đo độ trễ loa vật lý. Giữ riêng p50/p95 của ground truth và proxy.

Baseline/so sánh cần cùng tập câu, giọng, model, prompt/history, thiết bị/browser,
điều kiện mạng, phân biệt lượt lạnh/ấm và local/tunnel. Thống nhất ngân sách API
trước khi gọi thật; khoảng 100 lượt hợp lệ/cấu hình giúp p95 bớt thiếu ổn định.
Đếm lỗi/timeout/cancel riêng, không âm thầm loại lỗi để làm đẹp số. Đối chiếu
transcript WER/CER và tỷ lệ cắt lời, ngắt giả, audio gap, job/credit mỗi lượt.
Kiểm câu ngắn/dài/trên 30 giây, ngập ngừng, tiếng ồn/nói nhỏ/loa ngoài, mạng chậm,
barge-in trong STT/LLM/TTS/playback, đổi giọng/mute/stop/logout và nhiều tài khoản.
Smoke ngày 2026-10-23 (không phải p50/p95): Gemini first text ấm median 0,81 giây
(5 mẫu, không history); TTS batch pro median 1,30 giây và flash 1,57 giây (3 job
mỗi model, cùng câu ngắn); WebSocket realtime có byte đầu 0,595 giây, hoàn tất
1,312 giây (1 mẫu). Chưa đo 100 lượt, thiết bị thật, chất lượng âm thanh hoặc
tỷ lệ cắt lời; không báo giảm X% hoặc đạt dưới một giây.

## Chọn giọng trong Cài đặt

- `speech/preferences.test.ts`: tách lựa chọn theo tài khoản, khôi phục giọng/tốc độ, dữ liệu hỏng, storage bị chặn và dataset đồng bộ.
- `settings/VoiceSettings.test.tsx`: danh sách Anh/Việt thật từ hợp đồng API, tải/rỗng/lỗi/thử lại, giọng không còn sẵn; chỉ nghe thử bằng click, dừng/hủy, lỗi phát và bỏ kết quả muộn.
- `voice/VoiceChat.test.tsx`: cặp giọng/tốc độ từ Cài đặt vào phiên Blaze tiếp theo, chọn trực tiếp lưu sau cleanup, chặn giọng mất khỏi catalog, giữ adapter native và ngắt/đổi phiên hiện có.
- `App.test.tsx`: chọn hai giọng và tốc độ trong Cài đặt, trở lại chat vẫn giữ, đăng xuất đặt lại và đăng nhập khôi phục. `speech/audio.test.ts` xác nhận callback kết thúc/lỗi phát và không nhận callback cũ sau hủy.
- `.artifacts/check-settings-voice.cjs`: Chrome với metadata/API/WAV fixture kiểm tra speaker ID/tốc độ của request nghe thử, không tự gọi TTS khi đổi lựa chọn, lưu qua điều hướng/đăng nhập và giao diện sáng/tối/điện thoại. Fixture không chứng minh chất lượng giọng hay quota Blaze thật.

## Thanh bên và giao diện tối giản

Đợt màu tương tác dùng `.artifacts/audit-workspace-colors.cjs` với API fixture,
đo màu computed/độ tương phản của chữ đang hiển thị ở home/lộ trình/hồ sơ/cài
đặt, nút chính thường/hover và điều hướng đang chọn trong sáng/tối. Kiểm tra
focus và hình học hover; không coi phép lấy mẫu này là chứng nhận toàn bộ WCAG.
Kết quả tại `.artifacts/workspace-color-audit.json`; ảnh sáng/tối desktop/mobile.

`WorkspaceSidebar.test.tsx` kiểm tra hover/focus/ghim, trạng thái chọn/khóa,
điều hướng, menu mobile, inert, Escape, focus trap và phục hồi focus/scroll.
App tests kiểm tra mở hồ sơ/cài đặt từ sidebar, giữ bản nháp chat khi chuyển
trang, chuyển focus từ menu mobile sang lịch sử và trả về nút menu đang hiển thị.
Luồng đăng xuất vẫn kiểm tra lỗi server và thu hồi phiên. Kiểm tra hash chạy
cùng logic runtime, không bỏ đồng bộ URL trong môi trường test.
Theme tests xác nhận đổi ở Cài đặt/sidebar luôn đồng bộ và một click chuyển
đúng chiều sau khi theme được áp dụng từ nơi khác.

`.artifacts/check-workspace.cjs` kiểm tra Chrome với API fixture: sidebar
72/240 px, vùng nội dung đứng yên khi mở, sáng/tối, lộ trình, hồ sơ, cài đặt,
drawer/focus và ô nhập trong viewport 1440/900/390/320 px. Mở trang hoặc đổi
menu không được tạo hội thoại bài học hay gọi STT/TTS. Script học giọng nói
`check-learning.cjs` kiểm lại bắt đầu bài bằng click, microphone WAV, Blaze,
Gemini SSE, chuyển bước, kiểm tra và mở lại tiến độ trên shell mới.

## SQL khởi tạo đồng bộ với backend

`gemini-code-1791478978574.sql` tạo đủ 13 bảng và 4 trigger trên database mới.
Khi kiểm chứng bootstrap, đổi tên `EngMateAI` sang một schema mới kết thúc
`_test`, thực thi file SQL trực tiếp rồi đặt `MYSQL_TEST_URL` trỏ schema đó.
Không chạy installer trước suite này: làm vậy có thể che việc bootstrap thiếu bảng.
`database/mysql/tests/verify_chat.sql` gồm 9 truy vấn chỉ đọc kiểm tra version,
CEFR, bảng bắt buộc và tính nhất quán owner/JSON.

`backend/tests/integration/test_mysql_schema.py` so sánh kiểu dữ liệu, độ dài,
nullable, khóa chính, default, auto-increment và trigger của bốn bảng lộ trình
với metadata backend; đồng thời kiểm tra các mức trong giáo án và base version 1.
Chạy cùng toàn bộ backend suite để kiểm chứng đăng ký, hồ sơ, chat và tiến độ
trên chính schema vừa bootstrap. Các test vẫn rollback, không dùng database ứng dụng.

## Lộ trình TOEIC và buổi học bằng giọng nói

`backend/tests/test_learning_catalog.py` kiểm tra 5 chặng/25 cụm/100 bài,
200 câu kiểm tra và việc loại khóa đáp án khỏi catalog công khai.
`backend/tests/integration/test_learning.py` dùng schema MySQL test riêng, rollback
từng test: quyền sở hữu, plan version, start/check idempotency, liên kết giáo án
với chat, câu lệnh chuyển bước, loại lượt lỗi/điều khiển khỏi số lượt luyện,
chấm bài, lịch ôn và giới hạn gợi ý theo điểm mục tiêu. Bootstrap mới đã có đủ
bảng. Chỉ với schema test cũ thiếu bảng lộ trình, bổ sung trước bằng
`scripts/install_learning.py --test` với `MYSQL_TEST_URL`.

`frontend/src/learning/learning.test.tsx` kiểm tra mục tiêu, khám phá chặng, mở bài,
409/retry giữ nháp, chuyển bước, nghe theo thao tác, hủy audio, chấm bài và không
hiển thị điểm TOEIC giả. App tests kiểm tra lesson chat đã bind phía server,
khởi động thoại có chủ ý và không gửi tin người học giả. Voice tests kiểm tra
Mate đọc mở bài qua Blaze rồi chờ, hỗ trợ chen lời ngay trong mở bài.

Browser script `.artifacts/check-learning.cjs` dùng catalog thật, API fixture và
microphone WAV giả lập trong Chrome, chạy AudioWorklet/HTMLAudio thật: ba lượt
luyện, chuyển bước bằng lời nói, kiểm tra hoàn thành, học tiếp, đăng nhập lại xem
tiến độ và responsive 1440/900/390/320 px. Không dùng tài khoản thật hoặc API
tính phí. Kết quả kỹ thuật không chứng minh chất lượng giảng dạy, pronunciation
accuracy hoặc mức TOEIC; cần thẩm định chuyên môn và thử thiết bị thật riêng.

## Giọng Blaze và Gemini text

- `backend/tests/unit/test_blaze_voice.py`: metadata cần cả hai dịch vụ, catalog
  song ngữ có bearer, thiếu Blaze không fallback, chặn REST/WS native, giữ Gemini
  GenerateContent làm adapter sinh nội dung.
- `frontend/src/voice/blaze.test.ts`: WAV/VAD, im lặng không gọi API, pipeline
  STT → text SSE → TTS, phân ngôn ngữ/giọng, giới hạn lượt/phiên, ngắt lời, chờ
  cancel server, mute, stop, quyền micro và kết quả đến muộn.
- `VoiceChat.test.tsx`, `catalog.test.ts`, `speech/audio.test.ts`: chọn Blaze khi
  đầu não Gemini, catalog sai không khởi động, giọng máy không được dùng kể cả
  khi có sẵn hoặc Blaze lỗi. Native transport giữ tests riêng.
- Test tự động dùng doubles, không gọi API tính phí. Kiểm thử thiết bị thật và
  quota/chất lượng nhà cung cấp không được suy ra từ các kết quả này.

## Kiểm thử khôi phục hồ sơ

- `backend/tests/integration/test_profile.py`: đọc/ghi trên schema `_test` rollback, chuẩn hóa dữ liệu, stale version 409, dữ liệu sai/giả owner/account fields 422; tài khoản thứ hai không đọc được ảnh của tài khoản thứ nhất; 401 khi thiếu bearer, 404 khi chưa có ảnh, giới hạn dung lượng và từ chối SVG. Test contract giữ các endpoint học tập cũ bị bỏ và bổ sung kiểm tra xác thực cho profile/avatar được khôi phục.
- `frontend/src/profile/*.test.ts(x)`: biểu mẫu cũ, readonly identity, PUT/version, lỗi server/xung đột giữ nháp, chặn gửi lặp, upload ảnh/lỗi decode/dung lượng, reload sau lỗi và kiểm tra định dạng cục bộ. Menu test xác nhận hover rồi click không đóng mất menu và callback mở hồ sơ.
- `.artifacts/check-profile.cjs`: Chrome với API giả lập, sửa đầy đủ trường và lưu, encode ảnh thật thành JPEG, avatar menu, xử lý xung đột/tải lại và mở lại sau đăng nhập; screenshot dark/light, không overflow ở 1440/900/390/320 px. Không dùng dữ liệu tài khoản thật. Khi Windows chặn tmp_path mặc định, đặt `PYTEST_ADDOPTS=--basetemp=<thư mục mới trong .cache của repo>` để fixtures ảnh nằm trong workspace.

## Kiểm thử giao diện thầy Mate, 2026-10-18

`App.test.tsx` kiểm tra điều hướng, chọn mục tiêu/bài học, chuẩn bị bản nháp và gửi qua API chat, ghi nhận từ/bài đã học, không đếm bài hai lần, nghe mẫu/chép lời/lỗi speech; giữ toàn bộ kiểm thử hội thoại, retry, hủy, lịch sử, phiên và voice. Các assertion sidebar cũ được chuyển sang mở ngăn kéo; kiểm tra nhãn chào và nav khớp yêu cầu mới, không bỏ test nghiệp vụ. `tutor/curriculum.test.ts` kiểm tra dữ liệu storage sai, tách tài khoản, lọc mục không hợp lệ, giới hạn lịch sử ngày và lịch local.

Integration Gemini kiểm tra prompt `Version: 5.` cho text và realtime. Lượt này dùng schema mới `EngMateAI_tutor_test` riêng, bootstrap từ SQL trong repo; test xác nhận schema kết thúc `_test` và không có tài khoản, các transaction rollback. Database người dùng không được bootstrap lại.

Kiểm tra browser tại `.artifacts/check-tutor.cjs`: Chrome headless, mock API chỉ ở `/api`, không dùng tài khoản/khóa thật; xem sáu màn ở 1440/900/390/320 px, chụp ảnh và kiểm tra overflow, ảnh tải thành công, JavaScript errors. Artifact `.artifacts/tutor-browser.json` và `tutor-*.png`. Kiểm chứng này không thay thế trải nghiệm microphone/loa/provider thật.

Từ root: `python scripts/manage.py lint`, `test`, `coverage`, `build`, `smoke`. Lint gồm Ruff/Black/mypy, ESLint/TypeScript/Prettier. Coverage >=80% giữ nguyên. Frontend chạy 2 worker, giữ timeout/assertion.

Chia sẻ HTTPS: build trước khi bật `docker-compose.share.yml`; kiểm tra Compose `config --quiet` và `exec -T share nginx -t`. Probe public tại `.artifacts/share/check.py` đọc HTML/assets/health/ready/capabilities, xác nhận source/`.env` trả 404, catalog cần auth trả 401, CORS đúng origin và WSS handshake 101 rồi đóng 4404 với ticket giả. Browser `.artifacts/check_share_browser.cjs` mở link thật, kiểm tra màn hình đăng nhập, secure context và API microphone, không đăng nhập hoặc gọi provider. Kết quả trong `.artifacts/share/`. Các probe này không thay thế thử chat trả phí/micro/loa thực.

## Database test

Tạo database MySQL **mới**, tên kết thúc `_test`, bằng SQL root với tên database được đổi. Cấu hình `MYSQL_TEST_URL` trong terminal, không đưa URL secret vào Git hoặc dùng database EngMateAI thật. Fixture từ chối database không có hậu tố `_test` hoặc đã có tài khoản. Mỗi test dùng transaction/savepoint và rollback. Không tự bootstrap hoặc DROP database khi pytest chạy.

Suite API sử dụng MySQL thật khi có biến test. Nếu thiếu, các ca này skip và chưa được xem là kiểm chứng persistence/coverage đầy đủ. CI đã được đổi sang MySQL 8.0, bootstrap schema test và chạy cùng task runner; chưa khẳng định CI từ xa qua trước khi workflow thực thi.

| Yêu cầu | Kiểm tra |
| --- | --- |
| Surface chỉ còn auth/chat/speech, capability trung thực, auth bắt buộc | integration/test_chat_contract.py |
| Đăng ký/login/refresh/revoke, trùng identity, password sai, user disabled, ownership | integration/test_chat_database.py; unit/test_security.py |
| Đăng ký → login → chat → bỏ token/login lại/đọc lịch sử → logout/401 qua HTTP thật | integration/test_chat_http.py, Uvicorn loopback + schema MySQL test/rollback |
| Lưu/mở/đóng chat, retry UUID, >100 lịch sử | integration/test_chat_database.py |
| Provider lỗi/timeout/empty/cancel, late result, stale pending | integration/test_chat_database.py |
| Engine pool/UTC/isolation/reflection/schema guard | integration/test_chat_database.py |
| Body limits, throttle, redacted validation, JWT claims, cấu hình | unit/test_request_limits.py, test_security.py, test_config.py |
| Blaze STT/TTS/job/voices, quota/network/errors/auth/origin | unit/test_speech.py, HTTP MockTransport |
| Login/register → workspace không F5, history pagination, drafts/retry/cancel/close/logout, không có menu học tập | src/App.test.tsx |
| URL đồng bộ login/register/logout/hết phiên; giữ query/history state/bản nháp khi sửa hash hoặc popstate; hash không vượt đăng nhập | src/App.test.tsx; browser local `.artifacts/check_auth_url.cjs` |
| Bearer/refresh concurrent/logout late response/deadline | src/api/database.test.ts |
| Âm thanh/cache/cancel và microphone cleanup/STT | src/speech/audio.test.ts, src/hooks/useThuAm.test.ts |
| Giữ shell/logo/Mate gốc và chỉ một trang hội thoại; menu lịch sử/Escape | src/App.test.tsx |
| Pane đăng nhập/đăng ký gốc, xác nhận mật khẩu, chống gửi trùng, intro một lần, reduced motion/storage bị chặn | src/AuthForm.test.tsx |
| Menu avatar: hover/touch, click ngoài, Escape/focus, logout pending | src/components/MenuNguoiDung.test.tsx |
| Responses wire contract, typed history, error/quota trong HTTP 200 stream, timeout/no fake fallback | unit/test_openai.py |
| SSE start/delta/done/error, retry không duplicate, disconnect finalize cancelled, MySQL context | integration/test_streaming.py |
| SDP/private key/sideband, out-of-order transcript/response, interruption/truncate, DB lỗi vẫn hangup | unit/test_realtime.py |
| Voice owner/heartbeat/end, chặn overlap text/close, provider transcript ghi SQL, truncate loại khỏi memory | integration/test_voice.py |
| UTF-8 SSE từng byte, body cancel sau headers, incomplete/error không fake success | src/api/chatStream.test.ts |
| Micro constraints/permission, WebRTC signaling, barge-in/late response, reconnect có hạn, tracks/audio/timers cleanup | src/voice/session.test.ts |
| Chat hiển thị delta vào cùng assistant; stop giữ draft; Voice UI/mute/sync trong layout gốc | src/App.test.tsx |
| Gemini header auth, user/model context, thought filtering, STOP/partial/quota/timeout, factory/key privacy | unit/test_gemini.py |
| Live setup/history, one-use/expired tickets, Origin/REST auth, PCM giới hạn, lỗi/lease/cleanup/barge-in | unit/test_gemini_live.py |
| Gemini SSE qua SQL, retry không duplicate, shared voice history/ownership và discard reply ngắt lời | integration/test_gemini_database.py |
| PCM 16/24/44.1/48 kHz → 16 kHz, mute reset, chunk/clamp | src/voice/capture.test.ts |
| Gemini capture/playback, interruption, ticket, deadline/reconnect/late permission/cleanup; chọn đúng UI provider | src/voice/gemini.test.ts; src/App.test.tsx |
| Tự cuộn đúng pane thay vì ancestor của trang | src/App.test.tsx: scrolls new replies inside the message pane |
| Prompt v4 Việt/Anh dùng trong cả chat và thoại; lịch sử giữ nguyên vai trò | integration/test_gemini_database.py, kiểm tra request systemInstruction và session.prompt thực |
| Catalog live cần auth, voice_id sai trả 422 không mở provider, giọng theo phiên không đổi default chung | unit/test_gemini_live.py, integration/test_gemini_database.py |
| Chọn/đổi giọng Live qua UI kể cả đang gọi, giữ khi kết thúc, retry catalog; REST offer mang đúng voice_id | src/App.test.tsx, src/voice/VoiceChat.test.tsx, src/voice/gemini.test.ts, src/voice/catalog.test.ts |
| Đọc tiếng Việt/Anh với giọng riêng và gửi ngôn ngữ STT được chọn | src/speech/audio.test.ts |
| CHAT-19: khung chào mặc định, không tự đọc tin cũ/tạo bản ghi, gửi đầu tiên/retry, kết quả tạo muộn, reload/đóng hội thoại vừa tạo | src/App.test.tsx |
| CHAT-20: toolbar icon chung khung nhập, nhãn/tooltip, menu đóng ngoài/Escape/focus, tạo chat trước khi gọi, phục hồi lỗi tạo và ẩn phụ đề khi dừng | src/App.test.tsx |
| Đổi giọng chờ stop xong mới start, cùng ID, giữ mute, bỏ callbacks cũ, stop/unmount khi đang đổi, đóng lỗi và đổi liên tiếp | src/voice/VoiceChat.test.tsx |
| CHAT-21: sáng/tối, khôi phục preference/system, storage bị chặn, màu browser | src/components/ThemeToggle.test.tsx |

Kiểm tra bản một hàng: `node .artifacts/check_inline_composer.cjs` dùng Edge thật với API, microphone/Web Audio và WebSocket giả lập hoàn toàn. Đo tâm icon/textarea cùng một hàng, chiều cao khung trống, ảnh sáng/tối và đổi giọng đang gọi giữ mute/cùng ID/stop trước start ở 6 viewport. Kết quả và ảnh trong `.artifacts/inline-composer/`. Các phép thử này không kiểm chứng chất lượng âm thanh provider thật.

Kiểm tra khung chào/toolbar mới: `node .artifacts/check_welcome_composer.cjs` (artifact local) giả lập toàn bộ API trong browser, không ghi database hoặc gọi AI. Tại 1440×900, 1366×768, 768×1024, 390×844, 320×568 và 844×390, kiểm tra khung chào không fetch tin cũ/tạo bản ghi; icon nằm trong composer, không tràn màn hình; chọn giọng/menu, gửi tin đầu tiên tạo đúng một hội thoại; đọc lại lịch sử dài và quay về bản nháp. Ảnh và số đo trong `.artifacts/welcome-composer/`. Bài kiểm tra bố cục cũ bên dưới phản ánh phiên bản trước khi gom toolbar.

Kiểm tra bố cục thủ công bằng Edge headless/Playwright có sẵn trong môi trường: `node .artifacts/check_chat_layout.cjs` (artifact local, không thuộc lệnh setup/CI). Script giả lập toàn bộ `/api/` trong browser, dùng giao diện React thật và 80 tin/50 hội thoại, không gọi backend/model hoặc ghi dữ liệu thật. Đo viewport/panel/composer/page scroll trước/sau gửi tin ở 1440×900, 1366×768, 900×768, 768×1024, 390×844, 390×667, 320×568, 844×390; thêm phụ đề thoại dài để kiểm tra form vẫn nhìn thấy. Ảnh và số đo tại `.artifacts/chat-layout/`. Không dùng jsdom để khẳng định kết quả hình học CSS; bàn phím ảo vẫn cần kiểm tra trên thiết bị thật.

Các test bài tập, flashcard, dashboard, onboarding và profile/media được loại cùng tính năng sau khi người dùng duyệt kế hoạch. Auth/chat/speech không bị bỏ kiểm chứng để làm xanh suite; được chuyển thành tests phù hợp surface mới. Giao diện gốc được khôi phục cho tài khoản và hội thoại; assertions tên nút gửi được đổi về “Gửi tin nhắn”, luồng đăng xuất mở menu avatar trước và đăng ký kiểm tra trường xác nhận; giữ toàn bộ kiểm tra REST/retry/lifecycle. Schema cài mới không còn seed bài học/đáp án/từ vựng.

`smoke` chỉ đọc liveness/capabilities/OpenAPI/proxy/HTML. Tests tự động không gọi OpenAI/Blaze trả phí, không gửi SMTP, không dùng tài khoản thật. Model double ở `backend/tests/fakes.py`, dependency override và HTTP MockTransport không thuộc runtime; get_settings từ chối LLM_PROVIDER=mock. Khác với smoke, kiểm chứng live cần khóa còn credit và được phép tính phí.

Ngày 2026-10-16 đã thử OpenAI thật: HTTP 200 nhận response.created/in_progress rồi error/response.failed với `insufficient_quota`, `credit_balance_exhausted`; không có text delta hay câu trả lời hoàn tất. Dừng gọi thêm sau khi xác định quota, theo phản hồi người dùng chưa thể bổ sung credit. Không đánh dấu các ca model nhớ ngữ cảnh/đáp câu mới/thoại thật thành công dựa vào doubles.

Sau đó người dùng yêu cầu Gemini thay OpenAI. Probe thủ công đã xác nhận models API HTTP 200, adapter Flash-Lite nhận text thật, Gemini Live setupComplete và tạo 10 audio chunks kèm transcript 35 ký tự từ lời nhắc text. Gemini 3.8 Flash trả HTTP 503 trong lần thử; chọn Flash-Lite qua cấu hình, không fallback tự động. Không dùng dữ liệu tài khoản thật trong probe. Kết quả OpenAI hết credit phía trên là lịch sử, không mô tả provider hiện tại.

Browser E2E/micro/echo/speaker thực và barge-in còn cần kiểm chứng riêng: đăng ký tài khoản trên schema test → chat câu mới → kiểm tra stream/nhớ ngữ cảnh/lưu lại sau đăng nhập → bắt đầu thoại Gemini → chen lời nhiều lần → kết thúc/mất mạng/thu hồi mic. Không tạo dữ liệu thử vào database người dùng. Không coi probe audio từ text là kiểm chứng microphone vật lý hoặc toàn bộ vòng relay trong browser.

Artifact: `backend/htmlcov/index.html`, `backend/coverage.xml`, `frontend/coverage/index.html`; kết quả chạy mới nhất và giới hạn ở PROGRESS.md.
