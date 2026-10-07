import { tuVungMau, type TuVung } from './duLieu';
import type { TrinhDo } from './trinhDo';

interface BaiNghe {
  ten: string;
  chuDe: string;
  trinhDo: TrinhDo;
  text: string;
  cauHoi: string;
  dapAn: string[];
  dung: number;
  chinhTa: string;
  tuVung: TuVung[];
}

export const baiNghe: BaiNghe[] = [
  {
    ten: 'First words',
    chuDe: 'LÀM QUEN',
    trinhDo: 'Pre-A1',
    text: 'Hello. My name is Sam. This is a pen. One, two, three. Goodbye.',
    cauHoi: 'What is his name? (Bạn ấy tên gì?)',
    dapAn: ['Anna', 'Sam', 'Ben'],
    dung: 1,
    chinhTa: 'Hello.',
    tuVung: [
      {
        id: 'listening-hello',
        tu: 'hello',
        nghia: 'xin chào',
        phienAm: '/həˈləʊ/',
        loai: 'Thán từ',
        viDu: 'Hello, Sam.',
        daThuoc: false,
        henOn: '',
      },
    ],
  },
  {
    ten: 'Meet my family',
    chuDe: 'GIA ĐÌNH',
    trinhDo: 'A1',
    text: 'Hi, I am Lily. I am ten years old. I live with my parents and my brother. My brother is six. We like music.',
    cauHoi: 'How old is Lily?',
    dapAn: ['Six', 'Eight', 'Ten'],
    dung: 2,
    chinhTa: 'I like music.',
    tuVung: [
      {
        id: 'listening-family',
        tu: 'family',
        nghia: 'gia đình',
        phienAm: '/ˈfæm.əl.i/',
        loai: 'Danh từ',
        viDu: 'I live with my family.',
        daThuoc: false,
        henOn: '',
      },
    ],
  },
  {
    ten: 'A morning at the café',
    chuDe: 'ĐỜI SỐNG',
    trinhDo: 'A2',
    text: "Good morning! I'd like a takeaway coffee, please. A small latte with oat milk. I have a meeting at nine, so I'm in a hurry. Thank you!",
    cauHoi: 'What does the customer order?',
    dapAn: ['A tea with lemon', 'A small latte with oat milk', 'A large black coffee'],
    dung: 1,
    chinhTa: "I'd like a takeaway coffee, please.",
    tuVung: [tuVungMau[5]],
  },
  {
    ten: 'An exciting opportunity',
    chuDe: 'CÔNG VIỆC',
    trinhDo: 'B1',
    text: 'I have an interview tomorrow. It is a great opportunity to join a new team. I feel confident because I have three years of experience. I want to improve my skills.',
    cauHoi: 'How much experience does the speaker have?',
    dapAn: ['One year', 'Two years', 'Three years'],
    dung: 2,
    chinhTa: 'I feel confident because I have three years of experience.',
    tuVung: [tuVungMau[0], tuVungMau[1]],
  },
  {
    ten: 'Flexible working',
    chuDe: 'CÔNG VIỆC',
    trinhDo: 'B2',
    text: 'Our team tried a four-day working week for three months. Although productivity remained stable, scheduling meetings with clients became more complicated. Most employees welcomed the change, but management decided to extend the trial rather than make it permanent immediately.',
    cauHoi: 'Why did management extend the trial?',
    dapAn: [
      'Productivity collapsed',
      'Clients refused all meetings',
      'Benefits existed, but practical issues remained',
    ],
    dung: 2,
    chinhTa: 'Although productivity remained stable, scheduling meetings became more complicated.',
    tuVung: [tuVungMau[4]],
  },
  {
    ten: 'Reading between the lines',
    chuDe: 'GIAO TIẾP',
    trinhDo: 'C1',
    text: 'I can see why the proposal appeals to the board. Its projected savings are certainly attractive. Still, I would be more comfortable endorsing it if we had a clearer account of how those savings would affect the service. Perhaps a limited pilot would give us the evidence we currently lack.',
    cauHoi: 'What is the speaker implying?',
    dapAn: [
      'The proposal is unacceptable in every form',
      'Support depends on further evidence about service quality',
      'The savings have already been confirmed',
    ],
    dung: 1,
    chinhTa: 'Perhaps a limited pilot would give us the evidence we currently lack.',
    tuVung: [tuVungMau[1]],
  },
  {
    ten: 'A carefully qualified endorsement',
    chuDe: 'TRANH LUẬN',
    trinhDo: 'C2',
    text: 'Far be it from me to dismiss the achievement: reaching an agreement at all was no small feat. What troubles me is the eagerness to equate agreement with resolution. The wording accommodates both parties precisely because it leaves their incompatible assumptions intact. Calling that a failure would be premature; calling it a solution strikes me as equally so.',
    cauHoi: 'How does the speaker evaluate the agreement?',
    dapAn: [
      'It is a diplomatic achievement whose substantive success remains uncertain',
      'It has conclusively resolved the disagreement',
      'It is an obvious failure with no value',
    ],
    dung: 0,
    chinhTa: 'Calling that a failure would be premature.',
    tuVung: [
      {
        id: 'listening-premature',
        tu: 'premature',
        nghia: 'quá sớm, chưa đúng lúc',
        phienAm: '/ˈprem.ə.tʃə/',
        loai: 'Tính từ',
        viDu: 'Calling it a failure would be premature.',
        daThuoc: false,
        henOn: '',
      },
    ],
  },
];
