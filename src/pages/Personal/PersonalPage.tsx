import { useCallback, useEffect, useMemo, useState } from "react";
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
import { fetchOperariosByBodega, type Operario } from "../../features/operarios/api";
import {
  createPersonal,
  deletePersonal,
  fetchPersonal,
  patchPersonal,
  type ModalidadPago,
  type Personal,
  type RolManoObra,
  type TipoPersonal,
} from "../../features/personal/api";

const ROLES: { value: RolManoObra; label: string }[] = [
  { value: "operario", label: "Operario" },
  { value: "tractorista", label: "Tractorista" },
  { value: "aplicador", label: "Aplicador" },
  { value: "tecnico", label: "Técnico" },
  { value: "encargado", label: "Encargado" },
  { value: "contratista", label: "Contratista" },
];

const EMPTY = {
  nombre: "",
  targetUserId: "",
  tipo: "interno" as TipoPersonal,
  modalidad: "por_hora" as ModalidadPago,
  rol: "operario" as RolManoObra,
  sueldo_mensual: "",
  costo_hora: "",
  dias_mes: "25",
};

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);
}

export default function PersonalPage() {
  const { notifySuccess, notifyError } = useAppNotifications();
  const bodegaId = useAuthStore((state) => state.activeBodegaId);

  const [personal, setPersonal] = useState<Personal[]>([]);
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!bodegaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [p, ops] = await Promise.all([
        fetchPersonal(bodegaId),
        fetchOperariosByBodega(bodegaId).catch(() => [] as Operario[]),
      ]);
      setPersonal(p);
      setOperarios(ops);
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

  // Costo/hora derivado en vivo (mensual) o directo (por hora).
  const costoHoraPreview = useMemo(() => {
    if (form.modalidad === "mensual") {
      const s = num(form.sueldo_mensual);
      const d = Number(form.dias_mes) || 25;
      if (!s || s <= 0) return null;
      return Math.round((s / d / 8) * 100) / 100;
    }
    return num(form.costo_hora);
  }, [form.modalidad, form.sueldo_mensual, form.dias_mes, form.costo_hora]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const yaConLegajo = useMemo(() => new Set(personal.map((p) => p.user_id)), [personal]);

  const handleSave = async () => {
    if (!bodegaId) return;
    if (!form.nombre.trim()) {
      notifyError({ title: "Falta el nombre" });
      return;
    }
    setSaving(true);
    try {
      const cost = {
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        modalidad: form.modalidad,
        rol: form.rol,
        sueldo_mensual: form.modalidad === "mensual" ? num(form.sueldo_mensual) : null,
        costo_hora: form.modalidad === "por_hora" ? num(form.costo_hora) : null,
        dias_mes: Number(form.dias_mes) || 25,
      };
      if (editingId) {
        await patchPersonal(editingId, cost);
        notifySuccess({ title: "Legajo actualizado" });
      } else {
        await createPersonal({
          bodegaId,
          ...cost,
          ...(form.targetUserId ? { targetUserId: form.targetUserId } : {}),
        });
        notifySuccess({ title: "Personal agregado" });
      }
      resetForm();
      await load();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p: Personal) => {
    setEditingId(p.personal_bodega_id);
    setForm({
      nombre: p.nombre,
      targetUserId: p.user_id ?? "",
      tipo: p.tipo,
      modalidad: p.modalidad,
      rol: (p.rol ?? "operario") as RolManoObra,
      sueldo_mensual: p.sueldo_mensual ?? "",
      costo_hora: p.costo_hora ?? "",
      dias_mes: String(p.dias_mes ?? 25),
    });
  };

  const remove = async (p: Personal) => {
    try {
      await deletePersonal(p.personal_bodega_id);
      notifySuccess({ title: "Legajo eliminado" });
      await load();
    } catch (e) {
      notifyError({ title: "Error", message: getApiErrorMessage(e) });
    }
  };

  if (!bodegaId) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <SectionIntro title="Personal" />
          <NoticeBanner tone="warning">Seleccioná una bodega para administrar el personal.</NoticeBanner>
        </div>
      </div>
    );
  }

  const usuariosDisponibles = operarios.filter((o) => editingId || !yaConLegajo.has(o.user_id));

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          eyebrow="Bodega"
          title="Personal"
          description="Legajo de costos del personal: modalidad de pago (mensual o por hora), interno/externo y rol. Estos costos alimentan la mano de obra de cada actividad."
        />

        {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}

        <AppCard header={<h3 className="text-base font-semibold">{editingId ? "Editar legajo" : "Agregar personal"}</h3>}>
          <div className="grid gap-3 md:grid-cols-3">
            <AppInput label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre y apellido" />
            {!editingId ? (
              <AppSelect label="Vincular a usuario (opcional)" value={form.targetUserId} onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}>
                <option value="">Sin vincular</option>
                {usuariosDisponibles.map((o) => (
                  <option key={o.user_id} value={o.user_id}>{o.nombre}</option>
                ))}
              </AppSelect>
            ) : null}
            <AppSelect label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPersonal })}>
              <option value="interno">Interno</option>
              <option value="externo">Externo</option>
            </AppSelect>
            <AppSelect label="Rol" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as RolManoObra })}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </AppSelect>
            <AppSelect label="Modalidad de pago" value={form.modalidad} onChange={(e) => setForm({ ...form, modalidad: e.target.value as ModalidadPago })}>
              <option value="por_hora">Por hora</option>
              <option value="mensual">Mensualizado</option>
            </AppSelect>
            {form.modalidad === "mensual" ? (
              <>
                <AppInput label="Sueldo mensual" type="number" value={form.sueldo_mensual} onChange={(e) => setForm({ ...form, sueldo_mensual: e.target.value })} />
                <AppInput label="Días por mes (jornales)" type="number" value={form.dias_mes} onChange={(e) => setForm({ ...form, dias_mes: e.target.value })} />
              </>
            ) : (
              <AppInput label="Costo por hora" type="number" value={form.costo_hora} onChange={(e) => setForm({ ...form, costo_hora: e.target.value })} />
            )}
          </div>
          {costoHoraPreview != null ? (
            <p className="mt-3 text-xs text-[color:var(--text-ink-muted)]">
              Costo/hora efectivo: <span className="font-semibold text-[color:var(--text-ink)]">{money(costoHoraPreview)}</span>
              {form.modalidad === "mensual" ? ` (jornal ${money(costoHoraPreview * 8)})` : ""}
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <AppButton variant="primary" loading={saving} onClick={() => void handleSave()}>
              {editingId ? "Guardar cambios" : "Agregar"}
            </AppButton>
            {editingId ? <AppButton variant="ghost" onClick={resetForm}>Cancelar</AppButton> : null}
          </div>
        </AppCard>

        <AppCard header={<h3 className="text-base font-semibold">Personal de la bodega</h3>}>
          {loading ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Cargando…</p>
          ) : personal.length === 0 ? (
            <p className="text-sm text-[color:var(--text-ink-muted)]">Todavía no hay personal cargado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                    <th className="py-2 pr-3">Persona</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Rol</th>
                    <th className="py-2 pr-3">Modalidad</th>
                    <th className="py-2 pr-3 text-right">Costo/hora</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {personal.map((p) => (
                    <tr key={p.personal_bodega_id} className={`border-t border-[color:var(--border-shell)] ${p.activo ? "" : "opacity-50"}`}>
                      <td className="py-2 pr-3">{p.nombre}{!p.activo ? <span className="ml-2 text-[10px] uppercase text-[color:var(--text-ink-muted)]">inactivo</span> : null}</td>
                      <td className="py-2 pr-3 capitalize">{p.tipo}</td>
                      <td className="py-2 pr-3 capitalize">{p.rol ?? "—"}</td>
                      <td className="py-2 pr-3">{p.modalidad === "mensual" ? `Mensual (${money(Number(p.sueldo_mensual ?? 0))})` : "Por hora"}</td>
                      <td className="py-2 pr-3 text-right">{money(p.costo_hora_efectivo)}</td>
                      <td className="py-2 text-right">
                        <div className="inline-flex gap-1">
                          <AppButton variant="ghost" size="sm" onClick={() => startEdit(p)}>Editar</AppButton>
                          <AppButton variant="ghost" size="sm" onClick={() => void remove(p)}>Borrar</AppButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
}
