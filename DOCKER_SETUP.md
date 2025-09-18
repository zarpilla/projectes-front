# Docker Configuration for Vue.js Application

This setup allows the Vue.js application to use runtime configuration instead of build-time environment variables, enabling the same Docker image to be used across different environments.

## How it works

1. **Build Time**: The application is built with fallback development values
2. **Runtime**: Docker injects environment variables into a `config.js` file
3. **Application**: The app checks for runtime config first, falls back to build-time values

## Files Overview

### Core Configuration Files

- `public/config.js` - Development fallback configuration
- `public/config.js.template` - Template for runtime configuration injection
- `src/config/index.js` - Configuration utility function
- `docker-entrypoint.sh` - Docker startup script that injects environment variables
- `Dockerfile` - Multi-stage Docker build
- `docker-compose.yml` - Docker Compose configuration

### Updated Application Files

The following files have been updated to use runtime configuration:

- `src/service/index.js` - API service configuration
- `src/views/ForgottenPassword.vue` - Reset password URL
- `src/views/StatsIntercoop.vue` - Kendo assets paths
- `src/views/StatsDedicacio.vue` - Kendo assets paths

## Environment Variables

The following environment variables can be configured at runtime:

- `VUE_APP_API_URL` - Backend API URL (default: http://localhost:1337)
- `VUE_APP_RESET_PASSWORD` - Password reset URL (default: http://localhost:8080/#/reset-password)
- `VUE_APP_PATH` - Application base path (default: http://localhost:8080/)

## Usage

### Development

```bash
npm run serve
```

Uses the fallback configuration in `public/config.js`.

### Production with Docker Compose

1. Create/update `.env` file:
```bash
VUE_APP_API_URL=https://your-api.com
VUE_APP_RESET_PASSWORD=https://your-app.com/#/reset-password
VUE_APP_PATH=https://your-app.com/
```

2. Run with Docker Compose:
```bash
docker-compose up --build
```

### Production with Docker

```bash
docker build -t esstrapis-front .
docker run -p 8080:80 \
  -e VUE_APP_API_URL=https://your-api.com \
  -e VUE_APP_RESET_PASSWORD=https://your-app.com/#/reset-password \
  -e VUE_APP_PATH=https://your-app.com/ \
  esstrapis-front
```

## Technical Details

### Configuration Priority

1. `window.APP_CONFIG` (injected by Docker at runtime)
2. `process.env.VUE_APP_*` (build-time environment variables)
3. Default fallback values

### Docker Build Process

1. **Build Stage**: 
   - Uses Node.js to install dependencies and build the application
   - Environment variables are embedded at build time as fallbacks

2. **Production Stage**:
   - Uses nginx to serve the built files
   - Copies `config.js.template` for runtime injection
   - Docker entrypoint replaces template variables with actual environment values

### Runtime Injection Process

The `docker-entrypoint.sh` script:
1. Reads environment variables
2. Uses `envsubst` to replace placeholders in `config.js.template`
3. Writes the final `config.js` with actual values
4. Starts nginx

## Testing

Test the configuration injection locally:

```bash
./test-config.sh
```

This simulates the Docker environment variable injection process.

## Migration Notes

### For Existing Components

To update existing components to use runtime configuration:

1. Import the config utility:
```javascript
import getConfig from '@/config'
```

2. Replace `process.env.VUE_APP_*` with:
```javascript
const config = getConfig();
const apiUrl = config.VUE_APP_API_URL;
```

### Remaining Files to Update

The following files still use `process.env.VUE_APP_*` and may need updating if you want full runtime configuration:

- Various components in `src/components/`
- Various views in `src/views/`
- Service files in `src/service/`

To find all remaining references:
```bash
grep -r "process\.env\.VUE_APP_" src/
```

## Benefits

1. **Single Docker Image**: Use the same image across dev/staging/production
2. **Faster Deployments**: No need to rebuild for different environments  
3. **Configuration Management**: Environment-specific configs without code changes
4. **Reduced Build Times**: Build once, configure at runtime
