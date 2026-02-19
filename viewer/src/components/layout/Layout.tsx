import type { ReactNode } from 'react';

interface LayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
}

export function Layout({ sidebar, main }: LayoutProps) {
  return (
    <div className="h-full flex bg-bg-primary">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-border-default bg-bg-secondary flex flex-col">
        {sidebar}
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {main}
      </main>
    </div>
  );
}
