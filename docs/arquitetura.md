# Arquitetura do Sistema — Semeando Vidas

## Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                         HARDWARE                            │
│                                                             │
│   [Sensor Umidade]──ADC34──┐                                │
│   [Sensor Vazão]──INT27────┤──[ESP32]──Wi-Fi──► Backend     │
│   [Relé/Bomba]──GPIO26─────┘                    Node.js     │
└─────────────────────────────────────────────────────────────┘
                                                     │
                                              HTTP REST API
                                                     │
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND                               │
│                                                             │
│   POST /api/leituras/esp32   ◄── ESP32 envia dados          │
│   GET  /api/bomba/pendente   ◄── ESP32 busca comandos       │
│   POST /api/bomba/comando    ◄── Dashboard envia comandos   │
│   GET  /api/plantas/dashboard◄── Frontend consulta          │
│                                                             │
│   [Express + Node.js]  →  [Supabase Admin Client]           │
└─────────────────────────────────────────────────────────────┘
                                │
                         Supabase SDK
                                │
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE                                │
│                                                             │
│   PostgreSQL:                                               │
│   ├── profiles                                              │
│   ├── plantas                                               │
│   ├── sensores                                              │
│   ├── leituras_umidade   ◄── Realtime habilitado            │
│   ├── leituras_vazao     ◄── Realtime habilitado            │
│   ├── irrigacoes         ◄── Realtime habilitado            │
│   ├── comandos_bomba     ◄── Realtime habilitado            │
│   └── dispositivos       ◄── Realtime habilitado            │
│                                                             │
│   Auth: JWT (email/password)                                │
│   RLS: Usuário acessa apenas suas próprias plantas          │
│   Storage: Fotos de plantas                                 │
└─────────────────────────────────────────────────────────────┘
                                │
                    Supabase Realtime + REST
                                │
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                               │
│                                                             │
│   Next.js 14 (App Router)                                   │
│                                                             │
│   /login        → Autenticação (Supabase Auth)              │
│   /dashboard    → Monitoramento em tempo real               │
│   /plantas      → CRUD de plantas                           │
│                                                             │
│   Realtime: WebSocket → leituras_umidade, irrigacoes        │
│   Poll fallback: a cada 30s                                 │
└─────────────────────────────────────────────────────────────┘
```

## Fluxo de Dados — Leitura Normal

```
ESP32 (a cada 30s)
  │
  ├─ Lê ADC → converte para % umidade
  ├─ Conta pulsos → calcula L/min
  ├─ POST /api/leituras/esp32 { umidade, vazao, device_id, planta_id }
  │
Backend Node.js
  ├─ Insere leituras_umidade
  ├─ Insere leituras_vazao
  ├─ Atualiza sensores.ultimo_valor
  ├─ Verifica comandos_bomba pendentes
  └─ Responde: { ok, comando: null | { id, comando, duracao_s } }

Supabase Realtime
  └─ Publica INSERT em leituras_umidade
        │
        └─► Frontend recebe via WebSocket → atualiza gráfico
```

## Fluxo — Controle Manual da Bomba

```
Usuário clica "Ligar"
  │
Frontend
  └─ POST /api/irrigacao/:plantaId/iniciar { tipo: "manual" }
        │
Backend
  ├─ Cria registro em irrigacoes (status: em_andamento)
  ├─ Cria comando em comandos_bomba (comando: ligar)
  └─ Responde: { id, status, ... }

Na próxima leitura (≤30s):
ESP32
  └─ Recebe comando na resposta do POST /leituras/esp32
        │
        ├─ Aciona relé → bomba liga
        ├─ PATCH /api/bomba/confirmar/:id (confirma execução)
        └─ Loop: desliga após DURACAO_IRRIGACAO_S
```

## Fluxo — Irrigação Automática (ESP32)

```
ESP32 detecta umidade < UMIDADE_MINIMA_DEFAULT
  │
  ├─ Liga relé localmente (sem depender do servidor)
  ├─ Inclui bomba_ligada=true e umidade_inicio no próximo POST
  │
Backend
  ├─ Cria irrigacao (tipo: automatica, status: em_andamento)
  └─ Realtime publica → Frontend mostra bomba ativa
```

## Modelo de Dados Simplificado

```
profiles (1) ─── (N) plantas
plantas  (1) ─── (N) sensores
plantas  (1) ─── (N) leituras_umidade
plantas  (1) ─── (N) leituras_vazao
plantas  (1) ─── (N) irrigacoes
plantas  (1) ─── (1) dispositivos
plantas  (1) ─── (N) comandos_bomba
```

## Segurança

| Camada      | Mecanismo                                      |
|-------------|------------------------------------------------|
| Supabase    | RLS — usuário acessa apenas suas plantas       |
| Backend API | JWT (Supabase token) para rotas do dashboard   |
| ESP32 → API | `x-device-id` + `x-api-key` header             |
| HTTPS       | Obrigatório em produção (Railway/Render + SSL) |
| Secrets     | Nunca expostos no frontend (NEXT_PUBLIC_*)     |
