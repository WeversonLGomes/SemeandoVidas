'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import Nav from '@/components/Nav';
import { Sprout, Plus, Pencil, Trash2, X, Loader2, Save } from 'lucide-react';
import type { Planta } from '@/lib/types';
import clsx from 'clsx';

type FormData = {
    nome: string; especie: string; descricao: string;
    umidade_minima: number; umidade_maxima: number; umidade_ideal: number;
    irrigacao_auto: boolean; duracao_irrigacao_s: number;
};

const EMPTY: FormData = {
    nome: '', especie: '', descricao: '',
    umidade_minima: 30, umidade_maxima: 80, umidade_ideal: 60,
    irrigacao_auto: true, duracao_irrigacao_s: 30,
};

export default function PlantasPage() {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [plantas, setPlantas] = useState<Planta[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState<Planta | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getSupabase().auth.getSession().then(({ data: { session } }) => {
            if (!session) { router.push('/login'); return; }
            setToken(session.access_token);
        });
    }, [router]);

    useEffect(() => {
        if (!token) return;
        api.plantas.listar(token).then((data: unknown) => {
            setPlantas(data as Planta[]);
        }).finally(() => setLoading(false));
    }, [token]);

    function abrirCriar() { setEditando(null); setForm(EMPTY); setError(''); setShowModal(true); }
    function abrirEditar(p: Planta) {
        setEditando(p);
        setForm({ nome: p.nome, especie: p.especie ?? '', descricao: p.descricao ?? '',
                  umidade_minima: p.umidade_minima, umidade_maxima: p.umidade_maxima,
                  umidade_ideal: p.umidade_ideal, irrigacao_auto: p.irrigacao_auto,
                  duracao_irrigacao_s: p.duracao_irrigacao_s });
        setError('');
        setShowModal(true);
    }

    async function salvar() {
        if (!form.nome.trim()) { setError('Nome é obrigatório'); return; }
        setSaving(true); setError('');
        try {
            if (editando) {
                const updated = await api.plantas.atualizar(editando.id, form, token) as Planta;
                setPlantas(prev => prev.map(p => p.id === editando.id ? updated : p));
            } else {
                const nova = await api.plantas.criar(form, token) as Planta;
                setPlantas(prev => [...prev, nova]);
            }
            setShowModal(false);
        } catch (e: unknown) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    }

    async function remover(p: Planta) {
        if (!confirm(`Remover "${p.nome}"? Todos os dados serão apagados.`)) return;
        await api.plantas.remover(p.id, token);
        setPlantas(prev => prev.filter(x => x.id !== p.id));
    }

    function setF<K extends keyof FormData>(key: K, val: FormData[K]) {
        setForm(prev => ({ ...prev, [key]: val }));
    }

    return (
        <div className="min-h-screen">
            <Nav />
            <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">

                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Sprout size={24} className="text-emerald-400" /> Minhas Plantas
                    </h1>
                    <button onClick={abrirCriar} className="btn-primary">
                        <Plus size={18} /> Nova Planta
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !plantas.length ? (
                    <div className="card text-center py-16">
                        <Sprout size={48} className="text-emerald-600/30 mx-auto mb-4" />
                        <p className="text-slate-400">Nenhuma planta cadastrada ainda.</p>
                        <button onClick={abrirCriar} className="btn-primary mt-4 mx-auto inline-flex">
                            <Plus size={18} /> Cadastrar primeira planta
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {plantas.map(p => (
                            <div key={p.id} className="card-hover flex flex-col gap-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                                            <Sprout size={22} className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{p.nome}</h3>
                                            {p.especie && <p className="text-slate-500 text-xs">{p.especie}</p>}
                                        </div>
                                    </div>
                                    <span className={clsx('text-xs px-2 py-1 rounded-full', p.ativa ? 'badge-ok' : 'badge-offline')}>
                                        {p.ativa ? 'Ativa' : 'Inativa'}
                                    </span>
                                </div>

                                {p.descricao && <p className="text-slate-400 text-sm">{p.descricao}</p>}

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    {[
                                        { label: 'Mín', v: `${p.umidade_minima}%`, c: 'text-red-400' },
                                        { label: 'Ideal', v: `${p.umidade_ideal}%`, c: 'text-emerald-400' },
                                        { label: 'Máx', v: `${p.umidade_maxima}%`, c: 'text-blue-400' },
                                    ].map(({ label, v, c }) => (
                                        <div key={label} className="bg-slate-800/50 rounded-xl py-2">
                                            <p className="text-slate-500 text-xs">{label}</p>
                                            <p className={`font-semibold ${c}`}>{v}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                                    <span className="text-xs text-slate-500">
                                        Auto: <span className={p.irrigacao_auto ? 'text-emerald-400' : 'text-slate-500'}>
                                            {p.irrigacao_auto ? 'Ativada' : 'Desativada'}
                                        </span>
                                        {' · '}Duração: {p.duracao_irrigacao_s}s
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => abrirEditar(p)} className="btn-ghost py-1.5 px-2 text-xs">
                                            <Pencil size={13} /> Editar
                                        </button>
                                        <button onClick={() => remover(p)} className="btn-ghost py-1.5 px-2 text-xs text-red-400 hover:text-red-300">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal criar/editar */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <h2 className="text-lg font-semibold">
                                {editando ? 'Editar Planta' : 'Nova Planta'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-2">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="label">Nome *</label>
                                <input className="input" placeholder="Ex.: Samambaia" value={form.nome} onChange={e => setF('nome', e.target.value)} />
                            </div>
                            <div>
                                <label className="label">Espécie</label>
                                <input className="input" placeholder="Ex.: Nephrolepis exaltata" value={form.especie} onChange={e => setF('especie', e.target.value)} />
                            </div>
                            <div>
                                <label className="label">Descrição</label>
                                <textarea className="input resize-none" rows={2} placeholder="Notas sobre a planta..." value={form.descricao} onChange={e => setF('descricao', e.target.value)} />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Umidade mínima (%)', key: 'umidade_minima' as const },
                                    { label: 'Umidade ideal (%)',  key: 'umidade_ideal'  as const },
                                    { label: 'Umidade máxima (%)', key: 'umidade_maxima' as const },
                                ].map(({ label, key }) => (
                                    <div key={key}>
                                        <label className="label">{label}</label>
                                        <input
                                            className="input"
                                            type="number" min={0} max={100}
                                            value={form[key]}
                                            onChange={e => setF(key, parseInt(e.target.value))}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label">Duração irrigação (s)</label>
                                    <input className="input" type="number" min={5} max={300} value={form.duracao_irrigacao_s} onChange={e => setF('duracao_irrigacao_s', parseInt(e.target.value))} />
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div
                                            onClick={() => setF('irrigacao_auto', !form.irrigacao_auto)}
                                            className={clsx('w-10 h-6 rounded-full transition-colors flex items-center cursor-pointer',
                                                form.irrigacao_auto ? 'bg-emerald-600' : 'bg-slate-700')}
                                        >
                                            <span className={clsx('w-4 h-4 bg-white rounded-full ml-1 transition-transform', form.irrigacao_auto && 'translate-x-4')} />
                                        </div>
                                        <span className="text-sm text-slate-300">Irrigação automática</span>
                                    </label>
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm bg-red-900/20 rounded-xl px-4 py-3">{error}</p>}

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 justify-center">
                                    Cancelar
                                </button>
                                <button onClick={salvar} disabled={saving} className="btn-primary flex-1 justify-center">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {saving ? 'Salvando…' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
