<template>
  <div class="calc-page">
    <ToolPageHero
      title="图纸尺寸计算"
      subtitle="输入图案像素宽高，自动估算拼豆板规格、豆子总数；上传图纸可统计各色用量"
      :links="[{ to: '/', label: '工具列表' }, { to: '/generator', label: '拼豆工具' }, { to: '/palette-simulator', label: '配色模拟' }]"
    />

    <main class="workspace">
      <section class="panel input-panel">
        <h2>图案尺寸</h2>
        <div class="size-row">
          <label class="field">
            <span>宽度（豆 / 像素）</span>
            <input
              v-model.number="patternWidth"
              type="number"
              min="1"
              max="256"
              @input="HandleSizeChange"
            />
          </label>
          <label class="field">
            <span>高度（豆 / 像素）</span>
            <input
              v-model.number="patternHeight"
              type="number"
              min="1"
              max="256"
              @input="HandleSizeChange"
            />
          </label>
        </div>

        <label class="field">
          <span>外轮廓描边层数 {{ strokeWidth }}</span>
          <input
            v-model.number="strokeWidth"
            type="range"
            min="0"
            max="8"
            step="1"
            @input="HandleSizeChange"
          />
        </label>

        <div class="preset-row">
          <button
            v-for="preset in sizePresets"
            :key="preset.label"
            type="button"
            class="preset-btn"
            @click="ApplyPreset(preset.width, preset.height)"
          >
            {{ preset.label }}
          </button>
        </div>

        <section class="upload-block">
          <h3>可选：上传图纸统计色号</h3>
          <p class="tip">
            支持带色号标注的拼豆图纸：优先读取格子上的色号，识别不到再按色块匹配 MARD
          </p>
          <div
            class="upload-box"
            :class="{ dragging: isDragging }"
            @dragenter.prevent="HandleDragEnter"
            @dragover.prevent="HandleDragOver"
            @dragleave.prevent="HandleDragLeave"
            @drop.prevent="HandleDrop"
          >
            <label class="upload-label">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                @change="HandleImageSelect"
              />
              <span v-if="!imageName">点击或拖拽图片到此处（PNG / JPG / WebP）</span>
              <span v-else>已选：{{ imageName }}（点击或拖拽可更换）</span>
            </label>
          </div>
          <div class="inline-actions">
            <button
              type="button"
              class="ghost"
              :disabled="!imageName || isAnalyzing"
              @click="ClearImage"
            >
              清除图片
            </button>
            <button
              type="button"
              class="primary"
              :disabled="!imageFile || isAnalyzing"
              @click="AnalyzeImage"
            >
              {{ isAnalyzing ? '分析中…' : '统计色号用量' }}
            </button>
          </div>
          <p v-if="statusText" class="status" :class="{ error: hasError }">
            {{ statusText }}
          </p>
        </section>
      </section>

      <section class="panel result-panel">
        <h2>计算结果</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <span>主体尺寸</span>
            <strong>{{ result.width }} × {{ result.height }}</strong>
          </div>
          <div class="stat-card">
            <span>含描边后</span>
            <strong>{{ result.finalWidth }} × {{ result.finalHeight }}</strong>
          </div>
          <div class="stat-card">
            <span>预估豆子总数</span>
            <strong>{{ result.totalBeads }}</strong>
          </div>
          <div class="stat-card">
            <span>实物约尺寸</span>
            <strong>
              {{ FormatCm(result.physicalWidthMm) }} ×
              {{ FormatCm(result.physicalHeightMm) }}
            </strong>
          </div>
        </div>

        <p class="breakdown">
          主体约 {{ result.fillBeads }} 粒
          <template v-if="result.outlineBeads">
            · 描边约 {{ result.outlineBeads }} 粒
          </template>
          <template v-if="analyzedFilled > 0">
            · 图纸实填 {{ analyzedFilled }} 粒
          </template>
        </p>

        <div v-if="result.recommended" class="recommend">
          <h3>推荐板材</h3>
          <p>
            <strong>{{ result.recommended.board.name }}</strong>
            · 需 {{ result.recommended.totalBoards }} 块
            （{{ result.recommended.boardsX }} × {{ result.recommended.boardsY }}）
            · {{ result.recommended.board.note }}
          </p>
          <p v-if="result.recommended.fitsSingle" class="ok">可装入单块板</p>
          <p v-else class="warn">
            超出单板，拼板后余量约
            {{ result.recommended.leftoverWidth }} ×
            {{ result.recommended.leftoverHeight }} 孔
          </p>
        </div>

        <h3 class="table-title">各规格拼豆板对照</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>板型</th>
                <th>排布</th>
                <th>块数</th>
                <th>余量</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="layout in result.layouts"
                :key="layout.board.id"
                :class="{
                  best:
                    result.recommended &&
                    layout.board.id === result.recommended.board.id,
                }"
              >
                <td>
                  <strong>{{ layout.board.name }}</strong>
                  <small>{{ layout.board.note }}</small>
                </td>
                <td>{{ layout.boardsX }} × {{ layout.boardsY }}</td>
                <td>{{ layout.totalBoards }}</td>
                <td>{{ layout.leftoverWidth }} × {{ layout.leftoverHeight }}</td>
                <td>
                  <span v-if="layout.fitsSingle" class="tag ok">单板</span>
                  <span v-else class="tag">拼板</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel usage-panel">
        <div class="usage-head">
          <h2>颜色用量统计</h2>
          <span v-if="colorUsage.length">共 {{ colorUsage.length }} 色</span>
        </div>

        <div v-if="colorUsage.length" class="usage-list">
          <div
            v-for="item in colorUsage"
            :key="item.code"
            class="usage-item"
          >
            <span class="swatch" :style="{ background: item.hex }" />
            <div class="usage-meta">
              <strong>{{ item.code }}</strong>
              <span>{{ item.hex }}</span>
            </div>
            <div class="usage-bar-wrap">
              <div class="usage-bar" :style="{ width: `${Math.min(100, item.percent)}%` }" />
            </div>
            <div class="usage-count">
              <strong>{{ item.count }}</strong>
              <span>{{ item.percent }}%</span>
            </div>
          </div>
        </div>
        <p v-else class="empty">
          上传图纸并点击「统计色号用量」后，将按 MARD 色卡列出各色备料数量
        </p>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 图纸尺寸计算器页面
 * 估算板材规格、豆子总数，可选图片色号用量统计
 */
import { defineComponent } from 'vue'

import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  AnalyzeImageColorUsage,
  CalculatePatternSize,
  ClampPatternSize,
  ClampStrokeWidth,
  FormatPhysicalCm,
  LoadCalculatorImage,
  type ColorUsageItem,
  type PatternSizeResult,
} from '@/utils/BoardCalculator'

export default defineComponent({
  name: 'BoardCalculatorView',
  components: {
    ToolPageHero,
  },
  data() {
    const initial = CalculatePatternSize(48, 48, 0)
    return {
      patternWidth: 48,
      patternHeight: 48,
      strokeWidth: 0,
      result: initial as PatternSizeResult,
      sizePresets: [
        { label: '29×29', width: 29, height: 29 },
        { label: '48×48', width: 48, height: 48 },
        { label: '58×58', width: 58, height: 58 },
        { label: '64×96', width: 64, height: 96 },
      ],
      imageFile: null as File | null,
      imageName: '',
      isDragging: false,
      dragDepth: 0,
      isAnalyzing: false,
      colorUsage: [] as ColorUsageItem[],
      analyzedFilled: 0,
      statusText: '',
      hasError: false,
    }
  },
  /**
   * 挂载时设置标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '图纸尺寸计算')
  },
  methods: {
    /**
     * 毫米转厘米文案
     * @param mm 毫米
     * @returns 文案
     */
    FormatCm(mm: number): string {
      return FormatPhysicalCm(mm)
    },
    /**
     * 尺寸变更后重算
     */
    HandleSizeChange() {
      this.patternWidth = ClampPatternSize(this.patternWidth)
      this.patternHeight = ClampPatternSize(this.patternHeight)
      this.strokeWidth = ClampStrokeWidth(this.strokeWidth)
      this.result = CalculatePatternSize(
        this.patternWidth,
        this.patternHeight,
        this.strokeWidth,
      )
    },
    /**
     * 应用快捷尺寸
     * @param width 宽
     * @param height 高
     */
    ApplyPreset(width: number, height: number) {
      this.patternWidth = width
      this.patternHeight = height
      this.HandleSizeChange()
      if (this.imageFile) {
        void this.AnalyzeImage()
      }
    },
    /**
     * 应用选中的图片文件
     * @param file 文件
     */
    ApplyImageFile(file: File) {
      if (!file.type.startsWith('image/')) {
        this.SetStatus('请选择图片文件', true)
        return
      }
      this.imageFile = file
      this.imageName = file.name
      this.colorUsage = []
      this.analyzedFilled = 0
      this.SetStatus('已选择图片，点击「统计色号用量」开始分析')
    },
    /**
     * 拖拽进入
     */
    HandleDragEnter() {
      this.dragDepth += 1
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
     */
    HandleDragLeave() {
      this.dragDepth = Math.max(0, this.dragDepth - 1)
      if (this.dragDepth === 0) {
        this.isDragging = false
      }
    },
    /**
     * 拖拽放下图片
     * @param event 拖拽事件
     */
    HandleDrop(event: DragEvent) {
      this.dragDepth = 0
      this.isDragging = false
      const file = event.dataTransfer?.files?.[0]
      if (file) {
        this.ApplyImageFile(file)
      }
    },
    /**
     * 选择图纸图片
     * @param event 文件事件
     */
    HandleImageSelect(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0] || null
      input.value = ''
      if (file) {
        this.ApplyImageFile(file)
      }
    },
    /**
     * 清除上传图片与色号结果
     */
    ClearImage() {
      this.imageFile = null
      this.imageName = ''
      this.colorUsage = []
      this.analyzedFilled = 0
      this.SetStatus('已清除图片')
    },
    /**
     * 分析图片色号用量
     */
    async AnalyzeImage() {
      if (!this.imageFile) {
        this.SetStatus('请先上传图纸图片', true)
        return
      }
      this.isAnalyzing = true
      this.hasError = false
      try {
        const image = await LoadCalculatorImage(this.imageFile)
        const analyzed = await AnalyzeImageColorUsage(
          image,
          this.patternWidth,
          this.patternHeight,
        )
        this.colorUsage = analyzed.usage
        this.analyzedFilled = analyzed.filled
        this.patternWidth = analyzed.grid.width
        this.patternHeight = analyzed.grid.height
        this.HandleSizeChange()
        const modeText =
          analyzed.source === 'label'
            ? `色号标注 ${analyzed.labeledCount} 格`
            : analyzed.source === 'mixed'
              ? `色号 ${analyzed.labeledCount} 格 + 色块 ${analyzed.sampledCount} 格`
              : `色块识别 ${analyzed.sampledCount} 格`
        this.SetStatus(
          `已统计 ${analyzed.usage.length} 种颜色，实填 ${analyzed.filled} 粒（${modeText}）`,
        )
      } catch (error) {
        this.colorUsage = []
        this.analyzedFilled = 0
        this.SetStatus(
          error instanceof Error ? error.message : '分析失败',
          true,
        )
      } finally {
        this.isAnalyzing = false
      }
    },
    /**
     * 设置状态
     * @param text 文案
     * @param isError 是否错误
     */
    SetStatus(text: string, isError = false) {
      this.statusText = text
      this.hasError = isError
    },
  },
})
</script>

<style scoped>
.calc-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace {
  flex: 1;
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: 18px;
  align-items: start;
}

.panel {
  padding: 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.panel h2,
.panel h3 {
  margin: 0 0 12px;
  color: #1d2a44;
}

.panel h2 {
  font-size: 1.05rem;
}

.panel h3 {
  font-size: 0.95rem;
}

.size-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #31415f;
  font-size: 0.88rem;
  margin-bottom: 12px;
}

.field input[type='number'] {
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
}

.field input[type='range'] {
  width: 100%;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.preset-btn,
.ghost,
.primary {
  font: inherit;
  cursor: pointer;
}

.preset-btn {
  border: 1px solid rgba(49, 65, 95, 0.2);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.85rem;
}

.upload-block {
  padding-top: 8px;
  border-top: 1px solid rgba(49, 65, 95, 0.1);
}

.tip {
  margin: 0 0 10px;
  color: #6a7a96;
  font-size: 0.84rem;
  line-height: 1.5;
}

.upload-box {
  display: block;
  margin-bottom: 10px;
  border: 1px dashed rgba(49, 65, 95, 0.28);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  transition: border-color 0.2s, background 0.2s;
}

.upload-box.dragging {
  border-color: #31486f;
  background: rgba(49, 72, 111, 0.08);
}

.upload-label {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  padding: 14px;
  color: #4d5f7d;
  cursor: pointer;
  text-align: center;
  font-size: 0.9rem;
}

.inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ghost,
.primary {
  border-radius: 999px;
  padding: 9px 14px;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
}

.primary {
  border: 1px solid #31486f;
  background: #31486f;
  color: #fff8ef;
}

.ghost:disabled,
.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  margin: 10px 0 0;
  font-size: 0.86rem;
  color: #3f6b4a;
}

.status.error {
  color: #a33b3b;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat-card {
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(49, 65, 95, 0.1);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-card span {
  color: #6a7a96;
  font-size: 0.82rem;
}

.stat-card strong {
  color: #1d2a44;
  font-size: 1.05rem;
}

.breakdown {
  margin: 12px 0;
  color: #5a6a84;
  font-size: 0.9rem;
}

.recommend {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(49, 72, 111, 0.08);
  border: 1px solid rgba(49, 72, 111, 0.16);
  margin-bottom: 16px;
}

.recommend h3 {
  margin-bottom: 8px;
}

.recommend p {
  margin: 0 0 6px;
  color: #31415f;
  font-size: 0.9rem;
  line-height: 1.5;
}

.ok {
  color: #1f6b4a !important;
}

.warn {
  color: #8a5a12 !important;
}

.table-title {
  margin-top: 8px;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid rgba(49, 65, 95, 0.1);
  vertical-align: top;
  color: #31415f;
}

th {
  color: #6a7a96;
  font-weight: 600;
}

td strong {
  display: block;
  color: #1d2a44;
}

td small {
  display: block;
  margin-top: 2px;
  color: #8a96aa;
  font-size: 0.75rem;
}

tr.best {
  background: rgba(46, 125, 90, 0.08);
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(49, 65, 95, 0.08);
  color: #5a6a84;
  font-size: 0.75rem;
}

.tag.ok {
  background: rgba(46, 125, 90, 0.12);
  color: #1f6b4a;
}

.usage-panel {
  grid-column: 1 / -1;
}

.usage-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.usage-head h2 {
  margin: 0;
}

.usage-head span {
  color: #6a7a96;
  font-size: 0.86rem;
}

.usage-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.usage-item {
  display: grid;
  grid-template-columns: 28px minmax(72px, 100px) 1fr auto;
  gap: 10px;
  align-items: center;
}

.swatch {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.usage-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.usage-meta strong {
  color: #1d2a44;
  font-size: 0.92rem;
}

.usage-meta span {
  color: #8a96aa;
  font-size: 0.75rem;
}

.usage-bar-wrap {
  height: 8px;
  border-radius: 999px;
  background: rgba(49, 65, 95, 0.08);
  overflow: hidden;
}

.usage-bar {
  height: 100%;
  border-radius: 999px;
  background: #31486f;
}

.usage-count {
  text-align: right;
  min-width: 64px;
}

.usage-count strong {
  display: block;
  color: #1d2a44;
}

.usage-count span {
  color: #6a7a96;
  font-size: 0.78rem;
}

.empty {
  margin: 0;
  color: #6a7a96;
  font-size: 0.9rem;
  line-height: 1.5;
}

@media (max-width: 900px) {.workspace { grid-template-columns: 1fr; } .usage-item { grid-template-columns: 28px 1fr auto; } .usage-bar-wrap { grid-column: 1 / -1; }}
</style>
