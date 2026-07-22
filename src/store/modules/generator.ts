/**
 * 拼豆生成器 Vuex 模块
 * 管理图纸参数与预览相关状态
 */
export type GeneratorState = {
  text: string
  fontId: string
  fontSize: number
  threshold: number
  beadSize: number
  beadColor: string
  backgroundColor: string
  showStroke: boolean
  strokeColor: string
  strokeWidth: number
  showGrid: boolean
}

const generator = {
  name: 'generator',
  state: {
    text: '拼豆',
    fontId: 'noto-sans-sc',
    fontSize: 48,
    threshold: 200,
    beadSize: 22,
    beadColor: '#0F54C0',
    backgroundColor: '#f7f4ef',
    showStroke: true,
    strokeColor: '#000000',
    strokeWidth: 1,
    showGrid: true,
  } as GeneratorState,
  getters: {
    /**
     * 获取输入文字
     * @param state 模块状态
     * @returns 文字内容
     */
    text: (state: GeneratorState) => state.text,
    /**
     * 获取采样字体 ID
     * @param state 模块状态
     * @returns 字体 ID
     */
    fontId: (state: GeneratorState) => state.fontId,
    /**
     * 获取采样字号
     * @param state 模块状态
     * @returns 字号
     */
    fontSize: (state: GeneratorState) => state.fontSize,
    /**
     * 获取像素阈值
     * @param state 模块状态
     * @returns 阈值
     */
    threshold: (state: GeneratorState) => state.threshold,
    /**
     * 获取珠子尺寸
     * @param state 模块状态
     * @returns 尺寸
     */
    beadSize: (state: GeneratorState) => state.beadSize,
    /**
     * 获取珠子颜色
     * @param state 模块状态
     * @returns 颜色
     */
    beadColor: (state: GeneratorState) => state.beadColor,
    /**
     * 获取背景颜色
     * @param state 模块状态
     * @returns 颜色
     */
    backgroundColor: (state: GeneratorState) => state.backgroundColor,
    /**
     * 获取描边开关
     * @param state 模块状态
     * @returns 是否描边
     */
    showStroke: (state: GeneratorState) => state.showStroke,
    /**
     * 获取描边颜色
     * @param state 模块状态
     * @returns 颜色
     */
    strokeColor: (state: GeneratorState) => state.strokeColor,
    /**
     * 获取描边宽度（豆数）
     * @param state 模块状态
     * @returns 描边层数
     */
    strokeWidth: (state: GeneratorState) => state.strokeWidth,
    /**
     * 获取网格开关
     * @param state 模块状态
     * @returns 是否显示网格
     */
    showGrid: (state: GeneratorState) => state.showGrid,
  },
  mutations: {
    /**
     * 设置输入文字
     * @param state 模块状态
     * @param value 文字
     */
    SETTEXT(state: GeneratorState, value: string) {
      state.text = value
    },
    /**
     * 设置采样字体 ID
     * @param state 模块状态
     * @param value 字体 ID
     */
    SETFONTID(state: GeneratorState, value: string) {
      state.fontId = value
    },
    /**
     * 设置采样字号
     * @param state 模块状态
     * @param value 字号
     */
    SETFONTSIZE(state: GeneratorState, value: number) {
      state.fontSize = value
    },
    /**
     * 设置像素阈值
     * @param state 模块状态
     * @param value 阈值
     */
    SETTHRESHOLD(state: GeneratorState, value: number) {
      state.threshold = value
    },
    /**
     * 设置珠子尺寸
     * @param state 模块状态
     * @param value 尺寸
     */
    SETBEADSIZE(state: GeneratorState, value: number) {
      state.beadSize = value
    },
    /**
     * 设置珠子颜色
     * @param state 模块状态
     * @param value 颜色
     */
    SETBEADCOLOR(state: GeneratorState, value: string) {
      state.beadColor = value
    },
    /**
     * 设置背景颜色
     * @param state 模块状态
     * @param value 颜色
     */
    SETBACKGROUNDCOLOR(state: GeneratorState, value: string) {
      state.backgroundColor = value
    },
    /**
     * 设置描边开关
     * @param state 模块状态
     * @param value 是否描边
     */
    SETSHOWSTROKE(state: GeneratorState, value: boolean) {
      state.showStroke = value
    },
    /**
     * 设置描边颜色
     * @param state 模块状态
     * @param value 颜色
     */
    SETSTROKECOLOR(state: GeneratorState, value: string) {
      state.strokeColor = value
    },
    /**
     * 设置描边宽度（豆数）
     * @param state 模块状态
     * @param value 描边层数
     */
    SETSTROKEWIDTH(state: GeneratorState, value: number) {
      state.strokeWidth = value
    },
    /**
     * 设置网格开关
     * @param state 模块状态
     * @param value 是否显示网格
     */
    SETSHOWGRID(state: GeneratorState, value: boolean) {
      state.showGrid = value
    },
  },
  actions: {
    /**
     * 重置生成器为默认参数
     * @param context Vuex action 上下文
     */
    ResetGenerator({ commit }: { commit: (type: string, payload?: unknown) => void }) {
      commit('SETTEXT', '拼豆')
      commit('SETFONTID', 'noto-sans-sc')
      commit('SETFONTSIZE', 48)
      commit('SETTHRESHOLD', 200)
      commit('SETBEADSIZE', 22)
      commit('SETBEADCOLOR', '#0F54C0')
      commit('SETBACKGROUNDCOLOR', '#f7f4ef')
      commit('SETSHOWSTROKE', true)
      commit('SETSTROKECOLOR', '#000000')
      commit('SETSTROKEWIDTH', 1)
      commit('SETSHOWGRID', true)
    },
  },
}

export default generator
