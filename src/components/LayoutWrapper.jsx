'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import LayoutCard from './UI/LayoutCard';
import Header from './Header';
import MainNavigation from './MainNavigation';
import Footer from './Footer';
import Background from './UI/Background';
import Media from './UI/Media';
import AnalyticsProvider from './AnalyticsProvider';

const LayoutWrapper = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  function toggleMenu() {
    setIsOpen(!isOpen);
  }

  // Admin sayfaları için main layout'u atla
  if (pathname?.startsWith('/admin')) {
    return <div className="admin-layout h-screen overflow-hidden">{children}</div>
  }

  return (
    <div className="relative overflow-hidden">
      <AnalyticsProvider />
      {!isOpen && <Media />}
      <LayoutCard>
        <Header
          toggleMenu={toggleMenu}
          isOpen={isOpen}
        />

        <div className="lg:hidden">
          <MainNavigation
            toggleMenu={toggleMenu}
            isOpen={isOpen}
          />
        </div>

        {!isOpen && (
          <div className="w-full">
            {children}
          </div>
        )}
      </LayoutCard>
      <div className="hidden lg:block">
        <Background />
      </div>
      {!isOpen && <Footer />}
    </div>
  );
};

export default LayoutWrapper;