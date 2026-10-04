import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBackendHealth } from './useBackendHealth';

describe('health request lifecycle', () => {
  it.each([false, true])('ignores completion after unmount (failure: %s)', async (failure) => {
    let complete: (response: Response) => void = () => {};
    let reject: (error: Error) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve, fail) => {
          complete = resolve;
          reject = fail;
        }),
      ),
    );
    const view = renderHook(() => useBackendHealth());
    view.unmount();
    await act(async () => {
      if (failure) reject(new Error('Late failure'));
      else complete(new Response(JSON.stringify({ status: 'ok', service: 'engmate-ai' })));
    });
    expect(view.result.current).toEqual({ status: 'loading' });
  });
});
