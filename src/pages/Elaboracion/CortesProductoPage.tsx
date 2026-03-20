import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createElaboracionResource,
  deleteElaboracionResource,
  listElaboracionResource,
  patchElaboracionResource,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";
import SectionSelector from "./components/SectionSelector";

type CorteComponenteForm = {
  vasijaId: string;
  loteCosechaId: string;
  volumen_l: string;
  porcentaje: string;
};

type CorteForm = {
  fecha: string;
  objetivo: string;
  campaniaId: string;
  responsableUserId: string;
  observaciones: string;
  componentes: CorteComponenteForm[];
};

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

function emptyCorteForm(): CorteForm {
  return {
    fecha: "",
    objetivo: "",
    campaniaId: "",
    responsableUserId: "",
    observaciones: "",
    componentes: [{ vasijaId: "", loteCosechaId: "", volumen_l: "", porcentaje: "" }],
  };
}

function resolveCorteId(item: ElaboracionEntity) {
  const value = item.id_corte ?? item.corte_id ?? item.id;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [activeSection, setActiveSection] = useState<"cortes" | "productos">(initialSection);
  const [corteViewMode, setCorteViewMode] = useState<"list" | "form">(
    hidePrimaryAction ? "form" : "list",
  );

  const [vasijaOptions, setVasijaOptions] = useState<SelectOption[]>([]);
  const [cortes, setCortes] = useState<ElaboracionEntity[]>([]);
  const [form, setForm] = useState<CorteForm>(emptyCorteForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      const [vasijas, cortesData] = await Promise.all([
        listElaboracionResource("vasijas", { bodegaId: String(activeBodegaId) }),
        listElaboracionResource("cortes", { bodegaId: String(activeBodegaId) }),
      ]);
      setVasijaOptions(toOptions(vasijas, ["id_vasija", "vasija_id", "id"], ["codigo", "id_vasija"]));
      setCortes(cortesData);
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

  const submitCorte = async () => {
    if (!activeBodegaId) {
      setError("Seleccioná una bodega.");
      return;
    }
    if (!form.fecha) {
      setError("La fecha del corte es obligatoria.");
      return;
    }
    if (form.componentes.length === 0) {
      setError("Debes agregar al menos un componente.");
      return;
    }

    const componentesPayload = form.componentes.map((componente) => ({
      vasijaId: componente.vasijaId || undefined,
      loteCosechaId: componente.loteCosechaId || undefined,
      volumen_l: componente.volumen_l ? Number(componente.volumen_l) : undefined,
      porcentaje: componente.porcentaje ? Number(componente.porcentaje) : undefined,
    }));

    const invalid = componentesPayload.find(
      (componente) => !componente.vasijaId && !componente.loteCosechaId,
    );
    if (invalid) {
      setError("Cada componente debe tener al menos vasijaId o loteCosechaId.");
      return;
    }

    const payload: Record<string, unknown> = {
      bodegaId: String(activeBodegaId),
      fecha: form.fecha,
      objetivo: form.objetivo || undefined,
      campaniaId: form.campaniaId || undefined,
      responsableUserId: form.responsableUserId || undefined,
      observaciones: form.observaciones || undefined,
      componentes: componentesPayload,
    };

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        await patchElaboracionResource("cortes", editingId, payload);
        setSuccess("Corte actualizado.");
      } else {
        await createElaboracionResource("cortes", payload);
        setSuccess("Corte creado.");
      }
      setForm(emptyCorteForm());
      setEditingId(null);
      if (!hidePrimaryAction) {
        setCorteViewMode("list");
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
    const componentesRaw = Array.isArray(item.componentes)
      ? item.componentes
      : Array.isArray(item.corte_componentes)
        ? item.corte_componentes
        : [];

    const componentes = componentesRaw.length
      ? componentesRaw.map((componente) => {
          const row = componente as Record<string, unknown>;
          return {
            vasijaId: String(row.vasijaId ?? row.id_vasija ?? ""),
            loteCosechaId: String(row.loteCosechaId ?? row.id_lote_cosecha ?? ""),
            volumen_l: row.volumen_l === undefined || row.volumen_l === null ? "" : String(row.volumen_l),
            porcentaje: row.porcentaje === undefined || row.porcentaje === null ? "" : String(row.porcentaje),
          };
        })
      : [{ vasijaId: "", loteCosechaId: "", volumen_l: "", porcentaje: "" }];

    setEditingId(id);
    if (!hidePrimaryAction) {
      setCorteViewMode("form");
    }
    setForm({
      fecha: typeof item.fecha === "string" ? item.fecha.slice(0, 10) : "",
      objetivo: String(item.objetivo ?? ""),
      campaniaId: String(item.campania_id ?? item.campaniaId ?? ""),
      responsableUserId: String(item.responsable_user_id ?? item.responsableUserId ?? ""),
      observaciones: String(item.observaciones ?? ""),
      componentes,
    });
  };

  const deleteCorte = async (item: ElaboracionEntity) => {
    const id = resolveCorteId(item);
    if (!id) return;
    if (!window.confirm(`¿Eliminar corte ${id}?`)) return;

    try {
      await deleteElaboracionResource("cortes", id);
      setSuccess("Corte eliminado.");
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-4">
      {!hideSectionSelector ? (
        <SectionSelector
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
      ) : null}

      {activeSection === "cortes" ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#3D1B1F]">Cortes</h3>
              <p className="mt-1 text-xs text-[#7A4A50]">
                Validación aplicada: cada componente requiere vasijaId o loteCosechaId.
              </p>
            </div>
            {!hidePrimaryAction && corteViewMode === "list" ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyCorteForm());
                  setCorteViewMode("form");
                }}
                className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37]"
              >
                Nuevo corte
              </button>
            ) : null}
          </div>

          {hidePrimaryAction || corteViewMode === "form" ? (
            <>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
                  className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Objetivo"
                  value={form.objetivo}
                  onChange={(event) => setForm((prev) => ({ ...prev, objetivo: event.target.value }))}
                  className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Campaña ID"
                  value={form.campaniaId}
                  onChange={(event) => setForm((prev) => ({ ...prev, campaniaId: event.target.value }))}
                  className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Responsable User ID"
                  value={form.responsableUserId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, responsableUserId: event.target.value }))
                  }
                  className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                value={form.observaciones}
                onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                placeholder="Observaciones"
                className="mt-2 min-h-20 w-full rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
              />

              <div className="mt-3 space-y-2">
                {form.componentes.map((componente, index) => (
                  <div key={`comp-${index}`} className="grid gap-2 rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2 md:grid-cols-2">
                    <select
                      value={componente.vasijaId}
                      onChange={(event) =>
                        setForm((prev) => {
                          const componentes = [...prev.componentes];
                          componentes[index] = { ...componentes[index], vasijaId: event.target.value };
                          return { ...prev, componentes };
                        })
                      }
                      className="rounded border border-[#C9A961]/40 px-2 py-1 text-sm"
                    >
                      <option value="">Vasija (opcional)</option>
                      {vasijaOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Lote cosecha ID (opcional)"
                      value={componente.loteCosechaId}
                      onChange={(event) =>
                        setForm((prev) => {
                          const componentes = [...prev.componentes];
                          componentes[index] = {
                            ...componentes[index],
                            loteCosechaId: event.target.value,
                          };
                          return { ...prev, componentes };
                        })
                      }
                      className="rounded border border-[#C9A961]/40 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Volumen l"
                      value={componente.volumen_l}
                      onChange={(event) =>
                        setForm((prev) => {
                          const componentes = [...prev.componentes];
                          componentes[index] = { ...componentes[index], volumen_l: event.target.value };
                          return { ...prev, componentes };
                        })
                      }
                      className="rounded border border-[#C9A961]/40 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Porcentaje"
                      value={componente.porcentaje}
                      onChange={(event) =>
                        setForm((prev) => {
                          const componentes = [...prev.componentes];
                          componentes[index] = { ...componentes[index], porcentaje: event.target.value };
                          return { ...prev, componentes };
                        })
                      }
                      className="rounded border border-[#C9A961]/40 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          componentes: prev.componentes.filter((_, rowIndex) => rowIndex !== index),
                        }))
                      }
                      className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700"
                    >
                      Quitar componente
                    </button>
                  </div>
                ))}
              </div>

              {!hidePrimaryAction ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        componentes: [
                          ...prev.componentes,
                          { vasijaId: "", loteCosechaId: "", volumen_l: "", porcentaje: "" },
                        ],
                      }))
                    }
                    className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37]"
                  >
                    Agregar componente
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitCorte()}
                    disabled={saving}
                    className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
                  >
                    {editingId ? "Guardar" : "Crear"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyCorteForm());
                      setCorteViewMode("list");
                    }}
                    className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"
                  >
                    {editingId ? "Cancelar edición" : "Volver al listado"}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-3 max-h-72 space-y-2 overflow-auto">
              {loading ? (
                <div className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2 text-xs text-[#7A4A50]">Cargando...</div>
              ) : cortes.length === 0 ? (
                <div className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2 text-xs text-[#7A4A50]">Sin cortes.</div>
              ) : (
                cortes.map((item, index) => {
                  const id = resolveCorteId(item) || `i-${index}`;
                  return (
                    <article key={id} className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2">
                      <div className="text-xs font-semibold text-[#5A2D32]">{id}</div>
                      <pre className="mt-1 max-h-20 overflow-auto rounded bg-white p-2 text-[11px] text-[#3D1B1F]">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => editCorte(item)}
                          className="rounded border border-[#C9A961]/50 px-2 py-1 text-xs font-semibold text-[#722F37]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteCorte(item)}
                          className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}

          {error ? <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div> : null}
          {success ? <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{success}</div> : null}
        </section>
      ) : null}

      {activeSection === "productos" ? (
        <GenericCrudSection
          title="Productos"
          description="Catálogo de productos finales para fraccionamiento."
          resource="productos"
          bodegaId={activeBodegaId}
          separatedLayout={!hidePrimaryAction}
          fields={[
            { name: "nombre_comercial", label: "Nombre comercial", type: "text", required: true },
            { name: "varietal", label: "Varietal", type: "text" },
            { name: "anio", label: "Año", type: "number" },
            { name: "tipo", label: "Tipo", type: "text" },
            { name: "activo", label: "Activo", type: "checkbox" },
          ]}
        />
      ) : null}
    </div>
  );
}
