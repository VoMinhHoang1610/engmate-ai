import type { TrinhDo, TuVung } from './duLieu';
import { baiDocBoSung } from './baiDocBoSung';

interface CauHoiDoc {
  cauHoi: string;
  dapAn: string[];
  dung: number;
  giaiThich: string;
}
export interface BaiDoc {
  id: string;
  ten: string;
  trinhDo: TrinhDo;
  chuDe: string;
  doanVan: string[];
  cauHoi: CauHoiDoc[];
  tuVung: TuVung[];
}

export const baiDoc: BaiDoc[] = [
  ...baiDocBoSung,
  {
    id: 'garden',
    ten: 'A garden in the city',
    trinhDo: 'A2',
    chuDe: 'ĐỜI SỐNG',
    doanVan: [
      'Every Saturday morning, Emma visits a small community garden near her apartment. The garden is between a library and a supermarket. People from the neighbourhood grow vegetables and flowers there together.',
      'Emma usually arrives at eight o’clock. She waters the tomatoes and helps her neighbour, Mr Lee, plant carrots. She does not have a garden at home, so she enjoys spending time outside. After working, everyone shares tea and talks about their week.',
      'Last Saturday, Emma took her younger brother to the garden. He learned how to plant seeds and wanted to come again. Emma was happy because the garden helped him make new friends, too.',
    ],
    cauHoi: [
      {
        cauHoi: 'Where is the community garden?',
        dapAn: [
          'Behind Emma’s apartment',
          'Between a library and a supermarket',
          'Next to a school',
        ],
        dung: 1,
        giaiThich: 'Đoạn 1: “The garden is between a library and a supermarket.”',
      },
      {
        cauHoi: 'Why does Emma enjoy visiting the garden?',
        dapAn: [
          'She likes spending time outside',
          'She sells vegetables there',
          'She works at the library',
        ],
        dung: 0,
        giaiThich: 'Đoạn 2: Emma không có vườn ở nhà và thích dành thời gian ngoài trời.',
      },
      {
        cauHoi: 'What did Emma’s brother learn last Saturday?',
        dapAn: ['How to make tea', 'How to cook carrots', 'How to plant seeds'],
        dung: 2,
        giaiThich: 'Đoạn 3: “He learned how to plant seeds.”',
      },
    ],
    tuVung: [
      {
        id: 'reading-community',
        tu: 'community',
        nghia: 'cộng đồng',
        phienAm: '/kəˈmjuː.nə.ti/',
        loai: 'Danh từ',
        viDu: 'Our community grows vegetables together.',
        daThuoc: false,
        henOn: '',
      },
      {
        id: 'reading-seed',
        tu: 'seed',
        nghia: 'hạt giống',
        phienAm: '/siːd/',
        loai: 'Danh từ',
        viDu: 'He learned how to plant seeds.',
        daThuoc: false,
        henOn: '',
      },
    ],
  },
  {
    id: 'commute',
    ten: 'A different way to work',
    trinhDo: 'B1',
    chuDe: 'CÔNG VIỆC',
    doanVan: [
      'For years, Daniel drove to his office every day. The journey was only six kilometres, but heavy traffic often made it take forty minutes. By the time he arrived, he already felt tired. When his company provided secure bicycle parking, he decided to try cycling instead.',
      'During the first week, Daniel found the hills difficult and had to leave home earlier. However, he soon discovered a quieter route through a park. His journey now takes about twenty-five minutes, and he feels more energetic at work. He also spends less money on fuel.',
      'Cycling is not always convenient. On rainy days, Daniel takes the bus, and he still uses his car for longer trips. He believes that changing one small habit can make a difference, even if it is not possible to follow the new routine every single day.',
    ],
    cauHoi: [
      {
        cauHoi: 'What encouraged Daniel to try cycling?',
        dapAn: [
          'His car stopped working',
          'His office moved closer',
          'His company provided secure bicycle parking',
        ],
        dung: 2,
        giaiThich: 'Đoạn 1: Daniel thử đạp xe khi công ty cung cấp chỗ đỗ xe đạp an toàn.',
      },
      {
        cauHoi: 'How did the new route improve his journey?',
        dapAn: [
          'It made the trip quieter and faster',
          'It removed every hill',
          'It allowed him to drive through a park',
        ],
        dung: 0,
        giaiThich:
          'Đoạn 2: đường qua công viên yên tĩnh hơn; thời gian đi giảm từ 40 xuống khoảng 25 phút.',
      },
      {
        cauHoi: 'What is the main message of the passage?',
        dapAn: [
          'Everyone should stop using cars completely',
          'Small changes can help without being followed every day',
          'Cycling is convenient in all weather',
        ],
        dung: 1,
        giaiThich:
          'Đoạn cuối: một thói quen nhỏ có thể tạo khác biệt, dù không thực hiện được mỗi ngày.',
      },
    ],
    tuVung: [
      {
        id: 'reading-route',
        tu: 'route',
        nghia: 'tuyến đường',
        phienAm: '/ruːt/',
        loai: 'Danh từ',
        viDu: 'He discovered a quieter route through a park.',
        daThuoc: false,
        henOn: '',
      },
      {
        id: 'reading-convenient',
        tu: 'convenient',
        nghia: 'thuận tiện',
        phienAm: '/kənˈviː.ni.ənt/',
        loai: 'Tính từ',
        viDu: 'Cycling is not always convenient.',
        daThuoc: false,
        henOn: '',
      },
    ],
  },
  {
    id: 'learning',
    ten: 'Learning beyond the screen',
    trinhDo: 'B2',
    chuDe: 'GIÁO DỤC',
    doanVan: [
      'Digital learning platforms have made educational resources easier to access. A student can watch a lecture, practise vocabulary, or discuss a question with someone on another continent without leaving home. Yet access to information does not automatically lead to a deeper understanding of it.',
      'Consider a learner who watches several tutorials on photography but never takes a photograph. The learner may recognise technical terms while struggling to apply them. By contrast, someone who experiments with a camera, reviews the results, and seeks feedback can connect abstract ideas to practical experience. Mistakes become useful evidence rather than simply signs of failure.',
      'This does not mean that online learning should be abandoned. Instead, digital tools are most useful when they support purposeful activity. Learners might watch a short lesson, complete a real task, and then return to the material with specific questions. The value of a platform therefore depends partly on how actively the learner uses it, not merely on how much content it offers.',
    ],
    cauHoi: [
      {
        cauHoi: 'What distinction does the author make in the first paragraph?',
        dapAn: [
          'Online lectures and classroom lectures',
          'Access to information and understanding it',
          'Vocabulary practice and discussion',
        ],
        dung: 1,
        giaiThich:
          'Đoạn 1 phân biệt việc tiếp cận thông tin với hiểu sâu; điều thứ nhất không tự động dẫn tới điều thứ hai.',
      },
      {
        cauHoi: 'Why does the author mention photography?',
        dapAn: [
          'To recommend buying a camera',
          'To show that tutorials are always inaccurate',
          'To illustrate the importance of applying knowledge',
        ],
        dung: 2,
        giaiThich: 'Ví dụ đối chiếu xem hướng dẫn với thực hành, xem lại kết quả và nhận phản hồi.',
      },
      {
        cauHoi: 'Which statement best reflects the author’s position?',
        dapAn: [
          'Digital tools should be combined with active practice',
          'Online learning should be abandoned',
          'More content always produces better learning',
        ],
        dung: 0,
        giaiThich:
          'Đoạn cuối khuyến khích dùng công cụ số để hỗ trợ hoạt động có mục đích, sau đó quay lại với câu hỏi cụ thể.',
      },
    ],
    tuVung: [
      {
        id: 'reading-abstract',
        tu: 'abstract',
        nghia: 'trừu tượng',
        phienAm: '/ˈæb.strækt/',
        loai: 'Tính từ',
        viDu: 'Practice connects abstract ideas to experience.',
        daThuoc: false,
        henOn: '',
      },
      {
        id: 'reading-purposeful',
        tu: 'purposeful',
        nghia: 'có mục đích',
        phienAm: '/ˈpɜː.pəs.fəl/',
        loai: 'Tính từ',
        viDu: 'Digital tools can support purposeful activity.',
        daThuoc: false,
        henOn: '',
      },
    ],
  },
];
