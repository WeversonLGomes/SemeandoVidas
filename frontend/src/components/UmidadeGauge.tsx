'use client';
import { PieChart, Pie, Cell } from 'recharts';

function corUmidade(val: number) {
    if (val < 30)  return '#ef4444';
    if (val < 50)  return '#f59e0b';
    if (val <= 75) return '#10b981';
    return '#3b82f6';
}

function statusUmidade(val: number | null) {
    if (val === null) return { icon: '—', texto: 'Sem dados', cor: 'text-slate-400' };
    if (val < 20)  return { icon: '💀', texto: 'Solo Ressecado', cor: 'text-red-500' };
    if (val < 30)  return { icon: '🥀', texto: 'Solo Crítico',   cor: 'text-red-400' };
    if (val < 50)  return { icon: '😟', texto: 'Solo Seco',      cor: 'text-amber-400' };
    if (val <= 75) return { icon: '😊', texto: 'Solo Ideal',     cor: 'text-emerald-400' };
    if (val <= 85) return { icon: '💧', texto: 'Solo Úmido',     cor: 'text-blue-400' };
    return          { icon: '🌊', texto: 'Solo Encharcado', cor: 'text-blue-500' };
}

interface Props { umidade: number | null; }

export default function UmidadeGauge({ umidade }: Props) {
    const val = umidade ?? 0;
    const cor = corUmidade(val);
    const s   = statusUmidade(umidade);
    const data = [{ value: val }, { value: 100 - val }];

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: 220, height: 120 }}>
                <PieChart width={220} height={120}>
                    <Pie
                        data={data}
                        cx={110}
                        cy={110}
                        startAngle={180}
                        endAngle={0}
                        innerRadius={70}
                        outerRadius={100}
                        dataKey="value"
                        strokeWidth={0}
                    >
                        <Cell fill={cor} />
                        <Cell fill="#1e293b" />
                    </Pie>
                </PieChart>
                {/* Valor central */}
                <div className="absolute inset-x-0 bottom-0 text-center pb-2">
                    <span className="text-4xl font-bold" style={{ color: cor }}>
                        {umidade !== null ? Math.round(umidade) : '—'}
                    </span>
                    <span className="text-xl text-slate-400">%</span>
                </div>
            </div>

            <p className={`text-lg font-semibold mt-1 ${s.cor}`}>{s.icon} {s.texto}</p>
        </div>
    );
}
