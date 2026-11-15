# Nâng cấp lớp trình bày EngMate — 11/11/2026

## Phạm vi và bản sao lưu

Người dùng đã duyệt ảnh mẫu, yêu cầu giữ logo/linh vật gốc và chỉ sửa trình bày.
Áp dụng skill `ui-ux-pro-max`: hướng Minimalism & Swiss Style điều chỉnh cho ứng
dụng học tiếng Anh; giữ cặp font Inter/Source Serif 4 đã có, tương phản rõ,
nhịp khoảng cách 4/8 px, màu theo vai trò, responsive và theme sáng/tối.

- Nhánh: `style/ui-refresh-20261111`; không commit/push.
- Sao lưu trước sửa: `.artifacts/ui-refresh-20261111/before/src/`.
- Manifest SHA-256 trước sửa: `.artifacts/ui-refresh-20261111/source-before.json`.
- Working tree đã có các thay đổi khác, bao gồm `docs/PROGRESS.md` bị xóa.
  Giữ nguyên và ghi tiến trình trong báo cáo riêng này.

## File giao diện đã sửa

| File | Thay đổi |
| --- | --- |
| `frontend/src/index.css` | Token màu sáng/tối, thêm vai trò radius/shadow còn thiếu, giữ font và cấu trúc CSS hiện có |
| `frontend/src/tutor/workspace.css` | Palette workspace, cấp chữ trang, thẻ bài học, bộ lọc, form, bảng kết quả, cài đặt và chiều cao khung chat lớp học |
| `frontend/src/components/mate-listens.css` | Gỡ màu tím ở lớp override cuối bằng palette xanh đã duyệt, chỉnh sidebar/topbar/welcome/composer, tái sử dụng `/mate.svg` trong minh họa chào, responsive |
| `frontend/src/auth-restored.css` | Màu theo theme, form/social/submit/focus và bề mặt đăng nhập; giữ chuyển cảnh và toàn bộ control |
| `frontend/src/landing/landing.css` | Đồng bộ màu, card/button/radius/focus, cấp chữ và theme tối; giữ bố cục, chữ, ảnh và tương tác |

Không sửa JSX/TS/JS, tên selector, props, handler, state, hook, endpoint, prompt,
API, dữ liệu, dependency, biến môi trường hoặc cấu hình build/deploy. So sánh
hash với snapshot đầu tác vụ xác nhận chỉ năm CSS trên thay đổi; các file
TypeScript/backend và tài nguyên thương hiệu được chụp hash giữ nguyên.

Logo `engmate-mark.svg`, `Logo.tsx`, linh vật `mate.svg`, `LinhThu.tsx` và
component thoại `MateOrb.tsx` giữ nguyên. SVG Mate gốc được dùng trực tiếp bằng
CSS cho hình chào; các state nghe/nói/xử lý trong phiên thoại không thay đổi.

## Đối chiếu hợp đồng chức năng

| Chức năng | Trạng thái bảo toàn | Cách kiểm chứng |
| --- | --- | --- |
| Landing, anchor, CTA, bước tương tác, FAQ | Giữ nguyên | LandingPage tests; ảnh browser và hash TSX |
| Đăng nhập/đăng ký, trường và validation | Giữ nguyên | AuthForm tests; ảnh hai chế độ ở các viewport |
| Google/Facebook, liên kết Google/hủy | Giữ nguyên | AuthForm/socialAuth tests; mã auth/API không đổi |
| Phiên, tải tài khoản, retry, logout | Giữ nguyên | App tests; mã session không đổi |
| Sidebar, đích đến, mới/lịch sử/hồ sơ/cài đặt | Giữ nguyên | WorkspaceSidebar/App tests; thao tác điều hướng trên fixture |
| Drawer mobile, Escape, focus trap/restore | Giữ nguyên | WorkspaceSidebar tests; ảnh drawer và hash TSX |
| Bản nháp, tạo hội thoại, Enter/Shift+Enter | Giữ nguyên | App tests; mã Chat/handler không đổi |
| Chat streaming, dừng/hủy/retry/close | Giữ nguyên | App/chatStream tests; toàn bộ mã runtime không đổi |
| Lịch sử và phân trang tin nhắn | Giữ nguyên | App/Chat.history tests; ảnh drawer |
| Ghi âm, STT, chọn giọng và phát/dừng TTS | Giữ nguyên | App/useThuAm/audio tests; mã speech không đổi |
| Thoại trực tiếp, mute, đổi giọng, ngắt lời | Giữ nguyên | VoiceChat/blaze/session/realtimeSTT tests; data-state selectors giữ nguyên |
| Thông báo lỗi thoại 5 giây | Giữ nguyên | VoiceChat fake-timer tests từ tác vụ trước không sửa |
| Lộ trình/kế hoạch TOEIC | Giữ nguyên | Learning/App tests; ảnh roadmap |
| Tìm kiếm/lọc/tải thêm/mở bài | Giữ nguyên | Learning tests; ảnh thư viện và điều hướng fixture |
| Năm bước học, kiểm tra và lưu tiến độ | Giữ nguyên | Learning/App tests; ảnh buổi học bằng fixture |
| Phát âm, từ vựng, đánh dấu đã nhớ | Giữ nguyên | App tests; ảnh hai màn hình |
| Tiến độ/kết quả/bài ôn | Giữ nguyên | Learning tests; ảnh progress |
| Hồ sơ, upload ảnh, lỗi/conflict | Giữ nguyên | ProfilePage/avatar tests; ảnh form và hash mã upload |
| Theme, giảm chuyển động, giọng/tốc độ | Giữ nguyên | Theme/motion/preferences/VoiceSettings tests; ảnh sáng/tối |
| Chẩn đoán độ trễ | Giữ nguyên | Diagnostics tests và hash component |
| Preview riêng | Giữ nguyên | VoiceFirstApp tests; không sửa mã preview |
| Chữ, id/class/data, thứ tự control | Giữ nguyên | Hash toàn bộ TS/TSX/JS không đổi; chỉ đổi CSS |

## Kiểm chứng và bằng chứng

- Nhóm workspace: lint/type-check/build qua; 76 test App/WorkspaceSidebar/VoiceChat qua.
- Nhóm đăng nhập/landing: lint/type-check/build qua; 23 test AuthForm/socialAuth/LandingPage qua.
- Lượt browser sau các nhóm: 120 ảnh trên 1440×900, 768×1024, 375×812,
  320×568 và 844×390, cả sáng/tối; không ghi nhận Runtime exception hoặc
  cảnh báo/error qua console API trong lượt này.
- Browser dùng Edge headless với hồ sơ riêng và fixture `tests/ui-audit.*` đã
  có. Fixture chặn mọi API, không đăng nhập hoặc ghi tài khoản/database thật.
- Script kiểm tra: `.artifacts/ui-refresh-20261111/visual-check.cjs`.
- Ảnh và metrics nằm trong `.artifacts/ui-refresh-20261111/final/`.
- Kiểm tra bổ sung lớp học: 8 ảnh desktop/mobile sáng/tối trong
  `.artifacts/ui-refresh-20261111/course-verified/`. Khung nhập nằm trong
  viewport sau thao tác cuộn/focus thông thường trên trang học dài.
- `scripts/manage.py lint`: Ruff, Black, mypy, ESLint, TypeScript và Prettier
  qua. Sau chỉnh cuối, frontend lint/type-check tiếp tục qua.
- Docker frontend build lại thành công bằng Dockerfile hiện có (gồm
  `tsc --noEmit` và `vite build`), recreate và đạt `healthy` tại cổng 5174.
- `scripts/smoke.py` qua health, HTML, proxy, capabilities và OpenAPI.
  HTTP xác nhận CSS mới được phục vụ và hash `/mate.svg` trùng tuyệt đối asset gốc.
- Tính tương phản các cặp token chính: chữ sáng 17,85:1; chữ phụ sáng 7,24:1;
  nút chính sáng 6,01:1; chữ tối 15,59:1; chữ phụ tối 9,16:1; nút chính tối 7,50:1.
- Script rollback được kiểm tra cú pháp mà không thực thi; manifest CSS sau sửa
  nằm ở `.artifacts/ui-refresh-20261111/source-after.json`.
- Đã dừng Vite kiểm thử cổng 5175; giữ ứng dụng Docker cổng 5174 hoạt động.

### Kết quả cuối

`npm run test:coverage -- --maxWorkers=1` chạy riêng, sau khi build/browser QA
đã hoàn tất: **35 file, 417/417 test qua**, exit code 0. Coverage statements
**89,56%**, branches **81,73%**, functions **85,74%**, lines **92,78%**; đạt cả
bốn ngưỡng 80% và giữ nguyên các chỉ số so với trước đổi CSS.

Lượt full chạy đồng thời với build/browser trước đó có 414 test qua và ba test
App/preview không hoàn tất trong thời gian chờ. Chạy lại toàn bộ riêng đã qua
cả ba. Không sửa timeout, assertion, test hoặc mã runtime để xử lý việc này.

Tổng bằng chứng trực quan gồm 120 ảnh đa màn hình và 8 ảnh kiểm tra thêm
welcome/lớp học. Kiểm tra cuối: chỉ năm CSS thay đổi so với snapshot trước tác
vụ; diff không có whitespace error. Patch riêng tại
`.artifacts/ui-refresh-20261111/presentation-only.patch`.

## Giới hạn cần kiểm tra thực tế

- Test giao diện dùng dữ liệu/transport giả lập; không cấp quyền microphone,
  không nghe thử bằng nhà cung cấp AI tính phí, không hoàn tất OAuth thật.
- Cần người dùng kiểm tra micro/loa/ngắt lời trên thiết bị thật, đăng nhập OAuth
  thật và bàn phím ảo iOS/Android. Không thay đổi các tích hợp này để làm UI.
- Browser QA dùng Edge headless, chưa đại diện cho mọi phiên bản Safari/Firefox.
- Trang giới thiệu vẫn dùng các ảnh/font bên ngoài đã có; chất lượng tải phụ
  thuộc mạng. Không thêm nguồn ảnh/font hoặc dependency mới.

## Hoàn tác

Chạy tại root nếu muốn khôi phục riêng giao diện trước tác vụ:

```powershell
& ./.artifacts/ui-refresh-20261111/rollback.ps1
```

Script chỉ khôi phục năm CSS nêu trên từ snapshot. Script kiểm tra hash để dừng
nếu CSS đã có sửa đổi mới sau bàn giao, đồng thời lưu một bản CSS hiện tại
trước khi chép lại. Không dùng `git reset`, không chạm các thay đổi khác đang có.
Sau rollback, tải lại trang; nếu cần image Docker tương ứng, build lại frontend
bằng lệnh Compose hiện có. Mã nguồn được bind mount nên môi trường dev cập
nhật CSS trực tiếp.
