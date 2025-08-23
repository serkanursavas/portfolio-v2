import TypingEffect from './UI/TypingEffect';

const PageTitle = ({ title, subtitle }) => {
  return (
    <div className="mt-8 text-white">
      <p className="font-medium text-[36px]">
        <span className="text-primary">/</span>
        {title}
      </p>
      <p className="mt-1 font-light">
        <TypingEffect strings={[subtitle]} />
      </p>
    </div>
  );
};

export default PageTitle;