'use client'

import ProjectItem from '@/components/ProjectItem';
import AnimatedPage from '@/components/UI/AnimatedPage';
import PageTitle from '@/components/PageTitle';
import { getProjects } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function Works() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch projects (tracking otomatik AnalyticsProvider'da yapılıyor)
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const { projects = [] } = await getProjects();
        setProjects(projects);
        setError(null);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Failed to load projects');
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);
  if (loading) {
    return (
      <AnimatedPage>
        <PageTitle title="projects" subtitle="List of my projects" />
        <div className="mt-16 flex justify-center">
          <div className="w-16 h-16 border-4 border-grey border-l-primary rounded-full animate-spin"></div>
        </div>
      </AnimatedPage>
    );
  }

  if (error) {
    return (
      <AnimatedPage>
        <PageTitle title="projects" subtitle="List of my projects" />
        <div className="mt-16 text-center text-red-500">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 border border-primary px-4 py-2 hover:bg-primary/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageTitle
        title="projects"
        subtitle="List of my projects"
      />

      <div className="mt-16 text-white mb-16">
        <h2 className="text-2xl">
          <span className="text-primary">#</span>complete-apps
        </h2>
        <section className="mt-10 space-y-6 sm:grid sm:grid-cols-2 sm:space-y-0 sm:gap-10 lg:hidden">
          {projects.map(project => (
            <ProjectItem
              key={project.id}
              title={project.title}
              thumbnail={project.image}
              description={project.description}
              tools={JSON.stringify(project.tools)}
              link={project.link}
              status={project.status}
              projectId={project.id}
              source="works_page"
            />
          ))}
          {/* Coming Soon Project for mobile/tablet */}
          <ProjectItem
            title=""
            thumbnail=""
            description=""
            tools=""
            link=""
            status="null"
          />
        </section>
        <section className="hidden mt-10 space-y-6 lg:grid lg:grid-cols-3 lg:space-y-0 lg:gap-10">
          {projects.map(project => (
            <ProjectItem
              key={project.id}
              title={project.title}
              thumbnail={project.image}
              description={project.description}
              tools={JSON.stringify(project.tools)}
              link={project.link}
              status={project.status}
              projectId={project.id}
              source="works_page"
            />
          ))}
          {/* Coming Soon Project for desktop */}
          <ProjectItem
            title=""
            thumbnail=""
            description=""
            tools=""
            link=""
            status="null"
          />
        </section>
      </div>
    </AnimatedPage>
  );
}