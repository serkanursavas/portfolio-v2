'use client'

import './editForm.css'
import { useEffect, useState } from 'react'
import Input from '../../input/input'
import ContentWrapper from '../../content-wrapper/contentWrapper'
import ToolSelectionForm from '../addProject/ToolSelectionForm'
import Image from 'next/image'
// import { updateProject } from '../../../../../lib/admin/actions' // Temporarily disabled for client component
// Firebase removed - using local upload system
import { MdImage } from 'react-icons/md'

function EditForm({ project, skillsData, projectTools }) {
  const [selectedTools, setSelectedTools] = useState([])
  const [selectedTrueTools, setSelectedTrueTools] = useState([])
  const [selectedStatus, setSelectedStatus] = useState(project.status)

  const [media, setMedia] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    // TODO: Implement client-side API call to update project
    console.log('Update project:', {
      id: formData.get('id'),
      title: formData.get('title'),
      desc: formData.get('desc'),
      img: formData.get('img'),
      link: formData.get('link'),
      status: formData.get('status'),
      tools: formData.get('tools')
    })
  }

  // Using local upload system

  function selectToolsHandler(tools) {
    setSelectedTools(tools)
  }

  useEffect(() => {
    const selectedItems = selectedTools.filter(tool => tool.isSelected)

    setSelectedTrueTools(selectedItems)
  }, [selectedTools])

  return (
    <div className="flex gap-12">
      <div style={{ flex: 1 }}>
        <ContentWrapper>
          <div className="flex flex-col items-center justify-center ">
            <div className="w-full h-[240px] justify-center items-center flex  relative rounded-md overflow-hidden mb-4">
              <Image
                className="object-contain"
                src={`${media || project.img || '/noproduct.jpg'}?v=${project.updated_at || Date.now()}`}
                alt=""
                width={400}
                height={240}
              />
            </div>
            <span className="mb-4">{project.title}</span>
          </div>
          <ToolSelectionForm
            onToolSelect={selectToolsHandler}
            skillsData={skillsData}
            projectTools={projectTools}
            editPage
          />
        </ContentWrapper>
      </div>
      <div style={{ flex: 1 }}>
        <ContentWrapper>
          <form onSubmit={handleSubmit}>
            <label>Image URL</label>
            <Input
              type="text"
              placeholder="Image URL (e.g., https://example.com/image.jpg)"
              name="img"
              value={media}
              onChange={(e) => setMedia(e.target.value)}
              editPage={true}
            />
            <input
              name="id"
              type="hidden"
              value={project._id}
            />
            <label>Title</label>
            <Input
              name="title"
              placeholder={project.title}
              editPage={true}
            />
            <Input
              name="tools"
              id="tools"
              type="hidden"
              editPage={true}
              value={JSON.stringify(selectedTrueTools)}
            />

            <label>Link</label>
            <Input
              name="link"
              placeholder={project.link}
              editPage={true}
            />
            <label>Status</label>
            <select
              name="status"
              id="status"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="p-7 outline-none bg-bgPrimary text-textSoft border-2 border-[#2e374a] rounded-md mb-7 w-[100%] cursor-pointer"
            >
              <option value={undefined}>Status</option>
              <option value="Live">Live</option>
              <option value="Github">Github</option>
            </select>
            <label>Description</label>
            <textarea
              type="text"
              rows="4"
              placeholder={project.desc}
              name="desc"
              className="p-7 bg-bgPrimary text-white border-2 border-[#2e374a] rounded-md mb-7 w-[100%]"
            />
            <button className="w-full bg-teal-700 border-none rounded-md cursor-pointer p-7">
              Update Project
            </button>
          </form>
        </ContentWrapper>
      </div>
    </div>
  )
}

export default EditForm
