import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { ApiError } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || "30000", 10);

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: API_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = Cookies.get("access_token");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = Cookies.get("refresh_token");
            if (!refreshToken) {
              throw new Error("No refresh token available");
            }

            const response = await axios.post(
              `${API_URL}/api/v1/auth/token/refresh/`,
              { refresh: refreshToken }
            );

            const { access } = response.data;
            Cookies.set("access_token", access, { expires: 1 / 24 });
            Cookies.set("refresh_token", refreshToken, { expires: 7 });

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access}`;
            }

            return this.client(originalRequest);
          } catch (refreshError) {
            Cookies.remove("access_token");
            Cookies.remove("refresh_token");
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      const data = error.response.data as ApiError;
      return {
        message: data?.message || "An error occurred",
        statusCode: error.response.status,
        code: data?.code,
        details: data?.details,
      };
    } else if (error.request) {
      return {
        message: "No response from server. Please check your connection.",
        statusCode: 0,
      };
    } else {
      return {
        message: error.message || "An unexpected error occurred",
        statusCode: 0,
      };
    }
  }

  public getInstance(): AxiosInstance {
    return this.client;
  }

  public get<T = unknown>(url: string, config?: object): Promise<T> {
    return this.client.get(url, config).then((res) => res.data);
  }

  public post<T = unknown>(url: string, data?: unknown, config?: object): Promise<T> {
    return this.client.post(url, data, config).then((res) => res.data);
  }

  public put<T = unknown>(url: string, data?: unknown, config?: object): Promise<T> {
    return this.client.put(url, data, config).then((res) => res.data);
  }

  public patch<T = unknown>(url: string, data?: unknown, config?: object): Promise<T> {
    return this.client.patch(url, data, config).then((res) => res.data);
  }

  public delete<T = unknown>(url: string, config?: object): Promise<T> {
    return this.client.delete(url, config).then((res) => res.data);
  }
}

export const apiClient = new ApiClient();
export default apiClient.getInstance();
