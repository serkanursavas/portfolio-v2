import Image from 'next/image';

const Footer = () => {
  return (
    <div className="border-t-[1px] border-grey w-full z-20 relative bg-background text-sm">
      <div className="px-6 sm:px-40 py-8 text-white">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="border-b border-grey sm:border-b-0 pb-2">
            <div className="flex space-x-4">
              <div className="flex space-x-2 items-center">
                <Image
                  className="object-fit w-4"
                  src="/union.png"
                  alt="logo"
                  width={16}
                  height={16}
                  style={{ width: 'auto', height: 'auto' }}
                />
                <p>Serkan</p>
              </div>
              <p className="text-grey">serkan.ursavas@icloud.com</p>
            </div>
            <p className="mt-4">Web designer and front-end developer</p>
          </div>
          <div className="flex flex-col justify-center items-center mt-4">
            <p className="text-2xl">Media</p>
            <div className="flex mt-3 gap-2 items-center">
              <a href="https://github.com/serkanursavas" target="_blank" rel="noopener noreferrer">
                <Image
                  className="rounded-full hover:opacity-50 transition-all duration-200"
                  src="/github.svg"
                  alt="github"
                  width={32}
                  height={32}
                />
              </a>
              <a href="https://www.linkedin.com/in/serkanursavas/" target="_blank" rel="noopener noreferrer">
                <Image
                  className="rounded-full hover:opacity-50 transition-all duration-200"
                  src="/linkedin.svg"
                  alt="linkedin"
                  width={26}
                  height={26}
                  style={{ width: 'auto', height: 'auto' }}
                />
              </a>
            </div>
          </div>
        </div>
        <p className="mt-12 text-center text-grey">© Copyright 2025. Made by Serkan</p>
      </div>
    </div>
  );
};

export default Footer;