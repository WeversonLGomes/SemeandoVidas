const { supabase } = require('../config/supabase');

// Verifica JWT do Supabase e injeta req.user
async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação ausente' });
    }

    const token = header.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    req.user = user;
    next();
}

// Autenticação por device_id (ESP32) — usa header x-device-id + x-api-key
function requireDevice(req, res, next) {
    const deviceId = req.headers['x-device-id'];
    const apiKey   = req.headers['x-api-key'];

    if (!deviceId) {
        return res.status(401).json({ error: 'x-device-id ausente' });
    }

    // Validação simples de chave de API — em produção use JWT ou shared secret mais robusto
    if (apiKey !== process.env.ESP32_API_KEY && process.env.NODE_ENV !== 'development') {
        return res.status(401).json({ error: 'x-api-key inválida' });
    }

    req.deviceId = deviceId;
    next();
}

module.exports = { requireAuth, requireDevice };
