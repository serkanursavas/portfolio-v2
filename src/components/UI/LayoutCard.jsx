'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const LayoutCard = ({ children }) => {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-[100vh] sm:min-h-[80vh] px-5 pt-5 pb-9 sm:p-16 sm:pt-12 relative overflow-hidden lg:max-w-[1200px] lg:mx-auto">
      {children}
    </div>
  );
};

export default LayoutCard;