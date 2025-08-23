import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useAnalytics } from '@/hooks/useAnalytics'

const ProjectItem = ({ title, thumbnail, description, tools, link, status, projectId, source = 'unknown' }) => {
  const { trackProjectView, trackProjectViewLegacy } = useAnalytics()

  const handleLiveClick = () => {
    // Analytics tracking - Live link tıklanması 
    // Sadece bir kez track et (mobile ve desktop duplicate'lerini önle)
    const clickId = `${projectId}-${Date.now()}`
    if (window.lastProjectClick && (Date.now() - window.lastProjectClick) < 2000) {
      return // 2 saniye içinde multiple click'leri engelle
    }
    window.lastProjectClick = Date.now()
    
    trackProjectViewLegacy() // V1 compatibility
  }
  const parsedTools = tools ? JSON.parse(tools) : []

  // Coming Soon card
  if (status === 'null') {
    return (
      <div className="border border-grey p-4">
        <div className="h-48 flex items-center justify-center">
          <p className="text-grey text-lg">Coming Soon...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-grey flex flex-col">
      {/* Thumbnail */}
      <div className="max-w-[600px] max-h-[265px]">
        {thumbnail && (
          <Image
            src={thumbnail}
            alt={title}
            width={600}
            height={365}
            className="w-full h-auto"
            priority
          />
        )}
      </div>

      {/* Technology Icons */}
      <div className="border-b border-t h-[74px] p-2 font-light flex flex-wrap items-center gap-2">
        {parsedTools.map((item, index) => (
          <div
            key={index}
            className="flex space-x-1 items-center"
          >
            <Image
              src={item.icon}
              alt={item.skill}
              width={16}
              height={16}
              className="w-[16px] h-[16px]"
            />
            <span className="select-none text-grey text-sm">{item.skill}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col p-4 gap-4 justify-between">
        <h3 className="text-2xl text-white font-medium">{title}</h3>
        <p className="text-grey font-light min-h-[50px]">{description}</p>

        {/* Button */}
        <div className="flex space-x-2">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLiveClick}
            className="border text-base border-primary w-fit py-2 px-4 hover:bg-[#C778DD] hover:bg-opacity-20 transition-all duration-200 inline-flex items-center gap-2 text-white"
          >
            Live
            <FontAwesomeIcon
              icon={faChevronRight}
              className="text-xs"
            />
          </a>
        </div>
      </div>
    </div>
  )
}

export default ProjectItem
