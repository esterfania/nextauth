import axios, { AxiosError } from 'axios';
import { parseCookies } from 'nookies';
import { setTokens } from '../contexts/AuthContext';
type Request = {
  onSuccess: (token: string) => void;
  onFailed: (err: AxiosError) => void;
};
let cookies = parseCookies();
let isRefreshing = false;
let failedRequestQueue: Request[] = [];

export const api = axios.create({
  baseURL: 'http://localhost:3333',
  headers: {
    Authorization: `Bearer ${cookies['auth.token']}`,
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response.status === 401) {
      if (error.response.data?.code === 'token.expired') {
        cookies = parseCookies();

        const { 'auth.refreshToken': refreshToken } = cookies;
        const originalConfig = error.config;
        if (!isRefreshing) {
          isRefreshing = true;
          api
            .post('/refresh', {
              refreshToken,
            })
            .then((res) => {
              const { token, refreshToken } = res.data;

              setTokens({ token, refreshToken });

              failedRequestQueue.forEach((request) => request.onSuccess(token));
              failedRequestQueue = [];
            })
            .catch((err: AxiosError) => {
              failedRequestQueue.forEach((request) => request.onFailed(err));
              failedRequestQueue = [];
            })
            .finally(() => {
              isRefreshing = false;
            });
        }
        return new Promise((resolve, reject) => {
          failedRequestQueue.push({
            onSuccess: (token: string) => {
              originalConfig.headers['Authorization'] = `Bearer ${token}`;
              resolve(api(originalConfig));
            },
            onFailed: (err: AxiosError) => {
              reject(err);
            },
          });
        });
      } else {
        //deslogar usuario
      }
    }
  }
);
