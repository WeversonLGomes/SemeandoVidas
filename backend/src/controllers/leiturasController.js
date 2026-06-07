const { supabaseAdmin } = require('../config/supabase');

// POST /api/leituras/esp32
// Recebe pacote JSON do ESP32 com leituras e estado da bomba
async function receberDadosEsp32(req, res) {
    const {
        device_id,
        planta_id,
        umidade,       // 0-100
        temperatura,   // opcional
        raw_adc,       // valor bruto do ADC
        vazao_lmin,    // L/min
        volume_litros, // acumulado na sessão
        pulsos,
        bomba_ligada,  // boolean
        umidade_inicio_irrigacao, // enviado quando bomba liga
    } = req.body;

    if (!planta_id || umidade == null) {
        return res.status(400).json({ error: 'planta_id e umidade são obrigatórios' });
    }

    const ops = [];

    // Salva leitura de umidade
    ops.push(
        supabaseAdmin.from('leituras_umidade').insert({
            planta_id, umidade, temperatura, raw_adc,
        })
    );

    // Salva leitura de vazão (se fornecida)
    if (vazao_lmin != null) {
        ops.push(
            supabaseAdmin.from('leituras_vazao').insert({
                planta_id, vazao_lmin, volume_litros: volume_litros ?? 0, pulsos,
            })
        );
    }

    // Atualiza último_valor nos sensores
    ops.push(
        supabaseAdmin.from('sensores')
            .update({ ultimo_valor: umidade, ultima_leitura: new Date().toISOString() })
            .eq('planta_id', planta_id)
            .eq('tipo', 'umidade_solo')
    );

    // Atualiza estado do dispositivo
    if (device_id) {
        ops.push(
            supabaseAdmin.from('dispositivos')
                .upsert({
                    device_id,
                    planta_id,
                    online: true,
                    ultimo_ping: new Date().toISOString(),
                }, { onConflict: 'device_id' })
        );
    }

    // Aciona irrigação automática se a bomba ligou
    if (bomba_ligada && umidade_inicio_irrigacao != null) {
        ops.push(
            supabaseAdmin.from('irrigacoes').insert({
                planta_id,
                tipo: 'automatica',
                status: 'em_andamento',
                umidade_inicio: umidade_inicio_irrigacao,
            })
        );
    }

    await Promise.allSettled(ops);

    // Verifica se há comando pendente para retornar ao ESP32
    const { data: comando } = await supabaseAdmin
        .from('comandos_bomba')
        .select('id, comando, duracao_s')
        .eq('planta_id', planta_id)
        .eq('executado', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        comando: comando || null,
    });
}

// GET /api/leituras/umidade/:plantaId?limit=48&horas=24
async function umidadeHistorico(req, res) {
    const { plantaId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 48, 200);
    const horas = parseInt(req.query.horas) || 24;
    const desde = new Date(Date.now() - horas * 3600 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from('leituras_umidade')
        .select('umidade, temperatura, created_at')
        .eq('planta_id', plantaId)
        .gte('created_at', desde)
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}

// GET /api/leituras/vazao/:plantaId?limit=48
async function vazaoHistorico(req, res) {
    const { plantaId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 48, 200);
    const horas = parseInt(req.query.horas) || 24;
    const desde = new Date(Date.now() - horas * 3600 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from('leituras_vazao')
        .select('vazao_lmin, volume_litros, created_at')
        .eq('planta_id', plantaId)
        .gte('created_at', desde)
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}

// GET /api/leituras/resumo/:plantaId
async function resumo(req, res) {
    const { plantaId } = req.params;

    const desde24h = new Date(Date.now() - 86400000).toISOString();

    const [umidade, vazao, vazaoHistorico24h] = await Promise.all([
        supabaseAdmin.from('leituras_umidade')
            .select('umidade, created_at')
            .eq('planta_id', plantaId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

        supabaseAdmin.from('leituras_vazao')
            .select('vazao_lmin, created_at')
            .eq('planta_id', plantaId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

        // Volume total das últimas 24h calculado a partir das leituras de vazão.
        // Detecta sessões (o volume reseta quando a bomba reinicia) e soma o pico de cada sessão.
        supabaseAdmin.from('leituras_vazao')
            .select('volume_litros')
            .eq('planta_id', plantaId)
            .gte('created_at', desde24h)
            .order('created_at', { ascending: true }),
    ]);

    // Soma volumes por sessão: quando o volume diminui em relação ao anterior,
    // uma nova sessão começou — adiciona o pico da sessão anterior ao total.
    let volumeTotal24h = 0;
    let pico = 0;
    let prev = -1;
    for (const r of vazaoHistorico24h.data || []) {
        const v = parseFloat(r.volume_litros) || 0;
        if (prev >= 0 && v < prev) {
            // Novo ciclo de bomba — contabiliza o pico anterior
            volumeTotal24h += pico;
            pico = 0;
        }
        if (v > pico) pico = v;
        prev = v;
    }
    volumeTotal24h += pico; // último ciclo (ou único ciclo)

    res.json({
        umidade_atual:   umidade.data?.umidade ?? null,
        ultima_leitura:  umidade.data?.created_at ?? null,
        vazao_atual:     parseFloat(vazao.data?.vazao_lmin ?? 0),
        volume_24h:      parseFloat(volumeTotal24h.toFixed(4)),
    });
}

module.exports = { receberDadosEsp32, umidadeHistorico, vazaoHistorico, resumo };
