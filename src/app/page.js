import HomeClient from '@/components/HomeClient';
import { getProjects, getSkills } from '@/lib/api';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

export default async function Home() {
  // Fetch data from API
  const { projects = [] } = await getProjects();
  const { categories = [], skills = [] } = await getSkills();
  
  // Get first 3 projects for homepage
  const featuredProjects = projects.slice(0, 3);
  
  return (
    <>
      <div className="w-full bg-orange-500 text-white text-center py-2 text-sm font-bold">
        🧡 TURUNCU BANNER TEST - Deployment script hazır!
      </div>
      <HomeClient 
        projects={featuredProjects} 
        categories={categories}
        skills={skills}
      />
    </>
  );
}