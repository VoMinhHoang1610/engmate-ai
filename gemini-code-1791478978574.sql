-- EngMateAI - Dành cho MySQL 8.0.16 trở lên, tương thích MySQL 8.4.
-- Mở file trong MySQL Workbench và chạy toàn bộ trên cơ sở dữ liệu chưa có bảng ứng dụng.
-- Chạy bằng dòng lệnh: mysql --default-character-set=utf8mb4 -u root -p < gemini-code-1791478978574.sql
-- Cần quyền tạo cơ sở dữ liệu (CREATE DATABASE), bảng (CREATE TABLE), view (CREATE VIEW) và trigger (TRIGGER).
-- Các bảng thuộc schema em của SQL Server được đưa trực tiếp vào cơ sở dữ liệu EngMateAI: em.Users -> NguoiDung.
-- Lưu thời gian theo UTC: mỗi kết nối từ ứng dụng phải thiết lập time_zone = '+00:00'.
-- Cột Version là số phiên bản của từng bản ghi, tự tăng khi cập nhật nhờ trigger để kiểm soát cập nhật đồng thời.
-- Backend kết nối schema này qua DATABASE_MYSQL_URL (mysql+pymysql) và JWT_SECRET.
-- Frontend đặt VITE_DATA_SOURCE=mysql; ứng dụng không tự chạy lại DDL hoặc nhập localStorage demo.
-- Lưu UUID dưới dạng chuỗi chuẩn gồm 36 ký tự thay cho GUID dạng nhị phân của SQL Server.
-- MySQL tự động COMMIT khi thực hiện các lệnh tạo cấu trúc; không thể ROLLBACK toàn bộ quá trình tạo bảng.
-- Dừng khi gặp lỗi đầu tiên. Không dùng mysql --force và không chạy lại phần tạo cấu trúc khi các bảng đã tồn tại.
-- Có thể chạy lại riêng phần thêm dữ liệu danh mục; chỉ để một tiến trình khởi tạo thực hiện tại một thời điểm.
-- Đã thực thi thử bằng MySQL 8.0.45: 24 bảng, 2 view, 7 mức học,
-- 63 bài học, 35 câu hỏi, 84 lựa chọn và 22 từ gợi ý; không seed tài khoản.
-- UpdatedAt tự cập nhật; OnboardingCompletedAt khác NULL tương ứng daLamQuen=true.
-- SpeechVoiceId lưu ID giọng Blaze đã chọn; không seed danh sách giọng hoặc khóa API.

SET NAMES utf8mb4 COLLATE utf8mb4_0900_as_ci;
SET SESSION time_zone = '+00:00';
CREATE DATABASE IF NOT EXISTS EngMateAI CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;
USE EngMateAI;

-- 1. Tạo bảng, khóa chính, khóa ngoại, ràng buộc và chỉ mục.
-- Danh mục mức học có thứ tự; không so sánh mã CEFR theo thứ tự chữ cái.
CREATE TABLE `TrinhDoCEFR` (
    `Code` varchar(8) COLLATE utf8mb4_0900_as_cs NOT NULL PRIMARY KEY,
    `Name` varchar(100) NOT NULL,
    `Description` varchar(500) NOT NULL,
    `SortOrder` tinyint unsigned NOT NULL,
    CONSTRAINT UQ_TrinhDoCEFR_Order UNIQUE (`SortOrder`),
    CONSTRAINT CK_TrinhDoCEFR_Code CHECK (`Code` IN ('Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    CONSTRAINT CK_TrinhDoCEFR_Order CHECK (`SortOrder` BETWEEN 1 AND 7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;
    CREATE TABLE `PhienBanCauTruc` (
        `Version` int NOT NULL PRIMARY KEY,
        `Description` varchar(200) NOT NULL,
        `AppliedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `NguoiDung` (
        `UserId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `PublicId` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()),
        `Username` varchar(64) COLLATE utf8mb4_0900_as_ci NOT NULL,
        `Email` varchar(254) COLLATE utf8mb4_0900_as_ci NOT NULL,
        `PasswordHash` varchar(512) NULL,
        `Status` varchar(16) NOT NULL DEFAULT 'active',
        `EmailVerifiedAt` datetime(3) NULL,
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `UpdatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        `Version` bigint unsigned NOT NULL DEFAULT 1,
        CONSTRAINT UQ_NguoiDung_PublicId UNIQUE (`PublicId`),
        CONSTRAINT UQ_NguoiDung_Username UNIQUE (`Username`),
        CONSTRAINT UQ_NguoiDung_Email UNIQUE (`Email`),
        CONSTRAINT CK_NguoiDung_Identity CHECK (CHAR_LENGTH(LTRIM(RTRIM(`Username`))) > 0 AND CHAR_LENGTH(LTRIM(RTRIM(`Email`))) > 0),
        CONSTRAINT CK_NguoiDung_Status CHECK (`Status` IN ('active', 'disabled', 'pending')),
        CONSTRAINT CK_NguoiDung_Hash CHECK (`PasswordHash` IS NULL OR CHAR_LENGTH(`PasswordHash`) > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `TaiNguyenMedia` (
        `MediaAssetId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `UserId` bigint NOT NULL,
        `Purpose` varchar(16) NOT NULL,
        `StorageKey` varchar(450) NOT NULL,
        `ContentType` varchar(100) NOT NULL,
        `SizeBytes` bigint NOT NULL,
        `DurationMs` int NULL,
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT FK_TaiNguyenMedia_User FOREIGN KEY (`UserId`) REFERENCES `NguoiDung`(`UserId`),
        CONSTRAINT UQ_TaiNguyenMedia_OwnerPurpose UNIQUE (`MediaAssetId`, `UserId`, `Purpose`),
        CONSTRAINT UQ_TaiNguyenMedia_Storage UNIQUE (`StorageKey`),
        CONSTRAINT CK_TaiNguyenMedia_Purpose CHECK (`Purpose` IN ('avatar', 'recording')),
        CONSTRAINT CK_TaiNguyenMedia_Size CHECK (`SizeBytes` > 0 AND (`DurationMs` IS NULL OR `DurationMs` >= 0)),
        CONSTRAINT CK_TaiNguyenMedia_Key CHECK (CHAR_LENGTH(LTRIM(RTRIM(`StorageKey`))) > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `HoSoNguoiHoc` (
        `UserId` bigint NOT NULL PRIMARY KEY,
        `DisplayName` varchar(60) NOT NULL,
        `PhoneNumber` varchar(32) NULL,
        `BirthDate` date NULL,
        `Gender` varchar(10) NULL,
        `AvatarAssetId` bigint NULL,
        `AvatarPurpose` varchar(16) NOT NULL DEFAULT 'avatar',
        `CefrLevel` varchar(8) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'A2',
        `OnboardingCompletedAt` datetime(3) NULL,
        `LearningGoal` varchar(200) NOT NULL DEFAULT 'Giao tiếp tự tin',
        `DailyGoalMinutes` smallint NOT NULL DEFAULT 20,
        `TimeZoneId` varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        `UpdatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        `Version` bigint unsigned NOT NULL DEFAULT 1,
        CONSTRAINT FK_HoSoNguoiHoc_Level FOREIGN KEY (`CefrLevel`) REFERENCES `TrinhDoCEFR`(`Code`),
        CONSTRAINT FK_HoSoNguoiHoc_User FOREIGN KEY (`UserId`) REFERENCES `NguoiDung`(`UserId`),
        CONSTRAINT FK_HoSoNguoiHoc_Avatar FOREIGN KEY (`AvatarAssetId`, `UserId`, `AvatarPurpose`) REFERENCES `TaiNguyenMedia`(`MediaAssetId`, `UserId`, `Purpose`),
        CONSTRAINT CK_HoSoNguoiHoc_Name CHECK (CHAR_LENGTH(LTRIM(RTRIM(`DisplayName`))) > 0),
        CONSTRAINT CK_HoSoNguoiHoc_Avatar CHECK (`AvatarPurpose` = 'avatar'),
        CONSTRAINT CK_HoSoNguoiHoc_Level CHECK (`CefrLevel` IN ('Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
        CONSTRAINT CK_HoSoNguoiHoc_Gender CHECK (`Gender` IS NULL OR `Gender` IN ('male', 'female', 'other')),
        CONSTRAINT CK_HoSoNguoiHoc_Goal CHECK (`DailyGoalMinutes` BETWEEN 10 AND 60)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `CaiDatNguoiDung` (
        `UserId` bigint NOT NULL PRIMARY KEY,
        `Theme` varchar(10) NOT NULL DEFAULT 'light',
        `ReducedMotion` boolean NOT NULL DEFAULT 0 CHECK (`ReducedMotion` IS NULL OR `ReducedMotion` IN (0, 1)),
        `SpeechRate` decimal(3,2) NOT NULL DEFAULT 1.00,
        `SpeechVoiceId` varchar(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'UK-Nu-1-TM',
        `UpdatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        `Version` bigint unsigned NOT NULL DEFAULT 1,
        CONSTRAINT FK_CaiDatNguoiDung_User FOREIGN KEY (`UserId`) REFERENCES `NguoiDung`(`UserId`),
        CONSTRAINT CK_CaiDatNguoiDung_Voice CHECK (`SpeechVoiceId` REGEXP '^[A-Za-z0-9_-]+$'),
        CONSTRAINT CK_CaiDatNguoiDung_Theme CHECK (`Theme` IN ('light', 'dark', 'system')),
        CONSTRAINT CK_CaiDatNguoiDung_Rate CHECK (`SpeechRate` IN (0.75, 1.00, 1.25))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `DanhTinhOAuth` (
        `OAuthIdentityId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `UserId` bigint NOT NULL,
        `Provider` varchar(16) NOT NULL,
        `ProviderSubject` varchar(255) COLLATE utf8mb4_bin NOT NULL,
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT FK_DanhTinhOAuth_User FOREIGN KEY (`UserId`) REFERENCES `NguoiDung`(`UserId`),
        CONSTRAINT UQ_DanhTinhOAuth_Subject UNIQUE (`Provider`, `ProviderSubject`),
        CONSTRAINT UQ_DanhTinhOAuth_UserProvider UNIQUE (`UserId`, `Provider`),
        CONSTRAINT CK_DanhTinhOAuth_Provider CHECK (`Provider` IN ('google', 'facebook', 'github')),
        CONSTRAINT CK_DanhTinhOAuth_Subject CHECK (CHAR_LENGTH(LTRIM(RTRIM(`ProviderSubject`))) > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `PhienDangNhap` (
        `AuthSessionId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `UserId` bigint NOT NULL,
        `RefreshTokenHash` binary(32) NOT NULL,
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `ExpiresAt` datetime(3) NOT NULL,
        `RevokedAt` datetime(3) NULL,
        CONSTRAINT FK_PhienDangNhap_User FOREIGN KEY (`UserId`) REFERENCES `NguoiDung`(`UserId`),
        CONSTRAINT UQ_PhienDangNhap_Hash UNIQUE (`RefreshTokenHash`),
        CONSTRAINT CK_PhienDangNhap_Time CHECK (`ExpiresAt` > `CreatedAt` AND (`RevokedAt` IS NULL OR `RevokedAt` >= `CreatedAt`))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `TokenTaiKhoan` (
        `AccountTokenId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `UserId` bigint NOT NULL,
        `Purpose` varchar(20) NOT NULL,
        `TokenHash` binary(32) NOT NULL,
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `ExpiresAt` datetime(3) NOT NULL,
        `UsedAt` datetime(3) NULL,
        CONSTRAINT FK_TokenTaiKhoan_User FOREIGN KEY (`UserId`) REFERENCES `NguoiDung`(`UserId`),
        CONSTRAINT UQ_TokenTaiKhoan_Hash UNIQUE (`TokenHash`),
        CONSTRAINT CK_TokenTaiKhoan_Purpose CHECK (`Purpose` IN ('verify_email', 'reset_password')),
        CONSTRAINT CK_TokenTaiKhoan_Time CHECK (`ExpiresAt` > `CreatedAt` AND (`UsedAt` IS NULL OR `UsedAt` >= `CreatedAt`))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `ChuDe` (
        `TopicId` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `Code` varchar(40) NOT NULL,
        `Name` varchar(100) NOT NULL,
        `Description` varchar(500) NOT NULL,
        `AIRole` varchar(100) NOT NULL,
        `OpeningMessage` varchar(2000) NOT NULL,
        `MinLevel` varchar(8) COLLATE utf8mb4_0900_as_cs NOT NULL,
        `MaxLevel` varchar(8) COLLATE utf8mb4_0900_as_cs NOT NULL,
        `ColorKey` varchar(24) NOT NULL,
        `IconKey` varchar(32) NOT NULL,
        `SortOrder` smallint NOT NULL DEFAULT 0,
        `IsActive` boolean NOT NULL DEFAULT 1 CHECK (`IsActive` IS NULL OR `IsActive` IN (0, 1)),
        CONSTRAINT FK_ChuDe_MinLevel FOREIGN KEY (`MinLevel`) REFERENCES `TrinhDoCEFR`(`Code`),
        CONSTRAINT FK_ChuDe_MaxLevel FOREIGN KEY (`MaxLevel`) REFERENCES `TrinhDoCEFR`(`Code`),
        CONSTRAINT UQ_ChuDe_Code UNIQUE (`Code`),
        CONSTRAINT CK_ChuDe_Levels CHECK (
            `MinLevel` IN ('Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2') AND `MaxLevel` IN ('Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')
            AND CASE `MinLevel` WHEN 'Pre-A1' THEN 1 WHEN 'A1' THEN 2 WHEN 'A2' THEN 3 WHEN 'B1' THEN 4 WHEN 'B2' THEN 5 WHEN 'C1' THEN 6 ELSE 7 END <= CASE `MaxLevel` WHEN 'Pre-A1' THEN 1 WHEN 'A1' THEN 2 WHEN 'A2' THEN 3 WHEN 'B1' THEN 4 WHEN 'B2' THEN 5 WHEN 'C1' THEN 6 ELSE 7 END)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    -- Không sửa phiên bản bài học đã xuất bản trong tầng dịch vụ; khi có nội dung mới, tạo phiên bản mới.
    CREATE TABLE `BaiHoc` (
        `LessonId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `Code` varchar(64) NOT NULL,
        `Revision` smallint NOT NULL DEFAULT 1,
        `TopicId` int NULL,
        `Skill` varchar(16) NOT NULL,
        `Format` varchar(16) NOT NULL,
        `Title` varchar(200) NOT NULL,
        `Instruction` varchar(2000) NOT NULL,
        `CategoryLabel` varchar(100) NULL,
        `Content` LONGTEXT NULL,
        `AudioUrl` varchar(2048) NULL,
        `MinLevel` varchar(8) COLLATE utf8mb4_0900_as_cs NOT NULL,
        `MaxLevel` varchar(8) COLLATE utf8mb4_0900_as_cs NOT NULL,
        `EstimatedMinutes` smallint NOT NULL,
        `IsPublished` boolean NOT NULL DEFAULT 0 CHECK (`IsPublished` IS NULL OR `IsPublished` IN (0, 1)),
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT FK_BaiHoc_MinLevel FOREIGN KEY (`MinLevel`) REFERENCES `TrinhDoCEFR`(`Code`),
        CONSTRAINT FK_BaiHoc_MaxLevel FOREIGN KEY (`MaxLevel`) REFERENCES `TrinhDoCEFR`(`Code`),
        CONSTRAINT FK_BaiHoc_Topic FOREIGN KEY (`TopicId`) REFERENCES `ChuDe`(`TopicId`),
        CONSTRAINT UQ_BaiHoc_Revision UNIQUE (`Code`, `Revision`),
        CONSTRAINT UQ_BaiHoc_Skill UNIQUE (`LessonId`, `Skill`),
        CONSTRAINT CK_BaiHoc_Revision CHECK (`Revision` > 0 AND `EstimatedMinutes` > 0),
        CONSTRAINT CK_BaiHoc_Format CHECK (
            (`Skill` = 'speaking' AND `Format` = 'shadowing') OR
            (`Skill` = 'listening' AND `Format` = 'mixed') OR
            (`Skill` = 'reading' AND `Format` = 'multiple_choice') OR
            (`Skill` = 'writing' AND `Format` IN ('sentence', 'paragraph', 'email', 'essay'))),
        CONSTRAINT CK_BaiHoc_Levels CHECK (
            `MinLevel` IN ('Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2') AND `MaxLevel` IN ('Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')
            AND CASE `MinLevel` WHEN 'Pre-A1' THEN 1 WHEN 'A1' THEN 2 WHEN 'A2' THEN 3 WHEN 'B1' THEN 4 WHEN 'B2' THEN 5 WHEN 'C1' THEN 6 ELSE 7 END <= CASE `MaxLevel` WHEN 'Pre-A1' THEN 1 WHEN 'A1' THEN 2 WHEN 'A2' THEN 3 WHEN 'B1' THEN 4 WHEN 'B2' THEN 5 WHEN 'C1' THEN 6 ELSE 7 END)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    -- Từ gợi ý của bài học; chỉ sao chép vào sổ cá nhân khi người học chọn lưu.
    CREATE TABLE `TuVungBaiHoc` (
        `LessonId` bigint NOT NULL,
        `Position` smallint unsigned NOT NULL,
        `Word` varchar(120) NOT NULL,
        `Meaning` varchar(1000) NOT NULL,
        `Phonetic` varchar(200) NULL,
        `PartOfSpeech` varchar(50) NULL,
        `ExampleSentence` varchar(2000) NULL,
        PRIMARY KEY (`LessonId`, `Position`),
        CONSTRAINT FK_TuVungBaiHoc_Lesson FOREIGN KEY (`LessonId`) REFERENCES `BaiHoc`(`LessonId`),
        CONSTRAINT CK_TuVungBaiHoc_Text CHECK (`Position` > 0 AND CHAR_LENGTH(TRIM(`Word`)) > 0 AND CHAR_LENGTH(TRIM(`Meaning`)) > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `CauHoiBaiHoc` (
        `QuestionId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `LessonId` bigint NOT NULL,
        `Skill` varchar(16) NOT NULL DEFAULT 'listening',
        `Position` smallint NOT NULL,
        `QuestionType` varchar(16) NOT NULL,
        `Prompt` varchar(2000) NOT NULL,
        `ExpectedText` varchar(2000) NULL,
        `Explanation` varchar(2000) NULL,
        `Points` decimal(6,2) NOT NULL DEFAULT 1,
        CONSTRAINT FK_CauHoiBaiHoc_Lesson FOREIGN KEY (`LessonId`, `Skill`) REFERENCES `BaiHoc`(`LessonId`, `Skill`),
        CONSTRAINT UQ_CauHoiBaiHoc_Position UNIQUE (`LessonId`, `Position`),
        CONSTRAINT UQ_CauHoiBaiHoc_Lesson UNIQUE (`QuestionId`, `LessonId`),
        CONSTRAINT UQ_CauHoiBaiHoc_Type UNIQUE (`QuestionId`, `QuestionType`),
        CONSTRAINT CK_CauHoiBaiHoc_Position CHECK (`Position` > 0 AND `Points` > 0),
        CONSTRAINT CK_CauHoiBaiHoc_Skill CHECK (
            (`Skill` = 'listening' AND `QuestionType` IN ('multiple_choice', 'dictation')) OR
            (`Skill` = 'reading' AND `QuestionType` = 'multiple_choice')),
        CONSTRAINT CK_CauHoiBaiHoc_Type CHECK (
            (`QuestionType` = 'multiple_choice' AND `ExpectedText` IS NULL) OR
            (`QuestionType` = 'dictation' AND `ExpectedText` IS NOT NULL AND CHAR_LENGTH(LTRIM(RTRIM(`ExpectedText`))) > 0))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `LuaChonCauHoi` (
        `OptionId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `QuestionId` bigint NOT NULL,
        `QuestionType` varchar(16) NOT NULL DEFAULT 'multiple_choice',
        `Position` tinyint unsigned NOT NULL,
        `Text` varchar(1000) NOT NULL,
        `IsCorrect` boolean NOT NULL DEFAULT 0 CHECK (`IsCorrect` IS NULL OR `IsCorrect` IN (0, 1)),
        `CorrectQuestionId` bigint GENERATED ALWAYS AS (CASE WHEN `IsCorrect` = 1 THEN `QuestionId` ELSE NULL END) STORED,
        UNIQUE KEY UX_LuaChonCauHoi_OneCorrect (`CorrectQuestionId`),
        CONSTRAINT FK_LuaChonCauHoi_Question FOREIGN KEY (`QuestionId`, `QuestionType`) REFERENCES `CauHoiBaiHoc`(`QuestionId`, `QuestionType`),
        CONSTRAINT UQ_LuaChonCauHoi_Position UNIQUE (`QuestionId`, `Position`),
        CONSTRAINT UQ_LuaChonCauHoi_Question UNIQUE (`OptionId`, `QuestionId`),
        CONSTRAINT CK_LuaChonCauHoi_Type CHECK (`QuestionType` = 'multiple_choice' AND `Position` > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    -- Thời gian học được ghi nhận từ phiên học; không cộng thêm thời gian từ lượt gọi AI hoặc thao tác nhấn nút.
    CREATE TABLE `PhienHoc` (
        `StudySessionId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `UserId` bigint NOT NULL,
        `ClientRequestId` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `ActivityType` varchar(16) NOT NULL,
        `Status` varchar(16) NOT NULL DEFAULT 'in_progress',
        `StartedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `EndedAt` datetime(3) NULL,
        `DurationSeconds` int NOT NULL DEFAULT 0,
        `DurationSource` varchar(16) NOT NULL DEFAULT 'measured',
        `LocalStudyDate` date NOT NULL,
        `UtcOffsetMinutes` smallint NOT NULL,
        `DailyGoalMinutes` smallint NOT NULL,
        `Version` bigint unsigned NOT NULL DEFAULT 1,
        CONSTRAINT FK_PhienHoc_User FOREIGN KEY (`UserId`) REFERENCES `NguoiDung`(`UserId`),
        CONSTRAINT UQ_PhienHoc_Request UNIQUE (`UserId`, `ClientRequestId`),
        CONSTRAINT UQ_PhienHoc_OwnerType UNIQUE (`StudySessionId`, `UserId`, `ActivityType`),
        CONSTRAINT CK_PhienHoc_Type CHECK (`ActivityType` IN ('conversation', 'speaking', 'listening', 'reading', 'writing', 'flashcard', 'legacy_import')),
        CONSTRAINT CK_PhienHoc_Status CHECK (`Status` IN ('in_progress', 'completed', 'abandoned')),
        CONSTRAINT CK_PhienHoc_Time CHECK (
            `DurationSeconds` >= 0 AND `UtcOffsetMinutes` BETWEEN -840 AND 840 AND `DailyGoalMinutes` BETWEEN 10 AND 60
            AND ((`Status` = 'in_progress' AND `EndedAt` IS NULL AND `DurationSeconds` = 0) OR
                 (`Status` IN ('completed', 'abandoned') AND `EndedAt` IS NOT NULL AND `EndedAt` >= `StartedAt`))
            AND (`Status` <> 'abandoned' OR `DurationSeconds` = 0)),
        CONSTRAINT CK_PhienHoc_Source CHECK (`DurationSource` IN ('measured', 'demo_estimate', 'legacy_import'))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `HoiThoai` (
        `ConversationId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `StudySessionId` bigint NOT NULL,
        `UserId` bigint NOT NULL,
        `ActivityType` varchar(16) NOT NULL DEFAULT 'conversation',
        `TopicId` int NULL,
        `Mode` varchar(16) NOT NULL DEFAULT 'roleplay',
        `Title` varchar(200) NOT NULL,
        `CefrLevel` varchar(8) COLLATE utf8mb4_0900_as_cs NOT NULL,
        `AIRoleSnapshot` varchar(100) NOT NULL,
        `PromptVersion` varchar(64) NOT NULL,
        `Summary` LONGTEXT NULL,
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `Version` bigint unsigned NOT NULL DEFAULT 1,
        CONSTRAINT FK_HoiThoai_Level FOREIGN KEY (`CefrLevel`) REFERENCES `TrinhDoCEFR`(`Code`),
        CONSTRAINT FK_HoiThoai_Session FOREIGN KEY (`StudySessionId`, `UserId`, `ActivityType`) REFERENCES `PhienHoc`(`StudySessionId`, `UserId`, `ActivityType`),
        CONSTRAINT FK_HoiThoai_Topic FOREIGN KEY (`TopicId`) REFERENCES `ChuDe`(`TopicId`),
        CONSTRAINT UQ_HoiThoai_Session UNIQUE (`StudySessionId`),
        CONSTRAINT UQ_HoiThoai_Owner UNIQUE (`ConversationId`, `UserId`),
        CONSTRAINT CK_HoiThoai_Type CHECK (`ActivityType` = 'conversation'),
        CONSTRAINT CK_HoiThoai_Mode CHECK (`Mode` IN ('free_chat', 'roleplay')),
        CONSTRAINT CK_HoiThoai_Level CHECK (`CefrLevel` IN ('Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `TinNhan` (
        `MessageId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `ConversationId` bigint NOT NULL,
        `UserId` bigint NOT NULL,
        `ClientRequestId` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `SequenceNumber` int NOT NULL,
        `Role` varchar(16) NOT NULL,
        `Content` LONGTEXT NOT NULL,
        `Status` varchar(16) NOT NULL DEFAULT 'completed',
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT FK_TinNhan_Conversation FOREIGN KEY (`ConversationId`, `UserId`) REFERENCES `HoiThoai`(`ConversationId`, `UserId`),
        CONSTRAINT UQ_TinNhan_Sequence UNIQUE (`ConversationId`, `SequenceNumber`),
        CONSTRAINT UQ_TinNhan_Request UNIQUE (`ConversationId`, `ClientRequestId`),
        CONSTRAINT UQ_TinNhan_Owner UNIQUE (`MessageId`, `UserId`),
        CONSTRAINT CK_TinNhan_Role CHECK (`Role` IN ('user', 'assistant', 'system')),
        CONSTRAINT CK_TinNhan_Sequence CHECK (`SequenceNumber` >= 0),
        CONSTRAINT CK_TinNhan_Status CHECK (`Status` IN ('pending', 'completed', 'failed', 'cancelled')),
        CONSTRAINT CK_TinNhan_Content CHECK (`Status` <> 'completed' OR CHAR_LENGTH(LTRIM(RTRIM(`Content`))) > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `LuotThucHanh` (
        `AttemptId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `StudySessionId` bigint NOT NULL,
        `UserId` bigint NOT NULL,
        `LessonId` bigint NOT NULL,
        `Skill` varchar(16) NOT NULL,
        `Mode` varchar(16) NOT NULL,
        `SubmittedText` LONGTEXT NULL,
        `RecordingAssetId` bigint NULL,
        `RecordingPurpose` varchar(16) NOT NULL DEFAULT 'recording',
        `PlaybackRate` decimal(3,2) NULL,
        `ScorePercent` decimal(5,2) NULL,
        `SubmittedAt` datetime(3) NULL,
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `Version` bigint unsigned NOT NULL DEFAULT 1,
        CONSTRAINT FK_LuotThucHanh_Session FOREIGN KEY (`StudySessionId`, `UserId`, `Skill`) REFERENCES `PhienHoc`(`StudySessionId`, `UserId`, `ActivityType`),
        CONSTRAINT FK_LuotThucHanh_Lesson FOREIGN KEY (`LessonId`, `Skill`) REFERENCES `BaiHoc`(`LessonId`, `Skill`),
        CONSTRAINT FK_LuotThucHanh_Recording FOREIGN KEY (`RecordingAssetId`, `UserId`, `RecordingPurpose`) REFERENCES `TaiNguyenMedia`(`MediaAssetId`, `UserId`, `Purpose`),
        CONSTRAINT UQ_LuotThucHanh_Session UNIQUE (`StudySessionId`),
        CONSTRAINT UQ_LuotThucHanh_Owner UNIQUE (`AttemptId`, `UserId`),
        CONSTRAINT UQ_LuotThucHanh_Lesson UNIQUE (`AttemptId`, `LessonId`),
        CONSTRAINT UQ_LuotThucHanh_Mode UNIQUE (`AttemptId`, `Mode`),
        CONSTRAINT CK_LuotThucHanh_Mode CHECK (
            (`Skill` = 'speaking' AND `Mode` = 'shadowing') OR
            (`Skill` = 'listening' AND `Mode` IN ('multiple_choice', 'dictation')) OR
            (`Skill` = 'reading' AND `Mode` = 'multiple_choice') OR
            (`Skill` = 'writing' AND `Mode` = 'writing')),
        CONSTRAINT CK_LuotThucHanh_Recording CHECK (`RecordingPurpose` = 'recording' AND (`RecordingAssetId` IS NULL OR `Skill` = 'speaking')),
        CONSTRAINT CK_LuotThucHanh_Values CHECK ((`ScorePercent` IS NULL OR `ScorePercent` BETWEEN 0 AND 100) AND (`PlaybackRate` IS NULL OR `PlaybackRate` BETWEEN 0.50 AND 2.00)),
        CONSTRAINT CK_LuotThucHanh_Submitted CHECK (`SubmittedAt` IS NULL OR `SubmittedAt` >= `CreatedAt`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `CauTraLoiThucHanh` (
        `AttemptId` bigint NOT NULL,
        `QuestionId` bigint NOT NULL,
        `LessonId` bigint NOT NULL,
        `QuestionType` varchar(16) NOT NULL,
        `SelectedOptionId` bigint NULL,
        `AnswerText` varchar(2000) NULL,
        `IsCorrect` boolean NULL CHECK (`IsCorrect` IS NULL OR `IsCorrect` IN (0, 1)),
        `AwardedPoints` decimal(6,2) NULL,
        PRIMARY KEY (`AttemptId`, `QuestionId`),
        CONSTRAINT FK_CauTraLoiThucHanh_Attempt FOREIGN KEY (`AttemptId`, `LessonId`) REFERENCES `LuotThucHanh`(`AttemptId`, `LessonId`),
        CONSTRAINT FK_CauTraLoiThucHanh_Question FOREIGN KEY (`QuestionId`, `LessonId`) REFERENCES `CauHoiBaiHoc`(`QuestionId`, `LessonId`),
        CONSTRAINT FK_CauTraLoiThucHanh_Type FOREIGN KEY (`QuestionId`, `QuestionType`) REFERENCES `CauHoiBaiHoc`(`QuestionId`, `QuestionType`),
        CONSTRAINT FK_CauTraLoiThucHanh_Mode FOREIGN KEY (`AttemptId`, `QuestionType`) REFERENCES `LuotThucHanh`(`AttemptId`, `Mode`),
        CONSTRAINT FK_CauTraLoiThucHanh_Option FOREIGN KEY (`SelectedOptionId`, `QuestionId`) REFERENCES `LuaChonCauHoi`(`OptionId`, `QuestionId`),
        CONSTRAINT CK_CauTraLoiThucHanh_Value CHECK (
            (`QuestionType` = 'multiple_choice' AND `SelectedOptionId` IS NOT NULL AND `AnswerText` IS NULL) OR
            (`QuestionType` = 'dictation' AND `SelectedOptionId` IS NULL AND `AnswerText` IS NOT NULL AND CHAR_LENGTH(LTRIM(RTRIM(`AnswerText`))) > 0)),
        CONSTRAINT CK_CauTraLoiThucHanh_Points CHECK (`AwardedPoints` IS NULL OR `AwardedPoints` >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `DanhGiaAI` (
        `EvaluationId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `UserId` bigint NOT NULL,
        `MessageId` bigint NULL,
        `AttemptId` bigint NULL,
        `ClientRequestId` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `Provider` varchar(64) NOT NULL,
        `ModelName` varchar(100) NULL,
        `PromptVersion` varchar(64) NOT NULL,
        `IsMock` boolean NOT NULL DEFAULT 1 CHECK (`IsMock` IS NULL OR `IsMock` IN (0, 1)),
        `Status` varchar(16) NOT NULL DEFAULT 'pending',
        `Feedback` LONGTEXT NULL,
        `ResultJson` LONGTEXT NULL,
        `OverallScore` decimal(5,2) NULL,
        `InputTokens` int NULL,
        `OutputTokens` int NULL,
        `LatencyMs` int NULL,
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `CompletedAt` datetime(3) NULL,
        CONSTRAINT FK_DanhGiaAI_User FOREIGN KEY (`UserId`) REFERENCES `NguoiDung`(`UserId`),
        CONSTRAINT FK_DanhGiaAI_Message FOREIGN KEY (`MessageId`, `UserId`) REFERENCES `TinNhan`(`MessageId`, `UserId`),
        CONSTRAINT FK_DanhGiaAI_Attempt FOREIGN KEY (`AttemptId`, `UserId`) REFERENCES `LuotThucHanh`(`AttemptId`, `UserId`),
        CONSTRAINT UQ_DanhGiaAI_Request UNIQUE (`UserId`, `ClientRequestId`),
        CONSTRAINT CK_DanhGiaAI_Target CHECK ((`MessageId` IS NOT NULL AND `AttemptId` IS NULL) OR (`MessageId` IS NULL AND `AttemptId` IS NOT NULL)),
        CONSTRAINT CK_DanhGiaAI_Status CHECK (`Status` IN ('pending', 'completed', 'failed', 'cancelled')),
        CONSTRAINT CK_DanhGiaAI_Result CHECK (`ResultJson` IS NULL OR JSON_VALID(`ResultJson`) = 1),
        CONSTRAINT CK_DanhGiaAI_Metrics CHECK (
            (`OverallScore` IS NULL OR `OverallScore` BETWEEN 0 AND 100) AND
            (`InputTokens` IS NULL OR `InputTokens` >= 0) AND (`OutputTokens` IS NULL OR `OutputTokens` >= 0) AND (`LatencyMs` IS NULL OR `LatencyMs` >= 0)),
        CONSTRAINT CK_DanhGiaAI_Time CHECK (
            (`Status` = 'pending' AND `CompletedAt` IS NULL) OR
            (`Status` IN ('completed', 'failed', 'cancelled') AND `CompletedAt` IS NOT NULL AND `CompletedAt` >= `CreatedAt`)),
        CONSTRAINT CK_DanhGiaAI_Mock CHECK ((`Provider` = 'mock' AND `IsMock` = 1) OR `Provider` <> 'mock')
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `BanGhiLoi` (
        `ErrorRecordId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `EvaluationId` bigint NOT NULL,
        `Category` varchar(20) NOT NULL,
        `OriginalText` varchar(2000) NOT NULL,
        `CorrectedText` varchar(2000) NOT NULL,
        `Explanation` varchar(2000) NOT NULL,
        `StartOffset` int NULL,
        `EndOffset` int NULL,
        CONSTRAINT FK_BanGhiLoi_Evaluation FOREIGN KEY (`EvaluationId`) REFERENCES `DanhGiaAI`(`EvaluationId`),
        CONSTRAINT CK_BanGhiLoi_Category CHECK (`Category` IN ('grammar', 'vocabulary', 'spelling', 'pronunciation', 'fluency', 'structure')),
        CONSTRAINT CK_BanGhiLoi_Offsets CHECK (
            (`StartOffset` IS NULL AND `EndOffset` IS NULL) OR
            (`StartOffset` IS NOT NULL AND `EndOffset` IS NOT NULL AND `StartOffset` >= 0 AND `EndOffset` > `StartOffset`))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    -- Sổ từ vựng cá nhân lưu nghĩa và ví dụ của người học; mỗi người có dữ liệu riêng.
    CREATE TABLE `TuVungNguoiDung` (
        `UserVocabularyId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `UserId` bigint NOT NULL,
        `Word` varchar(120) COLLATE utf8mb4_0900_as_ci NOT NULL,
        `ActiveWord` varchar(120) COLLATE utf8mb4_0900_as_ci GENERATED ALWAYS AS (CASE WHEN `ArchivedAt` IS NULL THEN `Word` ELSE NULL END) STORED,
        UNIQUE KEY UX_TuVungNguoiDung_ActiveWord (`UserId`, `ActiveWord`),
        `Meaning` varchar(1000) NOT NULL,
        `Phonetic` varchar(200) NULL,
        `PartOfSpeech` varchar(50) NULL,
        `ExampleSentence` varchar(2000) NULL,
        `SourceMessageId` bigint NULL,
        `SourceAttemptId` bigint NULL,
        `IsMastered` boolean NOT NULL DEFAULT 0 CHECK (`IsMastered` IS NULL OR `IsMastered` IN (0, 1)),
        `NextReviewAt` datetime(3) NULL,
        `LastReviewedAt` datetime(3) NULL,
        `ReviewCount` int NOT NULL DEFAULT 0,
        `CreatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `UpdatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        `ArchivedAt` datetime(3) NULL,
        `Version` bigint unsigned NOT NULL DEFAULT 1,
        CONSTRAINT FK_TuVungNguoiDung_User FOREIGN KEY (`UserId`) REFERENCES `NguoiDung`(`UserId`),
        CONSTRAINT FK_TuVungNguoiDung_Message FOREIGN KEY (`SourceMessageId`, `UserId`) REFERENCES `TinNhan`(`MessageId`, `UserId`),
        CONSTRAINT FK_TuVungNguoiDung_Attempt FOREIGN KEY (`SourceAttemptId`, `UserId`) REFERENCES `LuotThucHanh`(`AttemptId`, `UserId`),
        CONSTRAINT UQ_TuVungNguoiDung_Owner UNIQUE (`UserVocabularyId`, `UserId`),
        CONSTRAINT CK_TuVungNguoiDung_Text CHECK (CHAR_LENGTH(LTRIM(RTRIM(`Word`))) > 0 AND CHAR_LENGTH(LTRIM(RTRIM(`Meaning`))) > 0),
        CONSTRAINT CK_TuVungNguoiDung_Count CHECK (`ReviewCount` >= 0),
        CONSTRAINT CK_TuVungNguoiDung_Source CHECK (`SourceMessageId` IS NULL OR `SourceAttemptId` IS NULL)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `PhienFlashcard` (
        `FlashcardSessionId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `StudySessionId` bigint NOT NULL,
        `UserId` bigint NOT NULL,
        `ActivityType` varchar(16) NOT NULL DEFAULT 'flashcard',
        `ReviewAll` boolean NOT NULL DEFAULT 0 CHECK (`ReviewAll` IS NULL OR `ReviewAll` IN (0, 1)),
        `SchedulerVersion` varchar(32) NOT NULL DEFAULT 'demo-0-1-4-7-v1',
        CONSTRAINT FK_PhienFlashcard_Study FOREIGN KEY (`StudySessionId`, `UserId`, `ActivityType`) REFERENCES `PhienHoc`(`StudySessionId`, `UserId`, `ActivityType`),
        CONSTRAINT UQ_PhienFlashcard_Study UNIQUE (`StudySessionId`),
        CONSTRAINT UQ_PhienFlashcard_Owner UNIQUE (`FlashcardSessionId`, `UserId`),
        CONSTRAINT CK_PhienFlashcard_Type CHECK (`ActivityType` = 'flashcard')
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE TABLE `OnTapFlashcard` (
        `FlashcardReviewId` bigint AUTO_INCREMENT NOT NULL PRIMARY KEY,
        `FlashcardSessionId` bigint NOT NULL,
        `UserVocabularyId` bigint NOT NULL,
        `UserId` bigint NOT NULL,
        `ClientRequestId` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `Rating` varchar(8) NOT NULL,
        `IntervalDays` int NOT NULL,
        `ReviewedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `LocalReviewDate` date NOT NULL,
        `UtcOffsetMinutes` smallint NOT NULL,
        `NextReviewAt` datetime(3) NOT NULL,
        CONSTRAINT FK_OnTapFlashcard_Session FOREIGN KEY (`FlashcardSessionId`, `UserId`) REFERENCES `PhienFlashcard`(`FlashcardSessionId`, `UserId`),
        CONSTRAINT FK_OnTapFlashcard_Word FOREIGN KEY (`UserVocabularyId`, `UserId`) REFERENCES `TuVungNguoiDung`(`UserVocabularyId`, `UserId`),
        CONSTRAINT UQ_OnTapFlashcard_Request UNIQUE (`UserId`, `ClientRequestId`),
        CONSTRAINT CK_OnTapFlashcard_Rating CHECK (`Rating` IN ('again', 'hard', 'good', 'easy')),
        CONSTRAINT CK_OnTapFlashcard_Time CHECK (`IntervalDays` >= 0 AND `NextReviewAt` >= `ReviewedAt` AND `UtcOffsetMinutes` BETWEEN -840 AND 840)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

    CREATE INDEX IX_TaiNguyenMedia_User ON `TaiNguyenMedia`(`UserId`, `Purpose`);
    CREATE INDEX IX_PhienDangNhap_User ON `PhienDangNhap`(`UserId`, `ExpiresAt`, `RevokedAt`);
    CREATE INDEX IX_TokenTaiKhoan_User ON `TokenTaiKhoan`(`UserId`, `Purpose`, `ExpiresAt`, `UsedAt`);
    CREATE INDEX IX_BaiHoc_Browse ON `BaiHoc`(`Skill`, `IsPublished`, `TopicId`, `Title`, `MinLevel`, `MaxLevel`);
    CREATE INDEX IX_PhienHoc_Daily ON `PhienHoc`(`UserId`, `LocalStudyDate`, `Status`, `DurationSeconds`, `ActivityType`, `DailyGoalMinutes`);
    CREATE INDEX IX_HoiThoai_User ON `HoiThoai`(`UserId`, `CreatedAt` DESC);
    CREATE INDEX IX_LuotThucHanh_User ON `LuotThucHanh`(`UserId`, `CreatedAt` DESC, `Skill`, `ScorePercent`);
    CREATE INDEX IX_DanhGiaAI_Message ON `DanhGiaAI`(`MessageId`, `CreatedAt` DESC);
    CREATE INDEX IX_DanhGiaAI_Attempt ON `DanhGiaAI`(`AttemptId`, `CreatedAt` DESC);
    CREATE INDEX IX_BanGhiLoi_Evaluation ON `BanGhiLoi`(`EvaluationId`, `Category`);
    CREATE INDEX IX_TuVungNguoiDung_Due ON `TuVungNguoiDung`(`UserId`, `NextReviewAt`, `Word`, `IsMastered`);
    CREATE INDEX IX_OnTapFlashcard_Session ON `OnTapFlashcard`(`FlashcardSessionId`, `ReviewedAt`);
    CREATE INDEX IX_OnTapFlashcard_Word ON `OnTapFlashcard`(`UserVocabularyId`, `ReviewedAt` DESC);
    CREATE INDEX IX_OnTapFlashcard_User ON `OnTapFlashcard`(`UserId`, `LocalReviewDate`);


-- 2. Trigger tự tăng Version khi cập nhật, phục vụ kiểm soát cập nhật đồng thời.
CREATE TRIGGER TR_NguoiDung_Version BEFORE UPDATE ON `NguoiDung`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

CREATE TRIGGER TR_HoSoNguoiHoc_Version BEFORE UPDATE ON `HoSoNguoiHoc`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

CREATE TRIGGER TR_CaiDatNguoiDung_Version BEFORE UPDATE ON `CaiDatNguoiDung`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

CREATE TRIGGER TR_PhienHoc_Version BEFORE UPDATE ON `PhienHoc`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

CREATE TRIGGER TR_HoiThoai_Version BEFORE UPDATE ON `HoiThoai`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

CREATE TRIGGER TR_LuotThucHanh_Version BEFORE UPDATE ON `LuotThucHanh`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

CREATE TRIGGER TR_TuVungNguoiDung_Version BEFORE UPDATE ON `TuVungNguoiDung`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

-- 3. Thêm dữ liệu mẫu cho các danh mục, không tạo tài khoản người dùng.
START TRANSACTION;
-- BẮT ĐẦU SEED: có thể chạy lại riêng mục 3, từ START TRANSACTION đến COMMIT.
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'Pre-A1', 'Bắt đầu từ số 0', 'Dành cho người chưa từng học tiếng Anh.', 1 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='Pre-A1');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'A1', 'Nhập môn', 'Hiểu và dùng câu đơn giản về bản thân.', 2 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='A1');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'A2', 'Cơ bản', 'Giao tiếp trong các tình huống quen thuộc.', 3 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='A2');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'B1', 'Trung cấp', 'Trao đổi độc lập về chủ đề quen thuộc.', 4 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='B1');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'B2', 'Trên trung cấp', 'Trình bày quan điểm và trao đổi tương đối trôi chảy.', 5 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='B2');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'C1', 'Nâng cao', 'Sử dụng tiếng Anh linh hoạt trong học thuật và công việc.', 6 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='C1');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'C2', 'Thành thạo', 'Diễn đạt chính xác, tinh tế với nội dung phức tạp.', 7 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='C2');
    INSERT INTO `ChuDe`(`Code`, `Name`, `Description`, `AIRole`, `OpeningMessage`, `MinLevel`, `MaxLevel`, `ColorKey`, `IconKey`, `SortOrder`)
    SELECT s.* FROM (
        SELECT 'coffee' AS `Code`, 'Một tách cà phê' AS `Name`, 'Gọi đồ uống và bắt chuyện tại quán cà phê.' AS `Description`, 'Barista' AS `AIRole`, 'Hi there! Welcome to our café. What can I get for you today?' AS `OpeningMessage`, 'A2' AS `MinLevel`, 'A2' AS `MaxLevel`, 'peach' AS `ColorKey`, 'coffee' AS `IconKey`, 1 AS `SortOrder`
        UNION ALL
        SELECT 'travel', 'Chuyến đi tiếp theo', 'Hỏi đường, đặt phòng và khám phá thành phố.', 'Travel guide', 'Welcome to London! What would you like to explore first?', 'A2', 'B1', 'blue', 'compass', 2
        UNION ALL
        SELECT 'work', 'Ngày đầu đi làm', 'Giới thiệu bản thân và trao đổi với đồng nghiệp.', 'Colleague', 'Hi, I’m Alex, your new colleague. Could you tell me a little about yourself?', 'B1', 'B1', 'purple', 'briefcase', 3
        UNION ALL
        SELECT 'food', 'Bữa tối ngon miệng', 'Đặt bàn, gọi món và đưa ra yêu cầu riêng.', 'Waiter', 'Good evening! Do you have a reservation with us tonight?', 'A2', 'A2', 'pink', 'food', 4
        UNION ALL
        SELECT 'shopping', 'Đi mua sắm', 'Hỏi giá, chọn kích cỡ và đổi trả sản phẩm.', 'Shop assistant', 'Hello! Are you looking for anything in particular today?', 'A2', 'B1', 'green', 'bag', 5
        UNION ALL
        SELECT 'school', 'Cuộc sống sinh viên', 'Chia sẻ việc học, sở thích và kế hoạch mới.', 'Classmate', 'Hey! What do you enjoy most about your studies?', 'B1', 'B1', 'yellow', 'cap', 6
        UNION ALL
        SELECT 'technology', 'Thế giới công nghệ', 'Thảo luận về AI và công nghệ trong cuộc sống.', 'Tech enthusiast', 'How do you think technology has changed the way we learn?', 'B2', 'B2', 'blue', 'sparkles', 7
        UNION ALL
        SELECT 'interview', 'Phỏng vấn tự tin', 'Luyện trả lời về kinh nghiệm và điểm mạnh.', 'Interviewer', 'Thanks for coming in today. Could you tell me about your strengths?', 'B1', 'B2', 'purple', 'briefcase', 8
    ) s
    WHERE NOT EXISTS (SELECT 1 FROM `ChuDe` t  WHERE t.`Code` = s.`Code`);

-- Nội dung từ frontend/src/demo/{trinhDo,baiNghe,baiDoc,baiDocBoSung}.ts.
-- Không tự sửa revision đã xuất bản khi chạy lại seed.

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-pre-a1-1', 1, 'speaking', 'shadowing', 'Câu mẫu Pre-A1 · 1', 'Lắng nghe và lặp lại câu mẫu.', 'Hello.', 'Pre-A1', 'Pre-A1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-pre-a1-1' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-pre-a1-2', 1, 'speaking', 'shadowing', 'Câu mẫu Pre-A1 · 2', 'Lắng nghe và lặp lại câu mẫu.', 'My name is Anna.', 'Pre-A1', 'Pre-A1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-pre-a1-2' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-pre-a1-3', 1, 'speaking', 'shadowing', 'Câu mẫu Pre-A1 · 3', 'Lắng nghe và lặp lại câu mẫu.', 'This is a book.', 'Pre-A1', 'Pre-A1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-pre-a1-3' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-a1-1', 1, 'speaking', 'shadowing', 'Câu mẫu A1 · 1', 'Lắng nghe và lặp lại câu mẫu.', 'I am a student.', 'A1', 'A1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-a1-1' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-a1-2', 1, 'speaking', 'shadowing', 'Câu mẫu A1 · 2', 'Lắng nghe và lặp lại câu mẫu.', 'I live with my family.', 'A1', 'A1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-a1-2' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-a1-3', 1, 'speaking', 'shadowing', 'Câu mẫu A1 · 3', 'Lắng nghe và lặp lại câu mẫu.', 'What is your name?', 'A1', 'A1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-a1-3' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-a2-1', 1, 'speaking', 'shadowing', 'Câu mẫu A2 · 1', 'Lắng nghe và lặp lại câu mẫu.', 'I would like a cup of coffee, please.', 'A2', 'A2', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-a2-1' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-a2-2', 1, 'speaking', 'shadowing', 'Câu mẫu A2 · 2', 'Lắng nghe và lặp lại câu mẫu.', 'I feel more confident speaking English.', 'A2', 'A2', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-a2-2' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-a2-3', 1, 'speaking', 'shadowing', 'Câu mẫu A2 · 3', 'Lắng nghe và lặp lại câu mẫu.', 'Could you tell me how to get to the station?', 'A2', 'A2', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-a2-3' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-b1-1', 1, 'speaking', 'shadowing', 'Câu mẫu B1 · 1', 'Lắng nghe và lặp lại câu mẫu.', 'I have been learning English for two years.', 'B1', 'B1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-b1-1' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-b1-2', 1, 'speaking', 'shadowing', 'Câu mẫu B1 · 2', 'Lắng nghe và lặp lại câu mẫu.', 'If I have time this weekend, I will visit my friends.', 'B1', 'B1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-b1-2' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-b1-3', 1, 'speaking', 'shadowing', 'Câu mẫu B1 · 3', 'Lắng nghe và lặp lại câu mẫu.', 'In my opinion, travelling is a useful way to learn.', 'B1', 'B1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-b1-3' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-b2-1', 1, 'speaking', 'shadowing', 'Câu mẫu B2 · 1', 'Lắng nghe và lặp lại câu mẫu.', 'Although working remotely offers flexibility, it can make collaboration more challenging.', 'B2', 'B2', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-b2-1' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-b2-2', 1, 'speaking', 'shadowing', 'Câu mẫu B2 · 2', 'Lắng nghe và lặp lại câu mẫu.', 'I would argue that practical experience is just as valuable as formal education.', 'B2', 'B2', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-b2-2' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-b2-3', 1, 'speaking', 'shadowing', 'Câu mẫu B2 · 3', 'Lắng nghe và lặp lại câu mẫu.', 'If public transport were more reliable, fewer people would drive to work.', 'B2', 'B2', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-b2-3' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-c1-1', 1, 'speaking', 'shadowing', 'Câu mẫu C1 · 1', 'Lắng nghe và lặp lại câu mẫu.', 'Not only does the proposal address immediate concerns, but it also anticipates longer-term challenges.', 'C1', 'C1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-c1-1' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-c1-2', 1, 'speaking', 'shadowing', 'Câu mẫu C1 · 2', 'Lắng nghe và lặp lại câu mẫu.', 'The evidence suggests that the benefits are substantial, provided the policy is implemented consistently.', 'C1', 'C1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-c1-2' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-c1-3', 1, 'speaking', 'shadowing', 'Câu mẫu C1 · 3', 'Lắng nghe và lặp lại câu mẫu.', 'While I appreciate the reasoning behind your position, I remain unconvinced by its underlying assumptions.', 'C1', 'C1', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-c1-3' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-c2-1', 1, 'speaking', 'shadowing', 'Câu mẫu C2 · 1', 'Lắng nghe và lặp lại câu mẫu.', 'Compelling though the argument may appear, its premises warrant closer scrutiny.', 'C2', 'C2', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-c2-1' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-c2-2', 1, 'speaking', 'shadowing', 'Câu mẫu C2 · 2', 'Lắng nghe và lặp lại câu mẫu.', 'The distinction is less a matter of principle than of how those principles are interpreted in practice.', 'C2', 'C2', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-c2-2' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'speaking-c2-3', 1, 'speaking', 'shadowing', 'Câu mẫu C2 · 3', 'Lắng nghe và lặp lại câu mẫu.', 'What is ostensibly a pragmatic compromise risks obscuring the very tensions it purports to resolve.', 'C2', 'C2', 2, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='speaking-c2-3' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'listening-pre-a1', 1, 'listening', 'mixed', 'First words', 'Nghe và chọn đáp án hoặc chép chính tả.', 'Hello. My name is Sam. This is a pen. One, two, three. Goodbye.', 'Pre-A1', 'Pre-A1', 3, 1, 'LÀM QUEN', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='listening-pre-a1' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 1, 'multiple_choice', 'What is his name? (Bạn ấy tên gì?)', NULL, NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-pre-a1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Anna', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-pre-a1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Sam', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-pre-a1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Ben', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-pre-a1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 2, 'dictation', 'Chép lại câu đã nghe.', 'Hello.', NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-pre-a1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'hello', 'xin chào', '/həˈləʊ/', 'Thán từ', 'Hello, Sam.' FROM `BaiHoc` l
WHERE l.`Code`='listening-pre-a1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'listening-a1', 1, 'listening', 'mixed', 'Meet my family', 'Nghe và chọn đáp án hoặc chép chính tả.', 'Hi, I am Lily. I am ten years old. I live with my parents and my brother. My brother is six. We like music.', 'A1', 'A1', 3, 1, 'GIA ĐÌNH', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='listening-a1' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 1, 'multiple_choice', 'How old is Lily?', NULL, NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-a1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Six', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-a1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Eight', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-a1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Ten', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-a1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 2, 'dictation', 'Chép lại câu đã nghe.', 'I like music.', NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-a1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'family', 'gia đình', '/ˈfæm.əl.i/', 'Danh từ', 'I live with my family.' FROM `BaiHoc` l
WHERE l.`Code`='listening-a1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'listening-a2', 1, 'listening', 'mixed', 'A morning at the café', 'Nghe và chọn đáp án hoặc chép chính tả.', 'Good morning! I''d like a takeaway coffee, please. A small latte with oat milk. I have a meeting at nine, so I''m in a hurry. Thank you!', 'A2', 'A2', 3, 1, 'ĐỜI SỐNG', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='listening-a2' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 1, 'multiple_choice', 'What does the customer order?', NULL, NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-a2' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'A tea with lemon', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-a2' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'A small latte with oat milk', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-a2' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'A large black coffee', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-a2' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 2, 'dictation', 'Chép lại câu đã nghe.', 'I''d like a takeaway coffee, please.', NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-a2' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'takeaway', 'mang đi', '/ˈteɪk.ə.weɪ/', 'Danh từ', 'Could I get a takeaway coffee, please?' FROM `BaiHoc` l
WHERE l.`Code`='listening-a2' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'listening-b1', 1, 'listening', 'mixed', 'An exciting opportunity', 'Nghe và chọn đáp án hoặc chép chính tả.', 'I have an interview tomorrow. It is a great opportunity to join a new team. I feel confident because I have three years of experience. I want to improve my skills.', 'B1', 'B1', 3, 1, 'CÔNG VIỆC', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='listening-b1' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 1, 'multiple_choice', 'How much experience does the speaker have?', NULL, NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-b1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'One year', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-b1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Two years', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-b1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Three years', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-b1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 2, 'dictation', 'Chép lại câu đã nghe.', 'I feel confident because I have three years of experience.', NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-b1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'confident', 'tự tin', '/ˈkɒn.fɪ.dənt/', 'Tính từ', 'I feel more confident speaking English.' FROM `BaiHoc` l
WHERE l.`Code`='listening-b1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 2, 'opportunity', 'cơ hội', '/ˌɒp.əˈtjuː.nə.ti/', 'Danh từ', 'This is a great opportunity to learn.' FROM `BaiHoc` l
WHERE l.`Code`='listening-b1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=2);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'listening-b2', 1, 'listening', 'mixed', 'Flexible working', 'Nghe và chọn đáp án hoặc chép chính tả.', 'Our team tried a four-day working week for three months. Although productivity remained stable, scheduling meetings with clients became more complicated. Most employees welcomed the change, but management decided to extend the trial rather than make it permanent immediately.', 'B2', 'B2', 3, 1, 'CÔNG VIỆC', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='listening-b2' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 1, 'multiple_choice', 'Why did management extend the trial?', NULL, NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-b2' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Productivity collapsed', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-b2' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Clients refused all meetings', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-b2' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Benefits existed, but practical issues remained', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-b2' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 2, 'dictation', 'Chép lại câu đã nghe.', 'Although productivity remained stable, scheduling meetings became more complicated.', NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-b2' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'experience', 'trải nghiệm, kinh nghiệm', '/ɪkˈspɪə.ri.əns/', 'Danh từ', 'Travelling is a wonderful experience.' FROM `BaiHoc` l
WHERE l.`Code`='listening-b2' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'listening-c1', 1, 'listening', 'mixed', 'Reading between the lines', 'Nghe và chọn đáp án hoặc chép chính tả.', 'I can see why the proposal appeals to the board. Its projected savings are certainly attractive. Still, I would be more comfortable endorsing it if we had a clearer account of how those savings would affect the service. Perhaps a limited pilot would give us the evidence we currently lack.', 'C1', 'C1', 3, 1, 'GIAO TIẾP', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='listening-c1' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 1, 'multiple_choice', 'What is the speaker implying?', NULL, NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-c1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'The proposal is unacceptable in every form', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-c1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Support depends on further evidence about service quality', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-c1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'The savings have already been confirmed', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-c1' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 2, 'dictation', 'Chép lại câu đã nghe.', 'Perhaps a limited pilot would give us the evidence we currently lack.', NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-c1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'opportunity', 'cơ hội', '/ˌɒp.əˈtjuː.nə.ti/', 'Danh từ', 'This is a great opportunity to learn.' FROM `BaiHoc` l
WHERE l.`Code`='listening-c1' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'listening-c2', 1, 'listening', 'mixed', 'A carefully qualified endorsement', 'Nghe và chọn đáp án hoặc chép chính tả.', 'Far be it from me to dismiss the achievement: reaching an agreement at all was no small feat. What troubles me is the eagerness to equate agreement with resolution. The wording accommodates both parties precisely because it leaves their incompatible assumptions intact. Calling that a failure would be premature; calling it a solution strikes me as equally so.', 'C2', 'C2', 3, 1, 'TRANH LUẬN', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='listening-c2' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 1, 'multiple_choice', 'How does the speaker evaluate the agreement?', NULL, NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-c2' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'It is a diplomatic achievement whose substantive success remains uncertain', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-c2' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'It has conclusively resolved the disagreement', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-c2' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'It is an obvious failure with no value', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='listening-c2' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'listening', 2, 'dictation', 'Chép lại câu đã nghe.', 'Calling that a failure would be premature.', NULL FROM `BaiHoc` l
WHERE l.`Code`='listening-c2' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'premature', 'quá sớm, chưa đúng lúc', '/ˈprem.ə.tʃə/', 'Tính từ', 'Calling it a failure would be premature.' FROM `BaiHoc` l
WHERE l.`Code`='listening-c2' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'reading-first-words', 1, 'reading', 'multiple_choice', 'Hello, I am Anna', 'Đọc đoạn văn và chọn đáp án đúng.', 'Hello. I am Anna.

This is a book. It is red.

This is my cat. My cat is small.', 'Pre-A1', 'Pre-A1', 3, 1, 'LÀM QUEN', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='reading-first-words' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 1, 'multiple_choice', 'What is her name? (Bạn ấy tên gì?)', NULL, '“I am Anna” nghĩa là “Tôi là Anna”.' FROM `BaiHoc` l
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Anna', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Emma', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Tom', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 2, 'multiple_choice', 'The book is… (Cuốn sách có màu gì?)', NULL, '“It is red” nghĩa là “Nó màu đỏ”. red = đỏ.' FROM `BaiHoc` l
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'blue', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'red', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'green', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 3, 'multiple_choice', 'The cat is… (Con mèo như thế nào?)', NULL, '“My cat is small” nghĩa là “Con mèo của tôi nhỏ”. small = nhỏ.' FROM `BaiHoc` l
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=3);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'big', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'red', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'small', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'book', 'cuốn sách', '/bʊk/', 'Danh từ', 'This is a book.' FROM `BaiHoc` l
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 2, 'cat', 'con mèo', '/kæt/', 'Danh từ', 'This is my cat.' FROM `BaiHoc` l
WHERE l.`Code`='reading-first-words' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=2);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'reading-daily-life', 1, 'reading', 'multiple_choice', 'My day', 'Đọc đoạn văn và chọn đáp án đúng.', 'My name is Ben. I am a student. I live with my mother and father. Our house is near my school.

I get up at seven. I eat bread and drink milk for breakfast. I walk to school with my friend Lucy.

After school, I play football. In the evening, I read a book. I go to bed at nine.', 'A1', 'A1', 3, 1, 'HẰNG NGÀY', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='reading-daily-life' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 1, 'multiple_choice', 'Who does Ben live with?', NULL, 'Ben nói: “I live with my mother and father” — sống cùng bố mẹ.' FROM `BaiHoc` l
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'His friends', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'His mother and father', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'His teacher', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 2, 'multiple_choice', 'How does Ben go to school?', NULL, '“I walk to school” — Ben đi bộ đến trường.' FROM `BaiHoc` l
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'He walks', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'He takes a bus', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'He rides a bicycle', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 3, 'multiple_choice', 'What does Ben do in the evening?', NULL, '“In the evening, I read a book” — buổi tối Ben đọc sách.' FROM `BaiHoc` l
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=3);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'He plays football', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'He eats breakfast', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'He reads a book', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'breakfast', 'bữa sáng', '/ˈbrek.fəst/', 'Danh từ', 'I eat bread for breakfast.' FROM `BaiHoc` l
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 2, 'walk', 'đi bộ', '/wɔːk/', 'Động từ', 'I walk to school.' FROM `BaiHoc` l
WHERE l.`Code`='reading-daily-life' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=2);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'reading-quiet-streets', 1, 'reading', 'multiple_choice', 'Whose streets are quieter?', 'Đọc đoạn văn và chọn đáp án đúng.', 'When a council restricted private cars in its historic centre, early reports celebrated a marked reduction in noise and an increase in pedestrian activity. Shop owners, initially sceptical, began describing the streets as more welcoming. On these measures alone, the initiative appeared an unqualified success.

Yet residents of neighbouring districts told a different story. Traffic had not disappeared; much of it had shifted onto roads that were already congested. A survey conducted exclusively within the pedestrian zone could therefore record genuine improvements while missing the costs borne elsewhere. The findings were not false, but their geographical boundaries shaped the conclusion.

The lesson is not that pedestrianisation should be rejected. Rather, a credible assessment must ask whose experience is being measured and over what period. Adjusting public transport routes and including surrounding neighbourhoods in consultations might preserve the gains without treating displaced inconvenience as an acceptable afterthought.', 'C1', 'C1', 3, 1, 'XÃ HỘI', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='reading-quiet-streets' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 1, 'multiple_choice', 'What limitation does the author identify in the early assessment?', NULL, 'Khảo sát trong khu đi bộ ghi nhận lợi ích thật, nhưng bỏ sót chi phí chuyển sang khu lân cận.' FROM `BaiHoc` l
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'It counted only shop owners', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'It overlooked effects outside the pedestrian zone', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'It invented the reduction in noise', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 2, 'multiple_choice', 'What is implied by “an acceptable afterthought”?', NULL, 'Tác giả phê bình việc coi bất tiện của khu lân cận là chuyện phụ; cần đưa họ vào đánh giá và tham vấn.' FROM `BaiHoc` l
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Displaced inconvenience should receive proper consideration', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Neighbouring districts welcome more traffic', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Consultation is unnecessary', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 3, 'multiple_choice', 'Which description best captures the author’s stance?', NULL, 'Tác giả không bác bỏ chính sách, mà đề nghị đánh giá rộng hơn và điều chỉnh giao thông công cộng.' FROM `BaiHoc` l
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=3);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Complete opposition to pedestrianisation', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Unqualified enthusiasm for the council', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Conditional support with a broader assessment', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'displace', 'chuyển sang nơi khác', '/dɪsˈpleɪs/', 'Động từ', 'The policy may displace traffic into neighbouring streets.' FROM `BaiHoc` l
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 2, 'credible', 'đáng tin cậy', '/ˈkred.ə.bəl/', 'Tính từ', 'A credible assessment considers the wider effects.' FROM `BaiHoc` l
WHERE l.`Code`='reading-quiet-streets' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=2);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'reading-measuring-success', 1, 'reading', 'multiple_choice', 'The comfort of a single measure', 'Đọc đoạn văn và chọn đáp án đúng.', 'There is a particular reassurance in a number that rises steadily. An institution can point to it as evidence of progress, while those charged with oversight can invoke it as proof that oversight itself is working. The convenience is mutual. Whether the number still represents what originally mattered is a less accommodating question.

Suppose a library begins judging its contribution by the quantity of books borrowed. A campaign promoting short, popular titles may improve that figure without improving access to demanding works or support for hesitant readers. This does not render borrowing statistics worthless. It reveals, instead, the slippage between an indicator and the purpose it was enlisted to serve: what is easiest to count can gradually become what is most energetically pursued.

Nor would replacing the figure with a supposedly richer index dissolve the difficulty. Every index embodies choices about what to include and how to weigh it, choices that a polished total can conceal. The sensible response is neither numerical abstinence nor unquestioning compliance, but a willingness to let measures inform judgement without pre-empting it. Paradoxically, a measure may be most useful when an institution remains prepared to explain why it has chosen not to maximise it.', 'C2', 'C2', 3, 1, 'TƯ DUY PHẢN BIỆN', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='reading-measuring-success' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 1, 'multiple_choice', 'What does “The convenience is mutual” suggest?', NULL, 'Cả tổ chức và người giám sát đều có thể dùng số tăng để chứng minh mình làm tốt, dù số đó chưa phản ánh mục đích ban đầu.' FROM `BaiHoc` l
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Institutions and overseers both benefit from an apparently clear sign of success', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Borrowers prefer shorter books', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Oversight inevitably prevents misleading statistics', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 2, 'multiple_choice', 'Why would a richer index fail to dissolve the difficulty?', NULL, 'Chọn thành phần và trọng số vẫn là quyết định đánh giá; tổng điểm có thể che các quyết định đó.' FROM `BaiHoc` l
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'It would contain no numerical information', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'It would eliminate institutional choice', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Its design would still embed judgements that the total may conceal', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 3, 'multiple_choice', 'What is the force of the final sentence?', NULL, 'Nghịch lý cuối bài: sẵn sàng không tối đa hóa chỉ số cho thấy tổ chức vẫn đặt mục đích và phán đoán lên trước con số.' FROM `BaiHoc` l
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=3);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'A useful measure should never influence decisions', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Departing from maximisation can demonstrate that purpose still governs judgement', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Institutions should stop explaining their choices', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'pre-empt', 'đi trước và ngăn một quyết định khác', '/priːˈempt/', 'Động từ', 'A measure should inform judgement without pre-empting it.' FROM `BaiHoc` l
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 2, 'slippage', 'sự lệch dần', '/ˈslɪp.ɪdʒ/', 'Danh từ', 'There is slippage between the indicator and its purpose.' FROM `BaiHoc` l
WHERE l.`Code`='reading-measuring-success' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=2);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'reading-garden', 1, 'reading', 'multiple_choice', 'A garden in the city', 'Đọc đoạn văn và chọn đáp án đúng.', 'Every Saturday morning, Emma visits a small community garden near her apartment. The garden is between a library and a supermarket. People from the neighbourhood grow vegetables and flowers there together.

Emma usually arrives at eight o’clock. She waters the tomatoes and helps her neighbour, Mr Lee, plant carrots. She does not have a garden at home, so she enjoys spending time outside. After working, everyone shares tea and talks about their week.

Last Saturday, Emma took her younger brother to the garden. He learned how to plant seeds and wanted to come again. Emma was happy because the garden helped him make new friends, too.', 'A2', 'A2', 3, 1, 'ĐỜI SỐNG', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='reading-garden' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 1, 'multiple_choice', 'Where is the community garden?', NULL, 'Đoạn 1: “The garden is between a library and a supermarket.”' FROM `BaiHoc` l
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Behind Emma’s apartment', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Between a library and a supermarket', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Next to a school', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 2, 'multiple_choice', 'Why does Emma enjoy visiting the garden?', NULL, 'Đoạn 2: Emma không có vườn ở nhà và thích dành thời gian ngoài trời.' FROM `BaiHoc` l
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'She likes spending time outside', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'She sells vegetables there', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'She works at the library', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 3, 'multiple_choice', 'What did Emma’s brother learn last Saturday?', NULL, 'Đoạn 3: “He learned how to plant seeds.”' FROM `BaiHoc` l
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=3);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'How to make tea', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'How to cook carrots', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'How to plant seeds', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'community', 'cộng đồng', '/kəˈmjuː.nə.ti/', 'Danh từ', 'Our community grows vegetables together.' FROM `BaiHoc` l
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 2, 'seed', 'hạt giống', '/siːd/', 'Danh từ', 'He learned how to plant seeds.' FROM `BaiHoc` l
WHERE l.`Code`='reading-garden' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=2);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'reading-commute', 1, 'reading', 'multiple_choice', 'A different way to work', 'Đọc đoạn văn và chọn đáp án đúng.', 'For years, Daniel drove to his office every day. The journey was only six kilometres, but heavy traffic often made it take forty minutes. By the time he arrived, he already felt tired. When his company provided secure bicycle parking, he decided to try cycling instead.

During the first week, Daniel found the hills difficult and had to leave home earlier. However, he soon discovered a quieter route through a park. His journey now takes about twenty-five minutes, and he feels more energetic at work. He also spends less money on fuel.

Cycling is not always convenient. On rainy days, Daniel takes the bus, and he still uses his car for longer trips. He believes that changing one small habit can make a difference, even if it is not possible to follow the new routine every single day.', 'B1', 'B1', 3, 1, 'CÔNG VIỆC', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='reading-commute' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 1, 'multiple_choice', 'What encouraged Daniel to try cycling?', NULL, 'Đoạn 1: Daniel thử đạp xe khi công ty cung cấp chỗ đỗ xe đạp an toàn.' FROM `BaiHoc` l
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'His car stopped working', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'His office moved closer', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'His company provided secure bicycle parking', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 2, 'multiple_choice', 'How did the new route improve his journey?', NULL, 'Đoạn 2: đường qua công viên yên tĩnh hơn; thời gian đi giảm từ 40 xuống khoảng 25 phút.' FROM `BaiHoc` l
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'It made the trip quieter and faster', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'It removed every hill', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'It allowed him to drive through a park', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 3, 'multiple_choice', 'What is the main message of the passage?', NULL, 'Đoạn cuối: một thói quen nhỏ có thể tạo khác biệt, dù không thực hiện được mỗi ngày.' FROM `BaiHoc` l
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=3);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Everyone should stop using cars completely', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Small changes can help without being followed every day', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Cycling is convenient in all weather', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'route', 'tuyến đường', '/ruːt/', 'Danh từ', 'He discovered a quieter route through a park.' FROM `BaiHoc` l
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 2, 'convenient', 'thuận tiện', '/kənˈviː.ni.ənt/', 'Tính từ', 'Cycling is not always convenient.' FROM `BaiHoc` l
WHERE l.`Code`='reading-commute' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=2);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'reading-learning', 1, 'reading', 'multiple_choice', 'Learning beyond the screen', 'Đọc đoạn văn và chọn đáp án đúng.', 'Digital learning platforms have made educational resources easier to access. A student can watch a lecture, practise vocabulary, or discuss a question with someone on another continent without leaving home. Yet access to information does not automatically lead to a deeper understanding of it.

Consider a learner who watches several tutorials on photography but never takes a photograph. The learner may recognise technical terms while struggling to apply them. By contrast, someone who experiments with a camera, reviews the results, and seeks feedback can connect abstract ideas to practical experience. Mistakes become useful evidence rather than simply signs of failure.

This does not mean that online learning should be abandoned. Instead, digital tools are most useful when they support purposeful activity. Learners might watch a short lesson, complete a real task, and then return to the material with specific questions. The value of a platform therefore depends partly on how actively the learner uses it, not merely on how much content it offers.', 'B2', 'B2', 3, 1, 'GIÁO DỤC', NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='reading-learning' AND `Revision`=1);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 1, 'multiple_choice', 'What distinction does the author make in the first paragraph?', NULL, 'Đoạn 1 phân biệt việc tiếp cận thông tin với hiểu sâu; điều thứ nhất không tự động dẫn tới điều thứ hai.' FROM `BaiHoc` l
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Online lectures and classroom lectures', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Access to information and understanding it', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'Vocabulary practice and discussion', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND c.`Position`=1 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 2, 'multiple_choice', 'Why does the author mention photography?', NULL, 'Ví dụ đối chiếu xem hướng dẫn với thực hành, xem lại kết quả và nhận phản hồi.' FROM `BaiHoc` l
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'To recommend buying a camera', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'To show that tutorials are always inaccurate', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'To illustrate the importance of applying knowledge', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND c.`Position`=2 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `CauHoiBaiHoc` (`LessonId`, `Skill`, `Position`, `QuestionType`, `Prompt`, `ExpectedText`, `Explanation`)
SELECT l.`LessonId`, 'reading', 3, 'multiple_choice', 'Which statement best reflects the author’s position?', NULL, 'Đoạn cuối khuyến khích dùng công cụ số để hỗ trợ hoạt động có mục đích, sau đó quay lại với câu hỏi cụ thể.' FROM `BaiHoc` l
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `CauHoiBaiHoc` c WHERE c.`LessonId`=l.`LessonId` AND c.`Position`=3);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 1, 'Digital tools should be combined with active practice', 1 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=1);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 2, 'Online learning should be abandoned', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=2);

INSERT INTO `LuaChonCauHoi` (`QuestionId`, `Position`, `Text`, `IsCorrect`)
SELECT c.`QuestionId`, 3, 'More content always produces better learning', 0 FROM `CauHoiBaiHoc` c JOIN `BaiHoc` l ON l.`LessonId`=c.`LessonId`
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND c.`Position`=3 AND NOT EXISTS (SELECT 1 FROM `LuaChonCauHoi` o WHERE o.`QuestionId`=c.`QuestionId` AND o.`Position`=3);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 1, 'abstract', 'trừu tượng', '/ˈæb.strækt/', 'Tính từ', 'Practice connects abstract ideas to experience.' FROM `BaiHoc` l
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=1);

INSERT INTO `TuVungBaiHoc` (`LessonId`, `Position`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`)
SELECT l.`LessonId`, 2, 'purposeful', 'có mục đích', '/ˈpɜː.pəs.fəl/', 'Tính từ', 'Digital tools can support purposeful activity.' FROM `BaiHoc` l
WHERE l.`Code`='reading-learning' AND l.`Revision`=1 AND NOT EXISTS (SELECT 1 FROM `TuVungBaiHoc` v WHERE v.`LessonId`=l.`LessonId` AND v.`Position`=2);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-pre-a1-sentence', 1, 'writing', 'sentence', 'Câu ngắn · Pre-A1', 'Viết tên của bạn theo mẫu: My name is…', NULL, 'Pre-A1', 'Pre-A1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-pre-a1-sentence' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-pre-a1-paragraph', 1, 'writing', 'paragraph', 'Đoạn văn · Pre-A1', 'Viết 2 câu theo mẫu: Hello. I am…', NULL, 'Pre-A1', 'Pre-A1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-pre-a1-paragraph' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-pre-a1-email', 1, 'writing', 'email', 'Email · Pre-A1', 'Viết lời chào và tên: Hello, I am…', NULL, 'Pre-A1', 'Pre-A1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-pre-a1-email' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-pre-a1-essay', 1, 'writing', 'essay', 'Bài luận · Pre-A1', 'Bắt đầu với 3 từ tiếng Anh bạn biết: hello, book, cat. Chưa cần viết bài luận.', NULL, 'Pre-A1', 'Pre-A1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-pre-a1-essay' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-a1-sentence', 1, 'writing', 'sentence', 'Câu ngắn · A1', 'Viết một câu về sở thích theo mẫu: I like…', NULL, 'A1', 'A1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-a1-sentence' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-a1-paragraph', 1, 'writing', 'paragraph', 'Đoạn văn · A1', 'Giới thiệu tên, tuổi và gia đình bằng 3–5 câu đơn giản.', NULL, 'A1', 'A1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-a1-paragraph' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-a1-email', 1, 'writing', 'email', 'Email · A1', 'Viết email 3–4 câu chào một người bạn và giới thiệu bản thân.', NULL, 'A1', 'A1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-a1-email' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-a1-essay', 1, 'writing', 'essay', 'Bài luận · A1', 'Viết 5 câu đơn giản về một ngày của bạn. Dùng I get up…, I go…', NULL, 'A1', 'A1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-a1-essay' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-a2-sentence', 1, 'writing', 'sentence', 'Câu ngắn · A2', 'Viết một câu về điều bạn muốn cải thiện trong tiếng Anh.', NULL, 'A2', 'A2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-a2-sentence' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-a2-paragraph', 1, 'writing', 'paragraph', 'Đoạn văn · A2', 'Giới thiệu bản thân, sở thích và mục tiêu học tiếng Anh (50–100 từ).', NULL, 'A2', 'A2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-a2-paragraph' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-a2-email', 1, 'writing', 'email', 'Email · A2', 'Viết email cho đồng nghiệp để đề nghị một cuộc họp vào tuần tới.', NULL, 'A2', 'A2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-a2-email' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-a2-essay', 1, 'writing', 'essay', 'Bài luận · A2', 'Viết một đoạn ngắn về chuyến đi gần đây: bạn đi đâu, làm gì và cảm thấy thế nào.', NULL, 'A2', 'A2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-a2-essay' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-b1-sentence', 1, 'writing', 'sentence', 'Câu ngắn · B1', 'Viết câu mô tả một trải nghiệm với I have…', NULL, 'B1', 'B1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-b1-sentence' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-b1-paragraph', 1, 'writing', 'paragraph', 'Đoạn văn · B1', 'Kể một trải nghiệm học tập và điều bạn rút ra (100–150 từ).', NULL, 'B1', 'B1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-b1-paragraph' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-b1-email', 1, 'writing', 'email', 'Email · B1', 'Viết email cho đồng nghiệp để đề nghị một cuộc họp vào tuần tới.', NULL, 'B1', 'B1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-b1-email' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-b1-essay', 1, 'writing', 'essay', 'Bài luận · B1', 'Công nghệ giúp chúng ta học ngoại ngữ như thế nào? Chia sẻ quan điểm và ví dụ (150–200 từ).', NULL, 'B1', 'B1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-b1-essay' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-b2-sentence', 1, 'writing', 'sentence', 'Câu ngắn · B2', 'Viết câu đối chiếu hai quan điểm với Although hoặc Whereas.', NULL, 'B2', 'B2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-b2-sentence' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-b2-paragraph', 1, 'writing', 'paragraph', 'Đoạn văn · B2', 'So sánh học trực tuyến và học tại lớp, nêu ưu/nhược điểm (150–200 từ).', NULL, 'B2', 'B2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-b2-paragraph' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-b2-email', 1, 'writing', 'email', 'Email · B2', 'Viết email công việc trình bày vấn đề, giải pháp và đề nghị hành động.', NULL, 'B2', 'B2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-b2-email' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-b2-essay', 1, 'writing', 'essay', 'Bài luận · B2', 'Có nên thay toàn bộ sách giáo khoa bằng tài liệu số? Nêu lập luận hai phía và kết luận (200–250 từ).', NULL, 'B2', 'B2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-b2-essay' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-c1-sentence', 1, 'writing', 'sentence', 'Câu ngắn · C1', 'Diễn đạt một quan điểm thận trọng bằng hedging: tends to, may, arguably.', NULL, 'C1', 'C1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-c1-sentence' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-c1-paragraph', 1, 'writing', 'paragraph', 'Đoạn văn · C1', 'Tổng hợp hai quan điểm trái chiều về AI trong giáo dục, chỉ ra điểm chung và khác biệt.', NULL, 'C1', 'C1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-c1-paragraph' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-c1-email', 1, 'writing', 'email', 'Email · C1', 'Viết đề xuất chính thức cho quản lý, cân nhắc chi phí, lợi ích và rủi ro.', NULL, 'C1', 'C1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-c1-email' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-c1-essay', 1, 'writing', 'essay', 'Bài luận · C1', 'Đánh giá vai trò của trường học trong việc phát triển tư duy phản biện, có phản biện và dẫn chứng (250–350 từ).', NULL, 'C1', 'C1', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-c1-essay' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-c2-sentence', 1, 'writing', 'sentence', 'Câu ngắn · C2', 'Viết lại cùng một ý theo văn phong trang trọng và thân mật, giữ nguyên sắc thái.', NULL, 'C2', 'C2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-c2-sentence' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-c2-paragraph', 1, 'writing', 'paragraph', 'Đoạn văn · C2', 'Phân tích một lập luận có ẩn ý, chỉ ra giả định và diễn đạt lại thật chính xác.', NULL, 'C2', 'C2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-c2-paragraph' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-c2-email', 1, 'writing', 'email', 'Email · C2', 'Viết thư đàm phán một vấn đề nhạy cảm, giữ thái độ ngoại giao nhưng yêu cầu rõ ràng.', NULL, 'C2', 'C2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-c2-email' AND `Revision`=1);

INSERT INTO `BaiHoc` (`Code`, `Revision`, `Skill`, `Format`, `Title`, `Instruction`, `Content`, `MinLevel`, `MaxLevel`, `EstimatedMinutes`, `IsPublished`, `CategoryLabel`, `TopicId`)
SELECT 'writing-c2-essay', 1, 'writing', 'essay', 'Bài luận · C2', 'Phản biện quan điểm “Hiệu quả phải luôn được ưu tiên hơn công bằng”, xét định nghĩa và các trường hợp ngoại lệ (350–450 từ).', NULL, 'C2', 'C2', 5, 1, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `BaiHoc` WHERE `Code`='writing-c2-essay' AND `Revision`=1);
COMMIT;

-- 4. Tạo các view thống kê việc học.
CREATE VIEW `vThongKeHocTapNguoiDung`
AS
SELECT u.`UserId`,
    COALESCE(s.TotalStudySeconds, 0) AS TotalStudySeconds,
    CAST(COALESCE(s.TotalStudySeconds, 0) / 60.0 AS decimal(18,2)) AS TotalStudyMinutes,
    COALESCE(v.SavedWordCount, 0) AS SavedWordCount,
    COALESCE(v.MasteredWordCount, 0) AS MasteredWordCount,
    COALESCE(r.`ReviewCount`, 0) AS `ReviewCount`
FROM `NguoiDung` u
LEFT JOIN (
    SELECT `UserId`, SUM(CAST(`DurationSeconds` AS SIGNED)) AS TotalStudySeconds
    FROM `PhienHoc` WHERE `Status` = 'completed' GROUP BY `UserId`
) s ON s.`UserId` = u.`UserId`
LEFT JOIN (
    SELECT `UserId`, COUNT(*) AS SavedWordCount,
        SUM(CAST(`IsMastered` AS SIGNED)) AS MasteredWordCount
    FROM `TuVungNguoiDung` WHERE `ArchivedAt` IS NULL GROUP BY `UserId`
) v ON v.`UserId` = u.`UserId`
LEFT JOIN (
    SELECT `UserId`, COUNT(*) AS `ReviewCount`
    FROM `OnTapFlashcard` GROUP BY `UserId`
) r ON r.`UserId` = u.`UserId`;

CREATE VIEW `vThongKeHocTapHangNgay` AS
SELECT k.`UserId`, k.`LocalStudyDate`,
    COALESCE(s.StudySeconds, 0) AS StudySeconds,
    CAST(COALESCE(s.StudySeconds, 0) / 60.0 AS decimal(18,2)) AS StudyMinutes,
    COALESCE(r.`ReviewCount`, 0) AS `ReviewCount`,
    COALESCE(s.CompletedSessionCount, 0) AS CompletedSessionCount
FROM (
    SELECT `UserId`, `LocalStudyDate` FROM `PhienHoc` WHERE `Status` = 'completed'
    UNION
    SELECT `UserId`, `LocalReviewDate` AS `LocalStudyDate` FROM `OnTapFlashcard`
) k
LEFT JOIN (
    SELECT `UserId`, `LocalStudyDate`, SUM(`DurationSeconds`) AS StudySeconds,
        COUNT(*) AS CompletedSessionCount
    FROM `PhienHoc` WHERE `Status` = 'completed' GROUP BY `UserId`, `LocalStudyDate`
) s ON s.`UserId` = k.`UserId` AND s.`LocalStudyDate` = k.`LocalStudyDate`
LEFT JOIN (
    SELECT `UserId`, `LocalReviewDate`, COUNT(*) AS `ReviewCount`
    FROM `OnTapFlashcard` GROUP BY `UserId`, `LocalReviewDate`
) r ON r.`UserId` = k.`UserId` AND r.`LocalReviewDate` = k.`LocalStudyDate`;

-- 5. Các truy vấn mẫu chỉ đọc; thay -1 bằng ID của người dùng hoặc cuộc hội thoại được phép truy cập.
SET @UserId = -1;
-- Ví dụ dành cho UTC+7; backend tính ngày theo TimeZoneId của từng hồ sơ.
SET @Today = DATE(UTC_TIMESTAMP(3) + INTERVAL 420 MINUTE);
SET @Now = UTC_TIMESTAMP(3);

-- Bảng điều khiển: thống kê toàn bộ thời gian học và tiến độ so với mục tiêu học hôm nay.
SELECT p.`DisplayName`, p.`CefrLevel`, p.`DailyGoalMinutes`, s.*,
    COALESCE(d.StudyMinutes, 0) AS TodayStudyMinutes,
    COALESCE(d.`ReviewCount`, 0) AS TodayReviewCount
FROM `HoSoNguoiHoc` p
JOIN `vThongKeHocTapNguoiDung` s ON s.`UserId` = p.`UserId`
LEFT JOIN `vThongKeHocTapHangNgay` d ON d.`UserId` = p.`UserId` AND d.`LocalStudyDate` = @Today
WHERE p.`UserId` = @UserId;

-- Thẻ từ vựng đến hạn ôn tập: NextReviewAt bằng NULL nghĩa là thẻ mới, có thể ôn ngay.
SELECT `UserVocabularyId`, `Word`, `Meaning`, `Phonetic`, `PartOfSpeech`, `ExampleSentence`, `IsMastered`, `NextReviewAt`, `Version`
FROM `TuVungNguoiDung`
WHERE `UserId` = @UserId AND `ArchivedAt` IS NULL AND (`NextReviewAt` IS NULL OR `NextReviewAt` <= @Now)
ORDER BY `NextReviewAt`, `UserVocabularyId`;

-- Danh sách hội thoại; khi lịch sử dài, phân trang theo CreatedAt và ConversationId của bản ghi cuối trang trước.
SELECT `ConversationId`, `Title`, `CefrLevel`, `TopicId`, `CreatedAt`
FROM `HoiThoai` WHERE `UserId` = @UserId ORDER BY `CreatedAt` DESC, `ConversationId` DESC LIMIT 20;

-- Lấy tin nhắn theo thứ tự, luôn giới hạn theo người dùng sở hữu cuộc hội thoại.
SET @ConversationId = -1;
SELECT `MessageId`, `Role`, `Content`, `Status`, `CreatedAt`
FROM `TinNhan` WHERE `ConversationId` = @ConversationId AND `UserId` = @UserId ORDER BY `SequenceNumber`;

-- Thống kê các nhóm lỗi: loại kết quả AI giả lập khỏi đánh giá học tập thực tế.
SELECT e.`Category`, COUNT(*) AS Occurrences
FROM `BanGhiLoi` e
JOIN `DanhGiaAI` a ON a.`EvaluationId` = e.`EvaluationId`
WHERE a.`UserId` = @UserId AND a.`Status` = 'completed' AND a.`IsMock` = 0
GROUP BY e.`Category`;


-- Chỉ ghi schema version sau khi bảng, seed, trigger và view đã tạo xong.
INSERT INTO `PhienBanCauTruc` (`Version`, `Description`)
SELECT 1, 'Initial MySQL schema: seven CEFR levels, Reading, speech preferences and onboarding'
WHERE NOT EXISTS (SELECT 1 FROM `PhienBanCauTruc` WHERE `Version`=1);

SELECT DATABASE() AS DatabaseName,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE') AS TableCount,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = DATABASE()) AS ViewCount,
    (SELECT COUNT(*) FROM TrinhDoCEFR) AS LevelCount,
    (SELECT COUNT(*) FROM BaiHoc) AS LessonCount,
    (SELECT COUNT(*) FROM CauHoiBaiHoc) AS QuestionCount,
    (SELECT COUNT(*) FROM LuaChonCauHoi) AS OptionCount,
    (SELECT COUNT(*) FROM TuVungBaiHoc) AS LessonVocabularyCount;
