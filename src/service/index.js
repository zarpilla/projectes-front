import axios from 'axios'

export default ({ requiresAuth = false } = {}) => {
  const options = {}
  options.baseURL = process.env.API_URL || 'http://localhost:1337'

  if (requiresAuth) {
    const userFromStorage = localStorage.getItem('user')
    if (userFromStorage) {
      const user = JSON.parse(userFromStorage)
      options.headers = { Authorization: `Bearer ${user.jwt}` }
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
