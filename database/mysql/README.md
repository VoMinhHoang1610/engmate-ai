# MySQL và đồng bộ ứng dụng EngMate-AI

File tạo database là [gemini-code-1791478978574.sql](../../gemini-code-1791478978574.sql) ở root. Mở trong MySQL Workbench và chạy toàn bộ trên database chưa có bảng ứng dụng. Dùng MySQL 8.0.16 trở lên; đã thực thi thử trên 8.0.45, chưa chạy trực tiếp trên 8.4. Đây là bootstrap database mới, không phải migration cho schema đã tồn tại. Không dùng `--force`; dừng nếu có lỗi.

File tạo database `EngMateAI`, 24 bảng, 2 view và 7 trigger. Danh mục có 7 mức Pre-A1 đến C2, 63 bài học (21 Speaking, 7 Listening, 7 Reading, 28 Writing), 35 câu hỏi, 84 lựa chọn và 22 từ gợi ý. Dữ liệu lấy từ frontend hiện tại; không seed tài khoản hoặc sổ từ cá nhân. Riêng mục 3 từ START TRANSACTION đến COMMIT có thể chạy lại để thêm danh mục còn thiếu, không sửa revision đã xuất bản. Không chạy lại toàn bộ DDL.

`TrinhDoCEFR` lưu mã và thứ tự mức học; `TuVungBaiHoc` lưu từ gợi ý của bài, tách khỏi `TuVungNguoiDung` của từng người. `CaiDatNguoiDung.SpeechVoiceId` lưu lựa chọn giọng; `HoSoNguoiHoc.OnboardingCompletedAt` khác NULL nghĩa là đã làm quen với Mate. UpdatedAt tự cập nhật; Version BIGINT tăng nhờ trigger. Mỗi kết nối ứng dụng phải đặt time_zone='+00:00'.

Backend dùng SQLAlchemy Core/PyMySQL khi đặt DATABASE_MYSQL_URL; ánh xạ tên bảng/view tiếng Việt, UUID chuỗi, transaction READ COMMITTED, khóa user FOR UPDATE và token Version hex 16 ký tự. Mỗi kết nối pool đặt UTC. INSERT lấy khóa tự sinh rồi đọc lại; UPDATE kiểm tra Version và đọc kết quả trigger trong cùng transaction. Không tự tạo hoặc thay đổi bảng khi khởi động. Không thêm key Blaze vào database.

Đặt DATABASE_MYSQL_URL trong `.env` root và JWT_SECRET ngẫu nhiên ≥32 ký tự; để trống DATABASE_ODBC_CONNECTION. URL dùng dạng `mysql+pymysql://username:password@localhost:3307/EngMateAI?charset=utf8mb4`, không dùng tiền tố JDBC. Đặt `VITE_DATA_SOURCE=mysql` trong `frontend/.env.local`, khởi động lại frontend/backend và đăng ký trên giao diện. Dữ liệu cũ trong localStorage demo không được sao chép vào tài khoản. Hồ sơ, onboarding, giọng/tốc độ, từ, lượt ôn, bài làm và hội thoại được lưu qua API; Reading/Listening chấm ở server. Speaking/Writing và chat vẫn dùng mock AI. Email tài khoản được hiển thị chỉ đọc trong hồ sơ; API đổi email yêu cầu xác nhận mật khẩu riêng.

Lệnh migrate-backend chỉ dành cho SQL Server và từ chối bootstrap MySQL tự động. Kiểm tra MySQL đã tạo bằng `/api/ready`; không chạy lại toàn bộ file SQL khi bảng đã tồn tại.

Integration: bootstrap cùng SQL vào MySQL **riêng** có tên kết thúc `_test` và chưa có tài khoản. Đặt MYSQL_TEST_URL trong terminal, chạy `python scripts/manage.py test` hoặc `coverage`. Test từ chối schema tên khác, rollback toàn bộ dữ liệu thử và không chạy DDL. Các luồng trình duyệt dùng schema riêng khác để không ảnh hưởng dữ liệu ứng dụng.

Kiểm tra chỉ đọc sau khi tạo: mở [tests/verify_catalog.sql](tests/verify_catalog.sql). Bảng câu hỏi sai phải rỗng và các cột Pass phải bằng 1. Trên database thử tách biệt tại cổng 13429 đã chạy 45 kiểm tra bằng CLI: nội dung khớp frontend, seed chạy lại, đủ bảy mức, Reading, quyền sở hữu/khóa ngoại, lựa chọn giọng, default/onboarding, chống trùng từ, tăng Version, UpdatedAt và thống kê. Các thao tác thử người dùng rollback; không giữ tài khoản mẫu. Script và dữ liệu thử local ở `.artifacts/mysql-schema-check` bị Git ignore.
