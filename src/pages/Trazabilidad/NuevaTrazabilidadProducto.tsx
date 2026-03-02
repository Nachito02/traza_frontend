import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Campania } from "../../features/campanias/api";
import { fetchCampanias } from "../../features/campanias/api";
import type { Cuartel } from "../../features/cuarteles/api";
import { fetchCuartelesByFinca } from "../../features/cuarteles/api";
import { useFincasStore } from "../../features/fincas/store";
import { getApiErrorMessage } from "../../lib/api";
import type { Protocolo } from "../../features/protocolos/api";
import { fetchProtocolos, getDefaultProtocoloId } from "../../features/protocolos/api";
import {
  createTrazabilidad,
  createTrazabilidadOrigen,
} from "../../features/trazabilidades/api";
import { useAuthStore } from "../../store/authStore";

type OrigenSeleccionado = {
  fincaId: string;
  fincaNombre: string;
  cuartelId: string;
  cuartelCodigo: string;
};

const NuevaTrazabilidadProducto = () => {
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [cuartelesByFinca, setCuartelesByFinca] = useState<Record<string, Cuartel[]>>(
    {},
  );
  const [form, setForm] = useState({
    nombre_producto: "",
    imagen_producto: "",
    campaniaId: "",
    protocoloId: "",
  });
  const [selector, setSelector] = useState({
    fincaId: "",
    cuartelId: "",
  });
  const [origenes, setOrigenes] = useState<OrigenSeleccionado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchCampanias(), fetchProtocolos()])
      .then(([campaniasData, protocolosData]) => {
        if (!mounted) return;
        const loadedCampanias = campaniasData ?? [];
        const loadedProtocolos = protocolosData ?? [];
        setCampanias(loadedCampanias);
        setProtocolos(loadedProtocolos);
        setForm((prev) => ({
          ...prev,
          campaniaId:
            prev.campaniaId || String(loadedCampanias[0]?.campania_id ?? loadedCampanias[0]?.id ?? ""),
          protocoloId: prev.protocoloId || getDefaultProtocoloId(loadedProtocolos),
        }));
      })
      .catch((e) => {
        if (!mounted) return;
        setError(getApiErrorMessage(e));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selector.fincaId || cuartelesByFinca[selector.fincaId]) return;
    fetchCuartelesByFinca(selector.fincaId)
      .then((data) => {
        setCuartelesByFinca((prev) => ({ ...prev, [selector.fincaId]: data ?? [] }));
      })
      .catch(() => {
        setCuartelesByFinca((prev) => ({ ...prev, [selector.fincaId]: [] }));
      });
  }, [cuartelesByFinca, selector.fincaId]);

  const fincaOptions = useMemo(
    () =>
      fincas.map((finca) => ({
        id: String(finca.finca_id ?? finca.id ?? ""),
        nombre: finca.nombre ?? finca.nombre_finca ?? finca.name ?? "Finca sin nombre",
      })),
    [fincas],
  );

  const cuartelOptions = useMemo(
    () => cuartelesByFinca[selector.fincaId] ?? [],
    [cuartelesByFinca, selector.fincaId],
  );

  const onAddOrigen = () => {
    if (!selector.fincaId || !selector.cuartelId) {
      setError("Seleccioná finca y cuartel para agregar origen.");
      return;
    }
    const finca = fincaOptions.find((item) => item.id === selector.fincaId);
    const cuartel = cuartelOptions.find(
      (item) => String(item.cuartel_id ?? item.id) === selector.cuartelId,
    );
    if (!finca || !cuartel) {
      setError("No se pudo resolver el origen seleccionado.");
      return;
    }
    setOrigenes((prev) => {
      const exists = prev.some(
        (item) => item.fincaId === selector.fincaId && item.cuartelId === selector.cuartelId,
      );
      if (exists) return prev;
      return [
        ...prev,
        {
          fincaId: selector.fincaId,
          fincaNombre: finca.nombre,
          cuartelId: selector.cuartelId,
          cuartelCodigo: cuartel.codigo_cuartel,
        },
      ];
    });
    setError(null);
  };

  const onRemoveOrigen = (fincaId: string, cuartelId: string) => {
    setOrigenes((prev) =>
      prev.filter((item) => !(item.fincaId === fincaId && item.cuartelId === cuartelId)),
    );
  };

  const onSubmit = async () => {
    if (!activeBodegaId) {
      setError("Seleccioná una bodega activa.");
      return;
    }
    if (!form.campaniaId || !form.protocoloId) {
      setError("Seleccioná campaña y protocolo.");
      return;
    }
    if (!form.nombre_producto.trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }
    if (origenes.length === 0) {
      setError("Agregá al menos un origen (finca + cuartel).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const trazabilidad = await createTrazabilidad({
        bodegaId: String(activeBodegaId),
        campaniaId: form.campaniaId,
        protocoloId: form.protocoloId,
        nombre_producto: form.nombre_producto.trim(),
        imagen_producto: form.imagen_producto.trim() || null,
      });

      await Promise.all(
        origenes.map((origen) =>
          createTrazabilidadOrigen(trazabilidad.trazabilidad_id, {
            fincaId: origen.fincaId,
            cuartelId: origen.cuartelId,
          }),
        ),
      );

      navigate(`/productos/${trazabilidad.trazabilidad_id}/plan`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="rounded-2xl bg-white/90 p-8 shadow-lg">
          <h1 className="text-2xl text-[#3D1B1F]">Nuevo producto</h1>
          <p className="mt-2 text-sm text-[#6B3A3F]">
            Definí datos del producto y sus orígenes (finca/cuartel).
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 p-8 shadow-lg">
          {loading ? (
            <div className="text-sm text-[#7A4A50]">Cargando datos…</div>
          ) : (
            <form className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-[#722F37]">Producto</label>
                  <input
                    type="text"
                    value={form.nombre_producto}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, nombre_producto: e.target.value }))
                    }
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    placeholder="Ej: Malbec Reserva 2026"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[#722F37]">
                    Imagen (URL opcional)
                  </label>
                  <input
                    type="text"
                    value={form.imagen_producto}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, imagen_producto: e.target.value }))
                    }
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-[#722F37]">Campaña</label>
                  <select
                    value={form.campaniaId}
                    onChange={(e) => setForm((prev) => ({ ...prev, campaniaId: e.target.value }))}
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                  >
                    <option value="">Seleccionar campaña</option>
                    {campanias.map((campania) => {
                      const id = String(campania.campania_id ?? campania.id ?? "");
                      return (
                        <option key={id} value={id}>
                          {campania.nombre}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[#722F37]">Protocolo</label>
                  <select
                    value={form.protocoloId}
                    onChange={(e) => setForm((prev) => ({ ...prev, protocoloId: e.target.value }))}
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                  >
                    <option value="">Seleccionar protocolo</option>
                    {protocolos.map((protocolo) => {
                      const id = String(protocolo.protocolo_id ?? protocolo.id ?? "");
                      return (
                        <option key={id} value={id}>
                          {protocolo.nombre ?? protocolo.codigo ?? "Protocolo"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4">
                <h2 className="text-sm font-semibold text-[#3D1B1F]">Orígenes del producto</h2>
                <p className="mt-1 text-xs text-[#6B3A3F]">
                  Agregá una o más combinaciones de finca y cuartel.
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <select
                    value={selector.fincaId}
                    onChange={(e) =>
                      setSelector((prev) => ({ ...prev, fincaId: e.target.value, cuartelId: "" }))
                    }
                    className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-sm text-[#3D1B1F]"
                  >
                    <option value="">Seleccionar finca</option>
                    {fincaOptions.map((finca) => (
                      <option key={finca.id} value={finca.id}>
                        {finca.nombre}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selector.cuartelId}
                    onChange={(e) => setSelector((prev) => ({ ...prev, cuartelId: e.target.value }))}
                    className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-sm text-[#3D1B1F]"
                    disabled={!selector.fincaId || fincasLoading}
                  >
                    <option value="">Seleccionar cuartel</option>
                    {cuartelOptions.map((cuartel) => {
                      const id = String(cuartel.cuartel_id ?? cuartel.id ?? "");
                      return (
                        <option key={id} value={id}>
                          {cuartel.codigo_cuartel}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={onAddOrigen}
                    className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                  >
                    Agregar
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {origenes.length === 0 ? (
                    <p className="text-xs text-[#7A4A50]">Sin orígenes cargados.</p>
                  ) : (
                    origenes.map((origen) => (
                      <div
                        key={`${origen.fincaId}-${origen.cuartelId}`}
                        className="flex items-center justify-between rounded-lg border border-[#C9A961]/30 bg-white px-3 py-2 text-sm"
                      >
                        <span className="text-[#3D1B1F]">
                          {origen.fincaNombre} · Cuartel {origen.cuartelCodigo}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveOrigen(origen.fincaId, origen.cuartelId)}
                          className="text-xs font-semibold text-[#8B4049]"
                        >
                          Quitar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={saving}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creando producto…" : "Crear producto"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default NuevaTrazabilidadProducto;
