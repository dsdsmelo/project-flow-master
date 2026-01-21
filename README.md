# Tarefaa - Sistema de Gerenciamento de Projetos

Sistema SaaS de gerenciamento de projetos desenvolvido para equipes de TI e infraestrutura.

## Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Pagamentos:** Stripe

## Desenvolvimento Local

### Pré-requisitos

- Node.js 18+ ([instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm ou pnpm

### Instalação

```sh
# Clone o repositório
git clone <YOUR_GIT_URL>

# Entre no diretório do projeto
cd tarefaa

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

O servidor estará disponível em `http://localhost:8080`

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run preview` | Visualiza o build de produção |
| `npm run lint` | Executa o linter |
| `npm run test` | Executa os testes |

## Estrutura do Projeto

```
├── src/
│   ├── components/     # Componentes React
│   ├── contexts/       # Contextos (Auth, Data)
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilitários e tipos
│   ├── pages/          # Páginas da aplicação
│   └── integrations/   # Integrações (Supabase)
├── supabase/
│   └── functions/      # Edge Functions
└── docs/               # Documentação
```

## Deploy

Consulte [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para instruções de deploy em VPS.

## Licença

Proprietário - Todos os direitos reservados.
