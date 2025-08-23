'use client'

import ProjectItem from '@/components/ProjectItem';
import AnimatedPage from '@/components/UI/AnimatedPage';
import PageTitle from '@/components/PageTitle';
import { getProjects } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function Works() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    // Fetch projects (tracking otomatik AnalyticsProvider'da yapılıyor)
    getProjects().then(({ projects = [] }) => {
      setProjects(projects);
    });
  }, []);
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