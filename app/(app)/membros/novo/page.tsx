"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, type FieldErrors as ReactHookFormFieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthGuard from "@/app/components/AuthGuard";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useToast } from "@/app/components/ToastProvider";
import { uploadImageToCloudinary } from "@/src/lib/cloudinary";
import { cleanMembroPayload } from "@/src/lib/validators";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";
import { getPaths } from "@/src/lib/demo/paths";
import { canEditMembers, isDemo } from "@/src/lib/auth/permissions";

import { useCep } from "@/src/features/membros/hooks/useCep";
import { useMembroForm } from "@/src/features/membros/hooks/useMembroForm";
import { useMembroFormData } from "@/src/features/membros/hooks/useMembroFormData";

import { buildMembroPayload } from "@/src/features/membros/utils/buildMembroPayload";
import { createMembro } from "@/src/features/membros/services/createMembro";
import {
  maskCEP,
  maskCPF,
  maskPhone,
  onlyDigits,
} from "@/src/features/membros/utils/masks";
import {
  calcularIdade,
  formatarIdade,
  isStatusValido,
  normalizeNomeCompleto,
} from "@/src/features/membros/utils/memberHelpers";

import { MembroIdentificacaoCard } from "@/src/features/membros/components/MembroIdentificacaoCard";
import { MembroContatoCard } from "@/src/features/membros/components/MembroContatoCard";
import { MembroEnderecoCard } from "@/src/features/membros/components/MembroEnderecoCard";
import { MembroDadosPessoaisCard } from "@/src/features/membros/components/MembroDadosPessoaisCard";
import { MembroObservacoesCard } from "@/src/features/membros/components/MembroObservacoesCard";
import { MembroFotoCadastroCard } from "@/src/features/membros/components/MembroFotoCadastroCard";
import {
  Card,
  Row,
  Field,
  inputClass,
  textareaClass,
} from "@/src/features/membros/components/FormLayout";

import {
  novoMembroSchema,
  type NovoMembroFormData,
} from "@/src/features/membros/schemas/novoMembroSchema";

import type { UserRole } from "@/src/types/auth";
import type { EstadoCivil, Status, TelCarta, Membro } from "@/src/features/membros/types";

type FieldErrors = Record<string, string>;

const IPDA_PASTOR_OPCOES = ["", "IPDA Caxias", "IPDA — Pastor"] as const;

const CARGOS = [
  "",
  "Membro",
  "Obreiro",
  "Diácono",
  "Presbítero",
  "Pastor",
  "Expansão",
  "Levita do Ministério de Louvor",
  "Instrumentista",
] as const;

export default function NovoMembroPage() {
  const router = useRouter();
  const toast = useToast();

  const form = useForm<NovoMembroFormData>({
    resolver: zodResolver(novoMembroSchema),
    defaultValues: {
      numeroRol: "",
      ipdaPastor: "",
      telCarta: "",

      nomeCompleto: "",
      dataNascimento: "",
      cpf: "",
      rg: "",

      estadoCivil: "Solteiro(a)",
      nomeConjuge: "",

      telefoneCelular: "",
      telefoneResidencial: "",
      email: "",

      logradouro: "",
      numero: "",
      complemento: "",
      lote: "",
      quadra: "",
      bairro: "",
      cidade: "",
      uf: "",
      cep: "",

      dataBatismo: "",
      campo: "Duque de Caxias",
      congregacao: "",
      pastor: "",
      cargoEclesiastico: "",

      naturalidade: "",
      escolaridade: "",
      profissao: "",
      filhosQtd: "",
      netosQtd: "",

      status: "Ativo",
      observacoes: "",
    },
  });

  const [loadingRole, setLoadingRole] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { erro, sucesso, showError, showSuccess, clearMessages } =
    useMembroForm();

  const {
    fotoUrl,
    setFotoUrl,
    anexos,
    uploadingFoto,
    setUploadingFoto,
  } = useMembroFormData();

  const paths = useMemo(() => getPaths(userRole ?? undefined), [userRole]);
  const demoMode = useMemo(() => isDemo(userRole ?? undefined), [userRole]);

  const allowCreateMembers = useMemo(
    () => canEditMembers(userRole ?? undefined) && !isDemo(userRole ?? undefined),
    [userRole]
  );

  const isBusy = saving || uploadingFoto || loadingRole;
  const formDisabled = isBusy || !allowCreateMembers;
  const formValues = form.watch();

  useEffect(() => {
    let active = true;

    async function loadRole() {
      try {
        setLoadingRole(true);

        const role = await getUserRoleFromToken();

        if (active) setUserRole(role);
      } catch (error) {
        console.error(error);

        if (active) setUserRole(null);
      } finally {
        if (active) setLoadingRole(false);
      }
    }

    void loadRole();

    return () => {
      active = false;
    };
  }, []);

  function setFormFieldValue(field: keyof NovoMembroFormData, value: string) {
    form.setValue(field, value as NovoMembroFormData[typeof field], {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  }

  function setFormStringValue(field: keyof NovoMembroFormData) {
    return (value: string | ((current: string) => string)) => {
      const currentValue = String(form.getValues(field) ?? "");

      const nextValue =
        typeof value === "function" ? value(currentValue) : value;

      setFormFieldValue(field, nextValue);
    };
  }

  function toastErro(e: unknown, fallback: string) {
    const msg =
      e &&
      typeof e === "object" &&
      "message" in e &&
      typeof e.message === "string" &&
      e.message.trim()
        ? e.message
        : typeof e === "string" && e.trim()
        ? e
        : fallback;

    const finalMsg = msg.startsWith("Erro:") ? msg : `Erro: ${msg}`;

    toast.error(finalMsg);
    showError(finalMsg);
  }

  function toastOk(msg: string) {
    toast.success(msg);
    showSuccess(msg);

    setTimeout(() => clearMessages(), 1200);
  }

  async function runAction(opts: {
    busySetter?: (v: boolean) => void;
    fn: () => Promise<void>;
    success?: string;
    errorFallback: string;
  }) {
    try {
      opts.busySetter?.(true);

      await opts.fn();

      if (opts.success) toastOk(opts.success);
    } catch (e: unknown) {
      console.error(e);
      toastErro(e, opts.errorFallback);
    } finally {
      opts.busySetter?.(false);
    }
  }

  const idade = useMemo(
    () => calcularIdade(formValues.dataNascimento ?? null),
    [formValues.dataNascimento]
  );

  const idadeTxt = useMemo(() => formatarIdade(idade), [idade]);

  function clearErrors() {
    clearMessages();
    setFieldErrors({});
  }

  function syncCepFormValue(
    field: "logradouro" | "bairro" | "cidade" | "uf",
    value: string
  ) {
    form.setValue(field, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  }

  const { buscarCepAuto, isFetchingCep } = useCep({
    setErro: (message) => {
      if (message) {
        showError(message);
      } else {
        clearMessages();
      }
    },
    toastErro,
    syncFormValue: syncCepFormValue,
  });

  

  function handleInvalid(errors: ReactHookFormFieldErrors<NovoMembroFormData>) {
    const nextErrors: FieldErrors = {};

    Object.entries(errors).forEach(([field, error]) => {
      if (typeof error?.message === "string") {
        nextErrors[field] = error.message;
      }
    });

    setFieldErrors(nextErrors);

    const msg = "Revise os campos destacados antes de salvar.";

    showError(msg);
    toast.error(msg);
  }

  async function handleUploadFoto(file: File) {
    if (!allowCreateMembers) {
      const msg = demoMode
        ? "Modo demonstração: upload de foto desabilitado para esta conta."
        : "Você não tem permissão para cadastrar membros.";

      showError(msg);
      toast.error(msg);

      return;
    }

    await runAction({
      busySetter: setUploadingFoto,
      fn: async () => {
        clearMessages();

        const result = await uploadImageToCloudinary(file);
        const url = result.url;

        if (!url) {
          throw new Error("Não foi possível obter a URL da foto após o upload.");
        }

        setFotoUrl(String(url).trim());
      },
      success: "Foto atualizada. Não esqueça de salvar.",
      errorFallback: "Erro ao enviar foto.",
    });
  }

  async function salvar(data: NovoMembroFormData) {
    if (saving) return;

    clearErrors();

    if (uploadingFoto) {
      const msg = "Aguarde terminar o envio da foto antes de salvar.";

      showError(msg);
      toast.error(msg);

      return;
    }

    if (loadingRole) {
      const msg = "Aguarde o carregamento das permissões do usuário.";

      showError(msg);
      toast.error(msg);

      return;
    }

    if (!allowCreateMembers) {
      const msg = demoMode
        ? "Modo demonstração: cadastro de membro desabilitado para esta conta."
        : "Você não tem permissão para cadastrar membros.";

      showError(msg);
      toast.error(msg);

      return;
    }

    await runAction({
      busySetter: setSaving,
      fn: async () => {
        const cpfDigits = onlyDigits(data.cpf);
        const now = new Date().toISOString();

        if (!isStatusValido(data.status)) {
          setFieldErrors((p) => ({
            ...p,
            status: "Selecione a situação (status).",
          }));

          throw new Error("Revise os campos destacados antes de salvar.");
        }

        const statusSeguro: Status = data.status as Status;
        const nomeSeguro = normalizeNomeCompleto(data.nomeCompleto);

        const payload = buildMembroPayload({
          nomeSeguro,
          dataNascimento: data.dataNascimento,
          cpfDigits,
          rg: data.rg ?? "",

          estadoCivil: data.estadoCivil as EstadoCivil,
          nomeConjuge: data.nomeConjuge ?? "",

          telefoneCelular: data.telefoneCelular,
          telefoneResidencial: data.telefoneResidencial ?? "",
          email: data.email ?? "",

          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento ?? "",
          lote: data.lote ?? "",
          quadra: data.quadra ?? "",
          bairro: data.bairro,
          cidade: data.cidade,
          uf: data.uf,
          cep: data.cep ?? "",

          dataBatismo: data.dataBatismo ?? "",
          campo: data.campo,
          congregacao: data.congregacao ?? "",
          pastor: data.pastor ?? "",
          cargoEclesiastico: data.cargoEclesiastico,

          naturalidade: data.naturalidade ?? "",
          escolaridade: data.escolaridade ?? "",
          profissao: data.profissao ?? "",

          filhosQtd: data.filhosQtd ?? "",
          netosQtd: data.netosQtd ?? "",

          statusSeguro,
          observacoes: data.observacoes ?? "",

          fotoUrl,
          anexos,

          numeroRol: data.numeroRol ?? "",
          ipdaPastor: data.ipdaPastor ?? "",
          telCarta: (data.telCarta ?? "") as TelCarta,

          now,

          onlyDigits,
        });

        const vr = cleanMembroPayload(payload);

        if (!vr.ok) {
          throw new Error(vr.message || "Revise os campos antes de salvar.");
        }

        const c = vr.value;

        const statusValidado: Status = isStatusValido(c.status)
          ? c.status
          : statusSeguro;

        const telCartaValidado: Membro["telCarta"] =
          c.telCarta === "Tel." || c.telCarta === "Carta"
            ? c.telCarta
            : payload.telCarta === "Tel." || payload.telCarta === "Carta"
            ? payload.telCarta
            : null;

        const fotoUrlValidada: Membro["fotoUrl"] =
          typeof c.fotoUrl === "string" || c.fotoUrl === null
            ? c.fotoUrl
            : payload.fotoUrl;

        const payloadSeguro: Membro = {
          ...payload,

          nomeCompleto: c.nomeCompleto ?? payload.nomeCompleto,
          status: statusValidado,

          telefoneCelular: c.telefoneCelular ?? payload.telefoneCelular,
          email: c.email ?? payload.email,

          cpf: c.cpf ?? payload.cpf,
          rg: c.rg ?? payload.rg,

          dataNascimento: c.dataNascimento ?? payload.dataNascimento,
          dataBatismo: c.dataBatismo ?? payload.dataBatismo,

          congregacao: c.congregacao ?? payload.congregacao,
          pastor: c.pastor ?? payload.pastor,
          campo: c.campo ?? payload.campo,

          cargoEclesiastico: c.cargoEclesiastico ?? payload.cargoEclesiastico,

          numeroRol: c.numeroRol ?? payload.numeroRol,

          telCarta: telCartaValidado,
          fotoUrl: fotoUrlValidada,
        };

        const result = await createMembro({
          payload: payloadSeguro,
          paths,
          userRole,
        });

        toastOk("Membro cadastrado com sucesso! Abrindo ficha…");

        setTimeout(() => {
          router.push(`/membros/${result.id}`);
        }, 650);
      },
      errorFallback: "Erro ao salvar.",
    });
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    void form.handleSubmit(salvar, handleInvalid)(e);
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
                Cadastrar membro
              </h1>

              <p className="text-gray-600 mt-1">
                Preencha os dados abaixo para criar o cadastro.
              </p>
            </div>

            <Link
              href="/membros"
              className={`rounded-xl bg-white px-4 py-2 shadow hover:bg-gray-50 ${
                isBusy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              ← Voltar
            </Link>
          </div>

          {demoMode ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <strong>Modo demonstração:</strong> cadastro de membros
              desabilitado para esta conta.
            </div>
          ) : null}

          {!loadingRole && !demoMode && !allowCreateMembers ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              Você não tem permissão para cadastrar membros.
            </div>
          ) : null}

          <form onSubmit={handleFormSubmit} className="mt-6 space-y-5">
            {sucesso ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
                {sucesso}
              </div>
            ) : null}

            {erro ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                {erro}
              </div>
            ) : null}

            <Card title="Santa Ceia e Planilhas">
              <Row>
                <Field
                  label="Nº do rol"
                  error={form.formState.errors.numeroRol?.message}
                >
                  <input
                    {...form.register("numeroRol")}
                    className={inputClass(!!form.formState.errors.numeroRol)}
                    inputMode="numeric"
                    placeholder="Ex.: 391"
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="IPDA / Pastor">
                  <select
                    {...form.register("ipdaPastor")}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  >
                    {IPDA_PASTOR_OPCOES.map((o) => (
                      <option key={o} value={o}>
                        {o === "" ? "—" : o}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Tel. ou Carta">
                  <select
                    {...form.register("telCarta")}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  >
                    <option value="">—</option>
                    <option value="Tel.">Tel.</option>
                    <option value="Carta">Carta</option>
                  </select>
                </Field>
              </Row>
            </Card>

            <MembroIdentificacaoCard
              nomeCompleto={formValues.nomeCompleto}
              dataNascimento={formValues.dataNascimento}
              cpf={formValues.cpf}
              rg={formValues.rg ?? ""}
              estadoCivil={formValues.estadoCivil as EstadoCivil}
              nomeConjuge={formValues.nomeConjuge ?? ""}
              idadeTxt={idadeTxt}
              isBusy={formDisabled}
              inputClass={inputClass}
              getFieldError={(field) => fieldErrors[field]}
              hasFieldError={(field) => !!fieldErrors[field]}
              maskCPF={maskCPF}
              setNomeCompleto={setFormStringValue("nomeCompleto")}
              setDataNascimento={setFormStringValue("dataNascimento")}
              setCpf={setFormStringValue("cpf")}
              setRg={setFormStringValue("rg")}
              setEstadoCivil={setFormStringValue("estadoCivil")}
              setNomeConjuge={setFormStringValue("nomeConjuge")}
            />

            <MembroContatoCard
              telefoneCelular={formValues.telefoneCelular}
              telefoneResidencial={formValues.telefoneResidencial ?? ""}
              email={formValues.email ?? ""}
              isBusy={formDisabled}
              inputClass={inputClass}
              getFieldError={(field) => fieldErrors[field]}
              hasFieldError={(field) => !!fieldErrors[field]}
              maskPhone={maskPhone}
              setTelefoneCelular={setFormStringValue("telefoneCelular")}
              setTelefoneResidencial={setFormStringValue("telefoneResidencial")}
              setEmail={setFormStringValue("email")}
              syncFormValue={(field, value) => {
                if (field === "telefoneCelular") {
                  form.setValue("telefoneCelular", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }
              }}
            />

            <MembroEnderecoCard
              logradouro={formValues.logradouro}
              numero={formValues.numero}
              complemento={formValues.complemento ?? ""}
              lote={formValues.lote ?? ""}
              quadra={formValues.quadra ?? ""}
              bairro={formValues.bairro}
              cidade={formValues.cidade}
              uf={formValues.uf}
              cep={formValues.cep ?? ""}
              isBusy={formDisabled}
              isFetchingCep={isFetchingCep}
              inputClass={inputClass}
              getFieldError={(field) => fieldErrors[field]}
              syncFormValue={(field, value) => {
                setFormFieldValue(field as keyof NovoMembroFormData, value);
              }}
              setComplemento={setFormStringValue("complemento")}
              setLote={setFormStringValue("lote")}
              setQuadra={setFormStringValue("quadra")}
              setCep={setFormStringValue("cep")}
              buscarCepAuto={buscarCepAuto}
              maskCEP={maskCEP}
              onlyDigits={onlyDigits}
            />

            <Card title="Igreja">
              <Row>
                <Field label="Data de batismo">
                  <input
                    type="date"
                    value={formValues.dataBatismo ?? ""}
                    onChange={(e) =>
                      form.setValue("dataBatismo", e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Campo">
                  <select
                    value={formValues.campo}
                    onChange={(e) =>
                      form.setValue("campo", e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    className={inputClass(false)}
                    disabled={formDisabled}
                  >
                    <option>Duque de Caxias</option>
                    <option>Rio de Janeiro</option>
                  </select>
                </Field>

                <Field label="Congregação">
                  <input
                    value={formValues.congregacao ?? ""}
                    onChange={(e) =>
                      form.setValue("congregacao", e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="Pastor">
                  <input
                    value={formValues.pastor ?? ""}
                    onChange={(e) =>
                      form.setValue("pastor", e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field
                  label="Cargo eclesiástico *"
                  error={fieldErrors.cargoEclesiastico}
                >
                  <select
                    value={formValues.cargoEclesiastico}
                    onChange={(e) =>
                      form.setValue("cargoEclesiastico", e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    className={inputClass(!!fieldErrors.cargoEclesiastico)}
                    disabled={formDisabled}
                  >
                    {CARGOS.map((c) => (
                      <option key={c} value={c}>
                        {c === "" ? "Selecione…" : c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="">
                  <div className="mt-2 text-sm text-gray-500" />
                </Field>
              </Row>
            </Card>

           <MembroDadosPessoaisCard
  naturalidade={formValues.naturalidade ?? ""}
  escolaridade={formValues.escolaridade ?? ""}
  profissao={formValues.profissao ?? ""}
  filhosQtd={formValues.filhosQtd ?? ""}
  netosQtd={formValues.netosQtd ?? ""}
  status={formValues.status as Status}
  statusError={fieldErrors.status}
  isBusy={formDisabled}
  inputClass={inputClass}
  setNaturalidade={setFormStringValue("naturalidade")}
  setEscolaridade={setFormStringValue("escolaridade")}
  setProfissao={setFormStringValue("profissao")}
  setFilhosQtd={setFormStringValue("filhosQtd")}
  setNetosQtd={setFormStringValue("netosQtd")}
  setStatus={setFormStringValue("status")}
/>

            <MembroFotoCadastroCard
              fotoUrl={fotoUrl}
              uploadingFoto={uploadingFoto}
              disabled={formDisabled}
              onUploadFoto={handleUploadFoto}
              onInvalidImage={() => {
                const msg = "Selecione uma imagem válida.";

                toast.error(msg);
                showError(msg);
              }}
            />

           <MembroObservacoesCard
  value={formValues.observacoes ?? ""}
  disabled={formDisabled}
  textareaClass={textareaClass}
  onChange={setFormStringValue("observacoes")}
/>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                disabled={formDisabled}
                type="submit"
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? "Salvando…"
                  : uploadingFoto
                  ? "Aguarde upload…"
                  : loadingRole
                  ? "Carregando permissões…"
                  : !allowCreateMembers
                  ? "Cadastro desabilitado"
                  : "Salvar cadastro"}
              </button>

              <Link
                href="/membros"
                className={`rounded-xl border bg-white px-6 py-3 text-center font-semibold hover:bg-gray-50 ${
                  isBusy ? "pointer-events-none opacity-60" : ""
                }`}
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>

        <style jsx>{`
          .inputBase {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid rgb(229 231 235);
            border-radius: 0.75rem;
            background: white;
            outline: none;
          }

          .inputError {
            border-color: rgb(248 113 113);
            box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15);
          }

          .textareaBase {
            width: 100%;
            min-height: 120px;
            padding: 0.75rem;
            border: 1px solid rgb(229 231 235);
            border-radius: 0.75rem;
            background: white;
            outline: none;
          }
        `}</style>
      </main>
    </AuthGuard>
  );
}