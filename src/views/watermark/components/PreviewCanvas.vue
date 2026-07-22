<template>
  <div class="preview-section">
    <div class="preview-head">
      <h3>水印预览</h3>
      <button type="button" class="download-current" @click="EmitDownloadCurrent">
        下载当前图片
      </button>
    </div>
    <div
      class="preview-wrapper"
      :class="{ draggable: settings.isDraggable }"
      @mousedown="StartDrag"
      @mousemove="HandleDrag"
      @mouseup="StopDrag"
      @mouseleave="StopDrag"
    >
      <canvas ref="canvas" class="preview-canvas"></canvas>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * 水印预览画布
 * 负责实时绘制、拖动定位与导出处理后的图片
 */
import { defineComponent, type PropType } from 'vue'
import type {
  WatermarkImageItem,
  WatermarkPoint,
  WatermarkSettings,
} from '../types'

export default defineComponent({
  name: 'WatermarkPreviewCanvas',
  props: {
    image: {
      type: Object as PropType<WatermarkImageItem>,
      required: true,
    },
    settings: {
      type: Object as PropType<WatermarkSettings>,
      required: true,
    },
  },
  emits: ['UpdatePosition', 'DownloadCurrent'],
  data() {
    return {
      isDragging: false,
      dragOffset: null as WatermarkPoint | null,
    }
  },
  watch: {
    image: {
      deep: true,
      handler() {
        this.UpdateWatermark()
      },
    },
    settings: {
      deep: true,
      handler() {
        this.UpdateWatermark()
      },
    },
  },
  /**
   * 挂载后首次绘制
   */
  mounted() {
    this.UpdateWatermark()
  },
  methods: {
    /**
     * 获取画布元素
     * @returns canvas 或 null
     */
    GetCanvas(): HTMLCanvasElement | null {
      return (this.$refs.canvas as HTMLCanvasElement) || null
    },
    /**
     * 派发下载当前预览
     */
    EmitDownloadCurrent() {
      this.$emit('DownloadCurrent')
    },
    /**
     * 将屏幕坐标换算为画布坐标
     * @param event 鼠标事件
     * @returns 画布坐标，失败返回 null
     */
    ResolveCanvasPoint(event: MouseEvent): WatermarkPoint | null {
      const canvas = this.GetCanvas()
      if (!canvas) {
        return null
      }
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return null
      }
      return {
        x: ((event.clientX - rect.left) * canvas.width) / rect.width,
        y: ((event.clientY - rect.top) * canvas.height) / rect.height,
      }
    },
    /**
     * 判断点击是否命中单点水印
     * @param point 画布坐标
     * @returns 是否命中
     */
    IsHitSingleWatermark(point: WatermarkPoint): boolean {
      const canvas = this.GetCanvas()
      if (!canvas) {
        return false
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return false
      }

      ctx.font = `${this.settings.fontSize}px Arial, "Noto Sans SC", sans-serif`
      const textWidth = ctx.measureText(this.settings.text || '').width
      const hitArea = 24
      const textX = this.settings.watermarkPos.x
      const textY = this.settings.watermarkPos.y

      return (
        point.x >= textX - hitArea &&
        point.x <= textX + textWidth + hitArea &&
        point.y >= textY - this.settings.fontSize - hitArea &&
        point.y <= textY + hitArea
      )
    },
    /**
     * 开始拖动水印
     * @param event 鼠标事件
     */
    StartDrag(event: MouseEvent) {
      if (!this.settings.isDraggable) {
        return
      }
      const point = this.ResolveCanvasPoint(event)
      if (!point) {
        return
      }

      // 平铺模式：拖动画布任意位置即可整体偏移水印网格
      if (this.settings.isTiled) {
        this.isDragging = true
        this.dragOffset = {
          x: point.x - this.settings.watermarkPos.x,
          y: point.y - this.settings.watermarkPos.y,
        }
        return
      }

      if (!this.IsHitSingleWatermark(point)) {
        return
      }

      this.isDragging = true
      this.dragOffset = {
        x: point.x - this.settings.watermarkPos.x,
        y: point.y - this.settings.watermarkPos.y,
      }
    },
    /**
     * 拖动中更新坐标
     * @param event 鼠标事件
     */
    HandleDrag(event: MouseEvent) {
      if (!this.isDragging || !this.settings.isDraggable || !this.dragOffset) {
        return
      }
      const point = this.ResolveCanvasPoint(event)
      if (!point) {
        return
      }

      this.$emit('UpdatePosition', {
        x: point.x - this.dragOffset.x,
        y: point.y - this.dragOffset.y,
      })
    },
    /**
     * 结束拖动
     */
    StopDrag() {
      this.isDragging = false
      this.dragOffset = null
    },
    /**
     * 解析九宫格预设坐标
     * @param canvas 画布
     * @param textWidth 文字宽度
     * @returns 坐标
     */
    ResolvePresetPoint(
      canvas: HTMLCanvasElement,
      textWidth: number,
    ): WatermarkPoint {
      const padding = 20
      const baselineOffset = this.settings.fontSize * 0.8

      switch (this.settings.position) {
        case 'topLeft':
          return { x: padding, y: padding + baselineOffset }
        case 'topCenter':
          return {
            x: (canvas.width - textWidth) / 2,
            y: padding + baselineOffset,
          }
        case 'topRight':
          return {
            x: canvas.width - textWidth - padding,
            y: padding + baselineOffset,
          }
        case 'middleLeft':
          return {
            x: padding,
            y: canvas.height / 2 + baselineOffset / 2,
          }
        case 'center':
          return {
            x: (canvas.width - textWidth) / 2,
            y: canvas.height / 2 + baselineOffset / 2,
          }
        case 'middleRight':
          return {
            x: canvas.width - textWidth - padding,
            y: canvas.height / 2 + baselineOffset / 2,
          }
        case 'bottomLeft':
          return { x: padding, y: canvas.height - padding }
        case 'bottomCenter':
          return {
            x: (canvas.width - textWidth) / 2,
            y: canvas.height - padding,
          }
        default:
          return {
            x: canvas.width - textWidth - padding,
            y: canvas.height - padding,
          }
      }
    },
    /**
     * 获取平铺网格起点（支持拖动偏移）
     * @param canvas 画布
     * @param textWidth 文字宽度
     * @returns 起点坐标
     */
    ResolveTileOrigin(
      canvas: HTMLCanvasElement,
      textWidth: number,
    ): WatermarkPoint {
      if (this.settings.isDraggable) {
        return {
          x: this.settings.watermarkPos.x,
          y: this.settings.watermarkPos.y,
        }
      }
      return this.ResolvePresetPoint(canvas, textWidth)
    },
    /**
     * 按当前设置重绘水印
     */
    UpdateWatermark() {
      const canvas = this.GetCanvas()
      if (!this.image?.image || !canvas) {
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return
      }

      canvas.width = this.image.image.width
      canvas.height = this.image.image.height
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(this.image.image, 0, 0)

      ctx.font = `${this.settings.fontSize}px Arial, "Noto Sans SC", sans-serif`
      const color = this.settings.color || '#000000'
      const red = parseInt(color.slice(1, 3), 16) || 0
      const green = parseInt(color.slice(3, 5), 16) || 0
      const blue = parseInt(color.slice(5, 7), 16) || 0
      const alpha = this.settings.opacity / 100

      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
      ctx.strokeStyle = `rgba(${255 - red}, ${255 - green}, ${255 - blue}, ${alpha})`
      ctx.lineWidth = Math.max(1, this.settings.fontSize / 15)

      if (this.settings.isTiled) {
        this.DrawTiledWatermark(ctx, canvas)
      } else {
        this.DrawSingleWatermark(ctx, canvas)
      }
    },
    /**
     * 绘制单个水印
     * @param ctx 画布上下文
     * @param canvas 画布
     */
    DrawSingleWatermark(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      const text = this.settings.text || ''
      const textMetrics = ctx.measureText(text)
      const point = this.settings.isDraggable
        ? this.settings.watermarkPos
        : this.ResolvePresetPoint(canvas, textMetrics.width)

      this.DrawRotatedText(ctx, text, point.x, point.y)
    },
    /**
     * 绘制平铺水印（支持整体偏移）
     * @param ctx 画布上下文
     * @param canvas 画布
     */
    DrawTiledWatermark(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      const text = this.settings.text || ''
      const textMetrics = ctx.measureText(text)
      const tileWidth = Math.max(
        1,
        textMetrics.width + this.settings.tileSpacingX,
      )
      const tileHeight = Math.max(
        1,
        this.settings.fontSize + this.settings.tileSpacingY,
      )
      const origin = this.ResolveTileOrigin(canvas, textMetrics.width)

      // 用模运算把起点收进一个周期，保证拖动时网格连续铺满
      const startX =
        ((origin.x % tileWidth) + tileWidth) % tileWidth - tileWidth
      const startY =
        ((origin.y % tileHeight) + tileHeight) % tileHeight - tileHeight

      const cols = Math.ceil((canvas.width - startX) / tileWidth) + 1
      const rows = Math.ceil((canvas.height - startY) / tileHeight) + 1

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = startX + col * tileWidth
          const y = startY + this.settings.fontSize * 0.8 + row * tileHeight
          this.DrawRotatedText(ctx, text, x, y)
        }
      }
    },
    /**
     * 绘制旋转文字
     * @param ctx 画布上下文
     * @param text 文字
     * @param x 横坐标
     * @param y 纵坐标
     */
    DrawRotatedText(
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
    ) {
      const metrics = ctx.measureText(text)
      ctx.save()
      ctx.translate(x + metrics.width / 2, y - this.settings.fontSize / 2)
      ctx.rotate((this.settings.rotation * Math.PI) / 180)
      ctx.translate(-(x + metrics.width / 2), -(y - this.settings.fontSize / 2))
      ctx.strokeText(text, x, y)
      ctx.fillText(text, x, y)
      ctx.restore()
    },
    /**
     * 导出当前预览为 PNG dataURL
     * @returns dataURL，失败返回空字符串
     */
    ExportDataUrl(): string {
      this.UpdateWatermark()
      const canvas = this.GetCanvas()
      if (!canvas) {
        return ''
      }
      return canvas.toDataURL('image/png')
    },
    /**
     * 将当前预览结果写入图片项
     * @param img 图片项
     */
    ProcessImage(img: WatermarkImageItem): Promise<void> {
      return new Promise((resolve) => {
        const dataUrl = this.ExportDataUrl()
        if (dataUrl) {
          img.processedData = dataUrl
        }
        resolve()
      })
    },
  },
})
</script>

<style scoped>
.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.preview-section h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #1f2a3d;
}

.download-current {
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  background: #2e7d5a;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  white-space: nowrap;
}

.download-current:hover {
  background: #246548;
}

.preview-wrapper {
  border: 1px solid rgba(49, 65, 95, 0.12);
  border-radius: 14px;
  padding: 12px;
  background: rgba(238, 242, 248, 0.9);
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: default;
}

.preview-wrapper.draggable {
  cursor: move;
}

.preview-canvas {
  max-width: 100%;
  max-height: 460px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  background: #fff;
}
</style>
