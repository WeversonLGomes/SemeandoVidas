'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { Leaf, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nome, setNome] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setMsg('');
        setLoading(true);
        const supabase = getSupabase();

        try {
            if (isRegister) {
                const { error: err } = await supabase.auth.signUp({
                    email, password,
                    options: { data: { nome } },
                });
                if (err) throw err;
                setMsg('Conta criada! Verifique seu e-mail para confirmar.');
            } else {
                const { error: err } = await supabase.auth.signInWithPassword({ email, password });
                if (err) throw err;
                router.push('/dashboard');
            }
        } catch (err: unknown) {
            const e = err as Error;
            setError(
                e.message.includes('Invalid login') ? 'E-mail ou senha incorretos.' :
                e.message.includes('already registered') ? 'E-mail já cadastrado.' :
                e.message
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Leaf size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold">Semeando Vidas</h1>
                    <p className="text-slate-400 mt-1">Irrigação inteligente com IoT</p>
                </div>

                {/* Card */}
                <div className="card">
                    <h2 className="text-xl font-semibold mb-6">
                        {isRegister ? 'Criar conta' : 'Entrar na conta'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div>
                                <label className="label">Seu nome</label>
                                <input
                                    className="input"
                                    placeholder="João Silva"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="label">E-mail</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    className="input pl-9"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Senha</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    className="input pl-9 pr-10"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    minLength={6}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                >
                                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm bg-red-900/20 rounded-xl px-4 py-3">{error}</p>
                        )}
                        {msg && (
                            <p className="text-emerald-400 text-sm bg-emerald-900/20 rounded-xl px-4 py-3">{msg}</p>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                            {loading ? 'Aguarde...' : isRegister ? 'Criar conta' : 'Entrar'}
                        </button>
                    </form>

                    <p className="text-center text-slate-400 text-sm mt-6">
                        {isRegister ? 'Já tem uma conta?' : 'Não tem conta?'}{' '}
                        <button
                            onClick={() => { setIsRegister(!isRegister); setError(''); setMsg(''); }}
                            className="text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                            {isRegister ? 'Entrar' : 'Criar conta'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
