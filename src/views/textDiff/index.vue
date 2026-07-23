<template>
  <div class="diff-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>文本对比</h1>
        <p class="subtitle">
          两段文字差异高亮，适合文案校对与代码对比；支持粘贴或上传 txt / json / vue 等文本文件
        </p>
      </div>
      <nav class="hero-nav">
        <router-link to="/">工具列表</router-link>
        <router-link to="/about">关于</router-link>
      </nav>
    </header>

    <main class="workspace">
      <section class="editors">
        <div class="editor-pane">
          <div class="pane-head">
            <div class="pane-title">
              <span>原文（左）</span>
              <span v-if="leftFileName" class="file-tag">{{ leftFileName }}</span>
            </div>
            <div class="pane-actions">
              <label class="ghost mini file-btn">
                上传文件
                <input
                  type="file"
                  :accept="fileAccept"
                  hidden
                  @change="HandleLoadFile($event, 'left')"
                />
              </label>
              <button type="button" class="ghost mini" @click="HandleClearSide('left')">
                清空
              </button>
            </div>
          </div>
          <textarea
            class="editor"
            :value="leftText"
            placeholder="粘贴原文，或上传文本文件…"
            spellcheck="false"
            @input="HandleLeftInput"
          />
          <p class="meta">{{ leftLineCount }} 行 · {{ leftCharCount }} 字符</p>
        </div>

        <div class="editor-pane">
          <div class="pane-head">
            <div class="pane-title">
              <span>对照（右）</span>
              <span v-if="rightFileName" class="file-tag">{{ rightFileName }}</span>
            </div>
            <div class="pane-actions">
              <label class="ghost mini file-btn">
                上传文件
                <input
                  type="file"
                  :accept="fileAccept"
                  hidden
                  @change="HandleLoadFile($event, 'right')"
                />
              </label>
              <button type="button" class="ghost mini" @click="HandleClearSide('right')">
                清空
              </button>
            </div>
          </div>
          <textarea
            class="editor"
            :value="rightText"
            placeholder="粘贴对照文本，或上传文本文件…"
            spellcheck="false"
            @input="HandleRightInput"
          />
          <p class="meta">{{ rightLineCount }} 行 · {{ rightCharCount }} 字符</p>
        </div>
      </section>

      <section class="toolbar">
        <div class="view-tabs">
          <button
            type="button"
            class="chip"
            :class="{ active: viewMode === 'side' }"
            @click="HandleViewMode('side')"
          >
            并排
          </button>
          <button
            type="button"
            class="chip"
            :class="{ active: viewMode === 'unified' }"
            @click="HandleViewMode('unified')"
          >
            统一
          </button>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="ghost" @click="HandleSwap">交换左右</button>
          <button type="button" class="ghost" @click="HandleClearAll">全部清空</button>
          <button type="button" class="primary" @click="HandleCompare">
            开始对比
          </button>
        </div>
      </section>

      <p v-if="statusText" class="status" :class="{ error: hasError }">
        {{ statusText }}
      </p>

      <section v-if="diffResult" class="result-card">
        <div class="stats">
          <span class="stat equal">相同 {{ diffResult.stats.equal }}</span>
          <button
            type="button"
            class="stat replace"
            :class="{ active: jumpKind === 'replace', disabled: !diffResult.stats.replaced }"
            :disabled="!diffResult.stats.replaced"
            title="点击跳转到修改处，再次点击下一处"
            @click="HandleJumpKind('replace')"
          >
            修改 {{ diffResult.stats.replaced }}
            <em v-if="jumpKind === 'replace' && jumpTotal > 0">
              {{ jumpCursor + 1 }}/{{ jumpTotal }}
            </em>
          </button>
          <button
            type="button"
            class="stat add"
            :class="{ active: jumpKind === 'add', disabled: !diffResult.stats.added }"
            :disabled="!diffResult.stats.added"
            title="点击跳转到新增处，再次点击下一处"
            @click="HandleJumpKind('add')"
          >
            新增 {{ diffResult.stats.added }}
            <em v-if="jumpKind === 'add' && jumpTotal > 0">
              {{ jumpCursor + 1 }}/{{ jumpTotal }}
            </em>
          </button>
          <button
            type="button"
            class="stat remove"
            :class="{ active: jumpKind === 'remove', disabled: !diffResult.stats.removed }"
            :disabled="!diffResult.stats.removed"
            title="点击跳转到删除处，再次点击下一处"
            @click="HandleJumpKind('remove')"
          >
            删除 {{ diffResult.stats.removed }}
            <em v-if="jumpKind === 'remove' && jumpTotal > 0">
              {{ jumpCursor + 1 }}/{{ jumpTotal }}
            </em>
          </button>
          <span class="stats-tip">点击修改 / 新增 / 删除可跳转定位</span>
        </div>

        <div v-if="viewMode === 'side'" class="diff-side">
          <div ref="leftDiffCol" class="diff-col">
            <div class="diff-col-head">原文</div>
            <div
              v-for="(row, index) in diffResult.rows"
              :key="`l-${index}`"
              class="diff-row"
              :class="[row.kind, { focus: activeRowIndex === index }]"
              :data-diff-index="index"
            >
              <span class="line-no">{{ row.leftLineNo ?? '' }}</span>
              <pre class="line-text"><span
                v-for="(part, partIndex) in row.leftParts"
                :key="`${index}-l-${partIndex}-${part.kind}`"
                :class="`part-${part.kind}`"
              >{{ DisplayPartText(part.text) }}</span><span
                v-if="!row.leftParts.length"
                class="empty-line"
              > </span></pre>
            </div>
          </div>
          <div ref="rightDiffCol" class="diff-col">
            <div class="diff-col-head">对照</div>
            <div
              v-for="(row, index) in diffResult.rows"
              :key="`r-${index}`"
              class="diff-row"
              :class="[row.kind, { focus: activeRowIndex === index }]"
              :data-diff-index="index"
            >
              <span class="line-no">{{ row.rightLineNo ?? '' }}</span>
              <pre class="line-text"><span
                v-for="(part, partIndex) in row.rightParts"
                :key="`${index}-r-${partIndex}-${part.kind}`"
                :class="`part-${part.kind}`"
              >{{ DisplayPartText(part.text) }}</span><span
                v-if="!row.rightParts.length"
                class="empty-line"
              > </span></pre>
            </div>
          </div>
        </div>

        <div v-else ref="unifiedDiffCol" class="diff-unified">
          <div
            v-for="(row, index) in unifiedRows"
            :key="`u-${index}`"
            class="diff-row unified"
            :class="[row.kind, { focus: activeRowIndex === row.originIndex }]"
            :data-diff-index="row.originIndex"
            :data-origin-kind="row.originKind"
          >
            <span class="line-no dual">
              <i>{{ row.leftLineNo ?? '' }}</i>
              <i>{{ row.rightLineNo ?? '' }}</i>
            </span>
            <span class="sign">{{ row.sign }}</span>
            <pre class="line-text"><span
              v-for="(part, partIndex) in row.parts"
              :key="`${index}-u-${partIndex}-${part.kind}`"
              :class="`part-${part.kind}`"
            >{{ DisplayPartText(part.text) }}</span></pre>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 文本对比工具页
 * 支持粘贴与多类型文本文件对比，行级 + 字符级高亮
 */
import { defineComponent } from 'vue'
import { APPBRAND } from '@/utils/Brand'
import {
  DiffTexts,
  IsSupportedTextDiffFile,
  ReadTextFileContent,
  SplitTextLines,
  TEXT_DIFF_EXTENSIONS,
  type DiffCharPart,
  type DiffLineKind,
  type DiffResult,
} from '@/utils/TextDiff'

type Side = 'left' | 'right'
type ViewMode = 'side' | 'unified'
type JumpKind = 'replace' | 'add' | 'remove'

type UnifiedRow = {
  kind: string
  originKind: DiffLineKind
  originIndex: number
  leftLineNo: number | null
  rightLineNo: number | null
  sign: string
  parts: DiffCharPart[]
}

export default defineComponent({
  name: 'TextDiffView',
  data() {
    return {
      appBrand: APPBRAND,
      leftText: '',
      rightText: '',
      leftFileName: '',
      rightFileName: '',
      viewMode: 'side' as ViewMode,
      diffResult: null as DiffResult | null,
      statusText: '',
      hasError: false,
      fileAccept: TEXT_DIFF_EXTENSIONS.map((ext) => `.${ext}`).join(','),
      jumpKind: null as JumpKind | null,
      jumpCursor: 0,
      activeRowIndex: -1,
    }
  },
  computed: {
    /**
     * 当前跳转类型的总处数
     * @returns 数量
     */
    jumpTotal(): number {
      if (!this.diffResult || !this.jumpKind) {
        return 0
      }
      return this.GetKindIndices(this.jumpKind).length
    },
    /**
     * 左侧行数
     * @returns 行数
     */
    leftLineCount(): number {
      return this.leftText ? SplitTextLines(this.leftText).length : 0
    },
    /**
     * 右侧行数
     * @returns 行数
     */
    rightLineCount(): number {
      return this.rightText ? SplitTextLines(this.rightText).length : 0
    },
    /**
     * 左侧字符数
     * @returns 字符数
     */
    leftCharCount(): number {
      return Array.from(this.leftText).length
    },
    /**
     * 右侧字符数
     * @returns 字符数
     */
    rightCharCount(): number {
      return Array.from(this.rightText).length
    },
    /**
     * 统一视图行
     * @returns 行列表
     */
    unifiedRows(): UnifiedRow[] {
      if (!this.diffResult) {
        return []
      }
      const rows: UnifiedRow[] = []
      this.diffResult.rows.forEach((row, originIndex) => {
        if (row.kind === 'equal') {
          rows.push({
            kind: 'equal',
            originKind: 'equal',
            originIndex,
            leftLineNo: row.leftLineNo,
            rightLineNo: row.rightLineNo,
            sign: ' ',
            parts: row.leftParts,
          })
          return
        }
        if (row.kind === 'remove' || row.kind === 'replace') {
          rows.push({
            kind: 'remove',
            originKind: row.kind,
            originIndex,
            leftLineNo: row.leftLineNo,
            rightLineNo: null,
            sign: '-',
            parts: row.leftParts.length
              ? row.leftParts
              : [{ kind: 'remove', text: row.leftText }],
          })
        }
        if (row.kind === 'add' || row.kind === 'replace') {
          rows.push({
            kind: 'add',
            originKind: row.kind,
            originIndex,
            leftLineNo: null,
            rightLineNo: row.rightLineNo,
            sign: '+',
            parts: row.rightParts.length
              ? row.rightParts
              : [{ kind: 'add', text: row.rightText }],
          })
        }
      })
      return rows
    },
  },
  /**
   * 挂载时同步标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '文本对比')
  },
  methods: {
    /**
     * 设置状态
     * @param text 文案
     * @param isError 是否错误
     */
    SetStatus(text: string, isError = false) {
      this.statusText = text
      this.hasError = isError
    },
    /**
     * 展示差异片段文本（空串用空格占位避免行塌陷）
     * @param text 片段
     * @returns 展示文本
     */
    DisplayPartText(text: string): string {
      return text.length ? text : ' '
    },
    /**
     * 左侧输入
     * @param event 输入事件
     */
    HandleLeftInput(event: Event) {
      this.leftText = (event.target as HTMLTextAreaElement).value
      this.leftFileName = ''
      this.diffResult = null
      this.ResetJumpState()
    },
    /**
     * 右侧输入
     * @param event 输入事件
     */
    HandleRightInput(event: Event) {
      this.rightText = (event.target as HTMLTextAreaElement).value
      this.rightFileName = ''
      this.diffResult = null
      this.ResetJumpState()
    },
    /**
     * 切换视图模式
     * @param mode 模式
     */
    HandleViewMode(mode: ViewMode) {
      this.viewMode = mode
      if (this.activeRowIndex >= 0) {
        this.$nextTick(() => {
          this.ScrollToDiffRow(this.activeRowIndex)
        })
      }
    },
    /**
     * 重置跳转状态
     */
    ResetJumpState() {
      this.jumpKind = null
      this.jumpCursor = 0
      this.activeRowIndex = -1
    },
    /**
     * 收集某类差异在结果中的行下标
     * @param kind 差异类型
     * @returns 下标列表
     */
    GetKindIndices(kind: JumpKind): number[] {
      if (!this.diffResult) {
        return []
      }
      return this.diffResult.rows
        .map((row, index) => (row.kind === kind ? index : -1))
        .filter((index) => index >= 0)
    },
    /**
     * 点击统计跳转到对应差异
     * @param kind 差异类型
     */
    HandleJumpKind(kind: JumpKind) {
      const indices = this.GetKindIndices(kind)
      if (!indices.length) {
        return
      }
      if (this.jumpKind !== kind) {
        this.jumpKind = kind
        this.jumpCursor = 0
      } else {
        this.jumpCursor = (this.jumpCursor + 1) % indices.length
      }
      const rowIndex = indices[this.jumpCursor]
      this.activeRowIndex = rowIndex
      const labels = { replace: '修改', add: '新增', remove: '删除' }
      this.SetStatus(
        `已定位到第 ${this.jumpCursor + 1}/${indices.length} 处${labels[kind]}`,
      )
      this.$nextTick(() => {
        this.ScrollToDiffRow(rowIndex)
      })
    },
    /**
     * 滚动到指定差异行（并排时左右同步）
     * @param rowIndex 结果行下标
     */
    ScrollToDiffRow(rowIndex: number) {
      /**
       * 按可视相对位置滚动，避免 offsetTop 相对定位祖先导致跳过头
       * @param container 滚动容器
       * @param selector 目标行选择器
       */
      const ScrollContainerToRow = (
        container: HTMLElement | undefined,
        selector: string,
      ) => {
        if (!container) {
          return
        }
        const target = container.querySelector(selector) as HTMLElement | null
        if (!target) {
          return
        }
        const head = container.querySelector(
          '.diff-col-head',
        ) as HTMLElement | null
        const headH = head?.getBoundingClientRect().height || 0
        const containerRect = container.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const padding = 12
        // 目标行相对容器可视顶部的偏移（已含当前 scrollTop 视觉效果）
        const delta = targetRect.top - containerRect.top - headH - padding
        const nextTop = Math.max(0, container.scrollTop + delta)
        container.scrollTo({
          top: nextTop,
          behavior: 'smooth',
        })
      }

      if (this.viewMode === 'side') {
        const left = this.$refs.leftDiffCol as HTMLElement | undefined
        const right = this.$refs.rightDiffCol as HTMLElement | undefined
        const selector = `[data-diff-index="${rowIndex}"]`
        ScrollContainerToRow(left, selector)
        ScrollContainerToRow(right, selector)
        return
      }

      const unified = this.$refs.unifiedDiffCol as HTMLElement | undefined
      const kind = this.jumpKind || 'replace'
      ScrollContainerToRow(
        unified,
        `[data-diff-index="${rowIndex}"][data-origin-kind="${kind}"]`,
      )
    },
    /**
     * 加载文本文件到一侧
     * @param event 文件事件
     * @param side 左右侧
     */
    async HandleLoadFile(event: Event, side: Side) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      input.value = ''
      if (!file) {
        return
      }
      if (!IsSupportedTextDiffFile(file)) {
        this.SetStatus(
          `暂不支持 ${file.name}，请使用 txt / json / vue / js / ts 等文本文件`,
          true,
        )
        return
      }
      try {
        const content = await ReadTextFileContent(file)
        if (side === 'left') {
          this.leftText = content
          this.leftFileName = file.name
        } else {
          this.rightText = content
          this.rightFileName = file.name
        }
        this.diffResult = null
        this.ResetJumpState()
        this.SetStatus(`已加载 ${file.name}`)
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '读取文件失败',
          true,
        )
      }
    },
    /**
     * 清空一侧
     * @param side 左右侧
     */
    HandleClearSide(side: Side) {
      if (side === 'left') {
        this.leftText = ''
        this.leftFileName = ''
      } else {
        this.rightText = ''
        this.rightFileName = ''
      }
      this.diffResult = null
      this.ResetJumpState()
      this.SetStatus('')
    },
    /**
     * 全部清空
     */
    HandleClearAll() {
      this.leftText = ''
      this.rightText = ''
      this.leftFileName = ''
      this.rightFileName = ''
      this.diffResult = null
      this.ResetJumpState()
      this.SetStatus('')
    },
    /**
     * 交换左右文本
     */
    HandleSwap() {
      const text = this.leftText
      const name = this.leftFileName
      this.leftText = this.rightText
      this.leftFileName = this.rightFileName
      this.rightText = text
      this.rightFileName = name
      this.diffResult = null
      this.ResetJumpState()
      this.SetStatus('已交换左右内容')
    },
    /**
     * 执行对比
     */
    HandleCompare() {
      if (!this.leftText && !this.rightText) {
        this.SetStatus('请先输入或上传要对比的文本', true)
        this.diffResult = null
        this.ResetJumpState()
        return
      }
      this.ResetJumpState()
      this.diffResult = DiffTexts(this.leftText, this.rightText)
      const { stats } = this.diffResult
      if (
        stats.added === 0 &&
        stats.removed === 0 &&
        stats.replaced === 0
      ) {
        this.SetStatus('两侧内容完全一致')
        return
      }
      this.SetStatus(
        `对比完成：修改 ${stats.replaced} 行 · 新增 ${stats.added} 行 · 删除 ${stats.removed} 行（点击统计可跳转）`,
      )
    },
  },
})
</script>

<style scoped>
.diff-page {
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

.editor {
  width: 100%;
  min-height: 280px;
  resize: vertical;
  border: 1px solid rgba(49, 65, 95, 0.18);
  border-radius: 12px;
  padding: 12px;
  font: 0.88rem/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: #1f2a3d;
  background: #fff;
  box-sizing: border-box;
}

.editor:focus {
  outline: 2px solid rgba(61, 110, 176, 0.35);
  border-color: #3d6eb0;
}

.meta {
  margin: 0;
  color: #6a7a94;
  font-size: 0.82rem;
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

.view-tabs,
.toolbar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.primary {
  border: none;
  background: #31486f;
  color: #fff8ef;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.25);
  background: transparent;
  color: #31415f;
}

.ghost.mini,
.file-btn {
  padding: 5px 10px;
  font-size: 0.8rem;
  border-radius: 8px;
}

.file-btn {
  display: inline-flex;
  align-items: center;
}

.status {
  margin: 0;
  color: #4a5a76;
  font-size: 0.9rem;
}

.status.error {
  color: #9f2f2f;
}

.result-card {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.stat {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
}

button.stat {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

button.stat:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(31, 42, 61, 0.12);
}

button.stat:disabled,
button.stat.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

button.stat em {
  font-style: normal;
  font-size: 0.72rem;
  opacity: 0.85;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
}

.stat.equal {
  background: rgba(90, 110, 140, 0.12);
  color: #4a5a76;
}

.stat.replace {
  background: rgba(210, 160, 40, 0.22);
  color: #8a6a12;
}

.stat.replace.active {
  outline: 2px solid #d4a017;
  outline-offset: 1px;
}

.stat.add {
  background: rgba(46, 140, 90, 0.2);
  color: #1f7a4d;
}

.stat.add.active {
  outline: 2px solid #2e8c5a;
  outline-offset: 1px;
}

.stat.remove {
  background: rgba(180, 60, 60, 0.18);
  color: #9f2f2f;
}

.stat.remove.active {
  outline: 2px solid #c44747;
  outline-offset: 1px;
}

.stats-tip {
  color: #6a7a94;
  font-size: 0.78rem;
  margin-left: 4px;
}

.diff-side {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.diff-col {
  min-width: 0;
  border: 1px solid rgba(49, 65, 95, 0.12);
  border-radius: 12px;
  overflow: auto;
  max-height: 640px;
  background: #fbfcfe;
}

.diff-col-head {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 12px;
  background: #eef2f8;
  color: #31415f;
  font-size: 0.82rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(49, 65, 95, 0.1);
}

.diff-unified {
  border: 1px solid rgba(49, 65, 95, 0.12);
  border-radius: 12px;
  overflow: auto;
  max-height: 640px;
  background: #fbfcfe;
}

.diff-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 1.55em;
  border-bottom: 1px solid rgba(49, 65, 95, 0.04);
  font: 0.82rem/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  scroll-margin-top: 48px;
}

.diff-row.equal {
  background: transparent;
}

.diff-row.add {
  background: rgba(46, 140, 90, 0.16);
}

.diff-row.remove {
  background: rgba(180, 60, 60, 0.14);
}

.diff-row.replace {
  background: rgba(210, 160, 40, 0.18);
}

.diff-row.focus {
  outline: 2px solid #3d6eb0;
  outline-offset: -2px;
  box-shadow: inset 0 0 0 9999px rgba(61, 110, 176, 0.08);
  animation: focusPulse 0.9s ease;
}

@keyframes focusPulse {
  0% {
    box-shadow: inset 0 0 0 9999px rgba(61, 110, 176, 0.22);
  }
  100% {
    box-shadow: inset 0 0 0 9999px rgba(61, 110, 176, 0.08);
  }
}

.line-no {
  flex: 0 0 44px;
  padding: 0 8px;
  text-align: right;
  color: #8a97ab;
  background: rgba(49, 65, 95, 0.04);
  user-select: none;
  border-right: 1px solid rgba(49, 65, 95, 0.08);
}

.line-no.dual {
  flex-basis: 72px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.line-no.dual i {
  font-style: normal;
}

.sign {
  flex: 0 0 18px;
  text-align: center;
  color: #6a7a94;
  user-select: none;
  font-weight: 700;
}

.diff-row.add .sign {
  color: #1f7a4d;
}

.diff-row.remove .sign {
  color: #9f2f2f;
}

.line-text {
  margin: 0;
  padding: 0 10px;
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1f2a3d;
}

.part-equal {
  color: inherit;
}

.part-add {
  background: #9be7b8;
  color: #0d4d2c;
  border-radius: 3px;
  padding: 0 2px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.part-remove {
  background: #ffb4b4;
  color: #7a1c1c;
  border-radius: 3px;
  padding: 0 2px;
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.empty-line {
  opacity: 0.35;
}

@media (max-width: 900px) {
  .editors,
  .diff-side {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
