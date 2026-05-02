import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import trazaLogo from "../../assets/traza_logo_02.png";
import { AppButton, AppCard, AppInput, NoticeBanner } from "../../components/ui";

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
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-dark rounded-full mb-4">
            <img src={trazaLogo} alt="Traza" className="h-10 w-auto object-contain" />
          </div>
          <p className="text-cream text-sm">Primera vez que ingresás</p>
        </div>

        <AppCard
          as="section"
          tone="soft"
          padding="lg"
          className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-shell-raised)] px-8 py-9 shadow-[var(--shadow-raised)] sm:px-10 sm:py-10"
          header={(
            <div className="text-center">
              <h2 className="text-2xl text-wine sm:text-3xl">Activar cuenta</h2>
              <p className="mt-2 text-sm text-[color:var(--text-ink-muted)]">
                Ingresá la contraseña temporal que recibiste por WhatsApp y elegí una nueva.
              </p>
            </div>
          )}
        >

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            {error && (
              <NoticeBanner tone="danger" className="text-center font-medium">
                {error}
              </NoticeBanner>
            )}

            <AppInput
              id="currentPassword"
              type="password"
              label={(
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4 text-wine-light" />
                  Contraseña temporal
                </span>
              )}
              value={form.currentPassword}
              onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
              placeholder="Contraseña recibida por WhatsApp"
              autoComplete="current-password"
              required
              uiSize="lg"
            />

            <AppInput
              id="newPassword"
              type="password"
              label={(
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4 text-wine-light" />
                  Nueva contraseña
                </span>
              )}
              value={form.newPassword}
              onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
              uiSize="lg"
            />

            <AppInput
              id="confirm"
              type="password"
              label={(
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4 text-wine-light" />
                  Confirmar nueva contraseña
                </span>
              )}
              value={form.confirm}
              onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="Repetí la nueva contraseña"
              autoComplete="new-password"
              required
              uiSize="lg"
            />

            <AppButton
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              disabled={saving}
              loading={saving}
            >
              {saving ? "Guardando…" : "Activar cuenta"}
            </AppButton>
          </form>
        </AppCard>

        <div className="text-center mt-8">
          <p className="text-cream text-xs">© 2026 Traza. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
