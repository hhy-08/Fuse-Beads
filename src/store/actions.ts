/**
 * Vuex 根 actions
 * 处理全局异步或组合提交
 */
const actions = {
  /**
   * 更新应用标题
   * @param context Vuex action 上下文
   * @param title 标题文案
   */
  UpdateAppTitle({ commit }: { commit: (type: string, payload?: unknown) => void }, title: string) {
    commit('SETAPPTITLE', title)
  },
}

export default actions
