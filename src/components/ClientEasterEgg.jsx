'use client';

import Image from "next/image";
import { useEffect, useState } from 'react';

export default function ClientEasterEgg() {
  const [jsConfetti, setJsConfetti] = useState(null);

  useEffect(() => {
    // JSConfetti'yi sadece client-side'da initialize et
    import('js-confetti').then((JSConfettiModule) => {
      const JSConfetti = JSConfettiModule.default;
      const confettiInstance = new JSConfetti();
      setJsConfetti(confettiInstance);
    }).catch((error) => {
      console.error('JSConfetti yükleme hatası:', error);
    });
  }, []);

  const easterEgg = () => {
    if (jsConfetti) {
      jsConfetti.addConfetti({
        emojis: ['🌸', '🇰🇷'],
        confettiNumber: 20,
        emojiSize: 70
      });
    }
  };

  const easterEgg1 = () => {
    if (jsConfetti) {
      jsConfetti.addConfetti({
        emojis: ['🏋🏻', '💻'],
        confettiNumber: 20,
        emojiSize: 70
      });
    }
  };

  return (
    <Image
      className="w-[120px] h-[120px] absolute bottom-0 left-5 cursor-pointer hover:scale-110 transition-transform"
      src="/logoPrimary.svg"
      alt="logo"
      width={120}
      height={120}
      onClick={easterEgg}
    />
  );
}