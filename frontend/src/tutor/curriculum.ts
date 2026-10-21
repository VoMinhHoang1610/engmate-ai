export const lessons = [
  {
    id: 'introduce',
    title: 'Làm quen & giới thiệu',
    topic: 'Giới thiệu bản thân',
    icon: 'user',
    rule: 'I’m + tên / nghề nghiệp',
    explanation:
      '“I’m” là cách nói ngắn gọn của “I am”. Dùng để giới thiệu tên, nghề nghiệp hoặc cảm xúc của bạn.',
    example: 'Hi! I’m Linh. I’m a student.',
    translation: 'Chào bạn! Mình là Linh. Mình là sinh viên.',
    tip: 'Nói chậm, mỉm cười và hỏi lại “What’s your name?” để bắt đầu một cuộc trò chuyện.',
    phrase: 'Nice to meet you.',
    ipa: '/naɪs tə miːt juː/',
    sound: '/iː/',
    soundTip:
      'Kéo nhẹ âm /iː/ trong “meet”, môi mở sang hai bên. Nối “meet you” một cách tự nhiên.',
    words: [
      ['I’m…', '/aɪm/', 'Mình là…', 'I’m a student.'],
      ['Nice to meet you', '/naɪs tə miːt juː/', 'Rất vui được gặp bạn', 'Nice to meet you, Linh.'],
      [
        'How about you?',
        '/haʊ əˈbaʊt juː/',
        'Còn bạn thì sao?',
        'I’m from Vietnam. How about you?',
      ],
    ],
  },
  {
    id: 'cafe',
    title: 'Ăn uống & mua sắm',
    topic: 'Gọi món ở quán cà phê',
    icon: 'coffee',
    rule: 'I’d like + món bạn muốn gọi',
    explanation:
      '“I’d like” là cách rút gọn của “I would like”. Cách nói này lịch sự hơn “I want” khi gọi món.',
    example: 'I’d like a latte, please.',
    translation: 'Tôi muốn một ly latte, làm ơn.',
    tip: 'Thêm “please” ở cuối câu và lên giọng nhẹ để tự nhiên hơn.',
    phrase: 'I’d like a latte, please.',
    ipa: '/aɪd laɪk ə ˈlɑːteɪ pliːz/',
    sound: '/l/',
    soundTip:
      'Chạm đầu lưỡi vào lợi ngay sau răng trên khi phát âm /l/. Sau đó hạ lưỡi và mở miệng nhẹ ở âm /ɑː/. Tách chậm: la · tte, rồi nối lại nhé.',
    words: [
      ['I’d like…', '/aɪd laɪk/', 'Tôi muốn…', 'I’d like a small latte.'],
      ['What size…?', '/wɒt saɪz/', 'Kích cỡ nào…?', 'What size would you like?'],
      ['Take away', '/teɪk əˈweɪ/', 'Mang đi', 'Can I have it to take away?'],
    ],
  },
  {
    id: 'travel',
    title: 'Di chuyển & du lịch',
    topic: 'Hỏi đường trong thành phố',
    icon: 'compass',
    rule: 'How do I get to + địa điểm?',
    explanation:
      'Dùng “How do I get to…?” để hỏi cách đến một địa điểm. Bắt đầu bằng “Excuse me” để hỏi lịch sự.',
    example: 'Excuse me, how do I get to the station?',
    translation: 'Xin lỗi, tôi đến nhà ga bằng cách nào?',
    tip: 'Sau khi nghe chỉ đường, nhắc lại một ý ngắn để xác nhận: “So, I turn left?”',
    phrase: 'Turn right at the next street.',
    ipa: '/tɜːn raɪt æt ðə nekst striːt/',
    sound: '/r/',
    soundTip: 'Khi nói “right”, hơi cong lưỡi nhưng không chạm vòm miệng. Nói rõ phụ âm cuối /t/.',
    words: [
      ['Turn left', '/tɜːn left/', 'Rẽ trái', 'Turn left at the corner.'],
      ['Go straight', '/ɡəʊ streɪt/', 'Đi thẳng', 'Go straight for two minutes.'],
      ['Station', '/ˈsteɪʃən/', 'Nhà ga', 'Where is the station?'],
    ],
  },
  {
    id: 'work',
    title: 'Học tập & công việc',
    topic: 'Nói về một ngày của bạn',
    icon: 'briefcase',
    rule: 'I usually + hoạt động',
    explanation:
      'Dùng thì hiện tại đơn để kể về thói quen. “Usually” có nghĩa là “thường”, đứng trước động từ chính.',
    example: 'I usually start work at nine.',
    translation: 'Tôi thường bắt đầu làm việc lúc chín giờ.',
    tip: 'Thêm một chi tiết về thời gian hoặc địa điểm để câu trả lời có nhiều thông tin hơn.',
    phrase: 'I usually work with my team.',
    ipa: '/aɪ ˈjuːʒuəli wɜːk wɪð maɪ tiːm/',
    sound: '/w/',
    soundTip: 'Tròn môi ở đầu từ “work”, rồi mở nhẹ để tạo âm /w/. Tránh đọc thành âm /v/.',
    words: [
      ['Usually', '/ˈjuːʒuəli/', 'Thường xuyên', 'I usually study in the evening.'],
      ['Team', '/tiːm/', 'Nhóm', 'I work with a small team.'],
      ['Schedule', '/ˈʃedjuːl/', 'Lịch trình', 'What is your schedule today?'],
    ],
  },
] as const;

export type Lesson = (typeof lessons)[number];
export type TutorView =
  | 'course'
  | 'mate'
  | 'roadmap'
  | 'lesson'
  | 'pronunciation'
  | 'vocabulary'
  | 'progress'
  | 'setup'
  | 'summary'
  | 'profile'
  | 'settings';
export const tutorTabs: { id: TutorView; label: string }[] = [
  { id: 'mate', label: 'Cùng Mate' },
  { id: 'roadmap', label: 'Lộ trình' },
  { id: 'lesson', label: 'Bài học' },
  { id: 'pronunciation', label: 'Phát âm' },
  { id: 'vocabulary', label: 'Từ vựng' },
  { id: 'progress', label: 'Tiến độ' },
];

export interface LearningState {
  goal: string;
  minutes: number;
  level: import('../profile/api').EnglishLevel;
  lessonId: string;
  completed: string[];
  remembered: string[];
  days: string[];
}
export const initialLearning: LearningState = {
  goal: 'daily',
  minutes: 15,
  level: 'A1',
  lessonId: 'cafe',
  completed: [],
  remembered: [],
  days: [],
};

export function readLearning(username: string): LearningState {
  try {
    const data = JSON.parse(
      localStorage.getItem(`engmate-learning:${username}`) || 'null',
    ) as Partial<LearningState> | null;
    if (!data) return { ...initialLearning };
    return {
      goal:
        typeof data.goal === 'string' &&
        [
          'daily',
          'work',
          'Giao tiếp tự tin',
          'Tiếng Anh công việc',
          'Du lịch và khám phá',
          'Chuẩn bị TOEIC',
          'Chuẩn bị IELTS',
        ].includes(data.goal)
          ? data.goal
          : 'daily',
      minutes:
        typeof data.minutes === 'number' &&
        Number.isInteger(data.minutes) &&
        data.minutes >= 10 &&
        data.minutes <= 60
          ? data.minutes
          : 15,
      level: ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(data.level ?? '')
        ? data.level!
        : 'A1',
      lessonId: lessons.some((l) => l.id === data.lessonId) ? data.lessonId! : 'cafe',
      completed: Array.isArray(data.completed)
        ? data.completed.filter((x) => lessons.some((l) => l.id === x))
        : [],
      remembered: Array.isArray(data.remembered)
        ? data.remembered.filter(
            (x) =>
              typeof x === 'string' &&
              lessons.some((l) => l.words.some((w) => `${l.id}:${w[0]}` === x)),
          )
        : [],
      days: Array.isArray(data.days)
        ? data.days
            .filter((x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x))
            .slice(-365)
        : [],
    };
  } catch {
    return { ...initialLearning };
  }
}

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
