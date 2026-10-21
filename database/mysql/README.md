# MySQL cho tài khoản, hội thoại và lộ trình TOEIC

Bootstrap mới tại [SQL root](../../gemini-code-1791478978574.sql), MySQL 8.0.16+, utf8mb4 và UTC. Tạo **13 bảng/4 trigger Version**: 9 bảng nền `TrinhDoCEFR`, `PhienBanCauTruc`, `NguoiDung`, `HoSoNguoiHoc`, `PhienDangNhap`, `PhienHoc`, `HoiThoai`, `TinNhan`, `DanhGiaAI` và 4 bảng lộ trình `engmate_learning_plans`, `engmate_learning_progress`, `engmate_learning_bindings`, `engmate_learning_receipts`. Chỉ seed 7 mã CEFR và schema version **1**; không seed tài khoản, mật khẩu hoặc khóa API.

**Chỉ chạy bootstrap trên database chưa có bảng.** MySQL DDL tự COMMIT; không chạy lại SQL trên EngMateAI hiện có. Database mới đã có đủ bảng lộ trình, không cần chạy thêm `scripts/install_learning.py`. Giữ schema version 1 để tương thích kiểm tra `/api/ready`; phiên bản catalog giáo án được quản lý riêng.

Bốn bảng lộ trình khớp metadata trong `backend/app/db/learning.py`: lưu kế hoạch, tiến độ/check/lịch ôn, liên kết hội thoại với bài và receipt chống gửi lặp theo tài khoản/UUID. `plans.Version` là số nguyên do service tăng khi lưu, không có trigger. Không thêm khóa ngoại hoặc thay bảng cũ; quyền sở hữu và ID bài được service kiểm tra trong transaction. Số lượt luyện được tính từ các cặp tin nhắn hoàn tất, không lưu thành một bộ đếm riêng.

Giáo án 100 bài và đáp án nằm ở `backend/app/content/toeic.v1.json`, không seed vào MySQL. Avatar lưu trong `AVATAR_STORAGE_DIR` (mặc định `.artifacts/avatars`), không lưu ảnh vào SQL hoặc dùng `AvatarAssetId`; cần sao lưu thư mục ảnh cùng database. `DanhGiaAI` chỉ lưu lifecycle phản hồi AI; kết quả kiểm tra bài học nằm trong bảng tiến độ, không phải điểm TOEIC hoặc phát âm.

Với database v1 hiện có, API tiếp tục dùng các bảng tài khoản/hội thoại tương thích. Nếu chưa có đủ bảng lộ trình, chạy `.venv\Scripts\python.exe scripts/install_learning.py` từ root với cấu hình backend hiện có. Installer chỉ tạo bảng chưa có bằng `checkfirst=True`, không DROP, sửa hoặc seed dữ liệu cũ và không tự chạy khi khởi động ứng dụng.

Đặt `DATABASE_MYSQL_URL=mysql+pymysql://username:password@host:3306/EngMateAI?charset=utf8mb4` trong `.env` riêng và JWT_SECRET >=32 ký tự. Percent-encode mật khẩu. Driver init `time_zone=+00:00`, READ COMMITTED, pool pre-ping/recycle. Chỉ chọn MySQL hoặc SQL Server, không đồng thời.

Database test phải riêng, tên kết thúc `_test`, chưa có tài khoản. Đổi tên EngMateAI trong SQL trước khi bootstrap test, đặt MYSQL_TEST_URL trong terminal. Bootstrap mới đã có đủ 13 bảng; với schema test v1 cũ thiếu bảng lộ trình, dùng `scripts/install_learning.py --test`. Suite rollback mọi account/conversation tạo thử. Không dùng dữ liệu thật làm fixture. [verify_chat.sql](tests/verify_chat.sql) chỉ đọc trong database được chọn.

Trong Docker dùng host.docker.internal nếu DB nằm trên Windows host, đặt URL đó vào DOCKER_DATABASE_MYSQL_URL riêng. Không tự chuyển sang instance khác chỉ vì thấy cổng mở; xác minh schema/credentials/version trước.
