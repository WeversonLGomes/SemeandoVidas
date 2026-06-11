/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║          SEMEANDO VIDAS — Firmware ESP32                 ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Pinos:                                                  ║
 * ║   GPIO 34 → Sensor de umidade do solo (ADC, só entrada)  ║
 * ║   GPIO 27 → Sensor de vazão YF-S201   (interrupção)      ║
 * ║   GPIO 26 → Módulo Relé               (LOW = liga)       ║
 * ║   GPIO  2 → LED onboard               (status)           ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Bibliotecas necessárias (Library Manager):              ║
 * ║   • ArduinoJson  — Benoit Blanchon (versão 7.x)          ║
 * ║   WiFi.h e HTTPClient.h já vêm com o pacote ESP32        ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Para testar SEM hardware:                               ║
 * ║   Descomente "#define MODO_SIMULACAO" em config.h        ║
 * ║   O código gera dados falsos e ainda envia ao backend    ║
 * ╚══════════════════════════════════════════════════════════╝
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>   // necessário para HTTPS (Railway/Vercel)
#include <ArduinoJson.h>
#include "config.h"

// ──────────────────────────────────────────────────────────
// Estado global
// ──────────────────────────────────────────────────────────
volatile uint32_t contadorPulsos = 0;

bool  bombaLigada    = false;
float volumeTotal_L  = 0.0f;

unsigned long tsUltimaLeitura = 0;
unsigned long tsUltimoPing    = 0;
unsigned long tsBombaLigou    = 0;

// ──────────────────────────────────────────────────────────
// ISR — Sensor de Vazão (IRAM garante velocidade)
// ──────────────────────────────────────────────────────────
#ifndef MODO_SIMULACAO
void IRAM_ATTR onPulsoVazao() {
    contadorPulsos++;
}
#endif

// ══════════════════════════════════════════════════════════
// SENSORES — leitura real OU simulada
// ══════════════════════════════════════════════════════════

#ifdef MODO_SIMULACAO
// ── Simulação ─────────────────────────────────────────────
// Gera uma umidade que oscila suavemente entre 20% e 85%,
// caindo devagar para forçar a irrigação automática.

float _umidadeSim = 65.0f;   // valor inicial simulado

float lerUmidade() {
    // Simula queda de ~0.5% por leitura; sobe quando bomba liga
    if (bombaLigada) {
        _umidadeSim += 2.0f + (random(100) / 100.0f);
    } else {
        _umidadeSim -= 0.5f + (random(100) / 200.0f);
    }
    _umidadeSim = constrain(_umidadeSim, 0.0f, 100.0f);
    return _umidadeSim;
}

float calcularVazao(uint32_t /*pulsos*/, unsigned long /*dt_ms*/) {
    float lpm = bombaLigada ? (1.2f + random(40) / 100.0f) : 0.0f;
    volumeTotal_L += lpm * (INTERVALO_LEITURA_MS / 60000.0f);
    return lpm;
}

int lerAdcBruto() {
    // Retorna valor ADC equivalente à umidade simulada
    return map((int)_umidadeSim, 0, 100, UMIDADE_ADC_SECO, UMIDADE_ADC_MOLHADO);
}

#else
// ── Hardware real ─────────────────────────────────────────

/** Lê o ADC N vezes e retorna a média (reduz ruído) */
int lerAdcBruto() {
    long soma = 0;
    for (int i = 0; i < 10; i++) {
        soma += analogRead(PINO_UMIDADE_SOLO);
        delay(5);
    }
    return soma / 10;
}

/** Converte ADC para % de umidade */
float lerUmidade() {
    float u = map(lerAdcBruto(),
                  UMIDADE_ADC_MOLHADO, UMIDADE_ADC_SECO,
                  100, 0);
    return constrain(u, 0.0f, 100.0f);
}

/** Calcula vazão em L/min e acumula volume */
float calcularVazao(uint32_t pulsos, unsigned long dt_ms) {
    if (dt_ms == 0) return 0.0f;
    float hz  = (float)pulsos / (dt_ms / 1000.0f);
    float lpm = hz / FATOR_VAZAO;
    // Só acumula volume quando a bomba está ligada.
    // Evita que pulsos espúrios do GPIO 27 (sensor flutuando) gerem volume falso.
    if (bombaLigada) {
        volumeTotal_L += lpm * (dt_ms / 60000.0f);
    }
    return lpm;
}

#endif // MODO_SIMULACAO

// ══════════════════════════════════════════════════════════
// ATUADORES
// ══════════════════════════════════════════════════════════

void ligarBomba(const char* motivo) {
    if (!bombaLigada) {
#ifndef MODO_SIMULACAO
        digitalWrite(PINO_RELE_BOMBA, LOW);
#endif
        bombaLigada  = true;
        tsBombaLigou = millis();
        Serial.printf("[BOMBA] LIGADA — %s\n", motivo);
    }
}

void desligarBomba(const char* motivo) {
    if (bombaLigada) {
#ifndef MODO_SIMULACAO
        digitalWrite(PINO_RELE_BOMBA, HIGH);
#endif
        bombaLigada = false;
        // Reseta o volume ao desligar — cada sessão começa do zero.
        // Permite que o backend detecte corretamente o volume por sessão.
        volumeTotal_L = 0.0f;
        Serial.printf("[BOMBA] DESLIGADA — %s\n", motivo);
    }
}

void piscaLed(int vezes, int ms = 80) {
    for (int i = 0; i < vezes; i++) {
        digitalWrite(PINO_LED_STATUS, HIGH);
        delay(ms);
        digitalWrite(PINO_LED_STATUS, LOW);
        delay(ms);
    }
}

// ══════════════════════════════════════════════════════════
// WI-FI
// ══════════════════════════════════════════════════════════

bool conectarWifi() {
    // Desconecta e limpa estado anterior antes de tentar novamente
    // (evita erro "sta is connecting, cannot set config")
    WiFi.disconnect(true);  // encerra conexão anterior
    WiFi.mode(WIFI_OFF);    // desliga o rádio completamente
    delay(500);
    WiFi.mode(WIFI_STA);    // liga só como estação (cliente)
    WiFi.setAutoReconnect(false); // deixa a reconexão por nossa conta

    Serial.printf("[WiFi] Conectando a: %s\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int t = 0;
    while (WiFi.status() != WL_CONNECTED && t < 40) {
        delay(500);
        Serial.print('.');
        t++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[WiFi] Conectado! IP: %s\n",
                      WiFi.localIP().toString().c_str());
        piscaLed(3);
        return true;
    }

    Serial.println("[WiFi] FALHA na conexão.");
    return false;
}

bool verificarWifi() {
    if (WiFi.status() == WL_CONNECTED) return true;
    Serial.println("[WiFi] Desconectado. Reconectando...");
    return conectarWifi();
}

// ══════════════════════════════════════════════════════════
// HTTP POST
// ══════════════════════════════════════════════════════════

/**
 * Envia um POST para o backend.
 * Preenche respBuf com o corpo da resposta.
 * Retorna true se status HTTP == 200.
 */
bool httpPost(const char* path,
              const char* jsonBody,
              char*       respBuf,
              size_t      respSize)
{
    if (!verificarWifi()) return false;

    HTTPClient http;

#ifdef BACKEND_HTTPS
    // HTTPS — necessário para Railway e outros hosts modernos.
    // setInsecure() aceita qualquer certificado (adequado para IoT embarcado).
    WiFiClientSecure secureClient;
    secureClient.setInsecure();
    String url = String("https://") + BACKEND_HOST + path;
    http.begin(secureClient, url);
    http.setTimeout(12000); // HTTPS precisa de mais tempo (handshake TLS)
#else
    // HTTP — para desenvolvimento local
    String url = String("http://") + BACKEND_HOST + ":" + BACKEND_PORT + path;
    http.begin(url);
    http.setTimeout(6000);
#endif

    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-id",  DEVICE_ID);
    http.addHeader("x-api-key",    API_KEY);

    int code = http.POST((uint8_t*)jsonBody, strlen(jsonBody));

    bool ok = (code == 200);
    if (ok) {
        String body = http.getString();
        strncpy(respBuf, body.c_str(), respSize - 1);
        respBuf[respSize - 1] = '\0';
    } else {
        Serial.printf("[HTTP] Erro %d em %s\n", code, path);
        if (respBuf) respBuf[0] = '\0';
    }

    http.end();
    return ok;
}

// ══════════════════════════════════════════════════════════
// ENVIO DE LEITURAS
// ══════════════════════════════════════════════════════════

/**
 * Monta o JSON com os dados do ciclo e envia ao backend.
 * Retorna o comando recebido: 1=ligar, -1=desligar, 0=nenhum.
 */
int8_t enviarLeituras(float umidade, float vazao_lmin, uint32_t pulsos) {
    // Monta JSON com ArduinoJson (mais seguro que snprintf para strings)
    JsonDocument doc;
    doc["device_id"]      = DEVICE_ID;
    doc["planta_id"]      = PLANTA_ID;
    doc["umidade"]        = serialized(String(umidade, 1));
    doc["vazao_lmin"]     = serialized(String(vazao_lmin, 3));
    doc["volume_litros"]  = serialized(String(volumeTotal_L, 4));
    doc["pulsos"]         = pulsos;
    doc["bomba_ligada"]   = bombaLigada;
    doc["raw_adc"]        = lerAdcBruto();

#ifdef MODO_SIMULACAO
    doc["simulacao"] = true;
#endif

    char jsonBuf[256];
    serializeJson(doc, jsonBuf, sizeof(jsonBuf));

    // Mostra o JSON que será enviado
    Serial.println("  [→ Enviando ao backend]");
    Serial.printf("     %s\n", jsonBuf);

    char respBuf[400];
    bool ok = httpPost("/api/leituras/esp32", jsonBuf, respBuf, sizeof(respBuf));

    if (!ok) {
        Serial.println("  [✗ FALHA no envio]");
        piscaLed(4, 30);
        return 0;
    }

    // Mostra a resposta do backend
    Serial.println("  [✔ Backend respondeu]");
    Serial.printf("     %s\n", respBuf);
    piscaLed(1, 40);

    // Extrai comando da resposta JSON
    JsonDocument resp;
    if (deserializeJson(resp, respBuf) != DeserializationError::Ok) return 0;

    JsonVariant cmd = resp["comando"];
    if (cmd.isNull()) return 0;

    const char* acao = cmd["comando"];
    if (!acao) return 0;

    // Confirma execução ao backend
    const char* cmdId = cmd["id"];
    if (cmdId) {
        char path[80];
        snprintf(path, sizeof(path), "/api/bomba/confirmar/%s", cmdId);
        char tmp[64];
        httpPost(path, "{}", tmp, sizeof(tmp));
    }

    if (strcmp(acao, "ligar")    == 0) return  1;
    if (strcmp(acao, "desligar") == 0) return -1;
    return 0;
}

/** Heartbeat de presença */
void enviarPing() {
    JsonDocument doc;
    doc["device_id"] = DEVICE_ID;
    doc["planta_id"] = PLANTA_ID;
    doc["ip_address"] = WiFi.localIP().toString();
    doc["firmware_version"] = "2.0.0";
#ifdef MODO_SIMULACAO
    doc["simulacao"] = true;
#endif

    char buf[180];
    serializeJson(doc, buf, sizeof(buf));

    char tmp[64];
    if (httpPost("/api/dispositivos/ping", buf, tmp, sizeof(tmp))) {
        Serial.println("[Ping] OK");
    }
}

// ══════════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════════
void setup() {
    Serial.begin(9600);
    delay(300);

    Serial.println("\n================================");
    Serial.println("  SEMEANDO VIDAS — ESP32");
#ifdef MODO_SIMULACAO
    Serial.println("  *** MODO SIMULACAO ATIVO ***");
    Serial.println("  (dados falsos — sem hardware)");
#endif
    Serial.println("================================\n");

    // Configura pinos (pulamos no modo simulação, mas não faz mal)
    pinMode(PINO_RELE_BOMBA,   OUTPUT);
    pinMode(PINO_LED_STATUS,   OUTPUT);
    pinMode(PINO_SENSOR_VAZAO, INPUT_PULLUP);
    // GPIO 34 é pino somente de entrada no ESP32 — não aceita OUTPUT nem PULLUP.
    // Não precisa de pinMode para usar analogRead(), mas declaramos INPUT por clareza.
    pinMode(PINO_UMIDADE_SOLO, INPUT);
    analogReadResolution(12);       // ADC 12-bit (0–4095)
    analogSetAttenuation(ADC_11db); // faixa 0–3.3V

    // Garante bomba desligada
    digitalWrite(PINO_RELE_BOMBA, HIGH);

#ifndef MODO_SIMULACAO
    // Interrupção do sensor de vazão
    attachInterrupt(digitalPinToInterrupt(PINO_SENSOR_VAZAO),
                    onPulsoVazao, RISING);

    // Leitura de calibração
    Serial.println("--- Calibração do sensor de umidade ---");
    int adc = lerAdcBruto();
    Serial.printf("ADC bruto: %d  →  Umidade: %.1f%%\n", adc, lerUmidade());
    Serial.println("  No ar  → ajuste UMIDADE_ADC_SECO");
    Serial.println("  Na água → ajuste UMIDADE_ADC_MOLHADO\n");
#endif

    // Conecta Wi-Fi
    if (!conectarWifi()) {
        Serial.println("Continuando sem WiFi (modo offline)...");
    } else {
        enviarPing();
    }

    tsUltimaLeitura = millis();
    tsUltimoPing    = millis();
    Serial.println("[Sistema] Pronto!\n");
}

// ══════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ══════════════════════════════════════════════════════════
void loop() {
    unsigned long agora = millis();

    // ── Heartbeat ─────────────────────────────────────────
    if (agora - tsUltimoPing >= INTERVALO_PING_MS) {
        tsUltimoPing = agora;
        if (WiFi.status() == WL_CONNECTED) enviarPing();
    }

    // ── Ciclo de leitura + envio ───────────────────────────
    if (agora - tsUltimaLeitura >= INTERVALO_LEITURA_MS) {
        unsigned long dt = agora - tsUltimaLeitura;
        tsUltimaLeitura  = agora;

        // Captura pulsos (desliga ISR momentaneamente)
        portDISABLE_INTERRUPTS();
        uint32_t pulsos = contadorPulsos;
        contadorPulsos  = 0;
        portENABLE_INTERRUPTS();

        float umidade    = lerUmidade();
        float vazao_lmin = calcularVazao(pulsos, dt);

        // ── Log detalhado no Monitor Serial ───────────────────
        Serial.println("\n╔══════════════════════════════════════╗");
#ifdef MODO_SIMULACAO
        Serial.println("║  LEITURA  [ MODO SIMULAÇÃO ]          ║");
#else
        Serial.println("║  LEITURA  [ HARDWARE REAL ]           ║");
#endif
        Serial.println("╚══════════════════════════════════════╝");

        // Sensores
        Serial.printf("  Umidade  : %.1f%%", umidade);
        if      (umidade < UMIDADE_MINIMA_DEFAULT) Serial.println("  ⚠ SECO — bomba vai ligar");
        else if (umidade > UMIDADE_MAXIMA_DEFAULT) Serial.println("  💧 EXCESSO");
        else                                       Serial.println("  ✔ OK");

#ifndef MODO_SIMULACAO
        Serial.printf("  ADC bruto: %d  (seco=%d | molhado=%d)\n",
                      lerAdcBruto(), UMIDADE_ADC_SECO, UMIDADE_ADC_MOLHADO);
#endif

        Serial.printf("  Vazão     : %.3f L/min\n", vazao_lmin);
        Serial.printf("  Vol sessão: %.4f L\n", volumeTotal_L);
        Serial.printf("  Bomba     : %s\n", bombaLigada ? "🔴 LIGADA" : "⚪ desligada");
        Serial.printf("  WiFi RSSI : %d dBm\n", WiFi.RSSI());
        Serial.printf("  IP local  : %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("  Uptime    : %lu s\n", millis() / 1000);
        Serial.println("──────────────────────────────────────");

        // Envia e verifica comando remoto
        int8_t cmd = 0;
        if (WiFi.status() == WL_CONNECTED) {
            cmd = enviarLeituras(umidade, vazao_lmin, pulsos);
        } else {
            Serial.println("[WiFi] Offline — reconectando...");
            conectarWifi();
        }

        if      (cmd ==  1) ligarBomba("remoto");
        else if (cmd == -1) desligarBomba("remoto");

        // ── Irrigação automática ───────────────────────────
        if (cmd == 0) {
            if (!bombaLigada && umidade < UMIDADE_MINIMA_DEFAULT) {
                Serial.printf("[Auto] Umidade baixa (%.1f%%) → Ligando bomba\n", umidade);
                ligarBomba("auto");
            } else if (bombaLigada && umidade >= UMIDADE_MAXIMA_DEFAULT) {
                Serial.printf("[Auto] Umidade OK (%.1f%%) → Desligando bomba\n", umidade);
                desligarBomba("auto");
            }
        }

        // Alerta LED: pisca 2x quando umidade crítica
        if (umidade < UMIDADE_MINIMA_DEFAULT && !bombaLigada) piscaLed(2);
    }

    // ── Segurança: timeout da bomba ────────────────────────
    if (bombaLigada && (millis() - tsBombaLigou) >= DURACAO_MAX_BOMBA_MS) {
        Serial.println("[Segurança] Timeout → Desligando bomba.");
        desligarBomba("timeout");
    }

    delay(50);
}
