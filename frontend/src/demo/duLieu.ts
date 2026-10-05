export type Trang =
  | 'tong-quan'
  | 'hoi-thoai-ai'
  | 'luyen-noi'
  | 'chu-de-nhap-vai'
  | 'luyen-nghe'
  | 'luyen-viet'
  | 'so-tu-vung'
  | 'flashcard'
  | 'ho-so'
  | 'cai-dat';
export type TrinhDo = 'A2' | 'B1' | 'B2';
export interface HoSo {
  ten: string;
  email: string;
  trinhDo: TrinhDo;
  mucTieu: string;
  phutMoiNgay: number;
}
export interface TuVung {
  id: string;
  tu: string;
  nghia: string;
  phienAm: string;
  loai: string;
  viDu: string;
  daThuoc: boolean;
  henOn: string;
}
export interface ChuDe {
  id: string;
  ten: string;
  moTa: string;
  vai: string;
  mau: string;
  mauSac: string;
  bieuTuong: string;
  trinhDo: string;
}
export const danhSachTrang: { id: Trang; ten: string; icon: string; nhom: string }[] = [
  { id: 'tong-quan', ten: 'Tổng quan', icon: 'grid', nhom: 'KHÔNG GIAN HỌC TẬP' },
  { id: 'hoi-thoai-ai', ten: 'Hội thoại AI', icon: 'chat', nhom: 'LUYỆN TẬP' },
  { id: 'luyen-noi', ten: 'Luyện nói', icon: 'mic', nhom: 'LUYỆN TẬP' },
  { id: 'chu-de-nhap-vai', ten: 'Chủ đề & nhập vai', icon: 'compass', nhom: 'LUYỆN TẬP' },
  { id: 'luyen-nghe', ten: 'Luyện nghe', icon: 'headphones', nhom: 'LUYỆN TẬP' },
  { id: 'luyen-viet', ten: 'Luyện viết', icon: 'pen', nhom: 'LUYỆN TẬP' },
  { id: 'so-tu-vung', ten: 'Sổ từ vựng', icon: 'book', nhom: 'GHI NHỚ' },
  { id: 'flashcard', ten: 'Flashcard', icon: 'layers', nhom: 'GHI NHỚ' },
  { id: 'ho-so', ten: 'Hồ sơ học tập', icon: 'user', nhom: 'CÁ NHÂN' },
  { id: 'cai-dat', ten: 'Cài đặt', icon: 'settings', nhom: 'CÁ NHÂN' },
];
export const chuDeMau: ChuDe[] = [
  {
    id: 'coffee',
    ten: 'Một tách cà phê',
    moTa: 'Gọi đồ uống và bắt chuyện tại quán cà phê.',
    vai: 'Barista',
    mau: 'Hi there! Welcome to our café. What can I get for you today?',
    mauSac: 'peach',
    bieuTuong: 'coffee',
    trinhDo: 'A2',
  },
  {
    id: 'travel',
    ten: 'Chuyến đi tiếp theo',
    moTa: 'Hỏi đường, đặt phòng và khám phá thành phố.',
    vai: 'Travel guide',
    mau: 'Welcome to London! What would you like to explore first?',
    mauSac: 'blue',
    bieuTuong: 'compass',
    trinhDo: 'A2 – B1',
  },
  {
    id: 'work',
    ten: 'Ngày đầu đi làm',
    moTa: 'Giới thiệu bản thân và trao đổi với đồng nghiệp.',
    vai: 'Colleague',
    mau: 'Hi, I’m Alex, your new colleague. Could you tell me a little about yourself?',
    mauSac: 'purple',
    bieuTuong: 'briefcase',
    trinhDo: 'B1',
  },
  {
    id: 'food',
    ten: 'Bữa tối ngon miệng',
    moTa: 'Đặt bàn, gọi món và đưa ra yêu cầu riêng.',
    vai: 'Waiter',
    mau: 'Good evening! Do you have a reservation with us tonight?',
    mauSac: 'pink',
    bieuTuong: 'food',
    trinhDo: 'A2',
  },
  {
    id: 'shopping',
    ten: 'Đi mua sắm',
    moTa: 'Hỏi giá, chọn kích cỡ và đổi trả sản phẩm.',
    vai: 'Shop assistant',
    mau: 'Hello! Are you looking for anything in particular today?',
    mauSac: 'green',
    bieuTuong: 'bag',
    trinhDo: 'A2 – B1',
  },
  {
    id: 'school',
    ten: 'Cuộc sống sinh viên',
    moTa: 'Chia sẻ việc học, sở thích và kế hoạch mới.',
    vai: 'Classmate',
    mau: 'Hey! What do you enjoy most about your studies?',
    mauSac: 'yellow',
    bieuTuong: 'cap',
    trinhDo: 'B1',
  },
  {
    id: 'technology',
    ten: 'Thế giới công nghệ',
    moTa: 'Thảo luận về AI và công nghệ trong cuộc sống.',
    vai: 'Tech enthusiast',
    mau: 'How do you think technology has changed the way we learn?',
    mauSac: 'blue',
    bieuTuong: 'sparkles',
    trinhDo: 'B2',
  },
  {
    id: 'interview',
    ten: 'Phỏng vấn tự tin',
    moTa: 'Luyện trả lời về kinh nghiệm và điểm mạnh.',
    vai: 'Interviewer',
    mau: 'Thanks for coming in today. Could you tell me about your strengths?',
    mauSac: 'purple',
    bieuTuong: 'briefcase',
    trinhDo: 'B1 – B2',
  },
];
export const tuVungMau: TuVung[] = [
  {
    id: '1',
    tu: 'confident',
    nghia: 'tự tin',
    phienAm: '/ˈkɒn.fɪ.dənt/',
    loai: 'Tính từ',
    viDu: 'I feel more confident speaking English.',
    daThuoc: false,
    henOn: '',
  },
  {
    id: '2',
    tu: 'opportunity',
    nghia: 'cơ hội',
    phienAm: '/ˌɒp.əˈtjuː.nə.ti/',
    loai: 'Danh từ',
    viDu: 'This is a great opportunity to learn.',
    daThuoc: false,
    henOn: '',
  },
  {
    id: '3',
    tu: 'improve',
    nghia: 'cải thiện',
    phienAm: '/ɪmˈpruːv/',
    loai: 'Động từ',
    viDu: 'I want to improve my pronunciation.',
    daThuoc: true,
    henOn: '',
  },
  {
    id: '4',
    tu: 'reservation',
    nghia: 'sự đặt chỗ',
    phienAm: '/ˌrez.əˈveɪ.ʃən/',
    loai: 'Danh từ',
    viDu: 'I have a reservation for two people.',
    daThuoc: false,
    henOn: '',
  },
  {
    id: '5',
    tu: 'experience',
    nghia: 'trải nghiệm, kinh nghiệm',
    phienAm: '/ɪkˈspɪə.ri.əns/',
    loai: 'Danh từ',
    viDu: 'Travelling is a wonderful experience.',
    daThuoc: false,
    henOn: '',
  },
  {
    id: '6',
    tu: 'takeaway',
    nghia: 'mang đi',
    phienAm: '/ˈteɪk.ə.weɪ/',
    loai: 'Danh từ',
    viDu: 'Could I get a takeaway coffee, please?',
    daThuoc: false,
    henOn: '',
  },
];
export const hoSoMau: HoSo = {
  ten: 'Minh Anh',
  email: 'minhanh@example.com',
  trinhDo: 'B1',
  mucTieu: 'Giao tiếp tự tin',
  phutMoiNgay: 20,
};
export function layTrang(): Trang {
  const hash = window.location.hash.slice(1).split('?')[0];
  if (hash === 'tai-khoan') return 'cai-dat';
  return danhSachTrang.some((trang) => trang.id === hash) ? (hash as Trang) : 'tong-quan';
}
export function diChuyen(trang: Trang, chuDe?: string) {
  window.location.hash = trang + (chuDe ? `?chu-de=${encodeURIComponent(chuDe)}` : '');
}
