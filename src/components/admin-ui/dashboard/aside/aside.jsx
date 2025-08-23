import NavLink from './navlink/navlink'
import { MdDashboard, MdTerminal, MdBolt, MdArticle } from 'react-icons/md'

const NavLinks = [
  {
    title: 'Dashboard',
    link: '/admin',
    icon: <MdDashboard />
  },
  {
    title: 'Projects',
    link: '/admin/projects',
    icon: <MdTerminal />
  },
  {
    title: 'Skills',
    link: '/admin/skills',
    icon: <MdBolt />
  },
  {
    title: 'Blog Posts',
    link: '/admin/blog',
    icon: <MdArticle />
  }
]

function Aside() {
  return (
    <div className="h-full flex flex-col p-6 text-white bg-bgSoft border-r border-primary/20">
      <div className="mb-8 text-center pb-6 border-b border-primary/30">
        <div className="text-primary text-2xl mb-2">⚡</div>
        <h2 className="text-lg font-light text-white">Admin Panel</h2>
        <div className="text-xs text-grey mt-1 font-mono">v2.0</div>
      </div>
      <nav className="flex-1 space-y-2">
        {NavLinks.map(item => (
          <NavLink
            key={item.link}
            title={item.title}
            icon={item.icon}
            link={item.link}
          />
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-grey/20">
        <div className="text-xs text-grey text-center font-mono">
          Powered by Go + Redis
        </div>
      </div>
    </div>
  )
}

export default Aside
