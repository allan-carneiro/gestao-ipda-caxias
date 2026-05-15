import type { Membro } from "../types";

export function buildMembroAuditSnapshot(payload: Partial<Membro>) {
  return {
    nomeCompleto: payload.nomeCompleto ?? null,
    status: payload.status ?? null,
    cpf: payload.cpf ?? null,
    telefoneCelular: payload.telefoneCelular ?? null,
    email: payload.email ?? null,
    dataNascimento: payload.dataNascimento ?? null,
    congregacao: payload.congregacao ?? null,
    pastor: payload.pastor ?? null,
    campo: payload.campo ?? null,
    cargoEclesiastico: payload.cargoEclesiastico ?? null,
    numeroRol: payload.numeroRol ?? null,
    telCarta: payload.telCarta ?? null,
    fotoUrl: payload.fotoUrl ?? null,
    endereco: payload.endereco ?? null,
    updatedAt: payload.updatedAt ?? null,
    createdAt: payload.createdAt ?? null,
  };
}