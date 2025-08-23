'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { MdLogout } from 'react-icons/md'
import Image from 'next/image'

function Navbar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <nav className="flex items-center justify-between p-5 rounded-[10px] bg-bgSoft">
      <p className="font-semibold uppercase text-textSoft ">
        {pathname.split('/').pop()}
      </p>
      <div className="flex items-center space-x-8">
        <div className="flex items-center justify-center space-x-2">
          <Image
            className="rounded-full max-w-[45px] max-h-[45px] object-cover"
            src="/pp.jpg"
            alt=""
            width={45}
            height={45}
          />
          <div>
            <p>{user?.username || 'Admin'}</p>
            <p className="text-sm text-textSoft">Administrator</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center p-3 space-x-1 rounded-[10px] cursor-pointer hover:bg-[#2e374a]"
        >
          <MdLogout />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}

export default Navbar
