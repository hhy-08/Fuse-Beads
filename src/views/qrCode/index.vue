<template>
  <div class="qr-page">
    <ToolPageHero
      title="二维码工具"
      subtitle="生成可自定义样式的二维码，或上传图片解码识别内容"
    />

    <main class="workspace" :class="{ 'is-decode': activeMode === 'decode' }">
      <div class="mode-tabs">
        <button
          type="button"
          class="mode-tab"
          :class="{ active: activeMode === 'generate' }"
          @click="SwitchMode('generate')"
        >
          生成
        </button>
        <button
          type="button"
          class="mode-tab"
          :class="{ active: activeMode === 'decode' }"
          @click="SwitchMode('decode')"
        >
          解码
        </button>
      </div>

      <div class="workspace-body">
      <template v-if="activeMode === 'generate'">
        <section class="panel form-panel">
          <label class="field">
            <span>内容（文字 / 链接）</span>
            <textarea
              v-model="content"
              rows="4"
              placeholder="例如：https://example.com 或任意文字"
              @input="SchedulePreview"
            />
          </label>

          <div class="field-row">
            <label class="field">
              <span>前景色</span>
              <div class="color-row">
                <input
                  v-model="foreground"
                  type="color"
                  @input="SchedulePreview"
                />
                <input
                  v-model="foreground"
                  type="text"
                  class="color-text"
                  maxlength="9"
                  @input="SchedulePreview"
                />
              </div>
            </label>
            <label class="field">
              <span>背景色</span>
              <div class="color-row">
                <input
                  v-model="background"
                  type="color"
                  @input="SchedulePreview"
                />
                <input
                  v-model="background"
                  type="text"
                  class="color-text"
                  maxlength="9"
                  @input="SchedulePreview"
                />
              </div>
            </label>
          </div>

          <label class="field">
            <span>尺寸 {{ size }}px</span>
            <input
              v-model.number="size"
              type="range"
              min="200"
              max="1000"
              step="20"
              @input="SchedulePreview"
            />
          </label>

          <label class="field">
            <span>边距 {{ margin }}</span>
            <input
              v-model.number="margin"
              type="range"
              min="0"
              max="8"
              step="1"
              @input="SchedulePreview"
            />
          </label>

          <label class="field">
            <span>纠错等级</span>
            <select
              v-model="errorLevel"
              :disabled="Boolean(logoFile)"
              @change="SchedulePreview"
            >
              <option value="L">L（约 7%）</option>
              <option value="M">M（约 15%）</option>
              <option value="Q">Q（约 25%）</option>
              <option value="H">H（约 30%）</option>
            </select>
            <span v-if="logoFile" class="hint">嵌入图标时自动使用 H 等级</span>
          </label>

          <div class="logo-block">
            <div class="logo-head">
              <span>中心图标（可选）</span>
              <button
                v-if="logoFile"
                type="button"
                class="ghost-sm"
                @click="ClearLogo"
              >
                移除图标
              </button>
            </div>
            <label class="logo-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                @change="HandleLogoSelect"
              />
              <span v-if="logoFile">已选：{{ logoFile.name }}</span>
              <span v-else>点击上传 PNG / JPG / WebP / SVG</span>
            </label>
            <label v-if="logoFile" class="field">
              <span>图标占比 {{ Math.round(logoScale * 100) }}%</span>
              <input
                v-model.number="logoScale"
                type="range"
                min="0.12"
                max="0.28"
                step="0.01"
                @input="SchedulePreview"
              />
            </label>
          </div>

          <div class="export-row">
            <label class="field">
              <span>导出格式</span>
              <select v-model="exportFormat">
                <option
                  v-for="item in exportFormats"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            </label>
            <label v-if="showQuality" class="field">
              <span>导出质量 {{ exportQuality }}%</span>
              <input
                v-model.number="exportQuality"
                type="range"
                min="40"
                max="100"
                step="1"
              />
            </label>
          </div>

          <div class="actions">
            <button
              type="button"
              class="ghost"
              :disabled="isBusy"
              @click="ResetForm"
            >
              重置
            </button>
            <button
              type="button"
              class="primary"
              :disabled="isBusy || !previewUrl"
              @click="DownloadImage"
            >
              {{ downloadButtonLabel }}
            </button>
          </div>

          <p v-if="statusText" class="status" :class="{ error: hasError }">
            {{ statusText }}
          </p>
        </section>

        <section class="panel preview-panel">
          <h2>预览</h2>
          <div class="preview-stage" :style="{ background: checkerBg }">
            <img
              v-if="previewUrl"
              :src="previewUrl"
              alt="二维码预览"
              class="preview-image"
            />
            <p v-else class="preview-empty">输入内容后自动生成预览</p>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="panel decode-panel">
          <div
            class="decode-drop"
            :class="{ 'is-dragover': isDecodeDragOver }"
            @dragenter.prevent="HandleDecodeDragEnter"
            @dragover.prevent="HandleDecodeDragOver"
            @dragleave.prevent="HandleDecodeDragLeave"
            @drop.prevent="HandleDecodeDrop"
          >
            <label class="decode-upload">
              <input
                type="file"
                :accept="decodeAccept"
                hidden
                @change="HandleDecodeFileSelect"
              />
              <span class="decode-title">点击或拖拽二维码图片到此处</span>
              <span class="decode-tip">支持 PNG / JPG / WebP / GIF / BMP</span>
            </label>
            <div class="decode-actions">
              <button
                type="button"
                class="ghost"
                :disabled="isBusy"
                @click="HandleDecodePaste"
              >
                从剪贴板粘贴图片
              </button>
              <button
                type="button"
                class="ghost"
                :disabled="isBusy || !decodePreviewUrl"
                @click="ClearDecode"
              >
                清空
              </button>
            </div>
          </div>

          <p v-if="decodeStatusText" class="status" :class="{ error: decodeHasError }">
            {{ decodeStatusText }}
          </p>

          <label class="field">
            <span>解码结果</span>
            <textarea
              class="decode-result"
              :value="decodeResult"
              rows="6"
              readonly
              placeholder="识别成功后显示内容…"
            />
          </label>

          <div class="actions">
            <button
              type="button"
              class="ghost"
              :disabled="!decodeResult"
              @click="CopyDecodeResult"
            >
              复制结果
            </button>
            <button
              type="button"
              class="primary"
              :disabled="!decodeResult"
              @click="UseDecodeAsContent"
            >
              用于生成
            </button>
          </div>
        </section>

        <section class="panel preview-panel">
          <h2>解码预览</h2>
          <div class="preview-stage decode-preview-stage">
            <img
              v-if="decodePreviewUrl"
              :src="decodePreviewUrl"
              alt="待解码图片"
              class="preview-image decode-preview-image"
            />
            <p v-else class="preview-empty">上传或粘贴含二维码的图片</p>
          </div>
          <p v-if="decodeFileName" class="decode-file-name">{{ decodeFileName }}</p>
        </section>
      </template>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 二维码工具页
 * 生成：文字/链接、颜色、中心图标与多格式导出
 * 解码：上传 / 拖拽 / 剪贴板图片识别内容
 */
import { defineComponent } from 'vue'

import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  DecodeQrFromImageFile,
  GenerateQrImageBlob,
  GenerateQrPngBlob,
  GetQrExportFormats,
  QRDECODEACCEPT,
  ResolveQrFilename,
  ResolveQrFormatOption,
  TriggerQrDownload,
  type QrErrorLevel,
  type QrExportFormat,
} from '@/utils/QrCodeGenerator'

/** 页面模式 */
type QrPageMode = 'generate' | 'decode'

export default defineComponent({
  name: 'QrCodeView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      activeMode: 'generate' as QrPageMode,
      content: 'https://',
      foreground: '#1d2a44',
      background: '#ffffff',
      size: 360,
      margin: 2,
      errorLevel: 'M' as QrErrorLevel,
      logoFile: null as File | null,
      logoScale: 0.2,
      exportFormats: GetQrExportFormats(),
      exportFormat: 'png' as QrExportFormat,
      exportQuality: 92,
      previewUrl: '',
      statusText: '',
      hasError: false,
      isBusy: false,
      previewTimer: null as ReturnType<typeof setTimeout> | null,
      decodeAccept: QRDECODEACCEPT,
      decodePreviewUrl: '',
      decodeFileName: '',
      decodeResult: '',
      decodeStatusText: '',
      decodeHasError: false,
      isDecodeDragOver: false,
      decodeDragDepth: 0,
    }
  },
  computed: {
    /**
     * 预览区背景色
     * @returns CSS 背景
     */
    checkerBg(): string {
      return this.background
    },
    /**
     * JPEG / WebP 是否显示质量滑杆
     * @returns 布尔值
     */
    showQuality(): boolean {
      return ResolveQrFormatOption(this.exportFormat).supportsQuality
    },
    /**
     * 导出按钮文案
     * @returns 文案
     */
    downloadButtonLabel(): string {
      if (this.isBusy) {
        return '处理中…'
      }
      const label = ResolveQrFormatOption(this.exportFormat).label
      return `导出 ${label}`
    },
  },
  /**
   * 挂载后初始化标题与预览
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '二维码工具')
    this.SchedulePreview()
  },
  /**
   * 卸载时清理定时器与预览 URL
   */
  beforeUnmount() {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer)
    }
    this.RevokePreviewUrl()
    this.RevokeDecodePreviewUrl()
  },
  methods: {
    /**
     * 切换生成 / 解码模式
     * @param mode 模式
     */
    SwitchMode(mode: QrPageMode) {
      this.activeMode = mode
      this.$store.commit(
        'SETAPPTITLE',
        mode === 'generate' ? '二维码生成' : '二维码解码',
      )
    },
    /**
     * 释放生成预览 Object URL
     */
    RevokePreviewUrl() {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
        this.previewUrl = ''
      }
    },
    /**
     * 释放解码预览 Object URL
     */
    RevokeDecodePreviewUrl() {
      if (this.decodePreviewUrl) {
        URL.revokeObjectURL(this.decodePreviewUrl)
        this.decodePreviewUrl = ''
      }
    },
    /**
     * 防抖调度预览刷新
     */
    SchedulePreview() {
      if (this.previewTimer) {
        clearTimeout(this.previewTimer)
      }
      this.previewTimer = setTimeout(() => {
        void this.RefreshPreview()
      }, 220)
    },
    /**
     * 刷新二维码预览
     */
    async RefreshPreview() {
      const text = this.content.trim()
      if (!text) {
        this.RevokePreviewUrl()
        this.statusText = ''
        this.hasError = false
        return
      }

      this.isBusy = true
      this.hasError = false
      try {
        const blob = await GenerateQrPngBlob({
          text,
          size: this.size,
          foreground: this.foreground,
          background: this.background,
          margin: this.margin,
          errorCorrectionLevel: this.errorLevel,
          logoFile: this.logoFile,
          logoScale: this.logoScale,
        })
        this.RevokePreviewUrl()
        this.previewUrl = URL.createObjectURL(blob)
        this.statusText = ''
      } catch (error) {
        this.RevokePreviewUrl()
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '生成失败，请检查输入'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 选择中心图标
     * @param event 文件选择事件
     */
    HandleLogoSelect(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0] || null
      input.value = ''
      if (!file) {
        return
      }
      if (!file.type.startsWith('image/')) {
        this.hasError = true
        this.statusText = '请选择图片文件作为图标'
        return
      }
      this.logoFile = file
      this.SchedulePreview()
    },
    /**
     * 移除中心图标
     */
    ClearLogo() {
      this.logoFile = null
      this.SchedulePreview()
    },
    /**
     * 重置表单为默认值
     */
    ResetForm() {
      this.content = 'https://'
      this.foreground = '#1d2a44'
      this.background = '#ffffff'
      this.size = 360
      this.margin = 2
      this.errorLevel = 'M'
      this.logoFile = null
      this.logoScale = 0.2
      this.exportFormat = 'png'
      this.exportQuality = 92
      this.statusText = ''
      this.hasError = false
      this.SchedulePreview()
    },
    /**
     * 按所选格式导出当前二维码
     */
    async DownloadImage() {
      const text = this.content.trim()
      if (!text) {
        this.hasError = true
        this.statusText = '请输入文字或链接'
        return
      }

      this.isBusy = true
      this.hasError = false
      try {
        const format = this.exportFormat
        const blob = await GenerateQrImageBlob({
          text,
          size: this.size,
          foreground: this.foreground,
          background: this.background,
          margin: this.margin,
          errorCorrectionLevel: this.errorLevel,
          logoFile: this.logoFile,
          logoScale: this.logoScale,
          format,
          quality: this.exportQuality,
        })
        TriggerQrDownload(blob, ResolveQrFilename(text, format))
        const label = ResolveQrFormatOption(format).label
        this.statusText = `已开始下载 ${label}`
      } catch (error) {
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '导出失败'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 解码指定图片文件
     * @param file 图片文件
     */
    async DecodeImageFile(file: File) {
      this.isBusy = true
      this.decodeHasError = false
      this.decodeStatusText = '正在识别…'
      this.decodeResult = ''
      this.RevokeDecodePreviewUrl()
      this.decodePreviewUrl = URL.createObjectURL(file)
      this.decodeFileName = file.name
      try {
        const text = await DecodeQrFromImageFile(file)
        this.decodeResult = text
        this.decodeStatusText = '识别成功'
      } catch (error) {
        this.decodeHasError = true
        this.decodeStatusText =
          error instanceof Error ? error.message : '解码失败'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 选择待解码图片
     * @param event 文件事件
     */
    async HandleDecodeFileSelect(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      input.value = ''
      if (!file) {
        return
      }
      await this.DecodeImageFile(file)
    },
    /**
     * 判断拖拽是否含文件
     * @param event 拖拽事件
     * @returns 是否含文件
     */
    HasDragFiles(event: DragEvent): boolean {
      return Boolean(event.dataTransfer?.types?.includes('Files'))
    },
    /**
     * 拖拽进入解码区
     * @param event 拖拽事件
     */
    HandleDecodeDragEnter(event: DragEvent) {
      if (!this.HasDragFiles(event)) {
        return
      }
      this.decodeDragDepth += 1
      this.isDecodeDragOver = true
    },
    /**
     * 拖拽在解码区上方
     * @param event 拖拽事件
     */
    HandleDecodeDragOver(event: DragEvent) {
      if (!this.HasDragFiles(event)) {
        return
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }
      this.isDecodeDragOver = true
    },
    /**
     * 拖拽离开解码区
     */
    HandleDecodeDragLeave() {
      this.decodeDragDepth = Math.max(0, this.decodeDragDepth - 1)
      if (this.decodeDragDepth === 0) {
        this.isDecodeDragOver = false
      }
    },
    /**
     * 拖放图片到解码区
     * @param event 拖放事件
     */
    async HandleDecodeDrop(event: DragEvent) {
      this.decodeDragDepth = 0
      this.isDecodeDragOver = false
      const file = event.dataTransfer?.files?.[0]
      if (!file) {
        return
      }
      await this.DecodeImageFile(file)
    },
    /**
     * 从剪贴板读取图片并解码
     */
    async HandleDecodePaste() {
      this.decodeHasError = false
      this.decodeStatusText = '正在读取剪贴板…'
      try {
        if (!navigator.clipboard?.read) {
          throw new Error('当前浏览器不支持读取剪贴板图片，请改用上传')
        }
        const items = await navigator.clipboard.read()
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith('image/'))
          if (!imageType) {
            continue
          }
          const blob = await item.getType(imageType)
          const ext = imageType.split('/')[1] || 'png'
          const file = new File([blob], `clipboard.${ext}`, { type: imageType })
          await this.DecodeImageFile(file)
          return
        }
        throw new Error('剪贴板中没有图片，请先复制二维码截图')
      } catch (error) {
        this.decodeHasError = true
        this.decodeStatusText =
          error instanceof Error ? error.message : '粘贴解码失败'
      }
    },
    /**
     * 清空解码区
     */
    ClearDecode() {
      this.RevokeDecodePreviewUrl()
      this.decodeFileName = ''
      this.decodeResult = ''
      this.decodeStatusText = ''
      this.decodeHasError = false
      this.isDecodeDragOver = false
      this.decodeDragDepth = 0
    },
    /**
     * 复制解码结果
     */
    async CopyDecodeResult() {
      if (!this.decodeResult) {
        return
      }
      try {
        await navigator.clipboard.writeText(this.decodeResult)
        this.decodeHasError = false
        this.decodeStatusText = '已复制到剪贴板'
      } catch {
        this.decodeHasError = true
        this.decodeStatusText = '复制失败，请手动选择文本'
      }
    },
    /**
     * 将解码结果填入生成内容
     */
    UseDecodeAsContent() {
      if (!this.decodeResult) {
        return
      }
      this.content = this.decodeResult
      this.SwitchMode('generate')
      this.SchedulePreview()
      this.statusText = '已填入解码结果，可继续调整样式并导出'
      this.hasError = false
    },
  },
})
</script>

<style scoped>
.qr-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace {
  flex: 1;
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

.workspace-body {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 18px;
  align-items: start;
}

.workspace.is-decode .workspace-body {
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 14px;
}

.mode-tabs {
  display: inline-flex;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(49, 65, 95, 0.12);
  width: fit-content;
  flex-shrink: 0;
}

.mode-tab {
  border: none;
  border-radius: 999px;
  padding: 8px 18px;
  background: transparent;
  color: #31415f;
  font: inherit;
  cursor: pointer;
}

.mode-tab.active {
  background: #31486f;
  color: #fff8ef;
}

.panel {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.form-panel,
.decode-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.workspace.is-decode .decode-panel {
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #31415f;
  font-size: 0.92rem;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field textarea,
.field select,
.color-text {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  color: #1d2a44;
  background: #fff;
}

.field textarea {
  resize: vertical;
  min-height: 96px;
}

.field input[type='range'] {
  width: 100%;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-row input[type='color'] {
  width: 44px;
  height: 40px;
  padding: 0;
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}

.hint {
  font-size: 0.8rem;
  color: #6a7a96;
}

.logo-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.logo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #31415f;
  font-size: 0.92rem;
}

.logo-upload,
.decode-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 52px;
  padding: 12px;
  border: 1px dashed rgba(49, 65, 95, 0.28);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  color: #4d5f7d;
  cursor: pointer;
  text-align: center;
  font-size: 0.9rem;
}

.logo-upload:hover,
.decode-upload:hover {
  border-color: #31486f;
  color: #1d2a44;
}

.decode-drop {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(49, 65, 95, 0.1);
  background: rgba(255, 255, 255, 0.55);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.decode-drop.is-dragover {
  border-color: #3d6bb3;
  background: rgba(61, 107, 179, 0.08);
}

.decode-upload {
  min-height: 88px;
}

.decode-title {
  font-weight: 600;
  color: #1d2a44;
}

.decode-tip {
  font-size: 0.82rem;
  color: #6a7a96;
}

.decode-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.decode-result {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88rem;
  line-height: 1.55;
  min-height: 120px;
}

.decode-file-name {
  margin: 10px 0 0;
  font-size: 0.82rem;
  color: #6a7a96;
  word-break: break-all;
}

.ghost-sm {
  border: none;
  background: transparent;
  color: #4d6d9a;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  padding: 0;
}

.export-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 4px;
  flex-wrap: wrap;
}

.actions button,
.ghost,
.primary {
  border-radius: 999px;
  padding: 10px 18px;
  font: inherit;
  cursor: pointer;
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

.actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.status {
  margin: 0;
  font-size: 0.9rem;
  color: #3f6b4a;
}

.status.error {
  color: #a33b3b;
}

.preview-panel h2 {
  margin: 0 0 14px;
  font-size: 1.05rem;
  color: #1d2a44;
}

.preview-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 20px;
  border-radius: 14px;
  border: 1px solid rgba(49, 65, 95, 0.12);
}

.decode-preview-stage {
  background: #eef2f8;
  min-height: 200px;
  padding: 12px;
}

.workspace.is-decode .preview-panel h2 {
  margin-bottom: 10px;
  font-size: 1rem;
}

.preview-image {
  max-width: 100%;
  height: auto;
  image-rendering: pixelated;
}

.decode-preview-image {
  image-rendering: auto;
  border-radius: 8px;
}

.preview-empty {
  margin: 0;
  color: #6a7a96;
  font-size: 0.95rem;
}

@media (max-width: 820px) {
  .workspace-body,
  .workspace.is-decode .workspace-body {
    grid-template-columns: 1fr;
  }

  .field-row,
  .export-row {
    grid-template-columns: 1fr;
  }
}
</style>
