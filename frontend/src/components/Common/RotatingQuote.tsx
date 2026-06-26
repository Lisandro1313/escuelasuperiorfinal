import React, { useEffect, useMemo, useState } from 'react';

type RotatingQuoteProps = {
  quotes: string[];
  intervalMs?: number;
  className?: string;
};

const RotatingQuote: React.FC<RotatingQuoteProps> = ({ quotes, intervalMs = 4200, className = '' }) => {
  const safeQuotes = useMemo(() => (quotes && quotes.length ? quotes : ['Ensenar tambien es aprender dos veces.']), [quotes]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % safeQuotes.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, safeQuotes.length]);

  return (
    <p className={`text-sm text-gray-500 italic transition-opacity duration-500 ${className}`} aria-live="polite">
      {safeQuotes[index]}
    </p>
  );
};

export default RotatingQuote;
