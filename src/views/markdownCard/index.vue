<template>
  <div class="md-page">
    <ToolPageHero
      title="Markdown 卡片生成"
      subtitle="粘贴 Markdown 渲染精美卡片样式，导出图片，适合社交平台分享代码、笔记。"
    />

    <main class="workspace">
      <section class="panel editor-panel">
        <div class="pane-head">
          <div class="pane-title">
            <h2>Markdown 输入</h2>
            <span v-if="fileName" class="file-tag" :title="fileName">{{ fileName }}</span>
          </div>
          <div class="pane-actions">
            <label class="ghost mini file-btn">
              上传 MD
              <input
                type="file"
                :accept="fileAccept"
                hidden
                @change="HandleLoadFile"
              />
            </label>
            <button type="button" class="ghost mini" @click="HandlePaste">粘贴</button>
            <button type="button" class="ghost mini" @click="HandleLoadSample">示例</button>
            <button type="button" class="ghost mini" @click="HandleClear">清空</button>
          </div>
        </div>
        <div
          class="drop-zone"
          :class="{ 'is-dragover': isDragOver }"
          @dragenter.prevent="HandleDragEnter"
          @dragover.prevent="HandleDragOver"
          @dragleave.prevent="HandleDragLeave"
          @drop.prevent="HandleDrop"
        >
          <textarea
            class="editor"
            :value="markdownText"
            placeholder="粘贴 Markdown，或将 .md 文件拖到此处…"
            spellcheck="false"
            @input="HandleInput"
          />
          <div v-if="isDragOver" class="drop-overlay" aria-hidden="true">
            <span>松开以上传 Markdown 文件</span>
          </div>
        </div>
        <p class="meta">
          {{ lineCount }} 行 · {{ charCount }} 字符
          <span class="meta-hint">支持点击上传或拖拽 .md / .txt</span>
        </p>

        <div class="controls">
          <label class="field">
            <span>主题</span>
            <div class="theme-grid">
              <button
                v-for="theme in themes"
                :key="theme.id"
                type="button"
                class="theme-chip"
                :class="{ active: themeId === theme.id }"
                :title="theme.description"
                @click="HandleTheme(theme.id)"
              >
                <span
                  class="theme-swatch"
                  :style="{ background: theme.cardBg, borderColor: theme.accentColor }"
                />
                {{ theme.label }}
              </button>
            </div>
          </label>

          <div class="field-row">
            <label class="field">
              <span>卡片宽度</span>
              <select v-model.number="cardWidth">
                <option
                  v-for="item in widths"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            </label>
            <label class="field">
              <span>导出格式</span>
              <select v-model="exportFormat">
                <option
                  v-for="item in formats"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            </label>
          </div>

          <label v-if="showQuality" class="field">
            <span>JPEG 质量 {{ exportQuality }}%</span>
            <input
              v-model.number="exportQuality"
              type="range"
              min="50"
              max="100"
              step="1"
            />
          </label>

          <label class="field">
            <span>导出清晰度 {{ exportScale }}x</span>
            <input
              v-model.number="exportScale"
              type="range"
              min="1"
              max="3"
              step="1"
            />
          </label>

          <label class="check">
            <input v-model="showFooter" type="checkbox" />
            <span>显示底部 {{ appBrand }} 水印</span>
          </label>

          <div class="actions">
            <button
              type="button"
              class="primary"
              :disabled="isBusy || !hasContent"
              @click="HandleExport"
            >
              {{ isBusy ? '处理中…' : downloadLabel }}
            </button>
            <button
              type="button"
              class="ghost action-ghost"
              :disabled="isBusy || !hasContent"
              @click="HandleSendToWatermark"
            >
              加水印
            </button>
          </div>

          <p v-if="statusText" class="status" :class="{ error: hasError, ok: !hasError }">
            {{ statusText }}
          </p>
        </div>
      </section>

      <section class="panel preview-panel">
        <div class="pane-head">
          <h2>卡片预览</h2>
          <span class="hint">{{ activeTheme.description }}</span>
        </div>
        <div class="preview-scroll">
          <div
            ref="exportRoot"
            class="card-stage"
            :style="stageStyle"
          >
            <article class="md-card" :style="cardStyle">
              <div
                class="md-body"
                :style="bodyStyle"
                v-html="renderedHtml"
              />
              <footer v-if="showFooter" class="md-footer" :style="footerStyle">
                {{ appBrand }} · Markdown 卡片
              </footer>
            </article>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * Markdown 卡片生成工具页
 * 粘贴 Markdown → 主题预览 → 导出分享图片
 */
import { defineComponent } from 'vue'
import router from '@/router'

import ToolPageHero from '@/components/ToolPageHero.vue'
import { APPBRAND } from '@/utils/Brand'
import {
  DEFAULTMARKDOWN,
  ExportMarkdownCardBlob,
  GetMarkdownCardFormats,
  GetMarkdownCardThemes,
  GetMarkdownCardWidths,
  MARKDOWNCARDEXTENSIONS,
  ReadMarkdownFileContent,
  RenderMarkdownToHtml,
  ResolveMarkdownCardFilename,
  ResolveMarkdownCardFormat,
  ResolveMarkdownCardTheme,
  TriggerMarkdownCardDownload,
  type MarkdownCardExportFormat,
  type MarkdownCardThemeId,
} from '@/utils/MarkdownCard'
import {
  BlobToDataUrl,
  SetWatermarkHandoff,
} from '@/utils/WatermarkHandoff'

export default defineComponent({
  name: 'MarkdownCardView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      appBrand: APPBRAND,
      markdownText: DEFAULTMARKDOWN,
      themes: GetMarkdownCardThemes(),
      widths: GetMarkdownCardWidths(),
      formats: GetMarkdownCardFormats(),
      themeId: 'ink' as MarkdownCardThemeId,
      cardWidth: 640,
      exportFormat: 'png' as MarkdownCardExportFormat,
      exportQuality: 92,
      exportScale: 2,
      showFooter: true,
      statusText: '',
      hasError: false,
      isBusy: false,
      fileName: '',
      isDragOver: false,
      dragDepth: 0,
      fileAccept: MARKDOWNCARDEXTENSIONS.map((ext) => `.${ext}`).join(','),
    }
  },
  computed: {
    /**
     * 是否有可导出内容
     * @returns 布尔值
     */
    hasContent(): boolean {
      return this.markdownText.trim().length > 0
    },
    /**
     * 行数
     * @returns 行数
     */
    lineCount(): number {
      if (!this.markdownText) {
        return 0
      }
      return this.markdownText.split(/\r\n|\r|\n/).length
    },
    /**
     * 字符数
     * @returns 字符数
     */
    charCount(): number {
      return this.markdownText.length
    },
    /**
     * 当前主题
     * @returns 主题对象
     */
    activeTheme() {
      return ResolveMarkdownCardTheme(this.themeId)
    },
    /**
     * 是否显示 JPEG 质量
     * @returns 布尔值
     */
    showQuality(): boolean {
      return ResolveMarkdownCardFormat(this.exportFormat).supportsQuality
    },
    /**
     * 导出按钮文案
     * @returns 文案
     */
    downloadLabel(): string {
      return `导出 ${ResolveMarkdownCardFormat(this.exportFormat).label}`
    },
    /**
     * 渲染后的安全 HTML
     * @returns HTML
     */
    renderedHtml(): string {
      return RenderMarkdownToHtml(this.markdownText)
    },
    /**
     * 舞台样式（含导出背景）
     * @returns 样式对象
     */
    stageStyle(): Record<string, string> {
      const theme = this.activeTheme
      return {
        background: theme.stageBg,
        padding: '36px 32px',
        width: `${this.cardWidth + 64}px`,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }
    },
    /**
     * 卡片容器样式
     * @returns 样式对象
     */
    cardStyle(): Record<string, string> {
      const theme = this.activeTheme
      return {
        background: theme.cardBg,
        color: theme.textColor,
        borderColor: theme.borderColor,
        width: `${this.cardWidth}px`,
        maxWidth: '100%',
      }
    },
    /**
     * Markdown 正文 CSS 变量
     * @returns 样式对象
     */
    bodyStyle(): Record<string, string> {
      const theme = this.activeTheme
      return {
        '--md-text': theme.textColor,
        '--md-muted': theme.mutedColor,
        '--md-accent': theme.accentColor,
        '--md-code-bg': theme.codeBg,
        '--md-code': theme.codeColor,
        '--md-border': theme.borderColor,
        '--md-link': theme.linkColor,
      }
    },
    /**
     * 页脚样式
     * @returns 样式对象
     */
    footerStyle(): Record<string, string> {
      const theme = this.activeTheme
      return {
        color: theme.mutedColor,
        borderTopColor: theme.borderColor,
      }
    },
  },
  methods: {
    /**
     * 写入 Markdown 文本并更新状态
     * @param text 文本
     * @param fileName 可选文件名
     * @param status 状态文案
     */
    ApplyMarkdownText(text: string, fileName = '', status = '') {
      this.markdownText = text
      this.fileName = fileName
      this.hasError = false
      this.statusText = status
    },
    /**
     * 从 File 读取并填入编辑器
     * @param file 文件
     */
    async ApplyMarkdownFile(file: File) {
      try {
        const text = await ReadMarkdownFileContent(file)
        this.ApplyMarkdownText(text, file.name, `已加载 ${file.name}`)
      } catch (error) {
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '读取文件失败'
      }
    },
    /**
     * 输入变更
     * @param event 输入事件
     */
    HandleInput(event: Event) {
      const target = event.target as HTMLTextAreaElement
      this.markdownText = target.value
      this.fileName = ''
      this.statusText = ''
      this.hasError = false
    },
    /**
     * 切换主题
     * @param themeId 主题 ID
     */
    HandleTheme(themeId: MarkdownCardThemeId) {
      this.themeId = themeId
    },
    /**
     * 上传 Markdown 文件
     * @param event 文件选择事件
     */
    async HandleLoadFile(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      input.value = ''
      if (!file) {
        return
      }
      await this.ApplyMarkdownFile(file)
    },
    /**
     * 拖拽进入投放区
     * @param event 拖拽事件
     */
    HandleDragEnter(event: DragEvent) {
      if (!this.HasDragFiles(event)) {
        return
      }
      this.dragDepth += 1
      this.isDragOver = true
    },
    /**
     * 拖拽在投放区上方移动（需 preventDefault 才能 drop）
     * @param event 拖拽事件
     */
    HandleDragOver(event: DragEvent) {
      if (!this.HasDragFiles(event)) {
        return
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }
      this.isDragOver = true
    },
    /**
     * 拖拽离开投放区（用深度计数避免子元素闪烁）
     */
    HandleDragLeave() {
      this.dragDepth = Math.max(0, this.dragDepth - 1)
      if (this.dragDepth === 0) {
        this.isDragOver = false
      }
    },
    /**
     * 判断拖拽是否携带文件
     * @param event 拖拽事件
     * @returns 是否有文件
     */
    HasDragFiles(event: DragEvent): boolean {
      return Boolean(event.dataTransfer?.types?.includes('Files'))
    },
    /**
     * 拖放 Markdown 文件到投放区
     * @param event 拖放事件
     */
    async HandleDrop(event: DragEvent) {
      this.dragDepth = 0
      this.isDragOver = false
      const file = event.dataTransfer?.files?.[0]
      if (!file) {
        return
      }
      await this.ApplyMarkdownFile(file)
    },
    /**
     * 从剪贴板粘贴
     */
    async HandlePaste() {
      try {
        const text = await navigator.clipboard.readText()
        if (!text) {
          this.hasError = true
          this.statusText = '剪贴板为空'
          return
        }
        this.ApplyMarkdownText(text, '', '已粘贴')
      } catch {
        this.hasError = true
        this.statusText = '无法读取剪贴板，请手动粘贴'
      }
    },
    /**
     * 载入示例
     */
    HandleLoadSample() {
      this.ApplyMarkdownText(DEFAULTMARKDOWN, '', '已载入示例')
    },
    /**
     * 清空输入
     */
    HandleClear() {
      this.markdownText = ''
      this.fileName = ''
      this.statusText = ''
      this.hasError = false
    },
    /**
     * 生成当前卡片 Blob
     * @returns 图片 Blob 与文件名
     */
    async BuildCardBlob(): Promise<{ blob: Blob; fileName: string }> {
      const root = this.$refs.exportRoot as HTMLElement | undefined
      if (!root) {
        throw new Error('预览区域未就绪')
      }
      const blob = await ExportMarkdownCardBlob(
        root,
        this.exportFormat,
        this.exportQuality / 100,
        this.exportScale,
      )
      return {
        blob,
        fileName: ResolveMarkdownCardFilename(this.exportFormat),
      }
    },
    /**
     * 导出卡片图片并下载
     */
    async HandleExport() {
      if (!this.hasContent || this.isBusy) {
        return
      }
      this.isBusy = true
      this.hasError = false
      this.statusText = '正在生成图片…'
      try {
        const { blob, fileName } = await this.BuildCardBlob()
        TriggerMarkdownCardDownload(blob, fileName)
        this.statusText = `已导出 ${(blob.size / 1024).toFixed(1)} KB`
      } catch (error) {
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '导出失败，请重试'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 生成卡片并送入加水印工具
     */
    async HandleSendToWatermark() {
      if (!this.hasContent || this.isBusy) {
        return
      }
      this.isBusy = true
      this.hasError = false
      this.statusText = '正在生成并送入加水印…'
      try {
        const { blob, fileName } = await this.BuildCardBlob()
        const dataUrl = await BlobToDataUrl(blob)
        SetWatermarkHandoff({ dataUrl, fileName })
        this.statusText = '已送入加水印工具'
        await router.push({
          path: '/watermark',
          query: { from: 'markdown-card' },
        })
      } catch (error) {
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '送入加水印失败'
      } finally {
        this.isBusy = false
      }
    },
  },
})
</script>

<style scoped>
.md-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 12% 0%, rgba(84, 148, 255, 0.08), transparent 36%),
    linear-gradient(180deg, #f3f6fb 0%, #e8edf5 100%);
  color: #1d2a44;
}

.workspace {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  gap: 20px;
  padding: 20px 6vw 48px;
  align-items: start;
}

.panel {
  background: rgba(255, 252, 247, 0.92);
  border: 1px solid rgba(29, 42, 68, 0.08);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 10px 28px rgba(29, 42, 68, 0.06);
}

.pane-head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin-bottom: 12px;
}

.pane-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.pane-head h2 {
  margin: 0;
  font-size: 1.05rem;
  flex-shrink: 0;
}

.file-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: #2f5fad;
  background: rgba(47, 95, 173, 0.1);
  border: 1px solid rgba(47, 95, 173, 0.22);
  border-radius: 999px;
  padding: 2px 10px;
}

.pane-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
}

.pane-actions .ghost.mini,
.pane-actions .file-btn {
  flex: 1 1 0;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
  min-width: 0;
  padding-left: 8px;
  padding-right: 8px;
}

.hint {
  font-size: 0.82rem;
  color: #5a6a84;
}

.drop-zone {
  position: relative;
  border-radius: 12px;
}

.drop-zone.is-dragover .editor {
  border-color: #3d6bb3;
  box-shadow: inset 0 0 0 2px rgba(61, 107, 179, 0.25);
}

.drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(61, 107, 179, 0.14);
  border: 2px dashed #3d6bb3;
  color: #1d2a44;
  font-size: 0.95rem;
  font-weight: 600;
  pointer-events: none;
  z-index: 2;
}

.editor {
  width: 100%;
  min-height: 280px;
  resize: vertical;
  border: 1px solid rgba(29, 42, 68, 0.14);
  border-radius: 12px;
  padding: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88rem;
  line-height: 1.55;
  color: #1d2a44;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.editor:focus {
  outline: 2px solid rgba(61, 107, 179, 0.35);
  outline-offset: 1px;
}

.meta {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: #5a6a84;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.meta-hint {
  opacity: 0.85;
}

.controls {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.88rem;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field select,
.field input[type='range'] {
  width: 100%;
}

.field select {
  border: 1px solid rgba(29, 42, 68, 0.14);
  border-radius: 10px;
  padding: 8px 10px;
  background: #fff;
  color: #1d2a44;
}

.theme-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.theme-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(29, 42, 68, 0.14);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  color: #1d2a44;
  font-size: 0.85rem;
}

.theme-chip.active {
  border-color: #3d6bb3;
  background: rgba(61, 107, 179, 0.1);
}

.theme-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid;
  box-sizing: border-box;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  cursor: pointer;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.primary,
.ghost {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
  font-size: 0.92rem;
}

.primary {
  background: linear-gradient(135deg, #2f5fad, #4d6d9a);
  color: #fff8ef;
}

.primary:disabled,
.action-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-ghost {
  border: 1px solid rgba(29, 42, 68, 0.18);
  background: #fff;
  color: #1d2a44;
}

.action-ghost:hover:not(:disabled) {
  background: rgba(29, 42, 68, 0.06);
}

.ghost.mini {
  border: 1px solid rgba(29, 42, 68, 0.16);
  background: transparent;
  color: #1d2a44;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.82rem;
}

.ghost.mini:hover,
.file-btn:hover {
  background: rgba(29, 42, 68, 0.06);
}

.file-btn {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.status {
  margin: 0;
  font-size: 0.86rem;
}

.status.ok {
  color: #2d7a5f;
}

.status.error {
  color: #b33a3a;
}

.preview-panel {
  min-height: 480px;
}

.preview-scroll {
  overflow: auto;
  border-radius: 14px;
  background:
    linear-gradient(45deg, #d8dee8 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(-45deg, #d8dee8 25%, transparent 25%) 0 0 / 16px 16px,
    #cfd6e2;
  padding: 20px;
  display: flex;
  justify-content: center;
}

.card-stage {
  border-radius: 8px;
}

.md-card {
  border: 1px solid;
  border-radius: 16px;
  padding: 28px 28px 18px;
  box-shadow: 0 16px 40px rgba(15, 20, 31, 0.14);
  box-sizing: border-box;
}

.md-body {
  font-size: 15px;
  line-height: 1.7;
  color: var(--md-text);
  word-break: break-word;
}

.md-body :deep(h1),
.md-body :deep(h2),
.md-body :deep(h3),
.md-body :deep(h4) {
  margin: 0.9em 0 0.45em;
  line-height: 1.3;
  color: var(--md-text);
}

.md-body :deep(h1) {
  font-size: 1.7em;
  padding-bottom: 0.35em;
  border-bottom: 2px solid var(--md-accent);
}

.md-body :deep(h2) {
  font-size: 1.35em;
}

.md-body :deep(h3) {
  font-size: 1.15em;
}

.md-body :deep(p) {
  margin: 0.65em 0;
}

.md-body :deep(a) {
  color: var(--md-link);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.md-body :deep(ul),
.md-body :deep(ol) {
  margin: 0.55em 0;
  padding-left: 1.35em;
}

.md-body :deep(li) {
  margin: 0.25em 0;
}

.md-body :deep(blockquote) {
  margin: 0.85em 0;
  padding: 0.35em 0 0.35em 1em;
  border-left: 3px solid var(--md-accent);
  color: var(--md-muted);
}

.md-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  background: var(--md-code-bg);
  color: var(--md-code);
  padding: 0.12em 0.4em;
  border-radius: 5px;
}

.md-body :deep(pre) {
  margin: 0.9em 0;
  padding: 14px 16px;
  background: var(--md-code-bg);
  border-radius: 10px;
  overflow-x: auto;
  border: 1px solid var(--md-border);
}

.md-body :deep(pre code) {
  padding: 0;
  background: transparent;
  font-size: 0.86em;
  line-height: 1.55;
}

.md-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--md-border);
  margin: 1.2em 0;
}

.md-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.9em 0;
  font-size: 0.92em;
}

.md-body :deep(th),
.md-body :deep(td) {
  border: 1px solid var(--md-border);
  padding: 8px 10px;
  text-align: left;
}

.md-body :deep(th) {
  background: var(--md-code-bg);
}

.md-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

.md-footer {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
}

@media (max-width: 960px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .card-stage,
  .md-card {
    width: 100% !important;
  }
}
</style>
