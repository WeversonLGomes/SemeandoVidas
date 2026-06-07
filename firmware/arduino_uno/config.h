/**
 * SEMEANDO VIDAS — Configurações do Arduino Uno WiFi (ATmega328P)
 * Edite este arquivo antes de compilar e gravar na placa.
 */
#pragma once

// ── Wi-Fi ─────────────────────────────────────────────────
#define WIFI_SSID        "SUA_REDE_WIFI"
#define WIFI_PASSWORD    "SUA_SENHA_WIFI"

// ── Backend ───────────────────────────────────────────────
// SOMENTE o host ou IP — sem "http://"
// Exemplo local:     "192.168.0.10"
// Exemplo produção:  "seuapp.railway.app"
#define BACKEND_HOST     "192.168.0.10"
#define BACKEND_PORT     3001

// Chave secreta — mesmo valor de ESP32_API_KEY no .env do backend
#define API_KEY          "sua_api_key_secreta"

// ── Identificação da placa ────────────────────────────────
#define DEVICE_ID        "ARD-WIFI-001"

// UUID da planta — copie do dashboard após cadastrar
#define PLANTA_ID        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

// ── Pinos Arduino Uno ─────────────────────────────────────
#define PINO_UMIDADE_SOLO  A0   // Sensor capacitivo de umidade (analógico)
#define PINO_SENSOR_VAZAO   2   // YF-S201 — interrupção INT0
#define PINO_RELE_BOMBA     7   // Módulo relé (LOW = ativa / HIGH = desativa)
#define PINO_LED_STATUS    13   // LED onboard

// ── Calibração ADC (10-bit: 0 a 1023) ────────────────────
// Como calibrar:
//  1. Abra Monitor Serial (115200 baud) → anote "ADC bruto" com sensor NO AR  → SECO
//  2. Coloque sensor EM ÁGUA             → anote "ADC bruto"                   → MOLHADO
#define UMIDADE_ADC_SECO     850   // ADC no ar   = 0%
#define UMIDADE_ADC_MOLHADO  400   // ADC na água = 100%

// ── Limites de irrigação automática ───────────────────────
#define UMIDADE_MINIMA_DEFAULT  30   // % → abaixo disso: liga bomba
#define UMIDADE_MAXIMA_DEFAULT  80   // % → acima disso:  desliga bomba

// ── Temporização ──────────────────────────────────────────
#define INTERVALO_LEITURA_MS   30000UL   // Envio de dados a cada 30s
#define INTERVALO_PING_MS      60000UL   // Heartbeat a cada 60s
#define DURACAO_MAX_BOMBA_MS   30000UL   // Segurança: desliga bomba após 30s

// ── Sensor de Vazão YF-S201 ───────────────────────────────
// 7,5 pulsos/segundo equivalem a 1 litro/minuto
#define FATOR_VAZAO  7.5f
