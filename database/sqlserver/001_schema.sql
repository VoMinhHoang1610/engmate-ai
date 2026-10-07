-- EngMate-AI: SQL Server 2019+, execute in an empty application database.
-- One-time migration; no DROP/TRUNCATE, no login creation, no embedded secrets.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;

IF SCHEMA_ID(N'em') IS NOT NULL
    THROW 51000, 'Schema em already exists. Use a new database or a reviewed migration.', 1;

BEGIN TRY
    BEGIN TRANSACTION;
    EXEC(N'CREATE SCHEMA em AUTHORIZATION dbo;');

    CREATE TABLE em.SchemaVersions (
        Version int NOT NULL CONSTRAINT PK_SchemaVersions PRIMARY KEY,
        Description nvarchar(200) NOT NULL,
        AppliedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE TABLE em.Users (
        UserId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        PublicId uniqueidentifier NOT NULL DEFAULT NEWID(),
        Username nvarchar(64) COLLATE Latin1_General_100_CI_AS_SC NOT NULL,
        Email nvarchar(254) COLLATE Latin1_General_100_CI_AS_SC NOT NULL,
        PasswordHash varchar(512) NULL,
        Status varchar(16) NOT NULL DEFAULT 'active',
        EmailVerifiedAt datetime2(3) NULL,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        Version rowversion NOT NULL,
        CONSTRAINT UQ_Users_PublicId UNIQUE (PublicId),
        CONSTRAINT UQ_Users_Username UNIQUE (Username),
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT CK_Users_Identity CHECK (LEN(LTRIM(RTRIM(Username))) > 0 AND LEN(LTRIM(RTRIM(Email))) > 0),
        CONSTRAINT CK_Users_Status CHECK (Status IN ('active', 'disabled', 'pending')),
        CONSTRAINT CK_Users_Hash CHECK (PasswordHash IS NULL OR LEN(PasswordHash) > 0)
    );

    CREATE TABLE em.MediaAssets (
        MediaAssetId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_MediaAssets PRIMARY KEY,
        UserId bigint NOT NULL,
        Purpose varchar(16) NOT NULL,
        StorageKey nvarchar(450) NOT NULL,
        ContentType varchar(100) NOT NULL,
        SizeBytes bigint NOT NULL,
        DurationMs int NULL,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_MediaAssets_User FOREIGN KEY (UserId) REFERENCES em.Users(UserId),
        CONSTRAINT UQ_MediaAssets_OwnerPurpose UNIQUE (MediaAssetId, UserId, Purpose),
        CONSTRAINT UQ_MediaAssets_Storage UNIQUE (StorageKey),
        CONSTRAINT CK_MediaAssets_Purpose CHECK (Purpose IN ('avatar', 'recording')),
        CONSTRAINT CK_MediaAssets_Size CHECK (SizeBytes > 0 AND (DurationMs IS NULL OR DurationMs >= 0)),
        CONSTRAINT CK_MediaAssets_Key CHECK (LEN(LTRIM(RTRIM(StorageKey))) > 0)
    );

    CREATE TABLE em.LearnerProfiles (
        UserId bigint NOT NULL CONSTRAINT PK_LearnerProfiles PRIMARY KEY,
        DisplayName nvarchar(60) NOT NULL,
        PhoneNumber varchar(32) NULL,
        BirthDate date NULL,
        Gender varchar(10) NULL,
        AvatarAssetId bigint NULL,
        AvatarPurpose varchar(16) NOT NULL DEFAULT 'avatar',
        CefrLevel varchar(2) NOT NULL DEFAULT 'A2',
        LearningGoal nvarchar(200) NOT NULL DEFAULT N'Giao tiếp tự tin',
        DailyGoalMinutes smallint NOT NULL DEFAULT 20,
        TimeZoneId varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        Version rowversion NOT NULL,
        CONSTRAINT FK_LearnerProfiles_User FOREIGN KEY (UserId) REFERENCES em.Users(UserId),
        CONSTRAINT FK_LearnerProfiles_Avatar FOREIGN KEY (AvatarAssetId, UserId, AvatarPurpose) REFERENCES em.MediaAssets(MediaAssetId, UserId, Purpose),
        CONSTRAINT CK_LearnerProfiles_Name CHECK (LEN(LTRIM(RTRIM(DisplayName))) > 0),
        CONSTRAINT CK_LearnerProfiles_Avatar CHECK (AvatarPurpose = 'avatar'),
        CONSTRAINT CK_LearnerProfiles_Level CHECK (CefrLevel IN ('A2', 'B1', 'B2')),
        CONSTRAINT CK_LearnerProfiles_Gender CHECK (Gender IS NULL OR Gender IN ('male', 'female', 'other')),
        CONSTRAINT CK_LearnerProfiles_Goal CHECK (DailyGoalMinutes BETWEEN 10 AND 60)
    );

    CREATE TABLE em.UserSettings (
        UserId bigint NOT NULL CONSTRAINT PK_UserSettings PRIMARY KEY,
        Theme varchar(10) NOT NULL DEFAULT 'light',
        ReducedMotion bit NOT NULL DEFAULT 0,
        SpeechRate decimal(3,2) NOT NULL DEFAULT 1.00,
        UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        Version rowversion NOT NULL,
        CONSTRAINT FK_UserSettings_User FOREIGN KEY (UserId) REFERENCES em.Users(UserId),
        CONSTRAINT CK_UserSettings_Theme CHECK (Theme IN ('light', 'dark', 'system')),
        CONSTRAINT CK_UserSettings_Rate CHECK (SpeechRate IN (0.75, 1.00, 1.25))
    );

    CREATE TABLE em.OAuthIdentities (
        OAuthIdentityId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_OAuthIdentities PRIMARY KEY,
        UserId bigint NOT NULL,
        Provider varchar(16) NOT NULL,
        ProviderSubject nvarchar(255) COLLATE Latin1_General_100_BIN2 NOT NULL,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_OAuthIdentities_User FOREIGN KEY (UserId) REFERENCES em.Users(UserId),
        CONSTRAINT UQ_OAuthIdentities_Subject UNIQUE (Provider, ProviderSubject),
        CONSTRAINT UQ_OAuthIdentities_UserProvider UNIQUE (UserId, Provider),
        CONSTRAINT CK_OAuthIdentities_Provider CHECK (Provider IN ('google', 'facebook', 'github')),
        CONSTRAINT CK_OAuthIdentities_Subject CHECK (LEN(LTRIM(RTRIM(ProviderSubject))) > 0)
    );

    CREATE TABLE em.AuthSessions (
        AuthSessionId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuthSessions PRIMARY KEY,
        UserId bigint NOT NULL,
        RefreshTokenHash binary(32) NOT NULL,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        ExpiresAt datetime2(3) NOT NULL,
        RevokedAt datetime2(3) NULL,
        CONSTRAINT FK_AuthSessions_User FOREIGN KEY (UserId) REFERENCES em.Users(UserId),
        CONSTRAINT UQ_AuthSessions_Hash UNIQUE (RefreshTokenHash),
        CONSTRAINT CK_AuthSessions_Time CHECK (ExpiresAt > CreatedAt AND (RevokedAt IS NULL OR RevokedAt >= CreatedAt))
    );

    CREATE TABLE em.AccountTokens (
        AccountTokenId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_AccountTokens PRIMARY KEY,
        UserId bigint NOT NULL,
        Purpose varchar(20) NOT NULL,
        TokenHash binary(32) NOT NULL,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        ExpiresAt datetime2(3) NOT NULL,
        UsedAt datetime2(3) NULL,
        CONSTRAINT FK_AccountTokens_User FOREIGN KEY (UserId) REFERENCES em.Users(UserId),
        CONSTRAINT UQ_AccountTokens_Hash UNIQUE (TokenHash),
        CONSTRAINT CK_AccountTokens_Purpose CHECK (Purpose IN ('verify_email', 'reset_password')),
        CONSTRAINT CK_AccountTokens_Time CHECK (ExpiresAt > CreatedAt AND (UsedAt IS NULL OR UsedAt >= CreatedAt))
    );

    CREATE TABLE em.Topics (
        TopicId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Topics PRIMARY KEY,
        Code varchar(40) NOT NULL,
        Name nvarchar(100) NOT NULL,
        Description nvarchar(500) NOT NULL,
        AIRole nvarchar(100) NOT NULL,
        OpeningMessage nvarchar(2000) NOT NULL,
        MinLevel varchar(2) NOT NULL,
        MaxLevel varchar(2) NOT NULL,
        ColorKey varchar(24) NOT NULL,
        IconKey varchar(32) NOT NULL,
        SortOrder smallint NOT NULL DEFAULT 0,
        IsActive bit NOT NULL DEFAULT 1,
        CONSTRAINT UQ_Topics_Code UNIQUE (Code),
        CONSTRAINT CK_Topics_Levels CHECK (
            MinLevel IN ('A2', 'B1', 'B2') AND MaxLevel IN ('A2', 'B1', 'B2')
            AND CASE MinLevel WHEN 'A2' THEN 1 WHEN 'B1' THEN 2 ELSE 3 END <= CASE MaxLevel WHEN 'A2' THEN 1 WHEN 'B1' THEN 2 ELSE 3 END)
    );

    -- Published revisions are immutable in the service layer; new content gets a new revision.
    CREATE TABLE em.Lessons (
        LessonId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Lessons PRIMARY KEY,
        Code varchar(64) NOT NULL,
        Revision smallint NOT NULL DEFAULT 1,
        TopicId int NULL,
        Skill varchar(16) NOT NULL,
        Format varchar(16) NOT NULL,
        Title nvarchar(200) NOT NULL,
        Instruction nvarchar(2000) NOT NULL,
        Content nvarchar(max) NULL,
        AudioUrl nvarchar(2048) NULL,
        MinLevel varchar(2) NOT NULL,
        MaxLevel varchar(2) NOT NULL,
        EstimatedMinutes smallint NOT NULL,
        IsPublished bit NOT NULL DEFAULT 0,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Lessons_Topic FOREIGN KEY (TopicId) REFERENCES em.Topics(TopicId),
        CONSTRAINT UQ_Lessons_Revision UNIQUE (Code, Revision),
        CONSTRAINT UQ_Lessons_Skill UNIQUE (LessonId, Skill),
        CONSTRAINT CK_Lessons_Revision CHECK (Revision > 0 AND EstimatedMinutes > 0),
        CONSTRAINT CK_Lessons_Format CHECK (
            (Skill = 'speaking' AND Format = 'shadowing') OR
            (Skill = 'listening' AND Format = 'mixed') OR
            (Skill = 'writing' AND Format IN ('sentence', 'paragraph', 'email', 'essay'))),
        CONSTRAINT CK_Lessons_Levels CHECK (
            MinLevel IN ('A2', 'B1', 'B2') AND MaxLevel IN ('A2', 'B1', 'B2')
            AND CASE MinLevel WHEN 'A2' THEN 1 WHEN 'B1' THEN 2 ELSE 3 END <= CASE MaxLevel WHEN 'A2' THEN 1 WHEN 'B1' THEN 2 ELSE 3 END)
    );

    CREATE TABLE em.LessonQuestions (
        QuestionId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_LessonQuestions PRIMARY KEY,
        LessonId bigint NOT NULL,
        Skill varchar(16) NOT NULL DEFAULT 'listening',
        Position smallint NOT NULL,
        QuestionType varchar(16) NOT NULL,
        Prompt nvarchar(2000) NOT NULL,
        ExpectedText nvarchar(2000) NULL,
        Explanation nvarchar(2000) NULL,
        Points decimal(6,2) NOT NULL DEFAULT 1,
        CONSTRAINT FK_LessonQuestions_Lesson FOREIGN KEY (LessonId, Skill) REFERENCES em.Lessons(LessonId, Skill),
        CONSTRAINT UQ_LessonQuestions_Position UNIQUE (LessonId, Position),
        CONSTRAINT UQ_LessonQuestions_Lesson UNIQUE (QuestionId, LessonId),
        CONSTRAINT UQ_LessonQuestions_Type UNIQUE (QuestionId, QuestionType),
        CONSTRAINT CK_LessonQuestions_Position CHECK (Position > 0 AND Points > 0),
        CONSTRAINT CK_LessonQuestions_Skill CHECK (Skill = 'listening'),
        CONSTRAINT CK_LessonQuestions_Type CHECK (
            (QuestionType = 'multiple_choice' AND ExpectedText IS NULL) OR
            (QuestionType = 'dictation' AND ExpectedText IS NOT NULL AND LEN(LTRIM(RTRIM(ExpectedText))) > 0))
    );

    CREATE TABLE em.QuestionOptions (
        OptionId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_QuestionOptions PRIMARY KEY,
        QuestionId bigint NOT NULL,
        QuestionType varchar(16) NOT NULL DEFAULT 'multiple_choice',
        Position tinyint NOT NULL,
        Text nvarchar(1000) NOT NULL,
        IsCorrect bit NOT NULL DEFAULT 0,
        CONSTRAINT FK_QuestionOptions_Question FOREIGN KEY (QuestionId, QuestionType) REFERENCES em.LessonQuestions(QuestionId, QuestionType),
        CONSTRAINT UQ_QuestionOptions_Position UNIQUE (QuestionId, Position),
        CONSTRAINT UQ_QuestionOptions_Question UNIQUE (OptionId, QuestionId),
        CONSTRAINT CK_QuestionOptions_Type CHECK (QuestionType = 'multiple_choice' AND Position > 0)
    );
    CREATE UNIQUE INDEX UX_QuestionOptions_OneCorrect ON em.QuestionOptions(QuestionId) WHERE IsCorrect = 1;

    -- One session is the sole source of credited learning time (not AI calls or button clicks).
    CREATE TABLE em.StudySessions (
        StudySessionId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_StudySessions PRIMARY KEY,
        UserId bigint NOT NULL,
        ClientRequestId uniqueidentifier NOT NULL,
        ActivityType varchar(16) NOT NULL,
        Status varchar(16) NOT NULL DEFAULT 'in_progress',
        StartedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        EndedAt datetime2(3) NULL,
        DurationSeconds int NOT NULL DEFAULT 0,
        DurationSource varchar(16) NOT NULL DEFAULT 'measured',
        LocalStudyDate date NOT NULL,
        UtcOffsetMinutes smallint NOT NULL,
        DailyGoalMinutes smallint NOT NULL,
        Version rowversion NOT NULL,
        CONSTRAINT FK_StudySessions_User FOREIGN KEY (UserId) REFERENCES em.Users(UserId),
        CONSTRAINT UQ_StudySessions_Request UNIQUE (UserId, ClientRequestId),
        CONSTRAINT UQ_StudySessions_OwnerType UNIQUE (StudySessionId, UserId, ActivityType),
        CONSTRAINT CK_StudySessions_Type CHECK (ActivityType IN ('conversation', 'speaking', 'listening', 'writing', 'flashcard', 'legacy_import')),
        CONSTRAINT CK_StudySessions_Status CHECK (Status IN ('in_progress', 'completed', 'abandoned')),
        CONSTRAINT CK_StudySessions_Time CHECK (
            DurationSeconds >= 0 AND UtcOffsetMinutes BETWEEN -840 AND 840 AND DailyGoalMinutes BETWEEN 10 AND 60
            AND ((Status = 'in_progress' AND EndedAt IS NULL AND DurationSeconds = 0) OR
                 (Status IN ('completed', 'abandoned') AND EndedAt IS NOT NULL AND EndedAt >= StartedAt))
            AND (Status <> 'abandoned' OR DurationSeconds = 0)),
        CONSTRAINT CK_StudySessions_Source CHECK (DurationSource IN ('measured', 'demo_estimate', 'legacy_import'))
    );

    CREATE TABLE em.Conversations (
        ConversationId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Conversations PRIMARY KEY,
        StudySessionId bigint NOT NULL,
        UserId bigint NOT NULL,
        ActivityType varchar(16) NOT NULL DEFAULT 'conversation',
        TopicId int NULL,
        Mode varchar(16) NOT NULL DEFAULT 'roleplay',
        Title nvarchar(200) NOT NULL,
        CefrLevel varchar(2) NOT NULL,
        AIRoleSnapshot nvarchar(100) NOT NULL,
        PromptVersion varchar(64) NOT NULL,
        Summary nvarchar(max) NULL,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        Version rowversion NOT NULL,
        CONSTRAINT FK_Conversations_Session FOREIGN KEY (StudySessionId, UserId, ActivityType) REFERENCES em.StudySessions(StudySessionId, UserId, ActivityType),
        CONSTRAINT FK_Conversations_Topic FOREIGN KEY (TopicId) REFERENCES em.Topics(TopicId),
        CONSTRAINT UQ_Conversations_Session UNIQUE (StudySessionId),
        CONSTRAINT UQ_Conversations_Owner UNIQUE (ConversationId, UserId),
        CONSTRAINT CK_Conversations_Type CHECK (ActivityType = 'conversation'),
        CONSTRAINT CK_Conversations_Mode CHECK (Mode IN ('free_chat', 'roleplay')),
        CONSTRAINT CK_Conversations_Level CHECK (CefrLevel IN ('A2', 'B1', 'B2'))
    );

    CREATE TABLE em.Messages (
        MessageId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Messages PRIMARY KEY,
        ConversationId bigint NOT NULL,
        UserId bigint NOT NULL,
        ClientRequestId uniqueidentifier NOT NULL,
        SequenceNumber int NOT NULL,
        Role varchar(16) NOT NULL,
        Content nvarchar(max) NOT NULL,
        Status varchar(16) NOT NULL DEFAULT 'completed',
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Messages_Conversation FOREIGN KEY (ConversationId, UserId) REFERENCES em.Conversations(ConversationId, UserId),
        CONSTRAINT UQ_Messages_Sequence UNIQUE (ConversationId, SequenceNumber),
        CONSTRAINT UQ_Messages_Request UNIQUE (ConversationId, ClientRequestId),
        CONSTRAINT UQ_Messages_Owner UNIQUE (MessageId, UserId),
        CONSTRAINT CK_Messages_Role CHECK (Role IN ('user', 'assistant', 'system')),
        CONSTRAINT CK_Messages_Sequence CHECK (SequenceNumber >= 0),
        CONSTRAINT CK_Messages_Status CHECK (Status IN ('pending', 'completed', 'failed', 'cancelled')),
        CONSTRAINT CK_Messages_Content CHECK (Status <> 'completed' OR LEN(LTRIM(RTRIM(Content))) > 0)
    );

    CREATE TABLE em.PracticeAttempts (
        AttemptId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_PracticeAttempts PRIMARY KEY,
        StudySessionId bigint NOT NULL,
        UserId bigint NOT NULL,
        LessonId bigint NOT NULL,
        Skill varchar(16) NOT NULL,
        Mode varchar(16) NOT NULL,
        SubmittedText nvarchar(max) NULL,
        RecordingAssetId bigint NULL,
        RecordingPurpose varchar(16) NOT NULL DEFAULT 'recording',
        PlaybackRate decimal(3,2) NULL,
        ScorePercent decimal(5,2) NULL,
        SubmittedAt datetime2(3) NULL,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        Version rowversion NOT NULL,
        CONSTRAINT FK_PracticeAttempts_Session FOREIGN KEY (StudySessionId, UserId, Skill) REFERENCES em.StudySessions(StudySessionId, UserId, ActivityType),
        CONSTRAINT FK_PracticeAttempts_Lesson FOREIGN KEY (LessonId, Skill) REFERENCES em.Lessons(LessonId, Skill),
        CONSTRAINT FK_PracticeAttempts_Recording FOREIGN KEY (RecordingAssetId, UserId, RecordingPurpose) REFERENCES em.MediaAssets(MediaAssetId, UserId, Purpose),
        CONSTRAINT UQ_PracticeAttempts_Session UNIQUE (StudySessionId),
        CONSTRAINT UQ_PracticeAttempts_Owner UNIQUE (AttemptId, UserId),
        CONSTRAINT UQ_PracticeAttempts_Lesson UNIQUE (AttemptId, LessonId),
        CONSTRAINT UQ_PracticeAttempts_Mode UNIQUE (AttemptId, Mode),
        CONSTRAINT CK_PracticeAttempts_Mode CHECK (
            (Skill = 'speaking' AND Mode = 'shadowing') OR
            (Skill = 'listening' AND Mode IN ('multiple_choice', 'dictation')) OR
            (Skill = 'writing' AND Mode = 'writing')),
        CONSTRAINT CK_PracticeAttempts_Recording CHECK (RecordingPurpose = 'recording' AND (RecordingAssetId IS NULL OR Skill = 'speaking')),
        CONSTRAINT CK_PracticeAttempts_Values CHECK ((ScorePercent IS NULL OR ScorePercent BETWEEN 0 AND 100) AND (PlaybackRate IS NULL OR PlaybackRate BETWEEN 0.50 AND 2.00)),
        CONSTRAINT CK_PracticeAttempts_Submitted CHECK (SubmittedAt IS NULL OR SubmittedAt >= CreatedAt)
    );

    CREATE TABLE em.AttemptAnswers (
        AttemptId bigint NOT NULL,
        QuestionId bigint NOT NULL,
        LessonId bigint NOT NULL,
        QuestionType varchar(16) NOT NULL,
        SelectedOptionId bigint NULL,
        AnswerText nvarchar(2000) NULL,
        IsCorrect bit NULL,
        AwardedPoints decimal(6,2) NULL,
        CONSTRAINT PK_AttemptAnswers PRIMARY KEY (AttemptId, QuestionId),
        CONSTRAINT FK_AttemptAnswers_Attempt FOREIGN KEY (AttemptId, LessonId) REFERENCES em.PracticeAttempts(AttemptId, LessonId),
        CONSTRAINT FK_AttemptAnswers_Question FOREIGN KEY (QuestionId, LessonId) REFERENCES em.LessonQuestions(QuestionId, LessonId),
        CONSTRAINT FK_AttemptAnswers_Type FOREIGN KEY (QuestionId, QuestionType) REFERENCES em.LessonQuestions(QuestionId, QuestionType),
        CONSTRAINT FK_AttemptAnswers_Mode FOREIGN KEY (AttemptId, QuestionType) REFERENCES em.PracticeAttempts(AttemptId, Mode),
        CONSTRAINT FK_AttemptAnswers_Option FOREIGN KEY (SelectedOptionId, QuestionId) REFERENCES em.QuestionOptions(OptionId, QuestionId),
        CONSTRAINT CK_AttemptAnswers_Value CHECK (
            (QuestionType = 'multiple_choice' AND SelectedOptionId IS NOT NULL AND AnswerText IS NULL) OR
            (QuestionType = 'dictation' AND SelectedOptionId IS NULL AND AnswerText IS NOT NULL AND LEN(LTRIM(RTRIM(AnswerText))) > 0)),
        CONSTRAINT CK_AttemptAnswers_Points CHECK (AwardedPoints IS NULL OR AwardedPoints >= 0)
    );

    CREATE TABLE em.AIEvaluations (
        EvaluationId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_AIEvaluations PRIMARY KEY,
        UserId bigint NOT NULL,
        MessageId bigint NULL,
        AttemptId bigint NULL,
        ClientRequestId uniqueidentifier NOT NULL,
        Provider varchar(64) NOT NULL,
        ModelName varchar(100) NULL,
        PromptVersion varchar(64) NOT NULL,
        IsMock bit NOT NULL DEFAULT 1,
        Status varchar(16) NOT NULL DEFAULT 'pending',
        Feedback nvarchar(max) NULL,
        ResultJson nvarchar(max) NULL,
        OverallScore decimal(5,2) NULL,
        InputTokens int NULL,
        OutputTokens int NULL,
        LatencyMs int NULL,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CompletedAt datetime2(3) NULL,
        CONSTRAINT FK_AIEvaluations_User FOREIGN KEY (UserId) REFERENCES em.Users(UserId),
        CONSTRAINT FK_AIEvaluations_Message FOREIGN KEY (MessageId, UserId) REFERENCES em.Messages(MessageId, UserId),
        CONSTRAINT FK_AIEvaluations_Attempt FOREIGN KEY (AttemptId, UserId) REFERENCES em.PracticeAttempts(AttemptId, UserId),
        CONSTRAINT UQ_AIEvaluations_Request UNIQUE (UserId, ClientRequestId),
        CONSTRAINT CK_AIEvaluations_Target CHECK ((MessageId IS NOT NULL AND AttemptId IS NULL) OR (MessageId IS NULL AND AttemptId IS NOT NULL)),
        CONSTRAINT CK_AIEvaluations_Status CHECK (Status IN ('pending', 'completed', 'failed', 'cancelled')),
        CONSTRAINT CK_AIEvaluations_Result CHECK (ResultJson IS NULL OR ISJSON(ResultJson) = 1),
        CONSTRAINT CK_AIEvaluations_Metrics CHECK (
            (OverallScore IS NULL OR OverallScore BETWEEN 0 AND 100) AND
            (InputTokens IS NULL OR InputTokens >= 0) AND (OutputTokens IS NULL OR OutputTokens >= 0) AND (LatencyMs IS NULL OR LatencyMs >= 0)),
        CONSTRAINT CK_AIEvaluations_Time CHECK (
            (Status = 'pending' AND CompletedAt IS NULL) OR
            (Status IN ('completed', 'failed', 'cancelled') AND CompletedAt IS NOT NULL AND CompletedAt >= CreatedAt)),
        CONSTRAINT CK_AIEvaluations_Mock CHECK ((Provider = 'mock' AND IsMock = 1) OR Provider <> 'mock')
    );

    CREATE TABLE em.ErrorRecords (
        ErrorRecordId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_ErrorRecords PRIMARY KEY,
        EvaluationId bigint NOT NULL,
        Category varchar(20) NOT NULL,
        OriginalText nvarchar(2000) NOT NULL,
        CorrectedText nvarchar(2000) NOT NULL,
        Explanation nvarchar(2000) NOT NULL,
        StartOffset int NULL,
        EndOffset int NULL,
        CONSTRAINT FK_ErrorRecords_Evaluation FOREIGN KEY (EvaluationId) REFERENCES em.AIEvaluations(EvaluationId),
        CONSTRAINT CK_ErrorRecords_Category CHECK (Category IN ('grammar', 'vocabulary', 'spelling', 'pronunciation', 'fluency', 'structure')),
        CONSTRAINT CK_ErrorRecords_Offsets CHECK (
            (StartOffset IS NULL AND EndOffset IS NULL) OR
            (StartOffset IS NOT NULL AND EndOffset IS NOT NULL AND StartOffset >= 0 AND EndOffset > StartOffset))
    );

    -- A private notebook entry stores the learner's meaning/example, not a shared dictionary.
    CREATE TABLE em.UserVocabulary (
        UserVocabularyId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_UserVocabulary PRIMARY KEY,
        UserId bigint NOT NULL,
        Word nvarchar(120) COLLATE Latin1_General_100_CI_AS_SC NOT NULL,
        Meaning nvarchar(1000) NOT NULL,
        Phonetic nvarchar(200) NULL,
        PartOfSpeech nvarchar(50) NULL,
        ExampleSentence nvarchar(2000) NULL,
        SourceMessageId bigint NULL,
        SourceAttemptId bigint NULL,
        IsMastered bit NOT NULL DEFAULT 0,
        NextReviewAt datetime2(3) NULL,
        LastReviewedAt datetime2(3) NULL,
        ReviewCount int NOT NULL DEFAULT 0,
        CreatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        ArchivedAt datetime2(3) NULL,
        Version rowversion NOT NULL,
        CONSTRAINT FK_UserVocabulary_User FOREIGN KEY (UserId) REFERENCES em.Users(UserId),
        CONSTRAINT FK_UserVocabulary_Message FOREIGN KEY (SourceMessageId, UserId) REFERENCES em.Messages(MessageId, UserId),
        CONSTRAINT FK_UserVocabulary_Attempt FOREIGN KEY (SourceAttemptId, UserId) REFERENCES em.PracticeAttempts(AttemptId, UserId),
        CONSTRAINT UQ_UserVocabulary_Owner UNIQUE (UserVocabularyId, UserId),
        CONSTRAINT CK_UserVocabulary_Text CHECK (LEN(LTRIM(RTRIM(Word))) > 0 AND LEN(LTRIM(RTRIM(Meaning))) > 0),
        CONSTRAINT CK_UserVocabulary_Count CHECK (ReviewCount >= 0),
        CONSTRAINT CK_UserVocabulary_Source CHECK (SourceMessageId IS NULL OR SourceAttemptId IS NULL)
    );
    CREATE UNIQUE INDEX UX_UserVocabulary_ActiveWord ON em.UserVocabulary(UserId, Word) WHERE ArchivedAt IS NULL;

    CREATE TABLE em.FlashcardSessions (
        FlashcardSessionId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_FlashcardSessions PRIMARY KEY,
        StudySessionId bigint NOT NULL,
        UserId bigint NOT NULL,
        ActivityType varchar(16) NOT NULL DEFAULT 'flashcard',
        ReviewAll bit NOT NULL DEFAULT 0,
        SchedulerVersion varchar(32) NOT NULL DEFAULT 'demo-0-1-4-7-v1',
        CONSTRAINT FK_FlashcardSessions_Study FOREIGN KEY (StudySessionId, UserId, ActivityType) REFERENCES em.StudySessions(StudySessionId, UserId, ActivityType),
        CONSTRAINT UQ_FlashcardSessions_Study UNIQUE (StudySessionId),
        CONSTRAINT UQ_FlashcardSessions_Owner UNIQUE (FlashcardSessionId, UserId),
        CONSTRAINT CK_FlashcardSessions_Type CHECK (ActivityType = 'flashcard')
    );

    CREATE TABLE em.FlashcardReviews (
        FlashcardReviewId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_FlashcardReviews PRIMARY KEY,
        FlashcardSessionId bigint NOT NULL,
        UserVocabularyId bigint NOT NULL,
        UserId bigint NOT NULL,
        ClientRequestId uniqueidentifier NOT NULL,
        Rating varchar(8) NOT NULL,
        IntervalDays int NOT NULL,
        ReviewedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        LocalReviewDate date NOT NULL,
        UtcOffsetMinutes smallint NOT NULL,
        NextReviewAt datetime2(3) NOT NULL,
        CONSTRAINT FK_FlashcardReviews_Session FOREIGN KEY (FlashcardSessionId, UserId) REFERENCES em.FlashcardSessions(FlashcardSessionId, UserId),
        CONSTRAINT FK_FlashcardReviews_Word FOREIGN KEY (UserVocabularyId, UserId) REFERENCES em.UserVocabulary(UserVocabularyId, UserId),
        CONSTRAINT UQ_FlashcardReviews_Request UNIQUE (UserId, ClientRequestId),
        CONSTRAINT CK_FlashcardReviews_Rating CHECK (Rating IN ('again', 'hard', 'good', 'easy')),
        CONSTRAINT CK_FlashcardReviews_Time CHECK (IntervalDays >= 0 AND NextReviewAt >= ReviewedAt AND UtcOffsetMinutes BETWEEN -840 AND 840)
    );

    CREATE INDEX IX_MediaAssets_User ON em.MediaAssets(UserId, Purpose);
    CREATE INDEX IX_AuthSessions_User ON em.AuthSessions(UserId, ExpiresAt) INCLUDE (RevokedAt);
    CREATE INDEX IX_AccountTokens_User ON em.AccountTokens(UserId, Purpose, ExpiresAt) INCLUDE (UsedAt);
    CREATE INDEX IX_Lessons_Browse ON em.Lessons(Skill, IsPublished, TopicId) INCLUDE (Title, MinLevel, MaxLevel);
    CREATE INDEX IX_StudySessions_Daily ON em.StudySessions(UserId, LocalStudyDate, Status) INCLUDE (DurationSeconds, ActivityType, DailyGoalMinutes);
    CREATE INDEX IX_Conversations_User ON em.Conversations(UserId, CreatedAt DESC);
    CREATE INDEX IX_PracticeAttempts_User ON em.PracticeAttempts(UserId, CreatedAt DESC) INCLUDE (Skill, ScorePercent);
    CREATE INDEX IX_AIEvaluations_Message ON em.AIEvaluations(MessageId, CreatedAt DESC) WHERE MessageId IS NOT NULL;
    CREATE INDEX IX_AIEvaluations_Attempt ON em.AIEvaluations(AttemptId, CreatedAt DESC) WHERE AttemptId IS NOT NULL;
    CREATE INDEX IX_ErrorRecords_Evaluation ON em.ErrorRecords(EvaluationId, Category);
    CREATE INDEX IX_UserVocabulary_Due ON em.UserVocabulary(UserId, NextReviewAt) INCLUDE (Word, IsMastered) WHERE ArchivedAt IS NULL;
    CREATE INDEX IX_FlashcardReviews_Session ON em.FlashcardReviews(FlashcardSessionId, ReviewedAt);
    CREATE INDEX IX_FlashcardReviews_Word ON em.FlashcardReviews(UserVocabularyId, ReviewedAt DESC);
    CREATE INDEX IX_FlashcardReviews_User ON em.FlashcardReviews(UserId, LocalReviewDate);

    INSERT INTO em.SchemaVersions(Version, Description) VALUES (1, N'Initial EngMate-AI SQL Server schema');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
