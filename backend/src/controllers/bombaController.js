const { supabaseAdmin } = require('../config/supabase');

// POST /api/bomba/comando — dashboard envia comando
async function enviarComando(req, res) {
    const { planta_id, comando, duracao_s = 30 } = req.body;

    if (!planta_id || !comando) {
        return res.status(400).json({ error: 'planta_id e comando são obrigatórios' });
    }
    if (!['ligar', 'desligar'].includes(comando)) {
        return res.status(400).json({ error: 'comando deve ser "ligar" ou "desligar"' });
    }

    const { data, error } = await supabaseAdmin
        .from('comandos_bomba')
        .insert({ planta_id, comando, duracao_s, origem: 'manual' })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
}

// GET /api/bomba/pendente/:deviceId — ESP32 busca próximo comando
async function buscarPendente(req, res) {
    const { deviceId } = req.params;

    // Buscar planta associada ao device
    const { data: dispositivo } = await supabaseAdmin
        .from('dispositivos')
        .select('planta_id')
        .eq('device_id', deviceId)
        .maybeSingle();

    if (!dispositivo) {
        return res.json({ comando: null });
    }

    const { data, error } = await supabaseAdmin
        .from('comandos_bomba')
        .select('id, comando, duracao_s')
        .eq('planta_id', dispositivo.planta_id)
        .eq('executado', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ comando: data || null });
}

// PATCH /api/bomba/confirmar/:id — ESP32 confirma execução
async function confirmarExecucao(req, res) {
    const { data, error } = await supabaseAdmin
        .from('comandos_bomba')
        .update({ executado: true, executado_em: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}

module.exports = { enviarComando, buscarPendente, confirmarExecucao };
