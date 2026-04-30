import { Formik, type FormikHelpers } from "formik";
import { Building2, Grape, Lock, Mail, User } from "lucide-react";
import * as Yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import { AppButton, AppCard, AppInput, NoticeBanner } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";

const RegisterSchema = Yup.object({
  nombre: Yup.string().min(2, "Mínimo 2 caracteres").required("El nombre es requerido"),
  email: Yup.string().email("Email inválido").required("El email es requerido"),
  password: Yup.string()
    .min(6, "Mínimo 6 caracteres")
    .required("La contraseña es requerida"),
  bodegaId: Yup.string().required("El ID de bodega es requerido"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Las contraseñas no coinciden")
    .required("Confirmá la contraseña"),
});

type RegisterFormValues = {
  nombre: string;
  email: string;
  password: string;
  bodegaId: string;
  confirmPassword: string;
};

const Register = () => {
  const register = useAuthStore((state) => state.register);
  const authError = useAuthStore((state) => state.error);
  const navigate = useNavigate();

  const handleSubmit = async (
    values: RegisterFormValues,
    { setSubmitting, setStatus }: FormikHelpers<RegisterFormValues>,
  ) => {
    try {
      setStatus(null);
      await register({
        nombre: values.nombre,
        email: values.email,
        password: values.password,
        bodegaId: values.bodegaId,
      });
      navigate("/dashboard");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "No se pudo crear la cuenta";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold rounded-full mb-4">
            <Grape className="w-8 h-8 text-wine" />
          </div>
          <h1 className="text-white font-bold text-3xl mb-2">Traza</h1>
          <p className="text-cream text-sm">
            Trazabilidad Vitivinícola con Blockchain
          </p>
        </div>

        <AppCard
          as="section"
          tone="soft"
          padding="lg"
          className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-shell-raised)] px-8 py-9 shadow-[var(--shadow-raised)] sm:px-10 sm:py-10"
          header={(
            <h2 className="text-center text-2xl text-wine sm:text-3xl">
            Crear Cuenta
            </h2>
          )}
        >

          <Formik
            initialValues={{
              nombre: "",
              email: "",
              password: "",
              bodegaId: "",
              confirmPassword: "",
            }}
            validationSchema={RegisterSchema}
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
                  id="nombre"
                  name="nombre"
                  type="text"
                  label={(
                    <span className="inline-flex items-center gap-2">
                      <User className="h-4 w-4 text-wine-light" aria-hidden="true" />
                      Nombre completo
                    </span>
                  )}
                  value={values.nombre}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Nombre y apellido"
                  autoComplete="name"
                  error={touched.nombre ? errors.nombre : undefined}
                  uiSize="lg"
                />

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
                  autoComplete="new-password"
                  error={touched.password ? errors.password : undefined}
                  uiSize="lg"
                />

                <AppInput
                  id="bodegaId"
                  name="bodegaId"
                  type="text"
                  label={(
                    <span className="inline-flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-wine-light" aria-hidden="true" />
                      ID de bodega
                    </span>
                  )}
                  value={values.bodegaId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="uuid o id de la bodega"
                  autoComplete="off"
                  error={touched.bodegaId ? errors.bodegaId : undefined}
                  uiSize="lg"
                />

                <AppInput
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  label={(
                    <span className="inline-flex items-center gap-2">
                      <Lock className="h-4 w-4 text-wine-light" aria-hidden="true" />
                      Confirmar contraseña
                    </span>
                  )}
                  value={values.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={touched.confirmPassword ? errors.confirmPassword : undefined}
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
                  {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
                </AppButton>
              </form>
            )}
          </Formik>

          <div className="text-center mt-8">
            <p className="text-sm text-[color:var(--text-ink-muted)]">
              ¿Ya tenés cuenta?{" "}
              <Link
                to="/login"
                className="text-wine hover:text-wine-light transition-colors font-medium"
              >
                Iniciar sesión
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

export default Register;
