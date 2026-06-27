import React, { useEffect, useMemo, useState } from 'react';

interface Quote {
  text: string;
  author: string;
}

// Frases de grandes educadores y pensadores sobre la educación.
const DEFAULT_QUOTES: Quote[] = [
  { text: 'La educación es el arma más poderosa para cambiar el mundo.', author: 'Nelson Mandela' },
  { text: 'La educación no cambia el mundo, cambia a las personas que van a cambiar el mundo.', author: 'Paulo Freire' },
  { text: 'Dime y lo olvido, enséñame y lo recuerdo, involúcrame y lo aprendo.', author: 'Benjamin Franklin' },
  { text: 'El niño no es un vaso que llenar, sino un fuego que encender.', author: 'Michel de Montaigne' },
  { text: 'Educad a los niños y no será necesario castigar a los hombres.', author: 'Pitágoras' },
  { text: 'La educación es el pasaporte hacia el futuro: el mañana pertenece a quienes se preparan hoy.', author: 'Malcolm X' },
  { text: 'La función de la educación es enseñar a pensar intensa y críticamente.', author: 'Martin Luther King Jr.' },
  { text: 'Nunca consideres el estudio como una obligación, sino como una oportunidad para aprender.', author: 'Albert Einstein' },
  { text: 'La ayuda innecesaria es un obstáculo para el desarrollo.', author: 'María Montessori' },
  { text: 'El que se atreve a enseñar nunca debe dejar de aprender.', author: 'John Cotton Dana' },
];

interface EducatorQuoteProps {
  quotes?: Quote[];
  intervalMs?: number;
  compact?: boolean;
}

const EducatorQuote: React.FC<EducatorQuoteProps> = ({ quotes, intervalMs = 6500, compact = false }) => {
  const list = useMemo(() => (quotes && quotes.length ? quotes : DEFAULT_QUOTES), [quotes]);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * DEFAULT_QUOTES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % list.length);
        setVisible(true);
      }, 450);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, list.length]);

  const q = list[index % list.length];

  return (
    <div className={compact ? 'min-h-[64px]' : 'min-h-[150px]'} aria-live="polite">
      <div className={`transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <blockquote className={`font-semibold leading-snug ${compact ? 'text-lg md:text-xl mb-1' : 'text-2xl md:text-3xl mb-3'}`}>
          “{q.text}”
        </blockquote>
        <p className="text-blue-200 text-sm font-medium">— {q.author}</p>
      </div>
    </div>
  );
};

export default EducatorQuote;
