-- Chỉ đọc. Chạy sau gemini-code-1791478978574.sql trong database EngMateAI mới.
USE EngMateAI;

SELECT CASE WHEN COUNT(*) = 7 THEN 'PASS' ELSE 'FAIL' END AS SevenLevels
FROM TrinhDoCEFR;

SELECT Code, Name, SortOrder FROM TrinhDoCEFR ORDER BY SortOrder;

-- Mỗi mức: 3 Speaking, 1 Listening, 1 Reading, 4 Writing.
SELECT MinLevel, Skill, COUNT(*) AS LessonCount
FROM BaiHoc GROUP BY MinLevel, Skill ORDER BY MinLevel, Skill;

-- Kết quả phải rỗng: trắc nghiệm đã xuất bản có >=2 lựa chọn và đúng 1 đáp án.
SELECT q.QuestionId, l.Code, COUNT(o.OptionId) AS OptionCount, SUM(o.IsCorrect) AS CorrectCount
FROM CauHoiBaiHoc q
JOIN BaiHoc l ON l.LessonId = q.LessonId
LEFT JOIN LuaChonCauHoi o ON o.QuestionId = q.QuestionId
WHERE q.QuestionType = 'multiple_choice' AND l.IsPublished = 1
GROUP BY q.QuestionId, l.Code
HAVING COUNT(o.OptionId) < 2 OR SUM(o.IsCorrect) <> 1;

SELECT
    (SELECT COUNT(*) FROM BaiHoc) = 63 AS LessonsPass,
    (SELECT COUNT(*) FROM CauHoiBaiHoc) = 35 AS QuestionsPass,
    (SELECT COUNT(*) FROM LuaChonCauHoi) = 84 AS OptionsPass,
    (SELECT COUNT(*) FROM TuVungBaiHoc) = 22 AS VocabularyPass;
