/**
 * 拼豆生成器 Vuex 模块
 * 管理图纸参数、字间距与逐字样式状态
 */

import {
  CreateDefaultCharStyle,
  SyncCharStyles,
  type CharStyle,
} from '@/utils/TextToPixels'

export type GeneratorState = {
  sourceMode: 'text' | 'image'
  text: string
  fontId: string
  fontSize: number
  letterSpacing: number
  charStyles: CharStyle[]
  threshold: number
  beadSize: number
  beadColor: string
  backgroundColor: string
  showStroke: boolean
  strokeColor: string
  strokeWidth: number
  showGrid: boolean
  showColorCode: boolean
  imageDataUrl: string
  imageMaxWidth: number
  imageMaxHeight: number
  imageAlphaThreshold: number
  imageClarity: number
}

const DEFAULTCOLOR = '#0F54C0'
const DEFAULTFONTSIZE = 48
const DEFAULTCHARSTYLE = CreateDefaultCharStyle(DEFAULTCOLOR, DEFAULTFONTSIZE)

const generator = {
  name: 'generator',
  state: {
    sourceMode: 'text' as const,
    text: '拼豆',
    fontId: 'noto-sans-sc',
    fontSize: DEFAULTFONTSIZE,
    letterSpacing: 2,
    charStyles: [
      { ...DEFAULTCHARSTYLE },
      { ...DEFAULTCHARSTYLE },
    ],
    threshold: 200,
    beadSize: 40,
    beadColor: DEFAULTCOLOR,
    backgroundColor: '#f7f4ef',
    showStroke: true,
    strokeColor: '#000000',
    strokeWidth: 1,
    showGrid: true,
    showColorCode: true,
    imageDataUrl: '',
    imageMaxWidth: 48,
    imageMaxHeight: 64,
    imageAlphaThreshold: 40,
    imageClarity: 6,
  } as GeneratorState,
  getters: {
    /**
     * 获取输入来源模式
     * @param state 模块状态
     * @returns text 或 image
     */
    sourceMode: (state: GeneratorState) => state.sourceMode,
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
     * 获取默认采样字号
     * @param state 模块状态
     * @returns 字号
     */
    fontSize: (state: GeneratorState) => state.fontSize,
    /**
     * 获取字间距（采样像素）
     * @param state 模块状态
     * @returns 字间距
     */
    letterSpacing: (state: GeneratorState) => state.letterSpacing,
    /**
     * 获取逐字样式列表
     * @param state 模块状态
     * @returns 样式数组
     */
    charStyles: (state: GeneratorState) => state.charStyles,
    /**
     * 获取像素阈值
     * @param state 模块状态
     * @returns 阈值
     */
    threshold: (state: GeneratorState) => state.threshold,
    /**
     * 获取格子尺寸
     * @param state 模块状态
     * @returns 尺寸
     */
    beadSize: (state: GeneratorState) => state.beadSize,
    /**
     * 获取默认珠子颜色
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
    /**
     * 获取色值显示开关
     * @param state 模块状态
     * @returns 是否显示色值
     */
    showColorCode: (state: GeneratorState) => state.showColorCode,
    /**
     * 获取图片 dataURL
     * @param state 模块状态
     * @returns dataURL
     */
    imageDataUrl: (state: GeneratorState) => state.imageDataUrl,
    /**
     * 获取图片最大宽度（豆）
     * @param state 模块状态
     * @returns 最大宽度
     */
    imageMaxWidth: (state: GeneratorState) => state.imageMaxWidth,
    /**
     * 获取图片最大高度（豆）
     * @param state 模块状态
     * @returns 最大高度
     */
    imageMaxHeight: (state: GeneratorState) => state.imageMaxHeight,
    /**
     * 获取图片透明阈值
     * @param state 模块状态
     * @returns Alpha 阈值
     */
    imageAlphaThreshold: (state: GeneratorState) => state.imageAlphaThreshold,
    /**
     * 获取图片清晰度（1~10）
     * @param state 模块状态
     * @returns 清晰度
     */
    imageClarity: (state: GeneratorState) => state.imageClarity,
  },
  mutations: {
    /**
     * 设置输入来源模式
     * @param state 模块状态
     * @param value text 或 image
     */
    SETSOURCEMODE(state: GeneratorState, value: 'text' | 'image') {
      state.sourceMode = value
    },
    /**
     * 设置输入文字，并同步逐字样式长度
     * @param state 模块状态
     * @param value 文字
     */
    SETTEXT(state: GeneratorState, value: string) {
      state.text = value
      state.charStyles = SyncCharStyles(
        value,
        state.charStyles,
        state.beadColor,
        state.fontSize,
      )
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
     * 设置默认采样字号
     * @param state 模块状态
     * @param value 字号
     */
    SETFONTSIZE(state: GeneratorState, value: number) {
      state.fontSize = value
    },
    /**
     * 设置字间距
     * @param state 模块状态
     * @param value 间距像素
     */
    SETLETTERSPACING(state: GeneratorState, value: number) {
      state.letterSpacing = value
    },
    /**
     * 整体替换逐字样式
     * @param state 模块状态
     * @param value 样式数组
     */
    SETCHARSTYLES(state: GeneratorState, value: CharStyle[]) {
      state.charStyles = value
    },
    /**
     * 更新单个字符样式
     * @param state 模块状态
     * @param payload 索引与局部样式
     */
    UPDATECHARSTYLE(
      state: GeneratorState,
      payload: { index: number; style: Partial<CharStyle> },
    ) {
      const target = state.charStyles[payload.index]
      if (!target) {
        return
      }
      state.charStyles.splice(payload.index, 1, {
        ...target,
        ...payload.style,
      })
    },
    /**
     * 将颜色应用到全部字符
     * @param state 模块状态
     * @param value 颜色
     */
    APPLYCOLORTOALL(state: GeneratorState, value: string) {
      state.beadColor = value
      state.charStyles = state.charStyles.map((item) => ({
        ...item,
        color: value,
      }))
    },
    /**
     * 将字号应用到全部字符
     * @param state 模块状态
     * @param value 字号
     */
    APPLYFONTSIZETOALL(state: GeneratorState, value: number) {
      state.fontSize = value
      state.charStyles = state.charStyles.map((item) => ({
        ...item,
        fontSize: value,
      }))
    },
    /**
     * 将文字效果应用到全部字符
     * @param state 模块状态
     * @param value 加粗/倾斜/下划线/删除线
     */
    APPLYEFFECTTOALL(
      state: GeneratorState,
      value: Pick<CharStyle, 'bold' | 'italic' | 'underline' | 'lineThrough'>,
    ) {
      state.charStyles = state.charStyles.map((item) => ({
        ...item,
        ...value,
      }))
    },
    /**
     * 将垂直对齐应用到全部字符
     * @param state 模块状态
     * @param value 对齐方式
     */
    APPLYALIGNTOALL(state: GeneratorState, value: CharStyle['align']) {
      state.charStyles = state.charStyles.map((item) => ({
        ...item,
        align: value,
      }))
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
     * 设置格子尺寸
     * @param state 模块状态
     * @param value 尺寸
     */
    SETBEADSIZE(state: GeneratorState, value: number) {
      state.beadSize = Math.min(72, Math.max(28, Math.round(value)))
    },
    /**
     * 设置默认珠子颜色
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
    /**
     * 设置色值显示开关
     * @param state 模块状态
     * @param value 是否显示色值
     */
    SETSHOWCOLORCODE(state: GeneratorState, value: boolean) {
      state.showColorCode = value
    },
    /**
     * 设置上传图片 dataURL
     * @param state 模块状态
     * @param value dataURL，空串表示清除
     */
    SETIMAGEDATAURL(state: GeneratorState, value: string) {
      state.imageDataUrl = value
    },
    /**
     * 设置图片最大宽度（豆）
     * @param state 模块状态
     * @param value 宽度
     */
    SETIMAGEMAXWIDTH(state: GeneratorState, value: number) {
      state.imageMaxWidth = Math.min(128, Math.max(8, Math.round(value)))
    },
    /**
     * 设置图片最大高度（豆）
     * @param state 模块状态
     * @param value 高度
     */
    SETIMAGEMAXHEIGHT(state: GeneratorState, value: number) {
      state.imageMaxHeight = Math.min(128, Math.max(8, Math.round(value)))
    },
    /**
     * 设置图片透明阈值
     * @param state 模块状态
     * @param value Alpha 阈值
     */
    SETIMAGEALPHATHRESHOLD(state: GeneratorState, value: number) {
      state.imageAlphaThreshold = Math.min(255, Math.max(0, Math.round(value)))
    },
    /**
     * 设置图片清晰度
     * @param state 模块状态
     * @param value 1~10，越高细节越多
     */
    SETIMAGECLARITY(state: GeneratorState, value: number) {
      state.imageClarity = Math.min(10, Math.max(1, Math.round(value)))
    },
  },
  actions: {
    /**
     * 重置生成器为默认参数
     * @param context Vuex action 上下文
     */
    ResetGenerator({
      commit,
    }: {
      commit: (type: string, payload?: unknown) => void
    }) {
      commit('SETSOURCEMODE', 'text')
      commit('SETTEXT', '拼豆')
      commit('SETFONTID', 'noto-sans-sc')
      commit('SETFONTSIZE', DEFAULTFONTSIZE)
      commit('SETLETTERSPACING', 2)
      commit('SETCHARSTYLES', [
        { ...DEFAULTCHARSTYLE },
        { ...DEFAULTCHARSTYLE },
      ])
      commit('SETTHRESHOLD', 200)
      commit('SETBEADSIZE', 40)
      commit('SETBEADCOLOR', DEFAULTCOLOR)
      commit('SETBACKGROUNDCOLOR', '#f7f4ef')
      commit('SETSHOWSTROKE', true)
      commit('SETSTROKECOLOR', '#000000')
      commit('SETSTROKEWIDTH', 1)
      commit('SETSHOWGRID', true)
      commit('SETSHOWCOLORCODE', true)
      commit('SETIMAGEDATAURL', '')
      commit('SETIMAGEMAXWIDTH', 48)
      commit('SETIMAGEMAXHEIGHT', 64)
      commit('SETIMAGEALPHATHRESHOLD', 40)
      commit('SETIMAGECLARITY', 6)
    },
  },
}

export default generator
