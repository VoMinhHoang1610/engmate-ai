import type { BaiDoc } from './baiDoc';

export const baiDocBoSung: BaiDoc[] = [
  {
    id: 'first-words',
    ten: 'Hello, I am Anna',
    trinhDo: 'Pre-A1',
    chuDe: 'LÀM QUEN',
    doanVan: [
      'Hello. I am Anna.',
      'This is a book. It is red.',
      'This is my cat. My cat is small.',
    ],
    cauHoi: [
      {
        cauHoi: 'What is her name? (Bạn ấy tên gì?)',
        dapAn: ['Anna', 'Emma', 'Tom'],
        dung: 0,
        giaiThich: '“I am Anna” nghĩa là “Tôi là Anna”.',
      },
      {
        cauHoi: 'The book is… (Cuốn sách có màu gì?)',
        dapAn: ['blue', 'red', 'green'],
        dung: 1,
        giaiThich: '“It is red” nghĩa là “Nó màu đỏ”. red = đỏ.',
      },
      {
        cauHoi: 'The cat is… (Con mèo như thế nào?)',
        dapAn: ['big', 'red', 'small'],
        dung: 2,
        giaiThich: '“My cat is small” nghĩa là “Con mèo của tôi nhỏ”. small = nhỏ.',
      },
    ],
    tuVung: [
      {
        id: 'reading-book',
        tu: 'book',
        nghia: 'cuốn sách',
        phienAm: '/bʊk/',
        loai: 'Danh từ',
        viDu: 'This is a book.',
        daThuoc: false,
        henOn: '',
      },
      {
        id: 'reading-cat',
        tu: 'cat',
        nghia: 'con mèo',
        phienAm: '/kæt/',
        loai: 'Danh từ',
        viDu: 'This is my cat.',
        daThuoc: false,
        henOn: '',
      },
    ],
  },
  {
    id: 'daily-life',
    ten: 'My day',
    trinhDo: 'A1',
    chuDe: 'HẰNG NGÀY',
    doanVan: [
      'My name is Ben. I am a student. I live with my mother and father. Our house is near my school.',
      'I get up at seven. I eat bread and drink milk for breakfast. I walk to school with my friend Lucy.',
      'After school, I play football. In the evening, I read a book. I go to bed at nine.',
    ],
    cauHoi: [
      {
        cauHoi: 'Who does Ben live with?',
        dapAn: ['His friends', 'His mother and father', 'His teacher'],
        dung: 1,
        giaiThich: 'Ben nói: “I live with my mother and father” — sống cùng bố mẹ.',
      },
      {
        cauHoi: 'How does Ben go to school?',
        dapAn: ['He walks', 'He takes a bus', 'He rides a bicycle'],
        dung: 0,
        giaiThich: '“I walk to school” — Ben đi bộ đến trường.',
      },
      {
        cauHoi: 'What does Ben do in the evening?',
        dapAn: ['He plays football', 'He eats breakfast', 'He reads a book'],
        dung: 2,
        giaiThich: '“In the evening, I read a book” — buổi tối Ben đọc sách.',
      },
    ],
    tuVung: [
      {
        id: 'reading-breakfast',
        tu: 'breakfast',
        nghia: 'bữa sáng',
        phienAm: '/ˈbrek.fəst/',
        loai: 'Danh từ',
        viDu: 'I eat bread for breakfast.',
        daThuoc: false,
        henOn: '',
      },
      {
        id: 'reading-walk',
        tu: 'walk',
        nghia: 'đi bộ',
        phienAm: '/wɔːk/',
        loai: 'Động từ',
        viDu: 'I walk to school.',
        daThuoc: false,
        henOn: '',
      },
    ],
  },
  {
    id: 'quiet-streets',
    ten: 'Whose streets are quieter?',
    trinhDo: 'C1',
    chuDe: 'XÃ HỘI',
    doanVan: [
      'When a council restricted private cars in its historic centre, early reports celebrated a marked reduction in noise and an increase in pedestrian activity. Shop owners, initially sceptical, began describing the streets as more welcoming. On these measures alone, the initiative appeared an unqualified success.',
      'Yet residents of neighbouring districts told a different story. Traffic had not disappeared; much of it had shifted onto roads that were already congested. A survey conducted exclusively within the pedestrian zone could therefore record genuine improvements while missing the costs borne elsewhere. The findings were not false, but their geographical boundaries shaped the conclusion.',
      'The lesson is not that pedestrianisation should be rejected. Rather, a credible assessment must ask whose experience is being measured and over what period. Adjusting public transport routes and including surrounding neighbourhoods in consultations might preserve the gains without treating displaced inconvenience as an acceptable afterthought.',
    ],
    cauHoi: [
      {
        cauHoi: 'What limitation does the author identify in the early assessment?',
        dapAn: [
          'It counted only shop owners',
          'It overlooked effects outside the pedestrian zone',
          'It invented the reduction in noise',
        ],
        dung: 1,
        giaiThich:
          'Khảo sát trong khu đi bộ ghi nhận lợi ích thật, nhưng bỏ sót chi phí chuyển sang khu lân cận.',
      },
      {
        cauHoi: 'What is implied by “an acceptable afterthought”?',
        dapAn: [
          'Displaced inconvenience should receive proper consideration',
          'Neighbouring districts welcome more traffic',
          'Consultation is unnecessary',
        ],
        dung: 0,
        giaiThich:
          'Tác giả phê bình việc coi bất tiện của khu lân cận là chuyện phụ; cần đưa họ vào đánh giá và tham vấn.',
      },
      {
        cauHoi: 'Which description best captures the author’s stance?',
        dapAn: [
          'Complete opposition to pedestrianisation',
          'Unqualified enthusiasm for the council',
          'Conditional support with a broader assessment',
        ],
        dung: 2,
        giaiThich:
          'Tác giả không bác bỏ chính sách, mà đề nghị đánh giá rộng hơn và điều chỉnh giao thông công cộng.',
      },
    ],
    tuVung: [
      {
        id: 'reading-displace',
        tu: 'displace',
        nghia: 'chuyển sang nơi khác',
        phienAm: '/dɪsˈpleɪs/',
        loai: 'Động từ',
        viDu: 'The policy may displace traffic into neighbouring streets.',
        daThuoc: false,
        henOn: '',
      },
      {
        id: 'reading-credible',
        tu: 'credible',
        nghia: 'đáng tin cậy',
        phienAm: '/ˈkred.ə.bəl/',
        loai: 'Tính từ',
        viDu: 'A credible assessment considers the wider effects.',
        daThuoc: false,
        henOn: '',
      },
    ],
  },
  {
    id: 'measuring-success',
    ten: 'The comfort of a single measure',
    trinhDo: 'C2',
    chuDe: 'TƯ DUY PHẢN BIỆN',
    doanVan: [
      'There is a particular reassurance in a number that rises steadily. An institution can point to it as evidence of progress, while those charged with oversight can invoke it as proof that oversight itself is working. The convenience is mutual. Whether the number still represents what originally mattered is a less accommodating question.',
      'Suppose a library begins judging its contribution by the quantity of books borrowed. A campaign promoting short, popular titles may improve that figure without improving access to demanding works or support for hesitant readers. This does not render borrowing statistics worthless. It reveals, instead, the slippage between an indicator and the purpose it was enlisted to serve: what is easiest to count can gradually become what is most energetically pursued.',
      'Nor would replacing the figure with a supposedly richer index dissolve the difficulty. Every index embodies choices about what to include and how to weigh it, choices that a polished total can conceal. The sensible response is neither numerical abstinence nor unquestioning compliance, but a willingness to let measures inform judgement without pre-empting it. Paradoxically, a measure may be most useful when an institution remains prepared to explain why it has chosen not to maximise it.',
    ],
    cauHoi: [
      {
        cauHoi: 'What does “The convenience is mutual” suggest?',
        dapAn: [
          'Institutions and overseers both benefit from an apparently clear sign of success',
          'Borrowers prefer shorter books',
          'Oversight inevitably prevents misleading statistics',
        ],
        dung: 0,
        giaiThich:
          'Cả tổ chức và người giám sát đều có thể dùng số tăng để chứng minh mình làm tốt, dù số đó chưa phản ánh mục đích ban đầu.',
      },
      {
        cauHoi: 'Why would a richer index fail to dissolve the difficulty?',
        dapAn: [
          'It would contain no numerical information',
          'It would eliminate institutional choice',
          'Its design would still embed judgements that the total may conceal',
        ],
        dung: 2,
        giaiThich:
          'Chọn thành phần và trọng số vẫn là quyết định đánh giá; tổng điểm có thể che các quyết định đó.',
      },
      {
        cauHoi: 'What is the force of the final sentence?',
        dapAn: [
          'A useful measure should never influence decisions',
          'Departing from maximisation can demonstrate that purpose still governs judgement',
          'Institutions should stop explaining their choices',
        ],
        dung: 1,
        giaiThich:
          'Nghịch lý cuối bài: sẵn sàng không tối đa hóa chỉ số cho thấy tổ chức vẫn đặt mục đích và phán đoán lên trước con số.',
      },
    ],
    tuVung: [
      {
        id: 'reading-preempt',
        tu: 'pre-empt',
        nghia: 'đi trước và ngăn một quyết định khác',
        phienAm: '/priːˈempt/',
        loai: 'Động từ',
        viDu: 'A measure should inform judgement without pre-empting it.',
        daThuoc: false,
        henOn: '',
      },
      {
        id: 'reading-slippage',
        tu: 'slippage',
        nghia: 'sự lệch dần',
        phienAm: '/ˈslɪp.ɪdʒ/',
        loai: 'Danh từ',
        viDu: 'There is slippage between the indicator and its purpose.',
        daThuoc: false,
        henOn: '',
      },
    ],
  },
];
