// Used by the Docker image — nginx proxies /api and /hubs to the API container (same origin).
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  hubUrl: '/hubs/readings',
};
