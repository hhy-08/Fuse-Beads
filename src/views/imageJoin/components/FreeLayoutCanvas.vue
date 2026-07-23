<template>
  <div ref="stageRef" class="free-stage">
    <div class="free-board" :style="boardStyle">
      <div
        v-for="item in items"
        :key="item.uid"
        class="free-item"
        :class="{ active: item.uid === activeUid }"
        :style="GetItemStyle(item)"
        @pointerdown.stop="HandleItemPointerDown($event, item.uid)"
      >
        <img :src="item.previewUrl" :alt="item.name" draggable="false" />
      </div>
    </div>
    <p class="free-hint">拖动图片自由摆放；后点选的图层在上层</p>
  </div>
</template>

<script lang="ts">
/**
 * 自由布局画布
 * 按原图像素坐标摆放，显示时等比缩放；支持拖拽移动
 */
import { defineComponent, type PropType } from 'vue'
import { GetScaledDrawSize } from '@/utils/ImageJoin'

export type FreeLayoutItem = {
  uid: string
  name: string
  previewUrl: string
  width: number
  height: number
  scale: number
  x: number
  y: number
}

type DragState = {
  uid: string
  startClientX: number
  startClientY: number
  originX: number
  originY: number
}

export default defineComponent({
  name: 'FreeLayoutCanvas',
  props: {
    items: {
      type: Array as PropType<FreeLayoutItem[]>,
      required: true,
    },
    activeUid: {
      type: String,
      default: '',
    },
    /** 内容包围盒（原图像素） */
    contentWidth: {
      type: Number,
      required: true,
    },
    contentHeight: {
      type: Number,
      required: true,
    },
    contentMinX: {
      type: Number,
      default: 0,
    },
    contentMinY: {
      type: Number,
      default: 0,
    },
  },
  emits: {
    'update:position': (_uid: string, _x: number, _y: number) => true,
    select: (_uid: string) => true,
    'bring-front': (_uid: string) => true,
  },
  data() {
    return {
      displayScale: 1,
      drag: null as DragState | null,
    }
  },
  computed: {
    /**
     * 画板样式（相对包围盒原点）
     */
    boardStyle(): Record<string, string> {
      const pad = 24
      return {
        width: `${(this.contentWidth + pad * 2) * this.displayScale}px`,
        height: `${(this.contentHeight + pad * 2) * this.displayScale}px`,
      }
    },
  },
  watch: {
    contentWidth() {
      this.$nextTick(() => this.UpdateDisplayScale())
    },
    contentHeight() {
      this.$nextTick(() => this.UpdateDisplayScale())
    },
  },
  /**
   * 挂载后监听尺寸
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
     * 单项显示样式
     * @param item 项
     * @returns style
     */
    GetItemStyle(item: FreeLayoutItem): Record<string, string> {
      const { width, height } = GetScaledDrawSize(
        item.width,
        item.height,
        item.scale,
      )
      const pad = 24
      const left =
        (item.x - this.contentMinX + pad) * this.displayScale
      const top =
        (item.y - this.contentMinY + pad) * this.displayScale
      return {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width * this.displayScale}px`,
        height: `${height * this.displayScale}px`,
      }
    },
    /**
     * 按容器宽度计算显示缩放
     */
    UpdateDisplayScale() {
      const stage = this.$refs.stageRef as HTMLElement | undefined
      if (!stage || !this.contentWidth) {
        this.displayScale = 1
        return
      }
      const pad = 48
      const available = Math.max(160, stage.clientWidth - 16)
      this.displayScale = Math.min(1, available / (this.contentWidth + pad))
    },
    /**
     * 开始拖拽单项
     * @param event 指针事件
     * @param uid 项 id
     */
    HandleItemPointerDown(event: PointerEvent, uid: string) {
      event.preventDefault()
      const item = this.items.find((entry) => entry.uid === uid)
      if (!item) {
        return
      }
      this.$emit('select', uid)
      this.$emit('bring-front', uid)
      this.drag = {
        uid,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: item.x,
        originY: item.y,
      }
      this.AttachPointerListeners()
    },
    /**
     * 绑定全局指针
     */
    AttachPointerListeners() {
      window.addEventListener('pointermove', this.HandlePointerMove)
      window.addEventListener('pointerup', this.HandlePointerUp)
      window.addEventListener('pointercancel', this.HandlePointerUp)
    },
    /**
     * 解绑全局指针
     */
    DetachPointerListeners() {
      window.removeEventListener('pointermove', this.HandlePointerMove)
      window.removeEventListener('pointerup', this.HandlePointerUp)
      window.removeEventListener('pointercancel', this.HandlePointerUp)
    },
    /**
     * 拖动中更新坐标
     * @param event 指针事件
     */
    HandlePointerMove(event: PointerEvent) {
      if (!this.drag || !this.displayScale) {
        return
      }
      const dx = (event.clientX - this.drag.startClientX) / this.displayScale
      const dy = (event.clientY - this.drag.startClientY) / this.displayScale
      this.$emit(
        'update:position',
        this.drag.uid,
        Math.round(this.drag.originX + dx),
        Math.round(this.drag.originY + dy),
      )
    },
    /**
     * 结束拖拽
     */
    HandlePointerUp() {
      this.drag = null
      this.DetachPointerListeners()
    },
  },
})
</script>

<style scoped>
.free-stage {
  width: 100%;
  overflow: auto;
  border-radius: 12px;
  background:
    linear-gradient(45deg, #e8edf5 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(-45deg, #e8edf5 25%, transparent 25%) 0 0 / 16px 16px,
    #f4f7fb;
  padding: 8px;
}

.free-board {
  position: relative;
  margin: 0 auto;
  min-width: 120px;
  min-height: 120px;
}

.free-item {
  position: absolute;
  box-sizing: border-box;
  cursor: grab;
  touch-action: none;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(31, 42, 61, 0.18);
  user-select: none;
}

.free-item.active {
  border-color: #3d6eb0;
  z-index: 2;
  cursor: grabbing;
}

.free-item img {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.free-hint {
  margin: 10px 0 0;
  text-align: center;
  color: #6a7a94;
  font-size: 0.85rem;
}
</style>
