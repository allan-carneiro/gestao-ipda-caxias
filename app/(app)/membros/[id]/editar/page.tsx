"use client";

import { MembroDocumentosCard } from "@/src/features/membros/components/MembroDocumentosCard";
import { MembroObservacoesCard } from "@/src/features/membros/components/MembroObservacoesCard";
import { MembroContatoCard } from "@/src/features/membros/components/MembroContatoCard";
import { MembroEnderecoCard } from "@/src/features/membros/components/MembroEnderecoCard";
import { MembroIgrejaCard } from "@/src/features/membros/components/MembroIgrejaCard";
import { MembroDadosPessoaisCard } from "@/src/features/membros/components/MembroDadosPessoaisCard";
import { MembroIdentificacaoCard } from "@/src/features/membros/components/MembroIdentificacaoCard";
import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import AuthGuard from "@/app/components/AuthGuard";
import { useToast } from "@/app/components/ToastProvider";

import { db } from "@/src/lib/firebase";
import { PUBLIC_ENV } from "@/src/lib/publicEnv";
import { uploadImageToCloudinary } from "@/src/lib/cloudinary";
import { cleanMembroPayload } from "@/src/lib/validators";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";
import { getPaths } from "@/src/lib/demo/paths";
import { canEditMembers, isDemo } from "@/src/lib/auth/permissions";

import type { UserRole } from "@/src/types/auth";
import type {
  EstadoCivil,
  Status,
  Membro,
  MembroAnexo,
} from "@/src/features/membros/types";

import {
  maskCEP,
  maskCPF,
  maskPhone,
  onlyDigits,
} from "@/src/features/membros/utils/masks";

import {
  Card,
  Row,
  Field,
  inputClass,
  textareaClass,
} from "@/src/features/membros/components/FormLayout";
import { useCep } from "@/src/features/membros/hooks/useCep";
import { useMembroForm } from "@/src/features/membros/hooks/useMembroForm";
import {
  membroSchema,
  type MembroFormData,
} from "@/src/features/membros/schemas/membroSchema";
import { validateMembroForm } from "@/src/features/membros/utils/validateMembroForm";
import { buildUpdateMembroAudit } from "@/src/features/membros/utils/buildUpdateMembroAudit";
import { updateMembro } from "@/src/features/membros/services/updateMembro";
import { buildUpdateMembroPayload } from "@/src/features/membros/utils/buildUpdateMembroPayload";
import {
  calcularIdade,
  formatarIdade,
  isStatusValido,
  normalizeNomeCompleto,
  isValidCPF,
} from "@/src/features/membros/utils/memberHelpers";

type FieldErrors = Record<string, string>;

export default function EditarMembroPage() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const toast = useToast();

  const [loadingRole, setLoadingRole] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const form = useForm<MembroFormData>({
    resolver: zodResolver(membroSchema),
    defaultValues: {
      nomeCompleto: "",
      dataNascimento: "",
      cpf: "",
      telefoneCelular: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      uf: "",
      status: "",
    },
  });

  const {
    formState: { errors: zodErrors },
  } = form;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    erro,
    sucesso,
    showError,
    showSuccess,
    clearMessages: clearFormMessages,
  } = useMembroForm();

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingAnexos, setUploadingAnexos] = useState(false);

  const paths = useMemo(() => getPaths(userRole ?? undefined), [userRole]);

  const allowEditMembers = useMemo(
    () => canEditMembers(userRole ?? undefined),
    [userRole]
  );

  const demoMode = useMemo(() => isDemo(userRole ?? undefined), [userRole]);

  const [membroOriginal, setMembroOriginal] = useState<Membro | null>(null);
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
  const [anexos, setAnexos] = useState<MembroAnexo[]>([]);

  const isBusy =
    loading ||
    saving ||
    uploadingFoto ||
    uploadingAnexos ||
    !allowEditMembers;

  function syncFormValue(field: keyof MembroFormData, value: string) {
    if (field === "nomeCompleto") setNomeCompleto(value);
    if (field === "dataNascimento") setDataNascimento(value);
    if (field === "cpf") setCpf(value);
    if (field === "telefoneCelular") setTelefoneCelular(value);
    if (field === "logradouro") setLogradouro(value);
    if (field === "numero") setNumero(value);
    if (field === "bairro") setBairro(value);
    if (field === "cidade") setCidade(value);
    if (field === "uf") setUf(value);

    form.setValue(field, value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  function getFieldError(field: keyof MembroFormData) {
    return zodErrors[field]?.message || fieldErrors[field];
  }

  function hasFieldError(field: keyof MembroFormData) {
    return !!getFieldError(field);
  }

  function toastErro(e: any, fallback: string) {
    const msg =
      typeof e?.message === "string" && e.message.trim()
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

    setTimeout(() => clearFormMessages(), 1200);
  }

  function clearPageMessages() {
    setFieldErrors({});
    clearFormMessages();
  }

  const { buscarCepAuto, isFetchingCep } = useCep({
    setErro: (message) => {
      if (message) {
        showError(message);
      } else {
        clearFormMessages();
      }
    },
    toastErro,
    syncFormValue,
  });

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

  function validarFormulario(): boolean {
    const errors = validateMembroForm({
      nomeCompleto,
      dataNascimento,
      cpf,
      telefoneCelular,
      logradouro,
      numero,
      bairro,
      cidade,
      uf,
      status,
      onlyDigits,
      isValidCPF,
      isStatusValido,
    });

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const msg =
        "Há campos obrigatórios pendentes. Verifique os destaques em vermelho.";

      showError(msg);
      toast.error(msg);

      return false;
    }

    return true;
  }

  async function handleUploadFoto(file: File) {
    if (!allowEditMembers) return;

    await runAction({
      busySetter: setUploadingFoto,
      fn: async () => {
        clearFormMessages();

        const result = await uploadImageToCloudinary(file);
        const url = result.url;

        if (!url) throw new Error("Não foi possível obter a URL da foto.");

        setFotoUrl(url.trim());
      },
      success: "Foto atualizada. Não esqueça de salvar.",
      errorFallback: "Erro ao enviar foto.",
    });
  }

  async function handleUploadAnexos(files: FileList) {
    if (!allowEditMembers) return;

    await runAction({
      busySetter: setUploadingAnexos,
      fn: async () => {
        clearFormMessages();

        const arr = Array.from(files);
        const novos: MembroAnexo[] = [];

        for (const file of arr) {
          const result = await uploadImageToCloudinary(file);
          const url = result.url;

          if (!url) throw new Error("Não foi possível obter a URL do anexo.");

          novos.push({ nome: file.name, url });
        }

        setAnexos((prev) => [...(prev || []), ...novos]);
      },
      success: "Anexos adicionados. Não esqueça de salvar.",
      errorFallback: "Erro ao enviar anexos.",
    });
  }

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

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!id || !userRole) return;

      try {
        setLoading(true);
        clearFormMessages();

        const ref = doc(db, paths.membros, id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          const msg = "Membro não encontrado.";

          showError(msg);
          toast.error(msg);

          return;
        }

        const m = snap.data() as Membro;

        setMembroOriginal(m);
        setNomeCompleto(m.nomeCompleto || "");
        setDataNascimento(m.dataNascimento || "");
        setCpf(maskCPF(m.cpf || ""));
        setRg(m.rg || "");
        setEstadoCivil((m.estadoCivil as EstadoCivil) || "Solteiro(a)");
        setNomeConjuge(m.nomeConjuge || "");

        setTelefoneCelular(maskPhone(m.telefoneCelular || ""));
        setTelefoneResidencial(maskPhone(m.telefoneResidencial || ""));
        setEmail(m.email || "");

        setLogradouro(m.endereco?.logradouro || "");
        setNumero(m.endereco?.numero || "");
        setComplemento(m.endereco?.complemento || "");
        setLote(m.endereco?.lote || "");
        setQuadra(m.endereco?.quadra || "");
        setBairro(m.endereco?.bairro || "");
        setCidade(m.endereco?.cidade || "");
        setUf(m.endereco?.estado || "");
        setCep(maskCEP(m.endereco?.cep || ""));

        setDataBatismo(m.dataBatismo || "");
        setCampo(m.campo || "Duque de Caxias");
        setCongregacao(m.congregacao || "");
        setPastor(m.pastor || "");
        setCargoEclesiastico(m.cargoEclesiastico || "");

        setNaturalidade(m.naturalidade || "");
        setEscolaridade(m.escolaridade || "");
        setProfissao(m.profissao || "");
        setFilhosQtd(m.filhosQtd == null ? "" : String(m.filhosQtd));
        setNetosQtd(m.netosQtd == null ? "" : String(m.netosQtd));

        setStatus(isStatusValido(m.status) ? m.status : "Ativo");
        setObservacoes(m.observacoes || "");

        setFotoUrl(m.fotoUrl ?? null);
        setAnexos(m.anexos ?? []);
      } catch (e: any) {
        console.error(e);
        toastErro(e, "Erro ao carregar membro.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (!loadingRole && userRole) {
      void load();
    }

    return () => {
      alive = false;
    };
  }, [id, userRole, loadingRole, paths.membros, toast]);

  const idade = useMemo(
    () => calcularIdade(dataNascimento ?? null),
    [dataNascimento]
  );

  const idadeTxt = useMemo(() => formatarIdade(idade), [idade]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (saving || !allowEditMembers) return;

    clearPageMessages();

    if (uploadingFoto || uploadingAnexos) {
      const msg = "Aguarde terminar o envio de arquivos antes de salvar.";

      showError(msg);
      toast.error(msg);

      return;
    }

    const ok = validarFormulario();

    if (!ok) return;

    await runAction({
      busySetter: setSaving,
      fn: async () => {
        if (!userRole) throw new Error("Role do usuário não carregada.");

        const now = new Date().toISOString();

        if (!isStatusValido(status)) {
          setFieldErrors((p) => ({
            ...p,
            status: "Selecione a situação (status).",
          }));

          throw new Error("Revise os campos destacados antes de salvar.");
        }

        const nomeSeguro = normalizeNomeCompleto(nomeCompleto);

        const payload = buildUpdateMembroPayload({
          nomeSeguro,

          dataNascimento,
          cpf,
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

          status,
          observacoes,

          fotoUrl,
          anexos,

          now,

          onlyDigits,
        });

        const vr = cleanMembroPayload(payload);

        if (!vr.ok) {
          throw new Error(vr.message || "Revise os campos antes de salvar.");
        }

        const c = vr.value;

        const payloadSeguro: Partial<Membro> = {
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

          cargoEclesiastico:
            c.cargoEclesiastico ?? payload.cargoEclesiastico,

          fotoUrl: (c.fotoUrl as any) ?? payload.fotoUrl,
        };

        await updateMembro({
          id,
          payload: payloadSeguro,
          paths,

          audit: buildUpdateMembroAudit({
            id,
            original: membroOriginal,
            updated: payloadSeguro,
          }),
        });
      },
      success: "Alterações salvas com sucesso!",
      errorFallback: "Erro ao salvar alterações.",
    });

    setTimeout(() => router.push(`/membros/${id}`), 450);
  }

  const allowSheetsLinks = Boolean(
    PUBLIC_ENV.SHEETS_1_URL || PUBLIC_ENV.SHEETS_2_URL
  );

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
                Editar membro
              </h1>

              <p className="text-gray-600 mt-1">Atualize os dados do membro.</p>

              {demoMode ? (
                <p className="text-sm text-amber-700 mt-2">
                  Modo demonstração: edição desabilitada para esta conta.
                </p>
              ) : null}

              {allowSheetsLinks ? (
                <p className="text-xs text-gray-500 mt-1">
                  Dica: Links do Sheets estão configurados via PUBLIC_ENV.
                </p>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl bg-white px-4 py-2 shadow hover:bg-gray-50"
                disabled={loading || saving || uploadingFoto || uploadingAnexos}
              >
                Voltar
              </button>

              <Link
                href={`/membros/${id}`}
                className={`rounded-xl bg-white px-4 py-2 shadow hover:bg-gray-50 ${
                  loading || saving || uploadingFoto || uploadingAnexos
                    ? "pointer-events-none opacity-60"
                    : ""
                }`}
              >
                Ver
              </Link>
            </div>
          </div>

          {loading || loadingRole ? (
            <div className="mt-6 rounded-2xl bg-white p-6 shadow">
              Carregando...
            </div>
          ) : (
            <form onSubmit={salvar} className="mt-6 space-y-5">
              {sucesso ? (
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-green-800">
                  {sucesso}
                </div>
              ) : null}

              {erro ? (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
                  {erro}
                </div>
              ) : null}

           <MembroIdentificacaoCard
  nomeCompleto={nomeCompleto}
  dataNascimento={dataNascimento}
  cpf={cpf}
  rg={rg}
  estadoCivil={estadoCivil}
  nomeConjuge={nomeConjuge}
  idadeTxt={idadeTxt}
  isBusy={isBusy}
  isFetchingCep={isFetchingCep}
  inputClass={inputClass}
  getFieldError={getFieldError}
  hasFieldError={hasFieldError}
  syncFormValue={syncFormValue}
  maskCPF={maskCPF}
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
  isBusy={isBusy}
  inputClass={inputClass}
  getFieldError={getFieldError}
  hasFieldError={hasFieldError}
  maskPhone={maskPhone}
  setTelefoneCelular={setTelefoneCelular}
  setTelefoneResidencial={setTelefoneResidencial}
  setEmail={setEmail}
  syncFormValue={syncFormValue}
/>

           <MembroEnderecoCard
  logradouro={logradouro}
  numero={numero}
  complemento={complemento}
  lote={lote}
  quadra={quadra}
  bairro={bairro}
  cidade={cidade}
  uf={uf}
  cep={cep}
  isBusy={isBusy}
  isFetchingCep={isFetchingCep}
  inputClass={inputClass}
  getFieldError={getFieldError}
  syncFormValue={syncFormValue}
  setComplemento={setComplemento}
  setLote={setLote}
  setQuadra={setQuadra}
  setCep={setCep}
  buscarCepAuto={buscarCepAuto}
  maskCEP={maskCEP}
  onlyDigits={onlyDigits}
/>
<MembroIgrejaCard
  dataBatismo={dataBatismo}
  campo={campo}
  congregacao={congregacao}
  pastor={pastor}
  cargoEclesiastico={cargoEclesiastico}
  isBusy={isBusy}
  inputClass={inputClass}
  setDataBatismo={setDataBatismo}
  setCampo={setCampo}
  setCongregacao={setCongregacao}
  setPastor={setPastor}
  setCargoEclesiastico={setCargoEclesiastico}
/>

            <MembroDadosPessoaisCard
  naturalidade={naturalidade}
  escolaridade={escolaridade}
  profissao={profissao}
  filhosQtd={filhosQtd}
  netosQtd={netosQtd}
  status={status}
  statusError={fieldErrors.status}
  isBusy={isBusy}
  inputClass={inputClass}
  setNaturalidade={setNaturalidade}
  setEscolaridade={setEscolaridade}
  setProfissao={setProfissao}
  setFilhosQtd={setFilhosQtd}
  setNetosQtd={setNetosQtd}
  setStatus={setStatus}
/>

             <MembroDocumentosCard
  fotoUrl={fotoUrl}
  anexos={anexos}
  isBusy={isBusy}
  uploadingFoto={uploadingFoto}
  uploadingAnexos={uploadingAnexos}
  inputClass={inputClass}
  onUploadFoto={handleUploadFoto}
  onUploadAnexos={handleUploadAnexos}
  onRemoveAnexo={(index) =>
    setAnexos((prev) =>
      (prev || []).filter((_, idx: number) => idx !== index)
    )
  }
  onInvalidImage={() => {
    const msg = "Selecione uma imagem válida.";

    toast.error(msg);
    showError(msg);
  }}
/>

           <MembroObservacoesCard
  value={observacoes}
  disabled={isBusy}
  textareaClass={textareaClass}
  onChange={setObservacoes}
/> 

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  disabled={isBusy}
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {saving
                    ? "Salvando..."
                    : uploadingFoto || uploadingAnexos
                    ? "Aguarde uploads..."
                    : "Salvar alterações"}
                </button>

                <button
                  type="button"
                  disabled={loading || saving || uploadingFoto || uploadingAnexos}
                  onClick={() => router.push(`/membros/${id}`)}
                  className="bg-white border px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 text-center disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
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
