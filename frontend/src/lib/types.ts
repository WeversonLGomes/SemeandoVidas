export interface Planta {
    id: string;
    usuario_id: string;
    nome: string;
    especie?: string;
    descricao?: string;
    foto_url?: string;
    umidade_minima: number;
    umidade_maxima: number;
    umidade_ideal: number;
    irrigacao_auto: boolean;
    duracao_irrigacao_s: number;
    ativa: boolean;
    created_at: string;
    updated_at: string;
}

export interface PlantaDashboard extends Planta {
    umidade_atual: number | null;
    ultima_leitura_umidade: string | null;
    vazao_atual: number | null;
    irrigacao_ativa_id: string | null;
    dispositivo_online: boolean | null;
}

export interface LeituraUmidade {
    umidade: number;
    temperatura?: number;
    created_at: string;
}

export interface LeituraVazao {
    vazao_lmin: number;
    volume_litros: number;
    created_at: string;
}

export interface Irrigacao {
    id: string;
    planta_id: string;
    tipo: 'automatica' | 'manual';
    status: 'em_andamento' | 'concluida' | 'cancelada' | 'erro';
    inicio: string;
    fim?: string;
    duracao_segundos?: number;
    volume_litros?: number;
    umidade_inicio?: number;
    umidade_fim?: number;
    motivo?: string;
    created_at: string;
}

export interface ResumoPlanta {
    umidade_atual: number | null;
    ultima_leitura: string | null;
    vazao_atual: number;
    volume_24h: number;
}
