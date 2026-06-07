'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Leaf, LayoutDashboard, Sprout, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import clsx from 'clsx';

const links = [
    { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
    { href: '/plantas',   label: 'Plantas',     icon: Sprout },
];

export default function Nav() {
    const path = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);

    async function handleLogout() {
        await getSupabase().auth.signOut();
        router.push('/login');
    }

    return (
        <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
                        <Leaf size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-lg hidden sm:block">Semeando Vidas</span>
                </Link>

                {/* Links desktop */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                                path.startsWith(href)
                                    ? 'bg-emerald-600/20 text-emerald-400'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            )}
                        >
                            <Icon size={16} />
                            {label}
                        </Link>
                    ))}
                </div>

                {/* Logout desktop */}
                <button onClick={handleLogout} className="hidden md:flex btn-ghost text-sm">
                    <LogOut size={16} />
                    Sair
                </button>

                {/* Mobile menu toggle */}
                <button onClick={() => setOpen(!open)} className="md:hidden btn-ghost p-2">
                    {open ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile menu */}
            {open && (
                <div className="md:hidden border-t border-slate-800 px-4 py-3 space-y-1">
                    {links.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className={clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                                path.startsWith(href)
                                    ? 'bg-emerald-600/20 text-emerald-400'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            )}
                        >
                            <Icon size={16} />
                            {label}
                        </Link>
                    ))}
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-white text-sm">
                        <LogOut size={16} />
                        Sair
                    </button>
                </div>
            )}
        </nav>
    );
}
