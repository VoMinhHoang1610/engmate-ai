# MySQL cho bản hội thoại

Bootstrap mới tại [SQL root](../../gemini-code-1791478978574.sql), MySQL 8.0.16+, utf8mb4 và UTC. Tạo 9 bảng: TrinhDoCEFR, PhienBanCauTruc, NguoiDung, HoSoNguoiHoc, PhienDangNhap, PhienHoc, HoiThoai, TinNhan, DanhGiaAI; 4 trigger Version. Chỉ seed CEFR tương thích và version 1, không seed tài khoản/bài tập.

**Chỉ chạy trên database chưa có bảng.** MySQL DDL tự COMMIT; không chạy lại SQL trên EngMateAI hiện có. API tiếp tục dùng các bảng hội thoại v1 trong database cũ, không DROP hay sửa bảng bài tập/người dùng trong quá trình thu gọn ứng dụng. DanhGiaAI chỉ lưu lifecycle reply; không có API chấm điểm.

Đặt `DATABASE_MYSQL_URL=mysql+pymysql://username:password@host:3306/EngMateAI?charset=utf8mb4` trong `.env` riêng và JWT_SECRET >=32 ký tự. Percent-encode mật khẩu. Driver init `time_zone=+00:00`, READ COMMITTED, pool pre-ping/recycle. Chỉ chọn MySQL hoặc SQL Server, không đồng thời.

Database test phải mới, tên kết thúc `_test`, chưa có tài khoản. Đổi tên EngMateAI trong SQL trước khi bootstrap test, đặt MYSQL_TEST_URL trong terminal. Suite rollback mọi account/conversation tạo thử. Không dùng dữ liệu thật làm fixture. [verify_chat.sql](tests/verify_chat.sql) chỉ đọc trong database được chọn.

Trong Docker dùng host.docker.internal nếu DB nằm trên Windows host, đặt URL đó vào DOCKER_DATABASE_MYSQL_URL riêng. Không tự chuyển sang instance khác chỉ vì thấy cổng mở; xác minh schema/credentials/version trước.
