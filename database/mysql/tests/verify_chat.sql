-- Chỉ đọc. Chạy trong database hội thoại đang được chọn; không đổi database.
SELECT MAX(Version) = 1 AS SchemaVersionPass FROM PhienBanCauTruc;
SELECT COUNT(*) = 7 AS LevelsPass FROM TrinhDoCEFR;
-- Kết quả phải rỗng: tin nhắn không được thuộc tài khoản khác hội thoại.
SELECT m.MessageId FROM TinNhan m JOIN HoiThoai c ON c.ConversationId=m.ConversationId WHERE m.UserId<>c.UserId;
-- Kết quả phải rỗng: mọi phản hồi hoàn thành có nội dung.
SELECT MessageId FROM TinNhan WHERE Status='completed' AND CHAR_LENGTH(TRIM(Content))=0;
