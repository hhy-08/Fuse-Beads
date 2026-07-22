/// <reference types="vite/client" />

/**
 * 环境变量类型声明
 * 对应 .env.dev / .env.test / .env.prod
 */
interface ImportMetaEnv {
  readonly VITE_ENV: 'dev' | 'test' | 'prod'
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_BASE_ROUTE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace NodeJS {
  interface ProcessEnv {
    VITE_ENV?: string
    VITE_API_BASE_URL?: string
    VITE_APP_TITLE?: string
    VITE_BASE_ROUTE?: string
  }
}

declare const process: {
  env: NodeJS.ProcessEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
