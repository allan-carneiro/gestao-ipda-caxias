import { z } from "zod";

export const membroSchema = z.object({
  nomeCompleto: z.string().trim().min(1, "Informe o nome completo."),
  dataNascimento: z.string().min(1, "Informe a data de nascimento."),

  cpf: z.string().min(1, "Informe o CPF."),
  telefoneCelular: z.string().min(1, "Informe o telefone celular."),

  logradouro: z.string().trim().min(1, "Informe o logradouro."),
  numero: z.string().trim().min(1, "Informe o número."),
  bairro: z.string().trim().min(1, "Informe o bairro."),
  cidade: z.string().trim().min(1, "Informe a cidade."),
  uf: z.string().trim().min(1, "Informe a UF."),

  status: z.string().min(1, "Selecione a situação (status)."),
});

export type MembroFormData = z.infer<typeof membroSchema>;