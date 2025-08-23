import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'

function ToolSelectionForm({ onToolSelect, skillsData, projectTools, editPage }) {
  const [selectedTools, setSelectedTools] = useState([])
  const initialized = useRef(false)

  // Memoize the callback to prevent unnecessary re-renders
  const stableOnToolSelect = useCallback(onToolSelect, [])

  useEffect(() => {
    // Initialize selected tools only once when component mounts
    if (!initialized.current) {
      if (projectTools && projectTools.length > 0) {
        const initialSelectedTools = projectTools.map(tool => ({
          skill: tool.skill || tool.name?.skill,
          icon: tool.icon || tool.name?.icon,
          isSelected: true
        }))
        setSelectedTools(initialSelectedTools)
      }
      initialized.current = true
    }
  }, [projectTools])

  // Separate useEffect to call onToolSelect when selectedTools changes
  useEffect(() => {
    if (initialized.current) {
      stableOnToolSelect(selectedTools)
    }
  }, [selectedTools, stableOnToolSelect])

  const handleToolChange = tool => {
    setSelectedTools(prevTools => {
      const toolIndex = prevTools.findIndex(t => t.skill === tool.skill)
      if (toolIndex >= 0) {
        return [
          ...prevTools.slice(0, toolIndex),
          { ...prevTools[toolIndex], isSelected: !prevTools[toolIndex].isSelected },
          ...prevTools.slice(toolIndex + 1)
        ]
      } else {
        return [...prevTools, { skill: tool.skill, icon: tool.icon, isSelected: true }]
      }
    })
  }

  return (
    <div
      className={`p-7 grid ${
        editPage ? 'grid-cols-2' : 'grid-cols-3'
      } gap-4 outline-none bg-bgPrimary text-textSoft border-2 border-[#2e374a] rounded-md mb-7 w-[100%]`}
    >
      {skillsData &&
        skillsData.map(skillData => {
          const isSelected = selectedTools.some(tool => tool.skill === skillData.skill && tool.isSelected)

          return (
            <div key={skillData._id || skillData.id || `skill-${skillData.skill}`}>
              <label className="flex space-x-4 cursor-pointer w-fit">
                <input
                  className="hidden"
                  type="checkbox"
                  name={skillData.skill}
                  checked={isSelected}
                  onChange={() => handleToolChange(skillData)}
                />
                <Image
                  src={skillData.icon}
                  alt={skillData.skill}
                  width={25}
                  height={25}
                  className="w-6 h-6"
                />
                <span className={isSelected ? 'text-green-600' : 'text-white'}>{skillData.skill}</span>
              </label>
            </div>
          )
        })}
    </div>
  )
}

export default ToolSelectionForm
