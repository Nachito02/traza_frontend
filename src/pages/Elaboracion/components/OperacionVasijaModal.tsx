import { useEffect, useMemo, useState } from "react";
import {
  AppButton,
  AppInput,
  AppModal,
  AppSelect,
  AppTextarea,
  NoticeBanner,
} from "../../../components/ui";
import {
  fetchComposicionActualVasija,
  type ComposicionActualVasija,
} from "../../../features/elaboracion/api";
import { registrarActividad } from "../../../features/encargos/api";
import { getApiErrorMessage } from "../../../lib/api";
import type { SelectOption } from "./GenericCrudSection";

const TIPOS = [
  { value: "llenado", label: "Llenado" },
  { value: "vaciado", label: "Vaciado" },
  { value: "carga_mosto", label: "Carga de mosto" },
  { value: "carga_vino", label: "Carga de vino" },
  { value: "trasiego", label: "Trasiego" },
  { value: "corte_de_vinos", label: "Corte de vinos" },
  { value: "descube", label: "Descube" },
] as const;

const REQUIERE_DESTINO = new Set(["trasiego", "corte_de_vinos"]);
const REQUIERE_LOTE = new Set(["llenado", "carga_mosto", "carga_vino"]);

function nowDateTimeLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(raw: string): string {
  if (!raw.trim()) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString();
}

function numVal(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function litros(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("es-AR")} l`;
}

/** "V-01" → "V-01 · 4.300 / 50.000 l" — para que se vea ocupado/capacidad ya en el selector. */
function conVolumen(label: string, c: ComposicionActualVasija | undefined): string {
  if (!c) return label;
  const capacidad = numVal(c.capacidad_litros);
  const ocupado = c.volumen_disponible_l.toLocaleString("es-AR");
  return capacidad !== null ? `${label} · ${ocupado} / ${capacidad.toLocaleString("es-AR")} l` : `${label} · ${ocupado} l`;
}

type Props = {
  bodegaId: string | number | null;
  vasijaOptions: SelectOption[];
  /** etapa cruda de cada vasija — para exigir "vacía" en el destino. */
  vasijaEtapaPorId: Record<string, string>;
  loteOptions: SelectOption[];
  enologoOptions: SelectOption[];
  /** proceso_id de cada evento_tipo, sembrado en el protocolo general. */
  vasijaProcesoIds: Record<string, string>;
  /** Vasija con la que se abrió el modal (desde el ícono de una tarjeta puntual). */
  defaultVasijaId?: string;
  onClose: () => void;
  onCreated: (tareaId: string) => void;
};

/**
 * Modal de "Nueva operación" — a diferencia del resto de los formularios de la
 * app, este NO usa GenericCrudSection: necesita mostrar en vivo cuánto hay
 * ocupado/libre en origen y destino, y un deslizador con botón "Máx" (como al
 * armar un swap en un exchange), algo que el sistema de campos genérico no
 * puede resolver.
 */
export default function OperacionVasijaModal({
  bodegaId,
  vasijaOptions,
  vasijaEtapaPorId,
  loteOptions,
  enologoOptions,
  vasijaProcesoIds,
  defaultVasijaId,
  onClose,
  onCreated,
}: Props) {
  const [tipo, setTipo] = useState<string>("");
  const [vasijaPrincipalId, setVasijaPrincipalId] = useState(defaultVasijaId ?? "");
  const [vasijaDestinoId, setVasijaDestinoId] = useState("");
  const [loteId, setLoteId] = useState("");
  const [fechaHora, setFechaHora] = useState(nowDateTimeLocal());
  const [volumen, setVolumen] = useState("");
  const [enologoUserId, setEnologoUserId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ocupado/capacidad de todas las vasijas de una — así el selector ya
  // muestra "V-01 · 4.300 / 50.000 l" antes de elegir nada, y no hace falta
  // ir eligiendo una por una para ver cuál tiene lugar.
  const [composicionPorVasija, setComposicionPorVasija] = useState<Record<string, ComposicionActualVasija>>({});
  const [composicionCargando, setComposicionCargando] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setComposicionCargando(true);
      const entries = await Promise.all(
        vasijaOptions.map(async (opt) => {
          try {
            const data = await fetchComposicionActualVasija(opt.value);
            return [opt.value, data] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setComposicionPorVasija(
        Object.fromEntries(entries.filter((e): e is NonNullable<typeof e> => e !== null)),
      );
      setComposicionCargando(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vasijaOptionsConVolumen = useMemo(
    () => vasijaOptions.map((opt) => ({ ...opt, label: conVolumen(opt.label, composicionPorVasija[opt.value]) })),
    [vasijaOptions, composicionPorVasija],
  );

  const esIngreso = REQUIERE_LOTE.has(tipo);
  const tieneDestino = REQUIERE_DESTINO.has(tipo);

  const labelPrincipal =
    esIngreso ? "Vasija a llenar"
    : tipo === "vaciado" ? "Vasija a vaciar"
    : tipo === "descube" ? "Vasija a descubar"
    : tieneDestino ? "Vasija origen"
    : "Vasija";

  const composicionPrincipal = vasijaPrincipalId ? composicionPorVasija[vasijaPrincipalId] : undefined;
  const composicionDestino = tieneDestino && vasijaDestinoId ? composicionPorVasija[vasijaDestinoId] : undefined;

  const disponiblePrincipal = composicionPrincipal?.volumen_disponible_l ?? null;
  const capacidadPrincipal = numVal(composicionPrincipal?.capacidad_litros);
  const librePrincipal =
    capacidadPrincipal !== null && disponiblePrincipal !== null
      ? Math.max(0, capacidadPrincipal - disponiblePrincipal)
      : null;

  const disponibleDestino = composicionDestino?.volumen_disponible_l ?? null;
  const capacidadDestino = numVal(composicionDestino?.capacidad_litros);
  const libreDestino =
    capacidadDestino !== null && disponibleDestino !== null
      ? Math.max(0, capacidadDestino - disponibleDestino)
      : null;

  // Cuánto se puede mover como máximo, según el tipo: para un ingreso el
  // límite es el espacio libre en la vasija (que acá es "la principal"); para
  // un vaciado/descube es lo que hay para sacar; para un trasiego/corte es lo
  // más chico entre lo que hay en origen y lo que entra en destino.
  let maxVolumen: number | null = null;
  if (esIngreso) {
    maxVolumen = librePrincipal;
  } else if (tieneDestino) {
    const candidatos = [disponiblePrincipal, libreDestino].filter((v): v is number => v !== null);
    maxVolumen = candidatos.length > 0 ? Math.min(...candidatos) : null;
  } else {
    maxVolumen = disponiblePrincipal;
  }
  const maxSlider = maxVolumen && maxVolumen > 0 ? Math.ceil(maxVolumen) : 0;

  // Mezclar vino en destino solo tiene sentido en un corte — un trasiego (o
  // cualquier otro tipo con destino) tiene que ir a una vasija vacía. Se
  // chequean dos cosas: la etapa (lo que cargó el enólogo a mano, fuente de
  // verdad) y el volumen del ledger (por si quedó desactualizada) — cualquiera
  // de las dos que diga "no está vacía" alcanza para bloquear.
  const etapaDestino = vasijaDestinoId ? vasijaEtapaPorId[vasijaDestinoId] : undefined;
  const destinoOcupadaInvalida =
    tieneDestino &&
    tipo !== "corte_de_vinos" &&
    Boolean(vasijaDestinoId) &&
    (etapaDestino !== "vacia" || (disponibleDestino !== null && disponibleDestino > 0));

  const handleClose = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async () => {
    if (!bodegaId) {
      setError("Seleccioná una bodega para continuar.");
      return;
    }
    if (!tipo) {
      setError("Elegí el tipo de operación.");
      return;
    }
    const procesoId = vasijaProcesoIds[tipo];
    if (!procesoId) {
      setError(`No hay un proceso configurado para "${tipo}" — falta correr el seed del protocolo de vasijas.`);
      return;
    }
    if (!vasijaPrincipalId) {
      setError("Elegí una vasija.");
      return;
    }
    if (tieneDestino && !vasijaDestinoId) {
      setError("Elegí la vasija destino.");
      return;
    }
    if (destinoOcupadaInvalida) {
      setError(
        "La vasija destino tiene que estar en etapa \"Vacía\" — elegí una así, o usá \"Corte de vinos\" si la mezcla es intencional.",
      );
      return;
    }
    if (esIngreso && !loteId) {
      setError("Elegí el lote.");
      return;
    }
    if (!fechaHora) {
      setError("La fecha y hora son obligatorias.");
      return;
    }
    const volumenNum = Number(volumen);
    if (!volumen.trim() || !Number.isFinite(volumenNum) || volumenNum <= 0) {
      setError("Ingresá un volumen mayor a 0.");
      return;
    }
    if (maxVolumen !== null && volumenNum > maxVolumen + 0.001) {
      setError(`El volumen supera el máximo disponible (${litros(maxVolumen)}).`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await registrarActividad({
        bodegaId: String(bodegaId),
        procesoId,
        vasijaId: vasijaPrincipalId,
        draft: {
          fecha_hora: toIsoDateTime(fechaHora),
          volumen_movido_l: volumenNum,
          ...(tieneDestino && vasijaDestinoId ? { vasijaId: vasijaDestinoId } : {}),
          ...(esIngreso && loteId ? { loteId } : {}),
          ...(enologoUserId ? { enologoUserId } : {}),
          ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
        },
      });
      onCreated(result.tareaId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      opened
      onClose={handleClose}
      title="Nueva operación"
      size="lg"
      showHeaderDivider
      footer={(
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" size="sm" onClick={handleClose} disabled={saving}>
            Cancelar
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={saving}
            disabled={destinoOcupadaInvalida}
            onClick={() => void handleSubmit()}
          >
            Registrar
          </AppButton>
        </div>
      )}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <AppSelect
          label="Tipo de operación"
          value={tipo}
          onChange={(event) => {
            setTipo(event.target.value);
            setVolumen("");
          }}
        >
          <option value="">Seleccionar...</option>
          {TIPOS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </AppSelect>
        <AppInput
          label="Fecha y hora"
          type="datetime-local"
          value={fechaHora}
          onChange={(event) => setFechaHora(event.target.value)}
          uiSize="lg"
        />
      </div>

      {tipo ? (
        <>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <AppSelect
              label={labelPrincipal}
              value={vasijaPrincipalId}
              onChange={(event) => {
                setVasijaPrincipalId(event.target.value);
                setVolumen("");
              }}
            >
              <option value="">Seleccionar...</option>
              {vasijaOptionsConVolumen.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </AppSelect>
            {tieneDestino ? (
              <AppSelect
                label="Vasija destino"
                value={vasijaDestinoId}
                onChange={(event) => {
                  setVasijaDestinoId(event.target.value);
                  setVolumen("");
                }}
              >
                <option value="">Seleccionar...</option>
                {vasijaOptionsConVolumen
                  .filter((opt) => opt.value !== vasijaPrincipalId)
                  .map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
              </AppSelect>
            ) : esIngreso ? (
              <AppSelect label="Lote" value={loteId} onChange={(event) => setLoteId(event.target.value)}>
                <option value="">Seleccionar...</option>
                {loteOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </AppSelect>
            ) : null}
          </div>

          {/* Igual que en un exchange: se ve cuánto hay de cada lado antes de mover nada. */}
          {vasijaPrincipalId ? (
            <div className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs">
              {composicionCargando && !composicionPrincipal ? (
                <span className="text-[color:var(--text-ink-muted)]">Consultando volumen…</span>
              ) : (
                <>
                  <span className="font-semibold text-[color:var(--text-ink)]">
                    {esIngreso ? "Destino" : "Origen"}: {composicionPrincipal?.codigo ?? ""}
                  </span>{" "}
                  <span className="text-[color:var(--text-ink-muted)]">
                    · ocupado {litros(disponiblePrincipal)}
                    {capacidadPrincipal !== null ? ` / ${litros(capacidadPrincipal)}` : ""}
                    {esIngreso ? ` · libre ${litros(librePrincipal)}` : ""}
                  </span>
                </>
              )}
            </div>
          ) : null}
          {tieneDestino && vasijaDestinoId ? (
            <div
              className={`mt-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs ${
                destinoOcupadaInvalida
                  ? "border-[color:rgba(213,74,74,0.4)] bg-[color:rgba(213,74,74,0.08)]"
                  : "border-[color:var(--border-shell)] bg-[color:var(--surface-muted)]"
              }`}
            >
              {composicionCargando && !composicionDestino ? (
                <span className="text-[color:var(--text-ink-muted)]">Consultando volumen…</span>
              ) : (
                <>
                  <span className="font-semibold text-[color:var(--text-ink)]">
                    Destino: {composicionDestino?.codigo ?? ""}
                  </span>{" "}
                  <span className="text-[color:var(--text-ink-muted)]">
                    · ocupado {litros(disponibleDestino)}
                    {capacidadDestino !== null ? ` / ${litros(capacidadDestino)}` : ""} · libre {litros(libreDestino)}
                  </span>
                  {destinoOcupadaInvalida ? (
                    <p className="mt-1 font-medium text-[color:var(--feedback-danger-text)]">
                      {etapaDestino && etapaDestino !== "vacia"
                        ? `Etapa actual: "${etapaDestino}", no "Vacía"`
                        : "Todavía tiene vino"}{" "}
                      — elegí una vasija vacía, o usá "Corte de vinos" si la mezcla es intencional.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {/* Deslizador + "Máx", como al elegir cuánto pasar en un swap. */}
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-[color:var(--field-label)]">
              Volumen a mover (l)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={maxSlider}
                step={1}
                value={Math.min(Number(volumen) || 0, maxSlider)}
                disabled={maxSlider <= 0}
                onChange={(event) => setVolumen(event.target.value)}
                className="h-2 flex-1 accent-[color:var(--accent-primary)] disabled:opacity-40"
              />
              <input
                type="number"
                min={0}
                max={maxSlider || undefined}
                value={volumen}
                onChange={(event) => setVolumen(event.target.value)}
                className="w-24 rounded-[var(--radius-md)] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-2 py-1.5 text-sm text-[color:var(--field-text)] focus:border-[color:var(--field-border-focus)] focus:outline-none"
              />
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={maxVolumen === null || maxVolumen <= 0}
                onClick={() => setVolumen(String(maxVolumen))}
              >
                Máx
              </AppButton>
            </div>
            {maxVolumen !== null ? (
              <p className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                Máximo disponible: {litros(maxVolumen)}
              </p>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <AppSelect label="Enólogo" value={enologoUserId} onChange={(event) => setEnologoUserId(event.target.value)}>
              <option value="">Seleccionar...</option>
              {enologoOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </AppSelect>
          </div>

          <div className="mt-3">
            <AppTextarea
              label="Observaciones"
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
            />
          </div>
        </>
      ) : null}

      {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}
    </AppModal>
  );
}
