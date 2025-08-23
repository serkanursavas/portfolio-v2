'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const Background = () => {
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
        emojis: ['🇬🇧', '✈️', '🎧'],
        confettiNumber: 20,
        emojiSize: 70
      });
    }
  };

  return (
    <div className="hidden sm:block">
      <div
        onClick={easterEgg}
        className="absolute -right-9 lg:-right-4 top-[700px] lg:top-[400px] w-[90px] h-[90px] border border-grey cursor-pointer"
      ></div>

      <div className="max-[375px]:hidden absolute -right-[90px] top-[1200px] lg:top-[950px] lg:w-[140px] w-[130px] h-[130px] border border-grey"></div>
      <div className="max-[375px]:hidden absolute -left-[55px] lg:-left-[30px] top-[2320px] lg:top-[2170px] w-[90px] lg:h-[150px] h-[90px] border border-grey"></div>
      <Image
        className="max-[375px]:hidden absolute -right-2 bottom-[450px] lg:bottom-[750px]"
        src="/dots31.png"
        alt="dots31"
        width={60}
        height={60}
        style={{ width: 'auto', height: 'auto' }}
        sizes="(max-width: 1200px) 60px, 80px"
      />
      <Image
        className="max-[375px]:hidden absolute -left-5 bottom-12 lg:bottom-72"
        src="/dots31.png"
        alt="dots31"
        width={60}
        height={60}
        style={{ width: 'auto', height: 'auto' }}
        sizes="(max-width: 1200px) 60px, 80px"
      />
    </div>
  );
};

export default Background;