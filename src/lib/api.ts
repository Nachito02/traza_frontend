import axios, { type AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

type ApiError = {
  error?: string;
  message?: string;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    const status = axiosError.response?.status;
    if (status === 401 || status === 403) {
      return "Usuario o contraseña incorrectos";
    }
    return (
      axiosError.response?.data?.error ||
      axiosError.response?.data?.message ||
      axiosError.message
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Error inesperado";
}
