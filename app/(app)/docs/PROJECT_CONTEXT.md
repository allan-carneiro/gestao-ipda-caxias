# CONTEXTO PERMANENTE DO PROJETO — GESTÃO IPDA CAXIAS

## 📌 VISÃO GERAL

Sistema web SaaS de gestão administrativa da igreja IPDA — Caxias.
Projeto próprio, escalável e profissional, com arquitetura preparada para crescimento multi-igrejas futuramente.

---

# 🧱 STACK TECNOLÓGICA

* Next.js (App Router)
* TypeScript
* Firebase Auth
* Firestore Database
* Firebase Admin (roles)
* TailwindCSS
* Cloudinary (upload imagens)
* ExcelJS (exportações XLSX)

---

# 🔐 SEGURANÇA

Sistema possui autenticação e autorização completas.

### Roles implementadas

* admin
* secretaria
* lider
* consulta

### Regras

* acesso público bloqueado
* leitura restrita por role
* escrita restrita por nível
* Firestore Rules já estáveis e seguras

⚠️ Nunca recriar rules do zero — apenas ajustar incrementalmente.

---

# 🗂️ ESTRUTURA REAL DO BANCO

## coleção membros

```
membros/{id}
```

---

## Santa Ceia — Controle mensal

```
ceia_controle/{YYYY-MM}/participantes/{membroId}
```

Campos:

```
nome
presente
updatedAt
```

---

## Santa Ceia — Registro histórico

```
ceia_registros/{YYYY-MM-membroId}
```

Campos:

```
ano
mes
membroId
nome
createdAt
```

---

# ✅ FUNCIONALIDADES IMPLEMENTADAS

✔ Login seguro
✔ Roles e permissões
✔ CRUD completo de membros
✔ Upload de foto Cloudinary
✔ Controle de presença Ceia
✔ Registro histórico Ceia
✔ Finalizar mês
✔ Desmarcar todos
✔ Exportação Excel profissional
✔ Dashboard com estatísticas reais
✔ Integração opcional Google Sheets
✔ Sistema responsivo
✔ Arquitetura limpa e escalável

---

# 📊 DASHBOARD ATUAL

Cards mostrando:

* total membros
* ativos
* inativos
* presentes mês
* participações ano

Dados carregados diretamente do Firestore.

Arquivo responsável:

```
src/lib/dashboard.ts
```

---

# 🎯 PRÓXIMA FEATURE A IMPLEMENTAR

Transformar cards de estatística em elementos clicáveis que exibem listas detalhadas.

### Comportamento esperado

Card → abre modal → lista nomes

Listas:

Membros → lista membros
Ceia mês → presentes mês
Ceia ano → participantes ano

---

# ❓ DECISÃO PENDENTE

Card **Membros** deve mostrar:

* apenas ativos
  OU
* ativos + inativos com abas

Perguntar antes de implementar.

---

# 📐 PADRÕES DE DESENVOLVIMENTO

Regras obrigatórias para qualquer alteração futura:

* não alterar estrutura do banco sem necessidade
* não renomear collections existentes
* não remover tipagem
* não usar any sem motivo
* manter arquitetura modular
* manter funções desacopladas
* evitar lógica pesada no client
* priorizar performance Firestore

---

# 🚀 ROADMAP FUTURO

Ordem planejada de evolução:

1. Modal clicável nos cards
2. Gráficos estatísticos
3. Painel admin de usuários
4. Logs de ações
5. Backup automático
6. Exportação PDF oficial
7. Sistema multi-igrejas

---

# 🧠 DECISÃO DE ARQUITETURA GLOBAL

Firestore é a fonte oficial de dados.
Sheets são apenas espelho/exportação.

---

# 🛠️ CONVENÇÕES DO PROJETO

### Nomes de collections

snake_case

### IDs

string custom quando necessário

### Datas

sempre timestamp Firestore

### Arquivos lib/

Funções puras sem JSX.

---

# ⚠️ IMPORTANTE PARA QUALQUER IA OU DEV QUE CONTINUAR

Não reiniciar projeto.
Não simplificar estrutura.
Não trocar stack.
Não remover segurança.

Continuar evolução incremental mantendo padrão atual.

---

# 📍 ESTADO ATUAL

Sistema está:

✔ estável
✔ seguro
✔ funcional
✔ pronto para expansão

Próxima tarefa: implementar modais clicáveis no dashboard.

---

FIM DO CONTEXTO
