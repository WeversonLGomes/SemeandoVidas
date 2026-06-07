# Deploy — Semeando Vidas IoT

Stack:
- **Backend** → [Railway](https://railway.app) (Node.js/Express)
- **Frontend** → [Vercel](https://vercel.com) (Next.js 14)
- **Banco** → Supabase (já está na nuvem ✅)
- **ESP32** → HTTPS após o deploy (firmware já atualizado)

---

## Pré-requisito: repositório no GitHub

O Railway e o Vercel fazem deploy direto do GitHub.

```bash
# Na pasta raiz do projeto (Semeandovidas/)
git init
git add .
git commit -m "feat: projeto Semeando Vidas IoT"

# Crie um repositório VAZIO no github.com e depois:
git remote add origin https://github.com/SEU_USUARIO/semeando-vidas.git
git push -u origin main
```

> ⚠️ Verifique que `.env` e `.env.local` NÃO aparecem no `git status` antes de fazer push.

---

## Passo 1 — Deploy do Backend no Railway

1. Acesse **https://railway.app** e faça login (pode usar a conta GitHub)

2. Clique em **New Project → Deploy from GitHub repo**

3. Selecione o repositório `semeando-vidas`

4. Na tela de configuração:
   - **Root Directory**: `backend`
   - Railway detecta automaticamente Node.js pelo `package.json`

5. Vá em **Variables** e adicione todas as variáveis de ambiente:

   | Variável | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://fpeoadzpwbknsasdsyrq.supabase.co` |
   | `SUPABASE_ANON_KEY` | (copie do `backend/.env`) |
   | `SUPABASE_SERVICE_ROLE` | (copie do `backend/.env`) |
   | `JWT_SECRET` | (copie do `backend/.env`) |
   | `ESP32_API_KEY` | `semeando_vidas_2024` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | deixe em branco por agora (preenche após Passo 2) |

6. Clique em **Deploy**

7. Após o deploy, vá em **Settings → Networking → Generate Domain**
   - Anote o domínio, ex: `semeando-vidas-backend.up.railway.app`

---

## Passo 2 — Deploy do Frontend no Vercel

1. Acesse **https://vercel.com** e faça login com GitHub

2. Clique em **Add New → Project**

3. Selecione o repositório `semeando-vidas`

4. Na tela de configuração:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js (detectado automaticamente)

5. Abra **Environment Variables** e adicione:

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://fpeoadzpwbknsasdsyrq.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (copie do `frontend/.env.local`) |
   | `NEXT_PUBLIC_API_URL` | `https://semeando-vidas-backend.up.railway.app` |

6. Clique em **Deploy**

7. Após o deploy, anote o domínio, ex: `semeando-vidas.vercel.app`

---

## Passo 3 — Atualizar CORS no Railway

Agora que você tem o domínio do Vercel, volte ao Railway:

1. **Variables → CORS_ORIGIN** → `https://semeando-vidas.vercel.app`

2. O Railway faz redeploy automaticamente

---

## Passo 4 — Atualizar a Firmware da ESP32

Abra `firmware/esp32/semeando_vidas/config.h` e substitua o domínio Railway:

```cpp
#define BACKEND_HTTPS                                        // mantém HTTPS
#define BACKEND_HOST "semeando-vidas-backend.up.railway.app" // ← seu domínio real
#define BACKEND_PORT 443
```

Recompile e grave na ESP32 pelo Arduino IDE.

---

## Verificação Final

| Teste | URL |
|---|---|
| Backend health | `https://seu-app.up.railway.app/health` |
| Dashboard | `https://semeando-vidas.vercel.app` |
| Monitor Serial | Deve aparecer `[OK] umidade=XX%` |

---

## Variáveis de ambiente — resumo completo

### Backend (Railway)
```
PORT=               (Railway define automaticamente — não adicione)
SUPABASE_URL=       https://fpeoadzpwbknsasdsyrq.supabase.co
SUPABASE_ANON_KEY=  eyJhbGci...
SUPABASE_SERVICE_ROLE= eyJhbGci...
JWT_SECRET=         0SV2TQ7i...
ESP32_API_KEY=      semeando_vidas_2024
NODE_ENV=           production
CORS_ORIGIN=        https://semeando-vidas.vercel.app
```

### Frontend (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=      https://fpeoadzpwbknsasdsyrq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY= eyJhbGci...
NEXT_PUBLIC_API_URL=           https://semeando-vidas-backend.up.railway.app
```
