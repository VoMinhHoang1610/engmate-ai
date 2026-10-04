import { BackendStatus } from '../components/BackendStatus';

export function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-700">
        English practice companion
      </p>
      <h1 className="mb-4 text-4xl font-bold">EngMate-AI</h1>
      <p className="mb-8 text-lg text-slate-600">
        Khung ứng dụng luyện tiếng Anh bằng AI dành cho sinh viên Việt Nam.
      </p>
      <section
        aria-labelledby="starter-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 id="starter-heading" className="mb-3 text-xl font-semibold">
          Nền tảng phát triển
        </h2>
        <BackendStatus />
        <p className="mt-4 text-sm text-slate-600">
          Backend hiện sử dụng AI mock để phát triển và kiểm thử. Các chức năng tài khoản và hội
          thoại sẽ được triển khai theo tiến độ dự án.
        </p>
      </section>
    </main>
  );
}
