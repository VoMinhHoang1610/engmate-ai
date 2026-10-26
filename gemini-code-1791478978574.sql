-- EngMate AI: tài khoản, hồ sơ, hội thoại và lộ trình TOEIC; MySQL 8.0.16+.
-- Tạo 13 bảng (9 bảng nền + 4 bảng engmate_learning_*) và 4 trigger Version.
-- Chỉ chạy trên database mới chưa có bảng. Không chạy lại trên EngMateAI hiện có.
-- Không DROP, TRUNCATE hoặc chuyển dữ liệu cũ. DDL MySQL tự COMMIT.
-- Database cũ: dùng scripts/install_learning.py để thêm các bảng lộ trình còn thiếu.
-- Giáo án/đáp án chuẩn ở backend/app/content/toeic.v1.json, không seed vào SQL.
-- Avatar lưu riêng trong AVATAR_STORAGE_DIR; các cột avatar cũ giữ để tương thích.
-- Bốn bảng lộ trình khớp backend/app/db/learning.py, không tự thêm FK/trigger.
-- Mỗi kết nối ứng dụng phải dùng UTC. Không seed tài khoản, mật khẩu hoặc khóa API.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_as_ci;
SET SESSION time_zone = '+00:00';
CREATE DATABASE IF NOT EXISTS EngMateAI CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;
USE EngMateAI;
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
        CONSTRAINT CK_HoSoNguoiHoc_Name CHECK (CHAR_LENGTH(LTRIM(RTRIM(`DisplayName`))) > 0),
        CONSTRAINT CK_HoSoNguoiHoc_Avatar CHECK (`AvatarPurpose` = 'avatar'),
        CONSTRAINT CK_HoSoNguoiHoc_Level CHECK (`CefrLevel` IN ('Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
        CONSTRAINT CK_HoSoNguoiHoc_Gender CHECK (`Gender` IS NULL OR `Gender` IN ('male', 'female', 'other')),
        CONSTRAINT CK_HoSoNguoiHoc_Goal CHECK (`DailyGoalMinutes` BETWEEN 10 AND 60)
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

-- Kế hoạch TOEIC theo tài khoản. Version do LearningService tăng, không dùng trigger.
CREATE TABLE `engmate_learning_plans` (
    `UserId` bigint NOT NULL,
    `Version` int NOT NULL,
    `GoalScore` int NOT NULL,
    `StartStage` varchar(64) NOT NULL,
    `Minutes` int NOT NULL,
    `ExamDate` date NULL,
    PRIMARY KEY (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- Một dòng cho mỗi tài khoản/bài; số lượt luyện được tính từ TinNhan, không lưu lặp.
CREATE TABLE `engmate_learning_progress` (
    `UserId` bigint NOT NULL,
    `LessonId` varchar(100) NOT NULL,
    `ConversationId` bigint NULL,
    `Phase` int NOT NULL,
    `Completed` boolean NOT NULL,
    `CheckCorrect` int NOT NULL,
    `CheckTotal` int NOT NULL,
    `ReviewDue` datetime NULL,
    PRIMARY KEY (`UserId`, `LessonId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- Liên kết hội thoại với giáo án chuẩn; service kiểm tra owner trong transaction.
CREATE TABLE `engmate_learning_bindings` (
    `UserId` bigint NOT NULL,
    `ConversationId` bigint NOT NULL,
    `LessonId` varchar(100) NOT NULL,
    PRIMARY KEY (`UserId`, `ConversationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- Receipt chống gửi lặp: RequestId duy nhất theo tài khoản cho cả start và check.
CREATE TABLE `engmate_learning_receipts` (
    `UserId` bigint NOT NULL,
    `RequestId` varchar(36) NOT NULL,
    `Kind` varchar(16) NOT NULL,
    `PayloadHash` varchar(64) NOT NULL,
    `ResultJson` text NOT NULL,
    PRIMARY KEY (`UserId`, `RequestId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TRIGGER TR_NguoiDung_Version BEFORE UPDATE ON `NguoiDung`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

CREATE TRIGGER TR_HoSoNguoiHoc_Version BEFORE UPDATE ON `HoSoNguoiHoc`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

CREATE TRIGGER TR_PhienHoc_Version BEFORE UPDATE ON `PhienHoc`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

CREATE TRIGGER TR_HoiThoai_Version BEFORE UPDATE ON `HoiThoai`
FOR EACH ROW SET NEW.`Version` = OLD.`Version` + 1;

CREATE INDEX IX_HoiThoai_User_Created ON HoiThoai(UserId, CreatedAt DESC);
CREATE INDEX IX_PhienDangNhap_User_Expires ON PhienDangNhap(UserId, ExpiresAt);

START TRANSACTION;
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'Pre-A1', 'Bắt đầu từ số 0', 'Dành cho người chưa từng học tiếng Anh.', 1 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='Pre-A1');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'A1', 'Nhập môn', 'Hiểu và dùng câu đơn giản về bản thân.', 2 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='A1');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'A2', 'Cơ bản', 'Giao tiếp trong các tình huống quen thuộc.', 3 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='A2');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'B1', 'Trung cấp', 'Trao đổi độc lập về chủ đề quen thuộc.', 4 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='B1');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'B2', 'Trên trung cấp', 'Trình bày quan điểm và trao đổi tương đối trôi chảy.', 5 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='B2');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'C1', 'Nâng cao', 'Sử dụng tiếng Anh linh hoạt trong học thuật và công việc.', 6 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='C1');
INSERT INTO `TrinhDoCEFR` (`Code`, `Name`, `Description`, `SortOrder`) SELECT 'C2', 'Thành thạo', 'Diễn đạt chính xác, tinh tế với nội dung phức tạp.', 7 WHERE NOT EXISTS (SELECT 1 FROM `TrinhDoCEFR` WHERE `Code`='C2');
-- Version 1 là hợp đồng bảng nền mà /api/ready đang kiểm tra.
-- Phiên bản nội dung TOEIC độc lập với version SQL, lấy từ catalog JSON của server.
INSERT INTO PhienBanCauTruc(Version, Description) VALUES (1, 'Accounts, profiles, conversations and TOEIC voice learning; compatible base v1');
COMMIT;
