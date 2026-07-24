<template>
  <div class="base64-page">
    <ToolPageHero
      title="图片 ↔ Base64"
      subtitle="本地互转图片与 Base64 / Data URL，适合嵌入代码或接口调试"
      :links="[{ to: '/', label: '工具列表' }, { to: '/image-compress', label: '图片压缩' }, { to: '/about', label: '关于' }]"
    />

    <main class="workspace">
      <section class="notice-card" role="note">
        <h2>使用注意</h2>
        <ul>
          <li v-for="(line, index) in notices" :key="index">{{ line }}</li>
        </ul>
        <p class="notice-limit">
          当前限制：单张 ≤ {{ maxSizeLabel }}；超过 {{ warnSizeLabel }} 会警告。
        </p>
      </section>

      <div class="mode-tabs">
        <button
          type="button"
          class="tab"
          :class="{ active: mode === 'toBase64' }"
          @click="HandleModeChange('toBase64')"
        >
          图片 → Base64
        </button>
        <button
          type="button"
          class="tab"
          :class="{ active: mode === 'toImage' }"
          @click="HandleModeChange('toImage')"
        >
          Base64 → 图片
        </button>
      </div>

      <section v-if="mode === 'toBase64'" class="panel-card">
        <div
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
              hidden
              @change="HandleFileSelect"
            />
            <span class="upload-title">点击或拖拽图片到此处</span>
            <span class="upload-tip">
              支持 JPG / PNG / WebP / GIF 等；建议小于 {{ warnSizeLabel }}，上限
              {{ maxSizeLabel }}
            </span>
          </label>
        </div>

        <div v-if="sourceFile" class="result-grid">
          <div class="preview-box">
            <img v-if="previewUrl" :src="previewUrl" :alt="sourceFile.name" />
            <div class="meta">
              <p class="name">{{ sourceFile.name }}</p>
              <p class="size">{{ FormatSize(sourceFile.size) }}</p>
              <p v-if="limitHint" class="limit-hint" :class="limitLevel">{{ limitHint }}</p>
            </div>
          </div>

          <div class="output-box">
            <div class="output-head">
              <label class="check">
                <input v-model="includeDataUrlPrefix" type="checkbox" @change="HandlePrefixToggle" />
                输出 Data URL 前缀（data:image/...;base64,）
              </label>
              <span class="char-count">约 {{ outputCharCount.toLocaleString() }} 字符</span>
            </div>
            <textarea
              class="output-area"
              :value="outputText"
              readonly
              spellcheck="false"
              placeholder="转换结果将显示在这里"
            />
            <div class="actions">
              <button
                type="button"
                class="primary"
                :disabled="!outputText || isBusy"
                @click="HandleCopyOutput"
              >
                复制 Base64
              </button>
              <button type="button" class="ghost" :disabled="isBusy" @click="HandleClearToBase64">
                清空
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="panel-card">
        <label class="field-label">粘贴 Base64 或 Data URL</label>
        <textarea
          class="input-area"
          :value="base64Input"
          spellcheck="false"
          placeholder="支持纯 Base64，或 data:image/png;base64,xxxx"
          @input="HandleBase64Input"
        />
        <div class="actions">
          <button
            type="button"
            class="primary"
            :disabled="!base64Input.trim() || isBusy"
            @click="HandleDecodeBase64"
          >
            解码为图片
          </button>
          <button type="button" class="ghost" :disabled="isBusy" @click="HandleClearToImage">
            清空
          </button>
        </div>
        <p v-if="decodeLimitHint" class="limit-hint" :class="decodeLimitLevel">
          {{ decodeLimitHint }}
        </p>

        <div v-if="decodedPreviewUrl" class="decode-result">
          <div class="preview-box">
            <img :src="decodedPreviewUrl" alt="解码预览" />
            <div class="meta">
              <p class="name">解码预览 · {{ decodedMime }}</p>
              <p class="size">约 {{ FormatSize(decodedBytes) }}</p>
            </div>
          </div>
          <div class="actions">
            <button type="button" class="primary" @click="HandleDownloadDecoded">
              下载图片
            </button>
            <button type="button" class="ghost" @click="HandleCopyDecodedDataUrl">
              复制 Data URL
            </button>
          </div>
        </div>
      </section>

      <p v-if="statusText" class="status" :class="{ error: hasError, ok: !hasError }">
        {{ statusText }}
      </p>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 图片 ↔ Base64 互转工具页
 * 含超大图提示与体积硬限制，避免超长字符串卡顿
 */
import { defineComponent } from 'vue'

import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  CheckBase64TextLimit,
  CheckImageBase64Limit,
  DataUrlToBlob,
  ExtractBase64Payload,
  FormatImageBase64Size,
  GetImageBase64Notices,
  IMAGE_BASE64_MAX_BYTES,
  IMAGE_BASE64_WARN_BYTES,
  ParseImageBase64Input,
  ReadFileAsDataUrl,
  ResolveImageExtension,
  TriggerBlobDownload,
  type ImageBase64LimitLevel,
} from '@/utils/ImageBase64'

type ConvertMode = 'toBase64' | 'toImage'

export default defineComponent({
  name: 'ImageBase64View',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      notices: GetImageBase64Notices(),
      mode: 'toBase64' as ConvertMode,
      isDragging: false,
      isBusy: false,
      statusText: '',
      hasError: false,
      statusTimer: null as ReturnType<typeof setTimeout> | null,
      sourceFile: null as File | null,
      previewUrl: '',
      dataUrl: '',
      includeDataUrlPrefix: true,
      limitLevel: 'ok' as ImageBase64LimitLevel,
      limitHint: '',
      base64Input: '',
      decodeLimitLevel: 'ok' as ImageBase64LimitLevel,
      decodeLimitHint: '',
      decodedPreviewUrl: '',
      decodedDataUrl: '',
      decodedMime: 'image/png',
      decodedBytes: 0,
      dragDepth: 0,
    }
  },
  computed: {
    /**
     * 警告阈值文案
     * @returns 文案
     */
    warnSizeLabel(): string {
      return FormatImageBase64Size(IMAGE_BASE64_WARN_BYTES)
    },
    /**
     * 上限文案
     * @returns 文案
     */
    maxSizeLabel(): string {
      return FormatImageBase64Size(IMAGE_BASE64_MAX_BYTES)
    },
    /**
     * 当前输出文本
     * @returns Base64 或 Data URL
     */
    outputText(): string {
      if (!this.dataUrl) {
        return ''
      }
      return this.includeDataUrlPrefix ? this.dataUrl : ExtractBase64Payload(this.dataUrl)
    },
    /**
     * 输出字符数
     * @returns 数量
     */
    outputCharCount(): number {
      return this.outputText.length
    },
  },
  /**
   * 挂载时设置标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '图片 ↔ Base64')
  },
  /**
   * 卸载时释放资源
   */
  beforeUnmount() {
    this.RevokePreview()
    this.RevokeDecodedPreview()
    if (this.statusTimer) {
      clearTimeout(this.statusTimer)
      this.statusTimer = null
    }
  },
  methods: {
    /**
     * 格式化体积
     * @param bytes 字节
     * @returns 文案
     */
    FormatSize(bytes: number): string {
      return FormatImageBase64Size(bytes)
    },
    /**
     * 切换互转方向
     * @param mode 模式
     */
    HandleModeChange(mode: ConvertMode) {
      this.mode = mode
      this.FlashStatus('', false)
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
     * 放置文件
     * @param event 拖放事件
     */
    HandleDrop(event: DragEvent) {
      this.dragDepth = 0
      this.isDragging = false
      const files = event.dataTransfer?.files
      if (!files?.length) {
        return
      }
      void this.ProcessImageFile(files[0])
    },
    /**
     * 选择文件
     * @param event 输入事件
     */
    HandleFileSelect(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      input.value = ''
      if (!file) {
        return
      }
      void this.ProcessImageFile(file)
    },
    /**
     * 处理待转图片
     * @param file 图片文件
     */
    async ProcessImageFile(file: File) {
      if (!file.type.startsWith('image/')) {
        this.FlashStatus('请选择图片文件', true)
        return
      }

      const limit = CheckImageBase64Limit(file.size)
      this.limitLevel = limit.level
      this.limitHint = limit.message
      if (!limit.allowed) {
        this.FlashStatus(limit.message, true)
        return
      }

      this.isBusy = true
      try {
        const dataUrl = await ReadFileAsDataUrl(file)
        this.RevokePreview()
        this.sourceFile = file
        this.dataUrl = dataUrl
        this.previewUrl = URL.createObjectURL(file)
        if (limit.level === 'warn') {
          this.FlashStatus(limit.message, false)
        } else {
          this.FlashStatus('已转换为 Base64', false)
        }
      } catch {
        this.FlashStatus('读取图片失败', true)
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 切换是否输出 Data URL 前缀
     */
    HandlePrefixToggle() {
      if (this.outputText) {
        this.FlashStatus(
          this.includeDataUrlPrefix ? '已切换为 Data URL' : '已切换为纯 Base64',
          false
        )
      }
    },
    /**
     * 复制转换结果
     */
    async HandleCopyOutput() {
      if (!this.outputText) {
        return
      }
      if (this.outputText.length > 2 * 1024 * 1024) {
        this.FlashStatus(
          '字符串过长，浏览器复制可能失败或卡顿。建议下载图片或先压缩后再转。',
          true
        )
      }
      try {
        await navigator.clipboard.writeText(this.outputText)
        this.FlashStatus('已复制到剪贴板', false)
      } catch {
        this.FlashStatus('复制失败，可手动全选文本框内容', true)
      }
    },
    /**
     * 清空图片→Base64
     */
    HandleClearToBase64() {
      this.RevokePreview()
      this.sourceFile = null
      this.dataUrl = ''
      this.limitHint = ''
      this.limitLevel = 'ok'
      this.FlashStatus('已清空', false)
    },
    /**
     * Base64 输入
     * @param event 输入事件
     */
    HandleBase64Input(event: Event) {
      this.base64Input = (event.target as HTMLTextAreaElement).value
      this.decodeLimitHint = ''
      this.decodeLimitLevel = 'ok'
    },
    /**
     * 解码 Base64 为图片
     */
    HandleDecodeBase64() {
      const parsed = ParseImageBase64Input(this.base64Input)
      if (!parsed) {
        this.FlashStatus('无法解析：请粘贴有效的图片 Base64 或 Data URL', true)
        this.RevokeDecodedPreview()
        return
      }

      const limit = CheckBase64TextLimit(parsed.base64.length, parsed.estimatedBinaryBytes)
      this.decodeLimitLevel = limit.level
      this.decodeLimitHint = limit.message
      if (!limit.allowed) {
        this.FlashStatus(limit.message, true)
        this.RevokeDecodedPreview()
        return
      }

      try {
        const blob = DataUrlToBlob(parsed.dataUrl)
        this.RevokeDecodedPreview()
        this.decodedDataUrl = parsed.dataUrl
        this.decodedMime = parsed.mime
        this.decodedBytes = blob.size
        this.decodedPreviewUrl = URL.createObjectURL(blob)
        this.FlashStatus(
          limit.level === 'warn' ? limit.message : '解码成功，可预览或下载',
          false
        )
      } catch {
        this.FlashStatus('解码失败，请检查 Base64 是否完整', true)
        this.RevokeDecodedPreview()
      }
    },
    /**
     * 下载解码图片
     */
    HandleDownloadDecoded() {
      if (!this.decodedDataUrl) {
        return
      }
      try {
        const blob = DataUrlToBlob(this.decodedDataUrl)
        const ext = ResolveImageExtension(this.decodedMime)
        TriggerBlobDownload(blob, `base64-image.${ext}`)
        this.FlashStatus('已开始下载', false)
      } catch {
        this.FlashStatus('下载失败', true)
      }
    },
    /**
     * 复制解码后的 Data URL
     */
    async HandleCopyDecodedDataUrl() {
      if (!this.decodedDataUrl) {
        return
      }
      try {
        await navigator.clipboard.writeText(this.decodedDataUrl)
        this.FlashStatus('已复制 Data URL', false)
      } catch {
        this.FlashStatus('复制失败', true)
      }
    },
    /**
     * 清空 Base64→图片
     */
    HandleClearToImage() {
      this.base64Input = ''
      this.decodeLimitHint = ''
      this.decodeLimitLevel = 'ok'
      this.RevokeDecodedPreview()
      this.FlashStatus('已清空', false)
    },
    /**
     * 释放源图预览
     */
    RevokePreview() {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
        this.previewUrl = ''
      }
    },
    /**
     * 释放解码预览
     */
    RevokeDecodedPreview() {
      if (this.decodedPreviewUrl) {
        URL.revokeObjectURL(this.decodedPreviewUrl)
        this.decodedPreviewUrl = ''
      }
      this.decodedDataUrl = ''
      this.decodedBytes = 0
    },
    /**
     * 短暂状态提示
     * @param text 文案
     * @param isError 是否错误
     */
    FlashStatus(text: string, isError: boolean) {
      this.statusText = text
      this.hasError = isError
      if (this.statusTimer) {
        clearTimeout(this.statusTimer)
      }
      if (!text) {
        return
      }
      this.statusTimer = setTimeout(() => {
        this.statusText = ''
        this.statusTimer = null
      }, 3200)
    },
  },
})
</script>

<style scoped>
.base64-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace {
  flex: 1;
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notice-card {
  border-radius: 14px;
  padding: 14px 16px;
  background: rgba(255, 196, 92, 0.16);
  border: 1px solid rgba(210, 140, 40, 0.35);
  color: #5a3d12;
}

.notice-card h2 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.notice-card ul {
  margin: 0;
  padding-left: 1.15rem;
  line-height: 1.55;
  font-size: 0.9rem;
}

.notice-limit {
  margin: 10px 0 0;
  font-size: 0.84rem;
  opacity: 0.9;
}

.mode-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
}

.tab.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.panel-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(49, 65, 95, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.upload-area {
  border: 1.5px dashed rgba(49, 72, 111, 0.35);
  border-radius: 14px;
  background: rgba(49, 72, 111, 0.04);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.upload-area.dragging {
  border-color: #31486f;
  background: rgba(49, 72, 111, 0.1);
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 36px 16px;
  cursor: pointer;
  text-align: center;
}

.upload-title {
  font-size: 1.05rem;
  color: #1f2a3d;
  font-weight: 600;
}

.upload-tip {
  font-size: 0.86rem;
  color: #6a7a94;
  max-width: 28rem;
  line-height: 1.45;
}

.result-grid {
  display: grid;
  grid-template-columns: minmax(160px, 220px) 1fr;
  gap: 14px;
}

.preview-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-box img {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  border-radius: 12px;
  background:
    linear-gradient(45deg, #e8edf5 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(-45deg, #e8edf5 25%, transparent 25%) 0 8px / 16px 16px,
    linear-gradient(45deg, transparent 75%, #e8edf5 75%) 8px -8px / 16px 16px,
    linear-gradient(-45deg, transparent 75%, #e8edf5 75%) -8px 0 / 16px 16px,
    #fff;
  border: 1px solid rgba(49, 65, 95, 0.12);
}

.meta .name {
  margin: 0;
  font-size: 0.9rem;
  color: #1f2a3d;
  word-break: break-all;
}

.meta .size {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: #6a7a94;
}

.limit-hint {
  margin: 8px 0 0;
  font-size: 0.82rem;
  line-height: 1.45;
  padding: 8px 10px;
  border-radius: 8px;
}

.limit-hint.ok {
  background: rgba(46, 125, 90, 0.1);
  color: #1f6b4a;
}

.limit-hint.warn {
  background: rgba(210, 140, 40, 0.14);
  color: #8a5a10;
}

.limit-hint.block {
  background: rgba(180, 50, 50, 0.12);
  color: #a02828;
}

.output-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.output-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.86rem;
  color: #31415f;
}

.char-count {
  font-size: 0.8rem;
  color: #6a7a94;
}

.output-area,
.input-area {
  width: 100%;
  min-height: 180px;
  box-sizing: border-box;
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  font-size: 0.82rem;
  line-height: 1.45;
  resize: vertical;
  background: #fff;
  color: #1f2a3d;
}

.field-label {
  font-size: 0.9rem;
  color: #31415f;
  font-weight: 600;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.primary,
.ghost {
  border-radius: 10px;
  padding: 9px 14px;
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.primary {
  border: none;
  background: #31486f;
  color: #fff8ef;
}

.primary:disabled,
.ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.25);
  background: transparent;
  color: #31415f;
}

.decode-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
  border-top: 1px solid rgba(49, 65, 95, 0.1);
}

.decode-result .preview-box {
  max-width: 320px;
}

.status {
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
}

.status.ok {
  background: rgba(46, 125, 90, 0.1);
  color: #1f6b4a;
}

.status.error {
  background: rgba(180, 50, 50, 0.1);
  color: #a02828;
}

@media (max-width: 760px) {
  

  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
