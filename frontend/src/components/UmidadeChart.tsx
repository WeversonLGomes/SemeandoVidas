'use client';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { LeituraUmidade } from '@/lib/types';

interface Props {
    dados: LeituraUmidade[];
    umidadeMinima?: number;
    umidadeMaxima?: number;
}

function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function UmidadeChart({ dados, umidadeMinima = 30, umidadeMaxima = 80 }: Props) {
    const chartData = dados.map(d => ({
        hora: formatHora(d.created_at),
        umidade: Math.round(d.umidade),
    }));

    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                    <linearGradient id="gradUmidade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(v: number) => [`${v}%`, 'Umidade']}
                />
                {/* Linhas de referência de limites */}
                <ReferenceLine y={umidadeMinima} stroke="#f59e0b" strokeDasharray="4 4" />
                <ReferenceLine y={umidadeMaxima} stroke="#3b82f6" strokeDasharray="4 4" />
                <Area
                    type="monotone"
                    dataKey="umidade"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#gradUmidade)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#10b981' }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
