import { useEffect, useState } from 'react';
import { getHealth } from '../api/health';

type HealthState =
  { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

export function useBackendHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    void getHealth(controller.signal).then(
      () => {
        if (!controller.signal.aborted) setState({ status: 'ready' });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Không kết nối được backend.',
          });
        }
      },
    );
    return () => controller.abort();
  }, []);
  return state;
}
