<template>
  <div class="json-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>JSON 格式化</h1>
        <p class="subtitle">
          校验、美化、压缩 JSON；支持 stringify 转义字符串与树形展开；解析失败可用 AI 修复
        </p>
      </div>
      <nav class="hero-nav">
        <router-link to="/">工具列表</router-link>
        <router-link to="/about">关于</router-link>
      </nav>
    </header>

    <main class="workspace">
      <section class="toolbar">
        <div class="indent-tabs">
          <span class="toolbar-label">缩进</span>
          <button
            type="button"
            class="chip"
            :class="{ active: indentSize === 2 }"
            @click="HandleIndent(2)"
          >
            2 空格
          </button>
          <button
            type="button"
            class="chip"
            :class="{ active: indentSize === 4 }"
            @click="HandleIndent(4)"
          >
            4 空格
          </button>
        </div>
        <div class="toolbar-actions">
          <label class="ghost file-btn">
            上传文件
            <input
              type="file"
              :accept="fileAccept"
              hidden
              @change="HandleLoadFile"
            />
          </label>
          <button type="button" class="ghost" @click="HandleValidate">校验</button>
          <button type="button" class="ghost" @click="HandleMinify">压缩</button>
          <button type="button" class="ghost" @click="HandleStringify">转义字符串</button>
          <button type="button" class="ghost" @click="HandleClear">清空</button>
          <button
            type="button"
            class="repair-btn"
            :disabled="!hasInputText || isRepairing"
            @click="HandleRepair"
          >
            {{ isRepairing ? '修复中…' : 'AI 修复' }}
          </button>
          <button type="button" class="primary" @click="HandleParse">解析 / 美化</button>
        </div>
      </section>

      <p v-if="statusText" class="status" :class="{ error: hasError, ok: !hasError }">
        <span class="status-text">{{ statusText }}</span>
        <button
          v-if="hasError && hasInputText"
          type="button"
          class="repair-btn"
          :disabled="isRepairing"
          @click="HandleRepair"
        >
          {{ isRepairing ? '修复中…' : 'AI 修复' }}
        </button>
      </p>

      <section class="editors">
        <div class="editor-pane">
          <div class="pane-head">
            <div class="pane-title">
              <span>输入</span>
              <span v-if="fileName" class="file-tag">{{ fileName }}</span>
            </div>
            <div class="pane-actions">
              <button type="button" class="ghost mini" @click="HandlePaste">粘贴</button>
              <button type="button" class="ghost mini" @click="HandleClearInput">清空</button>
            </div>
          </div>
          <textarea
            class="editor"
            :value="inputText"
            placeholder='粘贴 JSON，例如 {"a":1} 或 "{\"a\":1}" …'
            spellcheck="false"
            @input="HandleInputChange"
          />
          <p class="meta">
            {{ inputStats.lines }} 行 · {{ inputStats.chars }} 字符
            <template v-if="inputBytes"> · {{ FormatBytes(inputBytes) }}</template>
          </p>
        </div>

        <div class="editor-pane">
          <div class="pane-head">
            <div class="pane-title">
              <span>解析结果</span>
            </div>
            <div class="pane-actions">
              <button
                type="button"
                class="repair-btn mini"
                :class="{ pulse: hasError }"
                :disabled="!hasInputText || isRepairing"
                title="解析失败时智能修复常见错误"
                @click="HandleRepair"
              >
                {{ isRepairing ? '修复中…' : 'AI 修复' }}
              </button>
              <button
                type="button"
                class="chip mini"
                :class="{ active: resultMode === 'tree' }"
                :disabled="!hasTreeData"
                @click="HandleResultMode('tree')"
              >
                树形
              </button>
              <button
                type="button"
                class="chip mini"
                :class="{ active: resultMode === 'text' }"
                :disabled="!outputText"
                @click="HandleResultMode('text')"
              >
                文本
              </button>
              <button
                type="button"
                class="ghost mini"
                :disabled="!hasTreeData"
                @click="HandleExpandAll"
              >
                全部展开
              </button>
              <button
                type="button"
                class="ghost mini"
                :disabled="!hasTreeData"
                @click="HandleCollapseAll"
              >
                全部收起
              </button>
              <button
                type="button"
                class="ghost mini"
                :disabled="!outputText"
                @click="HandleCopy"
              >
                {{ copyLabel }}
              </button>
              <button
                type="button"
                class="ghost mini"
                :disabled="!outputText"
                @click="HandleDownload"
              >
                下载
              </button>
              <button type="button" class="ghost mini" @click="HandleClearOutput">清空</button>
            </div>
          </div>

          <div v-if="resultMode === 'tree' && hasTreeData" class="tree-panel">
            <JsonTreeNode
              :value="parsedData"
              path="root"
              :depth="0"
              :is-last="true"
              :is-root="true"
              :collapsed-paths="collapsedPaths"
              :selected-path="selectedPath"
              @Toggle="HandleTogglePath"
              @Select="HandleSelectPath"
            />
          </div>
          <textarea
            v-else
            class="editor"
            :value="outputText"
            placeholder="点击「解析 / 美化」后，这里显示树形或文本结果…"
            spellcheck="false"
            readonly
          />
          <p class="meta">
            <template v-if="resultMode === 'tree' && hasTreeData">
              树形视图 · 点击 ▸ 展开 / 收起
            </template>
            <template v-else>
              {{ outputStats.lines }} 行 · {{ outputStats.chars }} 字符
              <template v-if="outputBytes"> · {{ FormatBytes(outputBytes) }}</template>
            </template>
          </p>
        </div>
      </section>

      <section class="tips-card">
        <h2>支持的输入形态</h2>
        <ul>
          <li>标准 JSON 对象 / 数组：<code>{"name":"fuse"}</code></li>
          <li>
            后端 <code>JSON.stringify</code> 后的字符串字面量：
            <code>"{\"name\":\"fuse\"}"</code>
          </li>
          <li>多层转义会自动逐层解包；右侧可树形展开 / 收起浏览</li>
          <li>
            解析失败时可点 <strong>AI 修复</strong>（本地智能纠错：松散转义、尾逗号、单引号、注释等）
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * JSON 格式化 / 校验工具页
 * 支持普通 JSON 与 stringify 转义字符串；解析结果支持可折叠树形视图
 */
import { defineComponent } from 'vue'
import { APPBRAND } from '@/utils/Brand'
import {
  CollectExpandablePaths,
  CountJsonTextStats,
  IsSupportedJsonFile,
  JSON_FORMATTER_EXTENSIONS,
  MeasureTextBytes,
  MinifyJson,
  ParseJsonInput,
  RepairJsonInput,
  StringifyJsonAsLiteral,
  ValidateJsonInput,
  type JsonIndentSize,
} from '@/utils/JsonFormatter'
import JsonTreeNode from './components/JsonTreeNode.vue'

type ResultMode = 'tree' | 'text'

export default defineComponent({
  name: 'JsonFormatterView',
  components: {
    JsonTreeNode,
  },
  data() {
    return {
      appBrand: APPBRAND,
      inputText: '',
      outputText: '',
      parsedData: null as unknown,
      hasTreeData: false,
      resultMode: 'tree' as ResultMode,
      collapsedPaths: {} as Record<string, boolean>,
      selectedPath: '',
      indentSize: 2 as JsonIndentSize,
      fileName: '',
      statusText: '',
      hasError: false,
      copyLabel: '复制',
      copyTimer: null as ReturnType<typeof setTimeout> | null,
      isRepairing: false,
      fileAccept: JSON_FORMATTER_EXTENSIONS.map((ext) => `.${ext}`).join(','),
    }
  },
  computed: {
    /**
     * 输入区是否有内容（用于启用 AI 修复等）
     * @returns 布尔
     */
    hasInputText(): boolean {
      return Boolean(this.inputText && this.inputText.trim())
    },
    /**
     * 输入区统计
     * @returns 行数与字符数
     */
    inputStats(): { lines: number; chars: number } {
      return CountJsonTextStats(this.inputText)
    },
    /**
     * 输出区统计
     * @returns 行数与字符数
     */
    outputStats(): { lines: number; chars: number } {
      return CountJsonTextStats(this.outputText)
    },
    /**
     * 输入字节数
     * @returns 字节
     */
    inputBytes(): number {
      return MeasureTextBytes(this.inputText)
    },
    /**
     * 输出字节数
     * @returns 字节
     */
    outputBytes(): number {
      return MeasureTextBytes(this.outputText)
    },
  },
  beforeUnmount() {
    if (this.copyTimer) {
      clearTimeout(this.copyTimer)
      this.copyTimer = null
    }
  },
  methods: {
    /**
     * 格式化字节数为可读文案
     * @param bytes 字节数
     * @returns 文案
     */
    FormatBytes(bytes: number): string {
      if (bytes < 1024) {
        return `${bytes} B`
      }
      if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`
      }
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    },
    /**
     * 设置状态提示
     * @param text 文案
     * @param isError 是否错误
     */
    SetStatus(text: string, isError = false) {
      this.statusText = text
      this.hasError = isError
    },
    /**
     * 应用解析成功后的树形与文本结果
     * @param data 解析后的数据
     * @param text 美化 / 压缩文本
     * @param preferMode 优先展示模式
     */
    ApplyParsedResult(data: unknown, text: string, preferMode: ResultMode = 'tree') {
      this.parsedData = data
      this.hasTreeData = true
      this.outputText = text
      this.collapsedPaths = {}
      this.selectedPath = ''
      this.resultMode = preferMode
    },
    /**
     * 切换缩进空格数
     * @param size 2 或 4
     */
    HandleIndent(size: JsonIndentSize) {
      this.indentSize = size
      if (this.hasTreeData) {
        this.outputText = JSON.stringify(this.parsedData, null, size)
      }
    },
    /**
     * 切换结果视图模式
     * @param mode 树形或文本
     */
    HandleResultMode(mode: ResultMode) {
      if (mode === 'tree' && !this.hasTreeData) {
        return
      }
      if (mode === 'text' && !this.outputText) {
        return
      }
      this.resultMode = mode
    },
    /**
     * 切换某一路径的展开 / 收起
     * @param path 节点路径
     */
    HandleTogglePath(path: string) {
      const next = { ...this.collapsedPaths }
      if (next[path]) {
        delete next[path]
      } else {
        next[path] = true
      }
      this.collapsedPaths = next
    },
    /**
     * 选中某一路径高亮
     * @param path 节点路径
     */
    HandleSelectPath(path: string) {
      this.selectedPath = path
    },
    /**
     * 全部展开
     */
    HandleExpandAll() {
      this.collapsedPaths = {}
    },
    /**
     * 全部收起
     */
    HandleCollapseAll() {
      if (!this.hasTreeData) {
        return
      }
      const paths = CollectExpandablePaths(this.parsedData, 'root')
      const next: Record<string, boolean> = {}
      for (const path of paths) {
        next[path] = true
      }
      this.collapsedPaths = next
    },
    /**
     * 输入框变更
     * @param event 输入事件
     */
    HandleInputChange(event: Event) {
      const target = event.target as HTMLTextAreaElement
      this.inputText = target.value
      this.fileName = ''
    },
    /**
     * 校验 JSON
     */
    HandleValidate() {
      const result = ValidateJsonInput(this.inputText)
      this.SetStatus(result.message, !result.valid)
    },
    /**
     * 解析并美化为树形 + 文本
     */
    HandleParse() {
      const parsed = ParseJsonInput(this.inputText)
      if (!parsed.ok) {
        this.SetStatus(parsed.message, true)
        return
      }
      const text = JSON.stringify(parsed.data, null, this.indentSize)
      this.ApplyParsedResult(parsed.data, text, 'tree')
      const tip =
        parsed.unwrapCount > 0
          ? `解析完成（已解包 ${parsed.unwrapCount} 层 stringify）`
          : '解析完成'
      this.SetStatus(tip, false)
    },
    /**
     * 本地智能纠错并重新解析（AI 修复）
     */
    HandleRepair() {
      if (!this.hasInputText || this.isRepairing) {
        return
      }
      this.isRepairing = true
      try {
        const result = RepairJsonInput(this.inputText)
        if (!result.ok) {
          this.SetStatus(result.message, true)
          return
        }
        const pretty = JSON.stringify(result.data, null, this.indentSize)
        this.inputText = pretty
        this.fileName = ''
        this.ApplyParsedResult(result.data, pretty, 'tree')
        const fixText = result.fixes.join('、')
        this.SetStatus(`AI 修复成功：${fixText}`, false)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '修复过程出现异常'
        this.SetStatus(`AI 修复失败：${message}`, true)
      } finally {
        this.isRepairing = false
      }
    },
    /**
     * 压缩 JSON（文本视图）
     */
    HandleMinify() {
      const result = MinifyJson(this.inputText)
      if (!result.ok) {
        this.SetStatus(result.message, true)
        return
      }
      const parsed = ParseJsonInput(this.inputText)
      if (parsed.ok) {
        this.ApplyParsedResult(parsed.data, result.text, 'text')
      } else {
        this.outputText = result.text
        this.resultMode = 'text'
      }
      const tip =
        result.unwrapCount > 0
          ? `压缩完成（已解包 ${result.unwrapCount} 层 stringify）`
          : '压缩完成'
      this.SetStatus(tip, false)
    },
    /**
     * 将当前 JSON 转为 stringify 字符串字面量
     */
    HandleStringify() {
      const result = StringifyJsonAsLiteral(this.inputText)
      if (!result.ok) {
        this.SetStatus(result.message, true)
        return
      }
      this.outputText = result.text
      this.hasTreeData = false
      this.parsedData = null
      this.collapsedPaths = {}
      this.selectedPath = ''
      this.resultMode = 'text'
      this.SetStatus('已转为 JSON.stringify 字符串字面量', false)
    },
    /**
     * 从剪贴板粘贴到输入
     */
    async HandlePaste() {
      try {
        const text = await navigator.clipboard.readText()
        if (!text) {
          this.SetStatus('剪贴板为空', true)
          return
        }
        this.inputText = text
        this.fileName = ''
        this.SetStatus('已从剪贴板粘贴', false)
      } catch {
        this.SetStatus('无法读取剪贴板，请手动粘贴（Ctrl/Cmd+V）', true)
      }
    },
    /**
     * 复制输出到剪贴板
     */
    async HandleCopy() {
      if (!this.outputText) {
        return
      }
      try {
        await navigator.clipboard.writeText(this.outputText)
        this.copyLabel = '已复制'
        if (this.copyTimer) {
          clearTimeout(this.copyTimer)
        }
        this.copyTimer = setTimeout(() => {
          this.copyLabel = '复制'
          this.copyTimer = null
        }, 1600)
        this.SetStatus('已复制到剪贴板', false)
      } catch {
        this.SetStatus('复制失败，请手动选择输出内容', true)
      }
    },
    /**
     * 下载输出为 .json 文件
     */
    HandleDownload() {
      if (!this.outputText) {
        return
      }
      const blob = new Blob([this.outputText], {
        type: 'application/json;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'formatted.json'
      link.click()
      URL.revokeObjectURL(url)
      this.SetStatus('已开始下载 formatted.json', false)
    },
    /**
     * 上传 JSON 文本文件
     * @param event 文件选择事件
     */
    async HandleLoadFile(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files && input.files[0]
      input.value = ''
      if (!file) {
        return
      }
      if (!IsSupportedJsonFile(file)) {
        this.SetStatus('请上传 .json / .txt 等文本文件', true)
        return
      }
      try {
        const text = await file.text()
        this.inputText = text
        this.fileName = file.name
        this.SetStatus(`已加载 ${file.name}`, false)
      } catch {
        this.SetStatus('读取文件失败', true)
      }
    },
    /**
     * 清空输入
     */
    HandleClearInput() {
      this.inputText = ''
      this.fileName = ''
    },
    /**
     * 清空输出与树
     */
    HandleClearOutput() {
      this.outputText = ''
      this.parsedData = null
      this.hasTreeData = false
      this.collapsedPaths = {}
      this.selectedPath = ''
      this.resultMode = 'tree'
    },
    /**
     * 全部清空
     */
    HandleClear() {
      this.inputText = ''
      this.outputText = ''
      this.parsedData = null
      this.hasTreeData = false
      this.collapsedPaths = {}
      this.selectedPath = ''
      this.resultMode = 'tree'
      this.fileName = ''
      this.statusText = ''
      this.hasError = false
    },
  },
})
</script>

<style scoped>
.json-page {
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
  max-width: 42rem;
  line-height: 1.5;
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
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.indent-tabs,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-label {
  color: #6a7a94;
  font-size: 0.85rem;
  margin-right: 2px;
}

.chip,
.primary,
.ghost {
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
}

.chip {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
}

.chip.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.chip.mini,
.ghost.mini,
.file-btn {
  padding: 5px 10px;
  font-size: 0.8rem;
  border-radius: 8px;
}

.primary {
  border: none;
  background: #31486f;
  color: #fff8ef;
}

.primary:hover {
  background: #3d5a8a;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.25);
  background: transparent;
  color: #31415f;
}

.ghost:hover:not(:disabled),
.chip:hover:not(:disabled):not(.active) {
  border-color: #3d6eb0;
  background: rgba(84, 148, 255, 0.08);
}

.ghost:disabled,
.chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.file-btn {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.status {
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
  line-height: 1.45;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.status-text {
  flex: 1;
  min-width: 0;
}

.status.ok {
  background: rgba(46, 125, 90, 0.1);
  color: #1f6b4a;
  border: 1px solid rgba(46, 125, 90, 0.2);
}

.status.error {
  background: rgba(159, 47, 47, 0.08);
  color: #9f2f2f;
  border: 1px solid rgba(159, 47, 47, 0.18);
}

.repair-btn {
  border: none;
  background: #3d6eb0;
  color: #fff !important;
  border-radius: 8px;
  padding: 7px 14px;
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  opacity: 1;
  pointer-events: auto;
}

.repair-btn.mini {
  padding: 5px 10px;
  font-size: 0.8rem;
  border-radius: 8px;
}

.repair-btn.pulse {
  box-shadow: 0 0 0 2px rgba(61, 110, 176, 0.35);
}

.repair-btn:hover:not(:disabled) {
  background: #2f5f9f;
}

.repair-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.status .repair-btn {
  background: #c23b3b;
}

.status .repair-btn:hover:not(:disabled) {
  background: #a82f2f;
}

.editors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.editor-pane {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pane-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2a3d;
  font-weight: 600;
  font-size: 0.95rem;
}

.file-tag {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(49, 72, 111, 0.1);
  color: #31486f;
  font-size: 0.75rem;
  font-weight: 500;
}

.pane-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.editor,
.tree-panel {
  width: 100%;
  min-height: 420px;
  border: 1px solid rgba(49, 65, 95, 0.18);
  border-radius: 12px;
  background: #fff;
  box-sizing: border-box;
}

.editor {
  resize: vertical;
  padding: 12px;
  font: 0.88rem/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: #1f2a3d;
}

.editor:focus {
  outline: 2px solid rgba(61, 110, 176, 0.35);
  border-color: #3d6eb0;
}

.editor[readonly] {
  background: rgba(238, 242, 248, 0.85);
}

.tree-panel {
  padding: 10px 8px;
  overflow: auto;
  max-height: min(70vh, 720px);
}

.meta {
  margin: 0;
  color: #6a7a94;
  font-size: 0.82rem;
}

.tips-card {
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.tips-card h2 {
  margin: 0 0 10px;
  font-size: 1rem;
  color: #1f2a3d;
}

.tips-card ul {
  margin: 0;
  padding-left: 1.2em;
  color: #4a5a76;
  line-height: 1.7;
  font-size: 0.9rem;
}

.tips-card code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.84em;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(49, 72, 111, 0.08);
  color: #31486f;
}

@media (max-width: 860px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .editors {
    grid-template-columns: 1fr;
  }

  .editor,
  .tree-panel {
    min-height: 260px;
  }
}
</style>
