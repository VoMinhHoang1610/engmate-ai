# Điều tra timeout test Từ vựng — 15/11/2026

## Label đã sửa — browser/CSV/lint/regression qua, gate coverage vẫn thất bại

Người dùng duyệt sửa CSS label và tiếp tục. Chỉ thêm row/width/min-width vào
label vocabulary/import và flex 18px cho checkbox trong CSS scoped; không đổi
TSX, CSS chung, Settings, runtime auth/chat/voice hoặc catalog.
Browser sau sửa: desktop sáng thực đo 1364px và mobile tối 374px, đủ 50 label
row/min-height 44px, 50 article, không root overflow; ảnh sau sửa đã giữ.
Mười mẫu contrast text mỗi theme qua >=4,5:1: light min 5,90, dark min 8,41;
không phải chứng nhận accessibility toàn app.

Thiếu DB: text wait 5.000ms ban đầu timeout; đã dừng và được duyệt điều tra.
Network cho thấy lazy module 304 mất 6,6–8,0s, console không lỗi; không reload,
tăng deadline hoặc quy chắc nguyên nhân cuối cùng. Trên cùng tab đã tải xong,
vocabulary đọc đủ 50 từ, status chưa cài đặt/không số liệu, 50 nút nhớ và filter
dấu nhớ disabled, console error 0. Không có DB thực bị drop hoặc installer mới.

Motion: browser.check với input Settings ẩn 0×0 thất bại; đã dừng và được duyệt
kiểm Tab/Space, giữ assertion đủ. Focus đúng checkbox false/attribute false,
Space true/true rồi Space false/false **qua**; không sửa Settings. System media
reduce=true, **chưa kiểm được môi trường animation thường/no-preference**.

CSV **17 mục** được xuất, 5/50 ngẫu nhiên mỗi chủ đề + 7 flagged, mọi trường
khớp catalog, tất cả chờ người duyệt. Lệnh kiểm đầu lỗi do stdin PowerShell ASCII
biến expected tiếng Việt thành `?`; đo codepoint xác định rồi chuyển validator
sang file UTF-8, giữ assertion và dữ liệu, kiểm qua. Ghi chú sơ bộ không phải
người thẩm định. Tài liệu chính và bàn giao demo đã cập nhật scope thực tế.

Sau CSS: lint/type/format cả hai phía **qua**, regression Vocabulary cấu hình
thường **11/11 qua**, BelowNormal/một worker. Full coverage đầu tiên
`vocabulary-frontend-label-layout-01` **thất bại: 466/490, 24 timeout**, 0
pending, **19 lỗi ngoài sáu ngoại lệ App đã duyệt**. Mọi lỗi là timeout trần
trong `src/App.test.tsx`; không có assertion sai/unhandled. Một ca kéo dài
**92.804,89 ms** dù hạn 5.000 ms. Coverage **88,63 / 80,79 / 83,66 / 91,62%**
theo statements/branches/functions/lines; CPU mean **69,99%**, p95 **100%**,
375 mẫu >=90%, RAM tối thiểu **7.905 MiB**.

Ca `opens profile and settings directly from the sidebar...` chạy riêng vẫn
timeout **5.781 ms** (CPU mean 88,72%, RAM 6.484 MiB), trong khi cùng ca từng
qua **1.506 ms** ở lượt đầy đủ trước. `App.test.tsx` không đổi từ 13:43, lượt
đầy đủ trước 14:51, CSS đổi 20:04 và Vitest mặc định không áp dụng CSS vào
jsdom. **Giả thuyết bão hòa CPU/tiến trình nền**, chưa đủ kết luận. Sau khi
đóng toàn bộ tab preview và dừng Vite 5176, canary cùng ca
`app-profile-settings-canary-01` **qua 4.213 ms** (exit 0, CPU mean 88,08%, RAM
tối thiểu 8.566 MiB), nên đã chạy lại có kiểm soát đúng **một** lượt
`vocabulary-frontend-label-layout-controlled-02`.

Lượt có kiểm soát **487/490**, 0 pending, **3 timeout**, còn **2 lỗi ngoài
ngoại lệ**:

- `src/vocabulary/vocabulary.test.tsx` — `shows both complete topics, all fifty
  cards, accent-insensitive filters and back focus`: **5.359,7 ms**.
- `src/voice-first/VoiceFirstApp.test.tsx` — `shows all 20 correctly numbered
  lessons in stage 2`: **5.618,26 ms**.
- `src/App.test.tsx` — ca server-bound **5.494,86 ms**, thuộc sáu ngoại lệ đã
  duyệt.

Coverage **90,08 / 82,64 / 86,20 / 93,17%**; CPU mean **64,77%**, p95 **100%**,
149 mẫu >=90%, RAM tối thiểu **8.957 MiB**. Gate test **chưa đạt**; đã dừng theo
cam kết, không chạy lại full suite. **Build sau CSS đã qua** (2.491 module, Vite
33,11 giây, tổng 72,15 giây, exit 0). Không tăng deadline, giảm assertion hoặc
retry suite nguyên trạng.

Kiểm readonly secret/PII giới hạn additions/untracked: **43 file**, 0 regex
finding, `git diff --check` exit 0; không in giá trị, không bảo đảm phát hiện
mọi loại secret/PII. Chưa stage/commit/merge/Docker/M3.

Hồ sơ và ảnh sau sửa:
`.artifacts/vocabulary-ui-20261116/label-layout-after-01/README.md`.
[Bàn giao demo/phần còn thiếu](VOCABULARY_DEMO_HANDOFF_2026-11-16.md).
Không gọi hai chủ đề đã được người dùng nghiệm thu, không mở rộng hàng loạt/AI
hoặc báo hoàn tất prompt chính năm mục chỉ vì yêu cầu ưu tiên làm nhanh.

## Chuẩn bị demo — mobile có thêm bằng chứng, phát hiện lỗi label trên desktop rộng

Người dùng yêu cầu hoàn tất nhanh các việc còn lại để tự commit/main và demo.
Tiếp tục cổng hai chủ đề, không tự commit/push/merge/Docker, gọi API trả phí,
mở rộng nội dung hoặc sửa bốn mục khác trước nghiệm thu.

Browser screenshot ban đầu bị chặn do tab không visible; đã dừng hỏi,
người dùng xác nhận đưa Desktop/Review lên trước rồi capture qua. Sau đó:

- Mobile iframe thực đo **374×811 CSS px**, Đồ ăn đủ 50 từ, không tràn ngang,
  focus heading; lọc A2 đúng 21 từ/badge A2, lọc Đã nhớ đúng một apple.
- Quiz cố ý sai một câu và đúng bốn câu: **4/5**, không điểm TOEIC, summary
  dấu nhớ không tự đổi. Chọn 5 từ: 5 checked/45 disabled; Mate chỉ nhận draft,
  không tự gửi hoặc gọi provider, console error 0 trong đoạn được đọc.
- Khoanh vùng thao tác theme/Escape không tác dụng lần đầu do phần điều khiển
  iframe ở dưới viewport outer, document chưa focus. Sau cuộn outer 206px,
  click native vào ref mới đổi dark; Escape đóng menu/trả focus nút mở menu.
  Không sửa runtime hoặc giả lập kết quả để vượt bước này.
- Desktop rộng thực đo **1364×899 CSS px**, hai topic, đủ 50 article Đồ ăn,
  lưới từ 3 cột, không tràn ngang.

**Lỗi visual thật đang chặn:** label “Chọn apple để luyện” bị xếp dọc thành
chữ vụn. Computed `.vocabulary-select`: display flex nhưng direction column,
width 50,48px. Rule label chung tại `index.css` đặt column; rule vocabulary chưa
đặt lại hướng. **Dừng tại lỗi**; đề xuất sửa chỉ CSS vocabulary scoped
`.workspace-shell`, giữ semantics/focus/bàn phím/min-height. Chưa sửa source.
Sau sửa cần kiểm lại browser và gate tương ứng; chưa dùng kết quả cũ làm
nghiệm thu thay đổi mới.

Chi tiết và sáu ảnh:
`.artifacts/vocabulary-ui-20261116/demo-readiness-01/README.md`.
Những việc CSV, missing DB, contrast/motion, persistence thật, tài liệu và
nghiệm thu vẫn chưa hoàn tất. Hai ngoại lệ App/coverage và build cũ giữ đúng
trạng thái đã ghi, không retry suite nguyên trạng hoặc gọi hoàn toàn xanh.

## Desktop đã kết nối — UI 800px có ảnh, mobile chưa hoàn tất

Người dùng mở đúng session trong desktop và yêu cầu kiểm kết nối.
`browser.tabs.list` **thành công**, không còn disconnected. Không tiếp tục thử
Edge/CDP headless riêng. Kiểm tải CPU **91,1 / 54,9 / 36,8%**, RAM **12.093 MiB**,
page reads 0; cổng 5176 trống, không thấy test/evaluation khác khớp bộ lọc hạn chế.
Khởi chạy Vite riêng worktree ở 127.0.0.1:5176, BelowNormal, không đổi Docker.

Lần mở đầu 502; log startup Vite **12.660 ms**. Sau kiểm lại HTTP 200 và đúng
fixture HTML/Vite client, reload một lần mở được ứng dụng, không tăng deadline.
Chưa đo tương quan thời gian đủ để quy chắc nguyên nhân 502; giữ lỗi trong hồ sơ.
Browser session này không cần cài dependency/extension hay sửa config OpenCode.

Đã mở hai topic đủ **50 article/chủ đề**, kiểm Đồ ăn từ apple đến dessert,
Văn phòng từ office đến submit; focus heading đúng, không thấy tràn ngang ở
**800×606 CSS px**. Tìm không dấu `qua tao` trả đúng một apple. Tab focus vào
input Tìm từ có outline rõ 2px, không bị khuất; thẻ ghi nhớ click lật nghĩa/ví dụ
và Space lật về, không tự đổi summary dấu nhớ. Đổi light→dark qua nút giao diện;
speech false nên nút nghe bị ẩn. Console error 0, không dropped/truncated.
Network lọc `/api/` chỉ thấy module `/src/api/*.ts`, không phải backend request;
không dùng bộ lọc này để chứng minh mọi mạng sạch. Fixture mock mọi fetch, chưa
kiểm tài khoản thật/persistence. Fixture **reduced-motion=true** sẵn, chưa kiểm
motion thường. Ảnh 1200px vật lý không phải bằng chứng viewport 1200 CSS px.

Mobile dùng iframe fixture sẵn có 375×812, nhưng trợ lý chờ sai điều kiện:
`wait(text="Mở menu điều hướng")` **timeout 5.000 ms** vì tên đó ở aria-label,
không phải literal text hiển thị. Snapshot sau lỗi thấy button đúng tên và
expanded=false; chưa mở menu/Từ vựng. **Dừng ở lỗi thao tác này**, không retry sai
query, tăng deadline hoặc sửa runtime. Bước tiếp theo dùng snapshot/ref button
để mở menu rồi kiểm nội dung hiển thị. Mobile chưa đạt; desktop rộng, quiz/
filter/selection/draft/missing DB/contrast và CSV nghiệm thu vẫn chưa hoàn tất.

Ba ảnh và hồ sơ chi tiết:
`.artifacts/vocabulary-ui-20261116/desktop-connected-01/README.md`,
`light-topics-800.jpeg`, `light-food-keyboard-800.jpeg`,
`dark-office-keyboard-800.jpeg` cùng thư mục.
Preview riêng còn chạy lúc kết thúc lượt, không coi còn sống sau restart.
Không thay runtime/test, chạy lại các gate đã hoàn tất, commit/push/M3 hoặc
triển khai Docker. Coverage **488/490** với đúng hai ngoại lệ App và build qua
giữ nguyên; chưa tuyên bố nghiệm thu xong lát cắt hai chủ đề.

## Tiếp tục điều tra CDP — attach tab được, navigation vẫn timeout

Sau yêu cầu `continue`, tiếp tục đúng phạm vi browser/CDP, không thay application
runtime hoặc chạy lại test/build. Chỉnh script artifact để **attach tab
`about:blank` duy nhất mà Edge của profile mới đã tạo khi khởi động**, thay vì
`Target.createTarget` tạo renderer thứ hai (thao tác lỗi lượt trước). Chỉ nhận
tab từ endpoint browser thuộc profile audit vừa tạo, kiểm đúng một page blank;
không attach browser/tab cá nhân. Thêm nhật ký thời gian từng lệnh CDP, giữ
deadline **5.000 ms**. Lượt UI thường dùng `prefers-reduced-motion: no-preference`
thay vì ép reduce; kiểm reduce riêng vẫn chưa thực hiện. Đây chỉ là chỉnh script
chẩn đoán, không phải sửa runtime/test để che timeout.

`node --check` qua. Trước chạy: CPU **45,7 / 49,2 / 52,7%**, RAM khả dụng
**9.553 MiB**, page reads 42/s, không thấy test/evaluation khác khớp bộ lọc hạn
chế; cổng 5176 trống. Chạy BelowNormal, tuần tự, không dependency/env mới.

`edge-probe-03`:

- Vite ready **2.885 ms**, Edge **Edg/157.0.4341.46**.
- `Target.getTargets` **171 ms**, `Target.attachToTarget` **58 ms**: **đã attach
  được tab riêng**. `Page.enable` 74 ms, `Runtime.enable` 684 ms, `Fetch.enable`
  975 ms, viewport 64 ms, media preference 90 ms.
- Đã bật request interception trước navigation, chỉ cho web request cùng origin
  127.0.0.1:5176 và không thuộc `/api/` đi tiếp. Ghi nhận một
  `Fetch.continueRequest` trả sau **5 ms**. Danh sách blocked/API trống chỉ có
  giá trị cho phần đã quan sát, **không chứng minh đủ hành vi mạng của UI**.
- **Lỗi mới `CDP deadline: Page.navigate`**, deadline cấu hình vẫn 5.000 ms,
  callback ghi thực tế **5.223 ms** theo lịch event loop. **Dừng**, không thử lại
  nguyên trạng, tăng deadline hoặc tắt sandbox. Chưa đi tới wait/assertion UI;
  **0 check, 0 screenshot**. Listener tab đã bật, chưa thấy exception/console
  error trong đoạn ngắn này; không dùng làm kết luận console ứng dụng sạch.
- Edge vẫn ghi `fallback_task_provider.cc`; chưa đủ bằng chứng xác định nguyên
  nhân navigation timeout hoặc quy lỗi ứng dụng/tải máy. Attach thành công
  không chứng minh `Target.createTarget` hết lỗi hoặc browser audit đã thông.

Teardown chỉ browser/profile của run này: `Browser.close` trả **21 ms**, sau chờ
shutdown 2.000 ms dừng đúng Edge child chưa exit, dừng đúng Vite child. Kiểm lại:
**cổng 5176 trống, 0 tiến trình Edge khớp profile edge-probe-03**. Không đóng
browser/công việc khác, xóa profile, commit/push hoặc chạm Docker/MySQL M3.

Bằng chứng: `.artifacts/vocabulary-ui-20261116/edge-probe-03/`
`{result.json,vite.log,edge.log}` và script `audit-edge.mjs`. Kết quả frontend
coverage **488/490** (đúng hai ngoại lệ đã duyệt) và build qua không đổi.
Browser gate vẫn **chưa đạt**, chưa có ảnh UI/CSV nghiệm thu hai chủ đề. Bước
ít rủi ro tiếp theo là duyệt preview fixture để người dùng mở Edge bình thường,
kiểm UI thủ công và gửi ảnh, hoặc kết nối browser tích hợp qua desktop app.

## Session tại terminal VS Code — thử browser cục bộ, dừng trước khi mở UI

Người dùng cho biết đang mở session trong terminal VS Code và yêu cầu tiếp tục.
Kiểm lại `browser.tabs.list` một lần sau thông tin mới vẫn báo
`[browser.disconnected]`. Không sửa cấu hình OpenCode, cài extension/MCP/dependency
hoặc yêu cầu tài khoản/credential browser. Công cụ tích hợp chưa dùng được trong
session này; không suy ra mọi terminal đều không hỗ trợ browser.

Kiểm read-only thấy Edge có sẵn tại
`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` và Node **v25.9.0**
có WebSocket tích hợp. Không có script browser/playwright/puppeteer sẵn trong
`scripts`; không thêm package. Tạo script audit **chỉ trong artifact** để thử
Edge headless/CDP bằng Node chuẩn, fixture UI riêng ở **127.0.0.1:5176**, không
gắn với Docker/frontend ứng dụng hiện tại. Hồ sơ Edge tạm mới, riêng từng run,
nằm dưới thư mục temp của công cụ (`%TEMP%\opencode`), không dùng hồ sơ cá nhân.
Remote debugging chọn port ngẫu nhiên từ file DevToolsActivePort của chính
profile mới; không kết nối/đóng tab của browser cá nhân. Không `--no-sandbox`
hoặc mở CDP ra mạng. Script có kế hoạch chặn request web ra ngoài và mọi actual
`/api/` request trước khi navigate fixture; **chưa tới bước bật chặn/navigate**
trong lượt lỗi thứ hai, không dùng logic chưa chạy làm bằng chứng đã audit network.

Trước chuẩn bị: CPU **52,9 / 69,3 / 55,2%**, RAM **10.339 MiB**. Trước chạy:
**64,8 / 75,3 / 49,9%**, RAM **10.271 MiB**; chạy BelowNormal, không đồng thời
test/build. Cổng 5176 và 9336 được kiểm trống lúc khảo sát; Edge cuối cùng dùng
port ngẫu nhiên, không dùng 9336.

- `edge-probe-01`: **lỗi parser readiness do trợ lý**. Vite thực tế ready sau
  **1.832 ms**, nhưng mã màu ANSI chèn vào URL làm điều kiện tìm chuỗi không
  khớp; script dừng ở deadline khởi động 10.000 ms. **Chưa khởi chạy Edge**, chưa
  kiểm UI. Đã dừng đúng Vite child do script tạo, cổng 5176 không còn listener.
  Sửa parser bỏ ANSI để nhận đúng log, không tăng deadline hoặc thay ứng dụng.
- `edge-probe-02`: Vite ready **2.530 ms**, Edge **Edg/157.0.4341.46** mở bằng
  profile riêng, CDP WebSocket kết nối được. Nhưng `Target.createTarget` **timeout
  tại deadline 5.000 ms**, **trước khi attach tab hoặc navigate UI fixture**.
  Log Edge ghi cảnh báo `fallback_task_provider.cc` về renderer; chưa xác định
  đây có phải nguyên nhân timeout, không kết luận lỗi ứng dụng/Edge hoặc tải máy.
  Script báo fail, **0 check UI, 0 screenshot**. `errors: []` trong result chỉ vì
  chưa gắn listener runtime của tab, **không phải console UI sạch**.

Lượt hai đã gửi `Browser.close` tới browser của profile audit riêng; sau khoảng
chờ shutdown 2.000 ms, chỉ dừng thêm đúng Edge child PID do script tạo khi chưa
exit, rồi dừng đúng Vite child. Kiểm read-only sau teardown: **cổng 5176 trống,
0 tiến trình Edge khớp hai profile audit còn lại**. Không dùng taskkill theo tên,
không dừng browser/công việc khác. Giữ nguyên profile/artifact chẩn đoán, không
recursive delete. Không thay `.env`, flags ứng dụng, dependency, timeout test
hoặc deadline script để thử lại. Mẫu CPU sau lỗi **96,3 / 73,6 / 59,3%**, không
đủ bằng chứng dùng làm nguyên nhân duy nhất của lỗi CDP.

**Dừng tại lỗi hạ tầng browser này**, không retry nguyên trạng để chọn lượt qua,
không tuyên bố đã xem/chụp UI hoặc nghiệm thu desktop/mobile/sáng/tối/bàn phím.
Build đã qua và coverage **488/490** với đúng hai ngoại lệ App từ lượt trước
**giữ nguyên**, không chạy lại các bước đã xong. Prompt chính/lát cắt chưa được
nghiệm thu ảnh/CSV, chưa làm bốn mục còn lại.

Hướng tiếp theo cần chọn: kết nối browser tích hợp qua desktop app, hoặc dựng
preview fixture riêng để người dùng mở Edge bình thường và cung cấp kết quả/
ảnh kiểm UI thủ công. Nếu tiếp tục điều tra CDP cần phạm vi riêng, giữ deadline/
sandbox, không thêm dependency hay đụng profile thật. Không vượt cổng browser
bằng snapshot DOM/jsdom hoặc HTTP 200 đơn thuần.

Bằng chứng: `.artifacts/vocabulary-ui-20261116/audit-edge.mjs`,
`edge-probe-01/{result.json,vite.log,edge.log}`,
`edge-probe-02/{result.json,vite.log,edge.log}`.
Không commit/push/M3, copy/merge mã feature vào repo ứng dụng hoặc restart Docker.

## Preview đã scope — chỉ còn hai ngoại lệ App, build qua, chờ browser

Người dùng duyệt sửa helper/test chung stage 0–4 theo kết quả đo. Chỉ thay
`frontend/src/voice-first/VoiceFirstApp.test.tsx`: `renderApp()` trả lại main đã
tìm để dùng cùng scope cho CTA; callback `it.each` chờ select `Chọn cấp độ` qua
label với deadline RTL **không đổi**, sau đó vẫn kiểm heading bằng role/name và
kiểm combobox role/name trỏ đúng select. Giữ `getAllByRole` đủ **20 button** và
mọi assertion số bài/tên accessible cho từng node ở **cả năm stage**. Thêm guard
roadmap root tồn tại, không mock/disable Motion, dùng fake timer cho stage,
ép reduced-motion, chia/bỏ ca, sửa dữ liệu hoặc preview runtime.

Kiểm tuần tự, một worker, BelowNormal, cấu hình thường **không timeline transform**:

- Preview **10/10 qua**; năm stage 0–4 lần lượt **1.971 / 1.188 / 1.197 / 1.250 /
  822 ms**, mọi ca modal/voice/theme/mock lifecycle khác vẫn qua.
- Ruff/Black/mypy, ESLint/TypeScript, Prettier **đều qua**.
- Coverage đầy đủ `vocabulary-frontend-preview-stage-scoped-01`: **488 qua,
  2 lỗi / 490**, 0 pending; **40/41 file qua**. Preview **10/10**, Vocabulary
  **11/11**, LandingPage **2/2**, App **42/44**. Không có lỗi ngoài sáu ngoại lệ
  App đã duyệt; không mở rộng danh sách miễn trừ.

Hai lỗi vẫn báo **Test timed out in 5000ms** và runner vẫn exit **1**:

| Ngoại lệ App | Duration runner ghi |
| --- | ---: |
| `opens a server-bound lesson and begins Blaze voice without sending a hidden learner message` | 5.513,67 ms |
| `shares saved Settings voices and speed with chat and restores them after signing in again` | 5.246,08 ms |

Coverage tổng statements **90,08%**, branches **82,64%**, functions **86,20%**,
lines **93,17%**. Không thấy `overlapping act()`, `not wrapped in act`,
`Unhandled Error` hoặc `Unhandled Rejection` trong log. **Không gọi suite xanh
hoàn toàn hoặc kết luận hết flake.** Theo điều kiện cho phép sáu ngoại lệ đã duyệt,
có thể chuyển sang build/kiểm UI khi đủ tải máy và browser; vẫn giữ hai lỗi trong
hồ sơ và không dùng kết quả ca riêng thay coverage toàn suite.

Tải trước regression: CPU **36,9 / 45,5 / 46,6%**, RAM **9.523 MiB**, page reads 0;
trước coverage **70,9 / 56,8 / 53,0%**, RAM **9.582 MiB**, page reads 0, không thấy
test/evaluation khác khớp bộ lọc hạn chế. Xuyên coverage **1.128 mẫu**, CPU trung
bình **71,86%**, median **71,48%**, p95 **95,08%**, **108 mẫu ≥90%**, RAM khả dụng
tối thiểu **8.979 MiB**, sampler không lỗi. Không dùng tải toàn máy quy nguyên
nhân mọi timeout hoặc giả định worker là tiến trình duy nhất đang dùng CPU.

Sau lượt coverage bị ngắt kết nối phản hồi, đã đọc lại JSON/log/coverage và tạo
summary, **không chạy lại test đã hoàn tất**. Trước build, đo CPU **100 / 100 /
100%**, RAM 8.757 MiB: **chưa khởi chạy build** để tránh tăng tải, không dừng tác
vụ khác. Kiểm browser connection một lần bằng `browser.tabs.list` báo
`[browser.disconnected] No desktop browser is connected to this session`.
Cần mở session này trong desktop app và kết nối browser; không retry browser
liên tục hoặc tuyên bố đã xem UI/chụp ảnh. Chưa nghiệm thu sáng/tối/mobile/
keyboard, CSV nội dung hoặc lưu tài khoản thật.

Sau cập nhật hồ sơ, đo tải lại CPU **66,4 / 34,4 / 48,9%**, RAM **9.475 MiB**,
page reads 0; đã chạy build trong **worktree tính năng**, BelowNormal, không
chạy đồng thời test/browser. `tsc --noEmit && vite build` **qua**, Vite transform
2.491 module, thời gian build Vite **39,23 s**, toàn lệnh **75,96 s**, exit **0**.
Output chỉ ở `frontend/dist` của worktree, không copy/merge vào repo ứng dụng,
không restart Docker, không đổi env/dependency/flags. Build thành công **không
chứng minh UI đã hiển thị hoặc persistence tài khoản thật đã được kiểm**.

**Điểm chặn hiện tại là browser chưa kết nối.** Chưa khởi chạy lại preview cũ
5176 hoặc coi nó còn sống, chưa dựng server mới khi browser chưa sẵn sàng.
Cần người dùng kết nối browser bằng desktop app để tiếp tục fixture UI riêng,
kiểm desktop/mobile sáng/tối/bàn phím và chụp ảnh; không bỏ qua cổng browser để
nghiệm thu CSV/nội dung hoặc mở rộng tính năng. Hai ngoại lệ App vẫn giữ nguyên
trong hồ sơ, không gọi suite hoàn toàn xanh.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`preview-stage-scoped-regression-01.{json,log}`,
`vocabulary-frontend-preview-stage-scoped-01{-tests.json,-load.json,-summary.json,.log}`
và coverage; `.artifacts/vocabulary-preflight-20261115/`:
`vocabulary-lint-preview-stage-scoped-01.log`,
`vocabulary-build-preview-stage-scoped-01.log` và `-run.json`.
Không commit/push/M3, đổi dependency/env, flags/pool/timeout hoặc triển khai Docker.
Prompt chính vẫn chưa hoàn tất; chỉ lát cắt hai chủ đề được tiếp tục theo cổng.

## Điều tra preview stage 0–1 — qua lượt đo, thấy điểm chờ nhạy với animation

Người dùng duyệt điều tra hai lỗi preview ngoài ngoại lệ; chưa sửa source,
runtime, assertion 20 bài/stage hoặc timeout. Đọc implementation xác định
`VoiceFirstApp` dùng `AnimatePresence mode="wait"`: click lộ trình cập nhật page/
navigation trước, home vẫn còn trong DOM trong lúc exit, RoadmapView chỉ được
mount sau khi exit kết thúc. Vì vậy navigation đã chọn Lộ trình **không chứng
minh** heading/selector của RoadmapView đã xuất hiện.

Thêm config/setup chẩn đoán **chỉ trong artifact**: alias query/render/fireEvent/
waitFor và delegate hàm gốc; ghi timeline, owner/pending query, DOM topology
home/roadmap, số lesson node, inline opacity và mốc cleanup.begin/end. Observer
chỉ đọc childList/subtree, không sửa animation/DOM, không đọc/ghi React internals,
không mock motion/RAF/timer hoặc thay query timeout. Runner lấy mẫu tải sẵn có
được thêm tùy chọn đường dẫn config chẩn đoán; default cũ và kết quả cũ giữ nguyên.

Mẫu trước đo CPU **56,3 / 47,0 / 54,4%**, RAM **9.754 MiB**, page reads 3;
không thấy tiến trình test/evaluation khác khớp bộ lọc hạn chế. Chạy nhóm stage
0–1, một worker, BelowNormal, `--bail=1`, không coverage: **2/2 qua**, 8 ca không
chọn. Stage 0 **2.893 ms**, stage 1 **1.500 ms**. Không dùng lượt riêng có bộ đo
thay thế gate coverage trước hoặc coi đã tái hiện/sửa lỗi.

| Mốc/operation đo | Stage 0 | Stage 1 |
| --- | ---: | ---: |
| Render đồng bộ | 588,30 ms | 124,92 ms |
| Tìm main để gắn scrollTo mock | 327,53 ms | 25,96 ms |
| Query CTA Học theo lộ trình toàn trang | 222,21 ms | 161,05 ms |
| Click CTA, gồm React update | 150,15 ms | 294,79 ms |
| Chờ heading bằng screen.findByRole, tới settlement | 1.139,16 ms | 402,98 ms |
| Đếm button bằng role/name trong roadmap | 223,94 ms | 252,77 ms |

Với stage 0: click return tại **6.596,17 ms**, heading query bắt đầu **6.608,25 ms**;
DOM roadmap được observer ghi lúc **7.700,43 ms**, tức **1.104,26 ms sau click**
và **1.092,18 ms sau query bắt đầu**. Query resolve tại **7.747,41 ms**. Stage 1:
roadmap được ghi **325,33 ms sau click return**. Mốc là callback observer ghi
nhận, không phải đo thời điểm browser paint hoặc khẳng định chính xác thời gian
animation thuần. Inline opacity roadmap vẫn 0 ở các snapshot cuối thân test;
test cũ chỉ đợi role query tìm thấy, không đợi animation visually finished.

Đọc dependency xác minh RTL `asyncUtilTimeout` mặc định **1.000 ms** và polling
interval **50 ms**, khác test deadline Vitest **5.000 ms**; không thay giá trị nào.
Operation async resolve sau 1.000 ms ở lượt này không có nghĩa deadline được
tăng: timer/callback cũng chịu lịch chạy event loop và query đồng bộ. Quan sát
này cho thấy bước chờ heading toàn trang quanh chuyển cảnh **nhạy với timing**,
chưa chứng minh nguyên nhân duy nhất của timeout stage 0 hoặc lỗi heading stage
1 trong lượt coverage trước. Chưa đo riêng từng retry nội bộ/query callback hoặc
RAF, không quy toàn bộ thời gian chờ cho chi phí role query.

Ở cả hai ca: query được bọc không pending tại cleanup.begin/end/test.finished;
cleanup làm body trống, stage 1 bắt đầu với body trống, không settlement đổi
owner/test. Không quan sát bằng chứng query của stage 0 tràn sang stage 1 trong
lượt này. Không kết luận mọi promise/RAF/timer Motion đều đã được đếm hoặc hủy.

Tải xuyên lượt **48 mẫu**, CPU trung bình **71,95%**, max **98,11%**, RAM khả dụng
tối thiểu **9.284 MiB**, sampler không lỗi. Trong thân stage 0 **76,68%**, max
88,28% (6 mẫu); stage 1 **73,11%**, max 85,23% (3 mẫu). Không dùng CPU toàn máy
thay CPU worker hoặc suy ra nguyên nhân lỗi chỉ từ tải.

Đề xuất sửa test **cần duyệt tiếp**, không áp dụng ở lượt điều tra:

- `renderApp()` trả lại main đã tìm để callback chung `it.each` stage 0–4 dùng
  cùng scope cho CTA, tránh query toàn trang hoặc tìm main lặp lại.
- Chờ combobox `Chọn cấp độ` qua label hiện có với deadline RTL **vẫn 1.000 ms**,
  rồi trong roadmap vẫn kiểm heading bằng **role + accessible name** như cũ.
  Mục tiêu là tránh polling role query toàn trang khi scene cũ đang exit, không
  bỏ bước chuyển cảnh hoặc cho thêm thời gian.
- Giữ `getAllByRole` đủ **20 button** và **mọi assertion tên/số bài cho từng node**
  ở cả năm stage; không chia test, skip stage hoặc sửa dữ liệu preview.
- Không mock/disable Motion, ép reduced-motion, dùng fake timer cho test stage,
  reset React flags, tăng timeout hoặc sửa preview runtime. Sau duyệt cần chạy
  toàn bộ 10 ca preview, lint/type/format rồi full coverage, không dùng ca riêng
  thay thế suite gate.

**Cổng vẫn 487/490 của lượt coverage đầy đủ gần nhất**, chưa build/browser/ảnh/
CSV nghiệm thu, chưa hoàn tất prompt chính. Không chạy lại full suite nguyên
trạng để chọn lượt xanh, không commit/push/M3, đổi dependency/env hoặc Docker.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`preview-stage-timeline.{config.mts,setup.mts}`,
`preview-stage-boundary-01{-tests.json,-timeline.json,-load.json,-summary.json,.log}`.

## Nhóm bốn ca đã scope — qua coverage, dừng tại hai lỗi voice-first preview

Người dùng duyệt áp dụng nhóm sửa test/helper theo kết quả điều tra bốn ca.
Chỉ thay `frontend/src/App.test.tsx` và `frontend/src/vocabulary/vocabulary.test.tsx`:

- Tách phần neo textarea/kiểm region Hội thoại trong `open()` thành
  `conversationQueries()` dùng lại ở hai lần chờ workspace sau login/register.
  Vẫn chờ textarea có label, kiểm region role/name/visibility, textbox role/name,
  identity của textbox và visibility. Không bỏ phép kiểm hoặc chỉ đổi sang query
  text thay role. Helper `open()` vẫn dynamic import/act và chờ hết chỉ báo tải;
  phần chọn lịch sử scope complementary Thanh bên học tập + dialog Lịch sử hội
  thoại, giữ nguyên conversation ID/hành động chọn.
- Hai ca phục hồi live voice catalog và tiếng Việt lấy region Hội thoại để query
  retry/start/options/combobox/textbox/send/playback, giữ disabled/enabled,
  không tự start, giọng Kore, payload nguyên văn và TTS argument assertion.
- Login/register neo form từ input có label, dùng role/name của button bên trong
  form; sau logout **lấy lại** auth pane vì node cũ đã unmount, kiểm role/name/
  visibility rồi query nút đổi chế độ. Form đăng ký được lấy lại từ input Tên
  hiển thị. Giữ mọi hash/search/history/payload assertion. Không sửa AuthForm,
  auth/OAuth/API runtime hoặc dữ liệu fixture.
- `openFood()` khi không nhận scope sẵn thì neo title `strong`, kiểm section
  region role/name/visibility rồi vẫn tìm button bằng role/name. Ca thiếu SQL
  dùng lại list cho count/card, giữ **50 article**, disabled/no aria-pressed/
  no fabricated zero/no audio/no writes. Retry scope đúng summary đầu tiên từ
  heading h2; kiểm summary role/name/visibility, vẫn tìm nút bằng role/name.
  Không thêm `hidden: true`, không bỏ/chia test hoặc đổi ngân sách timeout.

Kiểm tuần tự, một worker, BelowNormal, cấu hình thường **không timeline transform**:

1. Regression **55/55 qua**: toàn bộ App **44/44** và Từ vựng **11/11**, không ca
   không chọn. Bốn ca đích: voice catalog **923 ms**, tiếng Việt **594 ms**,
   login/register **1.080 ms**, thiếu SQL **789 ms**.
2. Ruff/Black/mypy, ESLint/TypeScript và Prettier **đều qua**.
3. Coverage toàn frontend đủ **490 test**: **487 qua, 3 lỗi**, 0 pending,
   **39/41 file qua**. App **43/44**, Vocabulary **11/11**, LandingPage **2/2**.
   Bốn ca vừa sửa đều qua: voice catalog **2.080,50 ms**, tiếng Việt **2.056,70 ms**,
   login/register **2.515,67 ms**, thiếu SQL **1.986,98 ms**.

Kết quả mới nhất `vocabulary-frontend-four-blockers-scoped-01` còn:

| File / ca | Lỗi | Duration runner ghi | Ngoại lệ đã duyệt? |
| --- | --- | ---: | --- |
| App: `opens a server-bound lesson and begins Blaze voice without sending a hidden learner message` | Timeout 5.000 ms | 6.550,57 ms | Có |
| `voice-first/VoiceFirstApp.test.tsx`: `shows all 20 correctly numbered lessons in stage 0` | Timeout 5.000 ms | 5.523,35 ms | **Không** |
| `voice-first/VoiceFirstApp.test.tsx`: `shows all 20 correctly numbered lessons in stage 1` | Không tìm thấy heading `Từng bước, mỗi ngày` | 4.825,65 ms | **Không** |

Voice-first preview **8/10 qua**; chưa điều tra/sửa file này, chưa kết luận hai
lỗi có cùng nguyên nhân, có tác động chéo từ stage 0 hoặc do thay đổi helper.
Các helper vừa sửa chỉ ở file App/Từ vựng, không tự suy ra chúng không thể ảnh
hưởng timing toàn lượt. Không thấy `overlapping act()`, `not wrapped in act`,
`Unhandled Error` hoặc `Unhandled Rejection` trong log nhưng không dùng sự vắng
cảnh báo làm chứng minh toàn bộ async sạch.

Coverage: statements **90,10%**, branches **82,67%**, functions **86,28%**,
lines **93,19%**. Đạt từng ngưỡng **không thay thế suite qua**. **Dừng tại hai lỗi
ngoài ngoại lệ voice-first preview**, không retry full suite nguyên trạng để
chọn lượt xanh. Chưa build/browser/ảnh/CSV nghiệm thu, prompt chính chưa hoàn
tất; không triển khai hoặc sửa runtime preview để vượt cổng. Phạm vi tiếp theo
cần duyệt: điều tra hai ca preview, trước hết chỉ đo/đối chiếu query và ranh giới
async/cleanup, giữ assertion 20 bài/stage, timeout và runtime.

Tải trước regression CPU **53,0 / 58,9 / 38,3%**, RAM 9.227 MiB; trước coverage
**54,9 / 48,8 / 48,4%**, RAM 9.487 MiB, page reads 0, không thấy tiến trình
test/evaluation khác khớp bộ lọc hạn chế. Bộ đo tải riêng ngoài worker xuyên lượt
coverage ghi **1.033 mẫu**, CPU trung bình **72,16%**, median **71,88%**, p95
**96,32%**, **136 mẫu ≥90%**, RAM tối thiểu **8.876 MiB**, sampler không lỗi.
Trong khoảng file voice-first preview CPU trung bình **82,39%** (46 mẫu), App
**70,22%** (169 mẫu), Vocabulary **72,97%** (37 mẫu). Không suy diễn CPU toàn máy
là CPU worker, không quy nguyên nhân timeout chỉ từ tải, không đụng tác vụ khác.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`four-blockers-scoped-regression-01.{json,log}`,
`vocabulary-frontend-four-blockers-scoped-01{-tests.json,-load.json,-summary.json,.log}`
và coverage tương ứng; `.artifacts/vocabulary-preflight-20261115/`:
`vocabulary-lint-four-blockers-scoped-01.log`.
Không commit/push/M3, đổi dependency/env, React flags/pool/default/timeout hoặc
triển khai vào Docker. Giữ nguyên mọi kết quả lỗi/qua cũ để đối chiếu.

## Điều tra bốn timeout đã được duyệt — 4/4 qua riêng, chưa sửa source

Người dùng duyệt điều tra bốn ca timeout ngoài ngoại lệ của lượt coverage đầy đủ
`vocabulary-frontend-remaining-draft-scoped-01`. Chỉ dùng diagnostic config/setup
và bộ lấy mẫu đã có, không thay source, assertion, timeout hoặc runtime. Không
chạy lại full suite nguyên trạng để chọn lượt xanh.

Trước đo, CPU ba mẫu **62,7 / 40,3 / 91,3%**, RAM 9.128 MiB, page reads 0;
không thấy test/evaluation khác khớp bộ lọc hạn chế. Sau đọc mã, đo lại
**80,6 / 81,7 / 75,8%**. Không chạy tác vụ coverage nặng ở tải này; chỉ hai lượt
diagnostic có giới hạn, một worker, BelowNormal, `--bail=1`: một ca Vocabulary
rồi nhóm ba ca App. Tải cao vẫn được ghi lại, không coi không thấy process theo
bộ lọc là máy rảnh, không dừng tác vụ khác.

| Ca | Kết quả diagnostic, không coverage | CPU trong thân test, số mẫu |
| --- | --- | --- |
| Vocabulary: thiếu SQL vẫn đọc nội dung, không bịa số 0 | Qua **4.018 ms** | Trung bình **84,24%**, max **92,19%**, 7 mẫu |
| App: phục hồi live voice catalog | Qua **3.055 ms** | Trung bình **70,78%**, max **83,33%**, 6 mẫu |
| App: gửi tiếng Việt nguyên văn/nghe câu trả lời | Qua **1.463 ms** | Trung bình **75,37%**, max **77,63%**, 2 mẫu |
| App: login/register đúng API, không reload | Qua **1.627 ms** | Trung bình **77,85%**, max **91,67%**, 3 mẫu |

RAM khả dụng tối thiểu cả lượt Vocabulary **9.091 MiB**, App **9.008 MiB**;
sampler không lỗi. Không cộng CPU toàn máy với process CPU trong timeline.

Các điểm chi phí đo được:

- Vocabulary `openFood()` chờ role region chủ đề toàn trang **1.264,91 ms** tới
  settlement, trong đó **1.131,90 ms** đồng bộ; không cộng hai số vì lồng nhau.
  Quét toàn trang mọi nút `Thử tải lại dấu nhớ` để chọn nút đầu **772,70 ms**.
  Chờ heading apple **772,14 ms**, có cả render/chờ detail, không gọi là chi phí
  query thuần. Đếm đủ 50 article **248,33 ms**, không bỏ/đổi assertion này.
- App voice catalog: helper `open()` query mở lịch sử **146,10 ms**, query Chat 1
  **175,38 ms**, click chọn Chat 1/render **314,51 ms**. Query nút retry voice
  **156,46 ms** tới settlement; chờ nút bắt đầu enabled **194,23 ms** gồm polling,
  query và cập nhật UI, không coi là chỉ query.
- App tiếng Việt: helper `open()` query mở lịch sử **233,28 ms**, query Chat 1
  **164,60 ms**; query gửi **117,77 ms**, nghe **145,89 ms** đều toàn trang.
- App login/register: query nút login toàn trang **482,67 ms**, nút đổi sang
  register **175,83 ms**, nút submit register **125,26 ms**; hai lần chờ textbox
  Hội thoại **311,21 / 154,11 ms** gồm cập nhật UI sau auth, không riêng query.

**4/4 qua ở lượt diagnostic không thay thế full coverage đã lỗi.** Không tái
hiện timeout ở đây; chưa xác định operation đang chạy khi bốn ca timeout trong
suite trước. Không thấy pending query được theo dõi tại `test.finished`, không
settlement sang owner/test khác, body trống tại `test.finished` ở cả bốn ca.
Điều này chỉ mô tả các operation được bọc trong các lượt này, không chứng minh
mọi timer/promise sạch hoặc runtime auth/voice không thể có lỗi.

Đối chiếu DOM để đề xuất phạm vi sửa **test/helper**, chưa áp dụng:

1. `open()` chọn lịch sử qua complementary Thanh bên học tập và dialog Lịch sử
   hội thoại, thay vì hai query button toàn trang; giữ luồng chọn và chờ tải.
2. Hai ca voice/chat dùng region Hội thoại cho retry/start/audio options/send/
   playback; giữ API fixture, điều kiện disabled/enabled, payload và TTS assertion.
3. Login/register neo vùng auth/form từ label/heading hiện có; vẫn dùng role/name
   cho button, textbox Hội thoại vẫn kiểm role/name trong region đã xác minh,
   giữ mọi hash/search/history/payload assertion. Không sửa AuthForm/OAuth runtime.
4. `openFood()` neo topic bằng nội dung tiêu đề rồi **vẫn kiểm region role/name/
   visibility**, dùng lại vùng list đã xác minh cho count/card. Nút retry đầu
   hiện nằm trong summary `Từ vựng trên tài khoản` (summary đứng trước page trong
   Harness); scope đúng summary thay cho quét mọi nút toàn trang. Giữ đủ 50 thẻ,
   fallback, disabled, không aria-pressed, không bịa 0, không nghe, không ghi dữ liệu.

Không đổi test budget bằng cách chia ca, không `hidden: true`, không bỏ assertion
hoặc đổi cleanup/pool/React flags/default config. Cần duyệt áp dụng nhóm sửa
query/helper này, rồi kiểm regression nhóm liên quan, lint/type/format và coverage
theo thứ tự. **Cổng vẫn 485/490 của lượt đầy đủ gần nhất**, chưa build/browser/
ảnh/CSV nghiệm thu; prompt chính chưa hoàn tất. Không commit/push/M3 hoặc Docker.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`vocabulary-missing-timeline-01{-tests.json,-timeline.json,-load.json,-summary.json,.log}`,
`app-four-blockers-timeline-01{-tests.json,-timeline.json,-load.json,-summary.json,.log}`.

## Tiếp tục prompt chính — đo tải xuyên lượt, chưa vượt cổng frontend

Người dùng yêu cầu tiếp tục các công việc để hoàn thiện prompt chính. Tiếp tục
đúng thứ tự lát cắt hai chủ đề; không coi yêu cầu này là duyệt mở rộng AI/chủ đề,
runtime auth/chat/voice, timeout, commit/push hoặc triển khai vào Docker.

### Bằng chứng và thay đổi test

Thêm diagnostic config/setup và runner **chỉ trong artifact**. Config alias
query/render/fireEvent/waitFor ở hai file App/Từ vựng, delegate hàm gốc, ghi
timeline wall/process CPU, epoch và các operation được theo dõi pending. Runner
lấy mẫu CPU toàn máy bằng Windows `GetSystemTimes` và RAM bằng
`GlobalMemoryStatusEx` khoảng 0,5 giây, chỉ đọc, không dependency mới. Chạy test
tuần tự một worker, BelowNormal. Các lượt kiểm chính thức không dùng transform
timeline; bộ lấy mẫu tải nằm ngoài worker và không bọc React/query.

- Ca App tạo lần đầu đo riêng **qua 2.385 ms**; các query toàn trang tại `send()`
  tốn 168,72 / 154,35 ms cho nút gửi; mở lịch sử 151,71 ms, tìm Chat 200 135,77 ms.
- Ca Từ vựng lọc/back đo riêng **qua 4.162 ms**: đếm đủ 50 article **817,51 ms**,
  query vắng heading apple sau lọc **542,49 ms**, tìm lại vùng topic **273,94 ms**,
  tìm lại vùng list trong `wordCard` **154,66 ms**. Không bỏ/đổi hai assertion
  tốn nhiều thời gian đầu tiên để làm nhanh.
- Trong khoảng thân test được đối chiếu theo epoch, CPU App trung bình **63,73%**,
  tối đa **84,85%** (5 mẫu); Vocabulary **75,67%**, tối đa **97,35%** (7 mẫu).
  Không pending query được theo dõi tại test finished/suite afterAll ở hai lượt
  này; không chứng minh mọi promise runtime sạch hoặc nguyên nhân lượt suite trước.

Sửa **chỉ test/helper** theo các vùng đã xác minh:

- `send`/`closeHistory` nhận query scope tùy chọn, mặc định vẫn screen. Ca tạo
  lần đầu dùng region Hội thoại, complementary Thanh bên học tập và dialog
  Lịch sử hội thoại; vẫn gửi hai tin, kiểm đúng payload, aria-current và chỉ tạo
  một lần. Đã đối chiếu Chat không đổi key/remount khi `onCreated` cập nhật draft
  identity, không dùng scope của node bị tháo khỏi DOM.
- `openFood` nhận vùng topic đã xác minh nếu có; `wordCard` nhận vùng list đang
  có, tránh tìm lại cùng vùng. Ca lọc/back vẫn giữ **50 article**, lọc còn 1,
  CEFR loại apple, topic search/back focus, role/name/visibility và không gọi TTS.
  Các call site khác giữ default, riêng `openFood` dùng list nó vừa xác minh.

Nhóm hai ca không bộ đo **2/2 qua**: App 3.888 ms, Vocabulary 2.669 ms.
Lint đầu **fail do thay đổi của trợ lý**: helper `closeHistory` không còn call
site. Đã sửa bằng scope tùy chọn và gọi lại helper, không xóa helper/nuốt cảnh
báo. Lint/type/format cả hai phía sau sửa **qua**, giữ nguyên artifact lỗi đầu.

### Lượt dừng sớm không phải coverage nghiệm thu

Lượt `vocabulary-frontend-remaining-scoped-01` bật `--bail=1` nên dừng tại timeout
ca giữ bản nháp/đổi tab (một trong sáu ngoại lệ đã duyệt): **79 qua, 1 lỗi**,
còn nhiều test chưa chạy. Coverage tạm **32,07 / 31,25 / 38,77 / 33,20%** theo thứ
tự statements/branches/functions/lines, threshold vẫn 80 và runner vẫn exit 1.
**Không dùng coverage lượt dừng sớm để đánh giá toàn suite hoặc tuyên bố đạt.**
CPU 217 mẫu, trung bình 73,39%, max 100%, RAM tối thiểu 8.819 MiB.

Đo ca giữ bản nháp riêng: **qua 2.695 ms**, nút gửi query toàn trang **329,82 ms**,
bốn query navigation **123,10 / 81,48 / 144,65 / 89,87 ms**. Scope navigation/main/
chat ở riêng ca này; lấy lại region Hội thoại sau mỗi lần đổi tab vì Chat remount.
Giữ nguyên bốn hành động chuyển tab, nội dung draft, payload gửi, reply, chỉ một
conversation và heading Chat 200. Không dùng node của lần mount trước để kiểm
lần mount mới. Regression không bộ đo **13/13 qua** (hai ca App + toàn bộ 11 ca
Từ vựng): draft 2.033 ms, tạo lần đầu 1.134 ms, vocabulary filter 2.668 ms.
Ruff/Black/mypy, ESLint/TypeScript, Prettier **qua** lần nữa sau thay đổi này.

### Coverage đầy đủ mới nhất — dừng tại bốn lỗi ngoài ngoại lệ

Sau thay đổi scope ca draft và regression/lint, chạy coverage đủ **490 test**
theo cấu hình thường, một worker, **không bail** để sáu ngoại lệ cũ không cắt cụt
toàn suite, không timeline transform. Đây là kiểm mã đã thay đổi, không retry
nguyên trạng để chọn lượt xanh; lượt dừng sớm trước vẫn giữ riêng.

Kết quả `vocabulary-frontend-remaining-draft-scoped-01`: **485 qua, 5 lỗi / 490**,
0 pending; **39/41 file qua**. App **40/44**, Vocabulary **10/11**, LandingPage
**2/2**. Các ca vừa chỉnh đều qua: draft **3.331,05 ms**, tạo lần đầu **967,27 ms**,
vocabulary filter **4.558,64 ms** (vẫn sát giới hạn), LandingPage **2.905,17 ms**.

| Ca timeout 5.000 ms | Duration runner ghi | Ngoại lệ đã duyệt? |
| --- | ---: | --- |
| App: `shares saved Settings voices and speed with chat and restores them after signing in again` | 5.655,97 ms | Có |
| App: `recovers a failed live voice catalog before allowing a call` | 11.519,99 ms | **Không** |
| App: `sends Vietnamese without changing the user message and reads the returned content` | 8.974,63 ms | **Không** |
| App: `logs in without reload and registers with the real API field names` | 6.923,27 ms | **Không** |
| Vocabulary: `keeps authored content available without SQL tables and never invents a zero count` | 5.744,87 ms | **Không** |

Không thấy `overlapping act()`, `not wrapped in act`, `Unhandled Error`,
`Unhandled Rejection` trong log. Không suy ra năm lỗi là năm hồi quy độc lập hoặc
cơ chế async đã loại mọi tác động chéo. Chưa đo operation của bốn ca lỗi trong
lượt coverage đầy đủ nên không suy diễn nguyên nhân.

Coverage đủ suite: statements **90,04%**, branches **82,67%**, functions **86,20%**,
lines **93,15%**; từng ngưỡng đạt, **suite vẫn chưa qua**. **Dừng tại bốn lỗi ngoài
ngoại lệ**, chưa build/browser, ảnh UI/CSV nghiệm thu hoặc làm bốn mục còn lại.
Prompt chính **chưa hoàn tất**. Không sửa runtime auth/OAuth/chat/voice để xử lý
test này; không mở rộng ngoại lệ hoặc retry full suite nguyên trạng.

Tải xuyên toàn lượt: **1.297 mẫu**, CPU trung bình **80,12%**, median **82,20%**,
p95 **100%**, **423 mẫu ≥90%**; RAM khả dụng tối thiểu **8.156 MiB**, sampler không
lỗi. Trung bình trong khoảng file App **77,69%** (225 mẫu), Vocabulary **75,08%**
(42 mẫu), LandingPage **80,89%** (6 mẫu). Đây là tải toàn máy, không phải CPU riêng
worker và không chứng minh nguồn tiến trình hoặc mọi timeout đều do tải. Không
dừng/đụng tác vụ khác. Mẫu trước full: **74,6 / 71,2 / 47,7%**, RAM 9.384 MiB,
không thấy test/evaluation khác khớp bộ lọc hạn chế; không dùng nó để phủ nhận tải
xuyên lượt đã đo.

Phạm vi tiếp theo cần duyệt khi tiếp tục: điều tra có giới hạn bốn timeout ngoài
ngoại lệ và đối chiếu tải xuyên lượt, chưa sửa auth/voice runtime hoặc đặt lại
React flags. Không thay timeout/assertion/pool/default, không tăng tài nguyên
hoặc dừng tiến trình khác khi chưa được phép.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`remaining-timeline.{config.mts,setup.mts}`, `run_remaining.py`,
`app-create-first-timeline-01*`, `vocabulary-filter-timeline-02*`,
`app-preserve-draft-timeline-01*`, `remaining-scoped-normal-01.{json,log}`,
`remaining-draft-scoped-regression-01.{json,log}`,
`vocabulary-frontend-remaining-scoped-01*` (dừng sớm),
`vocabulary-frontend-remaining-draft-scoped-01*` (đầy đủ, summary/load/coverage).
Lint tại `.artifacts/vocabulary-preflight-20261115/`:
`vocabulary-lint-remaining-scoped-01.log` (lỗi helper không dùng),
`vocabulary-lint-remaining-scoped-02.log`,
`vocabulary-lint-remaining-draft-scoped-01.log` (đều qua sau sửa).
Không commit/push/M3, đổi dependency/env hoặc triển khai vào Docker.

## LandingPage đã scope query — qua đích, dừng tại hai timeout ngoài ngoại lệ

Người dùng duyệt thu hẹp query theo header/tablist/FAQ/hero, giữ runtime,
assertion, hành động và timeout. Chỉ sửa `frontend/src/landing/LandingPage.test.tsx`:

- Neo hero bằng nội dung h1, lấy section chứa h1 và vẫn kiểm heading bằng
  role + accessible name như cũ; CTA register được tìm trong hero này.
- Tab vẫn được tìm bằng role + name, trong tablist `Các bước học tập`.
- Neo FAQ bằng heading h2 `Câu hỏi thường gặp`, tìm nút bằng role + name trong
  section chứa heading; nút login nằm trong implicit role `banner` của header.
- Thêm assertion section hero/FAQ tồn tại; giữ nguyên mọi assertion cũ, kể cả
  text toàn trang, đủ bốn tình huống, cấm chỉ số quảng cáo giả và số lần callback.
  Không bỏ/skip test, chia nhỏ ngân sách, dùng `hidden: true` hay đổi runtime/DOM.

Kiểm tuần tự, BelowNormal, test một worker, cấu hình thường **không bộ đo**:

1. LandingPage **2/2 qua**; ca hero/steps/FAQ **1.575 ms**, reveal **361 ms**.
2. Ruff/Black/mypy, ESLint/TypeScript và Prettier **đều qua**.
3. Coverage toàn frontend: **488 qua, 2 lỗi / 490**, 0 pending, **39/41 file qua**.
   LandingPage **2/2 qua** (ca vừa chỉnh **2.085,67 ms**); App **43/44**, Từ vựng
   **10/11**, helper regression **7/7**. Không thấy `overlapping act()`,
   `not wrapped in act`, `Unhandled Error` hoặc `Unhandled Rejection` trong log.

Hai lỗi đều báo **Test timed out in 5000ms**, **ngoài sáu ngoại lệ App**:

| File / ca | Duration runner ghi |
| --- | ---: |
| `frontend/src/App.test.tsx:702` — `creates once on the first message, keeps the draft and sends to that conversation` | 8.117,18 ms |
| `frontend/src/vocabulary/vocabulary.test.tsx:142` — `shows both complete topics, all fifty cards, accent-insensitive filters and back focus` | 5.942,86 ms |

Không coi duration ghi vượt 5.000 ms là timeout đã đổi; deadline vẫn giữ nguyên.
Không suy diễn hai lỗi do LandingPage/helper, tải máy hoặc là hồi quy runtime;
chưa có trace trong lượt coverage này để xác định operation gây timeout.
Không coi ca LandingPage qua một lượt là hết flake. Ca Settings App vẫn sát giới
hạn (**4.901,64 ms**); việc không có cảnh báo act không chứng minh mọi async sạch.

Coverage vẫn đạt: statements **90,13%**, branches **82,67%**, functions **86,37%**,
lines **93,22%**, nhưng **cổng suite chưa qua**. Đã dừng, không retry full suite
để chọn lượt xanh, chưa build/browser/CSV nghiệm thu hoặc sửa hai ca khác. Phạm
vi tiếp theo cần duyệt: đo có giới hạn hai ca lỗi kèm timeline thao tác và tải
CPU/RAM xuyên lượt, đối chiếu signal/boundary; chưa tiếp tục sửa query theo suy
đoán hoặc thay timeout/assertion/runtime/pool/default.

Tải trước sửa/test: CPU **64,3 / 53,0 / 55,3%**, RAM **9.012 MiB**; trước coverage:
**50,5 / 43,6 / 59,0%**, RAM **9.136 MiB**, page reads 0. Không thấy tiến trình
test/evaluation khác khớp mẫu kiểm. Chưa đo xuyên lượt; các mẫu này không giải
thích được toàn bộ timeout.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`landing-scoped-normal-01.{json,log}`;
`.artifacts/vocabulary-preflight-20261115/`:
`vocabulary-lint-landing-scoped-01.log`,
`vocabulary-frontend-landing-scoped-01.{json,log}`, `-summary.json` và coverage.
Giữ nguyên kết quả lỗi/qua cũ; không commit/push/M3, dependency/env hoặc Docker.

## Điều tra LandingPage được duyệt — đã đo, chưa sửa test/runtime

Người dùng duyệt điều tra riêng ca LandingPage ngoài ngoại lệ, giữ runtime,
assertion và timeout. Ca đầu `frontend/src/landing/LandingPage.test.tsx` là test
đồng bộ: render, truy vấn screen, fireEvent và assertion; không có `await`,
`waitFor` hoặc `findBy*`. File không đăng ký async boundary của App. Chưa có bằng
chứng ca này cùng nguyên nhân pending async qua cleanup đã thấy ở App.

Tạo diagnostic config/setup **chỉ trong artifact**: transform alias local
`screen`, `fireEvent`, `render` rồi delegate hàm gốc; ghi wall/process CPU và
vị trí gọi, không sửa câu lệnh/assertion, không lưu đối số. Không áp dụng bộ đo
vào config mặc định hoặc chạy chung với coverage. Kiểm tải trước đo: CPU ba mẫu
**63,3 / 50,0 / 53,3%**, RAM **9.409 MiB**, page reads 0; không thấy tiến trình
test/evaluation khác khớp mẫu kiểm. Chạy một ca, một worker, BelowNormal,
`--bail=1`: **1 qua, 1 không chọn**, ca đích **2.150 ms**, hook/file 2.156 ms.

Timeline đồng bộ không lồng nhau giữa các nhóm đo chính:

| Nhóm thao tác | Wall time đo được |
| --- | ---: |
| Render | 791,13 ms |
| Năm `screen.getByRole` | 1.051,34 ms |
| `fireEvent.click` | 160,06 ms |
| Truy vấn text còn lại | 100,96 ms |

Trong `getByRole`: heading toàn trang **360,85 ms**, tab **75,16 ms**, FAQ button
**376,64 ms**, login button **202,02 ms**, CTA register **36,67 ms**. Tổng operation
đo **2.103,49 ms**; không cộng process CPU với wall time. Bộ đo cũng có overhead,
lượt ca riêng qua **không thay thế** cổng coverage đã lỗi và không chứng minh
được tải/điểm dừng chính xác của lượt suite trước.

Đối chiếu implementation: login nằm trong `header` có implicit role `banner`;
tab nằm trong `tablist` tên `Các bước học tập`; FAQ thuộc section có heading
`Câu hỏi thường gặp`; hero có h1 riêng. Có thể thu hẹp các role query theo các
vùng/heading này mà giữ đúng role, accessible name, hành động và toàn bộ assertion,
không dùng `hidden: true`, không thay timeout hoặc chia nhỏ test để đổi ngân sách.
Đây là **đề xuất sửa test cần duyệt tiếp**, chưa chỉnh source. Không coi chi phí
role query là bằng chứng nguyên nhân duy nhất của timeout 6.367 ms trước.

Không chạy lại suite để chọn lượt xanh; trạng thái cổng vẫn **489/490 qua**, lỗi
LandingPage ngoài ngoại lệ. Chưa build/browser/CSV nghiệm thu, không commit/push,
M3, đổi dependency/env/Docker hoặc sửa runtime.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`landing-timeline.{config.mts,setup.mts}`,
`landing-query-timeline-01{-tests.json,-timeline.json,-summary.json,.log}`.

## Helper async đã được duyệt — App qua, dừng tại timeout LandingPage

Người dùng duyệt cơ chế sở hữu async phía test và chờ thao tác đã biết kết thúc
sau cleanup, trong deadline hook hiện có. Đã thêm `frontend/tests/asyncBoundary.ts`:
mỗi boundary giữ signal của test; kết quả hoàn tất sau abort không được trả về
cho continuation như một kết quả thành công. Rejection gốc vẫn được truyền lại,
không nuốt lỗi. Nếu test chưa abort nhưng để pending operation lúc kết thúc,
cleanup báo lỗi thay vì âm thầm chấp nhận. Test kế tiếp không được mở boundary
trước khi drain xong. Không tăng test/hook timeout hoặc đặt cờ React.

`frontend/src/App.test.tsx` chủ động đăng ký boundary, bọc RTL `asyncWrapper` và
các lời gọi async `act`, khôi phục wrapper/đăng ký ở `afterAll`. Setup chung chỉ
thêm điểm gọi drain **sau RTL cleanup**, trước `unstubAllGlobals`; file không đăng
ký không có operation cần drain. Không đổi thứ tự cleanup/globals, pool/default
Vitest, assertion, fixture ứng dụng hoặc runtime auth/chat/voice. Điểm chờ reload
nêu ở mục trước **chưa sửa**; chưa kết luận nó gây timeout.

Giới hạn: cơ chế này chỉ theo dõi thao tác được bọc, không hủy mọi promise/timer
runtime và không ngăn mã tùy ý bên trong callback async tự chạy tiếp. Nếu thao tác
không bao giờ settle, hook vẫn phải lỗi theo deadline có sẵn; không gia hạn hoặc
ép reset trạng thái để vượt cổng.

Kiểm chứng tuần tự, BelowNormal, một worker khi chạy test:

- Unit regression mới **7/7 qua**: success, abort/late continuation, lỗi gốc,
  không gọi operation đã abort, pending không được await và đăng ký drain.
- Fixture chẩn đoán riêng dùng **timeout runner thật 5.000 ms**, không thêm vào
  suite mặc định: ca đầu cố ý **fail** (5.027 ms), ca kế tiếp **qua** (7 ms), không
  có continuation muộn thay đổi trạng thái. Child runner exit **1** được giữ và
  proof chỉ thành công khi đúng một fail timeout + một pass. Đây là lỗi cố ý để
  chứng minh không che timeout, không phải một suite sản phẩm được coi là xanh.
- Nhóm sáu ca App ở cấu hình thường, **không bộ đo**: **6/6 qua**, 38 không chọn.
  Hủy/tải lại/đóng 3.722 ms, microphone 2.151 ms, Settings 3.102 ms, phục hồi account
  1.335 ms, logout 935 ms, provider configuration 507 ms.
- Ruff/Black/mypy, ESLint/TypeScript và Prettier **đều qua**.
- Coverage toàn frontend cấu hình thường: **489 qua, 1 lỗi / 490**, 0 pending;
  **40/41 file qua**, App **44/44**, Từ vựng **11/11**, helper regression **7/7**.
  Không thấy `overlapping act()`, `not wrapped in act`, `Unhandled Error` hoặc
  `Unhandled Rejection` trong log lượt này. Không suy ra đã hết mọi flake: ca
  Settings App qua ở **4.999,32 ms**, ca TTS Vocabulary ở **4.755,02 ms**, còn sát
  giới hạn hiện tại.

Lỗi còn lại **ngoài sáu ngoại lệ App**:
`frontend/src/landing/LandingPage.test.tsx:40`, ca
`renders hero, interactive steps, learning scenarios, and FAQ on a single white canvas`.
Runner báo **Test timed out in 5000ms**, duration ghi **6.367,04 ms**. Chưa điều tra
hoặc sửa LandingPage, chưa kết luận do helper/tải máy/runtime và không tự mở rộng
ngoại lệ. **Dừng tại cổng này**, không retry để chọn lượt xanh, chưa build/browser/
CSV nghiệm thu. Cần duyệt riêng nếu tiếp tục điều tra ca LandingPage.

Coverage tổng: statements **90,13%**, branches **82,67%**, functions **86,37%**,
lines **93,22%**; đạt từng ngưỡng nhưng **không thay thế điều kiện suite qua**.
Tổng test tăng 483 → 490 chỉ do thêm bảy regression helper, không skip/bỏ ca cũ.

Tải trước nhóm App: ba mẫu CPU đầu **46,5 / 72,2 / 78,1%**, RAM 8.928 MiB;
đọc/đối chiếu rồi đo lại **67,6 / 68,7 / 49,0%** trước khi chạy. Trước coverage:
**47,6 / 33,0 / 47,6%**, RAM **8.899 MiB**, page reads 0, không thấy tiến trình
test/evaluation khác khớp mẫu kiểm. Không dùng mẫu này đại diện tải cả lượt.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`async-boundary-unit-01.{json,log}`,
`async-boundary-real-timeout-01.{json,log}` và `-proof.json`,
`timeout-isolation.{config.mts,fixture.ts}`,
`app-async-boundary-normal-group-01.{json,log}`;
`.artifacts/vocabulary-preflight-20261115/`:
`vocabulary-lint-async-boundary-01.log`,
`vocabulary-frontend-async-boundary-01.{json,log}`, `-summary.json` và coverage.
Không commit/push/M3, không đổi dependency/env hoặc triển khai vào Docker.

## Đã quan sát pending RTL query kết thúc sau cleanup — cần duyệt sửa helper

Người dùng duyệt điều tra nhóm async App, chưa sửa runtime/harness. Đọc test và
implementation xác định một điểm chờ yếu ở ca hủy/tải lại/đóng: sau click reload,
`findByText('Đã hủy phản hồi.')` có thể tìm lại dòng đã hiện từ bước hủy trước;
reload giữ messages cũ trong lúc `loading=true`. Vì vậy chờ dòng này một mình
**không chứng minh reload hoàn tất**. Chưa sửa test hoặc khẳng định đây là nguyên
nhân timeout; cần thêm kiểm ranh giới tải xong nếu được duyệt.

Mẫu CPU đầu **81%** nên chưa chạy ngay. Sau đọc mã, đo ba mẫu counter liên tiếp
**47,9 / 54,7 / 54,5%**; RAM mẫu đầu 8.255 MiB, không thấy test/evaluation khớp
mẫu. Bổ sung listener **chỉ quan sát** `context.signal.abort` vào setup chẩn đoán
trong artifact; không hủy thêm thao tác, không thay signal/runtime/default config.

Chạy nhóm sáu ca App liên quan bằng bộ đo async, một worker, BelowNormal,
`--bail=1`, không coverage: **5 qua, 1 timeout, 38 không chọn**. Ca hủy/tải lại/
đóng qua 2.369 ms; microphone 1.989 ms; Settings 3.202 ms; phục hồi account/history
1.202 ms; logout 1.896 ms. Ca `shows provider configuration failure and never
enables mock implicitly` timeout 5.000 ms (Vitest ghi 5.066 ms).

Trace của ca timeout ghi:

| Mốc tương đối từ khởi tạo bộ đo | Trạng thái |
| --- | --- |
| 18.426,64 ms: test signal aborted | RTL async #46 vẫn pending, thuộc `open()` tại chờ hết chỉ báo tải tin nhắn |
| 18.441,75 ms: cleanup bắt đầu | Cùng thao tác #46 vẫn pending |
| 18.445,65 ms: cleanup xong | Body trống, #46 vẫn pending |
| 18.445,87 / 18.448,76 ms: test finished/failed | #46 vẫn pending |
| 18.453,07 ms: RTL async #46 resolved | Xảy ra **sau cleanup và test finished** |
| 18.459,13 ms: suite afterAll | Không còn thao tác được theo dõi pending |

Đây là bằng chứng cụ thể một thao tác chờ của test timeout còn sống qua cleanup,
không chỉ suy luận từ DOM rỗng. Vì bail dừng trước test kế tiếp, **chưa quan sát
resolve trong một test khác**, chưa chứng minh thao tác này gây mọi lỗi trước.
Signal Vitest abort không tự hủy promise RTL đã tạo. Chưa đo/đếm toàn bộ promise
runtime, không dùng số liệu này kết luận auth/chat/provider hỏng.

**Dừng tại lỗi nhóm chẩn đoán, chưa chạy lại coverage/build/browser hoặc sửa
source/setup mặc định.** Đề xuất cần duyệt: helper test có nhận signal của chủ
test, không cho query đã abort trả về để tiếp tục thao tác UI; sau cleanup chờ
các thao tác đã biết kết thúc trong hook deadline hiện có trước khi test kế tiếp
bắt đầu. Không đặt lại React internal/global flags, không nuốt lỗi query/test,
không tăng test/hook timeout, không sửa runtime auth/chat/voice. Cần regression
chứng minh test timeout vẫn fail và không tác động test sau; không chỉ chọn một
lượt suite qua để coi đã sửa. Phạm vi chính xác cần kiểm chứng trước triển khai.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`app-pending-async-group-01{-tests.json,-trace.json,-summary.json,.log}`;
listener bổ sung nằm trong `async-boundary.setup.mts` chỉ dùng diagnostic config.
Không commit/push/M3, không đổi dependency/env/Docker hay tác vụ khác.

## Tiếp tục ca tạo chat/lịch sử — đã qua ca đích, toàn suite chưa qua

Sau yêu cầu tiếp tục công việc, đo riêng ca `creates new chats and supports the
mobile history menu` bằng inspector tạm: **qua**, 3.579 ms gồm hook; phần thân
đo 3.070,34 ms. Inclusive role query **1.267,11 ms**, computed style **1.572,44 ms**,
React **995,66 ms**; các nhóm lồng nhau, không cộng hoặc gọi là compute thuần.
Những query toàn workspace cho nút lịch sử/đóng backdrop/Chat 99 tốn lần lượt
khoảng 112–174 ms và có thể tối ưu đúng vùng mà không đổi luồng.

Chỉ chỉnh ca này trong `frontend/src/App.test.tsx`: neo nút mở lịch sử/Hội thoại
mới trong complementary Thanh bên học tập, heading trong main và Chat 99 trong
dialog Lịch sử hội thoại. Giữ `open()`/`send()` chung, toàn bộ hành động đóng
backdrop, mở lại, Escape, tạo bằng gửi tin nhắn, xác nhận Chat 200 rồi chọn Chat 99.
Không đổi viewport, assertions, timeout, dữ liệu hay runtime chat/auth/voice.

Lượt kiểm scope đầu **lỗi do thay đổi của trợ lý**: nút `Đóng danh sách hội thoại`
là backdrop **sibling ngoài dialog**, không phải descendant. Đã đọc implementation
xác minh vị trí và trả đúng query toàn trang cho backdrop, không đổi tên hoặc
bỏ assertion. Lượt lỗi giữ nguyên artifact, không coi là lỗi ứng dụng.
Ca đích sau sửa **qua 2.090 ms** ở cấu hình thường; 43 ca không chọn.

Lint/type/format cả hai phía qua. Coverage toàn frontend cấu hình thường, một
worker, BelowNormal: **469 qua, 14 lỗi / 483**, 0 pending, 39/40 file qua.
Vocabulary **11/11 qua**, ca lọc/back focus 2.070 ms. Ca App vừa sửa cũng qua
trong suite nhưng **4.891 ms**, sát giới hạn; chưa chứng minh hết flake.
Coverage: statements **89,45%**, branches **82,33%**, functions **85,50%**, lines
**92,49%** — đủ ngưỡng nhưng **suite chưa qua**.

Các timeout mở lớp voice/tải thêm lịch sử thuộc ngoại lệ cũ vẫn xuất hiện. Ca
`cancels a pending reply, reloads it and closes a conversation` timeout **ngoài
ngoại lệ**; sau các ca thoại/Settings có `overlapping act()` và các ca sau DOM
rỗng. Danh sách đầy đủ 14 ca ở JSON summary, không suy diễn là 14 hồi quy độc lập
hoặc tự mở rộng ngoại lệ. **Dừng tại cổng lỗi mới**, chưa build/browser/CSV nghiệm
thu hoặc sửa runtime. Không retry để chọn lượt xanh, không đổi cleanup/default
Vitest/timeout/coverage/dependency/env, không commit/push hoặc can thiệp Docker.

Mẫu CPU trước điều tra **35%**, RAM 9.072 MiB; trước coverage **33%**, không thấy
test/evaluation khác khớp mẫu. Không dùng mẫu tại một thời điểm để giải thích
toàn bộ timeout. Cần xác nhận phạm vi tiếp theo cho nhóm async App ngoài ngoại lệ.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`app-create-mobile-history-01{-tests.json,-queries.json,-summary.json,.cpuprofile,.log}`,
`app-scoped-create-history-01.{json,log}` (lượt sai scope backdrop),
`app-scoped-create-history-02.{json,log}` (lượt đã sửa);
`.artifacts/vocabulary-preflight-20261115/`:
`vocabulary-lint-create-history-01.log`, `vocabulary-frontend-create-history-01.{json,log}`,
`vocabulary-frontend-create-history-01-summary.json` và thư mục coverage tương ứng.

## Ca Vocabulary tìm/lọc–quay lại: đã sửa theo timeline, còn cổng App

Người dùng duyệt đo và xử lý ca còn lại, giữ 50 từ/assertion/timeout. Bộ đo tạm
`filter-timeline.*` chỉ alias các import query/fireEvent trong bộ nhớ và delegate
đến hàm gốc, ghi thời gian đồng bộ/settlement và process CPU, không ghi đối số.
Không có bộ đo trong các lượt kiểm sau sửa. Lượt đo ca riêng **qua 2.035 ms**;
truy vấn region chủ đề toàn trang ban đầu mất **487,19 ms đồng bộ / 533,25 ms tới
settlement**, là thao tác được đo chậm nhất. Chờ region danh sách sau mở chủ đề
mất 310,08 ms tới settlement (gồm cả render/chờ dữ liệu, không gọi là chờ mạng).

Chỉ sửa `frontend/src/vocabulary/vocabulary.test.tsx`:

- Ca đích chờ `strong` tên chủ đề xuất hiện, lấy section rồi bổ sung kiểm role
  region, accessible name và visibility; vẫn kiểm nút Văn phòng bằng role/name.
- Helper `openFood()` chờ `h3` apple thay vì tìm region toàn trang khi chi tiết
  chưa tải, xác minh role/name/visibility của section danh sách; vẫn chờ heading
  và kiểm role/name trong thẻ. Trả query vùng cho ca đích dùng lại qua các lần lọc,
  không cache vùng qua test hoặc qua điều hướng.
- Giữ nguyên assertion đủ **50 article**, sau lọc còn một, CEFR loại apple,
  focus heading/back và giá trị tìm chủ đề sau quay lại. Không dùng hidden query,
  mock UI hoặc giảm từ; không đổi implementation/runtime, timeout hay threshold.

Kết quả tuần tự một worker, BelowNormal:

- Vocabulary cấu hình thường **11/11 qua**; ca đích **1.855 ms**.
- Lint cả hai phía qua Ruff/Black/mypy, ESLint/TypeScript và Prettier.
- Coverage frontend toàn bộ **479 qua, 4 timeout / 483**, không pending;
  Vocabulary **11/11 qua**. Coverage statements **89,87%**, branches **82,57%**,
  functions **86,02%**, lines **92,93%** — đủ bốn ngưỡng nhưng chưa suite xanh.
- Bốn timeout đều App: mở lớp bằng voice, tải lịch sử trang tiếp, khôi phục
  Settings sau đăng nhập (ba ngoại lệ cũ), và `creates new chats and supports
  the mobile history menu` (**ngoài sáu ngoại lệ**).

**Đã dừng vì ca App ngoài ngoại lệ**, chưa build/browser hoặc sửa ca này.
Không tuyên bố hết flake từ một lượt Vocabulary qua trong coverage. Chưa thay
test harness/cleanup, auth/chat/voice runtime, config/default/env/dependency,
không commit/push/M3. Mẫu CPU trước điều tra **31%**, trước coverage **54%**;
không quy nguyên nhân ca App cho tải máy chỉ từ mẫu đó.

Bằng chứng `.artifacts/vocabulary-timeout/`:
`vocabulary-filter-query-timeline-01{-tests.json,-timeline.json,-summary.json,.log}`,
`vocabulary-label-anchor-suite-01.{json,log}`; trong
`.artifacts/vocabulary-preflight-20261115/`: `vocabulary-lint-filter-anchor-01.log`,
`vocabulary-frontend-filter-anchor-01.{json,log}` và
`vocabulary-frontend-filter-anchor-01-coverage/coverage-summary.json`.

## Kiểm tra ranh giới async/cleanup — không có cơ sở sửa harness ở lượt đo

Sau phê duyệt điều tra async giữa test, thêm bộ đo chỉ trong artifact:
`async-boundary.config.mts` transform import `act` của App sang wrapper quan sát;
`async-boundary.setup.mts` delegate tới `act`/RTL asyncWrapper gốc, theo dõi owner,
thời điểm begin/settle và pending tại các hook. Plugin đánh dấu cleanup trước/sau
trong bộ nhớ. Không ghi đè source/setup, đổi timeout hoặc assertion, không reset
React internals, không ghi cờ `IS_REACT_ACT_ENVIRONMENT`. Không theo dõi payload.
Bộ đo có thể thay đổi timing/microtask nên cần lượt xác nhận không bộ đo.

Kết quả tuần tự BelowNormal, một worker:

1. Diagnostic App với `--bail=1`, không coverage: **44/44 qua**, do không có lỗi
   nên không ca nào bị bỏ bởi bail. Trace có **942 event**: không pending operation
   được theo dõi tại boundary, không settle sang test khác; **44/44 cleanup** để
   body trống. Các thao tác được theo dõi không bao trùm mọi promise/timer runtime;
   chưa tái hiện timeout nên chưa chứng minh nguyên nhân của chuỗi lỗi cũ.
2. Xác nhận cấu hình bình thường, không bộ đo hoặc bail, với App + hai file worker:
   **55/55 qua**, không có cảnh báo act trong log. **Không sửa cleanup/harness**
   chỉ để làm mất cảnh báo, vì chưa có bằng chứng cần sửa.
3. Coverage toàn frontend cấu hình bình thường: **482 qua, 1 lỗi / 483**, 39/40 file
   qua, không worker/preload error hoặc cảnh báo act trong log. App **44/44 qua**;
   Vocabulary **10/11 qua**, lỗi duy nhất là timeout 5.000 ms của
   `shows both complete topics, all fifty cards, accent-insensitive filters and back focus`
   (Vitest ghi 5.738 ms gồm hook).
4. Coverage toàn bộ: statements **90,13%**, branches **82,67%**, functions **86,37%**,
   lines **93,22%**, đủ 80% từng chỉ số nhưng **suite chưa xanh**. Không dùng
   coverage đủ ngưỡng để bỏ qua ca Vocabulary lỗi. Không chạy lại baseline.

Mẫu CPU trước diagnostic **23%**, trước xác nhận thường **39%**, trước coverage
**54%**; không phải số đo liên tục trong suite. Không kết luận các lượt qua đã
chứng minh hết flake hoặc tải máy giải thích mọi lỗi trước đó.

**Đã dừng tại ca Vocabulary lỗi ngoài ngoại lệ App**, chưa build/browser hoặc
sửa tiếp test. Bước đề xuất: đo riêng timeline ca tìm/lọc–quay lại ở trạng thái
hiện tại, giữ đủ 50 từ và mọi kiểm focus/role/name, chỉ sửa theo bằng chứng sau
khi được duyệt. Không retry toàn suite để chọn kết quả đẹp. Runtime, mặc định
Vitest, dependency, `.env`, Docker/MySQL test và trạng thái commit không đổi.

Bằng chứng tại `.artifacts/vocabulary-timeout/`:
`app-async-boundary-bail-01{-tests.json,-trace.json,-summary.json,.log}` và
`async-audit-normal-regression-01.{json,log}`;
tại `.artifacts/vocabulary-preflight-20261115/`:
`vocabulary-frontend-async-audit-01.{json,log}` và
`vocabulary-frontend-async-audit-01-coverage/coverage-summary.json`.

## Kiểm tra sau khi người dùng giảm tải máy — vẫn chưa qua nhóm đích

Người dùng xác nhận đã giảm tải và yêu cầu tiếp tục. Mẫu trước lượt chạy:
**CPU `_Total` 36%**, **13.030 MiB RAM khả dụng**, page reads/sec bằng 0;
không thấy tiến trình test/build/evaluation khớp mẫu. Không sửa thêm mã nguồn,
test, cấu hình hoặc dependency. Chạy tuần tự một worker, BelowNormal, không
coverage, không inspector, với App và đúng hai file worker từng lỗi.

Kết quả **28 qua, 27 lỗi / 55**, không skip:

- `voice/transcriptGate.test.ts`: **10/10 qua**.
- `speech/identity.test.ts`: **1/1 qua**.
- `App.test.tsx`: **17 qua, 27 lỗi / 44**. Các ca sidebar/mobile và hai ca lỗi/
  hủy sample phát âm đều qua trong lượt này. Không có lỗi khởi động worker.
- Ca timeout đầu là `opens a server-bound lesson and begins Blaze voice without
  sending a hidden learner message` (ngoại lệ cũ). Tiếp đó ca ghi nhận buổi học
  vocabulary timeout (ngoài ngoại lệ), rồi các ca tạo chat/cuộn/stream cũng lỗi.
- Log xuất hiện `overlapping act()` tại ca khôi phục lịch sử; nhiều ca sau chỉ
  còn `<body><div /></body>`. Chưa có bằng chứng tất cả 27 lỗi là hồi quy độc lập.

**Đã dừng ở nhóm đích thất bại**, chưa chạy coverage/build/browser. Không tăng
timeout, bỏ test, sửa assertions, đổi pool hoặc can thiệp tiến trình khác.
Mẫu tải thấp hơn trước nhưng không đo liên tục; không quy nguyên nhân chỉ cho
CPU, cũng không dùng kết quả pass riêng trước đó để tuyên bố ổn định.

Đề xuất chuyển trọng tâm điều tra: cách công việc async/`act` còn chạy sau test
timeout ảnh hưởng test kế tiếp, thay vì tiếp tục tối ưu từng query hoặc retry
toàn suite. Cần phạm vi duyệt trước khi thay test harness/cleanup; không reset
React internals hoặc đặt cờ global để che cảnh báo, không sửa runtime auth/chat/
voice. Có thể dùng lượt chẩn đoán fail-fast và timeline async để bắt lỗi đầu,
nhưng nghiệm thu cuối vẫn phải toàn suite, đủ assertions/coverage như cũ.

Bằng chứng: `.artifacts/vocabulary-timeout/reduced-load-regression-01.json`
và `.artifacts/vocabulary-timeout/reduced-load-regression-01.log`.

## Helper neo qua nhãn: App riêng qua, coverage vẫn chặn; phát hiện tải CPU cao

Sau phê duyệt helper chung, `open()` tìm textarea bằng nhãn Tin nhắn, lấy section
chứa nó rồi **bổ sung** kiểm role region, accessible name Hội thoại, visibility
của region và textarea. Vẫn tìm textbox bằng role/name trong region và kiểm đó
chính là textarea đã tìm; không bỏ chờ nhập UI. Giữ render/act/import/cleanup,
mọi assertion cũ và timeout 5.000 ms. Chỉ sửa `frontend/src/App.test.tsx`.

Các lượt chạy tuần tự BelowNormal:

- Hai ca đích **2/2 qua**, 42 không chọn: sidebar 2.348 ms, mobile 603 ms.
- Toàn App **44/44 qua** không coverage; không có cảnh báo act trong log lượt này.
- Lint/type/format backend + frontend đều qua.
- Coverage toàn frontend sau đó **437 qua, 35 lỗi**, tổng reporter **472**;
  **hai file không khởi động được worker**, không phải suite đầy đủ 483 test.
  Vocabulary **11/11 qua**; hai ca sidebar/mobile đều qua (1.992/848 ms).
- Coverage nhận được: statements **86,43%**, branches **79,46%**, functions
  **81,74%**, lines **89,53%**. **Nhánh không đạt 80%**; không thay ngưỡng.
- Lượt coverage kéo dài khoảng **3.764 giây** theo runner ngoài. Log có timeout
  khởi động/đóng worker cho `voice/transcriptGate.test.ts` và
  `speech/identity.test.ts`. Cả hai là test thuần với tổng 11 ca, không gọi API
  voice thật. Chỉ đọc mã Vitest để xác minh lớp lỗi worker; không sửa node_modules.

Log App: ca draft đầu tiên timeout (thuộc ngoại lệ cũ), sau đó nhiều ca vẫn qua.
Chuỗi lỗi tiếp theo bắt đầu tại `surfaces pronunciation playback errors and
recovers navigation`, rồi ca hủy sample, URL; xuất hiện `overlapping act()` và
các ca sau có DOM rỗng. Đây là dấu hiệu nhiễm async sau timeout, **chưa chứng minh
tất cả 35 lỗi độc lập hoặc xác định lỗi runtime**.

Người dùng yêu cầu tiếp tục. Đã đọc log và đo riêng ca lỗi phát âm bằng inspector,
một worker, không coverage, không đổi test/setup mặc định: **1 timeout**, 43 ca
không chọn. Bộ đếm chỉ kịp ghi tới chờ alert, chưa tới kiểm nội dung và điều hướng.
Query nút Phát âm mất 400,69 ms; nút nghe mẫu 411,73 ms. Chi phí inclusive role
1.592 ms, computed style 2.489,87 ms, React 2.576,64 ms; các nhóm lồng nhau không
cộng thành tổng. **Không coi các số đó là CPU compute thuần**: profile có chín
khoảng cách lấy mẫu >50 ms, tổng khoảng 2.819,33 ms; không phân biệt được GC,
descheduling hoặc profiler overhead chỉ bằng delta. Khởi tạo jsdom trong lượt
đo mất **30,71 giây**, so với khoảng 4 giây ở một số lượt riêng trước đó.

Kiểm tải mở rộng sau khi lượt đo đã thoát: counter `_Total` của Windows cho thấy
**CPU 97%**, khoảng **11.127 MiB** RAM khả dụng và không có test đang chạy theo
mẫu tiến trình. Có các ứng dụng khác đang dùng CPU; **không dừng/đổi ưu tiên bất kỳ
tiến trình nào của chúng**. Mẫu trước đó chỉ tìm test/evaluation và RAM chưa đủ
để kết luận máy rảnh. Counter hiện tại không phải đo đồng thời toàn bộ lượt
coverage, nên tải cao **có thể góp phần**, không khẳng định giải thích mọi lỗi.

**Đã dừng kiểm tra nặng do lỗi mục tiêu và tải máy cao.** Chưa sửa thêm test phát
âm, runtime hoặc cấu hình worker; chưa retry coverage, build/browser. Kết quả
44/44 riêng không thay thế cổng coverage đang thất bại. Bước tiếp theo khi máy
giảm tải: kiểm CPU cùng RAM/tiến trình trước lượt chạy, kiểm nhóm App liên quan
và hai file worker trong process giới hạn; chỉ chạy coverage đầy đủ sau nhóm
đích qua. Không tăng timeout, không đổi pool/dependency, không hạ assertion hoặc
threshold, không kill tiến trình, không commit/push/M3.

Bằng chứng trong `.artifacts/vocabulary-timeout/`:
`label-anchor-targeted-01.{json,log}`, `label-anchor-app-suite-01.{json,log}`,
`app-pronunciation-error-01{-tests.json,-queries.json,-summary.json,.cpuprofile,.log}`;
trong `.artifacts/vocabulary-preflight-20261115/`:
`vocabulary-lint-label-anchor-01.log`, `vocabulary-frontend-label-anchor-01.{json,log}`
và `vocabulary-frontend-label-anchor-01-coverage/coverage-summary.json`.

## Timeline ca sidebar sau sửa scope — chưa sửa tiếp mã nguồn

Theo xác nhận mới, thêm plugin transform và setup chẩn đoán chỉ trong
`.artifacts/vocabulary-timeout/sidebar-timeline.*`. Plugin chèn mốc trước/sau
các statement có sẵn của `open()`, ca sidebar và cleanup **trong bộ nhớ khi
Vitest transform**, không ghi đè test/setup trong repo, không thay statement,
assertion hoặc timeout. Mỗi mốc chỉ lưu tên giai đoạn, thời gian và số phần tử
con trực tiếp của body; không lưu DOM/text/payload/PII. Không gọi API thật.

Chạy riêng ca sidebar hiện tại, một worker, BelowNormal, không inspector hoặc
coverage: **1 qua, 43 không chọn**; Vitest ghi **4.922 ms** gồm hook. Khoảng giữa
mốc đầu/cuối thân test **4.857,13 ms**, sát ngưỡng 5.000 ms.

| Giai đoạn | Thời gian |
| --- | ---: |
| `open()` tổng | 2.353,90 ms |
| Render trong `act` | 810,49 ms |
| Chờ dynamic import trong `act` | 10,37 ms |
| Tìm region Hội thoại toàn workspace | 1.044,57 ms |
| Tìm textbox trong region | 351,53 ms |
| Chờ không còn chỉ báo tải tin nhắn | 120,72 ms |
| Click mở hồ sơ (gồm query/render đồng bộ) | 533,34 ms |
| Chờ heading hồ sơ | 326,00 ms |
| Click mở Cài đặt (gồm query/render đồng bộ) | 368,04 ms |
| Quay về chat (gồm query/render đồng bộ) | 219,81 ms |
| Cleanup React | 12,19 ms |
| Khôi phục global stubs | 2,38 ms |

Các dòng con `open()` đã nằm trong tổng; không cộng hai lần. Mốc chờ `findBy*`
bao gồm cả query đồng bộ và chờ promise, **không thể tách thành thời gian mạng**
chỉ từ timeline. Bộ đo ghi file đồng bộ ở từng mốc, tạo thêm overhead, do đó
không so trực tiếp số tuyệt đối với lượt profiler trước để kết luận nhanh/chậm.

Lượt này không có cảnh báo `act(...)`. `afterEach` chẩn đoán chạy trước cleanup
React; sau cleanup và tại `afterAll`, body có **0 phần tử con**. Mọi mốc trong
thân test đều có cặp begin/end trước cleanup. Không có bằng chứng một statement
async của ca này tiếp tục qua cleanup **trong lượt đã qua này**; bộ đo không đếm
toàn bộ promise/timer nên chưa chứng minh hết pending async hoặc giải thích ca
timeout trước đó. Cờ `IS_REACT_ACT_ENVIRONMENT` tại các mốc là undefined và bị
JSON bỏ qua, không dùng cờ đó để suy ra không có công việc async.

**Kết luận giới hạn:** chưa tái hiện timeout ở lượt riêng, nhưng tổng chi phí
cộng dồn rất sát ngân sách; render/import không treo và cleanup nhanh ở lượt đo.
`open()` chiếm khoảng 48,5% thân test, truy vấn region ban đầu là bước đơn lẻ
chậm nhất. Không dùng lượt qua này thay kết quả nhóm hai ca đã lỗi, không miễn trừ
test mới, chưa chạy coverage/build/browser.

Đề xuất phạm vi nhỏ tiếp theo, cần duyệt: tối ưu **helper `open()` chung** bằng
neo textbox qua nhãn truy cập để xác định khung chat, rồi vẫn xác minh role/name
và visibility của đúng region/textbox; tránh tìm region trên toàn workspace ở
bước đầu. Không đổi render/act/import/cleanup, không sửa runtime, không bỏ chờ
UI, không tăng timeout. Vì helper dùng cho mọi ca App, cần kiểm hai ca đích và
toàn App/toàn frontend; chưa khẳng định thay đổi đó đủ giải quyết mọi timeout.

Bằng chứng: `.artifacts/vocabulary-timeout/app-sidebar-timeline-01` với các hậu
tố `-timeline.json`, `-summary.json`, `-tests.json`, `.log`. Mẫu tiến trình trước
lượt đo không thấy test/build/evaluation khớp mẫu; RAM khả dụng khoảng 10.011 MiB.
Không thay tiến trình khác, Docker, MySQL test, dependency hoặc `.env`; không
commit/push. Mọi thay đổi mã nguồn từ trước vẫn giữ nguyên.

## Sửa truy vấn hai ca sidebar/mobile — nhóm đích chưa qua

Sau xác nhận của người dùng, chỉ chỉnh hai test trong `frontend/src/App.test.tsx`:
scope textbox vào Hội thoại; neo nút mức tự chọn vào header và vẫn kiểm role/name;
scope nội dung hồ sơ/cài đặt vào main, nút Cài đặt vào complementary Thanh bên học
tập, Cùng Mate vào navigation Điều hướng học tập. Ca mobile dùng dialog Menu học
tập để tìm nút lịch sử và dialog Lịch sử hội thoại để tìm nút đóng. Giữ mọi
assertion draft, âm thanh/reduced-motion, không tạo hội thoại, focus và khóa cuộn.
Không sửa helper chung, runtime hoặc timeout/assertion/coverage threshold.

Prettier check của file đã qua. Chạy nhóm hai ca **cùng process**, không inspector,
không coverage, một worker, BelowNormal: **0 qua, 2 timeout 5.000 ms**, 42 ca không
chọn. Vitest ghi thời lượng gồm hook lần lượt **6.393 ms** và **5.092 ms**; ca mobile
có cảnh báo `The current testing environment is not configured to support act(...)`.
Không có lỗi assertion cụ thể được báo trước timeout. Chưa có timeline để biết
ca đầu dừng ở bước nào hoặc công việc async còn chạy có ảnh hưởng ca sau không.

Mẫu tiến trình trước lượt kiểm tra không thấy test/build/evaluation khớp mẫu,
RAM khả dụng khoảng **7.596 MiB**; đây không phải đo liên tục trong lượt test.
Không suy diễn nguyên nhân là thiếu tài nguyên hoặc lỗi runtime từ các con số đó.

**Đã dừng tại nhóm đích thất bại**, chưa chạy lint toàn bộ/coverage/build/browser.
Kết quả trước sửa **479/483**, coverage đủ bốn ngưỡng vẫn là bằng chứng lịch sử,
không phải chứng nhận mã mới. Sửa scope vẫn giữ uncommitted để xem xét; không tự
revert thay đổi, không commit/push, không tác động Docker hay MySQL test.

Kết luận: tối ưu truy vấn cục bộ **chưa đủ** để qua cổng. Nếu được duyệt điều tra
tiếp, cần timeline mốc async/render/query của ca sidebar riêng ở trạng thái hiện
tại, xác định bước vượt ngân sách và trạng thái cleanup sau timeout trước khi
đề xuất chỉnh thêm. Không tiếp tục chạy lại toàn suite hoặc chỉ chọn một lượt qua.

Bằng chứng: `.artifacts/vocabulary-timeout/sidebar-mobile-scoped-01.json`
và `.artifacts/vocabulary-timeout/sidebar-mobile-scoped-01.log`.

## Đo riêng sidebar và focus mobile — 16/11/2026

Sau xác nhận mới, chỉ chạy riêng hai ca còn chặn ngoài ngoại lệ, mỗi ca trong
process riêng, tuần tự BelowNormal, một worker, không coverage. Dùng lại cấu hình
inspector/bộ đếm query tạm trong artifact; không sửa mã nguồn, test, setup mặc
định hoặc timeout. Mẫu kiểm tra trước lượt đo có khoảng **8.007 MiB** RAM khả dụng,
không thấy tiến trình test/build/evaluation hoặc Vite khớp mẫu. Không tự khởi động
lại preview hoặc thay đổi tiến trình/Docker khác.

| Ca App | Kết quả | Thân test đo | Role query inclusive | Computed style inclusive | React inclusive |
| --- | --- | ---: | ---: | ---: | ---: |
| `opens profile and settings directly from the sidebar and keeps the chat draft` | Qua; 43 ca không chọn | 2.788,27 ms | 1.431,56 ms | 1.276,53 ms | 934,64 ms |
| `hands mobile menu focus to history and returns to the visible menu trigger` | Qua; 43 ca không chọn | 2.379,12 ms | 1.211,44 ms | 1.072,85 ms | 997,86 ms |

Vitest ghi thời lượng test gồm hook lần lượt **3.211 ms** và **2.808 ms**;
thời lượng file gồm cả preload/setup lần lượt 5.043 ms và 5.070 ms. Không tăng
timeout 5.000 ms. Inspector tự tiêu thụ khoảng 272/271 ms; các nhóm inclusive
lồng nhau nên không cộng thành tổng. Bộ đếm `findBy*` chỉ đo phần đồng bộ khi gọi,
không đo thời gian chờ promise; không gọi nó là thời gian chờ API.

Điểm nóng có vị trí cụ thể:

- Ca sidebar: `open()` tìm region Hội thoại toàn trang **447,27 ms**; nút mức
  tự chọn dòng 398 **232,17 ms**, nút Cùng Mate dòng 410 **201,41 ms**, nút Cài
  đặt dòng 402 **192,91 ms**, heading hồ sơ **165,49 ms**, heading Cài đặt
  **155,27 ms**. Các query còn quét toàn workspace dù mục tiêu thuộc vùng nhỏ.
- Ca mobile: `open()` tìm region Hội thoại **410,30 ms**; tìm nút mở lịch sử
  toàn trang dòng 427 **280,21 ms**, tìm nút đóng lịch sử dòng 429 **189,70 ms**,
  tìm nút mở menu dòng 424 **172,49 ms**. Click mở lịch sử/render/focus đồng bộ
  mất **226,09 ms**; không có assertion focus nào thất bại trong lượt riêng.

**Kết luận giới hạn:** không tái hiện timeout khi chạy riêng không coverage;
role query/style vẫn chiếm khoảng một nửa thân test. Kết quả này chỉ chứng minh
có chi phí query đáng tối ưu, chưa chứng minh nguyên nhân chính xác của timeout
toàn suite hoặc loại trừ hồi quy. Không coi hai lượt qua là miễn trừ mới, không
thay thế kết quả toàn frontend **479/483**, chưa chạy lại coverage/build/browser.

Đề xuất sửa tiếp, cần duyệt trước khi làm:

1. Chỉ hai ca App này: scope textbox vào region Hội thoại; neo nút mức tự chọn
   vào header hiện có, scope nút Cài đặt vào complementary Thanh bên học tập,
   nút Cùng Mate vào navigation Điều hướng học tập, heading vào main hiện có.
   Giữ chính xác role/name, đường đi bằng nút mức tự chọn, mọi assertion draft,
   âm thanh/reduced-motion và không tạo hội thoại. Không cần đổi UI runtime.
2. Ca mobile dùng dialog Menu học tập đã assertion để tìm nút lịch sử, sau đó
   dialog Lịch sử hội thoại để tìm nút đóng; giữ query toàn trang xác nhận menu
   biến mất, kiểm close có focus, menu lấy lại focus và body hết khóa cuộn.
   Không dùng `hidden: true` hoặc bỏ kiểm focus/visibility.
3. Giữ helper `open()` chung ở trạng thái hiện tại; kiểm nhóm hai ca sau sửa rồi
   chạy coverage toàn suite nếu nhóm qua. Không sửa auth/chat/voice, không nới
   timeout hoặc coverage, không bỏ test hay retry toàn suite để chọn kết quả đẹp.

Bằng chứng ở `.artifacts/vocabulary-timeout/`: `sidebar-mobile-profile-summary.json`,
`app-sidebar-profile-01{-tests.json,-queries.json,.cpuprofile,.log}` và
`app-mobile-focus-01{-tests.json,-queries.json,.cpuprofile,.log}`.

## Kết quả sửa vùng truy vấn đã duyệt — 16/11/2026

Đã thực hiện sau xác nhận của người dùng:

- Thêm các section có nhãn `Tìm và lọc chủ đề`, `Chủ đề thường gặp`,
  `Điều khiển chủ đề từ vựng`, `Danh sách từ vựng`; giữ class CSS cũ, không đổi
  dữ liệu, cơ chế lưu, TTS, thẻ/quiz hay logic chấm/hoàn thành.
- Test từ vựng dùng `within(...)` trên các vùng đó, giữ đủ 50 article, role/name,
  kiểm focus/back/filter và các assertion cũ. Ca khôi phục danh sách chờ `h3`
  rồi vẫn kiểm role/name heading trong vùng nhỏ, không bỏ kiểm semantics.
- Helper `open()` của App chờ region Hội thoại rồi tìm textbox trong đó. Hai ca
  legacy dùng helper truy vấn sidebar/details; ca thống kê neo vào section hiện
  có. Không sửa implementation auth/chat/voice hoặc global React/test cleanup.
- Không thay timeout 5.000 ms, assertion, coverage threshold, dependency, `.env`
  hoặc cấu hình Vitest mặc định. Inspector chẩn đoán không dùng trong lượt này.

Kiểm tra tuần tự BelowNormal:

1. Nhóm đích: **11/11 vocabulary + 1 ca App qua**; 43 ca App không được chọn.
   Regex cho ca App thứ hai không khớp tên thật nên chưa chạy trong lượt này;
   đã chạy đúng tên ở lượt riêng kế tiếp và **1/1 qua**.
   Vocabulary lọc/back focus **2.698 ms**, TTS **3.276 ms**, chọn 5 từ **1.391 ms**;
   App ghi nhận buổi học **3.390 ms**, App chống đếm trùng **3.397 ms**.
2. Lint/type/format cả backend/frontend qua: Ruff, Black, mypy, ESLint, TypeScript,
   Prettier. Không sửa backend kể từ lượt **282/282** trước đó.
3. Coverage frontend toàn bộ: **479 qua, 4 lỗi / 483**, **0 pending**, 39/40 file
   qua; không lỗi khởi động worker hay hook preload trong lượt này. Vocabulary
   **11/11 qua**. Đây chưa phải toàn suite xanh hoặc chứng minh hết flake.
4. Coverage toàn frontend: statements **90,04%**, branches **82,67%**, functions
   **86,11%**, lines **93,12%** — đạt 80% ở cả bốn chỉ số; không dùng coverage
   của nhóm chọn lọc thay kết quả toàn bộ.

Bốn ca timeout đều ở App:

| Tên ca | Thuộc sáu ngoại lệ cũ? |
| --- | --- |
| `opens profile and settings directly from the sidebar and keeps the chat draft` | Không |
| `hands mobile menu focus to history and returns to the visible menu trigger` | Không |
| `opens a server-bound lesson and begins Blaze voice without sending a hidden learner message` | Có |
| `shares saved Settings voices and speed with chat and restores them after signing in again` | Có |

**Đã dừng vì hai lỗi ngoài ngoại lệ.** Chưa chạy build/browser, chưa sửa hai ca
App mới, không kết luận nguyên nhân do mã hay tải máy. Cần xác nhận trước khi đo
riêng và đề xuất sửa tiếp hai ca này. Không commit/push, không đổi Docker ứng dụng
hay xóa MySQL test. Máy có khoảng 8.735 MiB RAM khả dụng trước coverage và mẫu
tiến trình không thấy test/build/evaluation khác; không suy diễn tải trong cả lượt.

Bằng chứng: `.artifacts/vocabulary-timeout/scoped-regions-targeted-01.{json,log}`,
`scoped-regions-progress-01.{json,log}`; trong
`.artifacts/vocabulary-preflight-20261115/`: `vocabulary-lint-regions-01.log`,
`vocabulary-frontend-regions-01.{json,log}`, `vocabulary-frontend-regions-01-summary.json`
và `vocabulary-frontend-regions-01-coverage/coverage-summary.json`.

## Đo riêng hai ca sớm — 16/11/2026

Theo xác nhận mới, đo riêng hai ca với inspector và bộ đếm thời gian truy vấn
tạm trong `.artifacts`. Không sửa mã tính năng, test, timeout hoặc cấu hình mặc
định. Bộ đếm chỉ ghi tên hàm, vị trí mã và thời gian đồng bộ, không ghi đối số,
DOM, payload, tài khoản hay âm thanh. Mỗi ca chạy trong process riêng, tuần tự,
một worker, BelowNormal, không coverage. Không thấy tiến trình test/hook khác
trước lượt đo; Vite riêng vẫn được giữ.

| Ca | Kết quả Vitest | Thân test đo bằng đồng hồ | Role query inclusive | React inclusive |
| --- | --- | ---: | ---: | ---: |
| App: `records real self-reported vocabulary and lesson completion instead of demo scores` | Qua; 43 ca không chọn | 4.088,86 ms | 2.096,39 ms | 1.576,29 ms |
| Vocabulary: `shows both complete topics, all fifty cards, accent-insensitive filters and back focus` | Qua; 10 ca không chọn | 3.827,19 ms | 2.260,39 ms | 1.290,15 ms |

Vitest ghi thời lượng gồm hook 5.114 ms cho App và 4.629 ms cho Vocabulary;
không phải timeout được tăng lên. Inspector self-time lần lượt khoảng 887 ms
và 614 ms. Không dùng tổng thời gian có instrumentation để so benchmark tuyệt đối.
Các nhóm inclusive lồng nhau, không cộng thành tổng và không gọi thời gian trong
`waitFor` là chờ mạng: phần callback có thể chính là query/style chạy đồng bộ.

Các điểm nóng cụ thể:

- App dòng 491: tìm tất cả nút `Đánh dấu đã nhớ` trên toàn workspace **587,50 ms**;
  dòng 492 tìm nút `Đã nhớ` **235,58 ms**; dòng 497 tìm nút tiến độ **214,06 ms**.
  `open()` dòng 322 tìm textbox trên toàn workspace **534,38 ms**.
- Vocabulary dòng 135: tìm heading chủ đề trên toàn cây **370,77 ms**; dòng 145
  tìm nút quay lại **368,27 ms**; dòng 133 kiểm 50 article **355,59 ms**. Những
  phần này vẫn quét qua các thẻ từ, dù control cần tìm nằm ở đầu trang.
- `getComputedStyle` inclusive: App **1.836,29 ms**, Vocabulary **1.956,27 ms**.

**Kết luận có giới hạn:** hai ca không tái hiện lỗi khi chạy riêng ở lượt đo này;
truy vấn accessibility/style toàn cây chiếm phần đáng kể và để ít dự phòng trước
timeout khi có coverage/tải máy. Chưa chứng minh nguyên nhân chính xác của hook
preload/worker timeout hoặc chuỗi `overlapping act()` ở lượt nhiều ca. Một lần qua
riêng không đủ kết luận hết flake hay toàn frontend đạt cổng.

Đề xuất sửa nhỏ, cần duyệt:

1. Ca App: giới hạn các truy vấn đã đo vào sidebar, khối `Ôn giao tiếp cũ`, thẻ
   tổng kết và vùng chat; giữ role/name, mọi assertion, luồng điều hướng và timeout.
   Chỉ thay helper chung khi có kiểm chứng riêng; không sửa chat/auth/voice runtime.
2. Vocabulary: đặt vùng điều khiển đầu trang và danh sách từ có nhãn truy cập rõ,
   sau đó dùng `within(...)` đúng vùng cho heading/back/filter và từng thẻ từ.
   Giữ assertion đếm đủ 50 article và kiểm tra focus. Không dùng `hidden: true`,
   đổi sang mock component, bỏ kiểm visibility hoặc giảm số từ để né chi phí.
3. Chạy nhóm mục tiêu trước, rồi toàn suite có coverage. Nếu `act` vẫn lỗi, điều
   tra riêng ca gây timeout trước đó; không vá React global/cleanup để che cảnh báo.

Bằng chứng mới: `.artifacts/vocabulary-timeout/two-case-profile-summary.json`,
`app-first-timeout-01{-tests.json,-queries.json,.cpuprofile,.log}` và
`vocabulary-filter-timeout-01{-tests.json,-queries.json,.cpuprofile,.log}`.
Hook/config `two-case.*` chỉ nằm trong artifact, không áp dụng cho chạy bình thường.

## Chẩn đoán bổ sung 16/11 — không thay mã hoặc cấu hình test

Người dùng cho phép điều tra lỗi frontend, giữ nguyên timeout/assertion/coverage.
Đọc lại log đầy đủ cho thấy 5/6 lỗi ở lượt coverage là timeout 5.000 ms
(JSON reporter chỉ lưu `STACK_TRACE_ERROR` cho các ca này), còn preview không
tìm được heading khi chờ mở trang. Không coi nhãn `assertion_or_runtime` trong
summary tự trích là chẩn đoán nguyên nhân.

Tại thời điểm kiểm tra mới: máy có khoảng 7.979 MiB RAM khả dụng trên 32.471 MiB;
không thấy tiến trình test/build hoặc đánh giá Python khác trong mẫu kiểm tra,
chỉ có Vite của worktree. Đây là mẫu tại thời điểm kiểm tra, không phải số đo
tài nguyên trong lần coverage đã thất bại; chưa có bằng chứng kết luận thiếu RAM.

Chạy chẩn đoán **bảy file, không coverage**, một worker, BelowNormal, không thay
bất kỳ mã nguồn/test/setup/cấu hình nào:

| File | Kết quả |
| --- | --- |
| `learning/learning.test.tsx` | 33/33 qua |
| `voice-first/VoiceFirstApp.test.tsx` | 10/10 qua |
| `landing/LandingPage.test.tsx` | 2/2 qua |
| `api/socialAuth.test.ts` | 9/9 qua |
| `speech/audio.test.ts` | 33/33 qua |
| `vocabulary/vocabulary.test.tsx` | 7 qua, 4 timeout |
| `App.test.tsx` | 27 qua, 17 lỗi |

Tổng **121 qua, 21 lỗi / 142**, không có lỗi khởi động worker hoặc hook preload.
Không dùng kết quả này thay thế lượt coverage đầy đủ đã thất bại. Không đo coverage
trên nhóm chọn lọc hoặc giảm ngưỡng để có số liệu đẹp.

Bốn timeout từ vựng: lọc/back focus; phục hồi conflict; TTS; thẻ/quiz. Ca chọn
năm từ qua ở 3.921 ms. Các ca vẫn đang dùng truy vấn role/name và đủ 50 từ.

App bắt đầu có timeout ở ca giao tiếp cũ/ghi nhận buổi học, rồi thêm các ca thoại,
chat và Settings. Log ghi `The current testing environment is not configured to
support act(...)` và `overlapping act() calls`. Sau ca Settings timeout, chín ca
cuối không thấy UI cần tìm, phần lớn snapshot chỉ còn `<body><div /></body>`.
Đây là dấu hiệu kết quả phía sau có thể bị ảnh hưởng bởi async chưa kết thúc;
**chưa chứng minh nguyên nhân gốc**, không kết luận auth/chat runtime hỏng hoặc
mọi lỗi đều do môi trường. Không sửa auth/chat/voice, không bỏ hay nới test.

Đã dừng chạy tiếp tại các lỗi mới ngoài ngoại lệ App cũ. Bước đề xuất tiếp theo
là đo riêng ca App timeout sớm và ca từ vựng còn chậm, tách chi phí query/style,
render và async cleanup; chỉ tối ưu dựa trên bằng chứng. Cần duyệt phạm vi sửa
trước khi sửa setup/query ở App hoặc thay đổi implementation. Không retry toàn
suite liên tục, không kill tiến trình khác, không commit/push/M3.

Bằng chứng: `.artifacts/vocabulary-timeout/affected-files-no-coverage-01.json`
và `.artifacts/vocabulary-timeout/affected-files-no-coverage-01.log`.

## Cập nhật 16/11/2026 — chưa qua cổng nghiệm thu

Người dùng đã duyệt thu hẹp truy vấn vào vùng tương ứng và tiếp tục hoàn thiện
lát cắt. Dùng tên từ để định vị thẻ, sau đó vẫn kiểm heading/checkbox bằng
role/name trong thẻ; không giảm dữ liệu 50 từ, timeout hoặc điều kiện assertion.
Nhóm UI mới đã có một lượt **11/11 qua**, ca chọn năm từ 1.722 ms trong nhóm;
chạy riêng trước đó 4.782 ms. Chưa chứng minh ổn định khi có coverage toàn suite.

Sau xác nhận tiếp tục ngày 16/11, hợp đồng API cũ được cập nhật để whitelist
chính xác năm đường dẫn vocabulary và các method, giữ cấm những API legacy khác,
thêm kiểm tra 401 cho các GET mới. Test cạnh tranh bổ sung JWT secret giả và
kiểm URL loopback/user không root; không sửa cấu hình xác thực runtime.

Kết quả mới nhất, chạy tuần tự BelowNormal trong worktree riêng:

- Lint qua: Ruff, Black 116 file, mypy 98 file, ESLint/TypeScript, Prettier.
  Dùng dispatcher `scripts/manage.py` với interpreter `.venv` repo gốc được chỉ
  định trong bộ chạy artifact; ROOT, dependency frontend và nguồn kiểm tra vẫn
  thuộc worktree. Không tạo `.env` hay thay `manage.py`.
- Backend MySQL: **282/282 qua**, coverage **93,44%**, không skip. Cảnh báo
  Starlette TestClient/httpx đã xuất hiện ở lượt unit trước; chưa đổi dependency.
- Frontend coverage toàn bộ: **391 qua, 6 lỗi, 44 pending/skipped**, báo cáo
  tổng 441 test; **không phải một lượt chạy đầy đủ thành công**.
- `App.test.tsx` lỗi hook timeout trước khi chạy các test; hai file
  `api/socialAuth.test.ts` và `speech/audio.test.ts` lỗi khởi động worker.
- Sáu ca lỗi nằm ở LandingPage (hero/steps/scenarios/FAQ), learning (catalog/
  progress/higher stages), Vocabulary (lọc/back focus; phục hồi conflict;
  chọn năm từ), VoiceFirstApp (20 bài stage 0). Full test names lưu trong JSON.
  Đây không phải chỉ sáu ca App được miễn trừ trước đó.
- Coverage nhận được: statements **76,07%**, branches **69,38%**, functions
  **72,13%**, lines **78,81%**; **không đạt 80% từng chỉ số**. Nhiều test không
  chạy nên chưa thể quy toàn bộ mức giảm cho mã tính năng; chưa kết luận nguyên nhân.

Đã dừng tại lỗi frontend mới, chưa chạy build/browser hoặc sửa tiếp test.
Không tăng timeout/coverage thresholds, không tự chạy lại để thay thế lượt lỗi.
Container test giữ nguyên, không M3; ứng dụng Docker gốc chưa cập nhật.
Bản UI fixture được phục vụ riêng ở cổng 5176, không phải bằng chứng tích hợp
tài khoản thật. Không commit/push hoặc gọi API tính phí trong các kiểm tra này.

Bằng chứng bổ sung ở `.artifacts/vocabulary-preflight-20261115/`:
`vocabulary-backend-contract-fix.xml`, `vocabulary-lint-final-01.log`,
`vocabulary-backend-final-01.xml`, `vocabulary-backend-final-01-coverage.xml`,
`vocabulary-frontend-final-01.json`, `vocabulary-frontend-final-01.log`,
`vocabulary-frontend-final-01-summary.json`.

## Phạm vi và trạng thái

Worktree `EngMate-AI-vocabulary-20261115`, nhánh
`feat/vocabulary-authored-topics-20261115`, nền WIP `d0adeaf`.
Đây là kiểm tra lát cắt mới, không phải chạy lại baseline frontend sạch.
Không sửa timeout 5.000 ms, assertion, dependency hoặc cấu hình Vitest mặc định.
Không dừng tiến trình khác. Các lệnh kiểm tra chạy tuần tự, ưu tiên BelowNormal.
Các tiến trình đánh giá bên ngoài worktree vẫn hoạt động; chưa đo mức tranh CPU.

Sau sửa validator IPA và header trùng, unit backend từ vựng đạt **24/24**.
Frontend mới có **6/11 đạt, 5 timeout** trong lần chạy đầy đủ đầu tiên:

- `retries an ambiguous save with the same UUID and syncs the server summary`
- `does not overwrite conflicts and can recover catalog/detail/network failures`
- `plays only on click, tracks playback completion and aborts when speech is disabled`
- `provides keyboard-native flashcards and deterministic quiz without saving scores`
- `prepares at most five selected verified words without sending a chat or paid request`

Các lỗi này thuộc test mới, không thuộc ngoại lệ sáu ca App đã duyệt trước đó.
Đã dừng kiểm tra tích hợp/coverage/build tại cổng này.

## Phép đo được cho phép

Chạy riêng nguyên trạng test chọn tối đa năm từ, thêm hook inspector CPU trong
`.artifacts/vocabulary-timeout/`, kế thừa cấu hình Vitest hiện có. Không sửa test
hay tăng timeout. Hook lưu stack CPU, không lưu DOM, tài khoản, audio hoặc payload.
API và audio vẫn là mock của test; không gọi provider thật.

Test tiếp tục timeout 5.000 ms; thời lượng Vitest ghi nhận **12.074 ms** có
overhead hook. Cửa sổ profile **11.092,62 ms**:

| Nhóm stack inclusive | Thời gian | Tỷ lệ cửa sổ mẫu |
| --- | ---: | ---: |
| `queryAllByRole` | 7.694,07 ms | 69,37% |
| `dom-accessibility-api` | 7.522,53 ms | 67,82% |
| `getComputedStyle` | 7.418,56 ms | 66,88% |
| React DOM | 605,45 ms | 5,46% |

Các nhóm nằm lồng nhau, **không cộng các tỷ lệ**. Inspector `post` có self-time
2.502,39 ms, nên không dùng tổng thời lượng có profile làm số đo hiệu năng UI.
Lần không profile trước đó của cùng test cũng timeout, thời lượng 9.136 ms.

Mã test tìm năm checkbox liên tiếp bằng `screen.getByRole` trên toàn bộ 50 thẻ,
sau đó tiếp tục truy vấn toàn cây DOM để kiểm tra giới hạn và nút thực hành.
Profile của đúng lần lỗi cho thấy chi phí truy vấn accessibility/CSS trong jsdom
là phần tốn thời gian chính của ca này. Không có bằng chứng chờ mạng hay TTS thật.
Không suy ra trình duyệt thật có cùng chi phí, hoặc cả bốn ca khác đều cùng nguyên nhân.

## Bước tiếp theo đề xuất

Cần xác nhận trước khi điều chỉnh cách truy vấn trong test:

1. Thu hẹp truy vấn bằng `within(...)` vào thẻ từ hoặc vùng ôn tương ứng; tiếp tục
   chọn bằng role và accessible name, giữ mọi điều kiện/kết quả assertion.
2. Giữ đủ 50 từ, các luồng retry/conflict/TTS/quiz/chọn năm từ và timeout hiện tại.
   Không dùng `hidden: true`, bỏ kiểm visibility, giảm dữ liệu hoặc bỏ test để né lỗi.
3. Đo lại nhóm bị lỗi. Nếu còn lỗi, thu bằng chứng riêng trước khi sửa thêm;
   chỉ tiếp tục các cổng tích hợp/coverage/build/browser khi đủ điều kiện.

## Bằng chứng cục bộ

- `.artifacts/vocabulary-preflight-20261115/vocabulary-unit-header-fix.xml`
- `.artifacts/vocabulary-preflight-20261115/vocabulary-ui-tests.json`
- `.artifacts/vocabulary-timeout/selection-profile-tests.json`
- `.artifacts/vocabulary-timeout/selection-original.cpuprofile`
- `.artifacts/vocabulary-timeout/profile-summary.json`
- `.artifacts/vocabulary-timeout/profile.config.mts`
- `.artifacts/vocabulary-timeout/profile.setup.mts`

Chưa tạo commit mới, chưa push; container MySQL test chưa chạy M3.
