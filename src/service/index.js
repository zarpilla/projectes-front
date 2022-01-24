import axios from 'axios'

export default ({ requiresAuth = false } = {}) => {
  const options = {}
  options.baseURL = process.env.VUE_APP_API_URL || 'http://localhost:1337'

  if (requiresAuth) {
    const jwt = sessionStorage.getItem('jwt')
    if (jwt) {
      // const user = JSON.parse(userFromStorage)
      options.headers = { Authorization: `Bearer ${jwt}` }
    }
  }
  const instance = axios.create(options)

  instance.interceptors.response.use(response => {
    // console.log('good boy!')
    return response
  }, error => {
    return Promise.reject(error)
  })
  return instance
}
