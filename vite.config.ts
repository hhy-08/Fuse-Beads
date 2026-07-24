import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHtmlPlugin } from 'vite-plugin-html'
import { fileURLToPath, URL } from 'node:url'
import { CreateMattingProxyPlugin } from './scripts/MattingProxyPlugin.mjs'
import { CreateStripOversizedAssetsPlugin } from './scripts/StripOversizedAssetsPlugin.mjs'

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
      CreateMattingProxyPlugin(),
      // Cloudflare Pages 单文件 ≤25MiB：剔除超限 onnx 等，大模型改运行时下载
      CreateStripOversizedAssetsPlugin(),
    ],
    resolve: {
      alias: [
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        // rembg-web 默认依赖 onnxruntime-web（jsep≈26MB 超限），强制走经典 wasm 入口
        { find: /^onnxruntime-web$/, replacement: 'onnxruntime-web/wasm' },
      ],
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
    optimizeDeps: {
      exclude: ['onnxruntime-web'],
    },
    assetsInclude: ['**/*.wasm', '**/*.onnx'],
    worker: {
      format: 'es',
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
