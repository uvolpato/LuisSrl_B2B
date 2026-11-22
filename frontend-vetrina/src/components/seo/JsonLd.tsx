/** JSON-LD server-only. Il < è escapato per evitare la chiusura del tag script. */
export default function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: json }} />;
}
