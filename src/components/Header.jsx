import Image from 'next/image'
import Link from 'next/link'
import MainNavigation from './MainNavigation'

const Header = ({ toggleMenu, isOpen }) => {
  return (
    <header className="flex justify-between w-full">
      <Link href="/">
        <div className="flex items-center space-x-2 lg:text-lg hover:opacity-70">
          <Image
            src="/union.png"
            alt="Logo"
            width={22}
            height={22}
            style={{ width: '22px', height: '22px' }}
            className="w-5.5 h-5.5"
            priority
          />
          <span className="text-white">Serkan</span>
        </div>
      </Link>
      <div>
        <MainNavigation />
      </div>
      <button
        onClick={toggleMenu}
        className="lg:hidden"
      >
        <div id={`${isOpen ? 'hamburger-close' : 'hamburger-button'}`}></div>
      </button>
    </header>
  )
}

export default Header
