# Quyết định kỹ thuật

## 2026-10-08 — Hợp nhất UI mới với backend SQL v1

- Giữ luồng làm quen, Reading/lộ trình bảy mức, hỗ trợ Mate mới và toàn bộ backend đã có trên develop. Giữ sửa lỗi phiên intro, username và storage jsdom của develop.
- Tách kiểu mức SQL khỏi kiểu AI mock: database v1 có CHECK A2/B1/B2 và cột varchar(2), nên không thể dùng chung kiểu bảy mức. API lưu dữ liệu từ chối mức chưa hỗ trợ bằng validation 422.
- Chọn giữ schema v1; mở rộng schema/catalog lên bảy mức cần migration riêng được review. Merge không chạy migration trên database ứng dụng và không tự chuyển dữ liệu localStorage.
- Giữ prompt v1 bất biến; nội dung bảy mức được lưu thành persona.v2, service và PromptVersion của hội thoại mới dùng chung phiên bản để snapshot có thể truy vết.

## 2026-10-07 — Mate hỏi trình độ lần đầu bằng ngôn ngữ gần gũi

- Người mới không cần mở lộ trình và hiểu mã CEFR. Mate hỏi trực tiếp sau khi tạo phiên; bảy lựa chọn mô tả những việc người học làm được, mỗi lựa chọn có ví dụ và lời động viên. Ánh xạ nội bộ sang bảy chặng dùng chung cho kỹ năng; không hiển thị mã trong câu hỏi/câu trả lời.
- Dùng một bước làm quen riêng thay vì popup có thể đóng hoặc chọn mức mặc định âm thầm. Người học xác nhận để đặt mức; xem trước không đổi hồ sơ. Đây là tự mô tả khả năng để chọn bài phù hợp, chưa phải bài kiểm tra xếp lớp; vẫn có thể điều chỉnh ở lộ trình/hồ sơ.
- Cờ `daLamQuen` trong Context/localStorage giúp không hỏi lại khi reload hoặc đăng nhập lại. Dữ liệu demo cũ chưa có cờ được hỏi một lần, giữ nguyên tiến độ. Vì demo chưa có tài khoản backend riêng biệt, cờ thuộc hồ sơ trên trình duyệt; đăng ký mới đặt lại cờ. Không thêm OAuth, xác thực hoặc dịch vụ AI.

## 2026-10-07 — Lộ trình nhập môn đến thành thạo

- Dùng A1–C2 theo [các mức CEFR](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions), bổ sung Pre-A1 theo [CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions) làm điểm vào cho người chưa học; không gán A0 hoặc C3 thành mức CEFR.
- Người mới mặc định Pre-A1; hồ sơ cũ giữ nguyên. Một danh sách chung định nghĩa type, lựa chọn và mục tiêu frontend. API mở rộng Literal tương ứng; giữ default A2 để tương thích client cũ.
- Chặng được người học tự chọn, không tự coi đã đạt CEFR vì làm vài câu mẫu. Bài thực hành được biên soạn theo mức, chưa phải giáo trình đầy đủ/chuẩn hóa hay kiểm tra xếp lớp. Liên kết chặng truyền query cho đúng bài; đổi độ khó tại trang luyện không tự nâng hồ sơ.
- Giữ Web Speech/MediaRecorder và AI mock; không thêm dịch vụ trả phí hoặc dependency. Reading chấm đáp án biên soạn; phản hồi Speaking/Writing vẫn ghi rõ minh họa cố định.

## 2026-10-07 — Tích hợp develop phục vụ demo

- Merge backend/database và nhánh UI đã đồng bộ CI trên nhánh tích hợp; khi checks qua, develop nhận bằng fast-forward. Không merge backup WIP cũ, không sửa lịch sử nguồn/main hoặc push remote.
- Giữ UI mới yêu cầu đăng nhập demo abc/123; tests cho trang học tập seed phiên hợp lệ, guest menu kiểm tra riêng. Các assertion được cập nhật theo nội dung/bố cục mới, giữ kiểm tra thất bại và ngưỡng coverage.
- Vitest alias window về globalThis; Node 25 cung cấp Web Storage riêng nên lấy storage từ jsdom.window gốc. Không giả API storage để né lỗi; vẫn kiểm tra quota error/lưu/khôi phục bằng implementation trình duyệt giả của jsdom.
- UI/SQL API cùng bản demo nhưng chưa nối nghiệp vụ: localStorage + mock reply hoạt động không cần DB/key, auth SQL cần tài khoản thật qua Swagger. Hướng dẫn demo nêu rõ hai luồng để tránh nhầm tài khoản demo với JWT.

## 2026-10-07 — Hoàn thiện backend/API trên schema SQL Server

- Dùng SQLAlchemy Core + pyodbc reflect whitelist bảng/view. Script T-SQL đã thiết kế là nguồn schema duy nhất; không sinh DDL ORM trùng lặp. Migration runner được gọi chủ động, không tự tạo DB khi server khởi động.
- Giao dịch ngắn, khóa user và request UUID phối hợp retry; rowversion phát hiện sửa dữ liệu cũ. Mỗi request auth đối chiếu DB session để revoke có hiệu lực ngay. Argon2 cho mật khẩu, JWT access có issuer/audience/purpose; refresh/reset chỉ lưu hash.
- SQL đồng bộ chạy worker thread cho luồng chat/practice async; LLM ngoài transaction, timeout và trạng thái lỗi/hủy lưu lại. Mock có nhãn và không tạo điểm AI nói/viết. Listening chấm SQL, trả answer key sau nộp; transcript vẫn phục vụ browser TTS demo.
- Pillow xác thực/re-encode avatar; WAV đo duration từ frames; ffprobe kiểm tra WebM/Ogg. Media private, tải qua owner + Bearer. Image Docker có ODBC 18/ffmpeg; Windows local dùng driver hiện có, cần ffprobe riêng cho WebM/Ogg.
- Reset mật khẩu qua SMTP STARTTLS tùy chọn. Thiếu cấu hình trả 503 đồng nhất; lỗi gửi khi đã cấu hình trả 202 đồng nhất và log chung không tiết lộ recipient/token. Không gửi email hoặc paid API trong tests.
- Giới hạn body/auth work và semaphore hash mật khẩu chống chiếm hết tài nguyên trong một process. Rate limiter theo peer IP/process; deployment qua proxy/nhiều worker cần cấu hình riêng.
- Test schema/API trong tempdb với guard + outer rollback; CI có SQL Server service disposable. CI mới chưa push/chạy GitHub; kiểm chứng local không thay thế kết quả workflow.
- Giao diện đa trang giữ ở nhánh riêng; không tự merge hoặc sửa localStorage trong tác vụ backend. OAuth, email verification, STT, streaming, real LLM và account deletion còn trong backlog.

## 2026-10-07 — Thiết kế SQL Server theo chương trình hiện có

- Chọn SQL Server theo yêu cầu người dùng, thay phương án PostgreSQL ở backlog; chưa đổi runtime backend hoặc cài dependency database. Script mục tiêu SQL Server 2019+, kiểm chứng trên SQL Server 2022 Developer.
- Thiết kế 22 bảng/2 view trong schema `em`, bao phủ toàn bộ UI học tập và tài khoản. Không thêm bảng linh thú, admin, thanh toán hay memory vector vì chưa có nghiệp vụ tương ứng.
- Tách catalog có revision khỏi lịch sử từng người; notebook lưu nghĩa/ví dụ riêng thay vì từ điển chung. Từ archive giữ lịch sử ôn, filtered unique index cho phép thêm lại.
- StudySessions/FlashcardReviews là dữ liệu gốc của thống kê; view tổng hợp riêng trước join để tránh nhân số liệu. Ghi ngày địa phương/offset của sự kiện, UTC timestamps, rowversion cho optimistic concurrency. Chọn ngày hoàn thành khi phiên qua nửa đêm; chưa chia nhỏ thời lượng theo ngày.
- Khóa ghép enforce owner và loại phiên/bài/câu hỏi; request UUID chống replay trùng. AI/provider chạy ngoài transaction, kết quả mock có nhãn riêng. Chính sách cập nhật lịch ôn/đóng phiên nằm trong transaction service sẽ triển khai tiếp.
- Script tạo schema atomic và từ chối schema đã có, không dùng DROP/TRUNCATE/cascade. Seed catalog chạy lại được và không tạo tài khoản/mật khẩu. Kiểm thử trong tempdb với outer transaction, guards và rollback; 45/45 kiểm tra qua, xác nhận không còn schema thử.
- Giới hạn: localStorage không có lịch sử từng lượt nên không thể dựng lại counter cũ chính xác; cần baseline migration riêng nếu muốn giữ tổng cũ. Auth/ORM/concurrency và SQL Server 2019 riêng chưa kiểm thử.

## 2026-10-07 — Sửa cache CI và health check Docker

- Bỏ `cache: pip` và `cache-dependency-path` khỏi `setup-python` theo yêu cầu sửa CI. Task runner đặt `PIP_CACHE_DIR` thành `.cache/pip` chỉ trong tiến trình con, trong khi action dùng đường dẫn mặc định của runner; không còn bước lưu cache pip vào thư mục mặc định có thể chưa được tạo.
- Đây là vấn đề đường dẫn cache trong cấu hình hiện tại, không phải pip-tools không tương thích với cache. `setup-python` hỗ trợ requirements qua `cache-dependency-path`: [tài liệu chính thức](https://github.com/actions/setup-python/blob/main/docs/advanced-usage.md#caching-packages). Nếu thêm cache lại, cần thống nhất đường dẫn giữa action và task runner.
- Dùng curl trong image backend theo yêu cầu; cài với `--no-install-recommends` và dọn apt lists. Health check thất bại khi HTTP lỗi hoặc request quá 2 giây, với start period 15 giây và timeout Docker 3 giây.
- Thêm start period 30 giây cho frontend Compose. Docker vẫn chạy probe trong giai đoạn này; các lần thất bại chưa được tính vào số retries cho đến khi hết giai đoạn khởi động hoặc có probe thành công.
- Giữ Docker frontend ở chế độ dev. Mẫu production trong tài liệu tham chiếu là tùy chọn và stage cuối chưa có package/script để chạy lệnh dev; triển khai production cần server static và proxy API riêng khi có yêu cầu.

## 2026-10-06 — Panel cuộn tài khoản theo brand EngMate

- Tham khảo logic đổi nửa form/nửa CTA của các tutorial đăng nhập, nhưng không dùng bố cục cyan đặc/trắng phẳng. Panel dùng gradient navy→cyan, Mate làm điểm nhấn, sóng SVG và quỹ đạo để khớp nhận diện dự án.
- Animation chính là `translate` đồng bộ giữa panel và form (~0.92s), kèm clip-path “mở cuộn”, stagger field, ribbon/tia sáng; không thêm thư viện. Mobile bỏ slide ngang, dùng pill; giảm chuyển động tắt CSS/WAAPI chiều cao.
- Giữ một form trong DOM, nút xã hội chỉ giao diện, khôi phục mật khẩu full-width.

## 2026-10-06 — Giao diện đăng nhập xã hội và chuyển cảnh

- Người dùng chọn hoàn thiện giao diện trước khi kết nối OAuth thật. Thêm ba nút có logo riêng, callback và thông báo chưa khả dụng; không tạo phiên mô phỏng nhà cung cấp, không mở trang ngoài hoặc thêm cấu hình OAuth chưa dùng.
- Chỉ giữ một biểu mẫu trong DOM, dùng key theo chế độ để làm mới ô mật khẩu nhưng giữ tên/email trong state. CSS chuyển mờ/trượt theo hướng, nghiêng nhẹ và dịch nền tab. Đo chiều cao tự nhiên trong layout effect rồi dùng Web Animations API 420 ms để khung không nhảy; khi bấm nhanh, hủy chuyển động cũ và bắt đầu từ vị trí hiện tại.
- Không thêm thư viện. Chế độ giảm chuyển động tắt CSS và bỏ/hủy animation chiều cao; listener tùy chọn hệ thống được dọn khi rời trang. Các nút và trạng thái vẫn dùng được bằng bàn phím/trình đọc màn hình.

## 2026-10-06 — Mate trở thành linh thú dự án

- Giữ robot trắng/xanh nhạt, mặt navy, mắt cyan và anten vàng đã được người dùng chọn; đặt tên Mate và dùng nhất quán. Thêm tay/biểu cảm và tai nghe, phát triển bản sắc riêng quanh sự đồng hành khi học.
- Tách nhân vật thành `LinhThu` để các trang chia sẻ tỷ lệ và biểu cảm; `TrangTri` chỉ phụ trách bối cảnh banner. Dùng CSS đang có, không thêm thư viện animation hay vòng render liên tục. Có bản vector tĩnh để tái sử dụng trong tài liệu.
- Biểu cảm ăn mừng dựa vào đáp án thật, phiên ôn hoàn thành hoặc mục tiêu ngày đạt; sai thì động viên. Không thêm thành tích/XP/chuỗi ngày giả, không biến phản hồi AI mẫu thành đánh giá thật. Giữ thông báo chữ và hai chế độ giảm chuyển động.

## 2026-10-06 — Bổ sung trang trí và chuyển động

- Theo phản hồi giao diện quá đơn điệu, thêm banner gradient, nhân vật CSS và các điểm nhấn màu theo nhóm thẻ; giữ nội dung nhãn gọn đã được yêu cầu trước đó.
- Dùng CSS keyframes/transition cho hiệu ứng vào trang, thẻ xuất hiện lần lượt, hover, nút, nhân vật/orbit và các trạng thái luyện tập. Không thêm thư viện hay JavaScript cập nhật mỗi khung hình; phần lớn chuyển động dùng transform/opacity.
- Trang trí tách trong `TrangTri`, bỏ khỏi cây trợ năng và không chặn chuột. Giảm chuyển động từ Cài đặt hoặc hệ thống tắt animation/transition nhưng vẫn giữ hình và nội dung.

## 2026-10-06 — Thiết kế tối giản và giảm mô tả phụ

- Dùng một màu nhấn xanh, nền trung tính, viền nhẹ và khoảng cách thống nhất; thay stylesheet trang trí cũ bằng biến màu sáng/tối để tránh các bảng màu riêng theo trang.
- Bỏ mô tả lặp lại nhãn/tiêu đề ngay trong JSX, thay vì chỉ ẩn bằng CSS. Giữ nội dung bài học, thông tin thay đổi quyết định thao tác (độ khó, chu kỳ ôn), lỗi/kết quả và nhãn phản hồi minh họa.
- Dùng `details` cho hướng dẫn luyện nói/flashcard nhằm giữ trợ giúp khi cần mà không chiếm bố cục ban đầu. Không thêm thư viện, không thay cơ chế lưu trữ hoặc API.

## 2026-10-06 — Tách đăng nhập khỏi không gian học tập

- Theo yêu cầu thiết kế lại, chọn trang hash riêng `#dang-nhap` thay cho nhúng biểu mẫu vào Cài đặt. Trang tài khoản có header/main/footer riêng, không hiển thị sidebar hoặc topbar học tập.
- Giữ Context/localStorage bên ngoài cả hai bố cục để chuyển trang không làm mất hồ sơ, tùy chọn hay phiên. Giữ alias tài khoản cũ; menu avatar trỏ trực tiếp đến trang mới.
- Không thêm thư viện routing; hash route hiện có đủ cho bản demo. Khách vẫn có thể học, đăng nhập thành công có nút vào tổng quan; xác thực backend tiếp tục nằm trong backlog.

## 2026-10-06 — Cài đặt và tài khoản trong app shell

- Đặt tài khoản trong `#cai-dat?muc=tai-khoan` theo yêu cầu; giữ alias `#tai-khoan` để liên kết cũ tiếp tục dùng được.
- Mở rộng Context/localStorage hiện có thay vì thêm thư viện hoặc kho dữ liệu riêng. Cài đặt được kiểm tra từng trường và bổ sung mặc định, giữ dữ liệu hồ sơ của bản cũ.
- Theme theo hệ thống dùng `matchMedia` và dataset, giảm chuyển động dùng CSS; tốc độ đọc áp dụng cho Web Speech hiện có. Không triển khai backend auth/email ngoài phạm vi thay đổi giao diện này.
- Avatar dùng disclosure có nút, liên kết và nhóm hành động, điều hướng Tab tự nhiên; thêm hover cho desktop và click cho mobile, không dùng menu ARIA giả thiếu hành vi bàn phím.

## 2026-10-04 — Dựng lại khung

- Giữ tên EngMate-AI và chọn React/TypeScript + FastAPI/Python theo yêu cầu reset.
- Dùng TypeScript strict, Pydantic, mypy và schema validation để phát hiện lỗi ở ranh giới dữ liệu.
- Tách route/service/provider, dùng mock mặc định. Chưa chọn provider thật hoặc ngân sách; không cần API key để phát triển khung.
- Task runner Python dùng argument list cho subprocess, xử lý đường dẫn Unicode đúng trên Windows; GNU Make chỉ còn là wrapper tùy chọn.
- Cổng local 8010/5174 tránh dịch vụ khác đang dùng 8000/8001/5173 trên máy hiện tại.
- Lockfile backend/npm được giữ đồng bộ với manifest. Vitest/coverage dùng 4.1.11; nguồn phiên bản vá: [advisory của Vitest](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).
- DB/auth/chat streaming được làm theo backlog khi bắt đầu nghiệp vụ; scaffold không tạo database hoặc giả lập đăng nhập.
- Bản nguồn cũ được sao lưu trong `.artifacts/before-reset-*`; Git history và môi trường cài dependency hiện có tiếp tục dùng cho checkout này.
