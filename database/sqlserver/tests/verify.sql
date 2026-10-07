-- Run from database/sqlserver using sqlcmd -S localhost -E -d tempdb -b -f 65001 -i tests/verify.sql
-- Every schema/data change is rolled back. Refuses an existing em schema.
:ON ERROR EXIT
SET NOCOUNT ON;
IF DB_NAME() <> N'tempdb' THROW 51001, 'Verification is allowed only in tempdb.', 1;
IF SCHEMA_ID(N'em') IS NOT NULL THROW 51002, 'tempdb.em already exists; verification refuses to touch it.', 1;
BEGIN TRANSACTION;
GO
:r 001_schema.sql
GO
:r 002_seed_catalog.sql
GO
:r 002_seed_catalog.sql
GO
:r 003_views.sql
GO
:r 004_example_queries.sql
GO
SET XACT_ABORT OFF;
CREATE TABLE #Checks (Name nvarchar(200) NOT NULL);
EXEC(N'CREATE PROCEDURE #ExpectError @Name nvarchar(200), @Sql nvarchar(max), @Expected int AS
BEGIN
    BEGIN TRY
        EXEC sp_executesql @Sql;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() <> @Expected THROW;
        INSERT INTO #Checks VALUES (@Name);
        RETURN;
    END CATCH;
    THROW 51003, ''Expected a constraint error but the statement succeeded.'', 1;
END;');

IF (SELECT COUNT(*) FROM em.Topics) <> 8 OR (SELECT COUNT(*) FROM em.Lessons) <> 9
    OR (SELECT COUNT(*) FROM em.LessonQuestions) <> 4 OR (SELECT COUNT(*) FROM em.QuestionOptions) <> 6
    THROW 51004, 'Catalog content or seed idempotency failed.', 1;
INSERT INTO #Checks VALUES (N'Catalog seed is idempotent: 8 topics, 9 lessons, 4 questions, 6 options');
IF (SELECT COUNT(*) FROM sys.tables WHERE schema_id = SCHEMA_ID(N'em')) <> 22
    OR (SELECT COUNT(*) FROM sys.views WHERE schema_id = SCHEMA_ID(N'em')) <> 2
    THROW 51013, 'Expected 22 tables and two views.', 1;
INSERT INTO #Checks VALUES (N'All 22 tables and two views compile');

INSERT INTO em.Users(Username, Email) VALUES (N'learner-a', N'a@example.invalid'), (N'learner-b', N'b@example.invalid');
DECLARE @A bigint = (SELECT UserId FROM em.Users WHERE Username = N'learner-a');
DECLARE @B bigint = (SELECT UserId FROM em.Users WHERE Username = N'learner-b');
INSERT INTO em.LearnerProfiles(UserId, DisplayName) VALUES (@A, N'Người học Á'), (@B, N'Người học B');
INSERT INTO em.UserSettings(UserId) VALUES (@A), (@B);
IF (SELECT DisplayName FROM em.LearnerProfiles WHERE UserId = @A) <> N'Người học Á'
    THROW 51005, 'Unicode roundtrip failed.', 1;
INSERT INTO #Checks VALUES (N'Unicode profile roundtrip');

EXEC #ExpectError N'Case-insensitive username', N'INSERT INTO em.Users(Username, Email) VALUES (N''LEARNER-A'', N''c@example.invalid'')', 2627;
EXEC #ExpectError N'Case-insensitive email', N'INSERT INTO em.Users(Username, Email) VALUES (N''learner-c'', N''A@EXAMPLE.INVALID'')', 2627;
EXEC #ExpectError N'CEFR restriction', N'UPDATE em.LearnerProfiles SET CefrLevel = ''C2''', 547;
EXEC #ExpectError N'Daily learning goal range', N'UPDATE em.LearnerProfiles SET DailyGoalMinutes = 5', 547;
EXEC #ExpectError N'Theme restriction', N'UPDATE em.UserSettings SET Theme = ''invalid''', 547;
EXEC #ExpectError N'Speech rate restriction', N'UPDATE em.UserSettings SET SpeechRate = 0.50', 547;
EXEC #ExpectError N'Account token expiration', N'INSERT INTO em.AccountTokens(UserId, Purpose, TokenHash, ExpiresAt) SELECT MIN(UserId), ''reset_password'', HASHBYTES(''SHA2_256'', ''test-only''), ''2000-01-01'' FROM em.Users', 547;

INSERT INTO em.StudySessions(UserId, ClientRequestId, ActivityType, Status, StartedAt, EndedAt, DurationSeconds, LocalStudyDate, UtcOffsetMinutes, DailyGoalMinutes)
VALUES (@A, NEWID(), 'conversation', 'completed', '2026-10-06T17:01:00', '2026-10-06T17:03:00', 120, '2026-10-07', 420, 20);
DECLARE @ChatStudy bigint = SCOPE_IDENTITY();
INSERT INTO em.Conversations(StudySessionId, UserId, TopicId, Title, CefrLevel, AIRoleSnapshot, PromptVersion)
SELECT @ChatStudy, @A, TopicId, N'Cà phê', 'A2', AIRole, 'persona.v1' FROM em.Topics WHERE Code = 'coffee';
DECLARE @Conversation bigint = SCOPE_IDENTITY();
INSERT INTO em.Messages(ConversationId, UserId, ClientRequestId, SequenceNumber, Role, Content)
VALUES (@Conversation, @A, NEWID(), 0, 'user', N'I would like coffee.');
DECLARE @Message bigint = SCOPE_IDENTITY();

EXEC #ExpectError N'Duplicate study request', N'INSERT INTO em.StudySessions(UserId, ClientRequestId, ActivityType, LocalStudyDate, UtcOffsetMinutes, DailyGoalMinutes) SELECT UserId, ClientRequestId, ActivityType, LocalStudyDate, UtcOffsetMinutes, DailyGoalMinutes FROM em.StudySessions', 2627;
EXEC #ExpectError N'Cross-owner conversation', N'UPDATE em.Conversations SET UserId = (SELECT MAX(UserId) FROM em.Users)', 547;
EXEC #ExpectError N'Cross-owner message', N'UPDATE em.Messages SET UserId = (SELECT MAX(UserId) FROM em.Users)', 547;
EXEC #ExpectError N'Duplicate message sequence', N'INSERT INTO em.Messages(ConversationId, UserId, ClientRequestId, SequenceNumber, Role, Content) SELECT ConversationId, UserId, NEWID(), SequenceNumber, Role, Content FROM em.Messages', 2627;
EXEC #ExpectError N'Negative duration', N'UPDATE em.StudySessions SET DurationSeconds = -1', 547;
EXEC #ExpectError N'Completed session requires end time', N'UPDATE em.StudySessions SET EndedAt = NULL', 547;

DECLARE @Lesson bigint = (SELECT LessonId FROM em.Lessons WHERE Code = 'listening-cafe');
INSERT INTO em.StudySessions(UserId, ClientRequestId, ActivityType, LocalStudyDate, UtcOffsetMinutes, DailyGoalMinutes)
VALUES (@A, NEWID(), 'listening', '2026-10-07', 420, 20);
DECLARE @ListeningStudy bigint = SCOPE_IDENTITY();
INSERT INTO em.PracticeAttempts(StudySessionId, UserId, LessonId, Skill, Mode, PlaybackRate)
VALUES (@ListeningStudy, @A, @Lesson, 'listening', 'multiple_choice', 0.85);
DECLARE @Attempt bigint = SCOPE_IDENTITY();
DECLARE @Question bigint = (SELECT QuestionId FROM em.LessonQuestions WHERE LessonId = @Lesson AND Position = 1);
DECLARE @Option bigint = (SELECT OptionId FROM em.QuestionOptions WHERE QuestionId = @Question AND IsCorrect = 1);
INSERT INTO em.AttemptAnswers(AttemptId, QuestionId, LessonId, QuestionType, SelectedOptionId, IsCorrect, AwardedPoints)
VALUES (@Attempt, @Question, @Lesson, 'multiple_choice', @Option, 1, 1);
INSERT INTO #Checks VALUES (N'Valid listening attempt and answer');

EXEC #ExpectError N'Lesson skill mismatch', N'UPDATE em.PracticeAttempts SET LessonId = (SELECT TOP (1) LessonId FROM em.Lessons WHERE Skill = ''writing'')', 547;
EXEC #ExpectError N'Question from another lesson', N'UPDATE em.AttemptAnswers SET QuestionId = (SELECT q.QuestionId FROM em.LessonQuestions q JOIN em.Lessons l ON l.LessonId = q.LessonId WHERE l.Code = ''listening-opportunity'' AND q.Position = 1)', 547;
EXEC #ExpectError N'Option from another question', N'UPDATE em.AttemptAnswers SET SelectedOptionId = (SELECT MAX(OptionId) FROM em.QuestionOptions)', 547;
EXEC #ExpectError N'Exactly one correct option at most', N'UPDATE em.QuestionOptions SET IsCorrect = 1 WHERE Position = 1', 2601;
EXEC #ExpectError N'Invalid score', N'UPDATE em.PracticeAttempts SET ScorePercent = 101', 547;
EXEC #ExpectError N'Answer type must match attempt mode', N'UPDATE em.AttemptAnswers SET QuestionType = ''dictation'', SelectedOptionId = NULL, AnswerText = N''Hello''', 547;

INSERT INTO em.MediaAssets(UserId, Purpose, StorageKey, ContentType, SizeBytes)
VALUES (@A, 'recording', N'test-only/recording-a', 'audio/webm', 128),
       (@B, 'recording', N'test-only/recording-b', 'audio/webm', 128);
INSERT INTO em.StudySessions(UserId, ClientRequestId, ActivityType, LocalStudyDate, UtcOffsetMinutes, DailyGoalMinutes)
VALUES (@A, NEWID(), 'speaking', '2026-10-07', 420, 20);
DECLARE @SpeakingStudy bigint = SCOPE_IDENTITY();
INSERT INTO em.PracticeAttempts(StudySessionId, UserId, LessonId, Skill, Mode, RecordingAssetId)
SELECT @SpeakingStudy, @A, l.LessonId, 'speaking', 'shadowing', m.MediaAssetId
FROM em.Lessons l JOIN em.MediaAssets m ON m.UserId = @A AND m.Purpose = 'recording'
WHERE l.Code = 'speaking-coffee';
INSERT INTO #Checks VALUES (N'Valid speaking attempt with owned recording');
EXEC #ExpectError N'Cross-owner recording', N'UPDATE em.PracticeAttempts SET RecordingAssetId = (SELECT MAX(MediaAssetId) FROM em.MediaAssets) WHERE Skill = ''speaking''', 547;
EXEC #ExpectError N'Wrong asset purpose for avatar', N'UPDATE em.LearnerProfiles SET AvatarAssetId = (SELECT MAX(MediaAssetId) FROM em.MediaAssets) WHERE UserId = (SELECT MAX(UserId) FROM em.Users)', 547;
INSERT INTO em.MediaAssets(UserId, Purpose, StorageKey, ContentType, SizeBytes)
VALUES (@A, 'avatar', N'test-only/avatar-a', 'image/png', 128);
UPDATE em.LearnerProfiles SET AvatarAssetId = SCOPE_IDENTITY() WHERE UserId = @A;
INSERT INTO #Checks VALUES (N'Valid owned avatar');

INSERT INTO em.StudySessions(UserId, ClientRequestId, ActivityType, LocalStudyDate, UtcOffsetMinutes, DailyGoalMinutes)
VALUES (@A, NEWID(), 'writing', '2026-10-07', 420, 20);
DECLARE @WritingStudy bigint = SCOPE_IDENTITY();
INSERT INTO em.PracticeAttempts(StudySessionId, UserId, LessonId, Skill, Mode, SubmittedText)
SELECT @WritingStudy, @A, LessonId, 'writing', 'writing', N'I am learning English.'
FROM em.Lessons WHERE Code = 'writing-paragraph';
INSERT INTO #Checks VALUES (N'Valid writing draft');
EXEC #ExpectError N'Cross-owner practice attempt', N'UPDATE em.PracticeAttempts SET UserId = (SELECT MAX(UserId) FROM em.Users) WHERE Skill = ''writing''', 547;

INSERT INTO em.AIEvaluations(UserId, MessageId, ClientRequestId, Provider, PromptVersion, Status, CompletedAt, ResultJson)
VALUES (@A, @Message, NEWID(), 'mock', 'persona.v1', 'completed', DATEADD(second, 1, SYSUTCDATETIME()), N'{"grammar":90}');
DECLARE @Evaluation bigint = SCOPE_IDENTITY();
INSERT INTO em.ErrorRecords(EvaluationId, Category, OriginalText, CorrectedText, Explanation, StartOffset, EndOffset)
VALUES (@Evaluation, 'grammar', N'I am study', N'I am studying', N'Thì hiện tại tiếp diễn.', 0, 10);
INSERT INTO #Checks VALUES (N'Valid mock evaluation with structured error');
EXEC #ExpectError N'Cross-owner evaluation', N'UPDATE em.AIEvaluations SET UserId = (SELECT MAX(UserId) FROM em.Users)', 547;
EXEC #ExpectError N'Evaluation target is exclusive', N'UPDATE em.AIEvaluations SET AttemptId = (SELECT MAX(AttemptId) FROM em.PracticeAttempts)', 547;
EXEC #ExpectError N'Malformed evaluation JSON', N'UPDATE em.AIEvaluations SET ResultJson = N''broken''', 547;
EXEC #ExpectError N'Mock provider must be labeled', N'UPDATE em.AIEvaluations SET IsMock = 0', 547;
EXEC #ExpectError N'Invalid error span', N'UPDATE em.ErrorRecords SET StartOffset = 10, EndOffset = 5', 547;

INSERT INTO em.UserVocabulary(UserId, Word, Meaning) VALUES (@A, N'confident', N'tự tin'), (@B, N'confident', N'tự tin');
DECLARE @WordA bigint = (SELECT UserVocabularyId FROM em.UserVocabulary WHERE UserId = @A);
EXEC #ExpectError N'Duplicate active notebook word', N'INSERT INTO em.UserVocabulary(UserId, Word, Meaning) SELECT MIN(UserId), N''CONFIDENT'', N''tự tin'' FROM em.Users', 2601;
EXEC #ExpectError N'Cross-owner vocabulary source', N'UPDATE em.UserVocabulary SET SourceMessageId = (SELECT MIN(MessageId) FROM em.Messages) WHERE UserId = (SELECT MAX(UserId) FROM em.Users)', 547;
INSERT INTO em.StudySessions(UserId, ClientRequestId, ActivityType, Status, StartedAt, EndedAt, DurationSeconds, LocalStudyDate, UtcOffsetMinutes, DailyGoalMinutes)
VALUES (@A, NEWID(), 'flashcard', 'completed', '2026-10-06T17:05:00', '2026-10-06T17:08:00', 180, '2026-10-07', 420, 20);
DECLARE @FlashStudy bigint = SCOPE_IDENTITY();
INSERT INTO em.FlashcardSessions(StudySessionId, UserId) VALUES (@FlashStudy, @A);
DECLARE @Flash bigint = SCOPE_IDENTITY();
INSERT INTO em.FlashcardReviews(FlashcardSessionId, UserVocabularyId, UserId, ClientRequestId, Rating, IntervalDays, ReviewedAt, LocalReviewDate, UtcOffsetMinutes, NextReviewAt)
VALUES (@Flash, @WordA, @A, NEWID(), 'again', 0, '2026-10-06T17:06:00', '2026-10-07', 420, '2026-10-06T17:06:00'),
       (@Flash, @WordA, @A, NEWID(), 'good', 4, '2026-10-06T17:07:00', '2026-10-07', 420, '2026-10-10T17:07:00');
EXEC #ExpectError N'Cross-owner flashcard review', N'UPDATE em.FlashcardReviews SET UserVocabularyId = (SELECT MAX(UserVocabularyId) FROM em.UserVocabulary)', 547;
EXEC #ExpectError N'Duplicate flashcard request', N'INSERT INTO em.FlashcardReviews(FlashcardSessionId, UserVocabularyId, UserId, ClientRequestId, Rating, IntervalDays, ReviewedAt, LocalReviewDate, UtcOffsetMinutes, NextReviewAt) SELECT TOP (1) FlashcardSessionId, UserVocabularyId, UserId, ClientRequestId, Rating, IntervalDays, ReviewedAt, LocalReviewDate, UtcOffsetMinutes, NextReviewAt FROM em.FlashcardReviews', 2627;
EXEC #ExpectError N'Flashcard next review before current review', N'UPDATE em.FlashcardReviews SET NextReviewAt = ''2000-01-01''', 547;

IF NOT EXISTS (SELECT 1 FROM em.vUserLearningStats WHERE UserId = @A AND TotalStudySeconds = 300 AND TotalStudyMinutes = 5 AND SavedWordCount = 1 AND ReviewCount = 2)
    THROW 51006, 'Dashboard totals must not multiply duration by review count.', 1;
IF NOT EXISTS (SELECT 1 FROM em.vUserLearningStats WHERE UserId = @B AND TotalStudySeconds = 0 AND SavedWordCount = 1 AND ReviewCount = 0)
    THROW 51007, 'Dashboard isolation or empty-history default failed.', 1;
INSERT INTO #Checks VALUES (N'Lifetime totals, empty history, and owner isolation');
IF NOT EXISTS (SELECT 1 FROM em.vDailyLearningStats WHERE UserId = @A AND LocalStudyDate = '2026-10-07' AND StudySeconds = 300 AND ReviewCount = 2)
    THROW 51008, 'Local date dashboard failed.', 1;
INSERT INTO #Checks VALUES (N'Vietnam date boundary: UTC Oct 6, local Oct 7');
IF NOT EXISTS (SELECT 1 FROM em.UserVocabulary WHERE UserId = @A AND NextReviewAt IS NULL AND ArchivedAt IS NULL)
    THROW 51009, 'New vocabulary must be immediately due.', 1;
INSERT INTO #Checks VALUES (N'New cards are immediately due');

UPDATE em.UserVocabulary SET ArchivedAt = SYSUTCDATETIME() WHERE UserVocabularyId = @WordA;
INSERT INTO em.UserVocabulary(UserId, Word, Meaning) VALUES (@A, N'confident', N'tự tin mới');
IF (SELECT ReviewCount FROM em.vUserLearningStats WHERE UserId = @A) <> 2
    OR (SELECT SavedWordCount FROM em.vUserLearningStats WHERE UserId = @A) <> 1
    THROW 51010, 'Archiving a word must preserve review history and permit re-adding.', 1;
INSERT INTO #Checks VALUES (N'Archive keeps history and permits re-adding');

INSERT INTO em.FlashcardReviews(FlashcardSessionId, UserVocabularyId, UserId, ClientRequestId, Rating, IntervalDays, ReviewedAt, LocalReviewDate, UtcOffsetMinutes, NextReviewAt)
VALUES (@Flash, @WordA, @A, NEWID(), 'hard', 1, '2026-10-07T17:01:00', '2026-10-08', 420, '2026-10-08T17:01:00');
IF NOT EXISTS (SELECT 1 FROM em.vDailyLearningStats WHERE UserId = @A AND LocalStudyDate = '2026-10-08' AND StudySeconds = 0 AND ReviewCount = 1)
    THROW 51014, 'Review-only day must appear even when the study session started on another day.', 1;
INSERT INTO #Checks VALUES (N'Review-only day and session crossing midnight');

DECLARE @Passed int = (SELECT COUNT(*) FROM #Checks);
SELECT Name AS PassedCheck FROM #Checks ORDER BY Name;
IF @@TRANCOUNT <> 1 THROW 51011, 'Unexpected transaction state.', 1;
ROLLBACK TRANSACTION;
IF SCHEMA_ID(N'em') IS NOT NULL THROW 51012, 'Test schema was not rolled back.', 1;
SELECT @Passed AS PassedChecks, N'All changes rolled back; tempdb.em absent.' AS Result;
GO
