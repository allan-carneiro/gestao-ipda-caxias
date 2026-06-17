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

## 2026-06-15

### Melhoria de Tipagem - Upload Cloudinary

**Problema**

O fluxo de upload de fotos e anexos utilizava conversões com `any` para acessar propriedades retornadas pela API do Cloudinary.

Exemplos:

```ts
(result as any)?.secure_url
(result as any)?.url
```

Essa abordagem reduzia a segurança de tipos fornecida pelo TypeScript e dificultava a manutenção do código.

**Correção**

Foi adotado o tipo `CloudinaryUploadResult` como retorno padrão da função de upload.

O código passou a utilizar diretamente:

```ts
result.url
```

eliminando a necessidade de conversões para `any`.

**Resultado**

* Redução do uso de `any`.
* Maior segurança de tipos.
* Melhor suporte do TypeScript e IntelliSense.
* Código mais simples e legível.
* Menor risco de erros em tempo de execução.

**Validação**

* Build executado com sucesso.
* Teste de upload de foto realizado.
* Teste de upload de anexo realizado.
* Teste de edição de membro realizado.
* Deploy realizado com sucesso na Vercel.

**Status**

✅ Concluído

## 2026-06-15

### Melhoria de Tipagem - Rotas Next.js

**Problema**

A página de edição de membros utilizava conversão para `any` ao acessar parâmetros da rota do Next.js.

Exemplo:

```ts
const id = String((params as any)?.id || "");
```

Essa abordagem reduzia a segurança de tipos e impedia o TypeScript de validar corretamente a estrutura dos parâmetros recebidos pela rota.

**Correção**

Foi adotada tipagem explícita para o hook `useParams`.

Antes:

```ts
const params = useParams();
const id = String((params as any)?.id || "");
```

Depois:

```ts
const params = useParams<{ id: string }>();
const id = params.id;
```

**Resultado**

* Remoção de uso desnecessário de `any`.
* Melhor integração com o sistema de tipos do TypeScript.
* Maior segurança na leitura de parâmetros de rota.
* Melhor suporte de IntelliSense.
* Código mais simples e legível.

**Validação**

* Build executado com sucesso.
* Teste de abertura da página de edição realizado.
* Teste de salvamento de membro realizado.
* Deploy realizado com sucesso.

**Status**

✅ Concluído

## 2026-06-15

### Melhoria de Tipagem - Camada de Serviços Firestore

**Problema**

Os serviços responsáveis por criar e atualizar membros utilizavam conversões para `any` ao enviar dados para o Firestore.

Exemplos:

```ts
payload as any
```

Essa abordagem reduzia a proteção oferecida pelo TypeScript e permitia que estruturas inválidas fossem enviadas sem validação adequada.

**Correção**

Foi removido o uso de `any` nos serviços:

* `src/features/membros/services/createMembro.ts`
* `src/features/membros/services/updateMembro.ts`

Os objetos passaram a ser enviados diretamente utilizando os tipos já definidos pela aplicação.

Antes:

```ts
await addDoc(collection(db, paths.membros), payload as any);
```

```ts
await updateDoc(doc(db, paths.membros, id), payload as any);
```

Depois:

```ts
await addDoc(collection(db, paths.membros), payload);
```

```ts
await updateDoc(doc(db, paths.membros, id), payload);
```

**Resultado**

* Remoção de conversões desnecessárias para `any`.
* Maior segurança de tipos na camada de persistência.
* Melhor integração entre TypeScript e Firestore.
* Redução de riscos de envio de dados incompatíveis.
* Código mais limpo e mais fácil de manter.

**Validação**

* Build executado com sucesso.
* Fluxo de cadastro de membros validado.
* Fluxo de edição de membros validado.
* Projeto compilado sem erros de TypeScript.

**Status**

✅ Concluído
