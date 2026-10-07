import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { LinhThu } from '../components/LinhThu';
import { danhSachTrinhDo, type TrinhDo } from '../demo/trinhDo';
import { useDuLieu } from '../demo/LuuTru';
import { NenTangTiengAnh } from '../components/NenTangTiengAnh';

const kyNang = [
  { ten: 'Speaking', trang: 'luyen-noi', icon: 'mic' },
  { ten: 'Listening', trang: 'luyen-nghe', icon: 'headphones' },
  { ten: 'Reading', trang: 'luyen-doc', icon: 'book' },
  { ten: 'Writing', trang: 'luyen-viet', icon: 'pen' },
];

export function LoTrinhHoc() {
  const { hoSo, capNhat } = useDuLieu();
  function chonMuc(trinhDo: TrinhDo) {
    capNhat({ hoSo: { ...hoSo, trinhDo } });
  }
  return (
    <>
      <TieuDeTrang ten="Lộ trình học" />
      <section className="panel roadmap-intro">
        <div>
          <span className="pill blue">Pre-A1 → C2</span>
          <h2>Từng bước, từ số 0 đến thành thạo</h2>
          <p>
            Chưa từng học? Bắt đầu ở Pre-A1. Đã có nền tảng? Chọn chặng phù hợp và luyện đều bốn kỹ
            năng.
          </p>
          <button className="btn primary" onClick={() => chonMuc('Pre-A1')}>
            Bắt đầu từ số 0 <BieuTuong ten="arrow" size={17} />
          </button>
        </div>
        <LinhThu size={110} camXuc="encouraging" />
      </section>
      {hoSo.trinhDo === 'Pre-A1' && <NenTangTiengAnh />}
      <p className="roadmap-note">
        Trình độ hiện tại do bạn tự chọn, không phải kết quả kiểm tra năng lực.
      </p>
      <ol className="roadmap-list" aria-label="Các chặng học từ cơ bản đến thành thạo">
        {danhSachTrinhDo.map((muc, index) => {
          const hienTai = hoSo.trinhDo === muc.id;
          return (
            <li key={muc.id}>
              <span className="roadmap-number" aria-hidden="true">
                {index + 1}
              </span>
              <article
                className={`panel roadmap-stage ${hienTai ? 'current' : ''}`}
                aria-label={`${muc.id} — ${muc.ten}`}
              >
                <div className="section-title">
                  <div>
                    <span className="pill purple">{muc.id}</span>
                    <h2>{muc.ten}</h2>
                  </div>
                  {hienTai && <span className="pill green">Đang học</span>}
                </div>
                <p className="muted">{muc.moTa}</p>
                <ul className="roadmap-goals">
                  {muc.mucTieu.map((item) => (
                    <li key={item}>
                      <BieuTuong ten="check" size={16} />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="roadmap-grammar">
                  <strong>Trọng tâm:</strong> {muc.nguPhap}
                </p>
                <button
                  className={`btn ${hienTai ? 'secondary' : 'primary'}`}
                  onClick={() => chonMuc(muc.id)}
                  disabled={hienTai}
                >
                  {hienTai ? `Đang học ${muc.id}` : `Chọn học ${muc.id}`}
                </button>
                <nav className="roadmap-skills" aria-label={`Luyện kỹ năng ${muc.id}`}>
                  {kyNang.map((skill) => (
                    <a
                      key={skill.trang}
                      href={`#${skill.trang}?trinh-do=${muc.id}`}
                      onClick={() => chonMuc(muc.id)}
                    >
                      <BieuTuong ten={skill.icon} size={17} />
                      {skill.ten}
                    </a>
                  ))}
                </nav>
              </article>
            </li>
          );
        })}
      </ol>
      <p className="roadmap-note">
        Tham chiếu{' '}
        <a
          href="https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions"
          target="_blank"
          rel="noreferrer"
        >
          khung CEFR của Hội đồng châu Âu
        </a>
        . Bài luyện trong ứng dụng là nội dung thực hành theo mức, chưa phải khóa học hay bài thi
        chứng nhận CEFR.
      </p>
    </>
  );
}
