import { useEffect, useState } from "react";
import {
  createElaboracionResource,
  deleteCiuRecepcion,
  listElaboracionResource,
  patchCiuRecepcion,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";

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
      return {
        value: String(id),
        label: String(label ?? id),
      };
    })
    .filter((option): option is SelectOption => option !== null);
}

type CiuRecepcionForm = {
  ciuId: string;
  recepcionBodegaId: string;
};

export default function CiuQcPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [ciuOptions, setCiuOptions] = useState<SelectOption[]>([]);
  const [recepcionOptions, setRecepcionOptions] = useState<SelectOption[]>([]);

  const [links, setLinks] = useState<ElaboracionEntity[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [filters, setFilters] = useState({ ciuId: "", recepcionBodegaId: "" });
  const [form, setForm] = useState<CiuRecepcionForm>({ ciuId: "", recepcionBodegaId: "" });

  const loadLookups = async () => {
    if (!activeBodegaId) return;
    const [cius, recepciones] = await Promise.all([
      listElaboracionResource("cius", { bodegaId: String(activeBodegaId) }),
      listElaboracionResource("recepciones-bodega", { bodegaId: String(activeBodegaId) }),
    ]);

    setCiuOptions(toOptions(cius, ["id_ciu", "ciu_id", "id"], ["codigo_ciu", "id_ciu"]));
    setRecepcionOptions(
      toOptions(recepciones, ["id_recepcion", "recepcion_id", "id"], ["fecha_hora", "clasificacion", "id_recepcion"]),
    );
  };

  const loadLinks = async () => {
    if (!activeBodegaId) return;
    setLoadingLinks(true);
    setLinkError(null);
    try {
      const data = await listElaboracionResource("ciu-recepciones", {
        bodegaId: String(activeBodegaId),
        ciuId: filters.ciuId || undefined,
        recepcionBodegaId: filters.recepcionBodegaId || undefined,
      });
      setLinks(data);
    } catch (requestError) {
      setLinkError(getApiErrorMessage(requestError));
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadLookups();
    void loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId]);

  useEffect(() => {
    void loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const submitLink = async () => {
    if (!form.ciuId || !form.recepcionBodegaId) {
      setLinkError("ciuId y recepcionBodegaId son obligatorios.");
      return;
    }

    setLinkError(null);
    setLinkSuccess(null);
    try {
      if (editingKey) {
        const [ciuId, recepcionBodegaId] = editingKey.split("::");
        await patchCiuRecepcion({ ciuId, recepcionBodegaId }, form);
        setLinkSuccess("CIU-Recepción actualizado.");
      } else {
        await createElaboracionResource("ciu-recepciones", form);
        setLinkSuccess("CIU-Recepción creado.");
      }
      setForm({ ciuId: "", recepcionBodegaId: "" });
      setEditingKey(null);
      await loadLinks();
    } catch (requestError) {
      setLinkError(getApiErrorMessage(requestError));
    }
  };

  const removeLink = async (item: ElaboracionEntity) => {
    const ciuId = String(item.ciu_id ?? item.ciuId ?? "");
    const recepcionBodegaId = String(
      item.recepcion_bodega_id ?? item.recepcionBodegaId ?? item.id_recepcion_bodega ?? "",
    );
    if (!ciuId || !recepcionBodegaId) {
      setLinkError("No se pudo resolver la PK compuesta.");
      return;
    }
    if (!window.confirm(`¿Eliminar vínculo ${ciuId}/${recepcionBodegaId}?`)) return;

    try {
      await deleteCiuRecepcion({ ciuId, recepcionBodegaId });
      setLinkSuccess("CIU-Recepción eliminado.");
      await loadLinks();
    } catch (requestError) {
      setLinkError(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GenericCrudSection
        title="CIU"
        description="Comprobante de ingreso de uva por bodega."
        resource="cius"
        bodegaId={activeBodegaId}
        fields={[
          { name: "codigo_ciu", label: "Código CIU", type: "text", required: true },
          { name: "emitido_at", label: "Emitido", type: "datetime-local", required: true },
          { name: "estado", label: "Estado", type: "text" },
          { name: "observaciones", label: "Observaciones", type: "textarea" },
        ]}
      />

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-[#3D1B1F]">CIU-Recepción</h3>
        <p className="mt-1 text-xs text-[#7A4A50]">Recurso con PK compuesta en la URL.</p>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <select
            value={filters.ciuId}
            onChange={(event) => setFilters((prev) => ({ ...prev, ciuId: event.target.value }))}
            className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          >
            <option value="">Filtro ciuId</option>
            {ciuOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.recepcionBodegaId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, recepcionBodegaId: event.target.value }))
            }
            className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          >
            <option value="">Filtro recepción</option>
            {recepcionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <select
            value={form.ciuId}
            onChange={(event) => setForm((prev) => ({ ...prev, ciuId: event.target.value }))}
            className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          >
            <option value="">CIU</option>
            {ciuOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={form.recepcionBodegaId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, recepcionBodegaId: event.target.value }))
            }
            className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          >
            <option value="">Recepción</option>
            {recepcionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void submitLink()}
            className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37]"
          >
            {editingKey ? "Guardar cambios" : "Crear vínculo"}
          </button>
          {editingKey ? (
            <button
              type="button"
              onClick={() => {
                setEditingKey(null);
                setForm({ ciuId: "", recepcionBodegaId: "" });
              }}
              className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"
            >
              Cancelar
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void loadLinks()}
            className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37]"
          >
            Actualizar
          </button>
        </div>

        {linkError ? <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{linkError}</div> : null}
        {linkSuccess ? <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{linkSuccess}</div> : null}

        <div className="mt-3 max-h-72 space-y-2 overflow-auto">
          {loadingLinks ? (
            <div className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2 text-xs text-[#7A4A50]">Cargando...</div>
          ) : links.length === 0 ? (
            <div className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2 text-xs text-[#7A4A50]">Sin vínculos.</div>
          ) : (
            links.map((item, index) => {
              const ciuId = String(item.ciu_id ?? item.ciuId ?? "");
              const recepcionBodegaId = String(
                item.recepcion_bodega_id ?? item.recepcionBodegaId ?? item.id_recepcion_bodega ?? "",
              );
              const key = ciuId && recepcionBodegaId ? `${ciuId}::${recepcionBodegaId}` : `i-${index}`;
              return (
                <article key={key} className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2">
                  <div className="text-xs font-semibold text-[#5A2D32]">{key}</div>
                  <pre className="mt-1 max-h-20 overflow-auto rounded bg-white p-2 text-[11px] text-[#3D1B1F]">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKey(key);
                        setForm({ ciuId, recepcionBodegaId });
                      }}
                      className="rounded border border-[#C9A961]/50 px-2 py-1 text-xs font-semibold text-[#722F37]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeLink(item)}
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
      </section>

      <GenericCrudSection
        title="QC Ingreso Uva"
        description="Control de calidad por recepción."
        resource="qc-ingreso-uva"
        bodegaId={activeBodegaId}
        fields={[
          {
            name: "recepcionBodegaId",
            label: "Recepción",
            type: "select",
            required: true,
            options: recepcionOptions,
            sourceKey: "recepcion_bodega_id",
          },
          { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true },
          { name: "brix", label: "Brix", type: "number" },
          { name: "ph", label: "pH", type: "number" },
          { name: "acidez", label: "Acidez", type: "number" },
          { name: "temperatura_uva", label: "Temp. Uva", type: "number" },
          { name: "estado_pcc", label: "Estado PCC", type: "text" },
          { name: "aprobado", label: "Aprobado", type: "checkbox" },
          { name: "observaciones", label: "Observaciones", type: "textarea" },
        ]}
      />
    </div>
  );
}
