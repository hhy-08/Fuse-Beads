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
      <span class="hint">参数变化后自动重绘</span>
    </div>

    <div class="canvas-stage" ref="stage">
      <canvas ref="canvas"></canvas>
    </div>
  </section>
</template>

<script lang="ts">
/**
 * 拼豆 Canvas 预览组件
 * 使用 Options API 生命周期与 watch 实现自动重绘与导出
 */
import { defineComponent } from 'vue'
import {
  BuildOutlinedPattern,
  ConvertTextToPixels,
  CountPatternBeads,
  type BeadPatternGrid,
} from '../utils/TextToPixels'
import { DrawBeadPattern, ExportCanvasAsPng } from '../utils/DrawBeadPattern'
import { EnsureFontLoaded, FindFontOptionById } from '../utils/FontOptions'

export default defineComponent({
  name: 'BeadCanvas',
  props: {
    text: { type: String, required: true },
    fontId: { type: String, required: true },
    fontSize: { type: Number, required: true },
    threshold: { type: Number, required: true },
    beadSize: { type: Number, required: true },
    beadColor: { type: String, required: true },
    backgroundColor: { type: String, required: true },
    showStroke: { type: Boolean, required: true },
    strokeColor: { type: String, required: true },
    strokeWidth: { type: Number, required: true },
    showGrid: { type: Boolean, required: true },
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
    }
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
    fontSize() {
      this.ScheduleRender()
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
     * 将文字转换为像素网格，按需叠加外轮廓描边豆后绘制到 Canvas
     */
    async RenderPattern() {
      const canvas = this.$refs.canvas as HTMLCanvasElement | undefined
      if (!canvas) {
        return
      }

      const token = this.renderToken + 1
      this.renderToken = token

      const fontOption = FindFontOptionById(this.fontId)
      await EnsureFontLoaded(fontOption.family, this.fontSize)

      // 异步字体加载期间若已有更新请求，丢弃过期结果
      if (token !== this.renderToken) {
        return
      }

      const baseGrid = ConvertTextToPixels({
        text: this.text,
        fontSize: this.fontSize,
        fontFamily: fontOption.family,
        threshold: this.threshold,
      })

      this.patternGrid =
        this.showStroke && this.strokeWidth > 0
          ? BuildOutlinedPattern(baseGrid, this.strokeWidth)
          : {
              width: baseGrid.width,
              height: baseGrid.height,
              cells: baseGrid.cells.map((row) =>
                row.map((filled) => (filled ? 'fill' : 'empty')),
              ),
            }

      const counts = CountPatternBeads(this.patternGrid)
      this.gridWidth = this.patternGrid.width
      this.gridHeight = this.patternGrid.height
      this.fillCount = counts.fillCount
      this.outlineCount = counts.outlineCount
      this.beadCount = counts.totalCount

      DrawBeadPattern(canvas, this.patternGrid, {
        beadSize: this.beadSize,
        beadColor: this.beadColor,
        backgroundColor: this.backgroundColor,
        strokeColor: this.strokeColor,
        showGrid: this.showGrid,
        showColorCode: true,
        gridColor: 'rgba(40, 56, 84, 0.18)',
      })
    },
    /**
     * 导出当前 Canvas 为 PNG 图纸文件
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

.hint {
  color: #8a95a8;
  font-size: 0.82rem;
  white-space: nowrap;
}

.canvas-stage {
  flex: 1;
  min-height: 420px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadePanel 0.5s ease both;
}

.canvas-stage canvas {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 16px 36px rgba(28, 42, 68, 0.12);
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
    min-height: 320px;
  }

  .hint {
    display: none;
  }
}
</style>
