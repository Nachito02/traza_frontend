import { useEffect, useId, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  deleteElaboracionResource,
  fetchComposicionActualVasija,
  listElaboracionResource,
  patchElaboracionResource,
  type ComposicionActualVasija,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import {
  crearCorteConVasijas,
  fetchImpactoBorradoLote,
  fetchLotes,
  type CorteBlendResult,
  type Lote,
} from "../../features/lotes/api";
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  AppSelect,
  AppTextarea,
  GuidedState,
  NoticeBanner,
  SectionIntro,
  useConfirmDialog,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";
import SectionSelector from "./components/SectionSelector";

/** Una vasija con volumen activo de un lote determinado, y cuánto de eso se decide sacar. */
type FuenteVasija = { vasijaId: string; vasijaCodigo: string; disponibleL: number; volumenL: string };
/** Un lote elegido como fuente del corte — puede estar repartido en varias vasijas. */
type FuenteLote = { loteId: string; vasijas: FuenteVasija[] };
type DestinoForm = { vasijaId: string; volumenL: string };

type CorteMetaForm = {
  fecha: string;
  objetivo: string;
  campaniaId: string;
  responsableUserId: string;
  observaciones: string;
};

const TOLERANCIA_L = 0.5;

function emptyMeta(): CorteMetaForm {
  return { fecha: "", objetivo: "", campaniaId: "", responsableUserId: "", observaciones: "" };
}

function toOptions(items: ElaboracionEntity[], idKeys: string[], labelKeys: string[]): SelectOption[] {
  return items
    .map((item) => {
      const id = idKeys
        .map((key) => item[key])
        .find((value) => typeof value === "string" || typeof value === "number");
      const label = labelKeys
        .map((key) => item[key])
        .find((value) => typeof value === "string" || typeof value === "number");
      if (id === undefined || id === null) return null;
      return { value: String(id), label: String(label ?? id) };
    })
    .filter((option): option is SelectOption => option !== null);
}

function loteLabel(lote: Lote): string {
  return [
    lote.codigo,
    lote.variedad,
    lote.cuartel ? `${lote.cuartel.codigo_cuartel} · ${lote.cuartel.finca.nombre_finca}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function resolveCorteId(item: ElaboracionEntity) {
  const value = item.id_corte ?? item.corte_id ?? item.id;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function numVal(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/** Color vino para los deslizadores de volumen — deliberadamente distinto del verde de acción de la app. */
const SLIDER_WINE_ACCENT = "#7a1f3d";

/** Slider chico (con marcas en 25/50/75/100%) + input numérico + botón de relleno rápido. */
function VolumenSliderRow({
  label,
  helper,
  max,
  value,
  onChange,
  quickFillLabel = "Máx",
  quickFillValue,
  disabled,
}: {
  label: string;
  helper?: string;
  max: number;
  value: string;
  onChange: (value: string) => void;
  quickFillLabel?: string;
  quickFillValue?: number;
  disabled?: boolean;
}) {
  const listId = useId();
  const safeMax = Math.max(0, Math.ceil(max));
  const fillValue = Math.max(0, Math.min(safeMax, quickFillValue ?? safeMax));
  const numeric = Math.min(Number(value) || 0, safeMax);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-[color:var(--field-label)]">{label}</label>
        {helper ? <span className="text-[11px] text-[color:var(--text-ink-muted)]">{helper}</span> : null}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={safeMax}
          step={1}
          list={listId}
          value={numeric}
          disabled={disabled || safeMax <= 0}
          onChange={(event) => onChange(event.target.value)}
          className="h-1 flex-1 disabled:opacity-40 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3"
          style={{ accentColor: SLIDER_WINE_ACCENT }}
        />
        <datalist id={listId}>
          <option value={safeMax * 0.25} />
          <option value={safeMax * 0.5} />
          <option value={safeMax * 0.75} />
          <option value={safeMax} />
        </datalist>
        <input
          type="number"
          min={0}
          max={safeMax || undefined}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-20 rounded-[var(--radius-md)] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-2 py-1 text-xs text-[color:var(--field-text)] focus:border-[color:var(--field-border-focus)] focus:outline-none"
        />
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || safeMax <= 0}
          onClick={() => onChange(String(fillValue))}
        >
          {quickFillLabel}
        </AppButton>
      </div>
    </div>
  );
}

type CortesProductoPageProps = {
  initialSection?: "cortes" | "productos";
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
};

export default function CortesProductoPage({
  initialSection = "cortes",
  hideSectionSelector = false,
  hidePrimaryAction = false,
}: CortesProductoPageProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [activeSection, setActiveSection] = useState<"cortes" | "productos">(initialSection);
  const [showCorteModal, setShowCorteModal] = useState(false);

  const [vasijaOptions, setVasijaOptions] = useState<SelectOption[]>([]);
  const [cortes, setCortes] = useState<ElaboracionEntity[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [meta, setMeta] = useState<CorteMetaForm>(emptyMeta());
  const [fuentes, setFuentes] = useState<FuenteLote[]>([]);
  const [loteASeleccionar, setLoteASeleccionar] = useState("");
  const [agregandoFuente, setAgregandoFuente] = useState(false);
  const [destinos, setDestinos] = useState<DestinoForm[]>([{ vasijaId: "", volumenL: "" }]);
  // Ocupación de cada vasija — para exigir que el destino de un corte sea una vasija
  // vacía (no soporta mezclar en una que ya tiene otra cosa adentro).
  const [composicionPorVasija, setComposicionPorVasija] = useState<Record<string, ComposicionActualVasija>>({});
  const [composicionCargando, setComposicionCargando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ultimoBlend, setUltimoBlend] = useState<CorteBlendResult | null>(null);

  useEffect(() => {
    if (hideSectionSelector) {
      setActiveSection(initialSection);
      return;
    }
    const section = searchParams.get("section");
    if (section === "cortes" || section === "productos") {
      setActiveSection(section);
      return;
    }
    setActiveSection(initialSection);
  }, [hideSectionSelector, initialSection, searchParams]);

  const loadData = async () => {
    if (!activeBodegaId) return;
    setLoading(true);
    setError(null);
    try {
      const [vasijas, cortesData, lotesData] = await Promise.all([
        listElaboracionResource("vasijas", { bodegaId: String(activeBodegaId) }),
        listElaboracionResource("cortes", { bodegaId: String(activeBodegaId) }),
        fetchLotes(String(activeBodegaId)),
      ]);
      setVasijaOptions(toOptions(vasijas, ["id_vasija", "vasija_id", "id"], ["codigo", "id_vasija"]));
      setCortes(cortesData);
      setLotes(lotesData);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId]);

  // Al abrir el modal, se resuelve de una la ocupación de todas las vasijas — así el
  // selector de destino ya puede marcar como no elegibles las que no están vacías.
  useEffect(() => {
    if (!showCorteModal || vasijaOptions.length === 0) return;
    let cancelled = false;
    setComposicionCargando(true);
    Promise.all(
      vasijaOptions.map(async (opt) => {
        try {
          const data = await fetchComposicionActualVasija(opt.value);
          return [opt.value, data] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setComposicionPorVasija(
        Object.fromEntries(entries.filter((e): e is NonNullable<typeof e> => e !== null)),
      );
      setComposicionCargando(false);
    });
    return () => {
      cancelled = true;
    };
  }, [showCorteModal, vasijaOptions]);

  // Vasijas para elegir como destino: se marcan como no disponibles ("· ocupada") las
  // que ya tienen volumen activo — el corte no soporta mezclar en una vasija ocupada,
  // tiene que ir a una vacía.
  const destinoVasijaOptions = useMemo<SelectOption[]>(
    () =>
      vasijaOptions.map((opt) => {
        const c = composicionPorVasija[opt.value];
        const ocupada = Boolean(c) && c.volumen_disponible_l > 0.001;
        return {
          value: opt.value,
          label: c ? `${opt.label} · ${c.volumen_disponible_l > 0.001 ? `ocupada (${c.volumen_disponible_l.toLocaleString("es-AR")} l)` : "vacía"}` : opt.label,
          disabled: ocupada,
        };
      }),
    [vasijaOptions, composicionPorVasija],
  );

  // Lotes elegibles para armar un corte: solo los que hoy tienen volumen activo
  // en alguna vasija (si no, no hay nada físico de dónde sacar).
  const loteOrigenOptions = useMemo(
    () =>
      lotes
        .filter((l) => l._count.vasija_contenido > 0)
        .map((l) => ({ value: l.lote_id, label: loteLabel(l) })),
    [lotes],
  );
  const loteOrigenDisponibles = useMemo(
    () => loteOrigenOptions.filter((o) => !fuentes.some((f) => f.loteId === o.value)),
    [loteOrigenOptions, fuentes],
  );

  // Para "ponele nombre al producto" no hace falta que el lote tenga volumen activo
  // ahora — es solo para autocompletar variedad/año, cualquier lote real sirve.
  const loteProductoOptions = useMemo(
    () => lotes.map((l) => ({ value: l.lote_id, label: loteLabel(l) })),
    [lotes],
  );

  // Volumen real que se va a sacar: la suma de lo cargado en cada vasija de cada fuente.
  const volumenTotalFuentes = useMemo(
    () => fuentes.reduce((acc, f) => acc + f.vasijas.reduce((a, v) => a + (Number(v.volumenL) || 0), 0), 0),
    [fuentes],
  );

  const aportePorLote = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of fuentes) {
      const total = f.vasijas.reduce((a, v) => a + (Number(v.volumenL) || 0), 0);
      if (total > 0.001) map.set(f.loteId, total);
    }
    return map;
  }, [fuentes]);

  const closeModal = () => {
    setShowCorteModal(false);
    setEditingId(null);
    setMeta(emptyMeta());
    setFuentes([]);
    setLoteASeleccionar("");
    setDestinos([{ vasijaId: "", volumenL: "" }]);
  };

  const handleAgregarLoteFuente = async (loteId: string) => {
    setLoteASeleccionar("");
    if (!loteId || fuentes.some((f) => f.loteId === loteId)) return;
    setAgregandoFuente(true);
    setError(null);
    try {
      const impacto = await fetchImpactoBorradoLote(loteId);
      // Una misma vasija puede tener varias filas de VasijaContenido activas (distintas
      // cargas a lo largo del tiempo) — se agrupan por vasija para no repetirla en la UI.
      const disponiblePorVasija = new Map<string, { vasijaCodigo: string; disponibleL: number }>();
      for (const v of impacto.vasijaContenido) {
        if (!v.activo) continue;
        const previo = disponiblePorVasija.get(v.vasija_id);
        disponiblePorVasija.set(v.vasija_id, {
          vasijaCodigo: v.vasija_codigo,
          disponibleL: (previo?.disponibleL ?? 0) + v.volumen_l,
        });
      }
      const vasijas: FuenteVasija[] = Array.from(disponiblePorVasija.entries()).map(([vasijaId, v]) => ({
        vasijaId,
        vasijaCodigo: v.vasijaCodigo,
        disponibleL: v.disponibleL,
        volumenL: "",
      }));
      // Si está en una sola vasija, se autocompleta con todo lo disponible — con más de
      // una queda que el usuario reparta cuánto sacar de cada una con los sliders.
      const inicial = vasijas.length === 1 ? [{ ...vasijas[0], volumenL: String(vasijas[0].disponibleL) }] : vasijas;
      setFuentes((prev) => [...prev, { loteId, vasijas: inicial }]);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setAgregandoFuente(false);
    }
  };

  const quitarFuente = (loteId: string) => {
    setFuentes((prev) => prev.filter((f) => f.loteId !== loteId));
  };

  const setVasijaVolumen = (loteId: string, vasijaId: string, volumenL: string) => {
    setFuentes((prev) =>
      prev.map((f) =>
        f.loteId !== loteId
          ? f
          : { ...f, vasijas: f.vasijas.map((v) => (v.vasijaId === vasijaId ? { ...v, volumenL } : v)) },
      ),
    );
  };

  const totalDestinos = useMemo(
    () => destinos.reduce((acc, d) => acc + (Number(d.volumenL) || 0), 0),
    [destinos],
  );

  const setDestinoField = (index: number, patch: Partial<DestinoForm>) => {
    setDestinos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const capacidadVasija = (vasijaId: string): number | null =>
    numVal(composicionPorVasija[vasijaId]?.capacidad_litros);

  const restoDestino = (index: number) => {
    const otros = destinos.reduce((acc, d, i) => (i === index ? acc : acc + (Number(d.volumenL) || 0)), 0);
    const resto = Math.max(0, volumenTotalFuentes - otros);
    const cap = capacidadVasija(destinos[index]?.vasijaId ?? "");
    return cap !== null ? Math.min(resto, cap) : resto;
  };

  const desgloseDestino = (volumenDestino: number): string => {
    if (volumenTotalFuentes <= 0 || volumenDestino <= 0) return "";
    return Array.from(aportePorLote.entries())
      .map(([loteId, litros]) => {
        const lote = lotes.find((l) => l.lote_id === loteId);
        const pct = (litros / volumenTotalFuentes) * 100;
        const litrosEnDestino = volumenDestino * (litros / volumenTotalFuentes);
        return `${litrosEnDestino.toFixed(0)} l ${lote?.codigo ?? "?"} (${pct.toFixed(0)}%)`;
      })
      .join(" + ");
  };

  const submitCorte = async () => {
    if (!activeBodegaId) {
      setError("Seleccioná una bodega.");
      return;
    }
    if (!meta.fecha) {
      setError("La fecha del corte es obligatoria.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        // Editar solo actualiza los datos del corte, no vuelve a mover litros de las vasijas.
        await patchElaboracionResource("cortes", editingId, {
          fecha: meta.fecha,
          objetivo: meta.objetivo || undefined,
          campaniaId: meta.campaniaId || undefined,
          responsableUserId: meta.responsableUserId || undefined,
          observaciones: meta.observaciones || undefined,
        });
        setSuccess("Corte actualizado.");
        closeModal();
      } else {
        const fuentesValidas = fuentes.flatMap((f) =>
          f.vasijas
            .filter((v) => Number(v.volumenL) > 0)
            .map((v) => ({ vasijaId: v.vasijaId, volumenL: Number(v.volumenL) })),
        );
        if (fuentesValidas.length === 0) {
          setError("Elegí al menos un lote de origen con volumen a sacar.");
          setSaving(false);
          return;
        }
        const destinosValidos = destinos
          .filter((d) => d.vasijaId && Number(d.volumenL) > 0)
          .map((d) => ({ vasijaId: d.vasijaId, volumenL: Number(d.volumenL) }));
        if (destinosValidos.length === 0) {
          setError("Elegí al menos una vasija destino.");
          setSaving(false);
          return;
        }
        const destinoOcupado = destinosValidos.find((d) => {
          const c = composicionPorVasija[d.vasijaId];
          return c && c.volumen_disponible_l > 0.001;
        });
        if (destinoOcupado) {
          setError("Alguna vasija destino ya no está vacía — elegí otra.");
          setSaving(false);
          return;
        }
        const destinoSuperaCapacidad = destinosValidos.find((d) => {
          const cap = numVal(composicionPorVasija[d.vasijaId]?.capacidad_litros);
          return cap !== null && d.volumenL > cap + TOLERANCIA_L;
        });
        if (destinoSuperaCapacidad) {
          const c = composicionPorVasija[destinoSuperaCapacidad.vasijaId];
          setError(
            `La vasija ${c?.codigo ?? ""} tiene capacidad para ${numVal(c?.capacidad_litros)?.toLocaleString("es-AR")} l y le estás mandando ${destinoSuperaCapacidad.volumenL.toLocaleString("es-AR")} l.`,
          );
          setSaving(false);
          return;
        }
        const totalFuentesReal = fuentesValidas.reduce((a, f) => a + f.volumenL, 0);
        const totalDestinosReal = destinosValidos.reduce((a, d) => a + d.volumenL, 0);
        if (Math.abs(totalFuentesReal - totalDestinosReal) > TOLERANCIA_L) {
          setError(
            `La suma de las vasijas destino (${totalDestinosReal.toFixed(0)} l) no coincide con el volumen total a sacar (${totalFuentesReal.toFixed(0)} l).`,
          );
          setSaving(false);
          return;
        }
        const blend = await crearCorteConVasijas({
          bodegaId: String(activeBodegaId),
          fecha: meta.fecha,
          objetivo: meta.objetivo || undefined,
          campaniaId: meta.campaniaId || undefined,
          responsableUserId: meta.responsableUserId || undefined,
          observaciones: meta.observaciones || undefined,
          fuentes: fuentesValidas,
          destinos: destinosValidos,
        });
        setUltimoBlend(blend);
        setSuccess(`Corte creado. Lote resultado: ${blend.lote_creado[0]?.codigo ?? "—"}`);
        closeModal();
      }
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const editCorte = (item: ElaboracionEntity) => {
    const id = resolveCorteId(item);
    if (!id) return;
    setEditingId(id);
    setShowCorteModal(true);
    setMeta({
      fecha: typeof item.fecha === "string" ? item.fecha.slice(0, 10) : "",
      objetivo: String(item.objetivo ?? ""),
      campaniaId: String(item.campania_id ?? item.campaniaId ?? ""),
      responsableUserId: String(item.responsable_user_id ?? item.responsableUserId ?? ""),
      observaciones: String(item.observaciones ?? ""),
    });
  };

  const deleteCorte = async (item: ElaboracionEntity) => {
    const id = resolveCorteId(item);
    if (!id) return;
    if (!(await confirm(`¿Eliminar corte ${id}?`))) return;

    try {
      await deleteElaboracionResource("cortes", id);
      setSuccess("Corte eliminado.");
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const productoFields = useMemo(
    () => [
      {
        name: "loteId",
        label: "Lote de origen (opcional)",
        description: "Elegí un lote para autocompletar variedad y año — no se guarda en el producto.",
        type: "select" as const,
        options: loteProductoOptions,
        deriveOnChange: (value: string) => {
          const lote = lotes.find((l) => l.lote_id === value);
          if (!lote) return null;
          const anio = lote.campania?.fecha_inicio
            ? new Date(lote.campania.fecha_inicio).getFullYear()
            : null;
          return {
            ...(lote.variedad ? { varietal: lote.variedad } : {}),
            ...(anio ? { anio: String(anio) } : {}),
          };
        },
      },
      { name: "nombre_comercial", label: "Nombre comercial", type: "text" as const, required: true },
      { name: "varietal", label: "Varietal", type: "text" as const },
      { name: "anio", label: "Año", type: "number" as const },
      { name: "tipo", label: "Tipo", type: "text" as const },
      { name: "activo", label: "Activo", type: "checkbox" as const },
    ],
    [loteProductoOptions, lotes],
  );

  const destinosOk = Math.abs(totalDestinos - volumenTotalFuentes) <= TOLERANCIA_L;

  return (
    <div className="space-y-5">
      {!hideSectionSelector ? (
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          className="bg-[color:var(--surface-hero)] text-[color:var(--text-on-dark)]"
          header={(
            <SectionIntro
              eyebrow="Bodega"
              title="Cortes y Producto"
              description="Registro de cortes de elaboración y productos resultantes."
              descriptionClassName="text-[color:var(--text-on-dark-muted)]"
            />
          )}
        >
          <SectionSelector
            bare
            value={activeSection}
            onChange={(value) => {
              setActiveSection(value);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("section", value);
                return next;
              });
            }}
            options={[
              { key: "cortes", label: "Cortes" },
              { key: "productos", label: "Productos" },
            ]}
          />
        </AppCard>
      ) : null}

      {activeSection === "cortes" ? (
        <AppCard
          as="section"
          tone="default"
          padding="md"
          header={(
            <SectionIntro
              title="Cortes"
              description="Elegí de qué lotes sacar y cuánto volumen: el sistema resuelve en qué vasija está cada uno."
              actions={
                !hidePrimaryAction ? (
                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      closeModal();
                      setShowCorteModal(true);
                    }}
                  >
                    Nuevo corte
                  </AppButton>
                ) : undefined
              }
            />
          )}
        >
          {/* ── Lista de cortes ──────────────────────────────────── */}
          <div className="mt-3 max-h-72 space-y-2 overflow-auto">
            {loading ? (
              <NoticeBanner>Cargando...</NoticeBanner>
            ) : cortes.length === 0 ? (
              <GuidedState
                title="Sin cortes registrados"
                description="Cuando cargues el primer corte, aparecerá acá para editarlo, revisarlo o continuar el flujo operativo."
              />
            ) : (
              cortes.map((item, index) => {
                const id = resolveCorteId(item) || `i-${index}`;
                const shortId = id.slice(0, 8);
                const fecha = typeof item.fecha === "string" ? item.fecha.slice(0, 10) : null;
                const objetivo = typeof item.objetivo === "string" && item.objetivo ? item.objetivo : null;
                const componentesRaw = Array.isArray(item.componentes)
                  ? item.componentes
                  : Array.isArray(item.corte_componentes)
                    ? item.corte_componentes
                    : [];
                const loteCreadoRaw = Array.isArray(item.lote_creado) ? item.lote_creado[0] : null;
                const loteCreadoId =
                  loteCreadoRaw && typeof loteCreadoRaw === "object" && "lote_id" in loteCreadoRaw
                    ? String((loteCreadoRaw as { lote_id: unknown }).lote_id)
                    : null;
                return (
                  <div
                    key={id}
                    className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[color:var(--text-ink)]">
                          Corte <span className="font-normal text-[color:var(--text-ink-muted)]">#{shortId}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
                          {fecha ? (
                            <span className="text-xs text-[color:var(--text-ink-muted)]">
                              <span className="font-medium">Fecha:</span>{" "}
                              <span className="text-[color:var(--text-ink)]">{fecha}</span>
                            </span>
                          ) : null}
                          {objetivo ? (
                            <span className="text-xs text-[color:var(--text-ink-muted)]">
                              <span className="font-medium">Objetivo:</span>{" "}
                              <span className="text-[color:var(--text-ink)]">{objetivo}</span>
                            </span>
                          ) : null}
                          {componentesRaw.length > 0 ? (
                            <span className="text-xs text-[color:var(--text-ink-muted)]">
                              <span className="font-medium">Componentes:</span>{" "}
                              <span className="text-[color:var(--text-ink)]">{componentesRaw.length}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {loteCreadoId ? (
                          <Link to={`/operacion/lotes/${loteCreadoId}`}>
                            <AppButton type="button" variant="secondary" size="sm">
                              Ver historia
                            </AppButton>
                          </Link>
                        ) : null}
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => editCorte(item)}
                        >
                          Editar
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void deleteCorte(item)}
                        >
                          Eliminar
                        </AppButton>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}
          {success ? <NoticeBanner tone="success" className="mt-3">{success}</NoticeBanner> : null}
          {ultimoBlend?.lote_creado[0] ? (
            <NoticeBanner tone="info" className="mt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Composición del lote {ultimoBlend.lote_creado[0].codigo}:{" "}
                  {ultimoBlend.lote_creado[0].composicion_hijo
                    .map((c) => `${c.lote_padre.codigo} (${Math.round(Number(c.porcentaje ?? 0))}%)`)
                    .join(", ")}
                </span>
                <Link to={`/operacion/lotes/${ultimoBlend.lote_creado[0].lote_id}`}>
                  <AppButton type="button" variant="secondary" size="sm">
                    Ver genealogía y trazabilidad
                  </AppButton>
                </Link>
              </div>
            </NoticeBanner>
          ) : null}
        </AppCard>
      ) : null}

      {/* ── Modal: formulario de corte ───────────────────────────── */}
      <AppModal
        opened={showCorteModal}
        onClose={closeModal}
        title={(
          <div className="flex w-full items-center justify-between">
            <span>{editingId ? "Editar corte" : "Nuevo corte"}</span>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={closeModal}
              className="rounded-[var(--radius-md)] p-1.5 text-[color:var(--text-ink-muted)] transition-colors hover:bg-[color:var(--action-ghost-hover)] hover:text-[color:var(--text-ink)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        size="lg"
        showHeaderDivider
      >
        <div className="grid gap-3 md:grid-cols-2">
          <AppInput
            label="Fecha"
            type="date"
            value={meta.fecha}
            onChange={(event) => setMeta((prev) => ({ ...prev, fecha: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Objetivo"
            type="text"
            placeholder="Opcional"
            value={meta.objetivo}
            onChange={(event) => setMeta((prev) => ({ ...prev, objetivo: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Campaña ID"
            type="text"
            placeholder="Opcional"
            value={meta.campaniaId}
            onChange={(event) => setMeta((prev) => ({ ...prev, campaniaId: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Responsable User ID"
            type="text"
            placeholder="Opcional"
            value={meta.responsableUserId}
            onChange={(event) => setMeta((prev) => ({ ...prev, responsableUserId: event.target.value }))}
            uiSize="lg"
          />
        </div>
        <AppTextarea
          label="Observaciones"
          value={meta.observaciones}
          onChange={(event) => setMeta((prev) => ({ ...prev, observaciones: event.target.value }))}
          placeholder="Opcional"
          className="mt-3"
          uiSize="lg"
        />

        {editingId ? (
          <NoticeBanner tone="info" className="mt-4">
            Editar acá solo actualiza estos datos del corte — no vuelve a mover litros entre vasijas.
          </NoticeBanner>
        ) : (
          <>
            {/* Fuentes (de qué lote sacar y cuánto) */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-[color:var(--text-ink-muted)]">
                Lotes de origen — elegí de dónde sacar y cuánto. El % de cada uno se calcula solo, según
                los litros que le pongas.
              </p>

              {loteOrigenOptions.length === 0 ? (
                <NoticeBanner tone="warning">
                  No hay ningún lote con volumen activo en una vasija todavía.
                </NoticeBanner>
              ) : null}

              {fuentes.map((fuente) => {
                const lote = lotes.find((l) => l.lote_id === fuente.loteId);
                const totalLote = fuente.vasijas.reduce((a, v) => a + (Number(v.volumenL) || 0), 0);
                const pctLote = volumenTotalFuentes > 0 ? (totalLote / volumenTotalFuentes) * 100 : 0;
                return (
                  <div
                    key={fuente.loteId}
                    className="space-y-2 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[color:var(--text-ink)]">
                        {lote ? loteLabel(lote) : fuente.loteId}
                      </span>
                      <div className="flex items-center gap-2">
                        {totalLote > 0 ? (
                          <span className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--accent-primary)]">
                            {pctLote.toFixed(0)}% · {totalLote.toLocaleString("es-AR")} l
                          </span>
                        ) : null}
                        <AppButton type="button" variant="danger" size="sm" onClick={() => quitarFuente(fuente.loteId)}>
                          Quitar lote
                        </AppButton>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {fuente.vasijas.map((v) => (
                        <VolumenSliderRow
                          key={v.vasijaId}
                          label={`Vasija ${v.vasijaCodigo}`}
                          helper={`Disponible: ${v.disponibleL.toLocaleString("es-AR")} l`}
                          max={v.disponibleL}
                          value={v.volumenL}
                          onChange={(value) => setVasijaVolumen(fuente.loteId, v.vasijaId, value)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              <AppSelect
                label="Agregar lote de origen"
                value={loteASeleccionar}
                disabled={agregandoFuente}
                onChange={(event) => void handleAgregarLoteFuente(event.target.value)}
              >
                <option value="">{agregandoFuente ? "Buscando en qué vasija está…" : "Seleccionar…"}</option>
                {loteOrigenDisponibles.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </AppSelect>

              {volumenTotalFuentes > 0 ? (
                <p className="text-xs font-semibold text-[color:var(--text-ink)]">
                  Total a sacar: {volumenTotalFuentes.toLocaleString("es-AR")} l
                </p>
              ) : null}
            </div>

            {/* Destinos (obligatorio, puede ser más de una vasija) */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-[color:var(--text-ink-muted)]">
                Vasijas destino — dónde queda el resultado del corte
              </p>
              <p className="text-xs text-[color:var(--text-ink-muted)]">
                Solo se puede elegir una vasija vacía como destino — el corte no soporta mezclar con lo
                que ya haya adentro.
              </p>
              {composicionCargando ? (
                <NoticeBanner>Revisando qué vasijas están vacías…</NoticeBanner>
              ) : null}
              {destinos.map((destino, index) => {
                const vasijasDisponibles = destinoVasijaOptions.filter(
                  (o) => !destinos.some((d, i) => i !== index && d.vasijaId === o.value),
                );
                const litrosDestino = Number(destino.volumenL) || 0;
                const desglose = desgloseDestino(litrosDestino);
                const cap = capacidadVasija(destino.vasijaId);
                // Tope real de este destino: lo que todavía queda sin asignar entre todos los
                // destinos (no el total del corte entero), acotado además por su capacidad.
                const maxDestino = restoDestino(index);
                const excedeCapacidad = cap !== null && litrosDestino > cap + TOLERANCIA_L;
                return (
                  <div
                    key={`destino-${index}`}
                    className="space-y-2 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <AppSelect
                          label="Vasija destino"
                          value={destino.vasijaId}
                          disabled={composicionCargando}
                          onChange={(event) => setDestinoField(index, { vasijaId: event.target.value })}
                        >
                          <option value="">Seleccionar…</option>
                          {vasijasDisponibles.map((option) => (
                            <option key={option.value} value={option.value} disabled={option.disabled}>
                              {option.label}
                            </option>
                          ))}
                        </AppSelect>
                      </div>
                      {destinos.length > 1 ? (
                        <AppButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setDestinos((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Quitar
                        </AppButton>
                      ) : null}
                    </div>

                    <VolumenSliderRow
                      label="Volumen a esta vasija (l)"
                      helper={cap !== null ? `Capacidad: ${cap.toLocaleString("es-AR")} l` : undefined}
                      max={maxDestino}
                      value={destino.volumenL}
                      onChange={(value) => setDestinoField(index, { volumenL: value })}
                      quickFillLabel="Resto"
                      quickFillValue={restoDestino(index)}
                      disabled={volumenTotalFuentes <= 0}
                    />

                    {excedeCapacidad ? (
                      <NoticeBanner tone="danger">
                        Supera la capacidad de la vasija ({cap?.toLocaleString("es-AR")} l).
                      </NoticeBanner>
                    ) : null}

                    {desglose ? (
                      <p className="text-xs text-[color:var(--text-ink-muted)]">{desglose}</p>
                    ) : null}
                  </div>
                );
              })}

              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDestinos((prev) => [...prev, { vasijaId: "", volumenL: "" }])}
              >
                + Agregar vasija destino
              </AppButton>

              {volumenTotalFuentes > 0 ? (
                <NoticeBanner tone={destinosOk ? "success" : "warning"}>
                  Asignado: {totalDestinos.toLocaleString("es-AR")} l / Total a sacar:{" "}
                  {volumenTotalFuentes.toLocaleString("es-AR")} l
                </NoticeBanner>
              ) : null}
            </div>
          </>
        )}

        {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <AppButton
            type="button"
            variant="primary"
            loading={saving}
            disabled={saving}
            onClick={() => void submitCorte()}
          >
            {editingId ? "Guardar" : "Crear"}
          </AppButton>
          <AppButton type="button" variant="ghost" onClick={closeModal}>
            Cancelar
          </AppButton>
        </div>
      </AppModal>

      {activeSection === "productos" ? (
        <GenericCrudSection
          title="Productos"
          description="Catálogo de productos finales para fraccionamiento."
          resource="productos"
          bodegaId={activeBodegaId}
          formInModal={!hidePrimaryAction}
          fields={productoFields}
        />
      ) : null}
      {ConfirmDialog}
    </div>
  );
}
