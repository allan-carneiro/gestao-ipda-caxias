## 2026-06-15

### Migração do Cadastro de Membros para React Hook Form + Zod

**Objetivo**

Modernizar o formulário de cadastro de membros, reduzindo estados locais e centralizando validações utilizando React Hook Form e Zod.

**Escopo da migração**

Foram migrados para React Hook Form:

* Santa Ceia e Planilhas
* Identificação
* Contato
* Endereço
* Igreja
* Dados Pessoais
* Observações

**Melhorias realizadas**

* Integração do React Hook Form com Zod.
* Centralização das validações.
* Utilização de `form.watch()`.
* Utilização de `form.setValue()`.
* Utilização de `handleSubmit()`.
* Remoção gradual de estados locais redundantes.
* Remoção da função `syncLegacyFieldsToForm()`.

**Validação**

* Build executado com sucesso.
* Testes manuais realizados.
* Cadastro de membros validado.
* Upload de foto validado.
* Busca de CEP validada.
* Navegação após salvar validada.

**Commit**

`f0cfadf`

**Status**

✅ Concluído

## Refatoração Arquitetural

Removidos estados legados do hook useMembroFormData após conclusão da migração para React Hook Form + Zod.

Resultado:
- Redução significativa de código.
- Eliminação de estados duplicados.
- Simplificação da manutenção do formulário.
- Centralização da lógica de formulário no React Hook Form.

Commit:
07f2194

Status:
✅ Concluído

## 2026-06-15

### Correção de Bug - Contagem anual da Santa Ceia

**Problema**

Membros cadastrados após participarem de Santa Ceias anteriores não apareciam corretamente na contagem anual de participantes exibida no Dashboard.

**Correção**

A lógica do Dashboard passou a considerar o histórico anual completo de participação na Santa Ceia.

**Resultado**

A contagem anual passou a refletir corretamente todos os participantes do ano.

**Status**

✅ Concluído

---

### Refatoração - Migração para React Hook Form + Zod

**Objetivo**

Centralizar o gerenciamento e validação do formulário de cadastro de membros.

**Escopo**

Migração dos blocos:

* Santa Ceia e Planilhas
* Identificação
* Contato
* Endereço
* Igreja
* Dados Pessoais
* Observações

**Resultado**

* Validação centralizada com Zod.
* Uso de React Hook Form.
* Redução de estados locais.
* Melhor manutenção do formulário.

**Status**

✅ Concluído

---

### Limpeza Arquitetural - useMembroFormData

**Problema**

O hook possuía diversos estados que já haviam sido migrados para React Hook Form.

**Correção**

Remoção dos estados legados e simplificação do hook.

**Resultado**

* Redução significativa de código.
* Eliminação de estados duplicados.
* Simplificação da manutenção.
* Hook passou a controlar apenas foto, anexos e upload.

**Commit**

07f2194

**Status**

✅ Concluído

## 2026-06-15

### Refatoração de Tipagem - Remoção de any[] dos Anexos

**Problema**

O sistema utilizava `any[]` para armazenar anexos de membros, reduzindo a capacidade do TypeScript de validar a estrutura dos dados e detectar erros durante o desenvolvimento.

**Correção**

Foi criado o tipo `MembroAnexo` para representar explicitamente a estrutura dos anexos:

```ts
type MembroAnexo = {
  nome: string;
  url: string;
};
```

Os estados, propriedades e operações relacionadas aos anexos passaram a utilizar tipagem forte.

**Resultado**

* Remoção de `any[]` dos anexos de membros.
* Maior segurança de tipos.
* Melhor suporte do TypeScript e IntelliSense.
* Menor risco de erros em tempo de execução.
* Código mais previsível e fácil de manter.

**Validação**

* Build executado com sucesso.
* Teste de upload de anexo realizado.
* Teste de remoção de anexo realizado.
* Teste de edição e salvamento realizado.
* Deploy realizado com sucesso na Vercel.

**Status**

✅ Concluído
