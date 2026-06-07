const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

// ── Plantas ─────────────────────────────────────────────────
export const api = {
    plantas: {
        listar: (token: string) =>
            request('/api/plantas', {}, token),
        dashboard: (token: string) =>
            request('/api/plantas/dashboard', {}, token),
        buscar: (id: string, token: string) =>
            request(`/api/plantas/${id}`, {}, token),
        criar: (body: object, token: string) =>
            request('/api/plantas', { method: 'POST', body: JSON.stringify(body) }, token),
        atualizar: (id: string, body: object, token: string) =>
            request(`/api/plantas/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token),
        remover: (id: string, token: string) =>
            request(`/api/plantas/${id}`, { method: 'DELETE' }, token),
    },

    leituras: {
        umidadeHistorico: (plantaId: string, params: Record<string, string | number>, token: string) => {
            const qs = new URLSearchParams(params as Record<string, string>).toString();
            return request(`/api/leituras/umidade/${plantaId}?${qs}`, {}, token);
        },
        vazaoHistorico: (plantaId: string, params: Record<string, string | number>, token: string) => {
            const qs = new URLSearchParams(params as Record<string, string>).toString();
            return request(`/api/leituras/vazao/${plantaId}?${qs}`, {}, token);
        },
        resumo: (plantaId: string, token: string) =>
            request(`/api/leituras/resumo/${plantaId}`, {}, token),
    },

    irrigacao: {
        historico: (plantaId: string, token: string) =>
            request(`/api/irrigacao/${plantaId}`, {}, token),
        ativa: (plantaId: string, token: string) =>
            request(`/api/irrigacao/${plantaId}/ativa`, {}, token),
        iniciar: (plantaId: string, body: object, token: string) =>
            request(`/api/irrigacao/${plantaId}/iniciar`, { method: 'POST', body: JSON.stringify(body) }, token),
        finalizar: (id: string, body: object, token: string) =>
            request(`/api/irrigacao/${id}/finalizar`, { method: 'PATCH', body: JSON.stringify(body) }, token),
    },

    bomba: {
        enviarComando: (body: object, token: string) =>
            request('/api/bomba/comando', { method: 'POST', body: JSON.stringify(body) }, token),
    },
};
