import { useCallback, useEffect, useState } from "react";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import {
  createTarifaCombustible,
  createTarifaMaquinaria,
  deleteTarifaCombustible,
  deleteTarifaMaquinaria,
  fetchTarifasCombustible,
  fetchTarifasMaquinaria,
  formatMoney,
  type ClaseMaquinaria,
  type TarifaCombustible,
  type TarifaMaquinaria,
  type TipoCombustible,
} from "../../features/costos/api";

const CLASES: { value: ClaseMaquinaria; label: string }[] = [
  { value: "motriz", label: "Motriz" },
  { value: "implemento", label: "Implemento" },
];
const TIPOS_COMB: { value: TipoCombustible; label: string }[] = [
  { value: "gasoil", label: "Gasoil" },
  { value: "nafta", label: "Nafta" },
  { value: "electricidad", label: "Electricidad" },
  { value: "glp", label: "GLP" },
  { value: "otro", label: "Otro" },
];

export default function TarifasPage() {
  const { notifySuccess, notifyError } = useAppNotifications();
  const bodegaId = useAuthStore((state) => state.activeBodegaId);

  const [maquinaria, setMaquinaria] = useState<TarifaMaquinaria[]>([]);
  const [combustible, setCombustible] = useState<TarifaCombustible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forms
  const [mq, setMq] = useState({ nombre: "", clase: "motriz" as ClaseMaquinaria, costo_hora: "", consumo_lts_hora: "" });
  const [cb, setCb] = useState({ tipo: "gasoil" as TipoCombustible, costo_unitario: "", unidad: "lt" });

  const load = useCallback(async () => {
    if (!bodegaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [b, c] = await Promise.all([
        fetchTarifasMaquinaria(bodegaId),
        fetchTarifasCombustible(bodegaId),
      ]);
      setMaquinaria(b);
      setCombustible(c);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [bodegaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const num = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const addMaquinaria = async () => {
    if (!bodegaId) return;
    const costo = num(mq.costo_hora);
    if (!mq.nombre.trim() || costo === null) {
      notifyError({ title: "Faltan datos", message: "Nombre y costo por hora son obligatorios." });
      return;
    }
    try {
      await createTarifaMaquinaria({
        bodegaId,
        nombre: mq.nombre.trim(),
        clase: mq.clase,
        costo_hora: costo,
        consumo_lts_hora: num(mq.consumo_lts_hora),
      });
      setMq({ nombre: "", clase: "motriz", costo_hora: "", consumo_lts_hora: "" });
      notifySuccess({ title: "Tarifa creada" });
      await load();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  const addCombustible = async () => {
    if (!bodegaId) return;
    const costo = num(cb.costo_unitario);
    if (costo === null) {
      notifyError({ title: "Falta el costo unitario" });
      return;
    }
    try {
      await createTarifaCombustible({ bodegaId, tipo: cb.tipo, costo_unitario: costo, unidad: cb.unidad.trim() || "lt" });
      setCb({ tipo: "gasoil", costo_unitario: "", unidad: "lt" });
      notifySuccess({ title: "Tarifa creada" });
      await load();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  const removeMaquinaria = async (id: string) => {
    try {
      await deleteTarifaMaquinaria(id);
      await load();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };
  const removeCombustible = async (id: string) => {
    try {
      await deleteTarifaCombustible(id);
      await load();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  if (!bodegaId) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <SectionIntro title="Tarifas de costos" />
          <NoticeBanner tone="warning">Seleccioná una bodega para administrar sus tarifas.</NoticeBanner>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
      <SectionIntro
        eyebrow="Costos"
        title="Tarifas de costos"
        description="Precios de mano de obra, maquinaria y combustible usados para costear las actividades."
      />

      {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}
      {loading ? <p className="text-sm text-[color:var(--text-ink-muted)]">Cargando…</p> : null}

      <NoticeBanner tone="info">
        La mano de obra ahora se gestiona desde <strong>Bodega → Personal</strong> (sueldo o costo por hora, por persona).
      </NoticeBanner>

      {/* Maquinaria */}
      <AppCard header={<h3 className="text-base font-semibold">Maquinaria e implementos</h3>}>
        <ul className="mb-3 space-y-2">
          {maquinaria.map((t) => (
            <li key={t.tarifa_maquinaria_id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm">
              <span>
                <strong>{t.nombre}</strong> · {t.clase} · {formatMoney(t.costo_hora)} / h
                {t.consumo_lts_hora ? ` · ${t.consumo_lts_hora} lt/h` : ""}
              </span>
              <AppButton variant="ghost" size="sm" onClick={() => void removeMaquinaria(t.tarifa_maquinaria_id)}>Quitar</AppButton>
            </li>
          ))}
          {maquinaria.length === 0 && !loading ? <p className="text-xs text-[color:var(--text-ink-muted)]">Sin tarifas.</p> : null}
        </ul>
        <div className="grid gap-3 md:grid-cols-4">
          <AppInput label="Nombre" value={mq.nombre} onChange={(e) => setMq({ ...mq, nombre: e.target.value })} />
          <AppSelect label="Clase" value={mq.clase} onChange={(e) => setMq({ ...mq, clase: e.target.value as ClaseMaquinaria })}>
            {CLASES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </AppSelect>
          <AppInput label="Costo hora" type="number" value={mq.costo_hora} onChange={(e) => setMq({ ...mq, costo_hora: e.target.value })} />
          <AppInput label="Consumo lt/h (motriz)" type="number" value={mq.consumo_lts_hora} onChange={(e) => setMq({ ...mq, consumo_lts_hora: e.target.value })} />
        </div>
        <div className="mt-3"><AppButton variant="primary" onClick={() => void addMaquinaria()}>Agregar</AppButton></div>
      </AppCard>

      {/* Combustible */}
      <AppCard header={<h3 className="text-base font-semibold">Combustible y energía</h3>}>
        <ul className="mb-3 space-y-2">
          {combustible.map((t) => (
            <li key={t.tarifa_combustible_id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-shell)] px-3 py-2 text-sm">
              <span>
                <strong className="capitalize">{t.tipo}</strong> · {formatMoney(t.costo_unitario)} / {t.unidad}
              </span>
              <AppButton variant="ghost" size="sm" onClick={() => void removeCombustible(t.tarifa_combustible_id)}>Quitar</AppButton>
            </li>
          ))}
          {combustible.length === 0 && !loading ? <p className="text-xs text-[color:var(--text-ink-muted)]">Sin tarifas.</p> : null}
        </ul>
        <div className="grid gap-3 md:grid-cols-3">
          <AppSelect label="Tipo" value={cb.tipo} onChange={(e) => setCb({ ...cb, tipo: e.target.value as TipoCombustible })}>
            {TIPOS_COMB.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </AppSelect>
          <AppInput label="Costo unitario" type="number" value={cb.costo_unitario} onChange={(e) => setCb({ ...cb, costo_unitario: e.target.value })} />
          <AppInput label="Unidad" value={cb.unidad} onChange={(e) => setCb({ ...cb, unidad: e.target.value })} />
        </div>
        <div className="mt-3"><AppButton variant="primary" onClick={() => void addCombustible()}>Agregar</AppButton></div>
      </AppCard>
      </div>
    </div>
  );
}
