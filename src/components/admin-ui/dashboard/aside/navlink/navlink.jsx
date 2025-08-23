'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function NavLink({ icon, link, title }) {
  const pathname = usePathname()
  const isActive = pathname === link

  return (
    <Link
      href={link}
      className={`flex items-center p-3 space-x-3 text-sm rounded-lg cursor-pointer transition-all duration-200 group ${
        isActive 
          ? 'bg-primary/20 text-primary border border-primary/30' 
          : 'text-grey hover:text-white hover:bg-background/50'
      }`}
    >
      <span className={`text-lg transition-colors ${isActive ? 'text-primary' : 'text-grey group-hover:text-white'}`}>
        {icon}
      </span>
      <span className="font-mono font-medium">{title}</span>
    </Link>
  )
}

export default NavLink
