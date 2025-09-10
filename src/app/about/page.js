import Image from "next/image";
import AnimatedPage from "@/components/UI/AnimatedPage";
import PageTitle from "@/components/PageTitle";
import SkillsItems from "@/components/SkillsItems";
import { getSkills } from '@/lib/api';

export const metadata = {
  title: "About - Serkan Ursavas",
  description: "Learn more about Serkan Ursavas, a self-taught front-end developer based in Adana, Turkey.",
};

// Force no cache for about page to get fresh skill data
export const revalidate = 0;

// Helper function to group skills by category
function getSkillsByCategory(skills, category) {
  return skills.filter(skill => skill.category === category);
}

export default async function About() {
  // Fetch skills from API
  const { categories = [], skills = [] } = await getSkills();

  return (
    <AnimatedPage>
      <PageTitle
        title="about-me"
        subtitle="Who am i?"
      />

      <section className="sm:grid sm:grid-cols-2 sm:gap-36 sm:mt-10 lg:mt-8">
        <div className="sm:flex sm:flex-col sm:justify-center">
          <div className="mt-16 sm:mt-0 flex gap-1 justify-between items-end">
            <p className="basis-3/5 sm:basis-auto leading-6 max-[330px]:text-xs text-grey sm:text-base sm:leading-7">
              Hello, I'm Serkan! I'm a self-taught front-end developer based in Adana,
              Turkey. I can develop responsive websites from scratch and raise them into
              modern user-friendly web experiences.
            </p>
            <div className="relative max-w-[170px] basis-2/5 sm:hidden">
              <Image
                src="/pp.jpg"
                alt="About Me"
                width={170}
                height={170}
                className="rounded"
              />
            </div>
          </div>
          <p className="mt-4 text-grey text-sm max-[330px]:text-xs sm:text-base sm:leading-7">
            Transforming my creativity and knowledge into a websites has been my passion
            for over a year. I have been helping various clients to establish their
            presence online. I always strive to learn about the newest technologies and
            frameworks.
          </p>
        </div>
        <div className="relative">
          <div className="hidden sm:block relative w-full lg:flex lg:justify-center">
            <Image
              src="/pp.jpg"
              alt="Profile Picture"
              width={320}
              height={320}
              className="relative rounded-sm z-0 w-80 h-w-80 border border-grey"
            />
          </div>
        </div>
      </section>

      <section className="mt-16 text-white">
        <h2 className="text-2xl">
          <span className="text-primary">#</span>skills
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 text-sm font-light max-[330px]:text-xs sm:grid-cols-5">
          {categories.map((category, index) => (
            <SkillsItems
              key={index}
              title={category}
              skill={getSkillsByCategory(skills, category).sort((a, b) => a.skill.localeCompare(b.skill))}
            />
          ))}
        </div>
      </section>

      <section className="mt-16 text-white">
        <h2 className="text-2xl">
          <span className="text-primary">#</span>my-fun-facts
        </h2>
        <div className="mt-6 text-grey space-y-4 text-sm font-light max-[330px]:text-xs sm:flex sm:space-y-0 sm:flex-wrap sm:gap-5">
          <div className="border border-grey p-2 sm:w-fit">
            <p>
              I like to work more at <span className="text-white">night</span> than during
              the day.
            </p>
          </div>
          <div className="border border-grey p-2">
            <p>
              I have only been to <span className="text-white">Adana</span> and{' '}
              <span className="text-white">Istanbul</span> so far.
            </p>
          </div>
          <div className="border border-grey p-2">
            <p>I am still in university.</p>
          </div>
        </div>
      </section>
    </AnimatedPage>
  );
}