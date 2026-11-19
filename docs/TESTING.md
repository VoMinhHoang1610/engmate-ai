# Kiểm thử bản hội thoại

## Agent P / 2026-11-20 — Cổng formatter và điều tra Settings

- `npm.cmd run format:check`: PASS; `npm.cmd run lint`: ESLint không warning
  và `tsc --noEmit` PASS; `npm.cmd run build`: PASS (Vite 8,54 s).
- `npm.cmd run test -- --reporter=verbose`, không bail: **506/506**, 44 file,
  148,40 s. Lượt cổng cuối cùng cùng lệnh: **506/506**, 44 file, 153,98 s.
  Không thay assertion/timeout/cấu hình/worker; không gọi API tính phí.
- Test riêng `App.test.tsx -t "shares saved Settings voices and speed with chat
  and restores them after signing in again"`: lượt đầu đạt; ba lượt chạy lại
  lần lượt timeout 5.000 ms/đạt/đạt. Cả file App sau đó **44/44**.
- Baseline worktree detached `9c8d43e`: đúng test trên **3/3**, giữ cùng dependency
  và test/config, không cài gói; đã gỡ junction và worktree. Không chứng minh
  timeout có sẵn; nguyên nhân gốc chưa xác định. Không sửa test cũ hay production
  để làm test qua. Lỗi đầy đủ và diễn giải tại [báo cáo](CHAT_FORMATTING_2026-11-20.md).
- Kiểm heavy.lock trước từng lệnh nặng; không có khóa, không xóa khóa. Không
  chạy test/build/browser đồng thời. Không đo coverage ở lượt frontend này;
  không dùng số coverage cũ làm coverage của formatter mới.

| Yêu cầu | Test mới |
| --- | --- |
| `**`, `*`, `#`, backtick, số mục, dòng trống, tiếng Việt | chat/AssistantText.test.tsx |
| Stream từng ký tự, marker chưa đóng, DOM/text node ổn định | chat/AssistantText.test.tsx |
| Script/HTML hiện literal, không tạo thẻ thực thi | chat/AssistantText.test.tsx |
| Giữ đủ 30 mục gọn, bỏ marker trong speech | chat/AssistantText.test.tsx |
| Payload TTS đã sạch, ngôn ngữ và dùng chung cache | speech/audio.formatting.test.ts |
| TTS stream sạch marker, giữ offset Unicode receipt | voice/spokenText.formatting.test.ts |

Ảnh tại docs/assets chụp component thật bằng Edge headless/file HTML cục bộ,
không mở cổng: desktop 1440×1080; mobile dùng khung CSS 390 px trong ảnh
390×844 do Edge headless giới hạn viewport nhỏ. Đã xem lại sáng/tối; không
cắt ngang chữ. Đây là demo component tĩnh, chưa phải E2E app/stream/provider.
V8 chưa eval/smoke thật, kết quả v7 không áp dụng v8; chưa merge.


## Từ vựng — trạng thái hiện tại tại worktree 16/11/2026

- Baseline sạch đã chạy đúng một lần: frontend **472/472**. Các mục
  “chưa chạy/chưa triển khai” bên dưới là lịch sử tại thời điểm ghi.
- Backend full **282/282**, coverage **93,44%**, có MySQL tạm riêng, không skip
  integration MySQL. Installer M1/M2 additive/idempotent qua.
- Frontend đầy đủ gần nhất `vocabulary-frontend-label-layout-controlled-02`:
  **487/490**, **3 timeout**, trong đó **2 lỗi ngoài sáu ngoại lệ App**;
  Vocabulary **10/11**, VoiceFirst **9/10**, LandingPage **2/2**, App **43/44**.
  Coverage statements/branches/functions/lines **90,08 / 82,64 / 86,20 /
  93,17%**; runner exit 1. Không gọi suite hoàn toàn xanh. Lint/type/format qua;
  build sau CSS đã qua: 2.491 module, Vite 33,11 giây, tổng 72,15 giây, exit 0.
- Browser Desktop đã kết nối, kiểm fixture 800px, iframe rộng thực đo 1364px
  và mobile 374px, sáng/tối; đủ 50 từ, tìm không dấu/lọc, quiz 4/5, chọn 5 từ
  tạo draft không tự gửi, thiếu DB vẫn đọc catalog/khóa lưu, keyboard/focus.
  Ảnh và kết quả từng bước ở nhật ký. Không dùng fixture chứng minh lưu tài
  khoản thật hoặc provider TTS thật. Không gọi API trả phí.
- Browser phát hiện label bị column theo CSS chung; đã duyệt sửa chỉ CSS
  vocabulary, đo lại 50 label row/min-height 44px/không tràn ngang qua ở
  desktop sáng và mobile tối. Lint/type/format và regression Vocabulary 11/11
  đã qua sau sửa.
- **Gate coverage sau sửa CSS vẫn thất bại:** lượt đầu
  `vocabulary-frontend-label-layout-01` chỉ **466/490**, **24 timeout**, **19
  lỗi ngoài sáu ngoại lệ App**; một ca kéo dài **92.804,89 ms** dù hạn 5.000 ms.
  Sau khi đóng preview/Vite, canary profile/settings qua **4.213 ms**, nên chạy
  lại có kiểm soát đúng một lượt `...-controlled-02`: **487/490**, **3 timeout**,
  còn **2 lỗi ngoài ngoại lệ** — Vocabulary `shows both complete topics...`
  **5.359,7 ms** và VoiceFirst stage 2 `shows all 20...` **5.618,26 ms**; ca App
  server-bound **5.494,86 ms** thuộc ngoại lệ đã duyệt. Coverage **90,08 / 82,64
  / 86,20 / 93,17%** (vẫn trên ngưỡng 80% từng chỉ số), CPU mean **64,77%**, p95
  **100%**, 149 mẫu >=90%, RAM tối thiểu **8.957 MiB**. Gate test **chưa đạt**;
  đã dừng, không chạy lại full suite. **Build sau CSS đã qua** (2.491 module,
  Vite 33,11 giây). Không tăng timeout/giảm assertion hoặc retry suite nguyên
  trạng.
- Không tăng timeout, giảm assertion/coverage, retry full suite nguyên trạng
  để chọn lượt xanh. CPU/RAM kiểm trước việc nặng, một worker/BelowNormal,
  không chạy browser/build/test nặng đồng thời. Lỗi mới ngoài ngoại lệ phải dừng.

[Bằng chứng, lỗi công cụ và giới hạn](VOCABULARY_TEST_INVESTIGATION_2026-11-15.md).
[Phiếu rà nội dung](VOCABULARY_CONTENT_REVIEW_2026-11-16.csv) chưa có người duyệt.

## Cổng tiền triển khai Từ vựng sau duyệt — 15/11/2026

D1–D10 đã duyệt có điều kiện. [Lệnh baseline sạch và MySQL test riêng](VOCABULARY_PREFLIGHT_2026-11-15.md)
đã trình, chưa chạy; chờ duyệt lệnh worktree và xác nhận không có tác vụ khác.
Đã kiểm cú pháp 9 khối PowerShell bằng parser, không thực thi các khối đó.
Baseline sạch sẽ chạy một lần và lưu tên đầy đủ từng test lỗi; App lỗi thì
điều tra gốc, giữ nguyên timeout/assertion. Kết quả dirty workspace bên dưới
là lịch sử và không thay cho baseline sạch.

## Kiểm toán năm mục học tập — 15/11/2026

[Thiết kế và ma trận kiểm thử](LEARNING_VOCABULARY_DESIGN_2026-11-15.md)
đã được duyệt có điều kiện sau lượt kiểm toán. Chưa có test/tính năng vocabulary mới trong runtime.
Baseline lượt này dùng bộ test hiện có, fake provider; không cấp quyền chạy eval
live hay MySQL ứng dụng. Kết quả đầy đủ ở §9 của thiết kế.
Lint/build qua; test baseline: backend 230 qua/24 skip, frontend 465 qua/7 timeout
5.000 ms. Coverage toàn repo dừng ở backend 73,93% (<80%) do chưa có
`MYSQL_TEST_URL`. Coverage frontend một worker thất bại: bảy timeout và lỗi
ENOENT mất thư mục coverage tạm. Lượt dùng thư mục báo cáo artifact riêng không
tái hiện ENOENT: 466 qua/6 lỗi ở App (5 timeout, 1 không tìm thấy thông báo tải
giọng), 38/39 file qua; exit 1, không xuất tổng coverage. Frontend chưa chứng minh
đạt 80% từng chỉ số. Giữ nguyên timeout/assertion và toàn bộ kết quả thất bại;
dừng đo nền, chưa sửa lỗi ngoài phạm vi thiết kế.
Kiểm tra browser dùng fixture `frontend/tests/ui-audit.html`, chặn mọi fetch API
thật, Edge có sẵn và Node built-ins; artifact riêng trong
`.artifacts/learning-vocabulary-audit-20261115/`, không thêm dependency.

## Kiểm chứng C2 offline — 16/11/2026

Eval qua **89/89** sau khi test judge chuyển sang fixture tổng hợp tạm;
giữ nguyên assertion cũ và kiểm tra hash thật, thêm ba ca sửa lệch nguồn.
Chặn HTTP thật và artifact judge/raw phản hồi riêng tư: **0 lần thử truy cập**.
Không sửa runner/snapshot, dữ liệu khóa, timeout hoặc ngưỡng coverage; không API.
Sau đó C2 đã commit `d67f97b`, hook backend/frontend qua. Checkout riêng chỉ
kiểm hash: 15 frozen generation khớp; 17 file C2 đúng kỳ vọng (15 khớp byte,
hai file judge-combined chuẩn hóa CRLF thành LF); chín artifact private đã
loại trừ đều vắng mặt. Không chạy test ở đó; đã dọn theo lệnh duyệt. Bằng chứng:
`.artifacts/c2-clean-checkout-verification-20261116.json`.
Chưa chạy lại toàn bộ backend/frontend/coverage trong lượt C2.

Lượt đầu có 55 test qua, 34 lỗi thiết lập do quyền temp/cache; giữ log lỗi.
Lượt temp/cache riêng qua; bằng chứng trong `.artifacts/c2-eval-offline-20261116.log`,
`c2-eval-offline-recheck-20261116.log`, `c2-eval-guard-result-20261116.json`.
C1 đã commit/kiểm byte bằng checkout riêng rồi dọn theo lệnh được duyệt;
C2 đã commit; C3 `4e0698f` đã commit tài liệu thoại, hook backend/frontend qua.
Hash baseline, 12 file khóa và tám tài liệu chưa stage khớp trước/sau hook;
bằng chứng `.artifacts/c3-postcommit-integrity-20261116.json`. C4 đang chuẩn bị.
Các trạng thái bảo toàn 15/11 bên dưới là lịch sử.

Kiểm cuối test judge **12/12 qua** sau chỉnh import; Ruff, Black check và mypy
strict qua. So AST của sáu test cũ với backup xác nhận assertion không đổi.
Biên bản `.artifacts/c2-synthetic-validation-20261116.json`; log kiểm cuối
`c2-judge-final-20261116.log` và `c2-judge-final-guard-20261116.json` ghi 0 lần
thử đọc artifact riêng tư/HTTP thật. Các artifact mới giữ cục bộ, chưa sao lưu
vào manifest lịch sử. Không dùng kết quả này thay coverage toàn repo.

## Rà offline 14–15/11/2026 và các điểm chờ duyệt

Bảo toàn sau kiểm toán: chỉ sao lưu/quét riêng tư/đồng bộ tài liệu và chạy một
lệnh switch đã duyệt, **không chạy lại test/lint/build/benchmark/API**. Backup
151 file khớp hash; chưa có commit attrs hoặc checkout sạch để kiểm chứng.
Theo [kế hoạch](CHANGESET_PLAN.md), raw phản hồi private không commit nguyên
trạng. Test judge hiện gọi inputs đọc raw nên chưa chứng minh clean checkout
chạy unit test độc lập; chưa sửa assertion/timeout/skip hoặc hạ ngưỡng.

Không tìm thấy `.artifacts/mysql-approved-run.log`; vẫn có và đã sao lưu
`mysql-approved-coverage.log`, `mysql-coverage-verification-20261115.json`,
`mysql-approved-run.ps1`. Không tái tạo log thiếu. Các số kỹ thuật dưới đây
thuộc lần chạy trước bảo toàn; không phải kết quả đo lại.

Sau phê duyệt 15/11: [MySQL test tạm](MYSQL_TEST_PROPOSAL.md) đã chạy đủ
**254/254 test, 0 skip**, coverage backend **93,04%**; container/volume tạm đã
cleanup. Không sửa fixture hoặc logic backend. Eval sau thêm runner judge riêng
đã qua **86/86 test**; model/phạm vi/trần judge được ghi trong rubric và REPORT.
Judge live đã kết thúc 222/444 request: 181 pass, 24 fail, 17 no_data,
0 retry/429; kết quả này không phải test kỹ thuật hoặc nghiệm thu chất lượng.
[Bảng nhóm/phiếu tay](../backend/evals/scope/results/judge-combined-20261115/REVIEW.md).
Không dùng các số backend thiếu MySQL lịch sử bên dưới làm kết quả hiện tại.
Kiểm hash byte và `git hash-object --path`/`--no-filters` đã khớp với quy tắc
Git hẹp cho dữ liệu khóa. Chưa kiểm công cụ rà trên Linux (metadata dùng đường
dẫn Windows), chưa stage/commit dữ liệu gốc đang untracked.
Smoke chạy lại sau duyệt **qua**, exit 0, ở localhost:8010/5174: health,
frontend/proxy, capabilities, OpenAPI chat/lộ trình; không paid provider/readiness
hoặc kiểm luồng đăng nhập/SSE/thiết bị thật. Log `.artifacts/approved-final-smoke.log`.

Kết quả cuối và kiểm tra nhánh dùng chung nằm tại
[bàn giao prompt/thoại](PROMPT_VOICE_REVIEW_2026-11-15.md).
Lượt test/coverage frontend cuối chưa qua; các lần qua lịch sử bên dưới không
thay thế kết quả đó. Không sửa assertion/timeout hoặc phần từ vựng của tác vụ khác.

Từ `backend`: `..\.venv\Scripts\python.exe -m pytest evals/scope -q`;
`..\.venv\Scripts\python.exe -m evals.scope.review_available` chỉ đọc dữ liệu
đã lưu trong workspace/backup, kiểm hash và xuất bản rà riêng; không đọc key
hoặc gọi provider. Công cụ rà cần phục hồi raw private đúng hash; unit test judge
dùng fixture tổng hợp độc lập raw, không coi hai cách chạy là cùng một phép kiểm.
Không chạy `campaign --execute --resume` hiện tại: lịch xen kẽ mới mới là đề xuất.
Từ `frontend`: `npm.cmd run benchmark:vad` đã qua 23/23 test, 28 kịch bản × 2 mode.
[Screening và phiếu tay](../backend/evals/scope/results/available-review-20261114/REVIEW.md).

[Test Settings không ổn định và CPU profile](SETTINGS_TEST_INVESTIGATION.md):
không tăng timeout hoặc sửa assertion. [MySQL test tạm](MYSQL_TEST_PROPOSAL.md)
đã chạy sau phê duyệt như kết quả phía trên; fixture không tự kiểm host/port,
nên script preflight riêng đã kiểm các điều kiện cô lập trước khi chạy.
Smoke ở lần trước đã thử bằng `python scripts/manage.py smoke`, thất bại WinError 10061 ở
kết nối local; không tự bật app/DB. Smoke này chỉ health/capabilities/routes,
không thay kiểm đăng nhập/chat thật.

[Thiết kế onset chưa triển khai](VOICE_ONSET_DESIGN.md) và
[CSV 3 phút im lặng + 10 câu](VOICE_DEVICE_CHECKLIST.csv) dùng cho thiết bị thật.
Cần thử tay đăng nhập/đăng xuất, chat SSE/hủy/lưu, thoại mọi cờ tắt và các tổ hợp
A/B riêng, tai nghe/loa/echo/barge-in, lộ trình TOEIC bắt đầu/luyện/check/hoàn thành.
Không đánh dấu các luồng này đã qua vì unit test hoặc smoke OpenAPI qua.

## Bổ sung số đo STT và debug cục bộ — 14/11/2026

`measure.ts` thêm `sttRequestsPerMinute` (trên toàn phút audio),
`captureStateMs` (onset → endpoint/discard), số discard trước/sau STT và kết quả
từng capture không chứa PCM. Batch tính request ở endpoint; realtime tính một
phiên nhận dạng tại onset, không đếm từng frame WebSocket. Không mô phỏng retry
hoặc provider billing. `harness.test.ts` kiểm mẫu đóng, bị loại và còn mở.

`voiceDebug.test.ts` và test tích hợp trong `blaze.test.ts` kiểm allowlist console,
nhịp log, thời gian capture, reset phiên, threshold/fallback, số request thực tại
điểm gọi client, discard sau STT, và flag tắt không đọc diagnostics/không in log.
Không thay assertions cũ hoặc thuật toán quyết định VAD. Kiểm tay: bật
`VITE_VOICE_DEBUG`, Console Debug/Verbose, đo một phiên 60 s, Stop lấy snapshot
cuối; đếm request network tương ứng, không xuất audio hoặc nội dung transcript.


## Pha A/B VAD opt-in — 14/11/2026

- `transcriptGate.test.ts`, `VoiceChat.test.tsx`, `blaze.test.ts`: chữ rỗng/ký tự
  không phải lời nói không tạo lượt Gemini/tin nhắn; câu ngắn được giữ; lỗi dịch
  vụ/schema vẫn đi kênh lỗi; notice tự hết, Stop bỏ callback cũ; realtime bị loại
  không retry batch và đóng socket.
- `adaptiveVad.test.ts`, `blaze.test.ts`: ngưỡng thích nghi/hysteresis, câu 200 ms,
  pre-roll, đóng nhiễu đều, cap cho tiếng biến thiên; fallback init/runtime/reset
  giữ frame, không mở recognition trùng; mute/Stop xóa nền đã học, chen lời vẫn hủy.
- `npm.cmd run benchmark:vad`: oracle cũ vẫn được so chính xác, thêm report
  `.artifacts/voice-vad-adaptive.json` so EnergyVad với AdaptiveVad trên cùng
  28 kịch bản × 2 mode. Discard vẫn tính onset nhầm; speech bị discard vẫn tính
  bỏ sót. Không đổi nhãn hoặc bỏ mẫu thất bại để cải thiện số liệu.
- Chạy coverage frontend riêng với `npm.cmd run test:coverage -- --maxWorkers=1`
  khi máy chịu tải; không tăng timeout. Toàn bộ lint/test/coverage/build qua
  `python scripts/manage.py ...`; backend coverage vẫn là gate độc lập.
- Công tắc, kết quả từng mức SNR/RMS, hạn chế và bảng kiểm thiết bị:
  [VOICE_VAD_BASELINE.md](VOICE_VAD_BASELINE.md). Echo thật/AEC/AGC và âm phát vật lý
  chưa được kiểm chứng. C chỉ có [đề xuất đo](VOICE_OUTPUT_LEVEL_PROPOSAL.md).


## VAD: baseline ngoại tuyến, không đổi hành vi — 13/11/2026

Chạy từ frontend: `npm.cmd run benchmark:vad`. Cấu hình riêng và hướng dẫn WAV
có nhãn tại [VOICE_VAD_BASELINE.md](VOICE_VAD_BASELINE.md). Bộ đo không chạy trong
coverage mặc định, không dùng API trả phí, không ghi audio; chỉ ghi report gộp
trong `.artifacts/voice-vad-baseline.json`. Corpus giọng thật chưa được cung cấp.

Kết quả cập nhật 14/11: lint/build qua; frontend 427/427, benchmark 19/19;
coverage frontend chạy riêng `npm.cmd run test:coverage -- --maxWorkers=1` qua:
statements 89,58%, branches 81,85%, functions 85,77%, lines 92,79%.
Lượt coverage chạy đồng thời với build/benchmark có 3 timeout App, không tái hiện
khi chạy riêng; giữ nguyên timeout/assertion. Backend 230 qua, 24 skip do thiếu
database test; coverage 73,93% nên **lệnh coverage toàn repo chưa qua ngưỡng 80%**.

| Yêu cầu | Test/bằng chứng |
| --- | --- |
| Giữ nguyên VAD, kể cả pre-roll/cap/silence và reset | `voice/vad.test.ts`; đối chiếu frame với oracle cũ trong `benchmarks/vad/baseline.test.ts` |
| Câu trả lời ngắn không bị lọc theo số từ | `voice/blaze.test.ts`: Yes., Vâng, Sales từ 200 ms PCM tổng hợp, transcript double |
| Realtime giữ đầu câu và hủy sạch khi Stop | `voice/blaze.test.ts`: thứ tự pre-roll, socket/timer/AudioContext, bỏ final muộn |
| False onset, miss, echo, latency và WAV có nhãn | `benchmarks/vad/harness.test.ts`, `signals.ts`, `measure.ts`, `wav.ts` |
| Vòng đời hiện có, mute/unmount/barge-in/fallback | Toàn bộ test Blaze/RealtimeSTT/VoiceChat/capture/latency hiện có |
| Echo thật không tự ngắt, noise gate/notice/neural fallback | **Chưa chứng minh**; chờ duyệt pha mới và kiểm tay theo bảng trong thiết kế |

## Chính sách cuối và sinh trực tiếp — 13/11/2026

**95 test cấu trúc/offline qua** trước live; lint toàn repo qua và mypy
strict eval 15 source qua. Test xác nhận chỉ dòng chuyển hướng đổi so với
snapshot B, giữ version/các quy tắc trước/v6; mặc định VI không phụ thuộc
history, ngoại lệ yêu cầu rõ trả lời Anh (có/không dấu); cho phép ví dụ/câu
luyện Anh nhưng gắn cờ từ chối lặp song ngữ hoặc câu từ chối bị trộn.
Đây là thay đổi tiêu chí được người dùng duyệt, không ghi đè kết quả cũ.

Runner chỉ còn full: test CLI không có pilot/judge, plan đúng 744 v7 +306
v6, trần 2.100 request, khóa prompt trước sinh; HTTP fake kiểm ledger,
Retry-After, dừng 429, tối đa một retry 502, resume không replay orphan,
chặn đổi model/hash. Test engine dùng plan ngắn được inject chỉ trong
test, không có tùy chọn giảm/thay plan trong CLI paid. Mẫu 24 cũ giữ nguyên.
Corpus 248 giữ đầu vào; 10 case ngôn ngữ (kể cả B1 voice) kỳ vọng VI.

Không có live pilot mới. Full dừng theo 429 tại request 428, sau 426 slot:
422 phản hồi đã check tự động, 4 lượt cuối chưa có dữ liệu, 624 chưa chạy;
hai retry 502 thành công. Không tự resume. Phiếu 174 phản hồi sẵn có gồm
mọi 70 phản hồi có cờ và một chưa rõ; khung 411 dòng/137 case-version, đã
kiểm độc lập lấy mẫu ≥20% mỗi nhóm/phiên bản và ba dòng mỗi case.
54 file bảo vệ/mẫu 24 cũ còn nguyên hash; nguồn ghép prompt/checker/runner
không đổi trong lúc chạy. Không gọi judge; rubric là bản nháp duyệt riêng.
Coverage lịch sử chưa đạt 80% (HEAD 72,38%, thiếu MYSQL_TEST_URL), không
hạ ngưỡng; không chạy lại coverage/build/toàn bộ test app trong vòng này.

## B theo hội thoại — trước live 13/11/2026

**85 test cấu trúc/offline qua**: toàn bộ `evals/scope`, prompt scope và
voice identity. Test mới bao phủ chọn ngôn ngữ theo history, hòa/fallback,
trộn ngôn ngữ so với ví dụ trích dẫn, cổng 27/30, plan 30/1.050, fake HTTP,
ledger trước request, Retry-After, 429 dừng, 502 chỉ một retry (60 request),
resume không lặp orphan, metadata đổi bị chặn, khóa prompt trước full,
gate trượt không gọi full, và lấy mẫu tay. V6/238 case đầu nguyên vẹn;
sáu case cũ giữ đầu vào, chỉ rubric/kỳ vọng thay theo quyết định B.

Lint toàn repo qua (Ruff/Black/mypy/ESLint/TypeScript/Prettier); mypy strict
eval qua 13 source. Hai lỗi offline đầu đã sửa trước live: detector bỏ sót
"Let's practice" và exporter cũ so hint với fixture thay vì kỳ vọng đã
tính theo history, khiến đếm ngôn ngữ bị trùng. Không hạ assertion/ngưỡng.
Audit lịch sử tắt ngoại lệ B để không đổi ngược kết quả cũ.

Live nhỏ B đủ 30 phản hồi/30 request, 0 retry/lỗi; đúng ngôn ngữ 18/30
(60%), voice 12/12 ≤45 từ (24–33). Sáu cờ trộn thô; đọc nội dung thấy hai
câu chuyển hướng Anh xen Việt và bốn false positive trên mẫu câu học tập.
Không chỉnh checker sau vòng không đạt; cờ thô và nhận định rà tách riêng
trong artifacts. Gate dừng, full/judge/Blaze bằng 0, không tạo PROMPT_LOCK.
Phiếu tay 27 lượt/9 case; mẫu 24 cũ và 43 file bảo vệ còn nguyên hash.

Runner `campaign` opt-in ngoài default test/coverage, không có judge.
Kết quả paid/gate và bộ trần được ghi trong REPORT, metadata từng stage.
Không chạy lại coverage trong vòng này; HEAD sạch 72,38%, workspace 73,93%,
thiếu MYSQL_TEST_URL có trước, vẫn chưa đạt 80%; không hạ ngưỡng.

## Vòng sửa ngôn ngữ duy nhất — 2026-11-13

Trước live, bộ test cấu trúc/offline mục tiêu có **67 test qua**:
`evals/scope/test_language_live.py`, `test_runner.py`,
`test_screening_recovery.py`, `tests/unit/test_prompt_scope.py` và
`test_voice_identity.py`. Thêm kiểm tra biên 14/18 → chỉ đề xuất B,
15/18 → giữ A, unknown không được điểm, chạy thiếu phải dừng; SCREENING
giữ nguyên dòng vật lý đầu tiên của đủ 18 phản hồi và tách các lượt trộn.
Test prompt khóa đúng hai dòng được duyệt, phần còn lại không đổi, giới
hạn 6.500 byte và v6 nguyên hash.

`python scripts/manage.py lint` qua (Ruff, Black 102 file, mypy 90 source,
ESLint/TypeScript/Prettier); mypy strict riêng eval qua 11 source. Lần lint
đầu bắt một đường dẫn test dài 90 ký tự, đã ngắt dòng và chạy lại qua.
Runner vẫn opt-in ngoài make test/coverage; không sửa checker hoặc case.
Không chạy lại coverage trong vòng sửa này; mức nền/điều kiện MySQL đã
ghi ở REPORT, không thay ngưỡng 80%.

Live vòng sửa đủ 18 phản hồi/18 request, không retry/lỗi/chưa có dữ liệu;
0 Anh, 18 vi, 0 unknown theo checker, 9/9 voice ≤45 từ (14–33 từ). Theo
quy tắc chốt trước, chỉ đề xuất diff B và dừng, chưa áp dụng. Không thêm
lượt gọi sau vòng này. SCREENING gốc vẫn tách hai unknown A1-voice lần 1/3;
mẫu 24 lượt nguyên byte, không dùng các kết quả này thay chấm tay ngữ nghĩa.

## Runner live bước 1 — 2026-11-13

- `evals/scope/test_language_live.py`: 13 test offline với MockTransport,
  gồm 18 request thành công, một retry 502, hard cap 36 khi lỗi cả 18 vị trí,
  dừng 429, Retry-After số/HTTP-date, delay dài phải pause, resume không lặp
  request chưa rõ kết quả, chặn metadata/model mới và che key/body upstream.
- Tổng mục tiêu 64 qua; runner mới được chạy lại riêng 13 qua sau phần xuất
  SCREENING Markdown. Ruff/Black và mypy strict eval 11 source qua.
- Live thật đúng 18 reply/18 request, 0 retry/provider error. Ngôn ngữ 0 en,
  16 vi, 2 unknown; voice 9/9 ≤45 từ. Chỉ là hình thức, không chấm ngữ nghĩa.
  Model/ngày/hash cùng artifacts ở REPORT. Chưa chạy full/judge/Blaze, mẫu
  24 lượt/prompt/case cũ giữ nguyên.
- Lint/build dự án qua. Backend 230 qua/24 MySQL skip; coverage 73,93%, vẫn
  fail ngưỡng 80%. Frontend mặc định 416 qua/1 timeout 5 giây ở test App
  khôi phục voice/speed; chạy lại đủ với `--maxWorkers=1` được 417 qua/35 file.
  Không sửa source/timeout/assertion; nguyên nhân timeout chưa xác định.

## Chính sách A cho lời từ chối — 2026-11-13

- Test prompt xác nhận chỉ một dòng đổi, có `reply in the language of the
  latest message`, tiếng Anh đơn giản theo level, không còn `learner's language`.
  Giữ v6/hash và giới hạn 5.600 byte.
- Corpus 244 case; test đối chiếu prefix 238 case với snapshot trước A.
  Sáu case mới phủ A1/B1/C1 × text/voice, history Việt và yêu cầu Anh; checker
  vẫn gắn cờ lời đáp Việt và không gắn cờ lời đáp Anh.
- Test vòng retry dùng fake plan để kiểm trần/độ trễ; test guard thực riêng
  từ chối prompt/corpus mới cho chiến dịch cũ trước khi tạo client/provider.
  Mẫu 24 lượt và artifacts trước A giữ nguyên; không gọi Gemini hoặc chạy
  bộ đầy đủ trong bước này.
- **51 test mục tiêu qua**; lint toàn dự án và mypy strict riêng eval 9 source
  qua. CLI default xác thực corpus 244 case ngoại tuyến, không đọc key/gọi mạng.

## Checker voice chỉ chặn trên — 2026-11-13

- Test biên 0/1/19/20/45 từ không bị cờ độ dài, 46 từ bị cờ khi mode voice;
  mode text không bị cờ voice. Metadata min 20 vẫn giữ trong case, không áp.
- Test audit kiểm còn đúng 6 cờ v6 (safety 3, drift 1, hồi quy 1, mixed 1),
  0 cờ v7; 12 lượt dưới 20 từ được gỡ đúng ID. Kiểm 10 cờ out_of_scope,
  ngôn ngữ en → vi và nguyên dòng đầu code ở lượt 46; mẫu/data gốc bất biến.
- Chỉ tính lại ngoại tuyến, không chạy bộ 238 case. Coverage HEAD 72,38%
  trong điều kiện MYSQL_TEST_URL thiếu từ trước; không hạ ngưỡng 80%.
- **48 test mục tiêu qua**, Ruff/Black và mypy strict eval 9 source qua.
  Lint/test/build dự án qua: 229 backend/24 MySQL skip, 417 frontend/35 file.
  Coverage vẫn **73,93%, fail 80%**; đối chiếu snapshot 12/11 và 13/11 khớp
  từng dòng/nhánh, chưa giải thích số 73,98% cũ. REPORT có bằng chứng JSON.

## Audit screening, retry giới hạn và HEAD sạch — 2026-11-12

- `backend/evals/scope/test_screening_recovery.py` kiểm câu ngắn/unknown,
  Việt không dấu, từ Anh trong lời giải thích Việt, trích dẫn Việt trong câu
  Anh; giữ khoảng voice 20–45 từ. Audit không sửa corpus/prompt/phiếu/mẫu.
- Test fake xác nhận đúng bốn retry, delay 10 giây trước mỗi request, dừng
  ở lỗi đầu/giữa, không chạy lại output cũ; đổi model bị chặn trước request,
  CLI mặc định không đọc key. Test audit kiểm dữ liệu/mẫu gốc bất biến.
- Tổng nhóm mục tiêu 43 qua; Ruff/Black và mypy strict eval 9 source qua.
  Lint/test/build dự án qua: 229 backend/24 MySQL skip, 417 frontend qua.
  Coverage workspace lần đo này **73,93%**, vẫn fail ngưỡng 80%.
- HEAD `e509722` worktree sạch, import app từ worktree, cùng virtualenv và
  thiếu MYSQL_TEST_URL: **210 qua/24 MySQL skip, coverage 72,38%**. Lần đầu
  sandbox lỗi quyền tmp không được dùng; lần ngoài sandbox không lỗi test.
  73,98% ghi trước đó là workspace, không phải mức nền HEAD. Không hạ ngưỡng.
- Pilot giữ 116 reply + 4 HTTP 502 chưa có dữ liệu; bốn retry riêng đều có
  reply, chưa chấm ngữ nghĩa. Bảng và ID từng cờ ở REPORT. Mẫu 24 lượt giữ
  nguyên; chưa chạy 238 case, không LLM-judge, không kết luận v7 tốt hơn v6.

## V7 sửa tại chỗ trước pilot phân tầng — 2026-11-12

- 28 test mục tiêu cuối qua: 16 test cấu trúc prompt, 4 voice identity
  và 8 test runner ngoại tuyến. Có kiểm preamble v7 giữ nguyên, hash v6 bất
  biến, phiên bản 7, bốn bổ sung mới và kích thước ≤5.600 byte theo yêu cầu.
- Corpus 238 case: 210 cũ so sánh nguyên vẹn với snapshot, thêm 28 case theo
  nhóm. Pilot 20 ID xen kẽ, phủ 12 nhóm/phase 0–4; fake xác nhận trần 120 lượt,
  không retry và CSV chấm tay. Kiểm mypy strict riêng 6 source eval qua.
- Không dùng phản hồi fake để chứng minh danh tính/phạm vi; chấm ngữ nghĩa
  vẫn do người dùng/giáo viên. Kết quả thực ở `backend/evals/scope/REPORT.md`.
- Sau khi thêm kiểm thử tiếp tục ledger: **28 test mục tiêu qua**, gồm 8 test
  runner. Lint/build toàn repo qua; test đầy đủ 229 backend qua/24 MySQL skip,
  417 frontend qua. Coverage backend 73,98% chưa đạt 80%, không hạ ngưỡng.
- Pilot đã thử đủ 120 vị trí, có 116 phản hồi và 4 lỗi HTTP 502; mỗi phiên bản
  58/60. Không retry vị trí lỗi, không vượt trần, có phiếu chấm 120 dòng và mẫu
  24 lượt. Ngữ nghĩa chưa chấm; screening ngôn ngữ/voice chưa đạt ngưỡng.

## Prompt scope v7 — 2026-11-11

- `tests/unit/test_prompt_scope.py` kiểm phiên bản, hash v6, kích thước v7, ghép
  persona/lesson/JSON/voice đúng thứ tự ở phase 0–4, không checks trong prompt,
  history riêng, evaluation version và native voice context. Dùng repo doubles
  và LLM ở `tests/fakes.py`, không gọi API thật.
- Integration Gemini transport kiểm v7/SCOPE ở text/native; test MySQL chỉ
  chạy khi có `MYSQL_TEST_URL` trỏ schema `_test` riêng.
- Eval 210 case không được mặc định thu thập; coverage chỉ source `app/`.
  Test runner ngoại tuyến chạy riêng bằng `python -m pytest
  evals/scope/test_runner.py` từ backend. Runner không chạy trả phí khi thiếu
  `--execute`, dừng khi lỗi và không ghi đè kết quả.
- Truy vết SCOPE-01–05 → corpus/rubric/test cấu trúc/phiếu chấm tay tại
  [eval scope](../backend/evals/scope/README.md). Kết quả thực, tỷ lệ và giới hạn
  xem [báo cáo](../backend/evals/scope/REPORT.md), không suy từ output fake.

## Đổi lớp trình bày theo ảnh duyệt — 2026-11-11

- Chỉ năm CSS thay đổi; manifest SHA-256 xác nhận TS/TSX/JS, backend và tài
  nguyên logo/linh vật giữ nguyên so với snapshot đầu tác vụ.
- Kiểm tra theo nhóm: 76 test workspace/chat/sidebar/voice qua; 23 test
  đăng nhập/OAuth/landing qua; lint/type-check/build qua.
- Lượt cuối chạy riêng: **35 file, 417/417 test frontend qua**; coverage
  statements **89,56%**, branches **81,73%**, functions **85,74%**, lines
  **92,78%**; đạt cả bốn ngưỡng 80%.
- Lượt chạy đồng thời trước đó có ba test lỗi thời gian chờ; giữ nguyên test,
  timeout và assertions, chạy lại toàn bộ riêng đã qua.
- 120 ảnh responsive đa màn hình và 8 ảnh lớp học/welcome bổ sung, cả sáng/tối;
  không có Runtime exception hay cảnh báo/error qua console API trong các lượt
  thành công. Browser dùng fixture cô lập, không gọi API AI tính phí hoặc ghi
  dữ liệu ứng dụng thật.
- Frontend Docker build lại, healthy; smoke HTTP/proxy/OpenAPI qua. Mã CSS mới
  được phục vụ; hash Mate SVG qua HTTP trùng file gốc.
- Hợp đồng 22 nhóm chức năng, file sửa, giới hạn và rollback:
  [UI_REFRESH_2026-11-11](UI_REFRESH_2026-11-11.md).

## Tự ẩn thông báo lỗi thoại — 2026-11-11

- `frontend/src/voice/VoiceChat.test.tsx`: bổ sung 6 ca kiểm thử bằng fake timers
  cho VOICE-ERROR-01/02. Xác nhận thông báo còn ở 4.999 ms và mất ở 5.000 ms;
  lỗi mới hoặc lỗi lặp cùng nội dung được tính lại đủ thời gian.
- Kiểm tra lỗi bắt đầu phiên, nhãn trạng thái lỗi cùng biến mất, nút bắt đầu
  lại vẫn khả dụng, phiên đang nghe không bị dừng và timer được hủy khi unmount.
- Trước sửa: 6 test mới trượt, 16 test cũ qua. Sau sửa: 22/22 qua.
- Toàn frontend: 35 file, 417 test qua với `npm run test:coverage -- --maxWorkers=1`.
  Coverage statements 89,56%, branches 81,73%, functions 85,74%, lines 92,78%;
  đạt cả bốn ngưỡng 80%.
- Lint/type-check/format toàn repo, production build frontend và HTTP smoke qua.
  Frontend Docker đang chạy phục vụ source mới với thời gian 5.000 ms.
- Test dùng session doubles, không cấp quyền microphone hoặc gọi AI tính phí.

```powershell
cd frontend
npm run test -- src/voice/VoiceChat.test.tsx
```

## Facebook đăng ký/đăng nhập trên Docker — 2026-11-06

- `backend/tests/unit/test_oauth.py`: 13 test qua. Mở rộng callback và kiểm tra
  thiếu cấu hình cho cả Google/Facebook; SQL trong bộ nhớ xác nhận đăng ký lần
  đầu tạo một tài khoản/hồ sơ/liên kết, lần sau giữ PublicId, tạo phiên mới và
  từ chối email trùng hoặc tài khoản disabled.
- Backend toàn bộ: **213 passed, 24 skipped**; coverage tổng hợp **72,43%**,
  chưa đạt 80% do chưa chạy integration trên schema MySQL test riêng.
- `AuthForm.test.tsx` bổ sung luồng Facebook ở cả đăng nhập/đăng ký khi các ô
  tài khoản local còn trống. `socialAuth.test.ts` kiểm tra đúng endpoint Facebook,
  đích popup và loại bỏ message sai origin/source/provider/state trước khi lưu phiên.
- Frontend toàn bộ với coverage: **405 passed, 6 timeout** ở `App.test.tsx`
  trong lượt chạy đồng thời với build/lint, chưa có kết quả coverage toàn bộ
  thành công cho lượt này. Sau khi build/lint hoàn tất, chạy riêng
  `App.test.tsx`, `AuthForm.test.tsx`, `api/socialAuth.test.ts`: **65/65 qua**,
  gồm cả sáu test từng timeout. Giữ nguyên timeout 5000 ms và assertions.
- Build TypeScript/Vite trong Docker, lint/type-check/format và HTTP smoke qua.
- Sau khi người dùng điền App ID/App Secret vào `.env`, recreate hai dịch vụ:
  backend/frontend healthy; POST `/api/auth/oauth/facebook/start` qua frontend
  trả **200**, authorize host `www.facebook.com`, callback đúng
  `http://127.0.0.1:5174/api/auth/oauth/facebook/callback`, có cookie HttpOnly
  và scope `email,public_profile`. Không in credential, state hoặc cookie.
- Kiểm tra schema chỉ đọc xác nhận có bảng `engmate_oauth_identities` và
  `NguoiDung.PasswordHash` cho phép NULL. Không chạy migration/ghi tài khoản
  trên database đang dùng; provider exchange và cấp quyền Meta thật do người
  dùng tự hoàn tất. HTTP 200 ở `/start` chưa chứng minh App Secret hợp lệ với Meta.

## Liên kết Google sau xác nhận mật khẩu — 2026-10-30

- 29 tests OAuth/mật khẩu/JWT backend qua; 76 tests frontend App/AuthForm/socialAuth/database qua. Không dùng credential thật trong kiểm thử tự động.
- SQL trong bộ nhớ xác nhận mật khẩu sai không tạo binding/session, lỗi issue session rollback binding, mật khẩu đúng dùng lại PublicId cũ, và User/LearnerProfile/learning progress giữ nguyên. Google đăng nhập lại sau liên kết dùng đúng tài khoản.
- Route tests xác nhận callback chưa cấp token khi cần liên kết; phải có đúng Origin và cookie browser, ticket một lần/hết hạn, không được gửi subject/email/UserId tùy ý. Frontend kiểm tra xác nhận, hủy và phản hồi mật khẩu sai.
- Coverage **phạm vi OAuth backend**: 93,24% gồm branches theo cấu hình dự án. Coverage **phạm vi AuthForm/socialAuth frontend**: statements 88,52%, branches 87,64%, functions 92,85%, lines 90,05%; không phải coverage toàn dự án. Lint/type-check/format toàn repo và Vite build qua.
- Đã restart riêng backend Docker local. Kiểm tra HTTP xác nhận endpoint `/api/auth/oauth/google/link` có mặt, frontend phục vụ form mới và request không có Google proof bị 400. Chưa xác nhận mật khẩu hoặc tạo binding trên tài khoản thật; bước này do người dùng tự thao tác.

## Cấu hình Google local — 2026-10-29

- Sau khi chuyển credential người dùng vào `.env` và recreate backend Docker,
  POST `/api/auth/oauth/google/start` qua frontend trả 200, authorize host là
  accounts.google.com, redirect URI đúng `http://127.0.0.1:5174/api/auth/oauth/google/callback`.
  Cookie flow được đặt; bảng liên kết đã có trong database Docker đang dùng.
- Đây là kiểm tra mở đầu luồng thật, chưa chứng minh token exchange/cấp quyền
  Google và tạo session hoàn tất. Không tự thao tác mật khẩu/đồng ý quyền Google.

## OAuth Google/Facebook — 2026-10-29

- `backend/tests/unit/test_oauth.py`: 8 tests qua, gồm state/cookie/provider/expiry/replay, Google verified email, Facebook app/subject, callback CSP/origin, hủy và GitHub không hỗ trợ. SQL trong bộ nhớ kiểm tra account/profile/binding/session cùng transaction, đăng nhập lại, email trùng và tài khoản disabled.
- `frontend/src/api/socialAuth.test.ts` và `AuthForm.test.tsx`: 13 tests qua, gồm popup bị chặn/hủy, thiếu cấu hình, URL authorization đúng nhà cung cấp, lọc origin/source/state, lưu session và chỉ hai nút nền tảng.
- Không dùng credential thật, không chạy installer OAuth hoặc ghi database người dùng. Kiểm thử provider thật còn chờ cấu hình trong OAUTH_SETUP.
- Hồi quy frontend toàn bộ: 402 qua, một test preview quá hạn chờ heading; chạy lại riêng file preview giữ nguyên assertion: 10/10 qua. Lượt coverage frontend đó không hoàn tất thành công, chưa báo đạt ngưỡng. Backend ngoại tuyến: 208 qua, 24 integration MySQL bỏ qua; coverage 71,79%, chưa đạt 80% khi thiếu DB test riêng, không giảm ngưỡng.
- Ruff/Black/mypy, ESLint/TypeScript/Prettier và bản dựng Vite đã qua. Sau khi bổ sung xử lý DB mất kết nối, 8 tests OAuth chạy lại đều qua. Giao diện fixture đã xác nhận chỉ có Google/Facebook; chưa xác thực provider thật.

## Sidebar chỉ đổi kích thước bằng nút menu — 2026-10-29

- 10/10 kiểm thử sidebar qua: sau khi thu gọn, hover và focus không mở lại; click nút mở/thu gọn cập nhật đúng data-expanded và aria-expanded. Giữ kiểm thử drawer, focus trap và điều hướng trên mobile.
- CSS mở chiều rộng/nhãn chỉ phụ thuộc data-expanded, không còn selector hover/focus-within cho sidebar. Các mô tả mở tạm bằng hover/focus ở nhật ký cũ được thay thế bởi yêu cầu này.

## Hồi quy sidebar che nội dung — 2026-10-29

- 10/10 tests WorkspaceSidebar qua. Đo trực tiếp trên trình duyệt: sidebarRight = contentLeft = 72px khi đóng và 240px khi mở (cả ghim và mở tạm). Ảnh `.artifacts/ui-sidebar-no-overlap.png`.
- Các số đo rail 72px/inner 240px trong mục lịch sử bên dưới là hành vi cũ đã bị thay thế, do gây che nội dung.

## Ba lỗi chồng lớp theo ảnh bổ sung — 2026-10-29

- AuthForm, ProfilePage và WorkspaceSidebar: **24/24 tests** qua; gồm hiện/ẩn mật khẩu bằng bàn phím, upload avatar và các trạng thái pin/focus của sidebar.
- Kiểm tra trình duyệt fixture: input file có opacity 0, clip-path inset(50%); sidebar đóng rail/inner 72px, mở tạm rail 72px và inner 240px. Nút mật khẩu đổi đúng tên Hiện/Ẩn và không còn chữ trùng biểu tượng.
- Ảnh mẫu: `.artifacts/ui-profile-overlap-fixed.png`, `.artifacts/ui-password-toggle-fixed.png`. Không upload ảnh hoặc lưu hồ sơ thật. Quy tắc `::-ms-reveal` đã thêm cho Edge; chưa chạy trực tiếp phiên Edge của người dùng.

## Hoàn thiện sau rà soát ngày 2026-10-29

- Hồi quy tự động: tìm không dấu/bộ lọc, mở bài và giữ mã thử lại, ôn trực tiếp, lỗi từng nguồn dữ liệu, tổng kết TOEIC tại Hồ sơ/Cài đặt, thư viện và nút quay lại bài đang học, lưu/khôi phục giảm chuyển động, OAuth không khả dụng, hiện mật khẩu bằng bàn phím.
- Các assertion thông báo mạng được cập nhật theo thông báo công khai mới, không hiển thị lỗi nội bộ. Test đăng ký chờ thao tác xác thực kết thúc trước khi đổi chế độ; giữ kiểm tra khóa thao tác trong lúc chờ.
- Kết quả frontend: **396/396 tests, 34/34 files** qua. Coverage: statements **89,61%**, branches **81,65%**, functions **85,64%**, lines **92,86%**; giữ ngưỡng 80% cho cả bốn chỉ số. Lệnh: `node node_modules/vitest/vitest.mjs run --coverage --testTimeout=20000 --hookTimeout=60000 --maxWorkers=1`. Tăng thời gian nạp mô-đun vì lần coverage trước vượt hook 10 giây; không thay assertion hoặc bỏ test.
- Ruff/Black/mypy backend và ESLint/TypeScript/Prettier frontend đều qua. Bản dựng Vite thành công; fixture kiểm tra không nằm trong output production.
- Fixture trực quan: chạy Vite ở cổng riêng `5175`, mở `/tests/ui-audit.html`. Các tham số: `theme=dark`, `screen=auth|landing` (mặc định workspace), `width=320|390|1024`, `height=360|700`, `error=plan|progress|catalog`. Iframe tạo viewport thật theo kích thước; mọi fetch được trả bằng dữ liệu mẫu hoặc 503, không chuyển tiếp API. Không đưa fixture vào bản dựng production.
- Đã quan sát 1280×720 (tối): hội thoại, thư viện dài và sidebar cố định khi cuộn, trang Tiến độ và chuyển trang về đầu. Đã quan sát 390×700 (sáng): hội thoại, menu và thư viện; 320×700 (tối): đăng nhập/đăng ký và ba nút nền tảng cùng hàng. Phát hiện và sửa CSS đăng ký ghi đè chiều cao phần trang trí.
- Backend offline: 200 qua, 24 kiểm thử MySQL được bỏ qua do không cung cấp database test riêng. Coverage 68,93%, chưa đạt ngưỡng 80% khi thiếu integration MySQL; không giảm ngưỡng. Không thực hiện kiểm thử trên database người dùng.
- Đã kiểm tra thêm viewport 390×360: thu gọn trang trí, lời chào và ô nhập vẫn nằm trong vùng hiển thị. Bàn phím ảo trên thiết bị thật và speech/provider thật chưa được nghiệm thu trong tác vụ này.
- Đo DOM desktop khi sidebar bỏ ghim và đang mở tạm: rail vẫn rộng 72px, nội dung bắt đầu ở x=72; mở tạm không làm đẩy nội dung. Ảnh nghiệm thu dữ liệu mẫu lưu tại `.artifacts/ui-after-lessons.png` (không commit).

## Hồi quy bố cục ngày 2026-10-29

- `ThemeToggle.test.tsx`: nhãn Giao diện nằm trong nút điều hướng; nhấn nhãn đổi theme và lưu lựa chọn như trước.
- Chạy lại AuthForm, WorkspaceSidebar và App tests; đồng bộ nhãn Bài học/Tiến độ sau lần tách trang, giữ kiểm tra binding/voice và dữ liệu từ vựng.
- Đã kiểm tra trực quan hàng ba nút nền tảng trên trang đăng nhập local. Hình học sidebar sau đăng nhập và speech thật cần kiểm tra thêm trên phiên người dùng; không đăng nhập hoặc ghi dữ liệu thật trong kiểm thử.

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
