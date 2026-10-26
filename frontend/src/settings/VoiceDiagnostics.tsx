import { useState, useSyncExternalStore } from 'react';
import {
  setVoiceDiagnostics,
  subscribeVoiceDiagnostics,
  voiceDiagnosticsSnapshot,
} from '../voice/diagnostics';
import { summarizeVoiceLatency } from '../voice/latency';

export function VoiceDiagnostics() {
  const { enabled, reports } = useSyncExternalStore(
    subscribeVoiceDiagnostics,
    voiceDiagnosticsSnapshot,
  );
  const [mode, setMode] = useState<'batch' | 'realtime'>('batch');
  const selected = reports.filter((report) => report.sttMode === mode);
  const metrics = summarizeVoiceLatency(selected);
  return (
    <details className="tutor-card settings-card">
      <summary>Chẩn đoán độ trễ thoại</summary>
      <p>
        Chỉ giữ tối đa 200 lượt trong bộ nhớ trang; không ghi âm, lưu nội dung hay tải dữ liệu lên
        máy chủ. Đăng xuất hoặc tải lại trang sẽ xóa số đo.
      </p>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setVoiceDiagnostics(event.target.checked)}
        />{' '}
        Thu số đo trong phiên này
      </label>
      <p>
        Bật tại đây, quay lại thoại với Mate, rồi mở lại để xem. Mốc phát là sự kiện trình duyệt,
        chưa phải âm thanh thực ở loa.
      </p>
      <label>
        Chế độ cần xem{' '}
        <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
          <option value="batch">STT theo file</option>
          <option value="realtime">STT realtime</option>
        </select>
      </label>
      <p>
        {selected.length} lượt · {selected.filter((item) => item.status === 'failed').length} lỗi ·{' '}
        {selected.filter((item) => item.status === 'cancelled').length} lượt hủy
      </p>
      <table>
        <caption>Độ trễ lượt thành công, kết thúc bởi im lặng (ms)</caption>
        <thead>
          <tr>
            <th>Chỉ số</th>
            <th>Số mẫu</th>
            <th>p50</th>
            <th>p95</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(metrics).map(([name, metric]) => (
            <tr key={name}>
              <th>{name}</th>
              <td>{metric.samples}</td>
              <td>{metric.p50 === null ? '—' : Math.round(metric.p50)}</td>
              <td>{metric.p95 === null ? '—' : Math.round(metric.p95)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => setVoiceDiagnostics(enabled)}>
        Xóa số đo
      </button>
    </details>
  );
}
