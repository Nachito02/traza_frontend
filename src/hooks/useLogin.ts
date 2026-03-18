import type { FormikHelpers } from "formik";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export type LoginValues = { email: string; password: string };

export const useLogin = () => {
  const login = useAuthStore((state) => state.login);
  const mustChangePasswordUserId = useAuthStore((state) => state.mustChangePasswordUserId);
  const authError = useAuthStore((state) => state.error);
  const navigate = useNavigate();

  const handleSubmit = async (
    values: LoginValues,
    { setSubmitting, setStatus }: FormikHelpers<LoginValues>
  ) => {
    try {
      setStatus(null);
      await login(values.email, values.password);
      if (useAuthStore.getState().mustChangePasswordUserId) {
        navigate("/cambiar-password");
      } else {
        navigate("/dashboard");
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Usuario o contraseña incorrectos";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  };

  return { handleSubmit, authError, mustChangePasswordUserId };
};
