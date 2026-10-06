import type { ReactNode } from 'react';
export function TieuDeTrang({ ten, children }: { ten: string; children?: ReactNode }) {
  return (
    <div className="page-heading">
      <h1>{ten}</h1>
      {children}
    </div>
  );
}
