import { z } from "zod";
import { onlyDigits } from "@/src/features/membros/utils/masks";
import { isValidCPF } from "@/src/features/membros/utils/memberHelpers";

export const novoMembroSchema = z.object({
  numeroRol: z.string().optional(),
  ipdaPastor: z.string().optional(),
  telCarta: z.string().optional(),

  nomeCompleto: z.string().min(1, "Informe o nome completo."),
  dataNascimento: z.string().min(1, "Informe a data de nascimento."),

  cpf: z
    .string()
    .min(1, "Informe o CPF.")
    .refine((value) => isValidCPF(onlyDigits(value)), "CPF inválido."),

  rg: z.string().optional(),

  estadoCivil: z.string(),
  nomeConjuge: z.string().optional(),

  telefoneCelular: z
    .string()
    .min(1, "Informe o telefone celular.")
    .refine(
      (value) => onlyDigits(value).length >= 10,
      "Telefone inválido."
    ),

  telefoneResidencial: z.string().optional(),
  email: z.string().optional(),

  logradouro: z.string().min(1, "Informe o logradouro."),
  numero: z.string().min(1, "Informe o número."),
  complemento: z.string().optional(),
  lote: z.string().optional(),
  quadra: z.string().optional(),
  bairro: z.string().min(1, "Informe o bairro."),
  cidade: z.string().min(1, "Informe a cidade."),
  uf: z.string().min(1, "Informe a UF."),
  cep: z.string().optional(),

  dataBatismo: z.string().optional(),
  campo: z.string(),
  congregacao: z.string().optional(),
  pastor: z.string().optional(),

  cargoEclesiastico: z.string().min(1, "Selecione o cargo eclesiástico."),

  naturalidade: z.string().optional(),
  escolaridade: z.string().optional(),
  profissao: z.string().optional(),
  filhosQtd: z.string().optional(),
  netosQtd: z.string().optional(),

  status: z.string().min(1, "Selecione a situação (status)."),
  observacoes: z.string().optional(),
});

export type NovoMembroFormData = z.infer<typeof novoMembroSchema>;