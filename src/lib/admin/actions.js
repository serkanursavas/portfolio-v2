'use server'

import { signIn, signOut } from './auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Go API base URL
const API_BASE_URL = process.env.API_URL || 'http://localhost:8082'

export const addProject = async formData => {
  const { title, tools, link, img, status, desc } = Object.fromEntries(formData)

  const parsedTools = JSON.parse(tools)
  const transformedTools = parsedTools.map(tool => tool.name)
  const pureTools = transformedTools.map(item => ({
    skill: item.skill,
    icon: item.icon
  }))

  try {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description: desc,
        image: img,
        link,
        tools: pureTools,
        status
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create project via API')
    }
  } catch (error) {
    console.log(error)
    throw new Error('Failed to create project!')
  }

  revalidatePath('/admin/projects')
  redirect('/admin/projects')
}

export const updateProject = async formData => {
  const { id, title, tools, img, link, status, desc } = Object.fromEntries(formData)

  const parsedTools = JSON.parse(tools)
  const transformedTools = parsedTools.map(tool => tool.name)
  const pureTools = transformedTools.map(item => ({
    skill: item.skill,
    icon: item.icon
  }))

  try {
    const updateData = {}
    if (title) updateData.title = title
    if (desc) updateData.description = desc
    if (img) updateData.image = img
    if (link) updateData.link = link
    if (status) updateData.status = status
    if (pureTools.length > 0) updateData.tools = pureTools

    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      throw new Error('Failed to update project via API')
    }
  } catch (error) {
    console.log(error)
    throw new Error('Failed to update projects!')
  }

  revalidatePath('/admin/projects')
  redirect('/admin/projects')
}

export const deleteProject = async formData => {
  const { id } = Object.fromEntries(formData)

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete project via API')
    }
  } catch (error) {
    console.log(error)
    throw new Error('Failed to delete projects!')
  }

  revalidatePath('/admin/projects')
  redirect('/admin/projects')
}

export const authenticate = async formData => {
  const { username, password } = Object.fromEntries(formData)

  try {
    await signIn('credentials', { username, password })
  } catch (error) {
    if (error.digest && error.digest.toString().slice(0, 13) === 'NEXT_REDIRECT') {
      redirect('/admin')
    }
    return 'Wrong Credentials!'
  }
}

export const logout = async () => {
  await signOut()
}

export const addSkill = async formData => {
  const { skill, icon, category } = Object.fromEntries(formData)

  try {
    const response = await fetch(`${API_BASE_URL}/api/skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        skill,
        icon,
        category
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create skill via API')
    }
  } catch (error) {
    console.log(error)
    throw new Error('Failed to add skill!')
  }

  revalidatePath('/admin/skills')
  redirect('/admin/skills')
}

export const deleteSkill = async formData => {
  const { id } = Object.fromEntries(formData)

  try {
    const response = await fetch(`${API_BASE_URL}/api/skills/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete skill via API')
    }
  } catch (error) {
    console.log(error)
    throw new Error('Failed to delete skill!')
  }

  revalidatePath('/admin/skills')
  redirect('/admin/skills')
}
