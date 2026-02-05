import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCampania } from "../../features/campanias/api";

const SetupCampania = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: "",
    fecha_inicio: "",
    fecha_fin: "",
    estado: "abierta",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateDates = () => {
    if (!form.fecha_inicio || !form.fecha_fin) return true;
    return new Date(form.fecha_fin) > new Date(form.fecha_inicio);
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      setError("El nombre de la campaña es obligatorio.");
      return;
    }
    if (!form.fecha_inicio || !form.fecha_fin) {
      setError("Fecha inicio y fin son obligatorias.");
      return;
    }
    if (!validateDates()) {
      setError("La fecha fin debe ser posterior a la fecha inicio.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createCampania({
        nombre: form.nombre.trim(),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        estado: "abierta",
      });
      navigate("/setup/cuarteles");
    } catch {
      setError("No se pudo crear la campaña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <h1 className="text-2xl text-[#3D1B1F]">Crear campaña</h1>
        <p className="mt-2 text-sm text-[#6B3A3F]">
          Paso 2 de 4 del setup guiado.
        </p>

        <form className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-[#722F37] mb-2">
              Nombre de la campaña
            </label>
            <input
              type="text"
              className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
              placeholder="Campaña 2025"
              value={form.nombre}
              onChange={(e) => onChange("nombre", e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Fecha inicio
              </label>
              <input
                type="date"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                value={form.fecha_inicio}
                onChange={(e) => onChange("fecha_inicio", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Fecha fin
              </label>
              <input
                type="date"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                value={form.fecha_fin}
                onChange={(e) => onChange("fecha_fin", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar campaña"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupCampania;
