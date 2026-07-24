<template>
  <div class="svg-page">
    <ToolPageHero
      title="SVG 转图片"
      subtitle="支持 SVG 文件转换为 PNG、JPG、WEBP 等格式，可自定义输出尺寸，支持文件拖放和 URL 导入"
    />

    <main class="workspace">
      <section class="panel left-panel">
        <div
          class="drop-zone"
          :class="{ 'is-dragover': isDragOver }"
          @dragenter.prevent="HandleDragEnter"
          @dragover.prevent="HandleDragOver"
          @dragleave.prevent="HandleDragLeave"
          @drop.prevent="HandleDrop"
        >
          <label class="drop-label">
            <input
              type="file"
              :accept="fileAccept"
              hidden
              @change="HandleFileSelect"
            />
            <span class="drop-title">点击或拖拽 SVG 到此处</span>
            <span class="drop-tip">仅支持 .svg 文件</span>
          </label>
        </div>

        <div class="url-row">
          <label class="field grow">
            <span>从 URL 导入</span>
            <input
              v-model="urlInput"
              type="url"
              placeholder="https://example.com/icon.svg"
              @keydown.enter.prevent="HandleFetchUrl"
            />
          </label>
          <button
            type="button"
            class="ghost url-btn"
            :disabled="isBusy || !urlInput.trim()"
            @click="HandleFetchUrl"
          >
            {{ isBusy ? '加载中…' : '导入' }}
          </button>
        </div>

        <p v-if="sourceName" class="source-meta">
          当前：{{ sourceName }}
          <template v-if="intrinsicWidth && intrinsicHeight">
            · 原始约 {{ intrinsicWidth }} × {{ intrinsicHeight }}
          </template>
        </p>

        <div class="field-row">
          <label class="field">
            <span>输出格式</span>
            <select v-model="outputFormat" @change="ScheduleConvert">
              <option
                v-for="item in formats"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
          </label>
          <label v-if="showQuality" class="field">
            <span>质量 {{ quality }}%</span>
            <input
              v-model.number="quality"
              type="range"
              min="40"
              max="100"
              step="1"
              @input="ScheduleConvert"
            />
          </label>
        </div>

        <label class="check">
          <input v-model="lockAspect" type="checkbox" @change="HandleLockAspect" />
          <span>锁定宽高比</span>
        </label>

        <div class="field-row">
          <label class="field">
            <span>宽度 (px)</span>
            <input
              v-model.number="outputWidth"
              type="number"
              min="1"
              :max="maxSide"
              @input="HandleWidthInput"
            />
          </label>
          <label class="field">
            <span>高度 (px)</span>
            <input
              v-model.number="outputHeight"
              type="number"
              min="1"
              :max="maxSide"
              @input="HandleHeightInput"
            />
          </label>
        </div>

        <div class="preset-row">
          <button
            v-for="preset in sizePresets"
            :key="preset.label"
            type="button"
            class="chip"
            @click="ApplyPreset(preset.scale)"
          >
            {{ preset.label }}
          </button>
          <button type="button" class="chip" @click="ResetToIntrinsic">
            原始尺寸
          </button>
        </div>

        <div class="actions">
          <button
            type="button"
            class="ghost"
            :disabled="isBusy || !svgText"
            @click="ClearAll"
          >
            清空
          </button>
          <button
            type="button"
            class="primary"
            :disabled="isBusy || !resultBlob"
            @click="HandleDownload"
          >
            {{ downloadLabel }}
          </button>
        </div>

        <p v-if="statusText" class="status" :class="{ error: hasError, ok: !hasError }">
          {{ statusText }}
        </p>
      </section>

      <section class="panel preview-panel">
        <h2>预览</h2>
        <div class="preview-stage" :class="{ jpeg: outputFormat === 'jpeg' }">
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt="转换预览"
            class="preview-image"
          />
          <p v-else class="preview-empty">上传或导入 SVG 后显示预览</p>
        </div>
        <p v-if="resultBlob" class="preview-meta">
          {{ outputWidth }} × {{ outputHeight }} ·
          {{ FormatSize(resultBlob.size) }} · {{ formatLabel }}
        </p>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * SVG 转图片工具页
 * 文件拖放 / URL 导入，自定义尺寸导出 PNG / JPEG / WebP
 */
import { defineComponent } from 'vue'

import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  ClampSvgOutputSide,
  ConvertSvgToImage,
  FetchSvgTextFromUrl,
  GetSvgOutputFormats,
  IsSvgFile,
  ParseSvgIntrinsicSize,
  ReadSvgFileText,
  ResolveSvgFormatOption,
  SVGTOIMAGEACCEPT,
  SVGTOIMAGEMAXSIDE,
  TriggerSvgDownload,
  type SvgOutputFormat,
} from '@/utils/SvgToImage'

export default defineComponent({
  name: 'SvgToImageView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      formats: GetSvgOutputFormats(),
      fileAccept: SVGTOIMAGEACCEPT,
      maxSide: SVGTOIMAGEMAXSIDE,
      svgText: '',
      sourceName: '',
      urlInput: '',
      outputFormat: 'png' as SvgOutputFormat,
      quality: 92,
      outputWidth: 512,
      outputHeight: 512,
      intrinsicWidth: 0,
      intrinsicHeight: 0,
      lockAspect: true,
      aspectRatio: 1,
      isDragOver: false,
      dragDepth: 0,
      isBusy: false,
      statusText: '',
      hasError: false,
      previewUrl: '',
      resultBlob: null as Blob | null,
      convertTimer: null as ReturnType<typeof setTimeout> | null,
      sizePresets: [
        { label: '0.5x', scale: 0.5 },
        { label: '1x', scale: 1 },
        { label: '2x', scale: 2 },
        { label: '3x', scale: 3 },
      ],
    }
  },
  computed: {
    /**
     * 是否显示质量滑杆
     * @returns 布尔值
     */
    showQuality(): boolean {
      return ResolveSvgFormatOption(this.outputFormat).supportsQuality
    },
    /**
     * 格式展示名
     * @returns 文案
     */
    formatLabel(): string {
      return ResolveSvgFormatOption(this.outputFormat).label
    },
    /**
     * 下载按钮文案
     * @returns 文案
     */
    downloadLabel(): string {
      if (this.isBusy) {
        return '转换中…'
      }
      return `下载 ${this.formatLabel}`
    },
  },
  /**
   * 挂载时设置标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', 'SVG 转图片')
  },
  /**
   * 卸载清理
   */
  beforeUnmount() {
    if (this.convertTimer) {
      clearTimeout(this.convertTimer)
    }
  },
  methods: {
    /**
     * 格式化字节大小
     * @param bytes 字节
     * @returns 文案
     */
    FormatSize(bytes: number): string {
      if (bytes < 1024) {
        return `${bytes} B`
      }
      if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`
      }
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    },
    /**
     * 应用 SVG 文本并解析尺寸
     * @param text SVG
     * @param name 来源名
     */
    ApplySvgText(text: string, name: string) {
      const size = ParseSvgIntrinsicSize(text)
      this.svgText = text
      this.sourceName = name
      this.intrinsicWidth = size.width
      this.intrinsicHeight = size.height
      this.outputWidth = ClampSvgOutputSide(size.width)
      this.outputHeight = ClampSvgOutputSide(size.height)
      this.aspectRatio =
        this.outputHeight > 0 ? this.outputWidth / this.outputHeight : 1
      this.hasError = false
      this.statusText = `已载入 ${name}`
      this.ScheduleConvert()
    },
    /**
     * 选择本地文件
     * @param event 文件事件
     */
    async HandleFileSelect(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      input.value = ''
      if (!file) {
        return
      }
      await this.LoadSvgFile(file)
    },
    /**
     * 加载 SVG 文件
     * @param file 文件
     */
    async LoadSvgFile(file: File) {
      this.isBusy = true
      this.hasError = false
      this.statusText = '正在读取文件…'
      try {
        if (!IsSvgFile(file)) {
          throw new Error('请上传 .svg 文件')
        }
        const text = await ReadSvgFileText(file)
        this.ApplySvgText(text, file.name)
      } catch (error) {
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '读取失败'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 从 URL 导入
     */
    async HandleFetchUrl() {
      if (!this.urlInput.trim() || this.isBusy) {
        return
      }
      this.isBusy = true
      this.hasError = false
      this.statusText = '正在下载 SVG…'
      try {
        const text = await FetchSvgTextFromUrl(this.urlInput)
        let name = 'remote.svg'
        try {
          const path = new URL(this.urlInput.trim()).pathname
          const base = path.split('/').pop()
          if (base) {
            name = decodeURIComponent(base)
          }
        } catch {
          // 保留默认名
        }
        if (!/\.svg$/i.test(name)) {
          name = `${name || 'remote'}.svg`
        }
        this.ApplySvgText(text, name)
      } catch (error) {
        this.hasError = true
        this.statusText =
          error instanceof Error
            ? error.message
            : 'URL 导入失败（需目标允许 CORS）'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 是否含文件拖拽
     * @param event 拖拽事件
     * @returns 布尔
     */
    HasDragFiles(event: DragEvent): boolean {
      return Boolean(event.dataTransfer?.types?.includes('Files'))
    },
    /**
     * 拖拽进入
     * @param event 事件
     */
    HandleDragEnter(event: DragEvent) {
      if (!this.HasDragFiles(event)) {
        return
      }
      this.dragDepth += 1
      this.isDragOver = true
    },
    /**
     * 拖拽悬停
     * @param event 事件
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
     * 拖拽离开
     */
    HandleDragLeave() {
      this.dragDepth = Math.max(0, this.dragDepth - 1)
      if (this.dragDepth === 0) {
        this.isDragOver = false
      }
    },
    /**
     * 拖放文件
     * @param event 事件
     */
    async HandleDrop(event: DragEvent) {
      this.dragDepth = 0
      this.isDragOver = false
      const file = event.dataTransfer?.files?.[0]
      if (!file) {
        return
      }
      await this.LoadSvgFile(file)
    },
    /**
     * 锁定比例开关
     */
    HandleLockAspect() {
      if (this.lockAspect && this.outputHeight > 0) {
        this.aspectRatio = this.outputWidth / this.outputHeight
      }
    },
    /**
     * 宽度变更
     */
    HandleWidthInput() {
      this.outputWidth = ClampSvgOutputSide(Number(this.outputWidth) || 1)
      if (this.lockAspect && this.aspectRatio > 0) {
        this.outputHeight = ClampSvgOutputSide(
          this.outputWidth / this.aspectRatio,
        )
      }
      this.ScheduleConvert()
    },
    /**
     * 高度变更
     */
    HandleHeightInput() {
      this.outputHeight = ClampSvgOutputSide(Number(this.outputHeight) || 1)
      if (this.lockAspect && this.aspectRatio > 0) {
        this.outputWidth = ClampSvgOutputSide(
          this.outputHeight * this.aspectRatio,
        )
      }
      this.ScheduleConvert()
    },
    /**
     * 按倍率应用尺寸
     * @param scale 倍率
     */
    ApplyPreset(scale: number) {
      const baseW = this.intrinsicWidth || this.outputWidth || 512
      const baseH = this.intrinsicHeight || this.outputHeight || 512
      this.outputWidth = ClampSvgOutputSide(baseW * scale)
      this.outputHeight = ClampSvgOutputSide(baseH * scale)
      this.aspectRatio =
        this.outputHeight > 0 ? this.outputWidth / this.outputHeight : 1
      this.ScheduleConvert()
    },
    /**
     * 重置为原始尺寸
     */
    ResetToIntrinsic() {
      if (!this.intrinsicWidth || !this.intrinsicHeight) {
        return
      }
      this.outputWidth = ClampSvgOutputSide(this.intrinsicWidth)
      this.outputHeight = ClampSvgOutputSide(this.intrinsicHeight)
      this.aspectRatio =
        this.outputHeight > 0 ? this.outputWidth / this.outputHeight : 1
      this.ScheduleConvert()
    },
    /**
     * 防抖调度转换预览
     */
    ScheduleConvert() {
      if (this.convertTimer) {
        clearTimeout(this.convertTimer)
      }
      this.convertTimer = setTimeout(() => {
        void this.RunConvert()
      }, 200)
    },
    /**
     * 执行转换生成预览
     */
    async RunConvert() {
      if (!this.svgText) {
        this.previewUrl = ''
        this.resultBlob = null
        return
      }
      this.isBusy = true
      this.hasError = false
      try {
        const result = await ConvertSvgToImage({
          svgText: this.svgText,
          width: this.outputWidth,
          height: this.outputHeight,
          format: this.outputFormat,
          quality: this.quality / 100,
          fileName: this.sourceName || 'svg-export.svg',
        })
        this.previewUrl = result.dataUrl
        this.resultBlob = result.blob
        this.statusText = `已转换 ${result.width}×${result.height}`
      } catch (error) {
        this.previewUrl = ''
        this.resultBlob = null
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '转换失败'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 下载结果
     */
    HandleDownload() {
      if (!this.resultBlob) {
        return
      }
      const meta = ResolveSvgFormatOption(this.outputFormat)
      const base =
        (this.sourceName || 'svg-export').replace(/\.[^.]+$/, '') || 'svg-export'
      TriggerSvgDownload(this.resultBlob, `${base}.${meta.extension}`)
      this.statusText = `已开始下载 ${meta.label}`
      this.hasError = false
    },
    /**
     * 清空全部
     */
    ClearAll() {
      this.svgText = ''
      this.sourceName = ''
      this.urlInput = ''
      this.previewUrl = ''
      this.resultBlob = null
      this.intrinsicWidth = 0
      this.intrinsicHeight = 0
      this.outputWidth = 512
      this.outputHeight = 512
      this.aspectRatio = 1
      this.statusText = ''
      this.hasError = false
      this.isDragOver = false
      this.dragDepth = 0
    },
  },
})
</script>

<style scoped>
.svg-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 14% 0%, rgba(84, 148, 255, 0.08), transparent 36%),
    linear-gradient(180deg, #f3f6fb 0%, #e8edf5 100%);
}

.workspace {
  flex: 1;
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 24px 6vw 48px;
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.panel {
  padding: 18px;
  border-radius: 16px;
  background: rgba(255, 252, 247, 0.92);
  border: 1px solid rgba(29, 42, 68, 0.08);
  box-shadow: 0 10px 28px rgba(29, 42, 68, 0.06);
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drop-zone {
  border-radius: 14px;
  border: 1.5px dashed rgba(49, 65, 95, 0.28);
  background: rgba(255, 255, 255, 0.72);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.drop-zone.is-dragover {
  border-color: #3d6bb3;
  background: rgba(61, 107, 179, 0.08);
}

.drop-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 110px;
  padding: 16px;
  cursor: pointer;
  text-align: center;
}

.drop-title {
  font-weight: 600;
  color: #1d2a44;
}

.drop-tip {
  font-size: 0.84rem;
  color: #6a7a96;
}

.url-row {
  display: flex;
  gap: 10px;
  align-items: end;
}

.grow {
  flex: 1;
  min-width: 0;
}

.url-btn {
  flex-shrink: 0;
  height: 40px;
  margin-bottom: 0;
}

.source-meta {
  margin: 0;
  font-size: 0.82rem;
  color: #5a6a84;
  word-break: break-all;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.88rem;
  color: #31415f;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field input,
.field select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 9px 11px;
  font: inherit;
  color: #1d2a44;
  background: #fff;
}

.field input[type='range'] {
  padding: 0;
  border: none;
  background: transparent;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: #31415f;
  cursor: pointer;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid rgba(49, 65, 95, 0.18);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 6px 12px;
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}

.chip:hover {
  background: rgba(29, 42, 68, 0.06);
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.ghost,
.primary {
  border-radius: 999px;
  padding: 10px 16px;
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

.ghost:disabled,
.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  margin: 0;
  font-size: 0.88rem;
}

.status.ok {
  color: #2d7a5f;
}

.status.error {
  color: #b33a3a;
}

.preview-panel h2 {
  margin: 0 0 12px;
  font-size: 1.05rem;
  color: #1d2a44;
}

.preview-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(49, 65, 95, 0.12);
  background:
    linear-gradient(45deg, #dce3ee 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(-45deg, #dce3ee 25%, transparent 25%) 0 0 / 16px 16px,
    #f4f7fb;
}

.preview-stage.jpeg {
  background: #fff;
}

.preview-image {
  max-width: 100%;
  max-height: 420px;
  height: auto;
  object-fit: contain;
}

.preview-empty {
  margin: 0;
  color: #6a7a96;
}

.preview-meta {
  margin: 10px 0 0;
  font-size: 0.82rem;
  color: #5a6a84;
}

@media (max-width: 860px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .url-row {
    flex-direction: column;
    align-items: stretch;
  }

  .url-btn {
    height: auto;
  }
}
</style>
