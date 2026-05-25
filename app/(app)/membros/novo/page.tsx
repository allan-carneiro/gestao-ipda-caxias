"use client";
import { useCep } from "@/src/features/membros/hooks/useCep";
import { buildMembroPayload } from "@/src/features/membros/utils/buildMembroPayload";
import { createMembro } from "@/src/features/membros/services/createMembro";
import React, { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/app/components/AuthGuard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadImageToCloudinary } from "@/src/lib/cloudinary";
import { useToast } from "@/app/components/ToastProvider";
import { cleanMembroPayload } from "@/src/lib/validators";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";
import { getPaths } from "@/src/lib/demo/paths";
import { canEditMembers, isDemo } from "@/src/lib/auth/permissions";
import {
  maskCEP,
  maskCPF,
  maskPhone,
  onlyDigits,
} from "@/src/features/membros/utils/masks";
import type { UserRole } from "@/src/types/auth";
import type {
  EstadoCivil,
  Status,
  TelCarta,
  Membro,
} from "@/src/features/membros/types";
import { MembroIdentificacaoCard } from "@/src/features/membros/components/MembroIdentificacaoCard";
import { MembroContatoCard } from "@/src/features/membros/components/MembroContatoCard";
import { MembroEnderecoCard } from "@/src/features/membros/components/MembroEnderecoCard";
import { MembroIgrejaCard } from "@/src/features/membros/components/MembroIgrejaCard";
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
type FieldErrors = Record<string, string>;
import {
  calcularIdade,
  formatarIdade,
  isStatusValido,
  normalizeNomeCompleto,
  isValidCPF,
} from "@/src/features/membros/utils/memberHelpers";
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

  const [loadingRole, setLoadingRole] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [numeroRol, setNumeroRol] = useState<string>("");
  const [ipdaPastor, setIpdaPastor] = useState<string>("");
  const [telCarta, setTelCarta] = useState<TelCarta>("");

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil>("Solteiro(a)");
  const [nomeConjuge, setNomeConjuge] = useState("");

  const [telefoneCelular, setTelefoneCelular] = useState("");
  const [telefoneResidencial, setTelefoneResidencial] = useState("");
  const [email, setEmail] = useState("");

  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [lote, setLote] = useState("");
  const [quadra, setQuadra] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");

  const [dataBatismo, setDataBatismo] = useState("");
  const [campo, setCampo] = useState("Duque de Caxias");
  const [congregacao, setCongregacao] = useState("");
  const [pastor, setPastor] = useState("");
  const [cargoEclesiastico, setCargoEclesiastico] = useState("");

  const [naturalidade, setNaturalidade] = useState("");
  const [escolaridade, setEscolaridade] = useState("");
  const [profissao, setProfissao] = useState("");
  const [filhosQtd, setFilhosQtd] = useState<string>("");
  const [netosQtd, setNetosQtd] = useState<string>("");

  const [status, setStatus] = useState<Status>("Ativo");

  const [observacoes, setObservacoes] = useState("");

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const paths = useMemo(() => getPaths(userRole ?? undefined), [userRole]);
  const demoMode = useMemo(() => isDemo(userRole ?? undefined), [userRole]);

  const allowCreateMembers = useMemo(
    () => canEditMembers(userRole ?? undefined) && !isDemo(userRole ?? undefined),
    [userRole]
  );

  const isBusy = saving || uploadingFoto || loadingRole;
  const formDisabled = isBusy || !allowCreateMembers;

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

  function toastErro(e: any, fallback: string) {
    const msg =
      typeof e?.message === "string" && e.message.trim()
        ? e.message
        : typeof e === "string" && e.trim()
        ? e
        : fallback;

    const finalMsg = msg.startsWith("Erro:") ? msg : `Erro: ${msg}`;
    toast.error(finalMsg);
    setErro(finalMsg);
  }

  function toastOk(msg: string) {
    toast.success(msg);
    setSucesso(msg);
    setTimeout(() => setSucesso(null), 1200);
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
    } catch (e: any) {
      console.error(e);
      toastErro(e, opts.errorFallback);
    } finally {
      opts.busySetter?.(false);
    }
  }

  const idade = useMemo(() => calcularIdade(dataNascimento ?? null), [dataNascimento]);
  const idadeTxt = useMemo(() => formatarIdade(idade), [idade]);


  function clearErrors() {
    setErro(null);
    setSucesso(null);
    setFieldErrors({});
  }
function syncCepFormValue(
  field: "logradouro" | "bairro" | "cidade" | "uf",
  value: string
) {
  if (field === "logradouro") setLogradouro(value);
  if (field === "bairro") setBairro(value);
  if (field === "cidade") setCidade(value);
  if (field === "uf") setUf(value);
}

const { buscarCepAuto, isFetchingCep } = useCep({
  setErro,
  toastErro,
  syncFormValue: syncCepFormValue,
});

  function validarFormulario(): boolean {
    const errors: FieldErrors = {};

    if (!nomeCompleto.trim()) errors.nomeCompleto = "Informe o nome completo.";
    if (!dataNascimento) errors.dataNascimento = "Informe a data de nascimento.";

    const cpfDigits = onlyDigits(cpf);

    if (!cpfDigits) errors.cpf = "Informe o CPF.";
    else if (!isValidCPF(cpfDigits)) errors.cpf = "CPF inválido.";

    if (!logradouro.trim()) errors.logradouro = "Informe o logradouro.";
    if (!numero.trim()) errors.numero = "Informe o número.";
    if (!bairro.trim()) errors.bairro = "Informe o bairro.";
    if (!cidade.trim()) errors.cidade = "Informe a cidade.";
    if (!uf.trim()) errors.uf = "Informe a UF.";

    const cel = onlyDigits(telefoneCelular);

    if (!cel) errors.telefoneCelular = "Informe o telefone celular.";
    else if (cel.length < 10) errors.telefoneCelular = "Telefone inválido.";

    if (!cargoEclesiastico.trim()) {
      errors.cargoEclesiastico = "Selecione o cargo eclesiástico.";
    }

    if (!isStatusValido(status)) {
      errors.status = "Selecione a situação (status).";
    }

    if (numeroRol.trim()) {
      const n = Number(onlyDigits(numeroRol));

      if (!Number.isFinite(n) || n <= 0) {
        errors.numeroRol = "Nº do rol inválido.";
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const msg = "Revise os campos destacados antes de salvar.";
      setErro(msg);
      toast.error(msg);
      return false;
    }

    return true;
  }

  async function handleUploadFoto(file: File) {
    if (!allowCreateMembers) {
      const msg = demoMode
        ? "Modo demonstração: upload de foto desabilitado para esta conta."
        : "Você não tem permissão para cadastrar membros.";

      setErro(msg);
      toast.error(msg);
      return;
    }

    await runAction({
      busySetter: setUploadingFoto,
      fn: async () => {
        setErro(null);
        setSucesso(null);

        const result = await uploadImageToCloudinary(file);

        const url =
          typeof result === "string"
            ? result
            : (result as any)?.secure_url ?? (result as any)?.url ?? "";

        if (!url) {
          throw new Error("Não foi possível obter a URL da foto após o upload.");
        }

        setFotoUrl(String(url).trim());
      },
      success: "Foto atualizada. Não esqueça de salvar.",
      errorFallback: "Erro ao enviar foto.",
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return;

    clearErrors();

    if (uploadingFoto) {
      const msg = "Aguarde terminar o envio da foto antes de salvar.";
      setErro(msg);
      toast.error(msg);
      return;
    }

    if (loadingRole) {
      const msg = "Aguarde o carregamento das permissões do usuário.";
      setErro(msg);
      toast.error(msg);
      return;
    }

    if (!allowCreateMembers) {
      const msg = demoMode
        ? "Modo demonstração: cadastro de membro desabilitado para esta conta."
        : "Você não tem permissão para cadastrar membros.";

      setErro(msg);
      toast.error(msg);
      return;
    }

    const ok = validarFormulario();
    if (!ok) return;

    await runAction({
      busySetter: setSaving,
      fn: async () => {
        const cpfDigits = onlyDigits(cpf);
        const now = new Date().toISOString();

        if (!isStatusValido(status)) {
          setFieldErrors((p) => ({
            ...p,
            status: "Selecione a situação (status).",
          }));

          throw new Error("Revise os campos destacados antes de salvar.");
        }

        const statusSeguro: Status = status;
        const nomeSeguro = normalizeNomeCompleto(nomeCompleto);

        const payload = buildMembroPayload({
          nomeSeguro,
          dataNascimento,
          cpfDigits,
          rg,

          estadoCivil,
          nomeConjuge,

          telefoneCelular,
          telefoneResidencial,
          email,

          logradouro,
          numero,
          complemento,
          lote,
          quadra,
          bairro,
          cidade,
          uf,
          cep,

          dataBatismo,
          campo,
          congregacao,
          pastor,
          cargoEclesiastico,

          naturalidade,
          escolaridade,
          profissao,

          filhosQtd,
          netosQtd,

          statusSeguro,
          observacoes,

          fotoUrl,
          anexos,

          numeroRol,
          ipdaPastor,
          telCarta,

          now,

          onlyDigits,
        });

        const vr = cleanMembroPayload(payload);

        if (!vr.ok) {
          throw new Error(vr.message || "Revise os campos antes de salvar.");
        }

        const c = vr.value;

        const payloadSeguro: Membro = {
          ...payload,

          nomeCompleto: c.nomeCompleto ?? payload.nomeCompleto,
          status: (c.status as any) ?? payload.status,

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

          telCarta: (c.telCarta as any) ?? payload.telCarta,
          fotoUrl: (c.fotoUrl as any) ?? payload.fotoUrl,
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
              <strong>Modo demonstração:</strong> cadastro de membros desabilitado para
              esta conta.
            </div>
          ) : null}

          {!loadingRole && !demoMode && !allowCreateMembers ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              Você não tem permissão para cadastrar membros.
            </div>
          ) : null}

          <form onSubmit={salvar} className="mt-6 space-y-5">
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
                <Field label="Nº do rol" error={fieldErrors.numeroRol}>
                  <input
                    value={numeroRol}
                    onChange={(e) => setNumeroRol(e.target.value)}
                    className={inputClass(!!fieldErrors.numeroRol)}
                    inputMode="numeric"
                    placeholder="Ex.: 391"
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="IPDA / Pastor">
                  <select
                    value={ipdaPastor}
                    onChange={(e) => setIpdaPastor(e.target.value)}
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
                    value={telCarta}
                    onChange={(e) => setTelCarta(e.target.value as TelCarta)}
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
  nomeCompleto={nomeCompleto}
  dataNascimento={dataNascimento}
  cpf={cpf}
  rg={rg}
  estadoCivil={estadoCivil}
  nomeConjuge={nomeConjuge}
  idadeTxt={idadeTxt}
  isBusy={formDisabled}
  inputClass={inputClass}
  getFieldError={(field) => fieldErrors[field]}
  hasFieldError={(field) => !!fieldErrors[field]}
  maskCPF={maskCPF}
  setNomeCompleto={setNomeCompleto}
  setDataNascimento={setDataNascimento}
  setCpf={setCpf}
  setRg={setRg}
  setEstadoCivil={setEstadoCivil}
  setNomeConjuge={setNomeConjuge}
/>
<MembroContatoCard
  telefoneCelular={telefoneCelular}
  telefoneResidencial={telefoneResidencial}
  email={email}
  isBusy={formDisabled}
  inputClass={inputClass}
  getFieldError={(field) => fieldErrors[field]}
  hasFieldError={(field) => !!fieldErrors[field]}
  maskPhone={maskPhone}
  setTelefoneCelular={setTelefoneCelular}
  setTelefoneResidencial={setTelefoneResidencial}
  setEmail={setEmail}
  syncFormValue={(field, value) => {
    if (field === "telefoneCelular") {
      setTelefoneCelular(value);
    }
  }}
/>



            <Card title="Igreja">
              <Row>
                <Field label="Data de batismo">
                  <input
                    type="date"
                    value={dataBatismo}
                    onChange={(e) => setDataBatismo(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Campo">
                  <select
                    value={campo}
                    onChange={(e) => setCampo(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  >
                    <option>Duque de Caxias</option>
                    <option>Rio de Janeiro</option>
                  </select>
                </Field>

                <Field label="Congregação">
                  <input
                    value={congregacao}
                    onChange={(e) => setCongregacao(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="Pastor">
                  <input
                    value={pastor}
                    onChange={(e) => setPastor(e.target.value)}
                    className={inputClass(false)}
                    disabled={formDisabled}
                  />
                </Field>

                <Field label="Cargo eclesiástico *" error={fieldErrors.cargoEclesiastico}>
                  <select
                    value={cargoEclesiastico}
                    onChange={(e) => setCargoEclesiastico(e.target.value)}
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
  naturalidade={naturalidade}
  escolaridade={escolaridade}
  profissao={profissao}
  filhosQtd={filhosQtd}
  netosQtd={netosQtd}
  status={status}
  statusError={fieldErrors.status}
  isBusy={formDisabled}
  inputClass={inputClass}
  setNaturalidade={setNaturalidade}
  setEscolaridade={setEscolaridade}
  setProfissao={setProfissao}
  setFilhosQtd={setFilhosQtd}
  setNetosQtd={setNetosQtd}
  setStatus={setStatus}
/>
          <MembroFotoCadastroCard
  fotoUrl={fotoUrl}
  uploadingFoto={uploadingFoto}
  disabled={formDisabled}
  onUploadFoto={handleUploadFoto}
  onInvalidImage={() => {
    const msg = "Selecione uma imagem válida.";

    toast.error(msg);
    setErro(msg);
  }}
/>

        <MembroObservacoesCard
  value={observacoes}
  disabled={formDisabled}
  textareaClass={textareaClass}
  onChange={setObservacoes}
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

