/**
 * Vuex 根 mutations
 * 修改全局通用状态
 */
const mutations = {
  /**
   * 设置应用标题
   * @param state 根状态
   * @param title 标题文案
   */
  SETAPPTITLE(state: { appTitle: string }, title: string) {
    state.appTitle = title
  },
}

export default mutations
