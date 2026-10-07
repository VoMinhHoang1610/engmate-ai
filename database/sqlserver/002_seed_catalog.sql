-- Re-runnable catalog seed. No accounts, password hashes, tokens, or private notebook data.
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;
    INSERT INTO em.Topics(Code, Name, Description, AIRole, OpeningMessage, MinLevel, MaxLevel, ColorKey, IconKey, SortOrder)
    SELECT s.* FROM (VALUES
        ('coffee', N'Một tách cà phê', N'Gọi đồ uống và bắt chuyện tại quán cà phê.', N'Barista', N'Hi there! Welcome to our café. What can I get for you today?', 'A2', 'A2', 'peach', 'coffee', 1),
        ('travel', N'Chuyến đi tiếp theo', N'Hỏi đường, đặt phòng và khám phá thành phố.', N'Travel guide', N'Welcome to London! What would you like to explore first?', 'A2', 'B1', 'blue', 'compass', 2),
        ('work', N'Ngày đầu đi làm', N'Giới thiệu bản thân và trao đổi với đồng nghiệp.', N'Colleague', N'Hi, I’m Alex, your new colleague. Could you tell me a little about yourself?', 'B1', 'B1', 'purple', 'briefcase', 3),
        ('food', N'Bữa tối ngon miệng', N'Đặt bàn, gọi món và đưa ra yêu cầu riêng.', N'Waiter', N'Good evening! Do you have a reservation with us tonight?', 'A2', 'A2', 'pink', 'food', 4),
        ('shopping', N'Đi mua sắm', N'Hỏi giá, chọn kích cỡ và đổi trả sản phẩm.', N'Shop assistant', N'Hello! Are you looking for anything in particular today?', 'A2', 'B1', 'green', 'bag', 5),
        ('school', N'Cuộc sống sinh viên', N'Chia sẻ việc học, sở thích và kế hoạch mới.', N'Classmate', N'Hey! What do you enjoy most about your studies?', 'B1', 'B1', 'yellow', 'cap', 6),
        ('technology', N'Thế giới công nghệ', N'Thảo luận về AI và công nghệ trong cuộc sống.', N'Tech enthusiast', N'How do you think technology has changed the way we learn?', 'B2', 'B2', 'blue', 'sparkles', 7),
        ('interview', N'Phỏng vấn tự tin', N'Luyện trả lời về kinh nghiệm và điểm mạnh.', N'Interviewer', N'Thanks for coming in today. Could you tell me about your strengths?', 'B1', 'B2', 'purple', 'briefcase', 8)
    ) s(Code, Name, Description, AIRole, OpeningMessage, MinLevel, MaxLevel, ColorKey, IconKey, SortOrder)
    WHERE NOT EXISTS (SELECT 1 FROM em.Topics t WITH (UPDLOCK, HOLDLOCK) WHERE t.Code = s.Code);

    INSERT INTO em.Lessons(Code, Revision, TopicId, Skill, Format, Title, Instruction, Content, MinLevel, MaxLevel, EstimatedMinutes, IsPublished)
    SELECT s.Code, 1, t.TopicId, s.Skill, s.Format, s.Title, s.Instruction, s.Content, 'A2', 'B1', s.Minutes, 1
    FROM (VALUES
        ('speaking-coffee', 'coffee', 'speaking', 'shadowing', N'Gọi cà phê', N'Lắng nghe và lặp lại câu mẫu.', N'I would like a cup of coffee, please.', 2),
        ('speaking-confidence', NULL, 'speaking', 'shadowing', N'Nói tự tin', N'Lắng nghe và lặp lại câu mẫu.', N'I feel more confident speaking English.', 2),
        ('speaking-directions', 'travel', 'speaking', 'shadowing', N'Hỏi đường', N'Lắng nghe và lặp lại câu mẫu.', N'Could you tell me how to get to the station?', 2),
        ('listening-cafe', 'coffee', 'listening', 'mixed', N'A morning at the café', N'Nghe và chọn đáp án hoặc chép chính tả.', N'Good morning! I''d like a takeaway coffee, please. A small latte with oat milk. I have a meeting at nine, so I''m in a hurry. Thank you!', 3),
        ('listening-opportunity', 'work', 'listening', 'mixed', N'An exciting opportunity', N'Nghe và chọn đáp án hoặc chép chính tả.', N'I have an interview tomorrow. It is a great opportunity to join a new team. I feel confident because I have three years of experience. I want to improve my skills.', 3),
        ('writing-sentence', NULL, 'writing', 'sentence', N'Câu ngắn', N'Viết một câu về điều bạn muốn cải thiện trong tiếng Anh.', NULL, 5),
        ('writing-paragraph', NULL, 'writing', 'paragraph', N'Đoạn văn', N'Giới thiệu bản thân, sở thích và mục tiêu học tiếng Anh (50–100 từ).', NULL, 5),
        ('writing-email', 'work', 'writing', 'email', N'Email', N'Viết email cho đồng nghiệp để đề nghị một cuộc họp vào tuần tới.', NULL, 5),
        ('writing-essay', 'technology', 'writing', 'essay', N'Bài luận', N'Công nghệ giúp chúng ta học ngoại ngữ như thế nào? Chia sẻ quan điểm của bạn.', NULL, 5)
    ) s(Code, TopicCode, Skill, Format, Title, Instruction, Content, Minutes)
    LEFT JOIN em.Topics t ON t.Code = s.TopicCode
    WHERE NOT EXISTS (SELECT 1 FROM em.Lessons l WITH (UPDLOCK, HOLDLOCK) WHERE l.Code = s.Code AND l.Revision = 1);
    -- Writing levels are a provisional content classification; the current UI does not specify them.

    INSERT INTO em.LessonQuestions(LessonId, Position, QuestionType, Prompt, ExpectedText)
    SELECT l.LessonId, s.Position, s.QuestionType, s.Prompt, s.ExpectedText
    FROM (VALUES
        ('listening-cafe', 1, 'multiple_choice', N'What does the customer order?', CAST(NULL AS nvarchar(2000))),
        ('listening-cafe', 2, 'dictation', N'Chép lại câu đã nghe.', N'I''d like a takeaway coffee, please.'),
        ('listening-opportunity', 1, 'multiple_choice', N'How much experience does the speaker have?', NULL),
        ('listening-opportunity', 2, 'dictation', N'Chép lại câu đã nghe.', N'I feel confident because I have three years of experience.')
    ) s(Code, Position, QuestionType, Prompt, ExpectedText)
    JOIN em.Lessons l ON l.Code = s.Code AND l.Revision = 1
    WHERE NOT EXISTS (SELECT 1 FROM em.LessonQuestions q WITH (UPDLOCK, HOLDLOCK) WHERE q.LessonId = l.LessonId AND q.Position = s.Position);

    INSERT INTO em.QuestionOptions(QuestionId, Position, Text, IsCorrect)
    SELECT q.QuestionId, s.Position, s.Text, s.IsCorrect
    FROM (VALUES
        ('listening-cafe', 1, N'A tea with lemon', 0),
        ('listening-cafe', 2, N'A small latte with oat milk', 1),
        ('listening-cafe', 3, N'A large black coffee', 0),
        ('listening-opportunity', 1, N'One year', 0),
        ('listening-opportunity', 2, N'Two years', 0),
        ('listening-opportunity', 3, N'Three years', 1)
    ) s(Code, Position, Text, IsCorrect)
    JOIN em.Lessons l ON l.Code = s.Code AND l.Revision = 1
    JOIN em.LessonQuestions q ON q.LessonId = l.LessonId AND q.Position = 1
    WHERE NOT EXISTS (SELECT 1 FROM em.QuestionOptions o WITH (UPDLOCK, HOLDLOCK) WHERE o.QuestionId = q.QuestionId AND o.Position = s.Position);
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
