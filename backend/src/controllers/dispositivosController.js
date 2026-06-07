const { supabaseAdmin } = require('../config/supabase');

// POST /api/dispositivos/ping — ESP32 heartbeat
async function ping(req, res) {
    const { device_id, planta_id, firmware_version, ip_address, ssid } = req.body;

    if (!device_id || !planta_id) {
        return res.status(400).json({ error: 'device_id e planta_id são obrigatórios' });
    }

    const { data, error } = await supabaseAdmin
        .from('dispositivos')
        .upsert({
            device_id,
            planta_id,
            firmware_version,
            ip_address,
            ssid,
            online: true,
            ultimo_ping: new Date().toISOString(),
        }, { onConflict: 'device_id' })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, dispositivo: data });
}

// GET /api/dispositivos
async function listar(req, res) {
    const { data, error } = await supabaseAdmin
        .from('dispositivos')
        .select('*, plantas(nome)')
        .in('planta_id', supabaseAdmin
            .from('plantas')
            .select('id')
            .eq('usuario_id', req.user.id)
        );

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}

// GET /api/dispositivos/:plantaId
async function buscarPorPlanta(req, res) {
    const { data, error } = await supabaseAdmin
        .from('dispositivos')
        .select('*')
        .eq('planta_id', req.params.plantaId)
        .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}

module.exports = { ping, listar, buscarPorPlanta };
