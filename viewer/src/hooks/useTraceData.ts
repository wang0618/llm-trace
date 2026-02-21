import { useState, useEffect, useMemo } from 'react';
import type { TraceData, Message, Tool, Request } from '../types';

interface UseTraceDataResult {
  data: TraceData | null;
  loading: boolean;
  error: string | null;
  getMessage: (id: string) => Message | undefined;
  getTool: (id: string) => Tool | undefined;
  getRequest: (id: string) => Request | undefined;
}

function getDataUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('data') || 'data.json';
}

export function useTraceData(): UseTraceDataResult {
  const [data, setData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const dataUrl = getDataUrl();
      try {
        const response = await fetch(dataUrl);
        if (!response.ok) {
          throw new Error(`Failed to load data from ${dataUrl}: ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const messageMap = useMemo(() => {
    if (!data) return new Map<string, Message>();
    return new Map(data.messages.map(m => [m.id, m]));
  }, [data]);

  const toolMap = useMemo(() => {
    if (!data) return new Map<string, Tool>();
    return new Map(data.tools.map(t => [t.id, t]));
  }, [data]);

  const requestMap = useMemo(() => {
    if (!data) return new Map<string, Request>();
    return new Map(data.requests.map(r => [r.id, r]));
  }, [data]);

  const getMessage = (id: string) => messageMap.get(id);
  const getTool = (id: string) => toolMap.get(id);
  const getRequest = (id: string) => requestMap.get(id);

  return { data, loading, error, getMessage, getTool, getRequest };
}
