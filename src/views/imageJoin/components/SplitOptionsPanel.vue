<template>
  <section class="options-card">
    <h2>{{ mode === 'freeSplit' ? '自由分割参数' : '均等分割参数' }}</h2>
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
      <button type="button" class="ghost mini" @click="EmitClear">
        更换
      </button>
    </div>

    <div v-if="mode === 'split'" class="options-grid">
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

    <div v-else class="free-split-tools">
      <div class="align-group">
        <span class="align-label">点击添加</span>
        <button
          type="button"
          class="mode-chip"
          :class="{ active: freeCutTool === 'vertical' }"
          @click="HandleFreeCutTool('vertical')"
        >
          竖线
        </button>
        <button
          type="button"
          class="mode-chip"
          :class="{ active: freeCutTool === 'horizontal' }"
          @click="HandleFreeCutTool('horizontal')"
        >
          横线
        </button>
      </div>
      <p class="info">
        点击预览添加切线；拖动线条平移，拖两端圆点调整长度，双击删除。当前
        {{ freeVerticalCutCount }} 条竖线 ·
        {{ freeHorizontalCutCount }} 条横线 · 共
        {{ splitPreviewCells.length }} 块
      </p>
      <div class="batch-row">
        <button type="button" class="ghost mini" @click="HandleClearFreeCuts">
          清空切线
        </button>
      </div>
    </div>

    <div class="align-group cut-color-row">
      <span class="align-label">切线颜色</span>
      <button
        v-for="opt in cutLineColorOptions"
        :key="opt.id"
        type="button"
        class="color-chip"
        :class="{ active: cutLineColor === opt.value }"
        :style="{ '--chip-color': opt.value }"
        :title="opt.label"
        @click="HandleCutLineColor(opt.value)"
      >
        <span class="color-dot" />
        {{ opt.label }}
      </button>
    </div>

    <p v-if="mode === 'split'" class="info">
      将切成 {{ splitRows * splitCols }} 张 · 单格约
      {{ splitCellWidth }} × {{ splitCellHeight }} px
    </p>

    <div class="actions">
      <button
        type="button"
        class="primary"
        :disabled="isBusy || splitPreviewCells.length < 1"
        @click="HandleSplitDownload"
      >
        {{
          isBusy
            ? '处理中…'
            : splitPreviewCells.length > 1
              ? `分割并打包 ZIP（${splitPreviewCells.length} 张）`
              : '分割并下载 PNG'
        }}
      </button>
      <button type="button" class="ghost" :disabled="isBusy" @click="EmitClear">
        清空
      </button>
    </div>
  </section>
</template>

<script lang="ts">
/**
 * 分割参数面板
 * 均等行列 / 自由切线工具、切线颜色与分割下载
 */
import { defineComponent, type PropType } from 'vue'
import {
  DownloadBlob,
  GetSplitPreviewCells,
  GetSplitPreviewCellsFromSegments,
  SplitImageBySegments,
  SplitImageGrid,
  ZipSplitPieces,
  type FreeCutSegment,
  type LoadedImageItem,
} from '@/utils/ImageJoin'

type SplitPanelMode = 'split' | 'freeSplit'
type FreeCutTool = 'vertical' | 'horizontal'

export default defineComponent({
  name: 'SplitOptionsPanel',
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
    freeCutTool: {
      type: String as PropType<FreeCutTool>,
      required: true,
    },
    freeCuts: {
      type: Array as PropType<FreeCutSegment[]>,
      required: true,
    },
    cutLineColor: {
      type: String,
      required: true,
    },
    isBusy: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    'update:splitRows': (_value: number) => true,
    'update:splitCols': (_value: number) => true,
    'update:freeCutTool': (_value: FreeCutTool) => true,
    'update:freeCuts': (_value: FreeCutSegment[]) => true,
    'update:cutLineColor': (_value: string) => true,
    clear: () => true,
    status: (_text: string, _isError?: boolean) => true,
    busy: (_value: boolean) => true,
  },
  data() {
    return {
      cutLineColorOptions: [
        { id: 'cyan', value: '#00e5ff', label: '青' },
        { id: 'red', value: '#ff3b30', label: '红' },
        { id: 'yellow', value: '#ffd60a', label: '黄' },
        { id: 'lime', value: '#30d158', label: '绿' },
        { id: 'magenta', value: '#ff2d55', label: '粉' },
        { id: 'orange', value: '#ff9f0a', label: '橙' },
        { id: 'white', value: '#ffffff', label: '白' },
      ],
    }
  },
  computed: {
    /**
     * 竖切线数量
     * @returns 数量
     */
    freeVerticalCutCount(): number {
      return this.freeCuts.filter((cut) => cut.axis === 'vertical').length
    },
    /**
     * 横切线数量
     * @returns 数量
     */
    freeHorizontalCutCount(): number {
      return this.freeCuts.filter((cut) => cut.axis === 'horizontal').length
    },
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
     * 分割单格约宽
     * @returns 宽度
     */
    splitCellWidth(): number {
      return Math.floor(this.splitItem.width / this.splitCols)
    },
    /**
     * 分割单格约高
     * @returns 高度
     */
    splitCellHeight(): number {
      return Math.floor(this.splitItem.height / this.splitRows)
    },
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
     * 通知父级清空
     */
    EmitClear() {
      this.$emit('clear')
    },
    /**
     * 行数滑块
     * @param event 输入事件
     */
    HandleRowsInput(event: Event) {
      this.$emit(
        'update:splitRows',
        Number((event.target as HTMLInputElement).value),
      )
    },
    /**
     * 列数滑块
     * @param event 输入事件
     */
    HandleColsInput(event: Event) {
      this.$emit(
        'update:splitCols',
        Number((event.target as HTMLInputElement).value),
      )
    },
    /**
     * 切换自由切线工具
     * @param tool 竖线或横线
     */
    HandleFreeCutTool(tool: FreeCutTool) {
      this.$emit('update:freeCutTool', tool)
    },
    /**
     * 设置切线颜色
     * @param color 颜色值
     */
    HandleCutLineColor(color: string) {
      this.$emit('update:cutLineColor', color)
    },
    /**
     * 清空自由切线
     */
    HandleClearFreeCuts() {
      this.$emit('update:freeCuts', [])
      this.EmitStatus('已清空自由切线')
    },
    /**
     * 分割并下载 / 打包
     */
    async HandleSplitDownload() {
      try {
        this.$emit('busy', true)
        const pieces =
          this.mode === 'freeSplit'
            ? await SplitImageBySegments(
                this.splitItem.image,
                this.freeCuts,
                this.splitItem.name,
              )
            : await SplitImageGrid(
                this.splitItem.image,
                this.splitRows,
                this.splitCols,
                this.splitItem.name,
              )
        if (pieces.length === 1) {
          DownloadBlob(pieces[0].blob, pieces[0].fileName)
          this.EmitStatus('已开始下载 PNG')
        } else {
          const { blob, fileName } = await ZipSplitPieces(pieces)
          DownloadBlob(blob, fileName)
          this.EmitStatus(`已打包 ${pieces.length} 张为 ZIP`)
        }
      } catch (error) {
        this.EmitStatus(
          error instanceof Error ? error.message : '分割失败',
          true,
        )
      } finally {
        this.$emit('busy', false)
      }
    },
  },
})
</script>

<style scoped>
.options-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.options-card h2 {
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

.split-source {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(49, 72, 111, 0.05);
  flex-wrap: wrap;
}

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

.align-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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

.info {
  margin: 0 0 8px;
  color: #6a7a94;
  font-size: 0.88rem;
}

.free-split-tools {
  margin-bottom: 8px;
}

.cut-color-row {
  margin: 8px 0 12px;
}

.color-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 5px 10px;
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
}

.color-chip.active {
  border-color: var(--chip-color, #31486f);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chip-color) 35%, transparent);
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--chip-color, #00e5ff);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
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

@media (max-width: 800px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
}
</style>
