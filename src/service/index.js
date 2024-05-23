import axios from 'axios'

const cache = {}

export default ({ requiresAuth = false, multipart = false, cached = false } = {}) => {
  const options = {}
  options.baseURL = process.env.VUE_APP_API_URL || 'http://localhost:1337'

  if (requiresAuth) {
    const jwt = localStorage.getItem('jwt')
    if (jwt) {
      options.headers = { Authorization: `Bearer ${jwt}` }
    }
  }
  if (multipart) {
    options.headers = options.headers || {}
    options.headers['Content-Type'] = 'multipart/form-data'
  }
  const instance = axios.create(options)

  instance.interceptors.request.use(config => {
    if (cached && cache[config.url]) {
      return Promise.reject(new axios.Cancel(config.url));
    }
    return config;
  }, error => {
    return Promise.reject(error);
  });

  instance.interceptors.response.use(response => {
    if (cached) {
      cache[response.config.url] = response;
    }
    return response;
  }, error => {
    if (axios.isCancel(error)) {
      console.log('Request cancelled', error.message);
      return cache[error.message];
    }
    return Promise.reject({ ...error, data: error.response ? error.response.data : null });
  });

  return instance;
}