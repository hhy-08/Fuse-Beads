<template>
  <div class="app-shell">
    <ToolPageHero title="拼豆工具" subtitle="文字或图片一键生成可打印的拼豆像素图纸，并统计各色用量" />

    <main class="workspace">
      <ControlPanel
        :sourceMode="sourceMode"
        :text="text"
        :fontId="fontId"
        :letterSpacing="letterSpacing"
        :charStyles="charStyles"
        :threshold="threshold"
        :beadSize="beadSize"
        :backgroundColor="backgroundColor"
        :showStroke="showStroke"
        :strokeColor="strokeColor"
        :strokeWidth="strokeWidth"
        :showGrid="showGrid"
        :showColorCode="showColorCode"
        :imageDataUrl="imageDataUrl"
        :imageMaxWidth="imageMaxWidth"
        :imageMaxHeight="imageMaxHeight"
        :imageAlphaThreshold="imageAlphaThreshold"
        :imageClarity="imageClarity"
        :importedPixelGrid="importedPixelGrid"
        @UpdateSourceMode="HandleUpdateSourceMode"
        @UpdateText="HandleUpdateText"
        @UpdateFontId="HandleUpdateFontId"
        @UpdateLetterSpacing="HandleUpdateLetterSpacing"
        @UpdateCharStyle="HandleUpdateCharStyle"
        @ApplyColorToAll="HandleApplyColorToAll"
        @ApplyFontSizeToAll="HandleApplyFontSizeToAll"
        @ApplyEffectToAll="HandleApplyEffectToAll"
        @ApplyAlignToAll="HandleApplyAlignToAll"
        @UpdateThreshold="HandleUpdateThreshold"
        @UpdateBeadSize="HandleUpdateBeadSize"
        @UpdateBackgroundColor="HandleUpdateBackgroundColor"
        @UpdateShowStroke="HandleUpdateShowStroke"
        @UpdateStrokeColor="HandleUpdateStrokeColor"
        @UpdateStrokeWidth="HandleUpdateStrokeWidth"
        @UpdateShowGrid="HandleUpdateShowGrid"
        @UpdateShowColorCode="HandleUpdateShowColorCode"
        @UpdateImageDataUrl="HandleUpdateImageDataUrl"
        @UpdateImageMaxWidth="HandleUpdateImageMaxWidth"
        @UpdateImageMaxHeight="HandleUpdateImageMaxHeight"
        @UpdateImageAlphaThreshold="HandleUpdateImageAlphaThreshold"
        @UpdateImageClarity="HandleUpdateImageClarity"
        @ExportImage="HandleExportImage"
      />

      <BeadCanvas
        ref="beadCanvas"
        :sourceMode="sourceMode"
        :text="text"
        :fontId="fontId"
        :letterSpacing="letterSpacing"
        :charStyles="charStyles"
        :threshold="threshold"
        :beadSize="beadSize"
        :beadColor="beadColor"
        :backgroundColor="backgroundColor"
        :showStroke="showStroke"
        :strokeColor="strokeColor"
        :strokeWidth="strokeWidth"
        :showGrid="showGrid"
        :showColorCode="showColorCode"
        :imageDataUrl="imageDataUrl"
        :imageMaxWidth="imageMaxWidth"
        :imageMaxHeight="imageMaxHeight"
        :imageAlphaThreshold="imageAlphaThreshold"
        :imageClarity="imageClarity"
        :importedPixelGrid="importedPixelGrid"
      />
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 拼豆图纸生成器页面
 * Options API + mapGetters/mapMutations 连接 Vuex
 */
import { defineComponent } from 'vue'
import { mapGetters, mapMutations } from 'vuex'
import ControlPanel from '@/components/ControlPanel.vue'
import BeadCanvas from '@/components/BeadCanvas.vue'

import type { CharStyle } from '@/utils/TextToPixels'
import ToolPageHero from '@/components/ToolPageHero.vue'

export default defineComponent({
  name: 'GeneratorView',
  components: {
    ToolPageHero,
    ControlPanel,
    BeadCanvas,
  },
  computed: {
    ...mapGetters([
      'sourceMode',
      'text',
      'fontId',
      'fontSize',
      'letterSpacing',
      'charStyles',
      'threshold',
      'beadSize',
      'beadColor',
      'backgroundColor',
      'showStroke',
      'strokeColor',
      'strokeWidth',
      'showGrid',
      'showColorCode',
      'imageDataUrl',
      'imageMaxWidth',
      'imageMaxHeight',
      'imageAlphaThreshold',
      'imageClarity',
      'importedPixelGrid',
    ]),
  },
  /**
   * 组件创建时保证默认文案与逐字样式存在
   */
  created() {
    if (!this.text) {
      this.SETTEXT('拼豆')
    } else if (!this.charStyles || this.charStyles.length !== Array.from(this.text).length) {
      this.SETTEXT(this.text)
    }
    // 旧会话格子过小时自动抬升，保证色值可读
    if (typeof this.beadSize === 'number' && this.beadSize < 28) {
      this.SETBEADSIZE(40)
    }
  },
  /**
   * 挂载时同步页面标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '拼豆工具')
  },
  methods: {
    ...mapMutations([
      'SETSOURCEMODE',
      'SETTEXT',
      'SETFONTID',
      'SETLETTERSPACING',
      'UPDATECHARSTYLE',
      'APPLYCOLORTOALL',
      'APPLYFONTSIZETOALL',
      'APPLYEFFECTTOALL',
      'APPLYALIGNTOALL',
      'SETTHRESHOLD',
      'SETBEADSIZE',
      'SETBACKGROUNDCOLOR',
      'SETSHOWSTROKE',
      'SETSTROKECOLOR',
      'SETSTROKEWIDTH',
      'SETSHOWGRID',
      'SETSHOWCOLORCODE',
      'SETIMAGEDATAURL',
      'SETIMAGEMAXWIDTH',
      'SETIMAGEMAXHEIGHT',
      'SETIMAGEALPHATHRESHOLD',
      'SETIMAGECLARITY',
    ]),
    /**
     * 更新生成模式
     * @param value text / image / pixel
     */
    HandleUpdateSourceMode(value: 'text' | 'image' | 'pixel') {
      this.SETSOURCEMODE(value)
    },
    /**
     * 更新输入文字
     * @param value 新文字
     */
    HandleUpdateText(value: string) {
      this.SETTEXT(value)
    },
    /**
     * 更新上传图片
     * @param value dataURL
     */
    HandleUpdateImageDataUrl(value: string) {
      this.SETIMAGEDATAURL(value)
    },
    /**
     * 更新图片最大宽度
     * @param value 豆数
     */
    HandleUpdateImageMaxWidth(value: number) {
      this.SETIMAGEMAXWIDTH(value)
    },
    /**
     * 更新图片最大高度
     * @param value 豆数
     */
    HandleUpdateImageMaxHeight(value: number) {
      this.SETIMAGEMAXHEIGHT(value)
    },
    /**
     * 更新图片透明抠图阈值
     * @param value Alpha 阈值
     */
    HandleUpdateImageAlphaThreshold(value: number) {
      this.SETIMAGEALPHATHRESHOLD(value)
    },
    /**
     * 更新图片清晰度
     * @param value 1~10
     */
    HandleUpdateImageClarity(value: number) {
      this.SETIMAGECLARITY(value)
    },
    /**
     * 更新采样字体
     * @param value 字体 ID
     */
    HandleUpdateFontId(value: string) {
      this.SETFONTID(value)
    },
    /**
     * 更新字间距
     * @param value 间距像素
     */
    HandleUpdateLetterSpacing(value: number) {
      this.SETLETTERSPACING(value)
    },
    /**
     * 更新单个字符样式
     * @param payload 索引与局部样式
     */
    HandleUpdateCharStyle(payload: { index: number; style: Partial<CharStyle> }) {
      this.UPDATECHARSTYLE(payload)
    },
    /**
     * 颜色应用到全部字符
     * @param value 颜色
     */
    HandleApplyColorToAll(value: string) {
      this.APPLYCOLORTOALL(value)
    },
    /**
     * 字号应用到全部字符
     * @param value 字号
     */
    HandleApplyFontSizeToAll(value: number) {
      this.APPLYFONTSIZETOALL(value)
    },
    /**
     * 文字效果应用到全部字符
     * @param value 加粗/倾斜/下划线/删除线
     */
    HandleApplyEffectToAll(
      value: Pick<CharStyle, 'bold' | 'italic' | 'underline' | 'lineThrough'>,
    ) {
      this.APPLYEFFECTTOALL(value)
    },
    /**
     * 垂直对齐应用到全部字符
     * @param value 对齐方式
     */
    HandleApplyAlignToAll(value: CharStyle['align']) {
      this.APPLYALIGNTOALL(value)
    },
    /**
     * 更新亮度阈值
     * @param value 阈值
     */
    HandleUpdateThreshold(value: number) {
      this.SETTHRESHOLD(value)
    },
    /**
     * 更新格子尺寸
     * @param value 尺寸
     */
    HandleUpdateBeadSize(value: number) {
      this.SETBEADSIZE(value)
    },
    /**
     * 更新背景颜色
     * @param value 颜色
     */
    HandleUpdateBackgroundColor(value: string) {
      this.SETBACKGROUNDCOLOR(value)
    },
    /**
     * 更新描边开关
     * @param value 是否描边
     */
    HandleUpdateShowStroke(value: boolean) {
      this.SETSHOWSTROKE(value)
    },
    /**
     * 更新描边颜色
     * @param value 颜色
     */
    HandleUpdateStrokeColor(value: string) {
      this.SETSTROKECOLOR(value)
    },
    /**
     * 更新描边宽度
     * @param value 粗细
     */
    HandleUpdateStrokeWidth(value: number) {
      this.SETSTROKEWIDTH(value)
    },
    /**
     * 更新网格显示开关
     * @param value 是否显示网格
     */
    HandleUpdateShowGrid(value: boolean) {
      this.SETSHOWGRID(value)
    },
    /**
     * 更新色值显示开关
     * @param value 是否显示色值
     */
    HandleUpdateShowColorCode(value: boolean) {
      this.SETSHOWCOLORCODE(value)
    },
    /**
     * 触发子组件导出 PNG 图纸
     */
    HandleExportImage() {
      const canvasRef = this.$refs.beadCanvas as {
        ExportImage?: () => void
      }
      if (canvasRef && typeof canvasRef.ExportImage === 'function') {
        canvasRef.ExportImage()
      }
    },
  },
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: 24px;
  padding: 28px 6vw 48px;
}

@media (max-width: 900px) {.workspace { grid-template-columns: 1fr; }}
</style>
