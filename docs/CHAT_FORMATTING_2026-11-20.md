# Pha 3 — hiển thị tin nhắn và văn bản TTS, 20/11/2026

## Cổng 3 cuối / Agent P / 2026-11-20

Commit tính năng: `5676c7e5321b658ff828cf2d40e21d66a7d7aaa7`; hook backend/frontend đã chạy hết và PASS.
Các cổng frontend cuối đều xanh. Các mục dưới phần này lưu lịch sử những lần
dừng trước, không phải trạng thái hiện tại. Chưa merge/push hoặc eval/smoke thật.

### Lỗi App: điều đã xác định và giới hạn nguyên nhân

Thông báo thật là **Test timed out in 5000ms**, tại `App.test.tsx:1183:3`;
lượt tái hiện mất 5645 ms, không phải lỗi assertion payload/cache. Test mock
toàn bộ `speech/audio` ở `App.test.tsx:113–117` và adapter Blaze, nên nhánh
TTS/cache production mới không chạy trong ca này. Tuy nhiên không thể loại
trừ mọi ảnh hưởng của component hiển thị mới từ bằng chứng mock đó. Worktree
HEAD ba lượt đều đạt: **chưa xác định nguyên nhân gốc và chưa chứng minh lỗi
có sẵn**, không gán nhãn flaky hoặc coi hai lượt full xanh là đã sửa timeout.

| Lượt theo đúng thứ tự | Kết quả | Thời gian ca Settings |
| --- | --- | --- |
| Test riêng đầu, verbose | PASS | 3377 ms |
| Chạy lại riêng 1 | FAIL: timeout 5000 ms | 5645 ms |
| Chạy lại riêng 2 | PASS | 2451 ms |
| Chạy lại riêng 3 | PASS | 2269 ms |
| Cả App.test.tsx | 44/44 PASS | 866 ms |
| Full không bail | 506/506 PASS, 44 file, 148,40 s | 1593 ms |
| Worktree HEAD lượt 1 | PASS | 3350 ms |
| Worktree HEAD lượt 2 | PASS | 3170 ms |
| Worktree HEAD lượt 3 | PASS | 2695 ms |
| Full không bail cổng cuối | 506/506 PASS, 44 file, 153,98 s | Xem log verbose |

Worktree detached đúng `9c8d43eb11b55bfb36df1498e6d9652e12b23582`, dependency
junction tới bản đã cài, không install/network; file App test bằng byte bản
chính, test/config/timeout không đổi. Đã gỡ junction rồi `git worktree remove`,
kiểm hash mọi file frontend/src trước/sau không đổi. Không stash/reset/clean.
Log riêng ở `.artifacts/chat-format-20261120/investigation/` (ignored):
single-1 đến single-4, app-file, full, baseline-1 đến baseline-3, full-final.

### Đối chiếu luồng Settings/TTS

- `settings/VoiceSettings.tsx:14–17`: hai câu mẫu; preview gọi docVanBan tại
  dòng 244. Ca App đang xét chọn giọng/tốc độ rồi nghe reply, không bấm nghe mẫu.
- `speech/preferences.ts:61–65`: dataset giọng/tốc độ; persist/restore không đổi.
  `Chat.tsx:418` vẫn truyền raw message.content và rate=1 vào docVanBan.
- Pha 3 thêm `assistantSpeechText` ở `speech/audio.ts:50`, trước ngôn ngữ,
  text.trim/payload và khóa JSON tại các dòng 84/139/207. Không đổi công thức
  speed, speaker_id hoặc eviction/TTL/cancellation. Với hai câu mẫu và
  `[Mock/A2] Hello`, nội dung/payload/key không đổi vì không có markup cần bỏ.
- Hàm cũng được dùng ở payload voice/blaze và extraction voice/spokenText;
  receipt vẫn tính raw Unicode. Những adapter này được mock trong App test.
- Không sửa mã nào để chữa lỗi App trong lượt điều tra. Sửa fixture Response/Blob
  đã được duyệt ở lượt trước, test mới hiện đạt đủ payload/language/cache.

### Kiểm chứng cuối, audit và ảnh

- Prettier toàn frontend PASS; ESLint --max-warnings 0 PASS; tsc --noEmit PASS;
  build tsc + Vite PASS, Vite 8,54 s. Không đo coverage mới.
- Mọi yêu cầu `**`/`*`/`#`, số mục, dòng trống, stream dở, XSS script/HTML, tiếng Việt,
  30 mục gọn, TTS sạch và receipt Unicode đều có test mới; cả 506 ca đã chạy hết.
- Utility đổi từ assistantText.ts sang formatAssistantText.ts, giữ nguyên byte
  nội dung; cập nhật năm import, giữ AssistantText.tsx. Quét 188 file frontend
  (gồm test/CSS, bỏ generated/dependency) không có cặp basename cùng thư mục
  chỉ khác hoa/thường, không còn import utility cũ.
- Cached audit commit tính năng: đúng 11 đường dẫn, UTF-8 không BOM/U+FFFD,
  git diff --cached --check sạch; 0 hit heuristic key/private-key/JWT/
  credential URL/đường dẫn cá nhân. Heuristic không chứng minh mọi bí mật đều
  vắng mặt. Không stage 15 untracked cũ hoặc artifact riêng.
- SHA-256 v7 giữ nguyên:
  `e75a86fdad0368dd343d04215859b8bcb52658d9699b6cd9a18f6deb0e722680`;
  lesson.v1, voice-identity.v1, .gitattributes cũng khớp hash được bảo vệ.

| Ảnh component thật độc lập | Kích thước |
| --- | --- |
| [Sáng desktop](assets/chat-format-20261120-light-desktop.png) | 1440×1080 |
| [Tối desktop](assets/chat-format-20261120-dark-desktop.png) | 1440×1080 |
| [Sáng mobile](assets/chat-format-20261120-light-mobile.png) | 390×844, khung CSS 390 px |
| [Tối mobile](assets/chat-format-20261120-dark-mobile.png) | 390×844, khung CSS 390 px |

Ảnh dùng component thực render từ source và CSS riêng; v7/v8 chỉ là dữ liệu
mẫu, không phải kết quả sinh mới. Đã xem bốn ảnh, chụp lại mobile để bỏ cắt
ngang do giới hạn viewport Edge headless. Không mở cổng; chưa kiểm full app
đăng nhập, animation stream hoặc audio thật trên thiết bị mobile.

### Còn lại và rủi ro

- Timeout đã có một lượt tái hiện chưa giải thích nguyên nhân gốc; baseline
  không tái hiện trong ba lượt. Không tuyên bố đây là lỗi baseline/flaky.
- Bộ làm sạch là quy tắc text gọn, không phải parser Markdown đầy đủ; dấu sao
  hoặc backtick mang nghĩa literal cũng có thể bị bỏ trong text assistant.
- Không sửa TutorWorkspace/vùng V/test cũ/prompt/khóa byte/artifact eval.
  V8 **chưa eval/smoke thật**; kết quả eval v7 không áp dụng v8, chưa merge.
  Smoke và merge cần người dùng quyết định riêng; không tạo/chạy smoke script.


## Kiểm lại Cổng 3 sau duyệt fixture — 20/11/2026

Trạng thái hiện tại: **DỪNG tại test App cũ, chưa stage/commit**. HEAD vẫn
`9c8d43eb11b55bfb36df1498e6d9652e12b23582`. Các mục sau lưu điểm dừng trước.

- Chỉ sửa fixture trong test mới `speech/audio.formatting.test.ts`: response
  mock có `ok: true`, `blob()` trả trực tiếp `Blob(['fixture'],
  { type: 'audio/mpeg' })`. Blob có dữ liệu và MIME bắt đầu bằng `audio/`,
  khớp điều kiện tại `audio.ts:112–113`. Không sửa thêm mã sản xuất, test cũ,
  assertion payload/ngôn ngữ/cache hoặc timeout.
- Đã kiểm heavy.lock không tồn tại rồi chạy toàn bộ Vitest với cấu hình cũ,
  `--bail=1 --reporter=json`, ngoài sandbox vì esbuild từng bị spawn EPERM.
  Test fixture mới **PASS**, gồm assertion payload đã bỏ markup và dùng chung cache.
- Lệnh full-suite exit 1: **240 passed, 1 failed**, và **9 assertion pending**
  trong chi tiết JSON do bail. Summary cấp cao ghi numTotalTests=250 và
  numPendingTests=0, không khớp số pending trong assertionResults; báo cáo dùng
  số chi tiết và không xem các ca chưa chạy là đạt. Suite dừng trước khi hoàn tất,
  không suy ra tổng số test đầy đủ từ 250 ca đã được báo cáo.
- Test lỗi: `App.test.tsx:1183`,
  `conversation-only application shares saved Settings voices and speed with chat
  and restores them after signing in again`, duration 5266.162 ms. JSON ghi
  `Error: STACK_TRACE_ERROR`, không ghi chẩn đoán nguyên nhân cụ thể. Chưa kết luận
  là timeout, flaky baseline hay lỗi production; không tự sửa hoặc chạy lại.
- Log/JSON tại `.artifacts/chat-format-20261120/fixture-approved/`:
  `test-all.log`, `vitest-all.json`. Báo cáo JSON có đường dẫn workspace cục bộ,
  chỉ giữ trong artifact ignored, không stage.
- DỪNG theo điều kiện lỗi thật trước đó. Chưa chạy tiếp build/Prettier/ESLint/tsc
  trong lượt fixture này; lượt trước Prettier/ESLint/tsc đã đạt nhưng không thay
  cho kiểm chứng mới. Chưa ảnh sáng/tối desktop/mobile, coverage, cached audit,
  stage/commit/hook, CHANGELOG/DECISIONS/TESTING. Chưa có commit mới.
- Chờ duyệt điều tra chỉ đọc lỗi App hiện có và hướng kiểm lại; chưa có căn cứ
  đề xuất thay production hoặc nới timeout/assertion. Không mở cổng/API/smoke,
  không sửa TutorWorkspace/vùng V/prompt/khóa/artifact eval, chưa merge/push.
  V8 chưa eval/smoke thật; kết quả eval v7 không áp dụng cho v8.

## Kiểm lại Cổng 3 sau duyệt đổi tên — 20/11/2026

Trạng thái hiện tại: **DỪNG tại lỗi Vitest mới, chưa stage/commit**; HEAD vẫn
`9c8d43eb11b55bfb36df1498e6d9652e12b23582`. Phần bên dưới lưu điểm dừng trước.

- Trước đổi tên, xác nhận mỗi tên `assistantText.ts`, `AssistantText.tsx` có
  đúng một file trên đĩa, nội dung khớp bản nháp đã báo cáo. SHA-256 tương ứng:
  `28bc613108cd51d9e428b420a864cb3bd5c6548b991fe660ce39a2e5f3d0fddc`
  và `3da98aa981eb1af35d3a5a9c86dcf01e2cd9a583e5852284237bb8551d26ea74`.
- Đổi utility `frontend/src/chat/assistantText.ts` thành
  `frontend/src/chat/formatAssistantText.ts`; giữ nguyên byte utility. Chỉ cập
  nhật năm import ở AssistantText.tsx, AssistantText.test.tsx, speech/audio.ts,
  voice/spokenText.ts, voice/blaze.ts; không đổi logic/assertion/timeout.
- Quét 188 file frontend (bỏ node_modules/dist/coverage/.vite/.git), gồm test
  và CSS: không còn cặp tên cơ sở trong cùng thư mục chỉ khác hoa/thường;
  không còn import utility cũ.
- Prettier toàn frontend: PASS. ESLint `--max-warnings 0`: PASS;
  TypeScript `tsc --noEmit`: PASS. Log tại `.artifacts/chat-format-20261120/`.
- Vitest liên quan lần đầu bị sandbox chặn esbuild spawn EPERM trước chạy test;
  chạy lại cùng lệnh ngoài sandbox: **144 passed, 1 failed, 0 pending**, 8 file.
  File formatter/component 14 ca đạt; Unicode stream receipt 1 ca đạt;
  audio cũ 33, Blaze 63, SpokenText cũ 8, VoiceChat 24, Chat history 1 đều đạt.
- Lỗi thật: test mới `speech/audio.formatting.test.ts`, ca
  `sends cleaned text to TTS and shares the cache with the equivalent plain reply`,
  ném `Không nhận được âm thanh hợp lệ.` tại `speech/audio.ts:113`, trước
  assertion payload/cache. Chốt chặn hiện có từ chối blob rỗng hoặc MIME không
  bắt đầu bằng `audio/`. Test đang mock `new Response(new Blob(...))`; test cũ
  dùng response mock với `blob()` trả thẳng audio Blob. Chưa kết luận nguyên
  nhân bằng thực nghiệm và không tự sửa fixture hay logic sau lỗi thật.
- Đề xuất chờ duyệt: kiểm tra/correct fixture Response/Blob của riêng test mới,
  giữ chốt kiểm audio production, assertion và timeout cũ; chạy lại các cổng.
- Theo yêu cầu DỪNG, chưa chạy toàn bộ Vitest/build, chưa chụp ảnh sáng/tối
  desktop/mobile, chưa audit cached, chưa stage/commit/hook. Không mở cổng.
  CHANGELOG/DECISIONS/TESTING và hai commit chỉ làm sau khi mọi cổng xanh.
- Heavy.lock không tồn tại trước các lệnh kiểm trên. Không API/smoke, không
  sửa TutorWorkspace/vùng V/prompt/khóa byte/artifact. V8 chưa eval/smoke thật,
  kết quả v7 không áp dụng cho v8; chưa merge/push.

## Điểm dừng trước khi được duyệt đổi tên

Trạng thái: **DỪNG tại cổng lint/typecheck, chưa commit**. HEAD vẫn `9c8d43e`
trên `feat/prompt-relax-20261121`. Không tự sửa sau lỗi thật theo yêu cầu người dùng.

## Khảo sát và bản sửa đang dở

- Tin nhắn được render dưới dạng text trong `Chat.tsx`; SSE nối delta vào
  `message.content`. Bản nháp thêm `AssistantText`, một span/text node với
  CSS riêng `.assistant-text`, giữ xuống dòng/dòng trống và wrap từ dài.
- Hàm thuần bỏ dấu sao/backtick, heading hash đầu dòng, đổi bullet sang `•`,
  giữ danh sách đánh số. Không parse HTML, không `dangerouslySetInnerHTML`;
  React tiếp tục escape nội dung không tin cậy. Không thêm dependency.
- Chat người học vẫn hiện nguyên văn; assistant và caption dùng bộ hiển thị.
  Không chỉnh `TutorWorkspace.tsx`, CSS chung, vùng `frontend/src/vocabulary/**`.
- Bản nháp đưa bản text đã làm sạch vào body TTS chung `speech/audio.ts`
  và payload Blaze. `SpokenText` chỉ làm sạch phần được phát; vị trí receipt
  vẫn tính theo raw Unicode prefix, không đổi caps/thứ tự hàng đợi/timeout.
- Đã viết test mới cho **, *, #, backtick, bullet/đánh số, dòng trống, stream
  chưa đóng marker, tiếng Việt có dấu, XSS literal HTML/script, 30 mục gọn,
  payload/cache TTS và vị trí Unicode playback receipt. **Chưa chạy test**.

## Lỗi thật và điểm dừng

Lệnh `npm.cmd run lint` chạy ESLint thành công rồi `tsc --noEmit` dừng exit 2:

- TS1149: `src/chat/assistantText.ts` và đường import `src/chat/AssistantText`
  chỉ khác chữ hoa/thường ở tên cơ sở. Trên Windows, resolution `.ts` ưu tiên
  trước `.tsx`, nên import component bị phân giải về file hàm thuần.
- TS2724 tại Chat, VoiceChat và test component: module được phân giải nhầm
  không export `AssistantText`.

Đây là lỗi đặt tên của bản sửa mới, không phải lỗi baseline hoặc khóa byte.
Theo điều kiện “Gặp lỗi thật … DỪNG và báo”, không tự sửa/đổi tên hoặc chạy lại.
Đề xuất chờ duyệt: đổi tên file hàm thuần thành `formatAssistantText.ts` và
cập nhật đúng các import tương ứng; giữ component `AssistantText.tsx`, tên
hàm/export và logic như hiện tại; không sửa assertion/timeout test cũ.

## Kiểm chứng đã/chưa làm

- Trước cổng đã format đúng 11 file của bản sửa bằng Prettier; exit 0.
- Lint/typecheck: **FAIL** ở TypeScript như trên; log riêng
  `.artifacts/chat-format-20261120/lint.log`.
- Chưa chạy cổng Prettier check, Vitest liên quan hoặc toàn bộ, build,
  coverage, audit cached hoặc commit/hook. Không stage.
- Kiểm heavy.lock trước khi bắt đầu lint: không có khóa; không xóa khóa.
- Chưa có ảnh sáng/tối desktop/mobile. Edge có sẵn và có thể thử ảnh mẫu
  headless sau khi sửa/typecheck qua; chưa launch browser hay mở cổng mới.
- Không API tính phí, không tạo/chạy smoke; v8 vẫn chưa smoke thật, kết quả
  v7 không áp dụng cho v8. Không sửa prompt, .gitattributes hoặc artifact eval.
- Không push/merge/stash/reset/clean/rebase; chưa làm các bước Cổng 3 tiếp theo.
