import Image from 'next/image';
import AnimatedPage from '@/components/UI/AnimatedPage';
import PageTitle from '@/components/PageTitle';

export const metadata = {
  title: "Contact - Serkan Ursavas",
  description: "Get in touch with Serkan Ursavas for freelance opportunities and collaborations.",
};

export default function Contact() {
  return (
    <AnimatedPage>
      <PageTitle
        title="contacts"
        subtitle="Who am i?"
      />

      {/* Decorative elements */}
      <div className="lg:hidden relative">
        <div className="absolute -right-9 top-28 w-[80px] h-[80px] border border-grey"></div>
        <Image
          className="max-[375px]:hidden w-[45px] absolute right-0 sm:left-72 sm:top-96 sm:rotate-[90deg] sm:w-[90px] bottom-20"
          src="/dots31.png"
          alt="dots"
          width={90}
          height={90}
        />
        <div className="max-[375px]:hidden absolute -left-10 -bottom-2 sm:bottom-12 w-[80px] h-[80px] border border-grey"></div>
      </div>

      <div className="mt-16 text-grey sm:flex sm:gap-36">
        <p className="basis-2/5">
          I'm interested in freelance opportunities. However, if you have other request or question, don't hesitate to
          contact me
        </p>
        <div className="mt-16 space-y-8 sm:mt-0 sm:flex sm:flex-col sm:items-end">
          <div className="border border-grey p-4 space-y-2 w-fit h-fit">
            <h6 className="text-white font-normal">Support me here</h6>
            <div className="flex space-x-1 items-center">
              <Image
                src="/bitcoin.svg"
                alt="Bitcoin"
                width={32}
                height={32}
                className="object-contain"
              />
              <p className="max-[400px]:text-sm max-[350px]:text-[11px]">18oPy6NeC7kqaPBVsrC6cwhmQHzb94UN3n</p>
            </div>
          </div>

          <div className="border border-grey p-4 space-y-2 w-fit">
            <h6 className="text-white font-normal">Message me here</h6>
            <div className="flex space-x-2 max-[400px]:text-sm max-[350px]:text-[11px] items-center">
              <Image
                src="/discord.svg"
                alt="Discord"
                width={32}
                height={32}
                className="object-contain"
              />
              <p>Serkan#2792</p>
            </div>
            <div className="flex space-x-2 max-[400px]:text-sm max-[350px]:text-[11px] items-center">
              <Image
                src="/mail.svg"
                alt="Email"
                width={32}
                height={32}
                className="object-contain"
              />
              <p>serkan.ursavas@icloud.com</p>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}