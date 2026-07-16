import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPersonalProfile,
  updatePersonalProfile,
} from "@/lib/personal.functions";

export const Route = createFileRoute("/_authenticated/settings/personal")({
  head: () => ({
    meta: [
      { title: "Dados Pessoais · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw redirect({ to: "/entrar" });
    return { email: user.email ?? "" };
  },
  loader: async () => {
    const profile = await getPersonalProfile();
    return { profile };
  },
  component: PersonalPage,
});

const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

function formatCpf(v: string | null) {
  if (!v) return "";
  const d = v.replace(/\D/g, "").padStart(11, "0").slice(-11);
  if (d.length !== 11) return v;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatBirthDate(v: string | null) {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return v;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function PersonalPage() {
  const router = useRouter();
  const { email } = Route.useRouteContext();
  const { profile } = Route.useLoaderData();
  const updateFn = useServerFn(updatePersonalProfile);

  const initial = useMemo(
    () => ({
      nickname: profile.nickname ?? "",
      phone: profile.phone ? maskPhone(profile.phone) : "",
      cep: profile.address_cep ? maskCep(profile.address_cep) : "",
      address: profile.address_street ?? "",
      number: profile.address_number ?? "",
      complement: profile.address_complement ?? "",
      district: profile.address_district ?? "",
      city: profile.address_city ?? "",
      state: profile.address_state ?? "",
    }),
    [profile],
  );

  const [tab, setTab] = useState<"info" | "address">("info");
  const [nickname, setNickname] = useState(initial.nickname);
  const [phone, setPhone] = useState(initial.phone);
  const [cep, setCep] = useState(initial.cep);
  const [address, setAddress] = useState(initial.address);
  const [number, setNumber] = useState(initial.number);
  const [complement, setComplement] = useState(initial.complement);
  const [district, setDistrict] = useState(initial.district);
  const [city, setCity] = useState(initial.city);
  const [state, setState] = useState(initial.state);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const requiredMissing = {
    cep: cep.replace(/\D/g, "").length !== 8,
    address: !address.trim(),
    number: !number.trim(),
    district: !district.trim(),
    city: !city.trim(),
    state: !state.trim(),
  };
  const hasErrors = Object.values(requiredMissing).some(Boolean);

  const dirty =
    nickname !== initial.nickname ||
    phone !== initial.phone ||
    cep !== initial.cep ||
    address !== initial.address ||
    number !== initial.number ||
    complement !== initial.complement ||
    district !== initial.district ||
    city !== initial.city ||
    state !== initial.state;

  const handleCancel = () => {
    setNickname(initial.nickname);
    setPhone(initial.phone);
    setCep(initial.cep);
    setAddress(initial.address);
    setNumber(initial.number);
    setComplement(initial.complement);
    setDistrict(initial.district);
    setCity(initial.city);
    setState(initial.state);
    setAttempted(false);
  };

  const handleSave = async () => {
    setAttempted(true);
    if (hasErrors) {
      setTab("address");
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    try {
      await updateFn({
        data: {
          nickname: nickname.trim() || null,
          phone: phone.trim() || null,
          address_cep: cep,
          address_street: address.trim(),
          address_number: number.trim(),
          address_complement: complement.trim() || null,
          address_district: district.trim(),
          address_city: city.trim(),
          address_state: state,
        },
      });
      toast.success("Dados salvos");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const cpfDisplay = formatCpf(profile.cpf);
  const nameDisplay = profile.full_name ?? "";
  const birthDisplay = formatBirthDate(profile.birth_date);
  const kycPending = !profile.cpf || !profile.full_name || !profile.birth_date;

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Dados Pessoais
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "info" | "address")}>
          <TabsList className="w-full h-auto bg-transparent p-0 border-b border-border rounded-none justify-stretch gap-0">
            <TabsTrigger
              value="info"
              className="flex-1 rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground py-3 text-base"
            >
              Informações
            </TabsTrigger>
            <TabsTrigger
              value="address"
              className="flex-1 rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground py-3 text-base"
            >
              Endereço
            </TabsTrigger>
          </TabsList>

          {/* Informações */}
          <TabsContent value="info" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <FloatingField
                label="Apelido"
                value={nickname}
                onChange={setNickname}
                placeholder="Seu apelido"
              />
              <FloatingField
                label="Celular"
                value={phone}
                onChange={(v) => setPhone(maskPhone(v))}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />

              <p className="md:col-span-2 text-sm text-muted-foreground mt-2">
                Os campos abaixo não podem ser editados
                {kycPending && " — serão preenchidos após a verificação de identidade"}
              </p>

              <FloatingField label="CPF" value={cpfDisplay} placeholder="000.000.000-00" disabled />
              <FloatingField label="E-mail" value={email} disabled />
              <FloatingField label="Nome Completo" value={nameDisplay} placeholder="Nome completo" disabled />
              <FloatingField label="Data de Nascimento" value={birthDisplay} placeholder="DD/MM/AAAA" disabled />
            </div>
          </TabsContent>

          {/* Endereço */}
          <TabsContent value="address" className="mt-6 space-y-4">
            <FieldShell label="País">
              <div className="flex items-center justify-between">
                <span className="text-base text-muted-foreground">Brasil</span>
              </div>
            </FieldShell>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <FloatingField
                label="CEP"
                value={cep}
                onChange={(v) => setCep(maskCep(v))}
                placeholder="00000-000"
                required
                error={attempted && requiredMissing.cep}
                inputMode="numeric"
              />
              <FloatingField
                label="Endereço"
                value={address}
                onChange={setAddress}
                placeholder="Rua, avenida..."
                required
                error={attempted && requiredMissing.address}
              />
              <FloatingField
                label="Número"
                value={number}
                onChange={setNumber}
                placeholder="Número"
                required
                error={attempted && requiredMissing.number}
              />
              <FloatingField
                label="Complemento"
                value={complement}
                onChange={setComplement}
                placeholder="Complemento"
              />
              <FloatingField
                label="Bairro"
                value={district}
                onChange={setDistrict}
                placeholder="Bairro"
                required
                error={attempted && requiredMissing.district}
              />
              <FloatingField
                label="Cidade"
                value={city}
                onChange={setCity}
                placeholder="Cidade"
                required
                error={attempted && requiredMissing.city}
              />
            </div>

            <div>
              <div
                className={`rounded-2xl bg-muted px-5 py-2 ${
                  attempted && requiredMissing.state ? "ring-2 ring-destructive" : ""
                }`}
              >
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="border-0 bg-transparent shadow-none h-10 px-0 focus:ring-0 text-base text-foreground data-[placeholder]:text-muted-foreground">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {BR_STATES.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {attempted && requiredMissing.state && (
                <p className="mt-1 px-1 text-sm text-destructive">Campo obrigatório</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex flex-col gap-3 pt-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="w-full h-12 rounded-md text-base font-semibold bg-primary"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={!dirty || saving}
            className="w-full h-12 rounded-md text-base font-semibold"
          >
            Cancelar
          </Button>
        </div>
      </main>
    </div>
  );
}

function FieldShell({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div className={`rounded-2xl bg-muted px-5 py-3 ${error ? "ring-2 ring-destructive" : ""}`}>
      <p className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>{label}</p>
      {children}
    </div>
  );
}

function FloatingField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  error,
  inputMode,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  inputMode?: "text" | "tel" | "numeric" | "email" | "decimal";
}) {
  return (
    <div>
      <FieldShell label={label} error={error}>
        <Input
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`border-0 bg-transparent shadow-none h-8 px-0 text-base focus-visible:ring-0 disabled:opacity-100 disabled:cursor-not-allowed placeholder:text-muted-foreground/60 ${
            error ? "text-destructive" : disabled ? "text-muted-foreground/70" : "text-foreground"
          }`}
        />
      </FieldShell>
      {required && error && (
        <p className="mt-1 px-1 text-sm text-destructive">Campo obrigatório</p>
      )}
    </div>
  );
}
