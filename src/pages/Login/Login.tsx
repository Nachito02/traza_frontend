import { Formik } from "formik";
import { Lock, Mail } from "lucide-react";
import * as Yup from "yup";
import { Link } from "react-router-dom";
import trazaLogo from "../../assets/traza_logo_02.png";
import { AppButton, AppCard, AppInput, NoticeBanner } from "../../components/ui";
import { useLogin, type LoginValues } from "../../hooks/useLogin";

const LoginSchema = Yup.object({
  email: Yup.string().email("Email inválido").required("El email es requerido"),
  password: Yup.string()
    .min(6, "Mínimo 6 caracteres")
    .required("La contraseña es requerida"),
});

const INITIAL_VALUES: LoginValues = { email: "", password: "" };

const Login = () => {
  const { handleSubmit, authError } = useLogin();

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="w-full max-w-lg">
        <div className="mb-10 mt-3 text-center">
          <div className="mx-auto mb-5 inline-flex w-full max-w-sm items-center justify-center rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--brand-white)] px-6 py-4 shadow-[var(--shadow-raised)]">
            <img src={trazaLogo} alt="Traza" className="h-auto w-full max-w-[280px] object-contain" />
          </div>
          <p className="text-cream text-sm">
            Plataforma de trazabilidad vitivinícola
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-gold/40  px-3 py-1 text-xs text-cream">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Asegurada en blockchain
          </div>
        </div>

        <AppCard
          as="section"
          tone="soft"
          padding="lg"
          className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-shell-raised)] px-8 py-9 shadow-[var(--shadow-raised)] sm:px-10 sm:py-10"
          header={(
            <h2 className="text-center text-2xl text-wine sm:text-3xl">
            Iniciar Sesión
            </h2>
          )}
        >

          <Formik
            initialValues={INITIAL_VALUES}
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              handleSubmit,
              isSubmitting,
              status,
            }) => (
              <form onSubmit={handleSubmit} className="space-y-6">
                {(status || authError) && (
                  <NoticeBanner tone="danger" role="alert" className="text-center font-medium">
                    {status || authError}
                  </NoticeBanner>
                )}

                <AppInput
                  id="email"
                  name="email"
                  type="email"
                  label={(
                    <span className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4 text-wine-light" aria-hidden="true" />
                      Correo Electrónico
                    </span>
                  )}
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  error={touched.email ? errors.email : undefined}
                  uiSize="lg"
                />

                <AppInput
                  id="password"
                  name="password"
                  type="password"
                  label={(
                    <span className="inline-flex items-center gap-2">
                      <Lock className="h-4 w-4 text-wine-light" aria-hidden="true" />
                      Contraseña
                    </span>
                  )}
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={touched.password ? errors.password : undefined}
                  uiSize="lg"
                />

                <AppButton
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="lg"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? "Ingresando…" : "Iniciar Sesión"}
                </AppButton>
              </form>
            )}
          </Formik>

          <div className="mt-8 text-center">
            <p className="text-sm text-[color:var(--text-ink-muted)]">
              ¿No tenés una cuenta?{" "}
              <Link
                to="/registro"
                className="text-wine hover:text-wine-light transition-colors font-medium"
              >
                Registrate acá
              </Link>
            </p>
          </div>
        </AppCard>

        <div className="text-center mt-8">
          <p className="text-cream text-xs">
            © 2026 Traza. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
