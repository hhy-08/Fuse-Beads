<template>
  <section class="preview">
    <div class="preview-header">
      <div>
        <h2>Canvas 预览</h2>
        <p>
          网格 {{ gridWidth }} × {{ gridHeight }} · 主体 {{ fillCount }} · 描边
          {{ outlineCount }} · 合计 {{ beadCount }}
        </p>
      </div>

      <div class="zoom-bar">
        <button type="button" class="zoom-btn" title="缩小" @click="ZoomOut">
          −
        </button>
        <input
          class="zoom-range"
          type="range"
          min="50"
          max="300"
          step="10"
          :value="Math.round(previewZoom * 100)"
          @input="HandleZoomInput"
        />
        <span class="zoom-value">{{ Math.round(previewZoom * 100) }}%</span>
        <button type="button" class="zoom-btn" title="放大" @click="ZoomIn">
          +
        </button>
        <button type="button" class="zoom-reset" @click="ResetZoom">重置</button>
      </div>
    </div>

    <div
      class="canvas-stage"
      ref="stage"
      @wheel="HandleWheelZoom"
    >
      <div
        class="canvas-frame"
        :style="{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
        }"
      >
        <canvas
          ref="canvas"
          :style="{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
          }"
        ></canvas>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
/**
 * 拼豆 Canvas 预览组件
 * 支持字间距、逐字样式，以及预览缩放
 */
import { defineComponent, type PropType } from 'vue'
import {
  BuildColoredPattern,
  BuildOutlinedColoredPattern,
  ConvertStyledTextToPixels,
  CountPatternBeads,
  type BeadPatternGrid,
  type CharStyle,
} from '../utils/TextToPixels'
import { DrawBeadPattern, ExportCanvasAsPng } from '../utils/DrawBeadPattern'
import { EnsureFontLoaded, FindFontOptionById } from '../utils/FontOptions'

const MINZOOM = 0.5
const MAXZOOM = 3
const DEFAULTZOOM = 1

export default defineComponent({
  name: 'BeadCanvas',
  props: {
    text: { type: String, required: true },
    fontId: { type: String, required: true },
    letterSpacing: { type: Number, required: true },
    charStyles: { type: Array as PropType<CharStyle[]>, required: true },
    threshold: { type: Number, required: true },
    beadSize: { type: Number, required: true },
    beadColor: { type: String, required: true },
    backgroundColor: { type: String, required: true },
    showStroke: { type: Boolean, required: true },
    strokeColor: { type: String, required: true },
    strokeWidth: { type: Number, required: true },
    showGrid: { type: Boolean, required: true },
    showColorCode: { type: Boolean, required: true },
  },
  data() {
    return {
      gridWidth: 0,
      gridHeight: 0,
      fillCount: 0,
      outlineCount: 0,
      beadCount: 0,
      patternGrid: { width: 0, height: 0, cells: [] } as BeadPatternGrid,
      redrawTimer: null as ReturnType<typeof setTimeout> | null,
      renderToken: 0,
      previewZoom: DEFAULTZOOM,
      naturalWidth: 320,
      naturalHeight: 200,
    }
  },
  computed: {
    /**
     * 缩放后的显示宽度
     * @returns 像素宽度
     */
    displayWidth(): number {
      return Math.max(1, Math.round(this.naturalWidth * this.previewZoom))
    },
    /**
     * 缩放后的显示高度
     * @returns 像素高度
     */
    displayHeight(): number {
      return Math.max(1, Math.round(this.naturalHeight * this.previewZoom))
    },
  },
  /**
   * 组件挂载后执行首次绘制，并监听窗口尺寸变化
   */
  mounted() {
    this.ScheduleRender()
    window.addEventListener('resize', this.HandleWindowResize)
  },
  /**
   * 组件卸载前清理定时器与窗口监听，避免内存泄漏
   */
  beforeUnmount() {
    this.ClearRedrawTimer()
    window.removeEventListener('resize', this.HandleWindowResize)
  },
  watch: {
    text() {
      this.ScheduleRender()
    },
    fontId() {
      this.ScheduleRender()
    },
    letterSpacing() {
      this.ScheduleRender()
    },
    charStyles: {
      deep: true,
      handler() {
        this.ScheduleRender()
      },
    },
    threshold() {
      this.ScheduleRender()
    },
    beadSize() {
      this.ScheduleRender()
    },
    beadColor() {
      this.ScheduleRender()
    },
    backgroundColor() {
      this.ScheduleRender()
    },
    showStroke() {
      this.ScheduleRender()
    },
    strokeColor() {
      this.ScheduleRender()
    },
    strokeWidth() {
      this.ScheduleRender()
    },
    showGrid() {
      this.ScheduleRender()
    },
    showColorCode() {
      this.ScheduleRender()
    },
  },
  methods: {
    /**
     * 防抖调度重绘，减少频繁输入时的性能开销
     */
    ScheduleRender() {
      this.ClearRedrawTimer()
      this.redrawTimer = setTimeout(() => {
        void this.RenderPattern()
      }, 60)
    },
    /**
     * 清除待执行的重绘定时器
     */
    ClearRedrawTimer() {
      if (this.redrawTimer) {
        clearTimeout(this.redrawTimer)
        this.redrawTimer = null
      }
    },
    /**
     * 窗口尺寸变化时重新绘制当前图案
     */
    HandleWindowResize() {
      this.ScheduleRender()
    },
    /**
     * 限制缩放比例到合法区间
     * @param value 原始缩放
     * @returns 合法缩放
     */
    ClampZoom(value: number): number {
      return Math.min(MAXZOOM, Math.max(MINZOOM, Number(value.toFixed(2))))
    },
    /**
     * 放大预览
     */
    ZoomIn() {
      this.previewZoom = this.ClampZoom(this.previewZoom + 0.1)
    },
    /**
     * 缩小预览
     */
    ZoomOut() {
      this.previewZoom = this.ClampZoom(this.previewZoom - 0.1)
    },
    /**
     * 重置预览缩放
     */
    ResetZoom() {
      this.previewZoom = DEFAULTZOOM
    },
    /**
     * 滑杆调整缩放
     * @param event 输入事件
     */
    HandleZoomInput(event: Event) {
      const target = event.target as HTMLInputElement
      this.previewZoom = this.ClampZoom(Number(target.value) / 100)
    },
    /**
     * Ctrl/⌘ + 滚轮缩放预览
     * @param event 滚轮事件
     */
    HandleWheelZoom(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }
      event.preventDefault()
      const delta = event.deltaY > 0 ? -0.1 : 0.1
      this.previewZoom = this.ClampZoom(this.previewZoom + delta)
    },
    /**
     * 计算当前文字所需的最大采样字号
     * @returns 最大字号
     */
    GetMaxFontSize(): number {
      if (!this.charStyles.length) {
        return 48
      }
      return this.charStyles.reduce(
        (max, item) => Math.max(max, item.fontSize || 48),
        24,
      )
    },
    /**
     * 将文字按逐字样式转换为像素网格并绘制到 Canvas
     */
    async RenderPattern() {
      const canvas = this.$refs.canvas as HTMLCanvasElement | undefined
      if (!canvas) {
        return
      }

      const token = this.renderToken + 1
      this.renderToken = token

      const fontOption = FindFontOptionById(this.fontId)
      await EnsureFontLoaded(fontOption.family, this.GetMaxFontSize())

      if (token !== this.renderToken) {
        return
      }

      const coloredGrid = ConvertStyledTextToPixels({
        text: this.text,
        fontFamily: fontOption.family,
        threshold: this.threshold,
        letterSpacing: this.letterSpacing,
        charStyles: this.charStyles,
        defaultColor: this.beadColor,
        defaultFontSize: this.GetMaxFontSize(),
      })

      this.patternGrid =
        this.showStroke && this.strokeWidth > 0
          ? BuildOutlinedColoredPattern(
              coloredGrid,
              this.strokeWidth,
              this.strokeColor,
            )
          : BuildColoredPattern(coloredGrid)

      const counts = CountPatternBeads(this.patternGrid)
      this.gridWidth = this.patternGrid.width
      this.gridHeight = this.patternGrid.height
      this.fillCount = counts.fillCount
      this.outlineCount = counts.outlineCount
      this.beadCount = counts.totalCount

      DrawBeadPattern(canvas, this.patternGrid, {
        beadSize: this.beadSize,
        backgroundColor: this.backgroundColor,
        showGrid: this.showGrid,
        showColorCode: this.showColorCode,
      })

      this.naturalWidth = canvas.width
      this.naturalHeight = canvas.height
    },
    /**
     * 导出当前 Canvas 为 PNG 图纸文件（按实际格子分辨率导出）
     */
    ExportImage() {
      const canvas = this.$refs.canvas as HTMLCanvasElement | undefined
      if (!canvas || !this.patternGrid.width) {
        return
      }

      const safeName = (this.text.trim() || 'bead-pattern').replace(/\s+/g, '-')
      ExportCanvasAsPng(canvas, `${safeName}-拼豆图纸.png`)
    },
  },
})
</script>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.preview-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-header h2 {
  margin: 0;
  font-size: 1.15rem;
  color: #22314d;
}

.preview-header p {
  margin: 6px 0 0;
  color: #66748d;
  font-size: 0.9rem;
}

.zoom-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(40, 56, 84, 0.1);
}

.zoom-btn,
.zoom-reset {
  height: 32px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #fff;
  color: #31415f;
  cursor: pointer;
}

.zoom-btn {
  width: 32px;
  font-size: 1.1rem;
  line-height: 1;
}

.zoom-reset {
  padding: 0 10px;
  font-size: 0.78rem;
}

.zoom-btn:hover,
.zoom-reset:hover {
  border-color: #3f6fe8;
  color: #3f6fe8;
}

.zoom-range {
  width: 120px;
  accent-color: #3f6fe8;
}

.zoom-value {
  min-width: 44px;
  text-align: center;
  font-size: 0.82rem;
  color: #4b5872;
  font-variant-numeric: tabular-nums;
}

.canvas-stage {
  flex: 1;
  min-height: 480px;
  overflow: auto;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.42)),
    repeating-linear-gradient(
      45deg,
      rgba(61, 92, 150, 0.05) 0 10px,
      rgba(61, 92, 150, 0.02) 10px 20px
    );
  border: 1px solid rgba(40, 56, 84, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  padding: 24px;
  animation: fadePanel 0.5s ease both;
}

.canvas-frame {
  margin: 0 auto;
  min-width: min-content;
}

.canvas-stage canvas {
  display: block;
  border-radius: 8px;
  box-shadow: 0 16px 36px rgba(28, 42, 68, 0.12);
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

@keyframes fadePanel {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .canvas-stage {
    min-height: 360px;
  }

  .zoom-range {
    width: 88px;
  }
}
</style>
