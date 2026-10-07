import { danhSachTrinhDo, type TrinhDo } from '../demo/trinhDo';

export function ChonTrinhDo({
  value,
  onChange,
  disabled = false,
}: {
  value: TrinhDo;
  onChange: (value: TrinhDo) => void;
  disabled?: boolean;
}) {
  return (
    <label className="level-picker">
      Trình độ luyện tập
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as TrinhDo)}
      >
        {danhSachTrinhDo.map((muc) => (
          <option key={muc.id} value={muc.id}>
            {muc.id} · {muc.ten}
          </option>
        ))}
      </select>
    </label>
  );
}
