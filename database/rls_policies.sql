-- =====================================================
-- SEMEANDO VIDAS — Row Level Security (RLS)
-- Execute APÓS o schema.sql
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leituras_umidade  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leituras_vazao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigacoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandos_bomba    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositivos      ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES
-- =====================================================
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- PLANTAS — usuário acessa apenas suas plantas
-- =====================================================
DROP POLICY IF EXISTS "plantas_select" ON public.plantas;
DROP POLICY IF EXISTS "plantas_insert" ON public.plantas;
DROP POLICY IF EXISTS "plantas_update" ON public.plantas;
DROP POLICY IF EXISTS "plantas_delete" ON public.plantas;

CREATE POLICY "plantas_select" ON public.plantas
    FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "plantas_insert" ON public.plantas
    FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "plantas_update" ON public.plantas
    FOR UPDATE USING (usuario_id = auth.uid());

CREATE POLICY "plantas_delete" ON public.plantas
    FOR DELETE USING (usuario_id = auth.uid());

-- =====================================================
-- SENSORES — acesso via planta do usuário
-- =====================================================
DROP POLICY IF EXISTS "sensores_select" ON public.sensores;
DROP POLICY IF EXISTS "sensores_insert" ON public.sensores;
DROP POLICY IF EXISTS "sensores_update" ON public.sensores;
DROP POLICY IF EXISTS "sensores_delete" ON public.sensores;

CREATE POLICY "sensores_select" ON public.sensores
    FOR SELECT USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

CREATE POLICY "sensores_insert" ON public.sensores
    FOR INSERT WITH CHECK (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

CREATE POLICY "sensores_update" ON public.sensores
    FOR UPDATE USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

CREATE POLICY "sensores_delete" ON public.sensores
    FOR DELETE USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

-- =====================================================
-- LEITURAS DE UMIDADE
-- =====================================================
DROP POLICY IF EXISTS "leituras_umidade_select" ON public.leituras_umidade;
DROP POLICY IF EXISTS "leituras_umidade_insert" ON public.leituras_umidade;

CREATE POLICY "leituras_umidade_select" ON public.leituras_umidade
    FOR SELECT USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

-- Inserção liberada para service_role (ESP32 via backend) e para o dono
CREATE POLICY "leituras_umidade_insert" ON public.leituras_umidade
    FOR INSERT WITH CHECK (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

-- =====================================================
-- LEITURAS DE VAZÃO
-- =====================================================
DROP POLICY IF EXISTS "leituras_vazao_select" ON public.leituras_vazao;
DROP POLICY IF EXISTS "leituras_vazao_insert" ON public.leituras_vazao;

CREATE POLICY "leituras_vazao_select" ON public.leituras_vazao
    FOR SELECT USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

CREATE POLICY "leituras_vazao_insert" ON public.leituras_vazao
    FOR INSERT WITH CHECK (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

-- =====================================================
-- IRRIGAÇÕES
-- =====================================================
DROP POLICY IF EXISTS "irrigacoes_select" ON public.irrigacoes;
DROP POLICY IF EXISTS "irrigacoes_insert" ON public.irrigacoes;
DROP POLICY IF EXISTS "irrigacoes_update" ON public.irrigacoes;

CREATE POLICY "irrigacoes_select" ON public.irrigacoes
    FOR SELECT USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

CREATE POLICY "irrigacoes_insert" ON public.irrigacoes
    FOR INSERT WITH CHECK (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

CREATE POLICY "irrigacoes_update" ON public.irrigacoes
    FOR UPDATE USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

-- =====================================================
-- COMANDOS DA BOMBA
-- =====================================================
DROP POLICY IF EXISTS "comandos_select" ON public.comandos_bomba;
DROP POLICY IF EXISTS "comandos_insert" ON public.comandos_bomba;
DROP POLICY IF EXISTS "comandos_update" ON public.comandos_bomba;

CREATE POLICY "comandos_select" ON public.comandos_bomba
    FOR SELECT USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

CREATE POLICY "comandos_insert" ON public.comandos_bomba
    FOR INSERT WITH CHECK (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

CREATE POLICY "comandos_update" ON public.comandos_bomba
    FOR UPDATE USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

-- =====================================================
-- DISPOSITIVOS
-- =====================================================
DROP POLICY IF EXISTS "dispositivos_select" ON public.dispositivos;
DROP POLICY IF EXISTS "dispositivos_insert" ON public.dispositivos;
DROP POLICY IF EXISTS "dispositivos_update" ON public.dispositivos;

CREATE POLICY "dispositivos_select" ON public.dispositivos
    FOR SELECT USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

CREATE POLICY "dispositivos_insert" ON public.dispositivos
    FOR INSERT WITH CHECK (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

CREATE POLICY "dispositivos_update" ON public.dispositivos
    FOR UPDATE USING (
        planta_id IN (SELECT id FROM public.plantas WHERE usuario_id = auth.uid())
    );

-- =====================================================
-- PERMITIR SERVICE ROLE IGNORAR RLS
-- O backend Node.js usa service_role e pode inserir
-- dados dos sensores ESP32 em nome de qualquer planta
-- =====================================================
-- (service_role já bypassa RLS por padrão no Supabase)

-- =====================================================
-- REALTIME — Habilitar publicação nas tabelas
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.leituras_umidade;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leituras_vazao;
ALTER PUBLICATION supabase_realtime ADD TABLE public.irrigacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comandos_bomba;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispositivos;
