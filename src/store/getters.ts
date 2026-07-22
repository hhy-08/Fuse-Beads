/**
 * Vuex 根 getters
 * 导出全局派生状态
 */
const getters = {
  /**
   * 获取应用标题
   * @param state 根状态
   * @returns 标题文案
   */
  appTitle: (state: { appTitle: string }) => state.appTitle,
}

export default getters
