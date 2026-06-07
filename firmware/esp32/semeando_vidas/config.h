/**
 * SEMEANDO VIDAS — Configurações da ESP32
 * Edite este arquivo antes de compilar e gravar na placa.
 */
#pragma once

// ══════════════════════════════════════════════════════════
// MODO SIMULAÇÃO
// Descomente a linha abaixo para testar SEM hardware físico.
// O código gera leituras falsas e ainda envia dados ao backend.
// ══════════════════════════════════════════════════════════
 #define MODO_SIMULACAO

// ── Wi-Fi ─────────────────────────────────────────────────
#define WIFI_SSID       "S24 Ultra de Weverson"
#define WIFI_PASSWORD   "gfybdr7nyxzztbe"

// ── Backend ───────────────────────────────────────────────
//
// MODO LOCAL (desenvolvimento):
//   Comente #define BACKEND_HTTPS, preencha o IP local e porta 3001.
//
// MODO PRODUÇÃO (Railway com HTTPS):
//   Descomente #define BACKEND_HTTPS e substitua pelo domínio do Railway.
//   Não inclua "https://" — apenas o domínio.
//
//  ↓↓↓ LOCAL (descomente estas 3 linhas e comente as de produção):
// // #define BACKEND_HOST "192.168.x.x"
// // #define BACKEND_PORT 3001
//
//  ↓↓↓ PRODUÇÃO — Railway (ativo agora):
#define BACKEND_HTTPS                                                    // use HTTPS (Railway)
#define BACKEND_HOST "semeando-vidas-backend.up.railway.app"            // ← troque pelo seu domínio Railway após o deploy
#define BACKEND_PORT 443

// Chave de API — mesmo valor de ESP32_API_KEY no .env do backend
#define API_KEY         "semeando_vidas_2024"

// ── Identificação ─────────────────────────────────────────
#define DEVICE_ID       "ESP32-SALA-001"

// UUID da planta — copie do dashboard após cadastrar
#define PLANTA_ID       "961fdef0-e1bc-4821-96ab-e24d593f988c"

// ── Pinos GPIO ────────────────────────────────────────────
#define PINO_UMIDADE_SOLO   34   // ADC1 — sensor capacitivo (somente entrada)
#define PINO_SENSOR_VAZAO   27   // Interrupção — YF-S201
#define PINO_RELE_BOMBA     26   // Relé — LOW = ativa, HIGH = desativa
#define PINO_LED_STATUS      2   // LED onboard

// ── Calibração do sensor de umidade (ADC 12-bit: 0–4095) ──
// Como calibrar:
//  1. Sensor NO AR  → anote o ADC bruto no Monitor Serial → SECO
//  2. Sensor NA ÁGUA → anote o ADC bruto                  → MOLHADO
#define UMIDADE_ADC_SECO     2800   // ADC no ar   = 0%
#define UMIDADE_ADC_MOLHADO  1200   // ADC na água = 100%

// ── Limites de irrigação automática ───────────────────────
#define UMIDADE_MINIMA_DEFAULT   30   // % → abaixo: liga bomba
#define UMIDADE_MAXIMA_DEFAULT   80   // % → acima: desliga bomba

// ── Temporização ──────────────────────────────────────────
#define INTERVALO_LEITURA_MS    30000UL   // Envia dados a cada 30s
#define INTERVALO_PING_MS       60000UL   // Heartbeat a cada 60s
#define DURACAO_MAX_BOMBA_MS    30000UL   // Segurança: desliga bomba após 30s

// ── Sensor de Vazão YF-S201 ───────────────────────────────
#define FATOR_VAZAO   7.5f   // 7.5 pulsos/s = 1 L/min
