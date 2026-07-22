/**
 * Vuex Store 入口
 * 参考 ilot 项目结构：root state/getters/mutations/actions + modules + 持久化
 */
import { Store, createStore } from 'vuex'
import createPersistedState from 'vuex-persistedstate'
import state from './state'
import getters from './getters'
import mutations from './mutations'
import actions from './actions'
import modules from './modules/index'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $store: Store<unknown>
  }
}

/**
 * 缓存过滤配置
 * false: 不过滤（全持久化）；[]: 全部过滤；[key]: 过滤指定字段
 */
const catchScoped: Record<string, false | string[]> = {
  // 图片 dataURL 可能很大，不写入 sessionStorage
  generator: ['imageDataUrl', 'importedPixelGrid'],
}

export default createStore({
  state,
  getters,
  mutations,
  actions,
  modules,
  plugins: [
    createPersistedState({
      key: 'vuex-fuse-kit',
      storage: window.sessionStorage,
      reducer(val: Record<string, unknown>) {
        const map: Record<string, unknown> = { ...val }
        for (const key in catchScoped) {
          const scoped = catchScoped[key]
          if (scoped) {
            if (scoped.length > 0) {
              const current = map[key]
              const moduleState =
                current && typeof current === 'object'
                  ? { ...(current as Record<string, unknown>) }
                  : {}
              for (let i = 0; i < scoped.length; i += 1) {
                delete moduleState[scoped[i]]
              }
              map[key] = moduleState
            } else {
              delete map[key]
            }
          }
        }
        return map
      },
    }),
  ],
})
