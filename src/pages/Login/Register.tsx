import { Formik, type FormikHelpers } from "formik";
import { Building2, Grape, Lock, Mail, User } from "lucide-react";
import * as Yup from "yup";
import { Link, useNavigate } from "react-router-dom";
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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C9A961] rounded-full mb-4">
            <Grape className="w-8 h-8 text-[#3D1B1F]" />
          </div>
          <h1 className="text-white font-bold text-3xl mb-2">Traza</h1>
          <p className="text-[#F5E6D3] text-sm">
            Trazabilidad Vitivinícola con Blockchain
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <h2 className="text-[#3D1B1F] text-2xl mb-6 text-center">
            Crear Cuenta
          </h2>

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
              <form onSubmit={handleSubmit} className="space-y-5">
                {(status || authError) && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
                    {status || authError}
                  </div>
                )}

                <div>
                  <label htmlFor="nombre" className="block text-sm text-[#722F37] mb-2">
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B4049]" />
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      value={values.nombre}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={[
                        "text-[#8B4049] w-full pl-10 pr-4 py-3 border-2 rounded-lg outline-none transition-colors",
                        touched.nombre && errors.nombre
                          ? "border-red-300 focus:border-red-500"
                          : "border-[#C9A961]/30 focus:border-[#722F37]",
                      ].join(" ")}
                      placeholder="Nombre y apellido"
                      autoComplete="name"
                    />
                  </div>
                  {touched.nombre && errors.nombre && (
                    <p className="mt-2 text-xs font-medium text-red-600">{errors.nombre}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm text-[#722F37] mb-2">
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
                    <p className="mt-2 text-xs font-medium text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm text-[#722F37] mb-2">
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
                        "text-[#8B4049] w-full pl-10 pr-4 py-3 border-2 rounded-lg outline-none transition-colors",
                        touched.password && errors.password
                          ? "border-red-300 focus:border-red-500"
                          : "border-[#C9A961]/30 focus:border-[#722F37]",
                      ].join(" ")}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                  {touched.password && errors.password && (
                    <p className="mt-2 text-xs font-medium text-red-600">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="bodegaId"
                    className="block text-sm text-[#722F37] mb-2"
                  >
                    ID de bodega
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B4049]" />
                    <input
                      id="bodegaId"
                      name="bodegaId"
                      type="text"
                      value={values.bodegaId}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={[
                        "text-[#8B4049] w-full pl-10 pr-4 py-3 border-2 rounded-lg outline-none transition-colors",
                        touched.bodegaId && errors.bodegaId
                          ? "border-red-300 focus:border-red-500"
                          : "border-[#C9A961]/30 focus:border-[#722F37]",
                      ].join(" ")}
                      placeholder="uuid o id de la bodega"
                      autoComplete="off"
                    />
                  </div>
                  {touched.bodegaId && errors.bodegaId && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.bodegaId}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm text-[#722F37] mb-2"
                  >
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B4049]" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={values.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={[
                        "text-[#8B4049] w-full pl-10 pr-4 py-3 border-2 rounded-lg outline-none transition-colors",
                        touched.confirmPassword && errors.confirmPassword
                          ? "border-red-300 focus:border-red-500"
                          : "border-[#C9A961]/30 focus:border-[#722F37]",
                      ].join(" ")}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={[
                    "w-full text-white py-3 rounded-lg transition-all duration-200",
                    "bg-primary",
                    isSubmitting
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:shadow-lg transform hover:scale-[1.02]",
                  ].join(" ")}
                >
                  {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
                </button>
              </form>
            )}
          </Formik>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              ¿Ya tenés cuenta?{" "}
              <Link
                to="/login"
                className="text-[#722F37] hover:text-[#8B4049] transition-colors font-medium"
              >
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-[#F5E6D3] text-xs">
            © 2026 Traza. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
