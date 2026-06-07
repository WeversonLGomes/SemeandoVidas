const { supabaseAdmin } = require('../config/supabase');

// GET /api/irrigacao/:plantaId?limit=20
async function historico(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const { data, error } = await supabaseAdmin
        .from('irrigacoes')
        .select('*')
        .eq('planta_id', req.params.plantaId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}

// GET /api/irrigacao/:plantaId/ativa
async function buscarAtiva(req, res) {
    const { data, error } = await supabaseAdmin
        .from('irrigacoes')
        .select('*')
        .eq('planta_id', req.params.plantaId)
        .eq('status', 'em_andamento')
        .order('inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}

// POST /api/irrigacao/:plantaId/iniciar
async function iniciar(req, res) {
    const { tipo = 'manual', motivo } = req.body;
    const { plantaId } = req.params;

    // Verificar se já existe irrigação ativa
    const { data: ativa } = await supabaseAdmin
        .from('irrigacoes')
        .select('id')
        .eq('planta_id', plantaId)
        .eq('status', 'em_andamento')
        .maybeSingle();

    if (ativa) {
        return res.status(409).json({ error: 'Já existe uma irrigação em andamento' });
    }

    // Buscar umidade atual
    const { data: leitura } = await supabaseAdmin
        .from('leituras_umidade')
        .select('umidade')
        .eq('planta_id', plantaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Criar irrigação
    const { data, error } = await supabaseAdmin
        .from('irrigacoes')
        .insert({
            planta_id: plantaId,
            tipo,
            status: 'em_andamento',
            umidade_inicio: leitura?.umidade,
            motivo,
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    // Criar comando para o ESP32
    const { data: planta } = await supabaseAdmin
        .from('plantas')
        .select('duracao_irrigacao_s')
        .eq('id', plantaId)
        .single();

    await supabaseAdmin.from('comandos_bomba').insert({
        planta_id: plantaId,
        comando: 'ligar',
        duracao_s: planta?.duracao_irrigacao_s ?? 30,
        origem: tipo,
    });

    res.status(201).json(data);
}

// PATCH /api/irrigacao/:id/finalizar
async function finalizar(req, res) {
    const { umidade_fim, volume_litros } = req.body;

    const { data, error } = await supabaseAdmin.rpc('finalizar_irrigacao', {
        p_irrigacao_id: req.params.id,
        p_umidade_fim: umidade_fim ?? 0,
        p_volume_litros: volume_litros ?? null,
    });

    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(404).json({ error: 'Irrigação não encontrada ou já finalizada' });

    // Criar comando de desligar bomba
    await supabaseAdmin.from('comandos_bomba').insert({
        planta_id: data.planta_id,
        comando: 'desligar',
        origem: 'manual',
    });

    res.json(data);
}

module.exports = { historico, buscarAtiva, iniciar, finalizar };
