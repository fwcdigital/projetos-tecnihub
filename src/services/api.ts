// Cliente HTTP para a API do Tecnihub

const TOKEN_STORAGE_KEY = 'tecnihub_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Erro ao manipular token local:', e);
  }
}

interface RequestOptions extends RequestInit {
  data?: any;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.data) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.data);
  }

  const url = endpoint.startsWith('http') ? endpoint : endpoint;

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Sessão expirada ou não autorizada
    setStoredToken(null);
    window.dispatchEvent(new CustomEvent('tecnihub_auth_unauthorized'));
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data.error || data.message || `Erro HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}

export const api = {
  get: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, data?: any, options?: RequestOptions) => request<T>(url, { ...options, method: 'POST', data }),
  put: <T>(url: string, data?: any, options?: RequestOptions) => request<T>(url, { ...options, method: 'PUT', data }),
  patch: <T>(url: string, data?: any, options?: RequestOptions) => request<T>(url, { ...options, method: 'PATCH', data }),
  delete: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: 'DELETE' }),
};
