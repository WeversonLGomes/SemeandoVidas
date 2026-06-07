-- =====================================================
-- SEMEANDO VIDAS — Dados de Exemplo
-- ATENÇÃO: Execute apenas após criar um usuário pelo app
-- Substitua 'SEU_USER_ID_AQUI' pelo UUID do seu usuário
-- (visível em Authentication → Users no Supabase)
-- =====================================================

DO $$
DECLARE
    v_user_id UUID := 'SEU_USER_ID_AQUI'; -- << EDITE AQUI
    v_planta1_id UUID := gen_random_uuid();
    v_planta2_id UUID := gen_random_uuid();
    v_sensor_umidade1 UUID := gen_random_uuid();
    v_sensor_vazao1   UUID := gen_random_uuid();
    v_sensor_umidade2 UUID := gen_random_uuid();
BEGIN

-- Perfil (caso não tenha sido criado pelo trigger)
INSERT INTO public.profiles (id, nome, email)
VALUES (v_user_id, 'Usuário Demo', 'demo@semeandovidas.com')
ON CONFLICT (id) DO NOTHING;

-- Plantas
INSERT INTO public.plantas (id, usuario_id, nome, especie, descricao, umidade_minima, umidade_maxima, umidade_ideal, irrigacao_auto, duracao_irrigacao_s)
VALUES
    (v_planta1_id, v_user_id, 'Samambaia', 'Nephrolepis exaltata', 'Planta de sombra, gosta de solo sempre úmido', 50, 85, 65, TRUE, 20),
    (v_planta2_id, v_user_id, 'Cacto', 'Cereus hildmannianus', 'Precisa de pouca água, solo deve secar entre regas', 10, 40, 25, TRUE, 10);

-- Sensores da Samambaia
INSERT INTO public.sensores (id, planta_id, tipo, descricao, pino_gpio)
VALUES
    (v_sensor_umidade1, v_planta1_id, 'umidade_solo', 'Sensor capacitivo de umidade GPIO34', 34),
    (v_sensor_vazao1,   v_planta1_id, 'vazao',        'YF-S201 GPIO27', 27);

-- Sensor do Cacto
INSERT INTO public.sensores (id, planta_id, tipo, descricao, pino_gpio)
VALUES
    (v_sensor_umidade2, v_planta2_id, 'umidade_solo', 'Sensor capacitivo de umidade GPIO34', 34);

-- Dispositivo
INSERT INTO public.dispositivos (planta_id, device_id, nome, firmware_version, online)
VALUES
    (v_planta1_id, 'ESP32-DEMO-001', 'ESP32 Sala', '1.0.0', FALSE);

-- Leituras de umidade históricas (últimas 24h)
INSERT INTO public.leituras_umidade (planta_id, sensor_id, umidade, created_at)
SELECT
    v_planta1_id,
    v_sensor_umidade1,
    60 + (RANDOM() * 20 - 10),
    NOW() - (i * INTERVAL '30 minutes')
FROM generate_series(1, 48) AS i;

-- Leituras de vazão históricas
INSERT INTO public.leituras_vazao (planta_id, sensor_id, vazao_lmin, volume_litros, created_at)
SELECT
    v_planta1_id,
    v_sensor_vazao1,
    ROUND((RANDOM() * 2)::NUMERIC, 3),
    ROUND((RANDOM() * 0.5)::NUMERIC, 4),
    NOW() - (i * INTERVAL '2 hours')
FROM generate_series(1, 12) AS i;

-- Irrigações históricas
INSERT INTO public.irrigacoes (planta_id, tipo, status, inicio, fim, duracao_segundos, volume_litros, umidade_inicio, umidade_fim)
VALUES
    (v_planta1_id, 'automatica', 'concluida', NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '2 hours' + INTERVAL '20 seconds', 20, 0.04, 28, 55),
    (v_planta1_id, 'manual',     'concluida', NOW() - INTERVAL '6 hours',  NOW() - INTERVAL '6 hours' + INTERVAL '25 seconds', 25, 0.05, 35, 62),
    (v_planta1_id, 'automatica', 'concluida', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours' + INTERVAL '20 seconds', 20, 0.04, 27, 58),
    (v_planta2_id, 'manual',     'concluida', NOW() - INTERVAL '48 hours', NOW() - INTERVAL '48 hours' + INTERVAL '10 seconds', 10, 0.02, 8, 22);

RAISE NOTICE 'Dados de exemplo inseridos com sucesso!';
RAISE NOTICE 'Planta 1 (Samambaia): %', v_planta1_id;
RAISE NOTICE 'Planta 2 (Cacto): %', v_planta2_id;

END $$;
