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
