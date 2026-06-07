'use client';
import { Sprout, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { PlantaDashboard } from '@/lib/types';
import clsx from 'clsx';

interface Props {
    plantas: PlantaDashboard[];
    selecionada: PlantaDashboard | null;
    onChange: (p: PlantaDashboard) => void;
}

export default function PlantaSelector({ plantas, selecionada, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    if (!plantas.length) return null;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 min-w-[200px] transition-colors"
            >
                <div className="w-8 h-8 bg-emerald-600/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sprout size={15} className="text-emerald-400" />
                </div>
                <div className="flex-1 text-left">
                    <p className="text-xs text-slate-500">Planta</p>
                    <p className="text-sm font-medium leading-tight">
                        {selecionada?.nome ?? 'Selecionar...'}
                    </p>
                </div>
                <ChevronDown size={16} className={clsx('text-slate-400 transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="absolute top-full mt-2 left-0 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-40">
                    {plantas.map(p => (
                        <button
                            key={p.id}
                            onClick={() => { onChange(p); setOpen(false); }}
                            className={clsx(
                                'w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left',
                                selecionada?.id === p.id && 'bg-emerald-600/10'
                            )}
                        >
                            <div className="w-8 h-8 bg-emerald-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Sprout size={14} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">{p.nome}</p>
                                {p.especie && <p className="text-xs text-slate-500">{p.especie}</p>}
                            </div>
                            {/* Indicador online */}
                            <span className={clsx(
                                'ml-auto w-2 h-2 rounded-full flex-shrink-0',
                                p.dispositivo_online ? 'bg-emerald-400' : 'bg-slate-600'
                            )} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
