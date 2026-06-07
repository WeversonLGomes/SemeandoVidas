import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#10b981',
                    dark:    '#059669',
                    light:   '#34d399',
                },
            },
            backgroundImage: {
                'app-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e2937 100%)',
            },
            animation: {
                'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
        },
    },
    plugins: [],
};

export default config;
