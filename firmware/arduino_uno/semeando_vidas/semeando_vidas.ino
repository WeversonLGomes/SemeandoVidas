/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║       SEMEANDO VIDAS — Firmware Arduino Uno WiFi         ║
 * ║              (ATmega328P + WiFi nativo)                  ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Hardware:                                               ║
 * ║   A0  → Sensor de umidade do solo (analógico)            ║
 * ║   D2  → Sensor de vazão YF-S201   (interrupção INT0)     ║
 * ║   D7  → Módulo Relé 1 canal       (LOW = liga bomba)     ║
 * ║   D13 → LED onboard               (status)               ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Biblioteca — selecione conforme sua placa:              ║
 * ║   Arduino Uno WiFi (1ª geração)  → WiFi.h               ║
 * ║   Arduino Uno WiFi Rev2          → WiFiNINA.h            ║
 * ║   Arduino Uno R4 WiFi            → WiFiS3.h              ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Como instalar a placa no Arduino IDE:                   ║
 * ║   Ferramentas → Gerenciador de Placas →                  ║
 * ║   pesquise "Arduino AVR Boards" ou "Arduino UNO R4"      ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ── Selecione a biblioteca correta para sua placa ─────────
#include <WiFi.h>          // Arduino Uno WiFi 1ª geração (ATmega328P)
// #include <WiFiNINA.h>   // Arduino Uno WiFi Rev2
// #include <WiFiS3.h>     // Arduino Uno R4 WiFi

#include "config.h"

// ──────────────────────────────────────────────────────────
// Estado global
// ──────────────────────────────────────────────────────────
volatile uint16_t contadorPulsos = 0;   // incrementado pela ISR de vazão

bool bombaLigada    = false;
float volumeTotal_L = 0.0f;             // litros acumulados na sessão

unsigned long tsUltimaLeitura = 0;
unsigned long tsUltimoPing    = 0;
unsigned long tsBombaLigou    = 0;

// ──────────────────────────────────────────────────────────
// ISR — Sensor de Vazão (INT0, pino D2)
// ──────────────────────────────────────────────────────────
void onPulsoVazao() {
    contadorPulsos++;
}

// ══════════════════════════════════════════════════════════
// FUNÇÕES — SENSORES E ATUADORES
// ══════════════════════════════════════════════════════════

/** Lê o ADC N vezes e retorna a média (reduz ruído elétrico) */
int lerAdcMedia(uint8_t pino, uint8_t n = 10) {
    long soma = 0;
    for (uint8_t i = 0; i < n; i++) {
        soma += analogRead(pino);
        delay(5);
    }
    return soma / n;
}

/** Converte valor ADC (0-1023) para porcentagem de umidade (0-100%) */
float adcParaUmidade(int adc) {
    // map() retorna long, cast para float antes de constrain
    float u = (float)(adc - UMIDADE_ADC_SECO)
            / (float)(UMIDADE_ADC_MOLHADO - UMIDADE_ADC_SECO)
            * 100.0f;
    return constrain(u, 0.0f, 100.0f);
}

/** Lê a umidade atual do solo em % */
float lerUmidade() {
    return adcParaUmidade(lerAdcMedia(PINO_UMIDADE_SOLO));
}

/**
 * Calcula a vazão em L/min a partir dos pulsos contados no intervalo.
 * Atualiza o volume acumulado total da sessão.
 *
 * @param pulsos  pulsos contados pela ISR no intervalo
 * @param dt_ms   duração do intervalo em milissegundos
 * @return        vazão em litros por minuto
 */
float calcularVazao(uint16_t pulsos, unsigned long dt_ms) {
    if (dt_ms == 0) return 0.0f;
    float hz      = (float)pulsos / (dt_ms / 1000.0f);  // pulsos/s
    float lpm     = hz / FATOR_VAZAO;                    // L/min
    volumeTotal_L += lpm * (dt_ms / 60000.0f);           // L acumulado
    return lpm;
}

/** Liga a bomba (relé ativo em LOW) */
void ligarBomba(const __FlashStringHelper* motivo) {
    if (!bombaLigada) {
        digitalWrite(PINO_RELE_BOMBA, LOW);
        bombaLigada  = true;
        tsBombaLigou = millis();
        Serial.print(F("[BOMBA] LIGADA — motivo: "));
        Serial.println(motivo);
    }
}

/** Desliga a bomba (relé inativo em HIGH) */
void desligarBomba(const __FlashStringHelper* motivo) {
    if (bombaLigada) {
        digitalWrite(PINO_RELE_BOMBA, HIGH);
        bombaLigada = false;
        Serial.print(F("[BOMBA] DESLIGADA — motivo: "));
        Serial.println(motivo);
    }
}

/** Pisca o LED onboard N vezes (feedback visual) */
void piscaLed(uint8_t vezes, uint16_t ms = 80) {
    for (uint8_t i = 0; i < vezes; i++) {
        digitalWrite(PINO_LED_STATUS, HIGH);
        delay(ms);
        digitalWrite(PINO_LED_STATUS, LOW);
        delay(ms);
    }
}

// ══════════════════════════════════════════════════════════
// FUNÇÕES — WI-FI
// ══════════════════════════════════════════════════════════

/** Conecta ao Wi-Fi e bloqueia até conseguir (ou timeout de 20s) */
bool conectarWifi() {
    Serial.print(F("[WiFi] Conectando a: "));
    Serial.println(F(WIFI_SSID));

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    uint8_t tentativas = 0;
    while (WiFi.status() != WL_CONNECTED && tentativas < 40) {
        delay(500);
        Serial.print('.');
        tentativas++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print(F("[WiFi] Conectado! IP: "));
        Serial.println(WiFi.localIP());
        piscaLed(3);
        return true;
    }

    Serial.println(F("[WiFi] FALHA na conexão."));
    return false;
}

/** Verifica a conexão e reconecta se necessário */
bool verificarWifi() {
    if (WiFi.status() == WL_CONNECTED) return true;
    Serial.println(F("[WiFi] Desconectado. Reconectando..."));
    return conectarWifi();
}

// ══════════════════════════════════════════════════════════
// FUNÇÕES — HTTP via WiFiClient
// ══════════════════════════════════════════════════════════

/**
 * Executa um HTTP POST para o backend.
 *
 * @param path      caminho da rota, ex.: "/api/leituras/esp32"
 * @param jsonBody  corpo JSON em texto puro
 * @param respBuf   buffer para armazenar a resposta recebida
 * @param respSize  tamanho máximo do buffer de resposta
 * @return          true se o servidor respondeu HTTP 200
 */
bool httpPost(const char* path,
              const char* jsonBody,
              char*       respBuf,
              uint16_t    respSize)
{
    if (!verificarWifi()) return false;

    WiFiClient client;

    // Abre conexão TCP com o backend
    if (!client.connect(BACKEND_HOST, BACKEND_PORT)) {
        Serial.println(F("[HTTP] Falha ao conectar ao servidor."));
        return false;
    }

    uint16_t bodyLen = strlen(jsonBody);

    // ── Envia a requisição HTTP/1.0 ───────────────────────
    // HTTP/1.0 não precisa de Transfer-Encoding chunked nem
    // de gerenciar Keep-Alive — ideal para microcontroladores.
    client.print(F("POST "));
    client.print(path);
    client.println(F(" HTTP/1.0"));

    client.print(F("Host: "));
    client.println(F(BACKEND_HOST));

    client.println(F("Content-Type: application/json"));

    client.print(F("x-device-id: "));
    client.println(F(DEVICE_ID));

    client.print(F("x-api-key: "));
    client.println(F(API_KEY));

    client.print(F("Content-Length: "));
    client.println(bodyLen);

    client.println();        // linha em branco = fim dos headers
    client.print(jsonBody);  // corpo da requisição

    // ── Aguarda resposta (timeout 5s) ─────────────────────
    unsigned long limite = millis() + 5000UL;
    while (!client.available() && millis() < limite) {
        delay(10);
    }

    // ── Lê a resposta no buffer ───────────────────────────
    memset(respBuf, 0, respSize);
    uint16_t idx = 0;
    while (client.available() && idx < respSize - 1) {
        respBuf[idx++] = client.read();
    }

    client.stop();

    // Verifica se o status foi 200
    bool ok = strstr(respBuf, "200") != nullptr;
    if (!ok) {
        Serial.print(F("[HTTP] Status inesperado. Resposta: "));
        Serial.println(respBuf);
    }
    return ok;
}

// ──────────────────────────────────────────────────────────
// Extrai o comando da resposta JSON de forma simples.
// Procura pelas strings "ligar" ou "desligar" no JSON.
// Retorna: 1 = ligar, -1 = desligar, 0 = sem comando
// ──────────────────────────────────────────────────────────
int8_t extrairComando(const char* resp) {
    if (strstr(resp, "\"ligar\"")    != nullptr) return  1;
    if (strstr(resp, "\"desligar\"") != nullptr) return -1;
    return 0;
}

// ══════════════════════════════════════════════════════════
// COMUNICAÇÃO COM O BACKEND
// ══════════════════════════════════════════════════════════

/**
 * Monta o JSON com as leituras do ciclo atual,
 * envia ao backend e retorna o comando recebido.
 */
int8_t enviarLeituras(float umidade, float vazao_lmin, uint16_t pulsos) {

    // Buffer JSON — cabe nos 2KB do ATmega328P com folga
    // Exemplo de payload: ~165 caracteres
    char json[200];
    snprintf(json, sizeof(json),
        "{"
          "\"device_id\":\"%s\","
          "\"planta_id\":\"%s\","
          "\"umidade\":%.1f,"
          "\"vazao_lmin\":%.3f,"
          "\"volume_litros\":%.4f,"
          "\"pulsos\":%u,"
          "\"bomba_ligada\":%s"
        "}",
        DEVICE_ID,
        PLANTA_ID,
        umidade,
        vazao_lmin,
        volumeTotal_L,
        (unsigned int)pulsos,
        bombaLigada ? "true" : "false"
    );

    // Buffer de resposta — suficiente para receber o JSON do servidor
    char respBuf[300];
    bool ok = httpPost("/api/leituras/esp32", json, respBuf, sizeof(respBuf));

    if (ok) {
        Serial.print(F("[OK] umidade="));
        Serial.print(umidade, 1);
        Serial.print(F("% | vazao="));
        Serial.print(vazao_lmin, 3);
        Serial.print(F(" L/min | vol="));
        Serial.print(volumeTotal_L, 4);
        Serial.println(F(" L"));
        piscaLed(1, 40);
        return extrairComando(respBuf);
    }

    piscaLed(4, 30);    // pisca rápido = falha de envio
    return 0;
}

/** Envia heartbeat de presença ao servidor */
void enviarPing() {
    char json[80];
    snprintf(json, sizeof(json),
        "{\"device_id\":\"%s\",\"planta_id\":\"%s\"}",
        DEVICE_ID, PLANTA_ID
    );
    char respBuf[64];
    if (httpPost("/api/dispositivos/ping", json, respBuf, sizeof(respBuf))) {
        Serial.println(F("[Ping] OK"));
    }
}

// ══════════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════════
void setup() {
    Serial.begin(115200);
    while (!Serial);   // aguarda abertura do Monitor Serial (opcional)

    Serial.println(F("\n================================"));
    Serial.println(F("  SEMEANDO VIDAS — Arduino WiFi  "));
    Serial.println(F("================================\n"));

    // ── Configura pinos ───────────────────────────────────
    pinMode(PINO_RELE_BOMBA,   OUTPUT);
    pinMode(PINO_LED_STATUS,   OUTPUT);
    pinMode(PINO_SENSOR_VAZAO, INPUT_PULLUP);

    // Garante bomba desligada na inicialização
    digitalWrite(PINO_RELE_BOMBA, HIGH);

    // ── Interrupção do sensor de vazão (INT0 = D2) ────────
    attachInterrupt(
        digitalPinToInterrupt(PINO_SENSOR_VAZAO),
        onPulsoVazao,
        RISING
    );

    // ── Leitura de calibração (ajuste SECO/MOLHADO) ───────
    Serial.println(F("--- Calibração do sensor de umidade ---"));
    int adcBruto = lerAdcMedia(PINO_UMIDADE_SOLO);
    Serial.print(F("ADC bruto agora: "));
    Serial.println(adcBruto);
    Serial.print(F("Umidade calculada: "));
    Serial.print(adcParaUmidade(adcBruto), 1);
    Serial.println(F("%"));
    Serial.println(F("  → No ar  : anote e coloque em UMIDADE_ADC_SECO"));
    Serial.println(F("  → Na agua: anote e coloque em UMIDADE_ADC_MOLHADO\n"));

    // ── Conecta ao Wi-Fi ──────────────────────────────────
    if (!conectarWifi()) {
        Serial.println(F("Continuando sem WiFi (modo offline)..."));
    } else {
        enviarPing();
    }

    tsUltimaLeitura = millis();
    tsUltimoPing    = millis();

    Serial.println(F("\n[Sistema] Pronto! Monitorando...\n"));
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

    // ── Ciclo de leitura e envio ───────────────────────────
    if (agora - tsUltimaLeitura >= INTERVALO_LEITURA_MS) {
        unsigned long dt = agora - tsUltimaLeitura;
        tsUltimaLeitura  = agora;

        // Captura pulsos atomicamente (para ISR momentaneamente)
        noInterrupts();
        uint16_t pulsos = contadorPulsos;
        contadorPulsos  = 0;
        interrupts();

        // ── Lê os sensores ─────────────────────────────────
        float umidade    = lerUmidade();
        float vazao_lmin = calcularVazao(pulsos, dt);
        int   adcBruto   = lerAdcMedia(PINO_UMIDADE_SOLO);

        // ── Log no Monitor Serial ──────────────────────────
        Serial.println(F("----------------------------------"));
        Serial.print(F("Umidade   : "));
        Serial.print(umidade, 1);
        Serial.print(F("% (ADC="));
        Serial.print(adcBruto);
        Serial.println(')');
        Serial.print(F("Vazao     : "));
        Serial.print(vazao_lmin, 3);
        Serial.println(F(" L/min"));
        Serial.print(F("Vol total : "));
        Serial.print(volumeTotal_L, 4);
        Serial.println(F(" L"));
        Serial.print(F("Bomba     : "));
        Serial.println(bombaLigada ? F("LIGADA") : F("desligada"));

        // ── Envia dados e verifica comando remoto ──────────
        int8_t cmd = 0;
        if (WiFi.status() == WL_CONNECTED) {
            cmd = enviarLeituras(umidade, vazao_lmin, pulsos);
        } else {
            Serial.println(F("[WiFi] Offline — tentando reconectar..."));
            conectarWifi();
        }

        // Executa comando recebido do dashboard
        if      (cmd ==  1) ligarBomba(F("remoto"));
        else if (cmd == -1) desligarBomba(F("remoto"));

        // ── Irrigação automática (sem comando externo) ─────
        if (cmd == 0) {
            if (!bombaLigada && umidade < UMIDADE_MINIMA_DEFAULT) {
                Serial.print(F("[Auto] Umidade baixa ("));
                Serial.print(umidade, 1);
                Serial.print(F("% < "));
                Serial.print(UMIDADE_MINIMA_DEFAULT);
                Serial.println(F("%) → Ligando bomba..."));
                ligarBomba(F("auto"));

            } else if (bombaLigada && umidade >= UMIDADE_MAXIMA_DEFAULT) {
                Serial.print(F("[Auto] Umidade OK ("));
                Serial.print(umidade, 1);
                Serial.print(F("% >= "));
                Serial.print(UMIDADE_MAXIMA_DEFAULT);
                Serial.println(F("%) → Desligando bomba."));
                desligarBomba(F("auto"));
            }
        }

        // LED de alerta: 2 piscadas quando umidade crítica
        if (umidade < UMIDADE_MINIMA_DEFAULT && !bombaLigada) {
            piscaLed(2);
        }
    }

    // ── Segurança: tempo máximo com bomba ligada ───────────
    if (bombaLigada &&
        (millis() - tsBombaLigou) >= DURACAO_MAX_BOMBA_MS)
    {
        Serial.println(F("[Segurança] Timeout de irrigação. Desligando bomba."));
        desligarBomba(F("timeout"));
    }

    delay(50);
}
