# Histórico de Correções

## 2026-06-12

### Dashboard - Ceia (ano)

**Problema**

Membros cadastrados posteriormente e marcados retroativamente como participantes da Santa Ceia não apareciam na lista anual de participantes.

Exemplo identificado:

* Renata Cristina Quirino Gonçalves aparecia corretamente nos registros mensais.
* Não aparecia no modal "Ceia (ano) — Participantes em 2026".

**Causa**

A função `listarParticipantesCeiaAno()` consultava apenas a coleção de registros anuais (`ceiaRegistros`).

Membros que possuíam apenas registros mensais de presença não eram incluídos na lista anual.

**Correção**

A função `listarParticipantesCeiaAno()` foi alterada para:

1. Consultar os registros anuais existentes.
2. Consultar também as presenças mensais de janeiro a dezembro.
3. Unificar os participantes sem duplicação.
4. Montar a lista anual utilizando ambas as fontes de dados.

**Arquivos alterados**

* `src/lib/dashboard.ts`
* `app/(app)/dashboard/page.tsx`

**Validação**

* Build executado com sucesso (`npm run build`)
* Teste em localhost aprovado
* Deploy realizado na Vercel
* Participante validada após correção:

  * Renata Cristina Quirino Gonçalves

**Commit**

`20d60bb`

**Status**

✅ Resolvido
