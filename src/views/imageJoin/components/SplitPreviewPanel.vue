<template>
  <section class="preview-card">
    <h2>分割预览</h2>
    <p class="info">
      {{
        mode === 'freeSplit'
          ? '自由切线：点击添加 · 拖动平移 · 拖端点调长度（会吸附到交叉线）· 双击删除'
          : '原图切线示意（与导出切分一致）'
      }}
    </p>
    <div class="split-source-preview">
      <div
        ref="splitFrameRef"
        class="split-source-frame"
        :class="{ interactive: mode === 'freeSplit' }"
        :style="splitSourceFrameStyle"
        @click="HandleFreeSplitClick"
      >
        <img
          :src="splitItem.previewUrl"
          :alt="splitItem.name"
          class="split-source-full"
          draggable="false"
        />
        <div
          v-for="(line, index) in splitVerticalLineMarks"
          :key="`v-${index}-${line.pos}`"
          class="cut-line vertical"
          :style="GetCutLineStyle('vertical', line.percent)"
        />
        <div
          v-for="(line, index) in splitHorizontalLineMarks"
          :key="`h-${index}-${line.pos}`"
          class="cut-line horizontal"
          :style="GetCutLineStyle('horizontal', line.percent)"
        />
        <div
          v-for="cut in freeCuts"
          :key="cut.uid"
          class="cut-line segment draggable"
          :class="cut.axis"
          :style="GetFreeCutSegmentStyle(cut)"
          @pointerdown.stop="HandleFreeCutPointerDown($event, cut.uid, 'move')"
          @dblclick.stop="HandleFreeCutRemove(cut.uid)"
        >
          <span
            class="cut-handle start"
            @pointerdown.stop="HandleFreeCutPointerDown($event, cut.uid, 'start')"
          />
          <span
            class="cut-handle end"
            @pointerdown.stop="HandleFreeCutPointerDown($event, cut.uid, 'end')"
          />
        </div>
      </div>
    </div>

    <p class="info pieces-title">
      分割后效果（{{ splitPreviewCells.length }} 张）
    </p>
    <div class="split-pieces-grid" :style="splitPiecesGridStyle">
      <div
        v-for="cell in splitPreviewCells"
        :key="cell.key"
        class="split-piece"
      >
        <div
          class="split-piece-thumb"
          :style="{ aspectRatio: `${cell.width} / ${cell.height}` }"
        >
          <img
            :src="splitItem.previewUrl"
            alt=""
            class="split-piece-img"
            draggable="false"
            :style="GetSplitPieceImageStyle(cell)"
          />
          <span class="piece-label">{{ cell.row }}-{{ cell.col }}</span>
        </div>
        <span class="piece-meta">
          {{ cell.width }} × {{ cell.height }}
        </span>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
/**
 * 分割预览面板
 * 均等切线示意与自由切线交互（添加、拖动、端点、删除）
 */
import { defineComponent, type PropType } from 'vue'
import {
  AlignFreeCutSegments,
  GetCutSnapThreshold,
  GetSplitPreviewCells,
  GetSplitPreviewCellsFromSegments,
  type FreeCutSegment,
  type LoadedImageItem,
} from '@/utils/ImageJoin'

type SplitPanelMode = 'split' | 'freeSplit'
type FreeCutTool = 'vertical' | 'horizontal'
type FreeCutAxis = 'vertical' | 'horizontal'
type FreeCutDragMode = 'move' | 'start' | 'end'

type FreeCutDrag = {
  uid: string
  mode: FreeCutDragMode
  startClientX: number
  startClientY: number
  originPos: number
  originStart: number
  originEnd: number
}

export default defineComponent({
  name: 'SplitPreviewPanel',
  props: {
    mode: {
      type: String as PropType<SplitPanelMode>,
      required: true,
    },
    splitItem: {
      type: Object as PropType<LoadedImageItem>,
      required: true,
    },
    splitRows: {
      type: Number,
      required: true,
    },
    splitCols: {
      type: Number,
      required: true,
    },
    freeCuts: {
      type: Array as PropType<FreeCutSegment[]>,
      required: true,
    },
    freeCutTool: {
      type: String as PropType<FreeCutTool>,
      required: true,
    },
    cutLineColor: {
      type: String,
      required: true,
    },
  },
  emits: {
    'update:freeCuts': (_value: FreeCutSegment[]) => true,
  },
  data() {
    return {
      freeCutDrag: null as FreeCutDrag | null,
      freeCutMoved: false,
    }
  },
  computed: {
    /**
     * 分割预览单元格（均等或自由）
     * @returns 单元格列表
     */
    splitPreviewCells(): Array<{
      key: string
      row: number
      col: number
      x: number
      y: number
      width: number
      height: number
    }> {
      if (this.mode === 'freeSplit') {
        return GetSplitPreviewCellsFromSegments(
          this.splitItem.width,
          this.splitItem.height,
          this.freeCuts,
        )
      }
      return GetSplitPreviewCells(
        this.splitItem.width,
        this.splitItem.height,
        this.splitRows,
        this.splitCols,
      )
    },
    /**
     * 原图预览框比例
     * @returns style
     */
    splitSourceFrameStyle(): Record<string, string> {
      if (!this.splitItem.width) {
        return {}
      }
      return {
        aspectRatio: `${this.splitItem.width} / ${this.splitItem.height}`,
      }
    },
    /**
     * 竖切线标记（均等模式）
     * @returns 标记列表
     */
    splitVerticalLineMarks(): Array<{ pos: number; percent: number }> {
      if (this.mode === 'freeSplit') {
        return []
      }
      return this.splitPreviewCells
        .filter((cell) => cell.row === 1 && cell.col > 1)
        .map((cell) => ({
          pos: cell.x,
          percent: (cell.x / this.splitItem.width) * 100,
        }))
    },
    /**
     * 横切线标记（均等模式）
     * @returns 标记列表
     */
    splitHorizontalLineMarks(): Array<{ pos: number; percent: number }> {
      if (this.mode === 'freeSplit') {
        return []
      }
      return this.splitPreviewCells
        .filter((cell) => cell.col === 1 && cell.row > 1)
        .map((cell) => ({
          pos: cell.y,
          percent: (cell.y / this.splitItem.height) * 100,
        }))
    },
    /**
     * 小块宫格列数样式
     * @returns style
     */
    splitPiecesGridStyle(): Record<string, string> {
      const cols =
        this.mode === 'freeSplit'
          ? Math.max(
              1,
              new Set(this.splitPreviewCells.map((cell) => cell.col)).size,
            )
          : this.splitCols
      return {
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }
    },
  },
  /**
   * 卸载时解绑切线拖动监听
   */
  beforeUnmount() {
    this.DetachFreeCutListeners()
  },
  methods: {
    /**
     * 写回切线列表
     * @param cuts 新切线
     */
    EmitFreeCuts(cuts: FreeCutSegment[]) {
      this.$emit('update:freeCuts', cuts)
    },
    /**
     * 单块预览内图片样式（放大后平移裁切）
     * @param cell 单元格
     * @returns style
     */
    GetSplitPieceImageStyle(cell: {
      x: number
      y: number
      width: number
      height: number
    }): Record<string, string> {
      const imgW = this.splitItem.width
      const imgH = this.splitItem.height
      return {
        width: `${(imgW / cell.width) * 100}%`,
        height: `${(imgH / cell.height) * 100}%`,
        transform: `translate(${(-cell.x / imgW) * 100}%, ${(-cell.y / imgH) * 100}%)`,
      }
    },
    /**
     * 切线样式（位置 + 颜色）
     * @param axis 轴向
     * @param percent 百分比位置
     * @returns style
     */
    GetCutLineStyle(
      axis: FreeCutAxis,
      percent: number,
    ): Record<string, string> {
      const style: Record<string, string> = {
        '--cut-color': this.cutLineColor,
      }
      if (axis === 'vertical') {
        style.left = `${percent}%`
      } else {
        style.top = `${percent}%`
      }
      return style
    },
    /**
     * 自由切线段样式（位置 + 起止长度）
     * @param cut 线段
     * @returns style
     */
    GetFreeCutSegmentStyle(cut: FreeCutSegment): Record<string, string> {
      const start = Math.min(cut.start, cut.end)
      const end = Math.max(cut.start, cut.end)
      const style: Record<string, string> = {
        '--cut-color': this.cutLineColor,
      }
      if (cut.axis === 'vertical') {
        const height = this.splitItem.height || 1
        style.left = `${(cut.pos / this.splitItem.width) * 100}%`
        style.top = `${(start / height) * 100}%`
        style.height = `${((end - start) / height) * 100}%`
      } else {
        const width = this.splitItem.width || 1
        style.top = `${(cut.pos / this.splitItem.height) * 100}%`
        style.left = `${(start / width) * 100}%`
        style.width = `${((end - start) / width) * 100}%`
      }
      return style
    },
    /**
     * 生成切线唯一 id
     * @returns uid
     */
    CreateCutUid(): string {
      return `cut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    },
    /**
     * 点击预览添加切线
     * @param event 点击事件
     */
    HandleFreeSplitClick(event: MouseEvent) {
      if (this.mode !== 'freeSplit' || this.freeCutMoved) {
        this.freeCutMoved = false
        return
      }
      const frame = this.$refs.splitFrameRef as HTMLElement | undefined
      if (!frame) {
        return
      }
      const rect = frame.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return
      }
      const relX = (event.clientX - rect.left) / rect.width
      const relY = (event.clientY - rect.top) / rect.height
      if (this.freeCutTool === 'vertical') {
        const x = Math.round(relX * this.splitItem.width)
        this.AddFreeCut('vertical', x)
      } else {
        const y = Math.round(relY * this.splitItem.height)
        this.AddFreeCut('horizontal', y)
      }
    },
    /**
     * 添加一条切线（默认贯穿整图，可拖端点缩短）
     * @param axis 轴向
     * @param pos 像素位置
     */
    AddFreeCut(axis: FreeCutAxis, pos: number) {
      const maxPos =
        axis === 'vertical' ? this.splitItem.width : this.splitItem.height
      const maxLen =
        axis === 'vertical' ? this.splitItem.height : this.splitItem.width
      const clamped = Math.min(maxPos - 1, Math.max(1, Math.round(pos)))
      const near = this.freeCuts.some(
        (cut) =>
          cut.axis === axis &&
          Math.abs(cut.pos - clamped) < 2 &&
          cut.start <= 1 &&
          cut.end >= maxLen - 1,
      )
      if (near) {
        return
      }
      this.EmitFreeCuts(
        AlignFreeCutSegments(this.splitItem.width, this.splitItem.height, [
          ...this.freeCuts,
          {
            uid: this.CreateCutUid(),
            axis,
            pos: clamped,
            start: 0,
            end: maxLen,
          },
        ]),
      )
    },
    /**
     * 删除切线
     * @param uid 切线 id
     */
    HandleFreeCutRemove(uid: string) {
      if (this.mode !== 'freeSplit') {
        return
      }
      this.EmitFreeCuts(this.freeCuts.filter((cut) => cut.uid !== uid))
    },
    /**
     * 按 uid 更新切线
     * @param uid 切线 id
     * @param patch 局部字段
     */
    PatchFreeCut(uid: string, patch: Partial<FreeCutSegment>) {
      this.EmitFreeCuts(
        this.freeCuts.map((cut) =>
          cut.uid === uid ? { ...cut, ...patch } : cut,
        ),
      )
    },
    /**
     * 开始拖动切线或端点
     * @param event 指针事件
     * @param uid 切线 id
     * @param mode 拖动模式
     */
    HandleFreeCutPointerDown(
      event: PointerEvent,
      uid: string,
      mode: FreeCutDragMode,
    ) {
      if (this.mode !== 'freeSplit') {
        return
      }
      const cut = this.freeCuts.find((item) => item.uid === uid)
      if (!cut) {
        return
      }
      event.preventDefault()
      this.freeCutMoved = false
      this.freeCutDrag = {
        uid,
        mode,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originPos: cut.pos,
        originStart: Math.min(cut.start, cut.end),
        originEnd: Math.max(cut.start, cut.end),
      }
      this.AttachFreeCutListeners()
    },
    /**
     * 绑定切线拖动监听
     */
    AttachFreeCutListeners() {
      window.addEventListener('pointermove', this.HandleFreeCutPointerMove)
      window.addEventListener('pointerup', this.HandleFreeCutPointerUp)
      window.addEventListener('pointercancel', this.HandleFreeCutPointerUp)
    },
    /**
     * 解绑切线拖动监听
     */
    DetachFreeCutListeners() {
      window.removeEventListener('pointermove', this.HandleFreeCutPointerMove)
      window.removeEventListener('pointerup', this.HandleFreeCutPointerUp)
      window.removeEventListener('pointercancel', this.HandleFreeCutPointerUp)
    },
    /**
     * 拖动切线平移或调整端点长度
     * @param event 指针事件
     */
    HandleFreeCutPointerMove(event: PointerEvent) {
      if (!this.freeCutDrag) {
        return
      }
      const frame = this.$refs.splitFrameRef as HTMLElement | undefined
      if (!frame) {
        return
      }
      const rect = frame.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return
      }
      const drag = this.freeCutDrag
      const cut = this.freeCuts.find((item) => item.uid === drag.uid)
      if (!cut) {
        return
      }
      const deltaX = event.clientX - drag.startClientX
      const deltaY = event.clientY - drag.startClientY
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        this.freeCutMoved = true
      }
      const scaleX = this.splitItem.width / rect.width
      const scaleY = this.splitItem.height / rect.height
      const minLen = 8
      const snap = GetCutSnapThreshold(
        this.splitItem.width,
        this.splitItem.height,
      )
      const hGuides = [
        0,
        this.splitItem.height,
        ...this.freeCuts
          .filter((item) => item.axis === 'horizontal')
          .map((item) => item.pos),
      ]
      const vGuides = [
        0,
        this.splitItem.width,
        ...this.freeCuts
          .filter((item) => item.axis === 'vertical')
          .map((item) => item.pos),
      ]
      const SnapValue = (value: number, guides: number[]): number => {
        let best = value
        let bestDist = snap
        for (const guide of guides) {
          const dist = Math.abs(guide - value)
          if (dist <= bestDist) {
            bestDist = dist
            best = guide
          }
        }
        return best
      }

      if (drag.mode === 'move') {
        if (cut.axis === 'vertical') {
          const next = Math.min(
            this.splitItem.width - 1,
            Math.max(1, Math.round(drag.originPos + deltaX * scaleX)),
          )
          this.PatchFreeCut(drag.uid, { pos: next })
        } else {
          const next = Math.min(
            this.splitItem.height - 1,
            Math.max(1, Math.round(drag.originPos + deltaY * scaleY)),
          )
          this.PatchFreeCut(drag.uid, { pos: next })
        }
        return
      }

      if (cut.axis === 'vertical') {
        const delta = Math.round(deltaY * scaleY)
        if (drag.mode === 'start') {
          const nextStart = Math.min(
            drag.originEnd - minLen,
            Math.max(0, SnapValue(drag.originStart + delta, hGuides)),
          )
          this.PatchFreeCut(drag.uid, { start: nextStart, end: drag.originEnd })
        } else {
          const nextEnd = Math.max(
            drag.originStart + minLen,
            Math.min(
              this.splitItem.height,
              SnapValue(drag.originEnd + delta, hGuides),
            ),
          )
          this.PatchFreeCut(drag.uid, {
            start: drag.originStart,
            end: nextEnd,
          })
        }
        return
      }

      const delta = Math.round(deltaX * scaleX)
      if (drag.mode === 'start') {
        const nextStart = Math.min(
          drag.originEnd - minLen,
          Math.max(0, SnapValue(drag.originStart + delta, vGuides)),
        )
        this.PatchFreeCut(drag.uid, { start: nextStart, end: drag.originEnd })
      } else {
        const nextEnd = Math.max(
          drag.originStart + minLen,
          Math.min(
            this.splitItem.width,
            SnapValue(drag.originEnd + delta, vGuides),
          ),
        )
        this.PatchFreeCut(drag.uid, { start: drag.originStart, end: nextEnd })
      }
    },
    /**
     * 结束拖动切线，并将端点吸附到交叉线
     */
    HandleFreeCutPointerUp() {
      this.freeCutDrag = null
      this.DetachFreeCutListeners()
      if (this.freeCuts.length) {
        this.EmitFreeCuts(
          AlignFreeCutSegments(
            this.splitItem.width,
            this.splitItem.height,
            this.freeCuts,
          ),
        )
      }
      window.setTimeout(() => {
        this.freeCutMoved = false
      }, 0)
    },
  },
})
</script>

<style scoped>
.preview-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.preview-card h2 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  color: #1f2a3d;
}

.info {
  margin: 0 0 8px;
  color: #6a7a94;
  font-size: 0.88rem;
}

.split-source-preview {
  margin-bottom: 16px;
  overflow: auto;
}

.split-source-frame {
  position: relative;
  width: min(100%, 520px);
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  background: #e8edf5;
  box-shadow: 0 0 0 1px rgba(49, 65, 95, 0.12);
}

.split-source-frame.interactive {
  cursor: crosshair;
}

.split-source-full {
  display: block;
  width: 100%;
  height: auto;
  vertical-align: middle;
  pointer-events: none;
}

.cut-line {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  background: var(--cut-color, #00e5ff);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.55),
    0 0 6px color-mix(in srgb, var(--cut-color, #00e5ff) 70%, transparent);
}

.cut-line.draggable {
  pointer-events: auto;
  z-index: 2;
}

.cut-line.vertical {
  top: 0;
  bottom: 0;
  width: 3px;
  transform: translateX(-50%);
}

.cut-line.horizontal {
  left: 0;
  right: 0;
  height: 3px;
  transform: translateY(-50%);
}

.cut-line.segment.vertical {
  bottom: auto;
  width: 14px;
  margin-left: -5.5px;
  cursor: ew-resize;
  background: linear-gradient(
    90deg,
    transparent 5px,
    var(--cut-color, #00e5ff) 5px,
    var(--cut-color, #00e5ff) 8px,
    transparent 8px
  );
  box-shadow: none;
}

.cut-line.segment.horizontal {
  right: auto;
  height: 14px;
  margin-top: -5.5px;
  cursor: ns-resize;
  background: linear-gradient(
    180deg,
    transparent 5px,
    var(--cut-color, #00e5ff) 5px,
    var(--cut-color, #00e5ff) 8px,
    transparent 8px
  );
  box-shadow: none;
}

.cut-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--cut-color, #00e5ff);
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
  z-index: 3;
}

.cut-line.segment.vertical .cut-handle {
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.cut-line.segment.vertical .cut-handle.start {
  top: -6px;
}

.cut-line.segment.vertical .cut-handle.end {
  bottom: -6px;
}

.cut-line.segment.horizontal .cut-handle {
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.cut-line.segment.horizontal .cut-handle.start {
  left: -6px;
}

.cut-line.segment.horizontal .cut-handle.end {
  right: -6px;
}

.pieces-title {
  margin-top: 8px;
}

.split-pieces-grid {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}

.split-piece {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.split-piece-thumb {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  background:
    linear-gradient(45deg, #e8edf5 25%, transparent 25%) 0 0 / 12px 12px,
    #f4f7fb;
  box-shadow: 0 0 0 1px rgba(49, 65, 95, 0.12);
}

.split-piece-img {
  display: block;
  max-width: none;
  pointer-events: none;
  user-select: none;
}

.piece-label {
  position: absolute;
  left: 4px;
  top: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(31, 42, 61, 0.72);
  color: #fff8ef;
  font-size: 0.72rem;
  line-height: 1.4;
}

.piece-meta {
  color: #6a7a94;
  font-size: 0.78rem;
  text-align: center;
}
</style>
