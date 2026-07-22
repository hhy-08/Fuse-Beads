<template>
  <div class="preview-section">
    <h3>水印预览</h3>
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
  emits: ['UpdatePosition'],
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
     * 开始拖动水印
     * @param event 鼠标事件
     */
    StartDrag(event: MouseEvent) {
      if (!this.settings.isDraggable) {
        return
      }
      const canvas = this.GetCanvas()
      if (!canvas) {
        return
      }

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (event.clientX - rect.left) * scaleX
      const y = (event.clientY - rect.top) * scaleY

      const hitArea = 24
      const textX = this.settings.watermarkPos.x
      const textY = this.settings.watermarkPos.y
      const textWidth = Math.max(80, this.settings.fontSize * this.settings.text.length * 0.6)

      if (
        x >= textX - hitArea &&
        x <= textX + textWidth + hitArea &&
        y >= textY - this.settings.fontSize - hitArea &&
        y <= textY + hitArea
      ) {
        this.isDragging = true
        this.dragOffset = {
          x: x - textX,
          y: y - textY,
        }
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
      const canvas = this.GetCanvas()
      if (!canvas) {
        return
      }

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (event.clientX - rect.left) * scaleX
      const y = (event.clientY - rect.top) * scaleY

      this.$emit('UpdatePosition', {
        x: x - this.dragOffset.x,
        y: y - this.dragOffset.y,
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
      let x = 0
      let y = 0

      if (this.settings.isDraggable) {
        x = this.settings.watermarkPos.x
        y = this.settings.watermarkPos.y
      } else {
        const padding = 20
        const baselineOffset = this.settings.fontSize * 0.8

        switch (this.settings.position) {
          case 'topLeft':
            x = padding
            y = padding + baselineOffset
            break
          case 'topCenter':
            x = (canvas.width - textMetrics.width) / 2
            y = padding + baselineOffset
            break
          case 'topRight':
            x = canvas.width - textMetrics.width - padding
            y = padding + baselineOffset
            break
          case 'middleLeft':
            x = padding
            y = canvas.height / 2 + baselineOffset / 2
            break
          case 'center':
            x = (canvas.width - textMetrics.width) / 2
            y = canvas.height / 2 + baselineOffset / 2
            break
          case 'middleRight':
            x = canvas.width - textMetrics.width - padding
            y = canvas.height / 2 + baselineOffset / 2
            break
          case 'bottomLeft':
            x = padding
            y = canvas.height - padding
            break
          case 'bottomCenter':
            x = (canvas.width - textMetrics.width) / 2
            y = canvas.height - padding
            break
          default:
            x = canvas.width - textMetrics.width - padding
            y = canvas.height - padding
        }
      }

      this.DrawRotatedText(ctx, text, x, y)
    },
    /**
     * 绘制平铺水印
     * @param ctx 画布上下文
     * @param canvas 画布
     */
    DrawTiledWatermark(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      const text = this.settings.text || ''
      const textMetrics = ctx.measureText(text)
      const tileWidth = textMetrics.width + this.settings.tileSpacingX
      const tileHeight = this.settings.fontSize + this.settings.tileSpacingY
      const cols = Math.ceil(canvas.width / tileWidth) + 2
      const rows = Math.ceil(canvas.height / tileHeight) + 2

      for (let row = -1; row < rows; row += 1) {
        for (let col = -1; col < cols; col += 1) {
          const x = col * tileWidth
          const y = this.settings.fontSize + row * tileHeight
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
     * 将当前预览结果写入图片项
     * @param img 图片项
     */
    ProcessImage(img: WatermarkImageItem): Promise<void> {
      return new Promise((resolve) => {
        this.UpdateWatermark()
        const canvas = this.GetCanvas()
        if (canvas) {
          img.processedData = canvas.toDataURL('image/png')
        }
        resolve()
      })
    },
  },
})
</script>

<style scoped>
.preview-section h3 {
  margin: 0 0 12px;
  font-size: 1.05rem;
  color: #1f2a3d;
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
