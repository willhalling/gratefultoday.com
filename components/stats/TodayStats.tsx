'use client';

import { useEffect, useState } from 'react';

interface TodayStatsProps {
  noShadow?: boolean;
  variant?: 'default' | 'newsletter';
}

export function TodayStats({ noShadow = false, variant = 'default' }: TodayStatsProps) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCount() {
      try {
        const response = await fetch('/api/stats/today');
        const data = await response.json();
        setCount(data.count);
      } catch (error) {
        console.error('Error fetching today stats:', error);
        setCount(null);
      } finally {
        setLoading(false);
      }
    }

    fetchCount();
  }, []);

  if (loading || count === null) {
    return null;
  }

  if (variant === 'newsletter') {
    return (
      <div className="py-0">
        <p className={`text-base text-white/90 leading-relaxed italic ${noShadow ? '' : 'drop-shadow-lg'}`}>
          (<span className="font-semibold text-amber-300">{count}</span>{' '}
          {count === 1 ? 'person' : 'people'} practiced gratitude today. You could be one of them tomorrow.)
        </p>
      </div>
    );
  }

  return (
    <div className="text-left py-2">
      <p className={`text-sm text-white/90 ${noShadow ? '' : 'drop-shadow-lg'}`}>
        Today, <span className="font-semibold text-amber-300">{count}</span>{' '}
        {count === 1 ? 'person has' : 'people have'} practiced gratitude on our{' '}
        <a href="/wall" className="underline hover:text-white transition-colors">
          wall
        </a>
      </p>
    </div>
  );
}
