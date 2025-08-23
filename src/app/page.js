import HomeClient from '@/components/HomeClient';
import { getProjects, getSkills } from '@/lib/api';

export default async function Home() {
  // Fetch data from API
  const { projects = [] } = await getProjects();
  const { categories = [], skills = [] } = await getSkills();
  
  // Get first 3 projects for homepage
  const featuredProjects = projects.slice(0, 3);
  
  return (
    <HomeClient 
      projects={featuredProjects} 
      categories={categories}
      skills={skills}
    />
  );
}