'use client';

import { useEffect } from 'react';

export default function HasJs() {
  useEffect(() => {
    document.documentElement.classList.add('has-js');
  }, []);

  return null;
}