-- =====================================================
-- SEMEANDO VIDAS — Schema Principal do Banco de Dados
-- Execute no SQL Editor do Supabase
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- PERFIS DE USUÁRIO
-- Espelha auth.users com dados extras
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome        VARCHAR(100) NOT NULL DEFAULT '',
    email       VARCHAR(255) NOT NULL UNIQUE,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nome)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PLANTAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plantas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    nome            VARCHAR(100) NOT NULL,
    especie         VARCHAR(100),
    descricao       TEXT,
    foto_url        TEXT,
    umidade_minima  INTEGER NOT NULL DEFAULT 30  CHECK (umidade_minima >= 0 AND umidade_minima <= 100),
    umidade_maxima  INTEGER NOT NULL DEFAULT 80  CHECK (umidade_maxima >= 0 AND umidade_maxima <= 100),
    umidade_ideal   INTEGER NOT NULL DEFAULT 60  CHECK (umidade_ideal >= 0 AND umidade_ideal <= 100),
    irrigacao_auto  BOOLEAN NOT NULL DEFAULT TRUE,
    duracao_irrigacao_s INTEGER NOT NULL DEFAULT 30,
    ativa           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT umidade_range CHECK (umidade_minima < umidade_maxima)
);

-- =====================================================
-- SENSORES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sensores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id       UUID NOT NULL REFERENCES public.plantas(id) ON DELETE CASCADE,
    tipo            VARCHAR(30) NOT NULL CHECK (tipo IN ('umidade_solo', 'vazao', 'temperatura')),
    descricao       TEXT,
    pino_gpio       INTEGER,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_valor    NUMERIC(10,4),
    ultima_leitura  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LEITURAS DE UMIDADE DO SOLO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leituras_umidade (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id   UUID NOT NULL REFERENCES public.plantas(id) ON DELETE CASCADE,
    sensor_id   UUID REFERENCES public.sensores(id) ON DELETE SET NULL,
    umidade     NUMERIC(5,2) NOT NULL CHECK (umidade >= 0 AND umidade <= 100),
    temperatura NUMERIC(5,2),
    raw_adc     INTEGER,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LEITURAS DE VAZÃO DE ÁGUA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leituras_vazao (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id       UUID NOT NULL REFERENCES public.plantas(id) ON DELETE CASCADE,
    sensor_id       UUID REFERENCES public.sensores(id) ON DELETE SET NULL,
    vazao_lmin      NUMERIC(10,4) NOT NULL DEFAULT 0,  -- Litros por minuto
    volume_litros   NUMERIC(10,4) NOT NULL DEFAULT 0,  -- Litros acumulados na sessão
    pulsos          INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- IRRIGAÇÕES (LOG DE EVENTOS DE IRRIGAÇÃO)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.irrigacoes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id           UUID NOT NULL REFERENCES public.plantas(id) ON DELETE CASCADE,
    tipo                VARCHAR(20) NOT NULL DEFAULT 'automatica'
                            CHECK (tipo IN ('automatica', 'manual')),
    status              VARCHAR(20) NOT NULL DEFAULT 'em_andamento'
                            CHECK (status IN ('em_andamento', 'concluida', 'cancelada', 'erro')),
    inicio              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fim                 TIMESTAMPTZ,
    duracao_segundos    INTEGER,
    volume_litros       NUMERIC(10,4),
    umidade_inicio      NUMERIC(5,2),
    umidade_fim         NUMERIC(5,2),
    motivo              TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMANDOS DA BOMBA (FILA DE COMANDOS DO ESP32)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.comandos_bomba (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id   UUID NOT NULL REFERENCES public.plantas(id) ON DELETE CASCADE,
    comando     VARCHAR(10) NOT NULL CHECK (comando IN ('ligar', 'desligar')),
    duracao_s   INTEGER DEFAULT 30,
    executado   BOOLEAN NOT NULL DEFAULT FALSE,
    executado_em TIMESTAMPTZ,
    origem      VARCHAR(20) DEFAULT 'manual' CHECK (origem IN ('manual', 'automatico', 'agendado')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONFIGURAÇÕES DO DISPOSITIVO (ESP32)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dispositivos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planta_id       UUID NOT NULL REFERENCES public.plantas(id) ON DELETE CASCADE,
    device_id       VARCHAR(50) NOT NULL UNIQUE,
    nome            VARCHAR(100),
    firmware_version VARCHAR(20),
    ip_address      VARCHAR(45),
    ssid            VARCHAR(64),
    ultimo_ping     TIMESTAMPTZ,
    online          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_plantas_usuario ON public.plantas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_plantas_ativa ON public.plantas(ativa);

CREATE INDEX IF NOT EXISTS idx_sensores_planta ON public.sensores(planta_id);
CREATE INDEX IF NOT EXISTS idx_sensores_tipo ON public.sensores(tipo);

CREATE INDEX IF NOT EXISTS idx_leituras_umidade_planta ON public.leituras_umidade(planta_id);
CREATE INDEX IF NOT EXISTS idx_leituras_umidade_created ON public.leituras_umidade(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leituras_vazao_planta ON public.leituras_vazao(planta_id);
CREATE INDEX IF NOT EXISTS idx_leituras_vazao_created ON public.leituras_vazao(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_irrigacoes_planta ON public.irrigacoes(planta_id);
CREATE INDEX IF NOT EXISTS idx_irrigacoes_status ON public.irrigacoes(status);
CREATE INDEX IF NOT EXISTS idx_irrigacoes_created ON public.irrigacoes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comandos_bomba_planta ON public.comandos_bomba(planta_id);
CREATE INDEX IF NOT EXISTS idx_comandos_bomba_executado ON public.comandos_bomba(executado);

CREATE INDEX IF NOT EXISTS idx_dispositivos_planta ON public.dispositivos(planta_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_device_id ON public.dispositivos(device_id);

-- =====================================================
-- FUNÇÃO UPDATED_AT AUTOMÁTICO
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_plantas_updated_at
    BEFORE UPDATE ON public.plantas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_dispositivos_updated_at
    BEFORE UPDATE ON public.dispositivos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- VIEW: DASHBOARD RESUMO POR PLANTA
-- =====================================================
CREATE OR REPLACE VIEW public.vw_dashboard_plantas AS
SELECT
    p.id,
    p.usuario_id,
    p.nome,
    p.especie,
    p.foto_url,
    p.umidade_minima,
    p.umidade_maxima,
    p.umidade_ideal,
    p.irrigacao_auto,
    p.duracao_irrigacao_s,
    p.ativa,
    -- Última umidade
    (SELECT lu.umidade FROM public.leituras_umidade lu
     WHERE lu.planta_id = p.id ORDER BY lu.created_at DESC LIMIT 1) AS umidade_atual,
    (SELECT lu.created_at FROM public.leituras_umidade lu
     WHERE lu.planta_id = p.id ORDER BY lu.created_at DESC LIMIT 1) AS ultima_leitura_umidade,
    -- Última vazão
    (SELECT lv.vazao_lmin FROM public.leituras_vazao lv
     WHERE lv.planta_id = p.id ORDER BY lv.created_at DESC LIMIT 1) AS vazao_atual,
    -- Irrigação ativa
    (SELECT i.id FROM public.irrigacoes i
     WHERE i.planta_id = p.id AND i.status = 'em_andamento' LIMIT 1) AS irrigacao_ativa_id,
    -- Dispositivo online: considera online se o último ping foi há menos de 2 minutos
    -- (ESP32 envia dados a cada 30s → 2 min = 4 ciclos perdidos)
    (SELECT d.ultimo_ping > NOW() - INTERVAL '2 minutes'
     FROM public.dispositivos d
     WHERE d.planta_id = p.id LIMIT 1) AS dispositivo_online
FROM public.plantas p
WHERE p.ativa = TRUE;

-- =====================================================
-- FUNÇÃO: FINALIZAR IRRIGAÇÃO
-- =====================================================
CREATE OR REPLACE FUNCTION public.finalizar_irrigacao(
    p_irrigacao_id UUID,
    p_umidade_fim NUMERIC,
    p_volume_litros NUMERIC DEFAULT NULL
)
RETURNS public.irrigacoes LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_irrigacao public.irrigacoes;
BEGIN
    UPDATE public.irrigacoes
    SET
        status = 'concluida',
        fim = NOW(),
        duracao_segundos = EXTRACT(EPOCH FROM (NOW() - inicio))::INTEGER,
        umidade_fim = p_umidade_fim,
        volume_litros = COALESCE(p_volume_litros, volume_litros)
    WHERE id = p_irrigacao_id AND status = 'em_andamento'
    RETURNING * INTO v_irrigacao;

    RETURN v_irrigacao;
END;
$$;
