import Image from 'next/image';

const Media = () => {
  return (
    <div className="fixed top-0 left-4 hidden lg:block">
      <div className="flex flex-col gap-2 items-center max-w-[32px]">
        <div className="w-[1px] h-48 bg-grey"></div>
        <a href="https://github.com/serkanursavas" target="_blank" rel="noopener noreferrer">
          <Image
            className="rounded-full hover:scale-110 transition-all duration-200"
            src="/github.svg"
            alt="github"
            width={32}
            height={32}
          />
        </a>
        <a href="https://www.linkedin.com/in/serkanursavas/" target="_blank" rel="noopener noreferrer">
          <Image
            className="rounded-full hover:scale-110 transition-all duration-200 max-w-[26px]"
            src="/linkedin.svg"
            alt="linkedin"
            width={26}
            height={26}
          />
        </a>
      </div>
    </div>
  );
};

export default Media;