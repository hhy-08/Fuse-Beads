<template>
  <div ref="stageRef" class="crop-stage" @dblclick="EmitReset">
    <div
      class="crop-frame"
      :style="frameStyle"
    >
      <img
        class="source-image"
        :src="imageSrc"
        alt="裁剪原图"
        draggable="false"
        @load="HandleImageLoad"
      />
      <div
        class="crop-box"
        :class="[`shape-${shape}`, { active: isDragging }]"
        :style="cropBoxStyle"
        @pointerdown.stop="HandleBoxPointerDown"
      >
        <div class="crop-shade" />
        <div class="crop-border" />
        <span
          v-for="handle in handles"
          :key="handle"
          class="handle"
          :class="`handle-${handle}`"
          @pointerdown.stop="HandleHandlePointerDown($event, handle)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * 裁切交互画布
 * 遮罩 + 八向手柄 + 拖移/缩放，坐标以原图像素为准
 */
import { defineComponent, type PropType } from 'vue'
import {
  MoveCropRect,
  ResizeCropRectByHandle,
  type CropRect,
  type CropShape,
} from '@/utils/ImageCrop'

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type HandleId = (typeof HANDLES)[number]

type DragMode =
  | { type: 'move'; startX: number; startY: number; origin: CropRect }
  | {
      type: 'resize'
      handle: HandleId
      startX: number
      startY: number
      origin: CropRect
    }

export default defineComponent({
  name: 'CropCanvas',
  props: {
    imageSrc: {
      type: String,
      required: true,
    },
    imageWidth: {
      type: Number,
      required: true,
    },
    imageHeight: {
      type: Number,
      required: true,
    },
    crop: {
      type: Object as PropType<CropRect>,
      required: true,
    },
    shape: {
      type: String as PropType<CropShape>,
      default: 'rect',
    },
    /** 圆角百分比 0~50 */
    radiusPercent: {
      type: Number,
      default: 12,
    },
    /** 锁定宽高比 */
    aspect: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
  },
  emits: {
    'update:crop': (_crop: CropRect) => true,
    reset: () => true,
  },
  data() {
    return {
      displayScale: 1,
      stageWidth: 0,
      isDragging: false,
      dragMode: null as DragMode | null,
      handles: HANDLES as unknown as HandleId[],
    }
  },
  computed: {
    /**
     * 外框尺寸（显示像素）
     */
    frameStyle(): Record<string, string> {
      return {
        width: `${this.imageWidth * this.displayScale}px`,
        height: `${this.imageHeight * this.displayScale}px`,
      }
    },
    /**
     * 裁切框样式（含圆角，遮罩 box-shadow 跟随 border-radius）
     */
    cropBoxStyle(): Record<string, string> {
      const scale = this.displayScale
      const { x, y, width, height } = this.crop
      const radiusPx =
        this.shape === 'rounded'
          ? ((Math.min(width, height) * this.radiusPercent) / 100) * scale
          : 0
      const borderRadius =
        this.shape === 'circle'
          ? '50%'
          : this.shape === 'rounded'
            ? `${radiusPx}px`
            : '0'

      return {
        left: `${x * scale}px`,
        top: `${y * scale}px`,
        width: `${width * scale}px`,
        height: `${height * scale}px`,
        borderRadius,
      }
    },
  },
  watch: {
    imageWidth() {
      this.$nextTick(() => this.UpdateDisplayScale())
    },
    imageHeight() {
      this.$nextTick(() => this.UpdateDisplayScale())
    },
  },
  /**
   * 挂载后监听容器尺寸
   */
  mounted() {
    this.UpdateDisplayScale()
    window.addEventListener('resize', this.UpdateDisplayScale)
  },
  /**
   * 卸载清理
   */
  beforeUnmount() {
    window.removeEventListener('resize', this.UpdateDisplayScale)
    this.DetachPointerListeners()
  },
  methods: {
    /**
     * 通知父级重置裁切框
     */
    EmitReset() {
      this.$emit('reset')
    },
    /**
     * 图片加载完成后重算缩放
     */
    HandleImageLoad() {
      this.UpdateDisplayScale()
    },
    /**
     * 按容器宽度等比缩放显示
     */
    UpdateDisplayScale() {
      const stage = this.$refs.stageRef as HTMLElement | undefined
      if (!stage || !this.imageWidth) {
        return
      }
      const available = Math.max(120, stage.clientWidth - 8)
      this.stageWidth = available
      this.displayScale = Math.min(1, available / this.imageWidth)
    },
    /**
     * 开始拖移裁切框
     * @param event 指针事件
     */
    HandleBoxPointerDown(event: PointerEvent) {
      if ((event.target as HTMLElement).classList.contains('handle')) {
        return
      }
      event.preventDefault()
      this.isDragging = true
      this.dragMode = {
        type: 'move',
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...this.crop },
      }
      this.AttachPointerListeners()
    },
    /**
     * 开始拖动手柄缩放
     * @param event 指针事件
     * @param handle 手柄 id
     */
    HandleHandlePointerDown(event: PointerEvent, handle: HandleId) {
      event.preventDefault()
      this.isDragging = true
      this.dragMode = {
        type: 'resize',
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...this.crop },
      }
      this.AttachPointerListeners()
    },
    /**
     * 绑定全局指针移动/抬起
     */
    AttachPointerListeners() {
      window.addEventListener('pointermove', this.HandlePointerMove)
      window.addEventListener('pointerup', this.HandlePointerUp)
      window.addEventListener('pointercancel', this.HandlePointerUp)
    },
    /**
     * 移除全局指针监听
     */
    DetachPointerListeners() {
      window.removeEventListener('pointermove', this.HandlePointerMove)
      window.removeEventListener('pointerup', this.HandlePointerUp)
      window.removeEventListener('pointercancel', this.HandlePointerUp)
    },
    /**
     * 指针移动：更新裁切框
     * @param event 指针事件
     */
    HandlePointerMove(event: PointerEvent) {
      if (!this.dragMode || !this.displayScale) {
        return
      }
      const deltaX = (event.clientX - this.dragMode.startX) / this.displayScale
      const deltaY = (event.clientY - this.dragMode.startY) / this.displayScale
      const imageSize = {
        width: this.imageWidth,
        height: this.imageHeight,
      }
      const aspect =
        this.shape === 'circle' ? 1 : this.aspect || undefined

      if (this.dragMode.type === 'move') {
        const next = MoveCropRect(
          this.dragMode.origin,
          deltaX,
          deltaY,
          imageSize,
        )
        this.$emit('update:crop', next)
        return
      }

      const next = ResizeCropRectByHandle(
        this.dragMode.origin,
        this.dragMode.handle,
        deltaX,
        deltaY,
        imageSize,
        aspect,
      )
      this.$emit('update:crop', next)
    },
    /**
     * 指针抬起结束拖拽
     */
    HandlePointerUp() {
      this.isDragging = false
      this.dragMode = null
      this.DetachPointerListeners()
    },
  },
})
</script>

<style scoped>
.crop-stage {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: auto;
  min-height: 240px;
  padding: 4px;
  background:
    linear-gradient(45deg, #e8edf5 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(-45deg, #e8edf5 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(45deg, transparent 75%, #e8edf5 75%) 0 0 / 16px 16px,
    linear-gradient(-45deg, transparent 75%, #e8edf5 75%) 0 0 / 16px 16px,
    #f4f7fb;
  border-radius: 12px;
}

.crop-frame {
  position: relative;
  flex-shrink: 0;
  user-select: none;
  touch-action: none;
  overflow: hidden;
}

.source-image {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.crop-box {
  position: absolute;
  z-index: 2;
  box-sizing: border-box;
  cursor: move;
  touch-action: none;
}

.crop-box.active {
  cursor: grabbing;
}

.crop-shade {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 9999px rgba(15, 22, 36, 0.55);
  pointer-events: none;
}

.crop-border {
  position: absolute;
  inset: 0;
  border: 2px solid #fff8ef;
  box-shadow: 0 0 0 1px rgba(49, 72, 111, 0.45);
  border-radius: inherit;
  pointer-events: none;
}

.shape-circle .crop-border,
.shape-rounded .crop-border {
  border-radius: inherit;
}

.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #fff8ef;
  border: 1.5px solid #31486f;
  border-radius: 2px;
  box-sizing: border-box;
  z-index: 3;
}

.handle-nw {
  left: -6px;
  top: -6px;
  cursor: nwse-resize;
}

.handle-ne {
  right: -6px;
  top: -6px;
  cursor: nesw-resize;
}

.handle-sw {
  left: -6px;
  bottom: -6px;
  cursor: nesw-resize;
}

.handle-se {
  right: -6px;
  bottom: -6px;
  cursor: nwse-resize;
}

.handle-n {
  left: 50%;
  top: -6px;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.handle-s {
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.handle-w {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.handle-e {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}
</style>
