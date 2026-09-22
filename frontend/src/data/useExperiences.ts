import { useEffect, useState } from 'react';
import { fetchExperiences } from './experiences';
import type { TravelExperience } from './experiences';

export function useExperiences() {
  const [items, setItems] = useState<TravelExperience[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchExperiences(controller.signal).then(data => { setItems(data); setStatus('ready'); }).catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [attempt]);
  return { items, status, retry: () => { setStatus('loading'); setAttempt(value => value + 1); } };
}

