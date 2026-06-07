require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const plantasRouter    = require('./routes/plantas');
const leiturasRouter   = require('./routes/leituras');
const irrigacaoRouter  = require('./routes/irrigacao');
const bombaRouter      = require('./routes/bomba');
const dispositivoRouter = require('./routes/dispositivos');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Segurança ──────────────────────────────────────────────
app.use(helmet());

// CORS: suporta múltiplas origens separadas por vírgula
// Ex: CORS_ORIGIN=https://app.vercel.app,http://localhost:3000
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Permite requisições sem origin (ESP32, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS bloqueado para: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id', 'x-api-key'],
}));

// Rate limiting global
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Rate limiting mais restrito para endpoints de escrita do ESP32
const esp32Limiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 120,            // no máximo 2 req/s por IP
    keyGenerator: (req) => req.headers['x-device-id'] || req.ip,
});

// ── Parsing ────────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rotas ──────────────────────────────────────────────────
app.use('/api/plantas',      plantasRouter);
app.use('/api/leituras',     esp32Limiter, leiturasRouter);
app.use('/api/irrigacao',    irrigacaoRouter);
app.use('/api/bomba',        bombaRouter);
app.use('/api/dispositivos', dispositivoRouter);

// ── 404 ────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// ── Erro global ────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
    });
});

app.listen(PORT, () => {
    console.log(`🌱 Semeando Vidas Backend — porta ${PORT}`);
    console.log(`   Supabase: ${process.env.SUPABASE_URL}`);
});
