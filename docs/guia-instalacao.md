# Guia Completo de Instalação — Semeando Vidas

## Pré-requisitos

- Node.js 18+ ([nodejs.org](https://nodejs.org))
- Arduino IDE 2.x ([arduino.cc](https://www.arduino.cc/en/software))
- Conta no Supabase ([supabase.com](https://supabase.com)) — plano gratuito é suficiente
- Git

---

## Passo 1 — Configurar o Supabase

### 1.1 Criar o projeto

1. Acesse [app.supabase.com](https://app.supabase.com) → **New Project**
2. Escolha um nome (ex.: `semeando-vidas`), senha do banco e região mais próxima
3. Aguarde o projeto ficar ativo (~2 minutos)

### 1.2 Executar os scripts SQL

Vá em **SQL Editor** (menu lateral) e execute os arquivos **na ordem abaixo**, um de cada vez:

```
1. database/schema.sql        → Cria tabelas, índices, triggers, views
2. database/rls_policies.sql  → Configura segurança por usuário
3. database/seed_data.sql     → (Opcional) Insere dados de exemplo
```

> Para `seed_data.sql`: primeiro crie uma conta pelo app (`/login`), depois substitua `SEU_USER_ID_AQUI` pelo UUID do seu usuário (visível em **Authentication → Users**).

### 1.3 Anotar as credenciais

Vá em **Project Settings → API** e copie:

- **Project URL** → `SUPABASE_URL`
- **anon (public)** → `SUPABASE_ANON_KEY`
- **service_role (secret)** → `SUPABASE_SERVICE_ROLE` ⚠️ nunca exponha no frontend

---

## Passo 2 — Configurar o Backend

```bash
cd backend

# Criar arquivo de configuração
cp .env.example .env
```

Edite `backend/.env`:

```env
PORT=3001
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE=eyJhbGci...
JWT_SECRET=qualquer_string_aleatoria_longa
CORS_ORIGIN=http://localhost:3000
ESP32_API_KEY=chave_secreta_do_esp32   # mesma que config.h do firmware
```

```bash
# Instalar dependências e iniciar
npm install
npm run dev
# → Servidor rodando em http://localhost:3001
# → Testar: http://localhost:3001/health
```

---

## Passo 3 — Configurar o Frontend

```bash
cd frontend

# Criar arquivo de configuração
cp .env.local.example .env.local
```

Edite `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```bash
npm install
npm run dev
# → Aplicação em http://localhost:3000
```

Acesse `http://localhost:3000` → clique em **Criar conta** → faça login.

---

## Passo 4 — Cadastrar uma Planta

1. Acesse `/plantas` no dashboard
2. Clique em **Nova Planta**
3. Preencha nome, espécie, e os limites de umidade
4. **Copie o ID da planta** (visível na URL ao editar ou no Supabase → Table Editor → plantas)

---

## Passo 5 — Configurar o Arduino Uno + ESP-01

### 5.1 Preparar o Arduino IDE

1. Instale o **Arduino IDE 2.x** em [arduino.cc](https://www.arduino.cc/en/software)
2. Nenhum pacote adicional de placa é necessário — Arduino Uno já vem instalado

### 5.2 Bibliotecas necessárias

Nenhuma biblioteca externa é necessária!  
`SoftwareSerial` já é nativa do Arduino IDE.

### 5.3 Configurar o baud rate do ESP-01

O ESP-01 sai de fábrica em **115200 baud**. Precisamos mudar para **9600** para funcionar com SoftwareSerial de forma confiável.

**Como fazer:**
1. Conecte o ESP-01 temporariamente a um **conversor USB-Serial** (CP2102 / CH340)
2. Abra o Monitor Serial em **115200 baud**
3. Envie o comando:
   ```
   AT+UART_DEF=9600,8,1,0,0
   ```
4. Resposta esperada: `OK`
5. Desconecte e reconecte em 9600 baud para confirmar: `AT` → `OK`

### 5.4 Montar o circuito

Consulte o arquivo detalhado: `firmware/arduino_uno/ESQUEMA_LIGACAO.md`

| Componente        | Pino Arduino | Observação                          |
|-------------------|-------------|--------------------------------------|
| Sensor umidade VCC| 5V          |                                      |
| Sensor umidade GND| GND         |                                      |
| Sensor umidade AO | A0          | Pino analógico                       |
| Vazão fio amarelo | D2          | Interrupção INT0                     |
| Vazão fio vermelho| 5V          |                                      |
| Vazão fio preto   | GND         |                                      |
| Relé IN           | D7          | LOW = liga relé                      |
| Relé VCC          | 5V          |                                      |
| Relé GND          | GND         |                                      |
| ESP-01 TX         | D10         | Direto (ESP-01 TX é saída 3.3V, OK)  |
| ESP-01 RX         | D11 + divisor | **Obrigatório: 1kΩ + 2kΩ (5V→3.3V)**|
| ESP-01 VCC        | Reg. 3.3V   | Não use o 3V3 do Arduino diretamente |
| ESP-01 GND        | GND         |                                      |
| ESP-01 CH_PD      | 3.3V        | Deve estar HIGH para o módulo ativar |
| Bomba (+)         | Relé NO     | Via relé                             |
| Bomba (-)         | Fonte GND   |                                      |

> ⚠️ Alimente a bomba via **Fonte 5V externa** (módulo de alimentação da protoboard).  
> Nunca ligue a bomba direto nos pinos do Arduino.

### 5.5 Editar config.h

Abra `firmware/arduino_uno/config.h` e preencha:

```cpp
#define WIFI_SSID        "NomeDaSuaRede"
#define WIFI_PASSWORD    "SuaSenhaWifi"

// SOMENTE host/IP, sem "http://"
#define BACKEND_HOST     "192.168.0.XXX"   // IP do PC com o backend
#define BACKEND_PORT     3001

#define API_KEY          "chave_secreta_do_esp32"  // mesmo do .env backend
#define DEVICE_ID        "ARD-UNO-001"
#define PLANTA_ID        "uuid-da-planta"          // copiado no passo 4
```

> Para descobrir o IP do seu computador: `ipconfig` (Windows)

### 5.6 Calibrar o sensor de umidade

1. Carregue o sketch no Arduino
2. Abra o **Monitor Serial (115200 baud)**
3. Na inicialização, o Arduino exibe:
   ```
   Leitura ADC do sensor de umidade (calibração):
     ADC bruto = 723
   ```
4. Anote o valor com o sensor **no ar** → `UMIDADE_ADC_SECO`
5. Coloque o sensor **em água** → anote → `UMIDADE_ADC_MOLHADO`
6. Atualize os valores em `config.h` e recarregue

### 5.7 Compilar e gravar

1. **Ferramentas → Placa → Arduino AVR Boards → Arduino Uno**
2. **Ferramentas → Porta** → selecione a porta COM do Arduino
3. **Sketch → Carregar** (Ctrl+U)
4. Abra o Monitor Serial (115200) para ver os logs em tempo real

---

## Passo 6 — Testar o sistema

### Verificar envio de dados

No Monitor Serial da ESP32, você verá:
```
🌱 Semeando Vidas — Iniciando...
✅ Wi-Fi conectado! IP: 192.168.0.XXX
📤 Dados enviados: umidade=62.3%  vazao=0.000L/min
```

### Verificar no dashboard

1. Acesse `http://localhost:3000/dashboard`
2. Selecione sua planta
3. Os valores devem aparecer em tempo real

### Testar a bomba

1. No dashboard, clique em **Ligar bomba**
2. A ESP32 receberá o comando na próxima leitura (≤30s)
3. O relé deve acionar e a bomba ligar

---

## Deploy em Produção

### Backend (Railway)

1. Crie conta em [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Configure as variáveis de ambiente no painel
4. Anote a URL gerada (ex.: `https://semeandovidas-backend.railway.app`)

### Frontend (Vercel)

1. Crie conta em [vercel.com](https://vercel.com)
2. **Add New Project → Import GitHub repo**
3. Configure as variáveis em **Settings → Environment Variables**
4. `NEXT_PUBLIC_API_URL` = URL do backend no Railway

### ESP32 em produção

Atualize `BACKEND_URL` em `config.h` para a URL pública do Railway:
```cpp
#define BACKEND_URL "https://semeandovidas-backend.railway.app"
```

---

## Solução de Problemas

| Problema                             | Solução                                                              |
|--------------------------------------|----------------------------------------------------------------------|
| ESP-01 não responde ao `AT`          | Verifique fiação D10/D11; confirme baud rate 9600; CH_PD em 3.3V    |
| Wi-Fi não conecta                    | SSID/senha corretos? Rede 2.4 GHz (ESP-01 não suporta 5 GHz)        |
| Monitor Serial não mostra nada       | Certifique que é 115200 baud no Serial (não o SoftwareSerial)        |
| Umidade sempre 0% ou 100%            | Recalibre UMIDADE_ADC_SECO e UMIDADE_ADC_MOLHADO em config.h         |
| Backend erro "Supabase URL"          | Verifique o `.env` e reinicie com `npm run dev`                      |
| Dashboard não atualiza               | Verifique se Realtime está habilitado no Supabase (rls_policies.sql) |
| Bomba não aciona                     | Verifique D7 → Relé IN; relé ativo em LOW; LED pisca 2x se crítico  |
| HTTP 401 no backend                  | Verifique `API_KEY` em config.h e `ESP32_API_KEY` no .env do backend|
| ESP-01 queimou                       | Faltou divisor de tensão D11→RX; troque o módulo                    |
| Envio OK mas dashboard não recebe    | Confirme BACKEND_HOST (IP, sem http://), BACKEND_PORT e PLANTA_ID   |
