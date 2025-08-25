'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import AnimatedPage from '@/components/UI/AnimatedPage'
import ButtonPrimary from '@/components/UI/ButtonPrimary'
import SkillsItems from '@/components/SkillsItems'
import { useEffect, useState } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function HomeClient({ projects, categories, skills }) {
  // Helper function to group skills by category
  function getSkillsByCategory(category) {
    return skills.filter(skill => skill.category === category)
  }
  const [jsConfetti, setJsConfetti] = useState(null)
  const { trackPageVisit, trackSiteVisit, trackProjectView, trackProjectViewLegacy } = useAnalytics()

  useEffect(() => {
    // Analytics tracking - Ana sayfa ziyareti
    trackPageVisit('/')
    trackSiteVisit()
  }, [trackPageVisit, trackSiteVisit])

  useEffect(() => {
    // JSConfetti'yi sadece client-side'da initialize et
    import('js-confetti')
      .then(JSConfettiModule => {
        const JSConfetti = JSConfettiModule.default
        const confettiInstance = new JSConfetti()
        setJsConfetti(confettiInstance)
      })
      .catch(error => {
        console.error('JSConfetti yükleme hatası:', error)
      })
  }, [])

  const easterEgg = () => {
    if (jsConfetti) {
      jsConfetti.addConfetti({
        emojis: ['🌸', '🇰🇷'],
        confettiNumber: 20,
        emojiSize: 70
      })
    }
  }

  const easterEgg1 = () => {
    if (jsConfetti) {
      jsConfetti.addConfetti({
        emojis: ['🏋🏻', '💻'],
        confettiNumber: 20,
        emojiSize: 70
      })
    }
  }

  return (
    <AnimatedPage>
      <main className="w-full">
        <div className="sm:grid sm:grid-cols-2 sm:gap-4 sm:mt-8 sm:items-center lg:gap-24">
          <div className="mt-8 text-white text-[24px] sm:text-[36px] space-y-6 font-medium sm:leading-[48px]">
            Serkan is a <span className="text-primary">web designer</span> and
            <span className="text-primary"> front-end developer</span>
            <p className=" text-grey text-sm sm:text-base font-normal">He crafts responsive websites where technologies meet creativity</p>
            <div className="hidden sm:block">
              <ButtonPrimary
                name="Contact me!!"
                link="/contacts"
                icon=""
              />
            </div>
          </div>
          <div>
            <div className="mt-10 sm:mt-4 block relative h-80 overflow-hidden lg:px-12">
              <div className="h-80 w-72 overflow-hidden mx-auto rounded-sm border border-primary">
                <Image
                  className="relative rounded-sm z-10"
                  src="/anony.jpg"
                  alt="Profile Picture"
                  width={288}
                  height={320}
                />
              </div>
            </div>
            <div className="p-2 border border-grey flex space-x-3 items-center mt-12 sm:hidden">
              <div className="w-4 h-4 bg-primary"></div>
              <p className="text-xs sm:text-base text-grey">
                Currently working on <span className="text-white font-medium">React-Native</span>
              </p>
            </div>
          </div>
        </div>

        <div className="hidden sm:block relative z-20 text-2xl lg:text-xl text-white mt-24 mx-auto p-8 border border-grey w-fit">
          <p>Lorem ipsum, dolor sit amet consectetur adipisicing.</p>
          <div className="absolute -top-5 left-5 bg-background w-[39px] h-[39px] z-10">
            <Image
              className="absolute top-2 left-2"
              src="/quote.png"
              alt="Quote"
              width={20}
              height={20}
            />
          </div>
          <div className="absolute -bottom-5 right-5 bg-background w-[39px] h-[39px] z-10">
            <Image
              className="absolute bottom-2 right-2 rotate-180"
              src="/quote.png"
              alt="Quote"
              width={20}
              height={20}
            />
          </div>
          <p
            onClick={easterEgg1}
            className="absolute p-4 border border-grey -right-[1px] -bottom-[66px] lg:-bottom-[62px] font-light cursor-pointer hover:text-primary transition-colors"
          >
            Anonymous
          </p>
        </div>

        <section className="">
          <div className="mt-12 sm:mt-36 text-white flex items-center justify-between space-x-4">
            <div className="flex space-x-4 items-center">
              <h2 className="font-medium text-[24px] sm:text-[36px]">
                <span className="text-primary">#</span>
                projects
              </h2>
              <div className="sm:w-[510px] h-[1px] bg-primary"></div>
            </div>
            <Link href="/works">
              <div className="flex items-center space-x-2 text-white hover:text-primary transition-colors">
                <p>View All</p>
                <ArrowRight size={16} />
              </div>
            </Link>
          </div>

          <div className="mt-6 sm:mt-12 w-full flex flex-col sm:grid grid-cols-3 gap-8">
            {projects.map(project => (
              <div
                key={project.id}
                className="border border-grey flex flex-col"
              >
                <div className="max-w-[600px] max-h-[265px]">
                  <Image
                    src={project.image}
                    alt={project.title}
                    width={600}
                    height={365}
                  />
                </div>
                <div className="flex flex-row flex-wrap items-center gap-2 p-2 border-b border-t h-[74px] border-grey text-grey font-light">
                  {project.tools.slice(0, 3).map((tool, index) => (
                    <div
                      key={index}
                      className="flex space-x-1 items-center"
                    >
                      <Image
                        src={tool.icon}
                        alt={tool.skill}
                        width={16}
                        height={16}
                      />
                      <span>{tool.skill}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col p-4 gap-4 justify-between">
                  <p className="text-2xl text-white">{project.title}</p>
                  <p className="font-light text-grey min-h-[50px]">{project.description}</p>
                  <div>
                    <a
                      href={project.link}
                      className="border text-base border-primary w-fit py-2 px-4 hover:bg-[#C778DD] hover:bg-opacity-20 transition-all duration-200 inline-flex items-center gap-2 text-white"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        // Analytics tracking - Homepage Live link tıklanması
                        if (project.id) {
                          trackProjectView(project.id, 'homepage')
                        }
                        trackProjectViewLegacy() // V1 compatibility
                      }}
                    >
                      {project.status}
                      <FontAwesomeIcon
                        icon={faChevronRight}
                        className="text-xs"
                      />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="hidden sm:block">
          <div className="mt-36 text-white flex items-center justify-between space-x-4">
            <div className="flex space-x-4 items-center">
              <h2 className="font-medium text-[36px]">
                <span className="text-primary">#</span>
                skills
              </h2>
              <div className="w-[240px] h-[1px] bg-primary"></div>
            </div>
          </div>
          <div className="mt-3 ml-8 flex justify-between">
            <div className="relative w-[350px] h-[280px] hidden lg:block">
              <Image
                className="w-[63px] h-[63px] absolute top-6"
                src="/dots.svg"
                alt="dots"
                width={63}
                height={63}
              />
              <Image
                className="w-[63px] h-[63px] absolute left-[50%] top-[50%]"
                src="/dots.svg"
                alt="dots"
                width={63}
                height={63}
              />
              <Image
                className="w-[120px] h-[120px] absolute bottom-0 left-5 cursor-pointer hover:scale-110 transition-transform"
                src="/logoPrimary.svg"
                alt="logo"
                width={120}
                height={120}
                onClick={easterEgg}
              />
              <div className="w-24 h-24 border border-grey absolute top-0 right-6"></div>
              <div className="w-16 h-16 border border-grey absolute bottom-6 right-0"></div>
            </div>
            <div className="h-[400px] flex flex-end flex-wrap lg:flex-wrap-reverse flex-col gap-5 mt-8">
              {categories.map((category, index) => (
                <div
                  key={index}
                  className="w-[170px] text-white text-base"
                >
                  <SkillsItems
                    title={category}
                    skill={getSkillsByCategory(category).sort((a, b) => a.skill.localeCompare(b.skill))}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hidden sm:block mt-20">
          <div className="flex gap-56 max-[1000px]:gap-2 max-[950px]:flex-col">
            <div className="basis-2/3 mt-6 space-y-6">
              <div className="mt-16 text-white flex items-center justify-between space-x-4">
                <div className="flex space-x-4 items-center">
                  <h2 className="font-medium text-[36px]">
                    <span className="text-primary">#</span>
                    about-me
                  </h2>
                  <div className="w-[325px] h-[1px] bg-primary"></div>
                </div>
              </div>
              <p className="mt-6 text-grey text-base">
                Hello, I'm Serkan! I'm a self-taught front-end developer based in Adana, Turkey. I can develop responsive websites from scratch and
                raise them into modern user-friendly web experiences.
              </p>

              <ButtonPrimary
                name="Read More"
                link="/about"
                icon=""
              />
            </div>
            <div className="relative">
              <Image
                className="absolute right-4 top-64 max-w-[104px]"
                src="/dots36.svg"
                alt="Dots"
                width={104}
                height={104}
              />
              <Image
                className="absolute -left-4 top-12 w-[84px]"
                src="/dots.svg"
                alt="Dots"
                width={84}
                height={84}
              />
            </div>
          </div>
        </section>

        <section className="hidden sm:block">
          <div className="mt-36 text-white flex items-center justify-between space-x-4">
            <div className="flex space-x-4 items-center">
              <h2 className="font-medium text-[36px]">
                <span className="text-primary">#</span>
                contacts
              </h2>
              <div className="w-[125px] h-[1px] bg-primary"></div>
            </div>
          </div>
          <div className="flex text-grey gap-24 mt-6">
            <p className="text-base w-[500px]">
              I'm interested in freelance opportunities. However, if you have other request or question, don't hesitate to contact me
            </p>
            <div className="border border-grey p-4 space-y-2 w-fit mt-12">
              <h6 className="text-white font-normal">Message me here</h6>
              <div className="flex items-center space-x-2">
                <Image
                  className="object-contain"
                  src="/discord.svg"
                  alt="discord"
                  width={16}
                  height={16}
                />
                <p>Serkan#2792</p>
              </div>
              <div className="flex items-center space-x-2 min-w-[265px] h-fit">
                <Image
                  className="object-contain"
                  src="/mail.svg"
                  alt="mail"
                  width={16}
                  height={16}
                />
                <p>serkan.ursavas@icloud.com</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AnimatedPage>
  )
}
