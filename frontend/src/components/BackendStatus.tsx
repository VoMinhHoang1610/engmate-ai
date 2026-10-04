import { useBackendHealth } from '../hooks/useBackendHealth';

export function BackendStatus() {
  const state = useBackendHealth();
  if (state.status === 'loading') return <p role="status">Đang kiểm tra kết nối backend…</p>;
  if (state.status === 'error') return <p role="alert">{state.message}</p>;
  return <p role="status">Backend đã sẵn sàng.</p>;
}
