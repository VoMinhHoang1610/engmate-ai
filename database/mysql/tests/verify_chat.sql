-- Chỉ đọc. Chạy trong database EngMate đang được chọn; không đổi database.
SELECT MAX(Version) = 1 AS SchemaVersionPass FROM PhienBanCauTruc;
SELECT COUNT(*) = 7 AS LevelsPass FROM TrinhDoCEFR;
-- Bản cài mới có đủ 13 bảng; database cũ có thể còn các bảng tương thích khác.
SELECT COUNT(*) = 13 AS RequiredTablesPass
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME IN (
    'TrinhDoCEFR', 'PhienBanCauTruc', 'NguoiDung', 'HoSoNguoiHoc',
    'PhienDangNhap', 'PhienHoc', 'HoiThoai', 'TinNhan', 'DanhGiaAI',
    'engmate_learning_plans', 'engmate_learning_progress',
    'engmate_learning_bindings', 'engmate_learning_receipts'
  );
-- Kết quả phải rỗng: tin nhắn không được thuộc tài khoản khác hội thoại.
SELECT m.MessageId FROM TinNhan m JOIN HoiThoai c ON c.ConversationId=m.ConversationId WHERE m.UserId<>c.UserId;
-- Kết quả phải rỗng: mọi phản hồi hoàn thành có nội dung.
SELECT MessageId FROM TinNhan WHERE Status='completed' AND CHAR_LENGTH(TRIM(Content))=0;
-- Bảng lộ trình do service quản lý ownership; các truy vấn sau phải trả rỗng.
SELECT p.UserId FROM engmate_learning_plans p
LEFT JOIN NguoiDung u ON u.UserId=p.UserId WHERE u.UserId IS NULL;
SELECT p.UserId, p.LessonId FROM engmate_learning_progress p
LEFT JOIN NguoiDung u ON u.UserId=p.UserId
LEFT JOIN HoiThoai c ON c.ConversationId=p.ConversationId AND c.UserId=p.UserId
WHERE u.UserId IS NULL OR (p.ConversationId IS NOT NULL AND c.ConversationId IS NULL);
SELECT b.UserId, b.ConversationId FROM engmate_learning_bindings b
LEFT JOIN HoiThoai c ON c.ConversationId=b.ConversationId AND c.UserId=b.UserId
WHERE c.ConversationId IS NULL;
SELECT r.UserId, r.RequestId FROM engmate_learning_receipts r
LEFT JOIN NguoiDung u ON u.UserId=r.UserId
WHERE u.UserId IS NULL OR JSON_VALID(r.ResultJson)=0;
