# TAGNA Propostas — Setup

## Pré-requisitos
- Node.js 20+
- Docker + Docker Compose (para produção)
- PostgreSQL (para dev local)

---

## 1. Desenvolvimento Local

### Backend
```bash
cd backend
cp .env.example .env
# Edite o .env com DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev --name init
npx ts-node src/prisma/seed.ts
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:5173
Login padrão: `admin@tagna.com.br` / `admin123`

---

## 2. Templates de Proposta

Copie os templates Word para a pasta:
```
backend/templates/Template Proposta Comercial.docx
backend/templates/Template Proposta Técnica.docx
```

---

## 3. HubSpot — Configuração

1. No HubSpot, crie um **Private App** com permissões:
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`

2. Crie as propriedades customizadas na deal:
   | Nome interno | Tipo |
   |---|---|
   | `tagna_custo_hh_dev` | Número |
   | `tagna_custo_hh_campo` | Número |
   | `tagna_custo_terceiros` | Número |
   | `tagna_custo_viagens` | Número |
   | `tagna_receita_bruta` | Número |
   | `tagna_margem_bruta_pct` | Número |

3. Cole o token no `.env` → `HUBSPOT_API_KEY`

---

## 4. Deploy com Docker

```bash
cp .env.example .env
# Edite o .env com valores de produção

# Coloque os templates em:
mkdir -p templates
cp "Template Proposta Comercial.docx" templates/
cp "Template Proposta Técnica.docx" templates/

docker compose up -d --build
```

A aplicação ficará disponível na porta 80.

---

## 5. Níveis de Permissão

| Perfil | Criar Projeto | Preencher Escopo/HH | Gerar Proposta | Sync HubSpot | Ver DRE | Usuários | Auditoria |
|---|---|---|---|---|---|---|---|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| sales_engineer | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| commercial | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| field_team | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| finance | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| viewer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
