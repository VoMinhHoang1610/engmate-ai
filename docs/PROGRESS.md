# Nhật ký tiến trình EngMate-AI

## 2026-10-07 — Tách công việc đồng bộ CI khỏi nhánh giao diện

- Bản đồng bộ CI đã staged được bảo toàn trên `chore/sync-ci-social-login`, với hai parent là nhánh giao diện và `main`. Ba file CI/Docker đúng nội dung `main`; giữ các mục tài liệu đã giải quyết xung đột.
- `feat/social-login-motion` giữ nguyên tại `e38ab99`; chưa đưa commit đồng bộ này vào nhánh đó. `main` và `develop` không thay đổi.
- Các ghi nhận kiểm thử trước đây là lịch sử; không chạy lại lint/test hoặc coi nhánh feature đã qua CI trong tác vụ tổ chức nhánh.

## 2026-10-07 — Đồng bộ bản sửa CI/CD sang develop và nhánh feature

- **Yêu cầu:** cập nhật bản sửa CI/CD đã hoàn thiện trên `main` sang `develop` và nhánh `feat/*` hiện có (`feat/social-login-motion`).
- **Nguồn:** `main`/`origin/main` tại `fd931ff`, chứa commit sửa cấu hình `59180cf`; [CI của main đã thành công](https://github.com/VoMinhHoang1610/engmate-ai/actions/runs/37507717773).
- **Develop:** fast-forward từ `97e3672` lên `fd931ff` và push thành công; nội dung đúng bằng main đã kiểm chứng.
- **Feature:** merge main vào `feat/social-login-motion` từ `e38ab99`. Giải quyết xung đột ở `docs/CHANGELOG.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/REQUIREMENTS.md` bằng cách giữ cả lịch sử tính năng và ghi nhận CI; giữ phạm vi demo đa trang của feature. Ba file CI/Docker giống main; diff xác nhận không thay đổi frontend, backend app/tests hoặc scripts so với feature trước merge.
- **Kiểm chứng:** Docker Compose config và diff whitespace qua; backend 16/16 tests, coverage 100%. Lint frontend có 8 lỗi và build có 4 lỗi TypeScript trong mã feature được giữ nguyên (`HoTroNhanh.tsx`, `HoSo.tsx`, `TaiKhoan.tsx`).
- **Test frontend:** lần chạy mặc định trên Node 25.9.0 đạt 12/52, 40 lỗi do `localStorage.clear` không có; chạy coverage với `NODE_OPTIONS=--no-experimental-webstorage` riêng cho tiến trình test vẫn đạt 12/52, 40 lỗi hành vi/assertion. Frontend chưa có kết quả coverage hợp lệ. Không đổi assertion, tắt test hoặc thay logic ứng dụng trong tác vụ đồng bộ.
- **Giới hạn CI:** workflow hiện kích hoạt khi có PR hoặc push vào main; push develop/feature không tự kích hoạt run mới. Kết quả CI main không được coi là bằng chứng toàn bộ feature đã qua kiểm tra.

## 2026-10-07 — Xác nhận CI thành công trên GitHub

- **Bàn giao:** cả ba sửa đổi cấu hình đã nằm trong một commit `59180cf` (`fix: correct ci/cd workflow and docker health checks`), push lên `fix/ci-cache-healthchecks`, sau đó đưa vào `main` bằng fast-forward và push thông thường theo phương án push main được cho phép trong tài liệu yêu cầu.
- **Phương án kích hoạt CI:** dự kiến mở PR nháp nhưng API không có credential dùng được và công cụ trình duyệt không có phiên kết nối. Chuyển sang phương án push main trong phạm vi yêu cầu; không thay đổi cấu hình xác thực hoặc sửa lịch sử Git.
- **Kết quả thực tế:** [run 37506823374](https://github.com/VoMinhHoang1610/engmate-ai/actions/runs/37506823374), SHA `59180cf93fc9ba2953ea83cc02b0c805ee96f81b`, event `push`, branch `main`, kết luận `success`. Các bước install, lint/types, coverage, build, Docker validation, start stack, HTTP smoke, stop stack, upload coverage và các post step đều qua; bước logs-on-failure được bỏ qua đúng điều kiện.
- **Lỗi đã xử lý:** `Post Run actions/setup-python@v5` thành công, không còn lỗi lưu pip cache làm thất bại job.
- **File tài liệu cập nhật:** `docs/PROGRESS.md`, `docs/REQUIREMENTS.md`; đánh dấu S-07 đã được kiểm chứng local và GitHub Actions. Commit ghi kết quả này chỉ đổi tài liệu, không đổi cấu hình hoặc logic đã được CI kiểm chứng.
- **Giới hạn:** Docker frontend vẫn là stack dev; production image là đề xuất tùy chọn chưa triển khai. AI vẫn dùng mock và các nghiệp vụ chưa triển khai giữ nguyên backlog.

## 2026-10-07 — Sửa CI cache và health check Docker

- **Yêu cầu:** đọc và thực hiện tài liệu `CICD Workflow Fixes — EngMate-AI.md`; áp dụng ba sửa đổi bắt buộc trong một commit trên nhánh `fix/ci-cache-healthchecks`, push nhánh và kiểm chứng GitHub Actions.
- **Đối chiếu GitHub:** run [37220779051](https://github.com/VoMinhHoang1610/engmate-ai/actions/runs/37220779051) thất bại ở `Post Run actions/setup-python@v5`, sau khi install, lint, coverage, build, Docker và smoke đều qua. Lỗi xảy ra khi kết thúc job, không phải lúc setup như mô tả trong file tham chiếu. Task runner chuyển pip cache sang `.cache/pip`; bỏ cấu hình cache của action để tránh lưu vào thư mục mặc định chưa có. Không kết luận pip-tools không tương thích với cache.
- **Thay đổi:** bỏ hai dòng pip cache trong `.github/workflows/ci.yml`; cài curl tối thiểu trong `backend/Dockerfile`, probe có HTTP failure và timeout 2 giây, start period 15 giây; thêm start period 30 giây cho frontend trong `docker-compose.yml`.
- **Phạm vi:** giữ phiên bản Python/Node, cổng, CORS, biến môi trường, tests và logic ứng dụng. Docker frontend production là đề xuất tùy chọn trong tài liệu tham chiếu và chưa triển khai.
- **File thay đổi:** ba file cấu hình trên và `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`.
- **Kiểm chứng local:** `.\make.cmd lint` qua Ruff, Black, mypy (26 files), ESLint, TypeScript và Prettier; `.\make.cmd test` qua 16 backend + 13 frontend tests; `.\make.cmd coverage` đạt 100% hai phía với ngưỡng 80%; `.\make.cmd build` qua (33 modules); `.\make.cmd docker-check`, `docker-up` và `smoke` đều qua.
- **Health check thực tế:** Docker inspect xác nhận backend và frontend đều `healthy`, start period lần lượt `15s` và `30s`; backend dùng curl đúng cấu hình. HTTP smoke qua backend health, frontend HTML, API proxy và AI mock qua proxy.
- **Môi trường kiểm chứng:** lần chạy test/coverage trong sandbox bị chặn tiến trình esbuild (`spawn EPERM`) và cache pytest; chạy lại ngoài sandbox thành công. Docker được kiểm chứng qua Docker Desktop với quyền truy cập daemon.
- **GitHub tiếp theo:** workflow chỉ chạy trên PR hoặc push main; mở PR nháp từ nhánh sửa lỗi để chạy CI, không merge tự động. Kết quả CI của commit mới chưa có tại thời điểm ghi nhật ký; sẽ báo kết quả run khi GitHub hoàn tất.

## 2026-10-06 — Panel cuộn đăng nhập ↔ đăng ký

- **Yêu cầu:** hiệu ứng chuyển đăng nhập/đăng ký kiểu cuộn panel như ảnh tham khảo, nhưng thiết kế và animation riêng theo EngMate, không copy cyan/trắng tutorial.
- **Kết quả:** trang `#dang-nhap` dùng khung hai nửa: form và panel Mate navy→cyan. Bấm Đăng ký/Đăng nhập làm panel và form đổi chỗ trong ~0.92s; form mở bằng clip-path + xoay nhẹ; sóng viền, quỹ đạo và tia sáng phụ; Mate chào/ăn mừng theo chế độ. Mobile xếp dọc với pill chuyển chế độ. Khôi phục mật khẩu full-width; giữ nút xã hội demo, một form, email/tên và giảm chuyển động.
- **File:** `pages/TaiKhoan.tsx`, `index.css`; cập nhật README và tài liệu kiến trúc/yêu cầu/kiểm thử/quyết định/changelog/tiến trình. Không thêm dependency/backend/OAuth.
- **Kiểm chứng mã:** 10/10 TaiKhoan.test qua; lint toàn dự án (ruff/black/mypy/eslint/tsc/prettier) và build (50 modules) qua.
- **Kiểm chứng trình duyệt:** desktop 1280: panel trái→phải khi đăng ký (translate mid ~49%, cuối 100%/−100%), heading/field tên đúng; mobile 390 xếp dọc + pill. Không lỗi JS.
- **Trạng thái:** frontend/backend 5174/8010. Chưa commit/push.

## 2026-10-06 — Nút đăng nhập xã hội và chuyển cảnh tài khoản

- **Yêu cầu:** thêm Google/Facebook/GitHub trên trang đăng nhập; hiệu ứng thú vị, mượt khi chuyển đăng nhập ↔ đăng ký. Người dùng xác nhận **hoàn thiện giao diện trước**, chưa kết nối OAuth thật.
- **Kết quả:** có logo/nút Google riêng và Facebook/GitHub cạnh nhau ở đăng nhập/đăng ký. Nút hiện thông báo nhà cung cấp chưa khả dụng, không gọi mạng hoặc tạo phiên giả. Nền tab trượt, tiêu đề chuyển mờ, biểu mẫu trượt/nghiêng nhẹ theo hai hướng và khung co giãn trong 420 ms. Bấm liên tục nối tiếp từ chiều cao hiện tại; giữ email/tên, tạo mới ô mật khẩu; một form trong DOM, khôi phục không hiện nút xã hội. Giữ linh thú, trang độc lập, theme và các luồng cục bộ hiện có.
- **File:** thêm `components/DangNhapMangXaHoi.tsx`; cập nhật `pages/TaiKhoan.tsx`, `TaiKhoan.test.tsx`, `index.css`, README và tài liệu kiến trúc/yêu cầu/kiểm thử/quyết định/changelog/tiến trình. Không thêm dependency, secret, endpoint hoặc thay đổi backend. Animation chiều cao và listener được hủy khi unmount/giảm chuyển động.
- **Kiểm chứng mã:** 20/20 test chọn lọc tài khoản/avatar/giao diện/cài đặt qua, gồm 5 test mới. Lint toàn dự án, build (50 modules) và HTTP smoke qua. Backend 16/16 tests, coverage 100%. Frontend toàn bộ 45/52 tests qua, vẫn còn 7 assertion Việt hóa có sẵn trong App.test.tsx; chưa có coverage frontend hợp lệ.
- **Kiểm chứng trình duyệt:** Chrome QA riêng rà 60 tổ hợp (đăng nhập/đăng ký/khôi phục × sáng/tối × 10 chiều rộng 320–1440 px), không tràn ngang/cắt nút/input. Đo khung 445.5 → 478.08 → 485.5 px, độ mờ trung gian ~0.80 và indicator ~80.48% khi sang đăng ký; hướng ngược cũng có giá trị trung gian. Bấm đổi 13 lần liên tiếp vẫn có đúng form/chế độ, chiều cao cuối tự nhiên, không animation cũ kẹt. Nút xã hội không thay phiên; giữ thông tin/đổi ô mật khẩu, đăng ký → học → logout, alias, giảm chuyển động trong app/hệ thống (kể cả đổi giữa hiệu ứng) đều qua; không lỗi JavaScript. Đã xem ảnh sáng/tối desktop và đăng ký mobile.
- **Trạng thái:** frontend/backend vẫn chạy ở 5174/8010. Nhánh `feat/social-login-motion`, giữ toàn bộ thay đổi các lượt trước; chưa commit/push. OAuth thật và 7 assertion cũ là phần việc tiếp theo khi được yêu cầu.

## 2026-10-06 — Mate trở thành linh thú EngMate AI

- **Yêu cầu:** dùng robot trong ảnh đã chọn làm linh thú của dự án; tạo cảm giác vui khi học như các website học ngôn ngữ có nhân vật đồng hành. Giữ chữ gọn và trang đăng nhập tách riêng từ các lượt trước.
- **Kết quả:** đặt tên Mate, giữ thân trắng/xanh nhạt, mặt navy, mắt cyan và anten vàng; thêm tay, năm biểu cảm chào/nghe/suy nghĩ/động viên/ăn mừng. Mate xuất hiện nhất quán ở banner, sidebar, đăng nhập, avatar và trợ lý hội thoại, ghi âm, nghe, viết, mục tiêu ngày và hoàn thành flashcard. Thẻ kỹ năng có màu nhẹ, cạnh nổi, hiệu ứng hover/nhấn. Kết quả nghe đúng/sai, phiên ôn hoàn thành và mục tiêu ngày quyết định biểu cảm thực tế.
- **Thực hiện:** thêm component dùng chung `components/LinhThu.tsx`, refactor `TrangTri` thành bối cảnh quanh Mate, bản vector tĩnh nền trong suốt `public/mate.svg` và hướng dẫn `docs/LINH_THU.md`. Cập nhật App, tổng quan, hội thoại, nói/nghe/viết, flashcard và CSS. Không thêm dependency hay thay dữ liệu/API; hình không nhận focus/chuột, nội dung trạng thái vẫn bằng chữ. Hai chế độ giảm chuyển động giữ hình và tắt hiệu ứng.
- **Kiểm chứng mã:** 6/6 test mới của Mate qua; tổng cộng 10/10 test Mate/giao diện gọn qua. Lint toàn dự án, build và HTTP smoke qua; bản SVG trả HTTP 200 và có trong bản build. Backend 16/16 tests, coverage 100%. Frontend toàn bộ 40/47 tests qua; 7 lỗi assertion Việt hóa có sẵn trong App.test.tsx giữ nguyên, coverage frontend chưa có kết quả hợp lệ.
- **Kiểm chứng giao diện:** Chrome QA riêng kiểm tra 220 tổ hợp của 11 trang, sáng/tối, 10 chiều rộng từ 320–1440 px; không tràn ngang/cắt input/nút. Luồng menu mobile/avatar/đăng nhập, flashcard, trợ giúp và hội thoại qua backend qua; nhân vật chuyển động, thẻ nâng khi hover và cả giảm chuyển động trong app/hệ thống đều được kiểm tra. Kết quả đúng/sai/làm lại và hoàn thành ôn với biểu cảm Mate qua ở 1440/390/320 px; không lỗi JavaScript. Đã xem ảnh tổng quan desktop/mobile/tối, nói/nghe/viết/hội thoại và kết quả học trên mobile.
- **Tài liệu và trạng thái:** cập nhật README, kiến trúc, D-15, kiểm thử, quyết định, changelog và hướng dẫn linh thú. Nhánh `feat/engmate-mascot` giữ các thay đổi đã có; chưa commit/push. Dự án đang chạy tại frontend 5174/backend 8010. Tồn đọng 7 assertion cũ cần xử lý trong tác vụ kiểm thử riêng.

## 2026-10-06 — Thêm trang trí và animation cho giao diện

- **Yêu cầu điều chỉnh:** giao diện trước quá đơn điệu; cần thêm trang trí và nhiều hiệu ứng animation. Giữ yêu cầu trước về nhãn gọn và trang đăng nhập riêng.
- **Kết quả:** banner navy/cyan gradient có nhân vật CSS nổi/chớp mắt, vòng quay, bong bóng và sao; thêm nền chuyển sắc, điểm nhấn violet/coral/green, thẻ màu và bóng nhẹ. Chuyển trang và thẻ vào lần lượt; hover nâng thẻ/nghiêng icon/dịch mũi tên, ánh sáng trên nút, underline tab, popup menu, tin nhắn, ghi âm, nghe, flashcard và phản hồi có chuyển động. Đăng nhập có nhân vật nhỏ và hình nền chuyển động; Cài đặt vẫn chỉ có tên tùy chọn/điều khiển.
- **Thực hiện:** thêm `components/TrangTri.tsx` dùng CSS/icon nội bộ, ẩn khỏi trợ năng và không nhận chuột; cập nhật `TongQuan.tsx`, `TaiKhoan.tsx`, wrapper chuyển trang trong `App.tsx` và `index.css`. Không thêm dependency hoặc vòng cập nhật JavaScript. Giảm chuyển động từ Cài đặt/hệ thống tắt animation và transition.
- **Kiểm chứng mã:** lint toàn dự án và build qua; HTTP smoke qua. 20/20 test chọn lọc giao diện/cài đặt/tài khoản/avatar/shell/routing/thanh cuộn qua. Backend 16/16 tests, coverage 100%; frontend toàn bộ 34/41 tests qua, vẫn còn 7 lỗi assertion Việt hóa đã ghi nhận trước tác vụ; chưa có coverage frontend hợp lệ.
- **Kiểm chứng giao diện:** Chrome QA riêng đo 11 animation trang trí đang chạy, vị trí nhân vật thay đổi theo thời gian và thẻ nâng khi hover; cả tùy chọn Giảm chuyển động và `prefers-reduced-motion` đưa animation trang trí về 0. Rà soát 220 tổ hợp trang/theme/viewport (11 trang, sáng/tối, 10 chiều rộng từ 320–1440 px) sau khi hiệu ứng vào trang kết thúc: không tràn ngang/cắt input/nút. Menu mobile/avatar → đăng nhập, flashcard, mở trợ giúp và chat qua backend hoạt động; không có lỗi JavaScript. Đã xem ảnh tổng quan/cài đặt/từ vựng/đăng nhập desktop, tổng quan/viết/đăng nhập mobile và theme tối.
- **Tài liệu:** cập nhật README, kiến trúc, yêu cầu D-13/D-14, kiểm thử, quyết định, changelog và tiến trình. Nhánh `feat/decorative-motion` giữ thay đổi các lượt trước; chưa commit/push. Tài khoản và AI tiếp tục dùng cơ chế demo hiện có.

## 2026-10-06 — Giao diện tối giản cho toàn bộ ứng dụng

- **Yêu cầu:** thiết kế lại toàn bộ giao diện hiện đại, tối giản; bớt chữ nhỏ giải thích dưới tên thành phần, đặc biệt các tùy chọn Cài đặt.
- **Kết quả:** dùng nền trung tính, một màu xanh nhấn, thẻ phẳng/viền nhẹ và cỡ chữ nhất quán. Viết lại stylesheet chung theo biến màu cho sáng/tối. Sidebar bỏ thẻ động viên, footer/logo bỏ slogan; tiêu đề trang chỉ còn tên và thao tác chính. Tổng quan bỏ mascot, banner dài, lời giải thích dưới thống kê/kỹ năng và câu trích dẫn; thay bằng thẻ luyện tập gọn, danh sách chủ đề và thanh mục tiêu có ARIA.
- **Các trang:** Cài đặt bỏ toàn bộ mô tả phụ dưới nhãn; chủ đề bỏ mô tả và banner tính năng chưa có; hồ sơ bỏ mẹo trang trí; đăng nhập riêng thu gọn thành biểu mẫu giữa trang. Gợi ý luyện nói và hướng dẫn flashcard nằm trong `details` đóng mặc định. Giữ đề bài, nghĩa/phiên âm/ví dụ, giải thích học thuật mở theo yêu cầu, chu kỳ ôn, các điều khiển, thông báo lỗi/kết quả và nhãn AI mẫu cần thiết. Drawer mobile khi đóng cũng ẩn khỏi điều hướng bàn phím.
- **File thay đổi:** `index.css`, `App.tsx`, `components/Logo.tsx`, `components/TieuDeTrang.tsx`, 11 trang giao diện; thêm `GiaoDien.test.tsx`, cập nhật test lời chào và nhãn AI theo thiết kế mới. README, yêu cầu, kiểm thử, kiến trúc, quyết định, changelog và tiến trình.
- **Kiểm chứng:** 15/15 test giao diện mới/cài đặt/tài khoản/avatar và 9/9 test chọn lọc giao diện/shell/route/nhãn AI/tài khoản qua. Lint toàn dự án (Ruff/Black/mypy/ESLint/TypeScript/Prettier), build và HTTP smoke qua. Backend 16/16 tests qua, coverage 100%. Frontend toàn bộ 34/41 tests qua; còn 7 lỗi assertion văn bản Việt hóa đã ghi nhận trước tác vụ, chưa có coverage frontend hợp lệ.
- **Trình duyệt:** Chrome QA riêng kiểm tra 220 tổ hợp của 11 trang, 2 theme, 10 chiều rộng từ 320 đến 1440 px; không tràn ngang và các input/nút nằm trong viewport. Kiểm tra menu mobile, avatar → đăng nhập, flashcard, mở gợi ý, gửi hội thoại thật qua backend; không có lỗi JavaScript. Luồng đăng nhập/đăng ký/khôi phục/logout/alias/theme/reload cũng qua. Đã xem ảnh tổng quan, cài đặt, hội thoại, đăng nhập trên desktop/mobile và theme tối.
- **Giới hạn:** tài khoản/AI tiếp tục dùng cơ chế demo hiện có. Nhánh `feat/minimal-interface`, giữ các thay đổi đăng nhập từ lượt trước; chưa commit/push. Cần xử lý riêng 7 assertion cũ khi có yêu cầu.

## 2026-10-06 — Thiết kế trang đăng nhập độc lập

- **Yêu cầu:** đưa đăng nhập ra trang riêng, tách biệt khỏi các phần học tập ở trang chính.
- **Kết quả:** `#dang-nhap` có header, main và footer riêng, không render sidebar/topbar học tập. Bố cục hai cột trên desktop với nhận diện navy/cyan, thu gọn trên mobile; đăng nhập/đăng ký/khôi phục dùng cùng trang. Có liên kết về học tập cho khách và nút vào tổng quan sau đăng nhập. Cài đặt bỏ tab/phần tài khoản, chỉ giữ giao diện và âm thanh. Avatar dẫn đến trang mới; hai liên kết cũ `#tai-khoan`, `#cai-dat?muc=tai-khoan` vẫn mở được trang đăng nhập.
- **Dữ liệu:** dùng cùng Context để giữ hồ sơ, tùy chọn và trạng thái phiên khi chuyển bố cục; lỗi lưu trữ cũng hiển thị trên trang riêng. Không lưu mật khẩu.
- **File thay đổi:** `App.tsx`, `demo/duLieu.ts`, `pages/CaiDat.tsx`, `pages/TaiKhoan.tsx`, `index.css`, `components/MenuNguoiDung.tsx` và test; thêm `pages/TaiKhoan.test.tsx`; README và tài liệu kiến trúc/yêu cầu/kiểm thử/quyết định/changelog/tiến trình.
- **Kiểm chứng:** 15/15 test chọn lọc cho trang độc lập/alias/menu/cài đặt/luồng tài khoản/shell/route/nhãn AI qua. ESLint/TypeScript frontend, format các file thay đổi và build qua. HTTP smoke backend/web/proxy/AI mock qua. Chrome headless với hồ sơ QA riêng kiểm tra cả ba chế độ ở 360/390/760/1440 px, không tràn ngang hoặc cắt input/nút; đăng nhập → vào học tập → đăng xuất, theme tối, reload và hai alias qua. Đã xem ảnh desktop/mobile/theme tối.
- **Kiểm tra toàn dự án:** đã chạy lint/test/coverage/build. Backend 16/16 tests qua, coverage 100%. Frontend 30/37 tests qua; 7 lỗi assertion tiếng Việt không dấu trong `App.test.tsx` đã được ghi nhận trước tác vụ này, chưa có coverage frontend hợp lệ. Lint toàn dự án còn format-check của 4 file có sẵn ngoài phạm vi (`ChuDeNhapVai`, `HoSo`, `LuyenNghe`, `SoTuVung`); các file thay đổi đã format.
- **Giới hạn:** tài khoản vẫn mô phỏng bằng localStorage, chưa xác thực backend hoặc gửi email. Nhánh `feat/standalone-login`, chưa commit/push. Bước tiếp theo: xử lý bộ kiểm thử Việt hóa khi có yêu cầu.

## 2026-10-06 — Cài đặt, đăng nhập bên trong và menu avatar

- **Yêu cầu:** thay Tài khoản ở sidebar bằng Cài đặt với tùy chọn cơ bản; đưa đăng nhập vào trong; avatar trên cùng mở menu theo trạng thái phiên.
- **Kết quả:** route `#cai-dat` có mục Chung/Tài khoản, phần đăng nhập nằm ở `#cai-dat?muc=tai-khoan`; alias `#tai-khoan` vẫn hoạt động. Thêm giao diện sáng/tối/theo hệ thống, giảm chuyển động và tốc độ đọc tiếng Anh, áp dụng ngay và lưu với dữ liệu hiện có. Dữ liệu cũ thiếu hoặc sai cài đặt được bổ sung mặc định, giữ hồ sơ/lịch ôn.
- **Avatar:** hover hoặc bấm để mở; khách chỉ có Đăng nhập, đã đăng nhập có Hồ sơ học tập và Đăng xuất. Đóng khi rời chuột không giữ focus, bấm ngoài, chuyển route, mất focus hoặc Escape; Escape từ trong nhóm trả focus về avatar. Logout cập nhật trạng thái lưu và menu trở về lựa chọn Đăng nhập.
- **File thay đổi:** `App.tsx`, `App.test.tsx`, `index.css`, `components/MenuNguoiDung.tsx` và test, `pages/CaiDat.tsx` và test, `pages/TaiKhoan.tsx`, `demo/duLieu.ts`, `demo/LuuTru.tsx`, `demo/amThanh.ts`; README và tài liệu kiến trúc/yêu cầu/kiểm thử/quyết định/changelog.
- **Kiểm chứng:** 11/11 test chọn lọc cho cài đặt/avatar/shell/route/nhãn AI/tài khoản qua; sau hoàn thiện xử lý Escape, 6/6 test cài đặt/avatar qua. ESLint/TypeScript frontend và build cuối cùng qua. Chrome QA riêng kiểm tra hover thực, đăng nhập, mở hồ sơ, logout, chọn theme và reload; 10 route và mục tài khoản không tràn ngang ở 1440/360/390 px, popup avatar nằm trong màn hình. Đã xem ảnh cài đặt sáng/tối/mobile và trang học ở theme tối.
- **Kiểm tra toàn dự án:** đã chạy task lint/test/coverage/build; backend 16/16 tests, coverage 100%; frontend 25/32 tests qua, còn 7 lỗi văn bản Việt hóa đã có. Task lint dừng ở format của 4 file ngoài phạm vi; các file thay đổi đã format. Chưa có coverage frontend hợp lệ do test cũ lỗi.
- **Giới hạn:** đăng nhập vẫn là trạng thái localStorage; chưa có backend auth hoặc gửi email. Chưa commit/push. Các lỗi kiểm thử cũ cần xử lý trong tác vụ kiểm thử riêng.

## 2026-10-06 — Thanh cuộn mờ dần và nhãn demo chỉ ở tính năng AI

- **Yêu cầu:** làm thanh cuộn hiện/ẩn mượt; bỏ chú thích demo ngoài các tính năng AI.
- **Kết quả:** đăng ký biến màu `--scrollbar-thumb` với `@property`, chuyển màu/độ trong suốt trong 280 ms khi hiện và ẩn; giữ thời gian chờ 1 giây, giữ nguyên kích thước thanh cuộn. Menu mobile cũng chuyển màu mượt; chế độ giảm chuyển động không chạy hiệu ứng. Điều chỉnh min-width body theo vùng hiển thị để không tràn ngang ở viewport 360 px có thanh cuộn.
- **Nội dung:** bỏ badge demo toàn app, nhãn người học/tài khoản demo, ghi chú demo tổng quan và lịch demo flashcard. Nhãn `AI · Demo` nằm cạnh hội thoại, phân tích nói/viết và banner hội thoại AI. Tài khoản dùng nhãn Đăng nhập/Tạo tài khoản/Gửi yêu cầu; vẫn chỉ lưu trạng thái trên trình duyệt, không thêm xác thực backend hoặc gửi email.
- **File thay đổi:** `frontend/src/index.css`, `frontend/src/App.tsx`, `frontend/src/App.test.tsx`, các trang `TaiKhoan`, `Flashcard`, `TongQuan`, `HoiThoaiAI`, `LuyenNoi`, `LuyenViet`; tài liệu tiến trình, yêu cầu, changelog và kiểm thử.
- **Kiểm chứng:** 5/5 test chọn lọc cho thanh cuộn, nhãn AI, tài khoản, shell và route qua; ESLint/TypeScript và format các file thay đổi qua; build qua. Chrome 1440/390 px ghi nhận alpha trung gian khi hiện (~0.51) và ẩn (~0.29–0.38), trở về 0 sau hiệu ứng; độ rộng bố cục không đổi. Cả 10 route ở 1440/360/390 px không tràn ngang và không có demo ở sidebar/topbar/trang không dùng AI.
- **Kiểm tra toàn dự án:** đã chạy `lint`, `test`, `coverage`, `build`. Backend 16/16 tests, coverage 100%; frontend 19/26 tests qua, còn 7 lỗi văn bản Việt hóa đã có. Task lint dừng ở format của 6 file ngoài phạm vi; chưa có coverage frontend hợp lệ. Chưa commit hoặc push.

## 2026-10-06 — Ẩn thanh cuộn khi không sử dụng

- **Yêu cầu:** thanh cuộn mặc định ẩn, chỉ hiện khi người dùng cuộn.
- **Kết quả:** thanh cuộn mảnh, nền trong suốt; hiện riêng cho vùng đang cuộn và tự ẩn sau 1 giây không có sự kiện cuộn. Áp dụng cho trang, sidebar và vùng cuộn bên trong. Giữ nguyên độ rộng để tránh xê dịch bố cục; vẫn cuộn bằng chuột, touch và bàn phím như bình thường. Listener/timer được dọn khi unmount.
- **File thay đổi:** `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/App.test.tsx` và tài liệu tiến trình/yêu cầu/changelog/kiểm thử.
- **Kiểm chứng:** 3/3 test chọn lọc cho thanh cuộn, shell/menu và routing qua; ESLint/TypeScript, format các file thay đổi và build qua. Chrome kiểm tra màu thanh cuộn trang/sidebar ở ba thời điểm trước/trong/sau cuộn: trong suốt → xanh xám → trong suốt, độ rộng trang/sidebar không đổi.
- **Kiểm tra toàn dự án:** đã chạy lại task `lint`, `test`, `coverage`, `build`: backend 16/16 tests, coverage 100%; frontend 17/25 tests qua, 8 lỗi văn bản Việt hóa giữ nguyên. Task lint dừng ở format của 11 file ngoài phạm vi; build qua. Chưa có coverage frontend hợp lệ. Chưa commit hoặc push.

## 2026-10-06 — Bố trí logo và đồng bộ nhận diện EngMate AI

- **Yêu cầu:** thêm logo theo ảnh người dùng cung cấp vào giao diện cho phù hợp.
- **Kết quả:** tái dựng biểu tượng hội thoại/chữ E bằng SVG nền trong suốt; component `Logo` dùng chung cho sidebar, thanh trên cùng mobile và trang tài khoản. Thêm favicon, theme-color; dùng xanh navy/cyan cho banner, menu đang chọn, nút chính và focus. Giữ vàng ở chi tiết ba chấm của logo.
- **File thay đổi:** `frontend/public/engmate-mark.svg`, `frontend/src/components/Logo.tsx`, `frontend/src/App.tsx`, `frontend/src/pages/TaiKhoan.tsx`, `frontend/src/index.css`, `frontend/index.html` và tài liệu tiến trình/yêu cầu/changelog.
- **Kiểm chứng:** build qua; ESLint/TypeScript frontend qua; backend lint/type-check qua, 16/16 tests và coverage 100%. Hai test shell/menu và routing hiện có qua. Chrome desktop 1440 px và cả 10 route ở 360/390/760 px: logo tải thành công, không tràn ngang, logo đầy đủ nằm vừa sidebar. Đã xem ảnh desktop, mobile và trang tài khoản.
- **Giới hạn kiểm thử:** lệnh test/coverage toàn dự án chưa qua: frontend 16/24 tests qua, 8 lỗi do assertion dùng câu tiếng Việt không dấu trong khi UI hiện có dấu (không thuộc thay đổi logo). Coverage frontend không có kết quả hợp lệ trong lượt này. Task lint toàn dự án dừng ở format-check của 12 file có sẵn; các file giao diện thay đổi cho logo đã được format. Không sửa assertion hoặc format các file ngoài phạm vi.
- **Tồn đọng:** SVG là bản tái dựng theo ảnh, không phải file vector gốc. Bước tiếp theo: đồng bộ các test văn bản với bản Việt hóa khi xử lý tác vụ kiểm thử. Chưa commit hoặc push.

## 2026-10-06 — Hoàn thiện bản demo frontend đa trang

- **Yêu cầu:** tiếp tục hoàn thiện demo theo danh sách chức năng, giao diện hiện đại có thanh menu và tên file tiếng Việt không dấu.
- **Kết quả:** thay trang khởi tạo bằng app responsive có sidebar desktop/menu mobile và 10 hash route: tổng quan, hội thoại AI, luyện nói, chủ đề nhập vai, luyện nghe, luyện viết, sổ từ vựng, flashcard, hồ sơ và tài khoản. Các file/component mới đều đặt tên tiếng Việt không dấu.
- **Tương tác:** chat gọi `/api/ai/reply`; ghi âm/phát âm dùng API trình duyệt; hồ sơ, từ vựng, thống kê ngày và lịch ôn lưu trong `localStorage`. UI báo rõ các phản hồi cố định, auth mô phỏng, AI mock và trường hợp trình duyệt không lưu được.
- **Responsive và accessibility:** thêm skip link, trạng thái menu, focus, ARIA cho chat/flashcard và cleanup audio/request. Rà soát bằng viewport thật cho cả 10 route ở 360 px và 390 px cho kết quả `scrollWidth === clientWidth`; bản desktop 1440 px hiển thị đúng bố cục.
- **Kiểm chứng:** `lint`, `build` và HTTP `smoke` qua; backend 16/16 tests, coverage 100%; frontend 24/24 tests, coverage statements 85%, branches 81.66%, functions 81.28%, lines 86.99%.
- **Giới hạn:** chưa có tài khoản/DB thật, chat streaming, STT hoặc chấm phát âm thật, phân tích bài viết bằng model và E2E cho quyền micro trên trình duyệt thật. Pytest có cảnh báo không ghi được thư mục cache do quyền Windows, không ảnh hưởng kết quả.
- **Nhánh làm việc:** `feat/demo-giao-dien`; chưa commit hoặc push.

## 2026-10-05 — Khởi chạy local theo yêu cầu

- **Yêu cầu:** chạy dự án trên máy hiện tại.
- **Việc đã làm:** cài frontend bằng `npm ci`; máy chưa có Python khả dụng nên tải uv và Python 3.13 vào `.tools/`, tạo `.venv/`, cài backend từ `requirements-dev.txt` và editable package; tạo `.env` từ mẫu. Các thư viện và công cụ local được Git bỏ qua.
- **Đang chạy:** Vite tại `http://127.0.0.1:5174`, FastAPI tại `http://127.0.0.1:8010`, Swagger tại `http://127.0.0.1:8010/docs`; AI dùng mock. Chạy bằng task `dev-frontend` tương đương và `dev-backend` của dự án.
- **File thay đổi:** chỉ `docs/PROGRESS.md`, trên nhánh `chore/run-local-20261005`; không đổi mã ứng dụng.
- **Kiểm chứng:** `scripts/manage.py smoke` qua backend health, frontend HTML, Vite API proxy và AI mock; `lint` và `build` qua; `coverage` qua 16 backend tests và 13 frontend tests, coverage hai phía 100%.
- **Tồn đọng:** chưa chạy Docker hoặc GitHub Actions trong tác vụ này. Đây là server phát triển local; AI thật và các tính năng nghiệp vụ còn trong backlog.
- **Bước tiếp theo:** mở địa chỉ web để sử dụng. Khi cần khởi chạy lại, dùng `.\make.cmd dev-backend` và `.\make.cmd dev-frontend` trong hai terminal riêng.

## 2026-10-05 — Bàn giao khung dự án vào main

- **Yêu cầu:** người dùng cho phép merge khung vào `main` và cập nhật GitHub.
- **Khảo sát:** sau `git fetch origin`, `origin/main` ở `cd0f709`, nhánh `chore/phase-0-bootstrap` ở `669072d`; working tree sạch. Main là tổ tiên của nhánh khung, không có thay đổi phân kỳ.
- **Phương thức:** commit nhật ký trên nhánh khung, sau đó merge vào main bằng fast-forward và push thông thường; giữ lịch sử, không force push. Đối chiếu HEAD local với remote sau khi push.
- **File thay đổi:** chỉ `docs/PROGRESS.md`; đưa bộ khung đã có vào main, không bổ sung hành vi ứng dụng.
- **Kiểm chứng ngày 2026-10-05:** `.\make.cmd coverage` qua 16/16 backend tests và 13/13 frontend tests, coverage hai phía 100%; `.\make.cmd build` qua, Vite build 33 modules. `git diff --check` qua; lint/type-check/format được kiểm tra qua hai Git hook khi commit.
- **Tồn đọng:** GitHub Actions sẽ được kích hoạt bởi push vào main; chưa có kết quả CI tại thời điểm ghi nhật ký. AI dùng mock, các tính năng nghiệp vụ còn trong backlog.
- **Bước tiếp theo:** xem kết quả CI trên GitHub và triển khai theo `docs/IMPLEMENTATION_PLAN.md` khi được yêu cầu.

## 2026-10-04 — Push khung dự án lên GitHub thành công

- **Yêu cầu:** tiếp tục push lên GitHub theo xác nhận của người dùng; tuân thủ `AGENT.md` và `CLAUDE.md`.
- **Kết quả:** `git push -u origin chore/phase-0-bootstrap` thành công, tạo nhánh remote và thiết lập upstream. GitHub đã nhận commit khung `fd49327` và commit nhật ký `bc791f5`, gồm workflow CI; lỗi quyền `workflow` trước đó không còn chặn lần push này.
- **File thay đổi:** chỉ `docs/PROGRESS.md`, bổ sung kết quả bàn giao; mã ứng dụng giữ nguyên.
- **Kiểm chứng:** bộ khung đã qua 16 backend tests và 13 frontend tests, coverage 100% hai phía, lint/type-check, build và Docker smoke ở lần kiểm chứng trước. Không chạy lại tests ứng dụng cho thay đổi nhật ký; Git hook chạy kiểm tra khi commit tài liệu.
- **Tồn đọng:** chưa có kết quả GitHub Actions; workflow chạy khi mở PR hoặc push vào main. AI hiện dùng mock; các tính năng nghiệp vụ còn trong backlog.
- **Bước tiếp theo:** mở PR để review và chạy CI, sau đó triển khai theo `docs/IMPLEMENTATION_PLAN.md` khi được yêu cầu.

## 2026-10-04 — Bàn giao khung lên Git theo hướng dẫn agent

- **Yêu cầu:** người dùng cho phép commit và push khung; đã đọc `AGENT.md` và `CLAUDE.md`. Quy tắc không tự push được đáp ứng bằng yêu cầu rõ ràng lần này.
- **Phạm vi:** khung frontend/backend, tests, lockfile, tooling và documentation đã dựng; bổ sung file hướng dẫn `AGENT.md` vào repo và liên kết từ README.
- **Nhánh/remote:** `chore/phase-0-bootstrap` → `origin` (`VoMinhHoang1610/engmate-ai`); giữ nhánh riêng, không sửa lịch sử hoặc commit vào main.
- **Kiểm chứng:** mã ứng dụng không đổi so với lần reset đã kiểm chứng ngay trước đó: 16 backend + 13 frontend tests qua, coverage khung 100% hai phía; lint/type-check, build, pre-commit và Docker smoke qua. Commit dùng Git hook để chạy lại lint/type-check/format.
- **Rà soát:** kiểm tra diff và danh sách file; `.env`, backup, dependency cài local, coverage và build artifact đều được Git bỏ qua. Không tìm thấy private key hoặc token theo các mẫu đã quét; không ghi nội dung secret vào log.
- **File tài liệu cập nhật:** `AGENT.md`, `README.md`, `CLAUDE.md`, `docs/PROGRESS.md`.
- **Kết quả Git:** commit `fd49327` (`chore: add tested EngMate-AI project scaffold`) đã tạo; cả hai pre-commit hook qua. GitHub từ chối push vì OAuth thiếu quyền `workflow` để tạo `.github/workflows/ci.yml`. Kiểm tra SSH với strict host verification cũng chưa thành công vì máy chưa có host key tin cậy của GitHub. Chưa có nhánh mới trên remote từ lần push này.
- **Tồn đọng:** đã xin xác nhận đăng nhập lại/cấp quyền phù hợp theo mục 8 của `AGENT.md`; chưa thay đổi cấu hình xác thực hoặc loại bỏ file CI.
- **Bước tiếp theo:** push sau khi xác thực đủ quyền; mở PR để kích hoạt CI (workflow hiện chạy trên PR và push vào main), rồi triển khai backlog trong `IMPLEMENTATION_PLAN.md`. Các giới hạn về mock AI và nghiệp vụ chưa triển khai giữ nguyên.

## 2026-10-04 — Reset và dựng khung mới

### Yêu cầu và phạm vi

Người dùng yêu cầu reset dự án và dựng khung frontend JavaScript/TypeScript, backend AI Python, test và documentation tiến độ. Khung cũ được chuyển vào `.artifacts/before-reset-20261004-144402`; Git history được giữ lại. Các container EngMate-AI cũ đã dừng trước khi thay nguồn.

### Việc đã làm và file thay đổi

- Dựng lại `frontend/src/`: API client, hook health, component trạng thái và trang React/TypeScript đơn giản, nối API qua Vite proxy.
- Dựng lại `backend/app/`: application factory, config, routes, schemas, AIService, LLM interface/mock và prompt `persona.v1.txt`.
- Viết tests backend trong `tests/unit/`, `tests/integration/`; frontend có tests API/component/hook và cleanup globals/DOM.
- Thay `scripts/manage.py`, `scripts/smoke.py`, `make.cmd`, Makefile; task runner Python xử lý Unicode và dừng ngay khi lệnh con thất bại.
- Dựng lại Dockerfiles, Compose hai dịch vụ, pre-commit và `.github/workflows/ci.yml`; các lockfile đồng bộ với manifest.
- Viết lại README, CLAUDE.md và documentation yêu cầu, kiến trúc, API, kiểm thử, quyết định, changelog, prompt và kế hoạch code tiếp theo.
- Khung dùng cổng 8010/5174, health route `/api/health`, AI mock `/api/ai/reply`; `.env` local được tạo lại theo cấu hình này.

### Kết quả kiểm chứng thực tế

Môi trường local: Windows, Python 3.13.11, Node 25.9.0; Docker/CI cấu hình Python 3.13 và Node 24.

| Lệnh Windows | Kết quả |
| --- | --- |
| `.\make.cmd setup` | Qua: backend editable và `npm ci`; npm audit trong bước cài ghi nhận 0 vulnerabilities. |
| `.\make.cmd format` | Qua. |
| `.\make.cmd lint` | Qua: Ruff, Black, mypy strict (26 files), ESLint, TypeScript và Prettier. |
| `.\make.cmd test` | Qua: backend 16/16; frontend 13/13, 3 test files. |
| `.\make.cmd coverage` | Qua: backend 100% trên 70 statements; frontend statements/branches/functions/lines đều 100%. Ngưỡng mỗi phía 80%. |
| `.\make.cmd build` | Qua: Vite production build, 33 modules, artifact `frontend/dist/`. |
| `.\make.cmd pre-commit` | Qua: cả hai hook. Hook local đã được cài trong checkout trước reset; cấu hình mới đã chạy thật. |
| `.\make.cmd docker-check` | Qua. |
| `.\make.cmd docker-up` và `smoke` | Qua: backend/frontend healthy; health trực tiếp và qua Vite proxy, web HTML và AI mock qua proxy đều đạt. |
| GitHub Actions | Có workflow; chưa chạy trên GitHub. |

### Giới hạn và tồn đọng

- Coverage áp dụng cho mã khung hiện có; không chứng minh auth/chat/DB hoặc chất lượng model thật.
- Backend dùng httpx AsyncClient/ASGITransport để kiểm thử async và tránh TestClient đang có cảnh báo deprecation ở dependency hiện tại.
- Sandbox Windows chặn cache/tiến trình con của công cụ; bộ kiểm chứng cuối đã chạy ngoài sandbox sau khi được cấp quyền. Terminal local thông thường không có giới hạn sandbox này.
- npm còn cảnh báo vòng đời hỗ trợ ESLint 9; lint vẫn qua và audit không phát hiện vulnerability. Xem xét nâng cùng plugin khi cập nhật dependency chủ động.
- DB, auth, chat streaming, phân tích lỗi, provider thật, E2E nghiệp vụ và triển khai production nằm trong backlog.
- Mã khung chưa commit/push; bản backup và artifact/cache được Git bỏ qua.

### Bước tiếp theo

Khung đã hoàn thành kiểm chứng local. Stack Docker đang chạy tại web `http://127.0.0.1:5174`, API `http://127.0.0.1:8010`; dừng bằng `.\make.cmd down`.

Triển khai schema DB/SQLAlchemy/Alembic và models theo `IMPLEMENTATION_PLAN.md`, thêm test cùng code và thêm mục mới ở đầu nhật ký khi thay đổi. Mọi phần chưa làm nằm trong `REQUIREMENTS.md`.


## 2026-10-01 — GĐ 0: Khởi tạo nền tảng (đang kiểm chứng)

### Phạm vi và quyết định

- Người dùng đã xác nhận tiếp tục kế hoạch GĐ 0 và chốt tên **EngMate-AI**, thay tên sản phẩm cũ trong hướng dẫn ban đầu.
- Phạm vi gồm nền repo, API health, trang placeholder, công cụ kiểm tra, Docker/Compose, CI và tài liệu. Chưa triển khai auth, chat, models, migration hoặc LLM.
- Chọn React Context cho state dùng chung khi cần; PostgreSQL qua Compose là môi trường phát triển chuẩn. SQLite qua cấu hình và lớp LLM/mock thuộc GĐ 1.

### Việc đã làm và file thay đổi

- Tạo tài liệu nền: `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/TESTING.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/PROMPTS.md`.
- Ghi rõ FR/NFR, ERD và luồng chat dự kiến, API health GĐ 0, test mapping, quyết định kỹ thuật và backlog xóa dữ liệu tài khoản.
- Các file mã nguồn, hạ tầng và hướng dẫn ở root đang được triển khai trong cùng GĐ 0; danh sách cuối cùng và kết quả chạy phải được bổ sung trước khi báo hoàn thành.

### Kết quả kiểm chứng

| Kiểm tra | Kết quả hiện tại |
| --- | --- |
| `make setup` | Chưa ghi nhận kết quả. |
| `make lint` | Chưa ghi nhận kết quả. |
| `make test` | Chưa ghi nhận kết quả. |
| `make coverage` | Chưa ghi nhận kết quả; chưa có tỷ lệ coverage để báo cáo. |
| `make build` | Chưa ghi nhận kết quả. |
| Dev/Compose và smoke HTTP | Chưa ghi nhận kết quả. |
| Pre-commit | Chưa ghi nhận kết quả. |
| GitHub Actions | Chưa chạy trên GitHub; việc tạo workflow chưa chứng minh CI đã qua. |

### Tồn đọng và giới hạn

- Hoàn tất kiểm chứng GĐ 0 và cập nhật số liệu thực tế; không chuyển sang GĐ 1 khi test hiện tại chưa qua.
- Windows chưa có GNU Make trong PATH ở lần kiểm tra ban đầu; cần cung cấp và xác minh hướng dẫn bootstrap/lệnh gọi.
- Các chức năng GĐ 1–4 chưa làm, được liệt kê trong [REQUIREMENTS.md](REQUIREMENTS.md). Endpoint xóa dữ liệu tài khoản là backlog bắt buộc của backend/MVP.
- Chưa chọn LLM provider/model, chưa có API key hoặc chi phí LLM; chưa có thử nghiệm prompt hay đo độ trễ chat.

### Việc tiếp theo

Hoàn tất các kiểm tra, sửa lỗi trong GĐ 0 và ghi kết quả tại mục này. Sau khi đủ điều kiện hoàn thành, bàn giao ngắn gọn và chờ xác nhận trước khi sang GĐ 1. Mỗi lần làm việc tiếp theo thêm mục mới ở đầu nhật ký, giữ lại lịch sử cũ.
