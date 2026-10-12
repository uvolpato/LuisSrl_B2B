import Hero from '@/components/home/Hero';
import Azienda from '@/components/home/Azienda';
import Valori from '@/components/home/Valori';
import StatsBand from '@/components/home/StatsBand';
import Collezioni from '@/components/home/Collezioni';
import Marchi from '@/components/home/Marchi';
import AccessoB2B from '@/components/home/AccessoB2B';
import Contatti from '@/components/home/Contatti';

export default function Home() {
  return (
    <main>
      <Hero />
      <Azienda />
      <Valori />
      <StatsBand />
      <Collezioni />
      <Marchi />
      <AccessoB2B />
      <Contatti />
    </main>
  );
}
