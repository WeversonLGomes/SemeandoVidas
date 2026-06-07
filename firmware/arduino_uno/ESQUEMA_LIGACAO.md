# Esquema de Ligação — Arduino Uno WiFi (ATmega328P)

> O WiFi é nativo da placa — sem módulo externo, sem fiação extra para WiFi!

## Diagrama de Conexões

```
                ┌─────────────────────────────────────┐
                │       ARDUINO UNO WIFI              │
                │                                     │
[Sensor Umidade]│                                     │
    VCC ────────┤ 5V                                  │
    GND ────────┤ GND                                 │
    AO  ────────┤ A0  (analógico)                     │
                │                                     │
[Sensor Vazão]  │                                     │
    Vermelho ───┤ 5V                                  │
    Preto ──────┤ GND                                 │
    Amarelo ────┤ D2  (interrupção INT0)              │
                │                                     │
[Relé]          │                                     │
    VCC ────────┤ 5V                                  │
    GND ────────┤ GND                                 │
    IN  ────────┤ D7  (digital OUT — LOW = ativa)     │
                │                                     │
[LED onboard] ──┤ D13 (já integrado na placa)         │
                │                                     │
                │  [WiFi integrado — sem fiação!]     │
                └─────────────────────────────────────┘
                                │
                          [Relé COM/NO]
                                │
         ┌──────────────────────┘
         │    Fonte externa 5V
         │         │
    [+] Bomba    [+] Relé COM
    [-] Bomba────[GND Fonte]
```

## Sensor de Umidade do Solo

| Pino sensor   | Pino Arduino |
|---------------|-------------|
| VCC (+)       | 5V          |
| GND (-)       | GND         |
| AO (analógico)| A0          |
| DO (digital)  | não usado   |

> Use o pino **AO** (analógico), não o DO (digital).  
> O valor analógico permite medir % de umidade com precisão.

## Sensor de Vazão YF-S201

| Fio         | Pino Arduino |
|-------------|-------------|
| Vermelho (+)| 5V          |
| Preto (-)   | GND         |
| Amarelo (S) | D2          |

> D2 é o único pino com interrupção INT0 no Arduino Uno.  
> O `INPUT_PULLUP` interno já é configurado no código.

## Módulo Relé 1 Canal

| Pino relé | Conecta em             |
|-----------|------------------------|
| VCC       | 5V (Arduino)           |
| GND       | GND                    |
| IN        | D7 (Arduino)           |
| COM       | (+) da fonte externa   |
| NO        | (+) da bomba           |

> **NO** = Normalmente Aberto.  
> Quando o relé aciona (LOW em D7), o circuito fecha e a bomba liga.

## Mini Bomba Submersa 5V

| Fio bomba | Conecta em              |
|-----------|------------------------|
| (+)       | NO do relé             |
| (-)       | GND da fonte externa   |

> ⚠️ Alimente a bomba pela fonte externa (módulo de alimentação da protoboard).  
> Nunca conecte a bomba diretamente nos pinos do Arduino.

## Módulo de Alimentação (Protoboard)

```
Entrada: Fonte 12V (P4) → Módulo de alimentação
Saída:   Trilho 5V da protoboard → Arduino Uno + Relé + Sensores + Bomba
```

Configure o jumper do módulo para saída **5V**.

## Biblioteca WiFi — qual usar?

| Modelo da placa               | Biblioteca      | Como instalar                          |
|-------------------------------|-----------------|----------------------------------------|
| Arduino Uno WiFi (1ª geração) | `WiFi.h`        | Incluída no Arduino AVR Boards         |
| Arduino Uno WiFi Rev2         | `WiFiNINA.h`    | Sketch → Incluir Biblioteca → WiFiNINA |
| Arduino Uno R4 WiFi           | `WiFiS3.h`      | Incluída no Arduino UNO R4 Boards      |

No arquivo `semeando_vidas.ino`, descomente apenas o `#include` correspondente ao seu modelo:

```cpp
#include <WiFi.h>       // ← Arduino Uno WiFi 1ª geração
// #include <WiFiNINA.h>   // ← Arduino Uno WiFi Rev2
// #include <WiFiS3.h>     // ← Arduino Uno R4 WiFi
```
