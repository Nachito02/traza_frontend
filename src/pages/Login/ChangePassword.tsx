import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import trazaLogo from "../../assets/traza.png";

const ChangePassword = () => {
  const navigate = useNavigate();
  const changePassword = useAuthStore((state) => state.changePassword);
  const userId = useAuthStore((state) => state.mustChangePasswordUserId);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError("Sesión inválida. Volvé a iniciar sesión.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await changePassword(userId, form.currentPassword, form.newPassword);
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-dark rounded-full mb-4">
            <img src={trazaLogo} alt="Traza" className="h-10 w-auto object-contain" />
          </div>
          <p className="text-cream text-sm">Primera vez que ingresás</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8">
          <h2 className="text-wine text-xl sm:text-2xl mb-2 text-center">Activar cuenta</h2>
          <p className="text-center text-sm text-gray-500 mb-6">
            Ingresá la contraseña temporal que recibiste por WhatsApp y elegí una nueva.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="currentPassword" className="block text-sm text-wine mb-2">
                Contraseña temporal
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wine-light" />
                <input
                  id="currentPassword"
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  className="text-wine-light w-full pl-10 pr-4 py-3 border-2 border-gold/30 rounded-lg outline-none transition-colors focus:border-wine"
                  placeholder="Contraseña recibida por WhatsApp"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm text-wine mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wine-light" />
                <input
                  id="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className="text-wine-light w-full pl-10 pr-4 py-3 border-2 border-gold/30 rounded-lg outline-none transition-colors focus:border-wine"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm text-wine mb-2">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wine-light" />
                <input
                  id="confirm"
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                  className="text-wine-light w-full pl-10 pr-4 py-3 border-2 border-gold/30 rounded-lg outline-none transition-colors focus:border-wine"
                  placeholder="Repetí la nueva contraseña"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className={[
                "w-full text-white py-3 rounded-lg transition-all duration-200 bg-primary",
                saving ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg hover:scale-[1.02]",
              ].join(" ")}
            >
              {saving ? "Guardando…" : "Activar cuenta"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-cream text-xs">© 2026 Traza. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
