# Como testar sem hardware físico

Existem **2 formas** de testar o firmware sem ter a ESP32 na mão:

---

## Opção 1 — Modo Simulação (mais rápido)

Ativa dados falsos diretamente no código. Funciona com qualquer ESP32,
ou mesmo sem ela — basta ter o backend rodando.

### Como ativar

Em `config.h`, descomente a linha:

```cpp
#define MODO_SIMULACAO
```

### O que acontece com o modo ativo

| Função | Comportamento |
|---|---|
| `lerUmidade()` | Gera oscilação entre 20% e 85%, caindo devagar |
| `calcularVazao()` | Retorna 1.2–1.6 L/min quando a bomba está ligada |
| `ligarBomba()` | Muda o estado no código (sem acionar GPIO) |
| Envio HTTP | **Real** — dados chegam no dashboard normalmente |
| WiFi | **Real** — conecta à sua rede |

### O que você consegue testar

- ✅ Autenticação e envio de dados ao Supabase
- ✅ Gráficos atualizando no dashboard em tempo real
- ✅ Irrigação automática (quando umidade simulada cai abaixo do mínimo)
- ✅ Controle manual da bomba pelo dashboard
- ✅ Histórico de irrigações sendo registrado
- ✅ Indicador "dispositivo online"

### Como rodar

```
1. Instale as bibliotecas: ArduinoJson (Library Manager)
2. Descomente #define MODO_SIMULACAO em config.h
3. Preencha WIFI_SSID, WIFI_PASSWORD, BACKEND_HOST e PLANTA_ID
4. Compile e grave na ESP32 (pode ser qualquer ESP32, sem sensores)
5. Abra o Monitor Serial (115200) para ver os logs
```

---

## Opção 2 — Wokwi (simulador online)

Simula a ESP32 **e** o circuito no navegador, sem gravar nada em hardware.

### Acesso

🔗 **https://wokwi.com**

### Passo a passo

**1. Criar novo projeto**
- Acesse wokwi.com → **New Project** → **ESP32**

**2. Carregar os arquivos**
- Substitua o conteúdo de `sketch.ino` pelo conteúdo de `semeando_vidas.ino`
- Clique em **"+"** para adicionar novo arquivo → nomeie `config.h` → cole o conteúdo
- Em `config.h`, ative `#define MODO_SIMULACAO` (WiFi do Wokwi é limitado)

**3. Carregar o circuito**
- Clique na aba **diagram.json**
- Substitua pelo conteúdo do arquivo `diagram.json` deste projeto

**4. O circuito simulado contém:**

```
┌─ Potenciômetro ──► GPIO 34  (gira para mudar a umidade)
├─ Botão          ──► GPIO 27  (clica para simular pulso de vazão)
├─ LED azul       ──► GPIO 26  (acende quando a bomba liga)
└─ LED verde      ──► GPIO  2  (status / piscadas de confirmação)
```

**5. Instalar biblioteca no Wokwi**
- Clique no ícone de biblioteca (livro) → pesquise **ArduinoJson** → instalar

**6. Rodar**
- Clique em ▶ **Play**
- Abra o **Serial Monitor** (ícone no canto inferior)
- Gire o potenciômetro para simular variação de umidade
- Veja o LED azul acender quando a umidade cair abaixo de 30%

### Limitações do Wokwi

| Item | Status |
|---|---|
| Sensores GPIO | ✅ Totalmente simulado |
| Monitor Serial | ✅ Funciona |
| WiFi real | ⚠️ Limitado (não alcança localhost) |
| Envio ao backend | ❌ Não funciona sem o plano pago |

> 💡 Para testar a integração completa com o backend, use a **Opção 1**  
> com `MODO_SIMULACAO` em uma ESP32 real (sem precisar dos sensores).

---

## Resumo: qual opção escolher?

| Objetivo | Opção |
|---|---|
| Testar o circuito e os GPIOs | Wokwi |
| Testar a integração com o backend e dashboard | Modo Simulação |
| Testar tudo junto (completo) | Hardware físico |
