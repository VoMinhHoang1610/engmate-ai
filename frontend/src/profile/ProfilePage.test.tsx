import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';
import { prepareAvatar } from './avatar';
import { useAccountProfile, type Profile } from './api';

vi.mock('./avatar', () => ({ prepareAvatar: vi.fn() }));
const profile: Profile = {
  version: '0000000000000001',
  display_name: 'Mai Nguyen',
  phone_number: null,
  birth_date: null,
  gender: null,
  cefr_level: 'A2',
  learning_goal: 'Giao tiếp tự tin',
  daily_goal_minutes: 20,
  time_zone_id: 'Asia/Ho_Chi_Minh',
  has_avatar: false,
  total_study_minutes: 12,
};
const account = { username: 'learner', email: 'learner@example.test' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
function open() {
  const props = {
    account,
    profile,
    avatar: '',
    avatarError: '',
    remembered: 3,
    completed: 1,
    onSaved: vi.fn(),
    onAvatarChanged: vi.fn(),
    onReload: vi.fn(),
  };
  render(<ProfilePage {...props} />);
  return props;
}
beforeEach(() => {
  vi.mocked(prepareAvatar)
    .mockReset()
    .mockResolvedValue(new Blob(['raster'], { type: 'image/jpeg' }));
});

describe('restored profile', () => {
  it('restores the original personal fields, read-only account identity and real metrics', () => {
    open();
    expect(screen.getByLabelText('Họ và tên')).toHaveValue('Mai Nguyen');
    expect(screen.getByLabelText('Tài khoản')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveValue('20');
  });
  it('saves trimmed profile data through PUT and uses the returned version for the next save', async () => {
    const requests: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options: RequestInit) => {
        const body = JSON.parse(String(options.body));
        requests.push(body);
        return json({ ...profile, ...body, version: `000000000000000${requests.length + 1}` });
      }),
    );
    const props = open();
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: '  Mai Updated  ' } });
    fireEvent.change(screen.getByLabelText('Số điện thoại'), {
      target: { value: '+84 901 234 567' },
    });
    fireEvent.change(screen.getByRole('slider'), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await screen.findByText('Đã lưu hồ sơ của bạn.');
    expect(requests[0]).toMatchObject({
      display_name: 'Mai Updated',
      phone_number: '+84 901 234 567',
      daily_goal_minutes: 35,
      version: profile.version,
    });
    expect(requests[0]).not.toHaveProperty('email');
    expect(props.onSaved).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].version).toBe('0000000000000002');
  });
  it('keeps changes on a version conflict and offers an explicit reload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({}, 409)),
    );
    const props = open();
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Keep this name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('phiên khác');
    expect(screen.getByLabelText('Họ và tên')).toHaveValue('Keep this name');
    expect(props.onSaved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại hồ sơ' }));
    expect(props.onReload).toHaveBeenCalledOnce();
  });
  it('does not overwrite the form or claim success on validation/server errors', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({}, 422)).mockResolvedValueOnce(json({}, 503));
    vi.stubGlobal('fetch', fetch);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa hợp lệ');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được hồ sơ');
    expect(screen.queryByText('Đã lưu hồ sơ của bạn.')).not.toBeInTheDocument();
  });
  it('rejects a whitespace name and prevents duplicate pending saves', async () => {
    let finish!: (value: Response) => void;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetch);
    open();
    const name = screen.getByLabelText('Họ và tên');
    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.submit(name.closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập họ và tên.');
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: 'Mai' } });
    fireEvent.submit(name.closest('form')!);
    fireEvent.submit(name.closest('form')!);
    expect(fetch).toHaveBeenCalledOnce();
    await act(async () =>
      finish(json({ ...profile, display_name: 'Mai', version: '0000000000000002' })),
    );
  });
  it('uploads an encoded avatar and keeps upload failures visible', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json({}, 413))
      .mockResolvedValueOnce(json({}, 422));
    vi.stubGlobal('fetch', fetch);
    const props = open();
    const input = screen.getByLabelText('Đổi ảnh đại diện');
    const file = new File(['photo'], 'photo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText('Đã lưu ảnh đại diện.');
    expect(props.onAvatarChanged).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][1].body).toBeInstanceOf(FormData);
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('2 MB');
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được ảnh');
    fireEvent.change(input, { target: { files: [] } });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('shows image decoding failures before sending an upload', async () => {
    vi.mocked(prepareAvatar).mockRejectedValueOnce(new Error('Ảnh không hợp lệ'));
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    open();
    fireEvent.change(screen.getByLabelText('Đổi ảnh đại diện'), {
      target: { files: [new File(['x'], 'bad.png', { type: 'image/png' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh không hợp lệ');
    expect(fetch).not.toHaveBeenCalled();
  });
});

function ProfileLoader() {
  const personal = useAccountProfile('learner');
  return (
    <>
      <p>{personal.loading ? 'Loading' : personal.error || personal.profile?.display_name}</p>
      <button onClick={personal.refresh}>Reload</button>
    </>
  );
}
describe('profile loader', () => {
  it('recovers a failed load using the real authenticated transport', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json(profile)),
    );
    render(<ProfileLoader />);
    await screen.findByText(/Dịch vụ chưa sẵn sàng/);
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    await screen.findByText('Mai Nguyen');
  });
});
