import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHtmlPlugin } from 'vite-plugin-html'
import { fileURLToPath, URL } from 'node:url'

/**
 * Vite 多环境配置
 * 参考 ilot：loadEnv、base、public/index.html、process.env 注入
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const baseRoute = env.VITE_BASE_ROUTE || '/'
  const normalizedBase = baseRoute.endsWith('/') ? baseRoute : `${baseRoute}/`

  return {
    base: normalizedBase,
    plugins: [
      vue(),
      createHtmlPlugin({
        minify: true,
        entry: '/src/main.ts',
        template: 'public/index.html',
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      open: true,
      host: '0.0.0.0',
    },
    define: {
      'process.env': {
        ...env,
      },
    },
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: env.VITE_ENV === 'prod',
        },
        format: {
          comments: false,
        },
      },
    },
  }
})
