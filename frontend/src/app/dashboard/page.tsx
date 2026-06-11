'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import Nav from '@/components/Nav';
import UmidadeGauge from '@/components/UmidadeGauge';
import UmidadeChart from '@/components/UmidadeChart';
import VazaoChart from '@/components/VazaoChart';
import BombaControl from '@/components/BombaControl';
import IrrigacaoHistorico from '@/components/IrrigacaoHistorico';
import PlantaSelector from '@/components/PlantaSelector';
import MetricCard from '@/components/MetricCard';
import { Droplets, Gauge, History, RefreshCw, Wifi, WifiOff, Beaker } from 'lucide-react';
import type { PlantaDashboard, LeituraUmidade, LeituraVazao, Irrigacao, ResumoPlanta } from '@/lib/types';

const POLL_INTERVAL = 30_000;

export default function DashboardPage() {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [plantas, setPlantas] = useState<PlantaDashboard[]>([]);
    const [planta, setPlanta] = useState<PlantaDashboard | null>(null);
    const [umidades, setUmidades] = useState<LeituraUmidade[]>([]);
    const [vazoes, setVazoes] = useState<LeituraVazao[]>([]);
    const [irrigacoes, setIrrigacoes] = useState<Irrigacao[]>([]);
    const [irrigacaoAtiva, setIrrigacaoAtiva] = useState<Irrigacao | null>(null);
    const [resumo, setResumo] = useState<ResumoPlanta | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Status online separado para não recriar o planta object no poll (evita re-renders)
    const [dispositivoOnline, setDispositivoOnline] = useState<boolean | null>(null);

    // Autenticação
    useEffect(() => {
        const supabase = getSupabase();
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) { router.push('/login'); return; }
            setToken(session.access_token);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
            if (!session) router.push('/login');
            else setToken(session.access_token);
        });
        return () => subscription.unsubscribe();
    }, [router]);

    // Carrega plantas
    useEffect(() => {
        if (!token) return;
        api.plantas.dashboard(token).then((data: unknown) => {
            const list = data as PlantaDashboard[];
            setPlantas(list);
            if (list.length > 0 && !planta) setPlanta(list[0]);
        }).catch(console.error);
    }, [token]);

    // Carga completa — roda só na troca de planta ou no botão Atualizar
    const carregarDados = useCallback(async (p: PlantaDashboard, tk: string) => {
        try {
            const [u, v, ir, irAtiva, res, dash] = await Promise.allSettled([
                api.leituras.umidadeHistorico(p.id, { limit: 200, horas: 24 }, tk),
                api.leituras.vazaoHistorico(p.id,   { limit: 200, horas: 24 }, tk),
                api.irrigacao.historico(p.id, tk),
                api.irrigacao.ativa(p.id, tk),
                api.leituras.resumo(p.id, tk),
                api.plantas.dashboard(tk),
            ]);
            if (u.status === 'fulfilled')   setUmidades(u.value as LeituraUmidade[]);
            if (v.status === 'fulfilled')   setVazoes(v.value as LeituraVazao[]);
            if (ir.status === 'fulfilled')  setIrrigacoes(ir.value as Irrigacao[]);
            if (irAtiva.status === 'fulfilled') setIrrigacaoAtiva(irAtiva.value as Irrigacao | null);
            if (res.status === 'fulfilled') setResumo(res.value as ResumoPlanta);
            if (dash.status === 'fulfilled') {
                const list = dash.value as PlantaDashboard[];
                setPlantas(list);
                const atualizada = list.find(x => x.id === p.id);
                if (atualizada) setDispositivoOnline(atualizada.dispositivo_online ?? false);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll leve — roda a cada 30s, NÃO substitui umidades/vazoes
    // (o Realtime já adiciona os pontos novos; sobrescrever causava race condition)
    const pollLeve = useCallback(async (p: PlantaDashboard, tk: string) => {
        const [irAtiva, res, dash] = await Promise.allSettled([
            api.irrigacao.ativa(p.id, tk),
            api.leituras.resumo(p.id, tk),
            api.plantas.dashboard(tk),
        ]);
        if (irAtiva.status === 'fulfilled') setIrrigacaoAtiva(irAtiva.value as Irrigacao | null);
        if (res.status === 'fulfilled')     setResumo(res.value as ResumoPlanta);
        if (dash.status === 'fulfilled') {
            const list = dash.value as PlantaDashboard[];
            setPlantas(list);
            const atualizada = list.find(x => x.id === p.id);
            if (atualizada) setDispositivoOnline(atualizada.dispositivo_online ?? false);
        }
    }, []);

    useEffect(() => {
        if (!planta || !token) return;
        setLoading(true);
        carregarDados(planta, token);

        // Realtime Supabase — novas leituras de umidade
        const supabase = getSupabase();
        const channel = supabase
            .channel(`dashboard:${planta.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'leituras_umidade',
                filter: `planta_id=eq.${planta.id}`,
            }, (payload) => {
                const nova = payload.new as LeituraUmidade;
                setUmidades(prev => [...prev.slice(-199), nova]);
                setResumo(prev => prev ? { ...prev, umidade_atual: nova.umidade, ultima_leitura: nova.created_at } : prev);
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'leituras_vazao',
                filter: `planta_id=eq.${planta.id}`,
            }, (payload) => {
                const nova = payload.new as LeituraVazao;
                setVazoes(prev => [...prev.slice(-199), nova]);
            })
            .subscribe();

        // Poll leve a cada 30s — atualiza só resumo/status (NÃO substitui os gráficos)
        const timer = setInterval(() => pollLeve(planta, token), POLL_INTERVAL);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(timer);
        };
    }, [planta?.id, token, carregarDados, pollLeve]);

    async function refresh() {
        if (!planta || !token) return;
        setRefreshing(true);
        await carregarDados(planta, token);
        setRefreshing(false);
    }

    const umidadeAtual = resumo?.umidade_atual ?? null;
    // dispositivoOnline é atualizado pelo poll sem recriar o objeto planta
    const online = dispositivoOnline ?? planta?.dispositivo_online ?? false;

    if (!token) return null;

    return (
        <div className="min-h-screen">
            <Nav />
            <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            🌱 Dashboard
                        </h1>
                        <p className="text-slate-400 text-sm mt-0.5">
                            {online
                                ? <span className="flex items-center gap-1 text-emerald-400"><Wifi size={13}/>Dispositivo online</span>
                                : <span className="flex items-center gap-1 text-slate-500"><WifiOff size={13}/>Dispositivo offline</span>
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <PlantaSelector plantas={plantas} selecionada={planta} onChange={setPlanta} />
                        <button onClick={refresh} disabled={refreshing} className="btn-ghost">
                            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                            Atualizar
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !planta ? (
                    <div className="card text-center py-16">
                        <p className="text-slate-400 text-lg">Nenhuma planta cadastrada.</p>
                        <a href="/plantas" className="btn-primary mt-4 inline-flex mx-auto">Cadastrar planta</a>
                    </div>
                ) : (
                    <>
                        {/* Linha 1: gauge + métricas + bomba */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                            {/* Gauge principal */}
                            <div className="card-hover md:col-span-1 flex flex-col items-center justify-center py-8">
                                <p className="text-slate-400 text-xs uppercase tracking-widest mb-4">Umidade do Solo</p>
                                <UmidadeGauge umidade={umidadeAtual} />
                                {resumo?.ultima_leitura && (
                                    <p className="text-slate-500 text-xs mt-4">
                                        Última leitura: {new Date(resumo.ultima_leitura).toLocaleTimeString('pt-BR')}
                                    </p>
                                )}
                            </div>

                            {/* Métricas + Bomba */}
                            <div className="md:col-span-2 grid grid-cols-2 gap-5">
                                <MetricCard
                                    title="Umidade Atual"
                                    value={umidadeAtual !== null ? Math.round(umidadeAtual) : '—'}
                                    unit="%"
                                    icon={Droplets}
                                    iconColor={
                                        umidadeAtual === null ? 'text-slate-500' :
                                        umidadeAtual < 30 ? 'text-red-400' :
                                        umidadeAtual < 50 ? 'text-amber-400' :
                                        umidadeAtual <= 75 ? 'text-emerald-400' : 'text-blue-400'
                                    }
                                    subtitle={`Meta: ${planta.umidade_ideal}%`}
                                />
                                <MetricCard
                                    title="Vazão"
                                    value={resumo?.vazao_atual ? resumo.vazao_atual.toFixed(2) : '0.00'}
                                    unit="L/min"
                                    icon={Gauge}
                                    iconColor="text-blue-400"
                                    subtitle="Última leitura"
                                />
                                <MetricCard
                                    title="Água Hoje"
                                    value={resumo?.volume_24h?.toFixed(3) ?? '0.000'}
                                    unit="L"
                                    icon={Beaker}
                                    iconColor="text-cyan-400"
                                    subtitle="Últimas 24 horas"
                                />
                                <BombaControl
                                    plantaId={planta.id}
                                    token={token}
                                    irrigacaoAtiva={irrigacaoAtiva}
                                    onUpdate={() => carregarDados(planta, token)}
                                />
                            </div>
                        </div>

                        {/* Gráfico de umidade */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <Droplets size={18} className="text-emerald-400" />
                                    Histórico de Umidade
                                </h2>
                                <span className="text-slate-500 text-xs">Últimas 24h</span>
                            </div>
                            {umidades.length ? (
                                <UmidadeChart
                                    dados={umidades}
                                    umidadeMinima={planta.umidade_minima}
                                    umidadeMaxima={planta.umidade_maxima}
                                />
                            ) : (
                                <p className="text-center text-slate-500 py-12">Aguardando dados do sensor…</p>
                            )}
                        </div>

                        {/* Gráfico de vazão */}
                        {vazoes.length > 0 && (
                            <div className="card">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="font-semibold flex items-center gap-2">
                                        <Gauge size={18} className="text-blue-400" />
                                        Histórico de Vazão
                                    </h2>
                                    <span className="text-slate-500 text-xs">Últimas 24h</span>
                                </div>
                                <VazaoChart dados={vazoes} />
                            </div>
                        )}

                        {/* Níveis recomendados */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="card">
                                <h3 className="font-semibold mb-5">Faixas de Umidade — {planta.nome}</h3>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Ideal',    range: `${planta.umidade_minima}% – ${planta.umidade_maxima}%`, color: 'bg-emerald-500', width: '100%', text: 'text-emerald-400' },
                                        { label: 'Atenção',  range: `30% – ${planta.umidade_minima}%`,                        color: 'bg-amber-500',   width: '60%',  text: 'text-amber-400' },
                                        { label: 'Crítico',  range: '< 30%',                                                   color: 'bg-red-500',     width: '30%',  text: 'text-red-400' },
                                        { label: 'Excesso',  range: `> ${planta.umidade_maxima}%`,                             color: 'bg-blue-500',    width: '20%',  text: 'text-blue-400' },
                                    ].map(item => (
                                        <div key={item.label}>
                                            <div className="flex justify-between mb-1.5">
                                                <span className={`font-medium text-sm ${item.text}`}>{item.label}</span>
                                                <span className="text-slate-400 text-sm">{item.range}</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${item.color} rounded-full`} style={{ width: item.width }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Config da planta */}
                            <div className="card">
                                <h3 className="font-semibold mb-5">Configuração da Planta</h3>
                                <div className="space-y-3 text-sm">
                                    {[
                                        { k: 'Espécie',           v: planta.especie || '—' },
                                        { k: 'Umidade mínima',    v: `${planta.umidade_minima}%` },
                                        { k: 'Umidade máxima',    v: `${planta.umidade_maxima}%` },
                                        { k: 'Umidade ideal',     v: `${planta.umidade_ideal}%` },
                                        { k: 'Irrigação auto',    v: planta.irrigacao_auto ? 'Ativada' : 'Desativada' },
                                        { k: 'Duração irrigação', v: `${planta.duracao_irrigacao_s}s` },
                                    ].map(({ k, v }) => (
                                        <div key={k} className="flex justify-between border-b border-slate-800 pb-2">
                                            <span className="text-slate-400">{k}</span>
                                            <span className="text-slate-200 font-medium">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Histórico de irrigações */}
                        <div className="card">
                            <h2 className="font-semibold flex items-center gap-2 mb-5">
                                <History size={18} className="text-purple-400" />
                                Histórico de Irrigações
                            </h2>
                            <IrrigacaoHistorico irrigacoes={irrigacoes} />
                        </div>
                    </>
                )}
            </main>

            {/* Rodapé */}
            <footer className="text-center text-slate-700 text-xs py-6">
                Semeando Vidas IoT • Atualização automática a cada 30s
            </footer>
        </div>
    );
}
