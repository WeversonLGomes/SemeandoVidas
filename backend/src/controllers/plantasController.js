const { supabaseAdmin } = require('../config/supabase');

// GET /api/plantas
async function listar(req, res) {
    const { data, error } = await supabaseAdmin
        .from('plantas')
        .select('*')
        .eq('usuario_id', req.user.id)
        .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}

// GET /api/plantas/dashboard
async function dashboard(req, res) {
    const { data, error } = await supabaseAdmin
        .from('vw_dashboard_plantas')
        .select('*')
        .eq('usuario_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}

// GET /api/plantas/:id
async function buscar(req, res) {
    const { data, error } = await supabaseAdmin
        .from('plantas')
        .select('*, sensores(*)')
        .eq('id', req.params.id)
        .eq('usuario_id', req.user.id)
        .single();

    if (error) return res.status(404).json({ error: 'Planta não encontrada' });
    res.json(data);
}

// POST /api/plantas
async function criar(req, res) {
    const { nome, especie, descricao, foto_url,
            umidade_minima, umidade_maxima, umidade_ideal,
            irrigacao_auto, duracao_irrigacao_s } = req.body;

    if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });

    const { data, error } = await supabaseAdmin
        .from('plantas')
        .insert({
            usuario_id: req.user.id,
            nome, especie, descricao, foto_url,
            umidade_minima: umidade_minima ?? 30,
            umidade_maxima: umidade_maxima ?? 80,
            umidade_ideal:  umidade_ideal  ?? 60,
            irrigacao_auto: irrigacao_auto ?? true,
            duracao_irrigacao_s: duracao_irrigacao_s ?? 30,
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
}

// PUT /api/plantas/:id
async function atualizar(req, res) {
    const campos = ['nome','especie','descricao','foto_url',
                    'umidade_minima','umidade_maxima','umidade_ideal',
                    'irrigacao_auto','duracao_irrigacao_s','ativa'];
    const payload = {};
    campos.forEach(c => { if (req.body[c] !== undefined) payload[c] = req.body[c]; });

    const { data, error } = await supabaseAdmin
        .from('plantas')
        .update(payload)
        .eq('id', req.params.id)
        .eq('usuario_id', req.user.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(404).json({ error: 'Planta não encontrada' });
    res.json(data);
}

// DELETE /api/plantas/:id
async function remover(req, res) {
    const { error } = await supabaseAdmin
        .from('plantas')
        .delete()
        .eq('id', req.params.id)
        .eq('usuario_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });
    res.status(204).end();
}

module.exports = { listar, dashboard, buscar, criar, atualizar, remover };
