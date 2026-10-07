export const danhSachTrinhDo = [
  {
    id: 'Pre-A1',
    ten: 'Bắt đầu từ số 0',
    moTa: 'Dành cho người chưa từng học tiếng Anh.',
    mucTieu: [
      'Làm quen bảng chữ cái và âm cơ bản',
      'Số đếm 0–20, màu sắc và đồ vật',
      'Chào hỏi, nói tên bằng mẫu câu ngắn',
    ],
    nguPhap: 'I am… · This is… · Một từ hoặc một cụm từ',
  },
  {
    id: 'A1',
    ten: 'Nhập môn',
    moTa: 'Hiểu và dùng câu đơn giản về bản thân.',
    mucTieu: [
      'Giới thiệu bản thân, gia đình và sở thích',
      'Ngày giờ, số đếm và câu hỏi đơn giản',
      'Động từ to be, hiện tại đơn, a/an',
    ],
    nguPhap: 'To be · Hiện tại đơn · Câu hỏi What/Where',
  },
  {
    id: 'A2',
    ten: 'Cơ bản',
    moTa: 'Giao tiếp trong các tình huống quen thuộc.',
    mucTieu: [
      'Mua sắm, ăn uống, hỏi đường',
      'Kể về hoạt động thường ngày và quá khứ',
      'Đọc thông báo và viết tin nhắn ngắn',
    ],
    nguPhap: 'Quá khứ đơn · Tương lai gần · So sánh',
  },
  {
    id: 'B1',
    ten: 'Trung cấp',
    moTa: 'Trao đổi độc lập về chủ đề quen thuộc.',
    mucTieu: [
      'Kể trải nghiệm và giải thích kế hoạch',
      'Nghe ý chính, đọc hiểu theo ngữ cảnh',
      'Viết đoạn văn và email có cấu trúc',
    ],
    nguPhap: 'Hiện tại hoàn thành · Điều kiện loại 1 · Từ nối',
  },
  {
    id: 'B2',
    ten: 'Trên trung cấp',
    moTa: 'Trình bày quan điểm và trao đổi tương đối trôi chảy.',
    mucTieu: [
      'Thảo luận, so sánh và bảo vệ quan điểm',
      'Hiểu văn bản có lập luận, suy ra ý nghĩa',
      'Viết bài luận nêu ưu/nhược điểm',
    ],
    nguPhap: 'Bị động · Mệnh đề quan hệ · Điều kiện loại 2',
  },
  {
    id: 'C1',
    ten: 'Nâng cao',
    moTa: 'Sử dụng tiếng Anh linh hoạt trong học thuật và công việc.',
    mucTieu: [
      'Hiểu hàm ý và sắc thái của người nói',
      'Tổng hợp nguồn và trình bày lập luận rõ ràng',
      'Viết báo cáo, đề xuất với văn phong phù hợp',
    ],
    nguPhap: 'Đảo ngữ · Liên kết diễn ngôn · Sắc thái và văn phong',
  },
  {
    id: 'C2',
    ten: 'Thành thạo',
    moTa: 'Diễn đạt chính xác, tinh tế với nội dung phức tạp.',
    mucTieu: [
      'Phân tích giọng điệu, ẩn ý và dụng ý',
      'Tổng hợp và phản biện các lập luận phức tạp',
      'Diễn đạt lại linh hoạt, kiểm soát sắc thái',
    ],
    nguPhap: 'Cấu trúc linh hoạt · Thành ngữ theo ngữ cảnh · Diễn đạt tinh tế',
  },
] as const;

export type TrinhDo = (typeof danhSachTrinhDo)[number]['id'];

export function laTrinhDo(value: unknown): value is TrinhDo {
  return danhSachTrinhDo.some((muc) => muc.id === value);
}

export function layTrinhDoHoc(macDinh: TrinhDo): TrinhDo {
  const value = new URLSearchParams(window.location.hash.split('?')[1]).get('trinh-do');
  return laTrinhDo(value) ? value : macDinh;
}

export const cauNoiTheoTrinhDo: Record<TrinhDo, string[]> = {
  'Pre-A1': ['Hello.', 'My name is Anna.', 'This is a book.'],
  A1: ['I am a student.', 'I live with my family.', 'What is your name?'],
  A2: [
    'I would like a cup of coffee, please.',
    'I feel more confident speaking English.',
    'Could you tell me how to get to the station?',
  ],
  B1: [
    'I have been learning English for two years.',
    'If I have time this weekend, I will visit my friends.',
    'In my opinion, travelling is a useful way to learn.',
  ],
  B2: [
    'Although working remotely offers flexibility, it can make collaboration more challenging.',
    'I would argue that practical experience is just as valuable as formal education.',
    'If public transport were more reliable, fewer people would drive to work.',
  ],
  C1: [
    'Not only does the proposal address immediate concerns, but it also anticipates longer-term challenges.',
    'The evidence suggests that the benefits are substantial, provided the policy is implemented consistently.',
    'While I appreciate the reasoning behind your position, I remain unconvinced by its underlying assumptions.',
  ],
  C2: [
    'Compelling though the argument may appear, its premises warrant closer scrutiny.',
    'The distinction is less a matter of principle than of how those principles are interpreted in practice.',
    'What is ostensibly a pragmatic compromise risks obscuring the very tensions it purports to resolve.',
  ],
};

export const deVietTheoTrinhDo: Record<TrinhDo, Record<string, string>> = {
  'Pre-A1': {
    'Câu ngắn': 'Viết tên của bạn theo mẫu: My name is…',
    'Đoạn văn': 'Viết 2 câu theo mẫu: Hello. I am…',
    Email: 'Viết lời chào và tên: Hello, I am…',
    'Bài luận': 'Bắt đầu với 3 từ tiếng Anh bạn biết: hello, book, cat. Chưa cần viết bài luận.',
  },
  A1: {
    'Câu ngắn': 'Viết một câu về sở thích theo mẫu: I like…',
    'Đoạn văn': 'Giới thiệu tên, tuổi và gia đình bằng 3–5 câu đơn giản.',
    Email: 'Viết email 3–4 câu chào một người bạn và giới thiệu bản thân.',
    'Bài luận': 'Viết 5 câu đơn giản về một ngày của bạn. Dùng I get up…, I go…',
  },
  A2: {
    'Câu ngắn': 'Viết một câu về điều bạn muốn cải thiện trong tiếng Anh.',
    'Đoạn văn': 'Giới thiệu bản thân, sở thích và mục tiêu học tiếng Anh (50–100 từ).',
    Email: 'Viết email cho đồng nghiệp để đề nghị một cuộc họp vào tuần tới.',
    'Bài luận': 'Viết một đoạn ngắn về chuyến đi gần đây: bạn đi đâu, làm gì và cảm thấy thế nào.',
  },
  B1: {
    'Câu ngắn': 'Viết câu mô tả một trải nghiệm với I have…',
    'Đoạn văn': 'Kể một trải nghiệm học tập và điều bạn rút ra (100–150 từ).',
    Email: 'Viết email cho đồng nghiệp để đề nghị một cuộc họp vào tuần tới.',
    'Bài luận':
      'Công nghệ giúp chúng ta học ngoại ngữ như thế nào? Chia sẻ quan điểm và ví dụ (150–200 từ).',
  },
  B2: {
    'Câu ngắn': 'Viết câu đối chiếu hai quan điểm với Although hoặc Whereas.',
    'Đoạn văn': 'So sánh học trực tuyến và học tại lớp, nêu ưu/nhược điểm (150–200 từ).',
    Email: 'Viết email công việc trình bày vấn đề, giải pháp và đề nghị hành động.',
    'Bài luận':
      'Có nên thay toàn bộ sách giáo khoa bằng tài liệu số? Nêu lập luận hai phía và kết luận (200–250 từ).',
  },
  C1: {
    'Câu ngắn': 'Diễn đạt một quan điểm thận trọng bằng hedging: tends to, may, arguably.',
    'Đoạn văn':
      'Tổng hợp hai quan điểm trái chiều về AI trong giáo dục, chỉ ra điểm chung và khác biệt.',
    Email: 'Viết đề xuất chính thức cho quản lý, cân nhắc chi phí, lợi ích và rủi ro.',
    'Bài luận':
      'Đánh giá vai trò của trường học trong việc phát triển tư duy phản biện, có phản biện và dẫn chứng (250–350 từ).',
  },
  C2: {
    'Câu ngắn': 'Viết lại cùng một ý theo văn phong trang trọng và thân mật, giữ nguyên sắc thái.',
    'Đoạn văn': 'Phân tích một lập luận có ẩn ý, chỉ ra giả định và diễn đạt lại thật chính xác.',
    Email: 'Viết thư đàm phán một vấn đề nhạy cảm, giữ thái độ ngoại giao nhưng yêu cầu rõ ràng.',
    'Bài luận':
      'Phản biện quan điểm “Hiệu quả phải luôn được ưu tiên hơn công bằng”, xét định nghĩa và các trường hợp ngoại lệ (350–450 từ).',
  },
};

export const goiYVietTheoTrinhDo: Record<TrinhDo, string> = {
  'Pre-A1': 'Hello. · My name is… · I am… · This is a…',
  A1: 'I like… · I live in… · My family has…',
  A2: 'I am learning English because… · I would like…',
  B1: 'In my opinion… · For example… · As a result…',
  B2: 'Although… · On the other hand… · Taking both views into account…',
  C1: 'The evidence suggests… · It could be argued that… · Nevertheless…',
  C2: 'Compelling though… · This presupposes… · A more nuanced interpretation…',
};
