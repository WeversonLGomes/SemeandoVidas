import type { Irrigacao } from '@/lib/types';
import { Droplets, Hand, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props { irrigacoes: Irrigacao[]; }

function duracao(seg?: number) {
    if (!seg) return '—';
    if (seg < 60) return `${seg}s`;
    return `${Math.floor(seg / 60)}min ${seg % 60}s`;
}

function statusBadge(status: Irrigacao['status']) {
    const map = {
        concluida:    <span className="badge-ok"><CheckCircle size={12}/>Concluída</span>,
        em_andamento: <span className="badge-info"><Clock size={12}/>Em andamento</span>,
        cancelada:    <span className="badge-warn"><XCircle size={12}/>Cancelada</span>,
        erro:         <span className="badge-danger"><XCircle size={12}/>Erro</span>,
    };
    return map[status] ?? <span className="badge-offline">{status}</span>;
}

export default function IrrigacaoHistorico({ irrigacoes }: Props) {
    if (!irrigacoes.length) {
        return (
            <div className="text-center py-12 text-slate-500">
                <Droplets size={40} className="mx-auto mb-3 opacity-30" />
                <p>Nenhuma irrigação registrada</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                        <th className="text-left py-3 font-medium">Data/Hora</th>
                        <th className="text-left py-3 font-medium">Tipo</th>
                        <th className="text-left py-3 font-medium">Status</th>
                        <th className="text-right py-3 font-medium">Duração</th>
                        <th className="text-right py-3 font-medium">Volume</th>
                        <th className="text-right py-3 font-medium">Umid. início</th>
                        <th className="text-right py-3 font-medium">Umid. fim</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {irrigacoes.map(ir => (
                        <tr key={ir.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 text-slate-300">
                                {new Date(ir.inicio).toLocaleString('pt-BR', {
                                    day: '2-digit', month: '2-digit',
                                    hour: '2-digit', minute: '2-digit',
                                })}
                            </td>
                            <td className="py-3">
                                {ir.tipo === 'automatica'
                                    ? <span className="text-emerald-400 flex items-center gap-1"><Droplets size={12}/>Auto</span>
                                    : <span className="text-purple-400 flex items-center gap-1"><Hand size={12}/>Manual</span>
                                }
                            </td>
                            <td className="py-3">{statusBadge(ir.status)}</td>
                            <td className="py-3 text-right text-slate-300">{duracao(ir.duracao_segundos)}</td>
                            <td className="py-3 text-right text-blue-400">
                                {ir.volume_litros != null ? `${ir.volume_litros.toFixed(3)} L` : '—'}
                            </td>
                            <td className="py-3 text-right text-slate-300">
                                {ir.umidade_inicio != null ? `${Math.round(ir.umidade_inicio)}%` : '—'}
                            </td>
                            <td className="py-3 text-right text-emerald-400">
                                {ir.umidade_fim != null ? `${Math.round(ir.umidade_fim)}%` : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
