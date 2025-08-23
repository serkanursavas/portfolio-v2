'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const MainNavigation = ({ isOpen, toggleMenu }) => {
  const pathname = usePathname();

  return (
    <div className="w-full relative">
      <div
        id="mainNav"
        className={`${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        } bg-background flex flex-col absolute w-full h-auto lg:relative lg:flex
          lg:visible lg:opacity-100`}
      >
        <ul className="mt-16 text-4xl space-y-9 font-light text-grey lg:flex lg:space-y-0 lg:mt-0 lg:gap-8 lg:text-lg">
          <li>
            <Link
              href="/"
              onClick={toggleMenu}
              className={`${pathname === '/' ? 'text-white' : 'text-grey'} block py-2 px-4 lg:py-1 lg:px-2 hover:text-white transition-colors`}
            >
              <span className="text-primary">#</span>home
            </Link>
          </li>
          <li>
            <Link
              href="/works"
              onClick={toggleMenu}
              className={`${pathname === '/works' ? 'text-white' : 'text-grey'} block py-2 px-4 lg:py-1 lg:px-2 hover:text-white transition-colors`}
            >
              <span className="text-primary">#</span>works
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              onClick={toggleMenu}
              className={`${pathname === '/about' ? 'text-white' : 'text-grey'} block py-2 px-4 lg:py-1 lg:px-2 hover:text-white transition-colors`}
            >
              <span className="text-primary">#</span>about-me
            </Link>
          </li>
          <li>
            <Link
              href="/blog"
              onClick={toggleMenu}
              className={`${pathname === '/blog' || pathname.startsWith('/blog/') ? 'text-white' : 'text-grey'} block py-2 px-4 lg:py-1 lg:px-2 hover:text-white transition-colors`}
            >
              <span className="text-primary">#</span>blog
            </Link>
          </li>
          <li>
            <Link
              href="/contacts"
              onClick={toggleMenu}
              className={`${pathname === '/contacts' ? 'text-white' : 'text-grey'} block py-2 px-4 lg:py-1 lg:px-2 hover:text-white transition-colors`}
            >
              <span className="text-primary">#</span>contacts
            </Link>
          </li>
        </ul>
        <div className="mt-28 flex space-x-3 justify-center lg:hidden items-center">
          <a href="https://github.com/serkanursavas" target="_blank" rel="noopener noreferrer">
            <Image
              className="w-[62px] hover:opacity-50 transition-all duration-200"
              src="/github.svg"
              alt="github"
              width={62}
              height={62}
            />
          </a>
          <a href="https://www.linkedin.com/in/serkanursavas/" target="_blank" rel="noopener noreferrer">
            <Image
              className="w-[52px] hover:opacity-50 transition-all duration-200"
              src="/linkedin.svg"
              alt="linkedin"
              width={52}
              height={52}
            />
          </a>
        </div>
      </div>
    </div>
  );
};

export default MainNavigation;