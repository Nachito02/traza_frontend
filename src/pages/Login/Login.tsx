import { Formik, type FormikHelpers } from "formik";
import { Grape, Lock, Mail } from "lucide-react";
import * as Yup from "yup";
import { useAuthStore } from "../../store/authStore";
import { redirect, useNavigate } from "react-router-dom";

const LoginSchema = Yup.object({
  email: Yup.string().email("Email inválido").required("El email es requerido"),
  password: Yup.string()
    .min(6, "Mínimo 6 caracteres")
    .required("La contraseña es requerida"),
});

const Login = () => {
  const login = useAuthStore((state) => state.login);
  const authError = useAuthStore((state) => state.error);

  const navigate = useNavigate();

  const handleSubmit = async (
    values: { email: string; password: string },
    { setSubmitting, setStatus }: FormikHelpers<{
      email: string;
      password: string;
    }>
  ) => {
    try {
      setStatus(null);
      await login(values.email, values.password);
      setSubmitting(false);

     navigate("/dashboard");

    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Usuario o contraseña incorrectos";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#3D1B1F] via-[#722F37] to-[#8B4049] p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C9A961] rounded-full mb-4">
            <Grape className="w-8 h-8 text-[#3D1B1F]" />
          </div>
          <h1 className="text-white text-3xl mb-2">Traza</h1>
          <p className="text-[#F5E6D3] text-sm">
            Trazabilidad Vitivinícola con Blockchain
          </p>
        </div>

        {/* Formulario de login */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <h2 className="text-[#3D1B1F] text-2xl mb-6 text-center">
            Iniciar Sesión
          </h2>

          <Formik
            initialValues={{ email: "", password: "" }}
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
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
                    {status || authError}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm text-[#722F37] mb-2"
                  >
                    Correo Electrónico
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B4049]" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={[
                        "text-[#8B4049] w-full pl-10 pr-4 py-3 border-2 rounded-lg outline-none transition-colors",
                        touched.email && errors.email
                          ? "border-red-300 focus:border-red-500"
                          : "border-[#C9A961]/30 focus:border-[#722F37]",
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
                  <label
                    htmlFor="password"
                    className="block text-sm text-[#722F37] mb-2"
                  >
                    Contraseña
                  </label>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B4049]" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={[
                        " text-[#8B4049] w-full pl-10 pr-4 py-3 border-2 rounded-lg outline-none transition-colors",
                        touched.password && errors.password
                          ? "border-red-300 focus:border-red-500"
                          : "border-[#C9A961]/30 focus:border-[#722F37]",
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

                {/* Olvidé mi contraseña */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-[#8B4049] hover:text-[#722F37] transition-colors"
                    onClick={() => {
                      // TODO: navegar a /forgot-password o abrir modal
                    }}
                  >
                    {/* ¿Olvidaste tu contraseña? */}
                  </button>
                </div>

                {/* Botón de submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={[
                    "w-full text-white py-3 rounded-lg transition-all duration-200",
                    "bg-gradient-to-r from-[#722F37] to-[#8B4049]",
                    isSubmitting
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:shadow-lg transform hover:scale-[1.02]",
                  ].join(" ")}
                >
                  {isSubmitting ? "Ingresando…" : "Iniciar Sesión"}
                </button>
              </form>
            )}
          </Formik>

          {/* Separador */}
          {/* <div className="flex items-center my-6">
            <div className="flex-1 border-t border-[#C9A961]/30" />
            <span className="px-4 text-sm text-gray-500">o</span>
            <div className="flex-1 border-t border-[#C9A961]/30" />
          </div> */}

          {/* Registro */}
          {/* <div className="text-center">
            <p className="text-gray-600 text-sm">
              ¿No tienes una cuenta?{" "}
              <button
                type="button"
                // onClick={}
                className="text-[#722F37] hover:text-[#8B4049] transition-colors font-medium"
              >
                Regístrate aquí
              </button>
            </p>
          </div> */}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[#F5E6D3] text-xs">
            © 2026 Traza. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
