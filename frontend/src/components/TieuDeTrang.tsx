import type { ReactNode } from 'react';
export function TieuDeTrang({
  nhan,
  ten,
  moTa,
  children,
}: {
  nhan: string;
  ten: string;
  moTa: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{nhan}</p>
        <h1>{ten}</h1>
        <p className="muted">{moTa}</p>
      </div>
      {children}
    </div>
  );
}
