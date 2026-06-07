# 🌱 Semeando Vidas — Sistema IoT de Irrigação Inteligente

Plataforma completa para monitoramento e automação de irrigação de plantas utilizando **Arduino Uno + ESP-01 (WiFi)**, sensores de umidade e vazão, com dashboard web em tempo real.

## Arquitetura

```
Arduino Uno + ESP-01 ──HTTP REST──► Backend (Node.js/Express) ──► Supabase (PostgreSQL)
                                                                         │
                                     Frontend (Next.js) ◄── Supabase Realtime
```

## Estrutura de Pastas

```
semeando-vidas/
├── firmware/                 # Código Arduino Uno + ESP-01
│   └── arduino_uno/
│       ├── semeando_vidas.ino
│       ├── config.h
│       └── ESQUEMA_LIGACAO.md
├── backend/           # API Node.js + Express
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middleware/
│   ├── package.json
│   └── .env.example
├── frontend/          # Dashboard Next.js 14
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── .env.local.example
└── database/          # Scripts SQL Supabase
    ├── schema.sql
    ├── rls_policies.sql
    └── seed_data.sql
```

---

## Início Rápido

### 1. Banco de Dados (Supabase)

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. No **SQL Editor**, execute em ordem:
   - `database/schema.sql`
   - `database/rls_policies.sql`
   - `database/seed_data.sql` *(opcional — dados de exemplo)*
4. Anote a **URL do projeto** e as **chaves de API** em *Project Settings → API*

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edite o .env com suas credenciais do Supabase
npm install
npm run dev
```

O backend sobe na porta **3001** por padrão.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Edite o .env.local com suas credenciais
npm install
npm run dev
```

Acesse: **http://localhost:3000**

### 4. ESP32

1. Instale o [Arduino IDE](https://www.arduino.cc/en/software) com suporte ao ESP32
   - Arquivo → Preferências → URLs adicionais: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
2. Instale as bibliotecas: **ArduinoJson**, **HTTPClient** (nativa ESP32)
3. Abra `firmware/esp32/semeando_vidas.ino`
4. Edite `config.h` com SSID, senha Wi-Fi e URL do backend
5. Selecione a placa **ESP32 Dev Module** e compile/grave

---

## Mapeamento de Pinos — Arduino Uno

| Componente                 | Pino Arduino | Tipo         |
|----------------------------|-------------|--------------|
| Sensor Umidade do Solo     | A0          | Analógico    |
| Sensor de Vazão YF-S201    | D2 (INT0)   | Interrupção  |
| Módulo Relé (Bomba)        | D7          | Digital OUT  |
| LED de Status              | D13         | Digital OUT  |
| ESP-01 TX → Arduino RX     | D10         | SoftSerial   |
| ESP-01 RX ← Arduino TX     | D11 + divisor | SoftSerial |

> ⚠️ Use **divisor de tensão** (1kΩ + 2kΩ) entre D11 e o RX do ESP-01 (5V→3.3V).  
> Veja o esquema completo em `firmware/arduino_uno/ESQUEMA_LIGACAO.md`

---

## Variáveis de Ambiente

### Backend — `backend/.env`

```env
PORT=3001

SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

JWT_SECRET=sua_chave_jwt_super_secreta
CORS_ORIGIN=http://localhost:3000
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Funcionalidades

- **Monitoramento em tempo real** via Supabase Realtime
- **Irrigação automática** quando umidade cai abaixo do limiar configurado
- **Controle manual** da bomba via dashboard
- **Seleção de planta** — suporte a múltiplas plantas/sensores
- **Gráficos históricos** de umidade e vazão de água
- **Alertas visuais** por faixa de umidade
- **Autenticação** com Supabase Auth
- **CRUD de plantas** com configurações individuais

---

## Deploy

### Backend (Railway / Render)

```bash
cd backend
# Configure as variáveis de ambiente na plataforma escolhida
npm start
```

### Frontend (Vercel)

```bash
cd frontend
npx vercel
# Configure as variáveis NEXT_PUBLIC_* no painel da Vercel
```

---

## Licença

MIT — Livre para uso educacional e pessoal.
