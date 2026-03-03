import { useEffect, useMemo, useState } from "react";
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

type LoteForm = {
  corteId: string;
  productoId: string;
  fecha: string;
  botellas: string;
  formato: string;
  codigo_lote_impreso: string;
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

function resolveLoteId(item: ElaboracionEntity) {
  const value = item.id_lote_frac ?? item.lote_fraccionamiento_id ?? item.id;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function resolveBodegaId(item: ElaboracionEntity) {
  const value = item.bodega_id ?? item.bodegaId;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export default function FraccionamientoDespachoPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [activeSection, setActiveSection] = useState<"lotes" | "codigos" | "despachos">("lotes");

  const [cortes, setCortes] = useState<ElaboracionEntity[]>([]);
  const [productos, setProductos] = useState<ElaboracionEntity[]>([]);
  const [lotes, setLotes] = useState<ElaboracionEntity[]>([]);

  const [form, setForm] = useState<LoteForm>({
    corteId: "",
    productoId: "",
    fecha: "",
    botellas: "",
    formato: "",
    codigo_lote_impreso: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loteFilterCodigos, setLoteFilterCodigos] = useState("");

  const corteOptions = useMemo(
    () => toOptions(cortes, ["id_corte", "corte_id", "id"], ["objetivo", "fecha", "id_corte"]),
    [cortes],
  );
  const productoOptions = useMemo(
    () =>
      toOptions(
        productos,
        ["id_producto", "producto_id", "id"],
        ["nombre_comercial", "varietal", "id_producto"],
      ),
    [productos],
  );
  const loteOptions = useMemo(
    () =>
      toOptions(
        lotes,
        ["id_lote_frac", "lote_fraccionamiento_id", "id"],
        ["codigo_lote_impreso", "fecha", "id_lote_frac"],
      ),
    [lotes],
  );

  const loadData = async () => {
    if (!activeBodegaId) return;
    setLoading(true);
    setError(null);
    try {
      const [cortesData, productosData, lotesData] = await Promise.all([
        listElaboracionResource("cortes", { bodegaId: String(activeBodegaId) }),
        listElaboracionResource("productos", { bodegaId: String(activeBodegaId) }),
        listElaboracionResource("lotes-fraccionamiento", { bodegaId: String(activeBodegaId) }),
      ]);
      setCortes(cortesData);
      setProductos(productosData);
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

  const submitLote = async () => {
    if (!activeBodegaId) {
      setError("Seleccioná una bodega.");
      return;
    }
    if (!form.corteId || !form.productoId || !form.fecha) {
      setError("corteId, productoId y fecha son obligatorios.");
      return;
    }

    const corte = cortes.find((item) => String(item.id_corte ?? item.corte_id ?? item.id) === form.corteId);
    const producto = productos.find(
      (item) => String(item.id_producto ?? item.producto_id ?? item.id) === form.productoId,
    );

    const corteBodega = corte ? resolveBodegaId(corte) : "";
    const productoBodega = producto ? resolveBodegaId(producto) : "";
    if (corteBodega && productoBodega && corteBodega !== productoBodega) {
      setError("Corte y producto deben pertenecer a la misma bodega.");
      return;
    }

    const payload: Record<string, unknown> = {
      corteId: form.corteId,
      productoId: form.productoId,
      fecha: form.fecha,
      botellas: form.botellas ? Number(form.botellas) : undefined,
      formato: form.formato || undefined,
      codigo_lote_impreso: form.codigo_lote_impreso || undefined,
    };

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        await patchElaboracionResource("lotes-fraccionamiento", editingId, payload);
        setSuccess("Lote fraccionamiento actualizado.");
      } else {
        await createElaboracionResource("lotes-fraccionamiento", payload);
        setSuccess("Lote fraccionamiento creado.");
      }
      setForm({
        corteId: "",
        productoId: "",
        fecha: "",
        botellas: "",
        formato: "",
        codigo_lote_impreso: "",
      });
      setEditingId(null);
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const editLote = (item: ElaboracionEntity) => {
    const id = resolveLoteId(item);
    if (!id) return;
    setEditingId(id);
    setForm({
      corteId: String(item.id_corte ?? item.corte_id ?? ""),
      productoId: String(item.id_producto ?? item.producto_id ?? ""),
      fecha: typeof item.fecha === "string" ? item.fecha.slice(0, 10) : "",
      botellas: item.botellas === undefined || item.botellas === null ? "" : String(item.botellas),
      formato: String(item.formato ?? ""),
      codigo_lote_impreso: String(item.codigo_lote_impreso ?? ""),
    });
  };

  const deleteLote = async (item: ElaboracionEntity) => {
    const id = resolveLoteId(item);
    if (!id) return;
    if (!window.confirm(`¿Eliminar lote ${id}?`)) return;

    try {
      await deleteElaboracionResource("lotes-fraccionamiento", id);
      setSuccess("Lote fraccionamiento eliminado.");
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-4">
      <SectionSelector
        value={activeSection}
        onChange={setActiveSection}
        options={[
          { key: "lotes", label: "Lotes Fraccionamiento" },
          { key: "codigos", label: "Códigos Envase" },
          { key: "despachos", label: "Despachos" },
        ]}
      />

      {activeSection === "lotes" ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-[#3D1B1F]">Lotes de Fraccionamiento</h3>
        <p className="mt-1 text-xs text-[#7A4A50]">
          Validación aplicada: corte y producto deben ser de la misma bodega.
        </p>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <select
            value={form.corteId}
            onChange={(event) => setForm((prev) => ({ ...prev, corteId: event.target.value }))}
            className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          >
            <option value="">Corte</option>
            {corteOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={form.productoId}
            onChange={(event) => setForm((prev) => ({ ...prev, productoId: event.target.value }))}
            className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          >
            <option value="">Producto</option>
            {productoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.fecha}
            onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
            className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Botellas"
            value={form.botellas}
            onChange={(event) => setForm((prev) => ({ ...prev, botellas: event.target.value }))}
            className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          />

          <input
            type="text"
            placeholder="Formato"
            value={form.formato}
            onChange={(event) => setForm((prev) => ({ ...prev, formato: event.target.value }))}
            className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Código lote impreso"
            value={form.codigo_lote_impreso}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, codigo_lote_impreso: event.target.value }))
            }
            className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void submitLote()}
            disabled={saving}
            className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60"
          >
            {editingId ? "Guardar lote" : "Crear lote"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({
                  corteId: "",
                  productoId: "",
                  fecha: "",
                  botellas: "",
                  formato: "",
                  codigo_lote_impreso: "",
                });
              }}
              className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"
            >
              Cancelar
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37]"
          >
            Actualizar
          </button>
        </div>

        {error ? <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div> : null}
        {success ? <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{success}</div> : null}

        <div className="mt-3 max-h-72 space-y-2 overflow-auto">
          {loading ? (
            <div className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2 text-xs text-[#7A4A50]">Cargando...</div>
          ) : lotes.length === 0 ? (
            <div className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2 text-xs text-[#7A4A50]">Sin lotes.</div>
          ) : (
            lotes.map((item, index) => {
              const id = resolveLoteId(item) || `i-${index}`;
              return (
                <article key={id} className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2">
                  <div className="text-xs font-semibold text-[#5A2D32]">{id}</div>
                  <pre className="mt-1 max-h-20 overflow-auto rounded bg-white p-2 text-[11px] text-[#3D1B1F]">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => editLote(item)}
                      className="rounded border border-[#C9A961]/50 px-2 py-1 text-xs font-semibold text-[#722F37]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteLote(item)}
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
      ) : null}

      {activeSection === "codigos" ? (
        <div className="space-y-6">
        <GenericCrudSection
          title="Códigos Envase"
          description="Generación de códigos QR por envase."
          resource="codigos-envase"
          bodegaId={activeBodegaId}
          listParams={{ loteFraccionamientoId: loteFilterCodigos || undefined }}
          fields={[
            {
              name: "loteFraccionamientoId",
              label: "Lote fraccionamiento",
              type: "select",
              required: true,
              options: loteOptions,
              sourceKey: "id_lote_frac",
            },
            { name: "codigo_qr", label: "Código QR", type: "text", required: true },
            { name: "codigo_lote_impreso", label: "Código lote impreso", type: "text" },
          ]}
        />

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="mb-1 block text-xs font-semibold text-[#722F37]">
            Filtro para listado de códigos por lote
          </label>
          <select
            value={loteFilterCodigos}
            onChange={(event) => setLoteFilterCodigos(event.target.value)}
            className="w-full rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {loteOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        </div>
      ) : null}

      {activeSection === "despachos" ? (
        <GenericCrudSection
          title="Despachos"
          description="Salida comercial de lotes fraccionados."
          resource="despachos"
          bodegaId={activeBodegaId}
          fields={[
            {
              name: "loteFraccionamientoId",
              label: "Lote fraccionamiento",
              type: "select",
              required: true,
              options: loteOptions,
              sourceKey: "id_lote_frac",
            },
            { name: "fecha", label: "Fecha", type: "date", required: true },
            { name: "destino", label: "Destino", type: "text" },
            { name: "cantidad", label: "Cantidad", type: "number" },
            { name: "documento", label: "Documento", type: "text" },
          ]}
        />
      ) : null}
    </div>
  );
}
