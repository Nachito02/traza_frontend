import { Formik } from "formik";
import { Lock, Mail } from "lucide-react";
import * as Yup from "yup";
import { Link } from "react-router-dom";
import trazaLogo from "../../assets/traza.png";
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
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-dark rounded-full mb-4">
            <img src={trazaLogo} alt="Traza" className="h-10 w-auto object-contain" />
          </div>
          <p className="text-cream text-sm">
            Plataforma de trazabilidad vitivinícola
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-dark/70 px-3 py-1 text-xs text-cream">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Asegurada en blockchain
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8">
          <h2 className="text-wine text-xl sm:text-2xl mb-6 text-center">
            Iniciar Sesión
          </h2>

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
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error de autenticación */}
                {(status || authError) && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700"
                  >
                    {status || authError}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm text-wine mb-2">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wine-light" aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={[
                        "text-wine-light w-full pl-10 pr-4 py-3 border-2 rounded-lg outline-none transition-colors",
                        touched.email && errors.email
                          ? "border-red-300 focus:border-red-500"
                          : "border-gold/30 focus:border-wine",
                      ].join(" ")}
                      placeholder="tu@email.com"
                      autoComplete="email"
                    />
                  </div>
                  {touched.email && errors.email && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Contraseña */}
                <div>
                  <label htmlFor="password" className="block text-sm text-wine mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wine-light" aria-hidden="true" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={[
                        "text-wine-light w-full pl-10 pr-4 py-3 border-2 rounded-lg outline-none transition-colors",
                        touched.password && errors.password
                          ? "border-red-300 focus:border-red-500"
                          : "border-gold/30 focus:border-wine",
                      ].join(" ")}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                  {touched.password && errors.password && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Botón de submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={[
                    "w-full text-white py-3 rounded-lg transition-all duration-200 bg-primary",
                    isSubmitting
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:shadow-lg hover:scale-[1.02]",
                  ].join(" ")}
                >
                  {isSubmitting ? "Ingresando…" : "Iniciar Sesión"}
                </button>
              </form>
            )}
          </Formik>

          <div className="text-center mt-6">
            <p className="text-gray-600 text-sm">
              ¿No tenés una cuenta?{" "}
              <Link
                to="/registro"
                className="text-wine hover:text-wine-light transition-colors font-medium"
              >
                Registrate acá
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-cream text-xs">
            © 2026 Traza. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
