const metaEnv = (import.meta as any).env || {};
export const API_BASE_URL: string = metaEnv.VITE_API_URL || (metaEnv.PROD ? 'https://api.memoria-26.live' : '');

export const apiUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path}`;
};

export const apiFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (typeof input === 'string') {
    return fetch(apiUrl(input), init);
  }
  return fetch(input, init);
};
