'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const SkillsItems = ({ title, skill }) => {
  const [jsConfetti, setJsConfetti] = useState(null);

  useEffect(() => {
    import('js-confetti').then((JSConfettiModule) => {
      const JSConfetti = JSConfettiModule.default;
      setJsConfetti(new JSConfetti());
    });
  }, []);

  const easterEgg = () => {
    if (jsConfetti) {
      jsConfetti.addConfetti({
        emojis: ['👩🏻‍💻', '✨', '🛻'],
        confettiNumber: 20,
        emojiSize: 70
      });
    }
  };

  return (
    <div className="border border-grey h-fit">
      <h6 className="p-2 border-b border-grey font-medium">
        {title.toUpperCase()}
      </h6>
      <div className="p-2 text-grey font-light flex gap-2 flex-wrap">
        {skill.map((item, index) => {
          return (
            <div
              key={index}
              className={`${
                item.skill === 'Javascript' ? 'cursor-pointer hover:text-primary ' : ''
              } flex space-x-1 items-center`}
              onClick={item.skill === 'Javascript' ? easterEgg : null}
            >
              <Image
                src={item.icon}
                alt={item.skill}
                width={16}
                height={16}
                className="w-[16px] h-[16px]"
              />
              <span className="select-none">{item.skill}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SkillsItems;