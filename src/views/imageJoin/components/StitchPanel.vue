<template>
  <div v-if="stitchItems.length" class="stitch-panel">
    <section class="options-card">
      <h2>拼接参数</h2>

      <div class="mode-tabs nested">
        <button
          type="button"
          class="tab"
          :class="{ active: layoutMode === 'auto' }"
          @click="HandleLayoutModeChange('auto')"
        >
          自动网格
        </button>
        <button
          type="button"
          class="tab"
          :class="{ active: layoutMode === 'free' }"
          @click="HandleLayoutModeChange('free')"
        >
          自由拖放
        </button>
      </div>

      <div class="options-grid">
        <label class="field">
          <span
            >每行张数 {{ stitchColumns }}（{{
              stitchColumns === 1 ? '单列竖排' : `一排 ${stitchColumns} 张`
            }}）</span
          >
          <input
            type="range"
            min="1"
            max="4"
            step="1"
            :value="stitchColumns"
            @input="HandleColumnsInput"
          />
        </label>
        <label class="field">
          <span>图片间距 {{ stitchGap }} px</span>
          <input
            type="range"
            min="0"
            max="80"
            step="1"
            :value="stitchGap"
            @input="HandleGapInput"
          />
        </label>
      </div>

      <div
        v-if="layoutMode === 'auto' && stitchColumns > 1"
        class="align-group row-align"
      >
        <span class="align-label">整行对齐</span>
        <button
          v-for="opt in alignOptions"
          :key="`row-${opt.id}`"
          type="button"
          class="mode-chip"
          :class="{ active: rowAlign === opt.id }"
          @click="HandleRowAlignChange(opt.id)"
        >
          {{ opt.label }}
        </button>
      </div>

      <ul class="file-list">
        <li v-for="(item, index) in stitchItems" :key="item.uid" class="file-row">
          <img :src="item.previewUrl" :alt="item.name" class="thumb" />
          <div class="file-body">
            <div class="file-top">
              <div class="file-meta">
                <span class="name">{{ item.name }}</span>
                <span class="size">
                  原图 {{ item.width }} × {{ item.height }} →
                  {{ GetItemDrawWidth(item) }} × {{ GetItemDrawHeight(item) }}
                  <span v-if="layoutMode === 'free'">
                    · ({{ item.x }}, {{ item.y }})
                  </span>
                </span>
              </div>
              <div class="row-actions">
                <button
                  type="button"
                  class="ghost mini"
                  :disabled="index === 0"
                  @click="HandleMoveUp(index)"
                >
                  上移
                </button>
                <button
                  type="button"
                  class="ghost mini"
                  :disabled="index === stitchItems.length - 1"
                  @click="HandleMoveDown(index)"
                >
                  下移
                </button>
                <button
                  type="button"
                  class="ghost mini danger"
                  @click="HandleRemoveStitch(index)"
                >
                  删除
                </button>
              </div>
            </div>
            <div class="item-controls">
              <label class="field compact">
                <span>缩放 {{ item.scale }}%</span>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="1"
                  :value="item.scale"
                  @input="HandleScaleInput(index, $event)"
                />
              </label>
              <div v-if="layoutMode === 'auto'" class="align-group">
                <span class="align-label">{{ itemAlignLabel }}</span>
                <button
                  v-for="opt in itemAlignOptions"
                  :key="opt.id"
                  type="button"
                  class="mode-chip"
                  :class="{ active: item.align === opt.id }"
                  @click="HandleAlignChange(index, opt.id)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>
        </li>
      </ul>

      <div v-if="layoutMode === 'auto'" class="batch-row">
        <span class="batch-label">批量{{ itemAlignLabel }}</span>
        <button
          v-for="opt in itemAlignOptions"
          :key="`batch-${opt.id}`"
          type="button"
          class="ghost mini"
          @click="HandleBatchAlign(opt.id)"
        >
          全部{{ opt.label }}
        </button>
        <button type="button" class="ghost mini" @click="HandleBatchScale(100)">
          全部 100%
        </button>
      </div>

      <div v-else class="batch-row">
        <button type="button" class="ghost mini" @click="HandleApplyAutoLayout">
          按当前网格重新排布
        </button>
        <button type="button" class="ghost mini" @click="HandleBatchScale(100)">
          全部 100%
        </button>
      </div>

      <p class="info">
        预估 {{ stitchCanvasWidth }} × {{ stitchCanvasHeight }} px ·
        {{ stitchItems.length }} 张
        <span v-if="layoutMode === 'auto'">
          · {{ stitchRowCount }} 行 × 每行最多 {{ stitchColumns }} 张
        </span>
        <span v-else> · 自由拖放（导出裁切到内容边界）</span>
      </p>

      <div class="actions">
        <button
          type="button"
          class="primary"
          :disabled="isBusy || stitchItems.length < 1"
          @click="HandleStitchDownload"
        >
          {{ isBusy ? '处理中…' : '生成并下载 PNG' }}
        </button>
        <button type="button" class="ghost" :disabled="isBusy" @click="Clear">
          清空
        </button>
      </div>
    </section>

    <section class="preview-card">
      <h2>{{ layoutMode === 'free' ? '自由画布' : '拼接预览' }}</h2>
      <FreeLayoutCanvas
        v-if="layoutMode === 'free'"
        :items="stitchItems"
        :active-uid="activeUid"
        :content-width="freeBounds.width"
        :content-height="freeBounds.height"
        :content-min-x="freeBounds.minX"
        :content-min-y="freeBounds.minY"
        @update:position="HandleFreePosition"
        @select="HandleFreeSelect"
        @bring-front="HandleBringFront"
      />
      <div v-else-if="stitchPreviewUrl" class="preview-wrap">
        <img :src="stitchPreviewUrl" alt="拼接预览" class="preview-image" />
      </div>
    </section>
  </div>
</template>

<script lang="ts">
/**
 * 图片拼接面板
 * 管理拼接列表、自动网格 / 自由拖放布局、预览与下载
 */
import { defineComponent } from 'vue'
import {
  ComputeGridPositions,
  DownloadBlob,
  GetFreeStitchBounds,
  GetScaledDrawSize,
  GetStitchCanvasSize,
  RevokeImageItem,
  StitchImagesFree,
  StitchImagesVertical,
  type LoadedImageItem,
  type StitchAlign,
  type StitchLayer,
} from '@/utils/ImageJoin'
import FreeLayoutCanvas from './FreeLayoutCanvas.vue'

type LayoutMode = 'auto' | 'free'

/** 拼接列表项（含缩放、对齐与自由坐标） */
export type StitchItem = LoadedImageItem & {
  scale: number
  align: StitchAlign
  x: number
  y: number
}

export default defineComponent({
  name: 'StitchPanel',
  components: {
    FreeLayoutCanvas,
  },
  emits: {
    status: (_text: string, _isError?: boolean) => true,
    busy: (_value: boolean) => true,
  },
  data() {
    return {
      layoutMode: 'auto' as LayoutMode,
      stitchItems: [] as StitchItem[],
      stitchGap: 0,
      stitchColumns: 1,
      rowAlign: 'center' as StitchAlign,
      stitchPreviewUrl: '',
      previewTimer: 0 as number,
      activeUid: '',
      isBusy: false,
      alignOptions: [
        { id: 'left' as StitchAlign, label: '左' },
        { id: 'center' as StitchAlign, label: '中' },
        { id: 'right' as StitchAlign, label: '右' },
      ],
      valignOptions: [
        { id: 'left' as StitchAlign, label: '上' },
        { id: 'center' as StitchAlign, label: '中' },
        { id: 'right' as StitchAlign, label: '下' },
      ],
    }
  },
  computed: {
    /**
     * 单项对齐文案（单列=左右，多列=上下）
     * @returns 文案
     */
    itemAlignLabel(): string {
      return this.stitchColumns > 1 ? '行内垂直' : '左右对齐'
    },
    /**
     * 单项对齐选项
     * @returns 选项列表
     */
    itemAlignOptions(): Array<{ id: StitchAlign; label: string }> {
      return this.stitchColumns > 1 ? this.valignOptions : this.alignOptions
    },
    /**
     * 预估行数
     * @returns 行数
     */
    stitchRowCount(): number {
      if (!this.stitchItems.length) {
        return 0
      }
      return Math.ceil(this.stitchItems.length / this.stitchColumns)
    },
    /**
     * 自由布局包围盒
     * @returns 包围盒
     */
    freeBounds(): {
      minX: number
      minY: number
      width: number
      height: number
    } {
      return GetFreeStitchBounds(
        this.stitchItems.map((item) => ({
          image: item.image,
          scale: item.scale,
          x: item.x,
          y: item.y,
        })),
      )
    },
    /**
     * 拼接预估画布宽
     * @returns 宽度
     */
    stitchCanvasWidth(): number {
      if (this.layoutMode === 'free') {
        return this.freeBounds.width
      }
      return GetStitchCanvasSize(
        this.BuildStitchLayers(),
        this.stitchGap,
        this.stitchColumns,
      ).width
    },
    /**
     * 拼接预估画布高
     * @returns 高度
     */
    stitchCanvasHeight(): number {
      if (this.layoutMode === 'free') {
        return this.freeBounds.height
      }
      return GetStitchCanvasSize(
        this.BuildStitchLayers(),
        this.stitchGap,
        this.stitchColumns,
      ).height
    },
  },
  /**
   * 卸载释放资源
   */
  beforeUnmount() {
    this.ClearPreviewTimer()
    this.ClearStitchData()
  },
  methods: {
    /**
     * 向上抛出状态文案
     * @param text 文案
     * @param isError 是否错误
     */
    EmitStatus(text: string, isError = false) {
      this.$emit('status', text, isError)
    },
    /**
     * 设置本地面板忙碌并同步父级
     * @param value 是否忙碌
     */
    SetBusy(value: boolean) {
      this.isBusy = value
      this.$emit('busy', value)
    },
    /**
     * 追加拼接图片项
     * @param items 已加载项列表
     */
    async AppendItems(items: StitchItem[]) {
      if (!items.length) {
        return
      }
      this.stitchItems = [...this.stitchItems, ...items]
      this.ApplyAutoLayoutPositions()
      if (this.layoutMode === 'auto') {
        await this.RefreshStitchPreview()
      }
    },
    /**
     * 清空拼接数据与预览
     */
    Clear() {
      this.ClearPreviewTimer()
      this.ClearStitchData()
      this.EmitStatus('')
    },
    /**
     * 是否仍有拼接项
     * @returns 有项为 true
     */
    HasItems(): boolean {
      return this.stitchItems.length > 0
    },
    /**
     * 释放列表与预览 URL（不改状态文案）
     */
    ClearStitchData() {
      this.stitchItems.forEach((item) => RevokeImageItem(item))
      this.stitchItems = []
      this.ClearStitchPreview()
      this.activeUid = ''
    },
    /**
     * 单项缩放后宽度
     * @param item 拼接项
     * @returns 宽度
     */
    GetItemDrawWidth(item: StitchItem): number {
      return GetScaledDrawSize(item.width, item.height, item.scale).width
    },
    /**
     * 单项缩放后高度
     * @param item 拼接项
     * @returns 高度
     */
    GetItemDrawHeight(item: StitchItem): number {
      return GetScaledDrawSize(item.width, item.height, item.scale).height
    },
    /**
     * 转为自动网格图层参数
     * @returns 图层列表
     */
    BuildStitchLayers(): StitchLayer[] {
      return this.stitchItems.map((item) => ({
        image: item.image,
        scale: item.scale,
        align: item.align,
      }))
    },
    /**
     * 按当前网格参数写回各图坐标
     */
    ApplyAutoLayoutPositions() {
      const sizes = this.stitchItems.map((item) =>
        GetScaledDrawSize(item.width, item.height, item.scale),
      )
      const positions = ComputeGridPositions(
        sizes,
        this.stitchColumns,
        this.stitchGap,
        this.rowAlign,
      )
      this.stitchItems = this.stitchItems.map((item, index) => ({
        ...item,
        x: positions[index]?.x ?? 0,
        y: positions[index]?.y ?? 0,
      }))
    },
    /**
     * 清除预览防抖定时器
     */
    ClearPreviewTimer() {
      if (this.previewTimer) {
        window.clearTimeout(this.previewTimer)
        this.previewTimer = 0
      }
    },
    /**
     * 防抖刷新自动预览
     * @param delayMs 延迟毫秒
     */
    SchedulePreviewRefresh(delayMs = 180) {
      if (this.layoutMode === 'free') {
        return
      }
      this.ClearPreviewTimer()
      this.previewTimer = window.setTimeout(() => {
        void this.RefreshStitchPreview()
      }, delayMs)
    },
    /**
     * 切换自动 / 自由布局
     * @param layout 布局模式
     */
    HandleLayoutModeChange(layout: LayoutMode) {
      if (this.layoutMode === layout) {
        return
      }
      this.layoutMode = layout
      if (layout === 'free') {
        this.ApplyAutoLayoutPositions()
        this.ClearStitchPreview()
        this.EmitStatus('自由拖放：在画布上拖动图片摆放')
        return
      }
      void this.RefreshStitchPreview()
      this.EmitStatus('已切回自动网格')
    },
    /**
     * 按网格重新排布（自由模式）
     */
    HandleApplyAutoLayout() {
      this.ApplyAutoLayoutPositions()
      this.EmitStatus('已按当前每行张数与间距重新排布')
    },
    /**
     * 间距滑块
     * @param event 输入事件
     */
    HandleGapInput(event: Event) {
      this.stitchGap = Number((event.target as HTMLInputElement).value)
      if (this.layoutMode === 'auto') {
        this.SchedulePreviewRefresh()
      }
    },
    /**
     * 每行张数
     * @param event 输入事件
     */
    HandleColumnsInput(event: Event) {
      this.stitchColumns = Number((event.target as HTMLInputElement).value)
      if (this.layoutMode === 'auto') {
        this.SchedulePreviewRefresh(60)
      }
    },
    /**
     * 整行水平对齐（多列自动）
     * @param align 对齐
     */
    HandleRowAlignChange(align: StitchAlign) {
      this.rowAlign = align
      this.SchedulePreviewRefresh(60)
    },
    /**
     * 单项缩放
     * @param index 下标
     * @param event 输入事件
     */
    HandleScaleInput(index: number, event: Event) {
      const value = Number((event.target as HTMLInputElement).value)
      const item = this.stitchItems[index]
      if (!item) {
        return
      }
      item.scale = Math.min(200, Math.max(10, value))
      this.SchedulePreviewRefresh()
    },
    /**
     * 单项对齐
     * @param index 下标
     * @param align 对齐方式
     */
    HandleAlignChange(index: number, align: StitchAlign) {
      const item = this.stitchItems[index]
      if (!item) {
        return
      }
      item.align = align
      this.SchedulePreviewRefresh(60)
    },
    /**
     * 批量设置对齐
     * @param align 对齐方式
     */
    HandleBatchAlign(align: StitchAlign) {
      this.stitchItems = this.stitchItems.map((item) => ({
        ...item,
        align,
      }))
      this.SchedulePreviewRefresh(60)
    },
    /**
     * 批量设置缩放
     * @param scale 百分比
     */
    HandleBatchScale(scale: number) {
      this.stitchItems = this.stitchItems.map((item) => ({
        ...item,
        scale,
      }))
      if (this.layoutMode === 'free') {
        return
      }
      this.SchedulePreviewRefresh(60)
    },
    /**
     * 自由画布更新坐标
     * @param uid 项 id
     * @param x x
     * @param y y
     */
    HandleFreePosition(uid: string, x: number, y: number) {
      const item = this.stitchItems.find((entry) => entry.uid === uid)
      if (!item) {
        return
      }
      item.x = x
      item.y = y
    },
    /**
     * 选中自由项
     * @param uid 项 id
     */
    HandleFreeSelect(uid: string) {
      this.activeUid = uid
    },
    /**
     * 置顶图层（移到列表末尾，后绘上层）
     * @param uid 项 id
     */
    HandleBringFront(uid: string) {
      const index = this.stitchItems.findIndex((entry) => entry.uid === uid)
      if (index < 0 || index === this.stitchItems.length - 1) {
        return
      }
      const list = [...this.stitchItems]
      const [item] = list.splice(index, 1)
      list.push(item)
      this.stitchItems = list
    },
    /**
     * 上移一项
     * @param index 下标
     */
    async HandleMoveUp(index: number) {
      if (index <= 0) {
        return
      }
      const list = [...this.stitchItems]
      const temp = list[index - 1]
      list[index - 1] = list[index]
      list[index] = temp
      this.stitchItems = list
      if (this.layoutMode === 'auto') {
        await this.RefreshStitchPreview()
      }
    },
    /**
     * 下移一项
     * @param index 下标
     */
    async HandleMoveDown(index: number) {
      if (index >= this.stitchItems.length - 1) {
        return
      }
      const list = [...this.stitchItems]
      const temp = list[index + 1]
      list[index + 1] = list[index]
      list[index] = temp
      this.stitchItems = list
      if (this.layoutMode === 'auto') {
        await this.RefreshStitchPreview()
      }
    },
    /**
     * 删除拼接项
     * @param index 下标
     */
    async HandleRemoveStitch(index: number) {
      const item = this.stitchItems[index]
      if (item) {
        RevokeImageItem(item)
      }
      this.stitchItems = this.stitchItems.filter((_, i) => i !== index)
      if (!this.stitchItems.length) {
        this.ClearStitchPreview()
        this.activeUid = ''
        this.EmitStatus('')
        return
      }
      if (this.layoutMode === 'auto') {
        await this.RefreshStitchPreview()
      }
    },
    /**
     * 清除拼接预览 URL
     */
    ClearStitchPreview() {
      if (this.stitchPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.stitchPreviewUrl)
      }
      this.stitchPreviewUrl = ''
    },
    /**
     * 刷新自动网格预览
     */
    async RefreshStitchPreview() {
      this.ClearStitchPreview()
      if (!this.stitchItems.length || this.layoutMode === 'free') {
        return
      }
      try {
        const blob = await StitchImagesVertical(
          this.BuildStitchLayers(),
          this.stitchGap,
          this.stitchColumns,
          this.rowAlign,
        )
        this.stitchPreviewUrl = URL.createObjectURL(blob)
      } catch {
        this.stitchPreviewUrl = ''
      }
    },
    /**
     * 生成并下载拼接图
     */
    async HandleStitchDownload() {
      if (!this.stitchItems.length) {
        this.EmitStatus('请先上传图片', true)
        return
      }
      try {
        this.SetBusy(true)
        const blob =
          this.layoutMode === 'free'
            ? await StitchImagesFree(
                this.stitchItems.map((item) => ({
                  image: item.image,
                  scale: item.scale,
                  x: item.x,
                  y: item.y,
                })),
              )
            : await StitchImagesVertical(
                this.BuildStitchLayers(),
                this.stitchGap,
                this.stitchColumns,
                this.rowAlign,
              )
        DownloadBlob(blob, 'stitched_long.png')
        this.EmitStatus('已开始下载 PNG')
      } catch (error) {
        this.EmitStatus(
          error instanceof Error ? error.message : '拼接失败',
          true,
        )
      } finally {
        this.SetBusy(false)
      }
    },
  },
})
</script>

<style scoped>
.stitch-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.mode-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-tabs.nested {
  margin-bottom: 14px;
}

.tab {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
  font: inherit;
  font-size: 0.92rem;
}

.tab.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.options-card,
.preview-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.options-card h2,
.preview-card h2 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  color: #1f2a3d;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #31415f;
  font-size: 0.92rem;
  margin-bottom: 14px;
}

.field input[type='range'] {
  width: 100%;
  max-width: 420px;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 20px;
}

.file-list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(49, 72, 111, 0.05);
  flex-wrap: wrap;
}

.file-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  background: #e8edf5;
  flex-shrink: 0;
}

.file-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.name {
  font-weight: 600;
  color: #1f2a3d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.size {
  font-size: 0.85rem;
  color: #6a7a94;
}

.row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.item-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field.compact {
  margin-bottom: 0;
}

.align-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.align-group.row-align {
  margin: 0 0 14px;
}

.align-label {
  color: #31415f;
  font-size: 0.88rem;
}

.mode-chip {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 5px 12px;
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
}

.mode-chip.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.batch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 4px 0 12px;
}

.batch-label {
  color: #6a7a94;
  font-size: 0.85rem;
}

.info {
  margin: 0 0 8px;
  color: #6a7a94;
  font-size: 0.88rem;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.primary,
.ghost {
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  font: inherit;
}

.primary {
  border: none;
  background: #31486f;
  color: #fff8ef;
}

.primary:disabled,
.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.25);
  background: transparent;
  color: #31415f;
}

.ghost.mini {
  padding: 6px 10px;
  font-size: 0.82rem;
}

.ghost.danger {
  color: #9f2f2f;
  border-color: rgba(159, 47, 47, 0.35);
}

.preview-wrap {
  max-height: 520px;
  overflow: auto;
  border-radius: 12px;
  background:
    linear-gradient(45deg, #e8edf5 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(-45deg, #e8edf5 25%, transparent 25%) 0 0 / 16px 16px,
    #f4f7fb;
  text-align: center;
}

.preview-image {
  max-width: 100%;
  height: auto;
  vertical-align: middle;
}

@media (max-width: 800px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
}
</style>
