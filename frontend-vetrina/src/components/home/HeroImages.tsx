'use client';

import { useState, useEffect } from 'react';

const HERO_IMAGES = [
  { src: '/images/vetrina/natale_01.jpg', alt: 'Allestimento natalizio Luis' },
  { src: '/images/vetrina/natale_02.jpg', alt: 'Collezione Natale 2026' },
  { src: '/images/vetrina/natale_03.jpg', alt: 'Decorazioni natalizie per la casa' },
];

const CYCLE = 30; // secondi per ciclo completo
const COUNT = HERO_IMAGES.length;
const STEP = CYCLE / COUNT; // 6 secondi per immagine

export default function HeroImages() {
  const [start, setStart] = useState(0);

  useEffect(() => {
    setStart(Math.floor(Math.random() * COUNT));
  }, []);

  return (
    <div className='hero-images' role='img' aria-label='Vasi da esterno e interno'>
      {HERO_IMAGES.map((img, i) => {
        const order = (i - start + COUNT) % COUNT;
        const delay = order * STEP;
        return (
          <img
            key={i}
            className='hero-img'
            src={img.src}
            alt={i === start ? img.alt : ''}
            style={
              {
                '--delay': `${delay}s`,
                '--cycle': `${CYCLE}s`,
                '--fade': '1.5s',
              } as React.CSSProperties
            }
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        );
      })}
    </div>
  );
}