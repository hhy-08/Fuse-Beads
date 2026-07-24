<template>
  <div class="qr-page">
    <ToolPageHero title="二维码生成" subtitle="输入文字或链接生成二维码，支持自定义颜色、嵌入图标与多格式导出" />

    <main class="workspace">
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
          <select v-model="errorLevel" :disabled="Boolean(logoFile)" @change="SchedulePreview">
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
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 二维码生成工具页
 * 支持文字/链接、颜色、中心图标与多格式导出
 */
import { defineComponent } from 'vue'

import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  GenerateQrImageBlob,
  GenerateQrPngBlob,
  GetQrExportFormats,
  ResolveQrFilename,
  ResolveQrFormatOption,
  TriggerQrDownload,
  type QrErrorLevel,
  type QrExportFormat,
} from '@/utils/QrCodeGenerator'

export default defineComponent({
  name: 'QrCodeView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
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
    this.$store.commit('SETAPPTITLE', '二维码生成')
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
  },
  methods: {
    /**
     * 释放预览 Object URL
     */
    RevokePreviewUrl() {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
        this.previewUrl = ''
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
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 18px;
  align-items: start;
}

.panel {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.form-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.logo-upload {
  display: flex;
  align-items: center;
  justify-content: center;
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

.logo-upload:hover {
  border-color: #31486f;
  color: #1d2a44;
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

.preview-image {
  max-width: 100%;
  height: auto;
  image-rendering: pixelated;
}

.preview-empty {
  margin: 0;
  color: #6a7a96;
  font-size: 0.95rem;
}

@media (max-width: 820px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  

  .field-row,
  .export-row {
    grid-template-columns: 1fr;
  }
}
</style>
