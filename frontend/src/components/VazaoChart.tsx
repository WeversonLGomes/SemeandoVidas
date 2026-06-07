'use client';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { LeituraVazao } from '@/lib/types';

interface Props { dados: LeituraVazao[]; }

function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function VazaoChart({ dados }: Props) {
    const chartData = dados.map(d => ({
        hora: formatHora(d.created_at),
        vazao: parseFloat(d.vazao_lmin.toFixed(3)),
        volume: parseFloat(d.volume_litros.toFixed(4)),
    }));

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                    <linearGradient id="gradVazao" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.5} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                    dataKey="hora"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}L`}
                />
                <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(v: number, n: string) => [
                        n === 'vazao' ? `${v} L/min` : `${v} L`,
                        n === 'vazao' ? 'Vazão' : 'Volume',
                    ]}
                />
                <Bar dataKey="vazao" fill="url(#gradVazao)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
