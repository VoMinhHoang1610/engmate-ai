SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER VIEW em.vUserLearningStats
AS
SELECT u.UserId,
    COALESCE(s.TotalStudySeconds, 0) AS TotalStudySeconds,
    CAST(COALESCE(s.TotalStudySeconds, 0) / 60.0 AS decimal(18,2)) AS TotalStudyMinutes,
    COALESCE(v.SavedWordCount, 0) AS SavedWordCount,
    COALESCE(v.MasteredWordCount, 0) AS MasteredWordCount,
    COALESCE(r.ReviewCount, 0) AS ReviewCount
FROM em.Users u
LEFT JOIN (
    SELECT UserId, SUM(CAST(DurationSeconds AS bigint)) AS TotalStudySeconds
    FROM em.StudySessions WHERE Status = 'completed' GROUP BY UserId
) s ON s.UserId = u.UserId
LEFT JOIN (
    SELECT UserId, COUNT_BIG(*) AS SavedWordCount,
        SUM(CAST(IsMastered AS bigint)) AS MasteredWordCount
    FROM em.UserVocabulary WHERE ArchivedAt IS NULL GROUP BY UserId
) v ON v.UserId = u.UserId
LEFT JOIN (
    SELECT UserId, COUNT_BIG(*) AS ReviewCount
    FROM em.FlashcardReviews GROUP BY UserId
) r ON r.UserId = u.UserId;
GO
CREATE OR ALTER VIEW em.vDailyLearningStats
AS
SELECT COALESCE(s.UserId, r.UserId) AS UserId,
    COALESCE(s.LocalStudyDate, r.LocalReviewDate) AS LocalStudyDate,
    COALESCE(s.StudySeconds, 0) AS StudySeconds,
    CAST(COALESCE(s.StudySeconds, 0) / 60.0 AS decimal(18,2)) AS StudyMinutes,
    COALESCE(r.ReviewCount, 0) AS ReviewCount,
    COALESCE(s.CompletedSessionCount, 0) AS CompletedSessionCount
FROM (
    SELECT UserId, LocalStudyDate, SUM(CAST(DurationSeconds AS bigint)) AS StudySeconds,
        COUNT_BIG(*) AS CompletedSessionCount
    FROM em.StudySessions WHERE Status = 'completed' GROUP BY UserId, LocalStudyDate
) s
FULL OUTER JOIN (
    SELECT UserId, LocalReviewDate, COUNT_BIG(*) AS ReviewCount
    FROM em.FlashcardReviews GROUP BY UserId, LocalReviewDate
) r ON r.UserId = s.UserId AND r.LocalReviewDate = s.LocalStudyDate;
GO
