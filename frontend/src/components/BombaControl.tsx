'use client';
import { useState } from 'react';
import { Droplets, Power, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Irrigacao } from '@/lib/types';

interface Props {
    plantaId: string;
    token: string;
    irrigacaoAtiva: Irrigacao | null;
    onUpdate: () => void;
}

export default function BombaControl({ plantaId, token, irrigacaoAtiva, onUpdate }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const ativa = !!irrigacaoAtiva;

    async function toggleBomba() {
        setError('');
        setLoading(true);
        try {
            if (!ativa) {
                await api.irrigacao.iniciar(plantaId, { tipo: 'manual' }, token);
            } else {
                await api.irrigacao.finalizar(irrigacaoAtiva!.id, {}, token);
            }
            onUpdate();
        } catch (e: unknown) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card flex flex-col items-center justify-center gap-4 text-center min-h-[160px]">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                ativa ? 'bg-blue-600/30 ring-2 ring-blue-500' : 'bg-slate-800'
            }`}>
                <Droplets size={28} className={ativa ? 'text-blue-400' : 'text-slate-500'} />
            </div>

            <div>
                <p className="text-slate-400 text-sm">BOMBA</p>
                <p className={`text-xl font-bold mt-0.5 ${ativa ? 'text-blue-400' : 'text-slate-300'}`}>
                    {ativa ? 'Ligada' : 'Desligada'}
                </p>
                {ativa && irrigacaoAtiva && (
                    <p className="text-slate-500 text-xs mt-1">
                        Desde {new Date(irrigacaoAtiva.inicio).toLocaleTimeString('pt-BR')}
                    </p>
                )}
            </div>

            <button
                onClick={toggleBomba}
                disabled={loading}
                className={ativa ? 'btn-danger' : 'btn-primary'}
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                {loading ? 'Aguarde…' : ativa ? 'Desligar' : 'Ligar'}
            </button>

            {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
    );
}
