-- Read-only examples; replace the parameters with values from the authenticated backend.
DECLARE @UserId bigint = -1;
DECLARE @Today date = CONVERT(date, DATEADD(minute, 420, SYSUTCDATETIME()));
DECLARE @Now datetime2(3) = SYSUTCDATETIME();

-- Dashboard: all-time statistics plus today's learning goal.
SELECT p.DisplayName, p.CefrLevel, p.DailyGoalMinutes, s.*,
    COALESCE(d.StudyMinutes, 0) AS TodayStudyMinutes,
    COALESCE(d.ReviewCount, 0) AS TodayReviewCount
FROM em.LearnerProfiles p
JOIN em.vUserLearningStats s ON s.UserId = p.UserId
LEFT JOIN em.vDailyLearningStats d ON d.UserId = p.UserId AND d.LocalStudyDate = @Today
WHERE p.UserId = @UserId;

-- Due flashcards: NULL means a new card that can be reviewed immediately.
SELECT UserVocabularyId, Word, Meaning, Phonetic, PartOfSpeech, ExampleSentence, IsMastered, NextReviewAt, Version
FROM em.UserVocabulary
WHERE UserId = @UserId AND ArchivedAt IS NULL AND (NextReviewAt IS NULL OR NextReviewAt <= @Now)
ORDER BY NextReviewAt, UserVocabularyId;

-- Conversation list; use keyset pagination for long histories.
SELECT TOP (20) ConversationId, Title, CefrLevel, TopicId, CreatedAt
FROM em.Conversations WHERE UserId = @UserId ORDER BY CreatedAt DESC, ConversationId DESC;

-- Ordered messages, always scoped to the authenticated owner.
DECLARE @ConversationId bigint = -1;
SELECT MessageId, Role, Content, Status, CreatedAt
FROM em.Messages WHERE ConversationId = @ConversationId AND UserId = @UserId ORDER BY SequenceNumber;

-- Error patterns: mock outputs excluded from real learning assessments.
SELECT e.Category, COUNT_BIG(*) AS Occurrences
FROM em.ErrorRecords e
JOIN em.AIEvaluations a ON a.EvaluationId = e.EvaluationId
WHERE a.UserId = @UserId AND a.Status = 'completed' AND a.IsMock = 0
GROUP BY e.Category;
