import Hero from '@/components/home/Hero';
import Azienda from '@/components/home/Azienda';
import Valori from '@/components/home/Valori';
import StatsBand from '@/components/home/StatsBand';
import Collezioni from '@/components/home/Collezioni';
import AccessoB2B from '@/components/home/AccessoB2B';
import Contatti from '@/components/home/Contatti';
import PopupAperture from '@/components/home/PopupAperture';


export default function Home() {
  return (
    <main>
      <Hero />
      <Azienda />
      <Valori />
      <StatsBand />
      <Collezioni />
      <AccessoB2B />
      <Contatti />
      <PopupAperture />
    </main>
  );
}
