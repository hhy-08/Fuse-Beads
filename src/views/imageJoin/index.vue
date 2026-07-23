<template>
  <div class="join-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>长图拼接 / 图片分割</h1>
        <p class="subtitle">
          多张图竖向拼成长图，或将大图按行列均等切成小图，全部本地完成
        </p>
      </div>
      <nav class="hero-nav">
        <router-link to="/">工具列表</router-link>
        <router-link to="/about">关于</router-link>
      </nav>
    </header>

    <main class="workspace">
      <section class="mode-tabs">
        <button
          type="button"
          class="tab"
          :class="{ active: mode === 'stitch' }"
          @click="HandleModeChange('stitch')"
        >
          图片拼接
        </button>
        <button
          type="button"
          class="tab"
          :class="{ active: mode === 'split' }"
          @click="HandleModeChange('split')"
        >
          均等分割
        </button>
      </section>

      <section
        class="upload-area"
        :class="{ dragging: isDragging }"
        @dragenter.prevent="HandleDragEnter"
        @dragover.prevent="HandleDragOver"
        @dragleave.prevent="HandleDragLeave"
        @drop.prevent="HandleDrop"
      >
        <label class="upload-label">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            :multiple="mode === 'stitch'"
            hidden
            @change="HandleInputChange"
          />
          <span class="upload-title">
            {{
              mode === 'stitch'
                ? '拖拽多张图片到此处，或点击选择'
                : '拖拽一张大图到此处，或点击选择'
            }}
          </span>
          <span class="upload-tip">
            支持 JPG / PNG / WebP / GIF；单文件 ≤ 50MB
            {{ mode === 'stitch' ? '；可多选，支持自动网格或自由拖放摆放' : '' }}
          </span>
        </label>
      </section>

      <!-- 拼接模式 -->
      <template v-if="mode === 'stitch' && stitchItems.length">
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
            <button type="button" class="ghost" :disabled="isBusy" @click="HandleClear">
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
      </template>

      <!-- 分割模式 -->
      <template v-if="mode === 'split' && splitItem">
        <section class="options-card">
          <h2>分割参数</h2>
          <div class="split-source">
            <img
              :src="splitItem.previewUrl"
              :alt="splitItem.name"
              class="source-thumb"
            />
            <div class="file-meta">
              <span class="name">{{ splitItem.name }}</span>
              <span class="size">
                {{ splitItem.width }} × {{ splitItem.height }}
              </span>
            </div>
            <button type="button" class="ghost mini" @click="HandleClear">
              更换
            </button>
          </div>

          <div class="options-grid">
            <label class="field">
              <span>行数 {{ splitRows }}</span>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                :value="splitRows"
                @input="HandleRowsInput"
              />
            </label>
            <label class="field">
              <span>列数 {{ splitCols }}</span>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                :value="splitCols"
                @input="HandleColsInput"
              />
            </label>
          </div>

          <p class="info">
            将切成 {{ splitRows * splitCols }} 张 · 单格约
            {{ splitCellWidth }} × {{ splitCellHeight }} px
          </p>

          <div class="actions">
            <button
              type="button"
              class="primary"
              :disabled="isBusy"
              @click="HandleSplitDownload"
            >
              {{
                isBusy
                  ? '处理中…'
                  : splitRows * splitCols > 1
                    ? `分割并打包 ZIP（${splitRows * splitCols} 张）`
                    : '分割并下载 PNG'
              }}
            </button>
            <button type="button" class="ghost" :disabled="isBusy" @click="HandleClear">
              清空
            </button>
          </div>
        </section>

        <section class="preview-card">
          <h2>分割预览</h2>
          <p class="info">原图切线示意（与导出切分一致）</p>
          <div class="split-source-preview">
            <div class="split-source-frame" :style="splitSourceFrameStyle">
              <img
                :src="splitItem.previewUrl"
                :alt="splitItem.name"
                class="split-source-full"
                draggable="false"
              />
              <div
                v-for="line in splitVerticalLines"
                :key="`v-${line}`"
                class="cut-line vertical"
                :style="{ left: `${line}%` }"
              />
              <div
                v-for="line in splitHorizontalLines"
                :key="`h-${line}`"
                class="cut-line horizontal"
                :style="{ top: `${line}%` }"
              />
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
                  v-if="splitItem"
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

      <p v-if="statusText" class="status" :class="{ error: hasError }">
        {{ statusText }}
      </p>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 长图拼接 / 图片分割工具页
 * 自动网格或自由拖放拼接；单图行列均等分割并下载或 ZIP
 */
import { defineComponent } from 'vue'
import { APPBRAND } from '@/utils/Brand'
import {
  ComputeGridPositions,
  DownloadBlob,
  GetFreeStitchBounds,
  GetScaledDrawSize,
  GetSplitPreviewCells,
  GetStitchCanvasSize,
  LoadImageItemFromFile,
  RevokeImageItem,
  SplitImageGrid,
  StitchImagesFree,
  StitchImagesVertical,
  ZipSplitPieces,
  type LoadedImageItem,
  type StitchAlign,
  type StitchLayer,
} from '@/utils/ImageJoin'
import FreeLayoutCanvas from './components/FreeLayoutCanvas.vue'

const MAX_FILE_SIZE = 50 * 1024 * 1024

type ToolMode = 'stitch' | 'split'
type LayoutMode = 'auto' | 'free'

/** 拼接列表项（含缩放、对齐与自由坐标） */
type StitchItem = LoadedImageItem & {
  scale: number
  align: StitchAlign
  x: number
  y: number
}

export default defineComponent({
  name: 'ImageJoinView',
  components: {
    FreeLayoutCanvas,
  },
  data() {
    return {
      appBrand: APPBRAND,
      mode: 'stitch' as ToolMode,
      layoutMode: 'auto' as LayoutMode,
      isDragging: false,
      isBusy: false,
      statusText: '',
      hasError: false,
      stitchItems: [] as StitchItem[],
      stitchGap: 0,
      stitchColumns: 1,
      rowAlign: 'center' as StitchAlign,
      stitchPreviewUrl: '',
      previewTimer: 0 as number,
      activeUid: '',
      splitItem: null as LoadedImageItem | null,
      splitRows: 2,
      splitCols: 2,
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
     */
    itemAlignLabel(): string {
      return this.stitchColumns > 1 ? '行内垂直' : '左右对齐'
    },
    /**
     * 单项对齐选项
     */
    itemAlignOptions(): Array<{ id: StitchAlign; label: string }> {
      return this.stitchColumns > 1 ? this.valignOptions : this.alignOptions
    },
    /**
     * 预估行数
     */
    stitchRowCount(): number {
      if (!this.stitchItems.length) {
        return 0
      }
      return Math.ceil(this.stitchItems.length / this.stitchColumns)
    },
    /**
     * 自由布局包围盒
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
    /**
     * 分割预览单元格
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
      if (!this.splitItem) {
        return []
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
     */
    splitSourceFrameStyle(): Record<string, string> {
      if (!this.splitItem || !this.splitItem.width) {
        return {}
      }
      return {
        aspectRatio: `${this.splitItem.width} / ${this.splitItem.height}`,
      }
    },
    /**
     * 竖向切线位置（百分比）
     */
    splitVerticalLines(): number[] {
      if (!this.splitItem || this.splitCols <= 1) {
        return []
      }
      return this.splitPreviewCells
        .filter((cell) => cell.row === 1 && cell.col > 1)
        .map((cell) => (cell.x / this.splitItem!.width) * 100)
    },
    /**
     * 横向切线位置（百分比）
     */
    splitHorizontalLines(): number[] {
      if (!this.splitItem || this.splitRows <= 1) {
        return []
      }
      const firstCol = this.splitPreviewCells.filter((cell) => cell.col === 1)
      return firstCol
        .filter((cell) => cell.row > 1)
        .map((cell) => (cell.y / this.splitItem!.height) * 100)
    },
    /**
     * 小块宫格布局
     */
    splitPiecesGridStyle(): Record<string, string> {
      return {
        gridTemplateColumns: `repeat(${this.splitCols}, minmax(0, 1fr))`,
      }
    },
    /**
     * 分割单格约宽
     */
    splitCellWidth(): number {
      if (!this.splitItem) {
        return 0
      }
      return Math.floor(this.splitItem.width / this.splitCols)
    },
    /**
     * 分割单格约高
     */
    splitCellHeight(): number {
      if (!this.splitItem) {
        return 0
      }
      return Math.floor(this.splitItem.height / this.splitRows)
    },
  },
  /**
   * 挂载时同步标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '长图拼接 / 图片分割')
  },
  /**
   * 卸载释放资源
   */
  beforeUnmount() {
    this.ClearPreviewTimer()
    this.RevokeAll()
  },
  methods: {
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
      if (!this.splitItem) {
        return {}
      }
      const imgW = this.splitItem.width
      const imgH = this.splitItem.height
      // translate 百分比相对自身尺寸：按原图比例放大后再移到对应裁区
      return {
        width: `${(imgW / cell.width) * 100}%`,
        height: `${(imgH / cell.height) * 100}%`,
        transform: `translate(${(-cell.x / imgW) * 100}%, ${(-cell.y / imgH) * 100}%)`,
      }
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
     * 设置状态文案
     * @param text 文案
     * @param isError 是否错误
     */
    SetStatus(text: string, isError = false) {
      this.statusText = text
      this.hasError = isError
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
     * 释放全部 blob URL
     */
    RevokeAll() {
      this.stitchItems.forEach((item) => RevokeImageItem(item))
      if (this.splitItem) {
        RevokeImageItem(this.splitItem)
      }
      if (this.stitchPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.stitchPreviewUrl)
      }
    },
    /**
     * 切换拼接/分割
     * @param mode 模式
     */
    HandleModeChange(mode: ToolMode) {
      if (this.mode === mode) {
        return
      }
      this.mode = mode
      this.HandleClear()
      this.SetStatus(
        mode === 'stitch'
          ? '已切换到图片拼接（自动网格或自由拖放）'
          : '已切换到均等分割（请上传单张大图）',
      )
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
        this.SetStatus('自由拖放：在画布上拖动图片摆放')
        return
      }
      void this.RefreshStitchPreview()
      this.SetStatus('已切回自动网格')
    },
    /**
     * 按网格重新排布（自由模式）
     */
    HandleApplyAutoLayout() {
      this.ApplyAutoLayoutPositions()
      this.SetStatus('已按当前每行张数与间距重新排布')
    },
    /**
     * 拖拽进入
     */
    HandleDragEnter() {
      this.isDragging = true
    },
    /**
     * 拖拽悬停
     */
    HandleDragOver() {
      this.isDragging = true
    },
    /**
     * 拖拽离开
     * @param event 拖拽事件
     */
    HandleDragLeave(event: DragEvent) {
      const current = event.currentTarget as HTMLElement
      const related = event.relatedTarget as Node | null
      if (related && current.contains(related)) {
        return
      }
      this.isDragging = false
    },
    /**
     * 放下文件
     * @param event 拖拽事件
     */
    async HandleDrop(event: DragEvent) {
      this.isDragging = false
      const files = Array.from(event.dataTransfer?.files || [])
      await this.AppendFiles(files)
    },
    /**
     * input 选文件
     * @param event 变更事件
     */
    async HandleInputChange(event: Event) {
      const target = event.target as HTMLInputElement
      const files = Array.from(target.files || [])
      target.value = ''
      await this.AppendFiles(files)
    },
    /**
     * 过滤并加载文件
     * @param files 原始文件
     */
    async AppendFiles(files: File[]) {
      const images = files.filter((file) => file.type.startsWith('image/'))
      if (!images.length) {
        this.SetStatus('请选择图片文件', true)
        return
      }

      const rejected: string[] = []
      const valid = images.filter((file) => {
        if (file.size > MAX_FILE_SIZE) {
          rejected.push(file.name)
          return false
        }
        return true
      })

      if (!valid.length) {
        this.SetStatus(`文件超过 50MB：${rejected.join('、')}`, true)
        return
      }

      try {
        this.isBusy = true
        if (this.mode === 'stitch') {
          const loaded = await Promise.all(
            valid.map(async (file) => {
              const item = await LoadImageItemFromFile(file)
              return {
                ...item,
                scale: 100,
                align: 'center' as StitchAlign,
                x: 0,
                y: 0,
              }
            }),
          )
          this.stitchItems = [...this.stitchItems, ...loaded]
          this.ApplyAutoLayoutPositions()
          if (this.layoutMode === 'auto') {
            await this.RefreshStitchPreview()
          }
          const tip = rejected.length
            ? `已添加 ${loaded.length} 张；超限已过滤：${rejected.join('、')}`
            : `已添加 ${loaded.length} 张`
          this.SetStatus(tip, rejected.length > 0)
        } else {
          const file = valid[0]
          if (this.splitItem) {
            RevokeImageItem(this.splitItem)
          }
          this.splitItem = await LoadImageItemFromFile(file)
          this.SetStatus(
            rejected.length
              ? `已加载；其余超限已忽略：${rejected.join('、')}`
              : '图片已加载，设置行列后分割',
            rejected.length > 0,
          )
        }
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '加载失败',
          true,
        )
      } finally {
        this.isBusy = false
      }
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
        this.SetStatus('')
        return
      }
      if (this.layoutMode === 'auto') {
        await this.RefreshStitchPreview()
      }
    },
    /**
     * 行数
     * @param event 输入事件
     */
    HandleRowsInput(event: Event) {
      this.splitRows = Number((event.target as HTMLInputElement).value)
    },
    /**
     * 列数
     * @param event 输入事件
     */
    HandleColsInput(event: Event) {
      this.splitCols = Number((event.target as HTMLInputElement).value)
    },
    /**
     * 清空当前模式数据
     */
    HandleClear() {
      this.ClearPreviewTimer()
      this.stitchItems.forEach((item) => RevokeImageItem(item))
      this.stitchItems = []
      this.ClearStitchPreview()
      this.activeUid = ''
      if (this.splitItem) {
        RevokeImageItem(this.splitItem)
        this.splitItem = null
      }
      this.SetStatus('')
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
        this.SetStatus('请先上传图片', true)
        return
      }
      try {
        this.isBusy = true
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
        this.SetStatus('已开始下载 PNG')
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '拼接失败',
          true,
        )
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 分割并下载 / 打包
     */
    async HandleSplitDownload() {
      if (!this.splitItem) {
        this.SetStatus('请先上传图片', true)
        return
      }
      try {
        this.isBusy = true
        const pieces = await SplitImageGrid(
          this.splitItem.image,
          this.splitRows,
          this.splitCols,
          this.splitItem.name,
        )
        if (pieces.length === 1) {
          DownloadBlob(pieces[0].blob, pieces[0].fileName)
          this.SetStatus('已开始下载 PNG')
        } else {
          const { blob, fileName } = await ZipSplitPieces(pieces)
          DownloadBlob(blob, fileName)
          this.SetStatus(`已打包 ${pieces.length} 张为 ZIP`)
        }
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '分割失败',
          true,
        )
      } finally {
        this.isBusy = false
      }
    },
  },
})
</script>

<style scoped>
.join-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 48px 6vw 36px;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 196, 92, 0.45), transparent 42%),
    radial-gradient(circle at 82% 10%, rgba(84, 148, 255, 0.35), transparent 40%),
    linear-gradient(145deg, #1d2a44 0%, #31486f 48%, #4d6d9a 100%);
  overflow: hidden;
}

.hero-copy {
  position: relative;
  z-index: 1;
  color: #fff8ef;
}

.brand {
  margin: 0 0 8px;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  line-height: 1;
}

.hero h1 {
  margin: 0;
  font-size: clamp(1.3rem, 2.4vw, 1.8rem);
}

.subtitle {
  margin: 10px 0 0;
  opacity: 0.88;
}

.hero-nav {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
  align-self: flex-start;
}

.hero-nav a {
  color: #fff8ef;
  text-decoration: none;
  padding: 8px 14px;
  border: 1px solid rgba(255, 248, 239, 0.35);
  border-radius: 999px;
  font-size: 0.9rem;
}

.hero-nav a:hover,
.hero-nav a.router-link-active {
  background: rgba(255, 248, 239, 0.16);
  border-color: rgba(255, 248, 239, 0.7);
}

.workspace {
  flex: 1;
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
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

.upload-area {
  border: 1.5px dashed rgba(49, 65, 95, 0.28);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.upload-area.dragging {
  border-color: #3d6eb0;
  background: rgba(84, 148, 255, 0.12);
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 160px;
  padding: 28px 20px;
  cursor: pointer;
  text-align: center;
}

.upload-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1f2a3d;
}

.upload-tip {
  color: #6a7a94;
  font-size: 0.9rem;
  line-height: 1.5;
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

.file-row,
.split-source {
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

.thumb,
.source-thumb {
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

.split-source-full {
  display: block;
  width: 100%;
  height: auto;
  vertical-align: middle;
}

.cut-line {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  background: rgba(255, 248, 239, 0.92);
  box-shadow: 0 0 0 1px rgba(49, 72, 111, 0.45);
}

.cut-line.vertical {
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
}

.cut-line.horizontal {
  left: 0;
  right: 0;
  height: 2px;
  transform: translateY(-50%);
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

.status {
  margin: 0;
  color: #4a5a76;
  font-size: 0.9rem;
}

.status.error {
  color: #9f2f2f;
}

@media (max-width: 800px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .options-grid {
    grid-template-columns: 1fr;
  }
}
</style>
