import { useEffect, useRef, useState } from 'react';

export function useApiData<T>(loader: (signal?: AbortSignal) => Promise<T>, fallbackData: T) {
  const [data, setData] = useState<T>(fallbackData);
  const [source, setSource] = useState<'api' | 'fallback'>('fallback');
  const [isLoading, setIsLoading] = useState(true);
  const fallbackRef = useRef(fallbackData);

  useEffect(() => {
    fallbackRef.current = fallbackData;
  }, [fallbackData]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    loader(controller.signal)
      .then((res) => {
        if (!active) return;
        setData(res);
        setSource('api');
      })
      .catch(() => {
        if (!active) return;
        setData(fallbackRef.current);
        setSource('fallback');
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [loader]);

  return { data, source, isLoading };
}
