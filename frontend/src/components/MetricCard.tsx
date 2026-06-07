import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    title: string;
    value: string | number;
    unit?: string;
    icon: LucideIcon;
    iconColor?: string;
    trend?: 'up' | 'down' | 'neutral';
    subtitle?: string;
}

export default function MetricCard({ title, value, unit, icon: Icon, iconColor = 'text-emerald-400', subtitle }: Props) {
    return (
        <div className="card-hover">
            <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">{title}</p>
                <Icon size={20} className={clsx(iconColor)} />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{value}</span>
                {unit && <span className="text-slate-400 text-lg">{unit}</span>}
            </div>
            {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
    );
}
