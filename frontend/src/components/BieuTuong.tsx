const paths: Record<string, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-9.5A8.5 8.5 0 0 1 10.5 4H13a8 8 0 0 1 8 7.5Z M7 10h10 M7 14h6',
  mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8',
  compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M16 8l-3 5-5 3 3-5 5-3Z',
  headphones:
    'M3 13v-1a9 9 0 0 1 18 0v1 M3 12h4v9H5a2 2 0 0 1-2-2v-7Z M21 12h-4v9h2a2 2 0 0 0 2-2v-7Z',
  pen: 'm16 3 5 5-12 12-6 1 1-6L16 3Z m-3 3 5 5',
  book: 'M12 5v16 M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z',
  layers: 'm12 2 10 6-10 6L2 8l10-6Z M2 12l10 6 10-6 M2 16l10 6 10-6',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M4 21v-2a8 8 0 0 1 16 0v2',
  settings:
    'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  sparkles: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z M20 2v4 M18 4h4',
  check: 'm5 12 4 4L19 6',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M12 7v5l3 2',
  flame: 'M12 2c2 5 6 5 7 10 2 6-2 10-7 10S3 18 5 13c1-3 3-4 3-6 2 2 1 4 2 5 2-3 3-5 2-10Z',
  play: 'm9 5 11 7-11 7V5Z',
  pause: 'M8 5v14 M16 5v14',
  volume: 'M3 9h4l5-4v14l-5-4H3V9Z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z m-2 5 6 6',
  plus: 'M12 5v14 M5 12h14',
  close: 'm6 6 12 12 M18 6 6 18',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  send: 'm22 2-7 20-4-9-9-4 20-7Z M11 13 22 2',
  coffee:
    'M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z M16 9h2a3 3 0 0 1 0 6h-2 M3 23h15 M7 2v3 M12 2v3',
  briefcase: 'M3 7h18v14H3V7Z M8 7V3h8v4 M3 12l9 3 9-3 M12 12v5',
  food: 'M4 3v6a3 3 0 0 0 6 0V3 M7 3v18 M20 3c-4 0-4 5-4 9h4 M20 3v18',
  bag: 'M4 7h16l1 14H3L4 7Z M8 8V6a4 4 0 0 1 8 0v2',
  cap: 'm2 8 10-5 10 5-10 5L2 8Z M6 10v7l6 3 6-3v-7 M22 8v8',
  trophy:
    'M8 3h8v8a4 4 0 0 1-8 0V3Z M8 5H3v3a5 5 0 0 0 5 5 M16 5h5v3a5 5 0 0 1-5 5 M12 15v5 M8 21h8',
  logout: 'M10 3H3v18h7 M10 12h12 m-5-5 5 5-5 5',
  repeat: 'M3 8h15l-3-3 M21 16H6l3 3 M21 8v4 M3 16v-4',
};
export function BieuTuong({
  ten,
  size = 20,
  className = '',
}: {
  ten: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[ten] ?? paths.sparkles} />
    </svg>
  );
}
