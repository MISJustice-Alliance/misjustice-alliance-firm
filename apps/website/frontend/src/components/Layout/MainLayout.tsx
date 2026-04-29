import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Account for fixed header height with padding */}
      <main className="flex-grow pt-24 pb-8">
        {children}
      </main>

      <Footer />
    </div>
  );
};
