<template>
  <div class="ts-page">
    <ToolPageHero title="时间戳转换" subtitle="秒 / 毫秒时间戳与本地时间互相转换，支持多时区、批量转换与复制记录" />

    <main class="workspace">
      <section class="toolbar-card">
        <div class="field-group">
          <span class="field-label">时区</span>
          <select class="select" :value="timezone" @change="HandleTimezoneChange">
            <optgroup
              v-for="group in timezoneGroups"
              :key="group.region"
              :label="group.region"
            >
              <option
                v-for="item in group.options"
                :key="item.value"
                :value="item.value"
              >
                {{ item.country }} · {{ item.label }}
              </option>
            </optgroup>
          </select>
          <span class="offset-tag">{{ offsetText }}</span>
        </div>

        <div class="field-group">
          <span class="field-label">单位</span>
          <div class="chip-row">
            <button
              type="button"
              class="chip"
              :class="{ active: unit === 's' }"
              @click="HandleUnit('s')"
            >
              秒
            </button>
            <button
              type="button"
              class="chip"
              :class="{ active: unit === 'ms' }"
              @click="HandleUnit('ms')"
            >
              毫秒
            </button>
          </div>
        </div>

        <div class="toolbar-actions">
          <button type="button" class="ghost" @click="HandleFillNow">填入当前</button>
          <button type="button" class="ghost" @click="HandleClearAll">清空</button>
        </div>
      </section>

      <section class="convert-grid">
        <div class="panel">
          <div class="panel-head">
            <h2>时间戳 → 时间</h2>
            <button type="button" class="primary mini" @click="HandleTsToTime">
              转换
            </button>
          </div>
          <textarea
            class="editor"
            :value="tsInput"
            placeholder="输入秒或毫秒时间戳，例如 1721808000"
            spellcheck="false"
            @input="HandleTsInput"
          />
          <div class="result-box">
            <p class="result-main">{{ tsResultText }}</p>
            <div class="result-actions">
              <button
                type="button"
                class="ghost mini"
                :disabled="!tsResult.ok"
                @click="HandleCopy(tsResultText)"
              >
                复制结果
              </button>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h2>时间 → 时间戳</h2>
            <button type="button" class="primary mini" @click="HandleTimeToTs">
              转换
            </button>
          </div>
          <textarea
            class="editor"
            :value="timeInput"
            placeholder="输入日期时间，例如 2026-07-24 14:15:00"
            spellcheck="false"
            @input="HandleTimeInput"
          />
          <div class="result-box">
            <p class="result-main">{{ timeResultText }}</p>
            <div class="result-actions">
              <button
                type="button"
                class="ghost mini"
                :disabled="!timeResult.ok"
                @click="HandleCopy(timeResultText)"
              >
                复制结果
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="panel batch-panel">
        <div class="panel-head">
          <div>
            <h2>批量转换（时间戳 → 时间）</h2>
            <p class="panel-tip">每行一个时间戳，自动按位数识别秒 / 毫秒</p>
          </div>
          <div class="panel-actions">
            <button type="button" class="ghost mini" @click="HandleCopyBatch">
              复制全部结果
            </button>
            <button type="button" class="primary mini" @click="HandleBatchConvert">
              批量转换
            </button>
          </div>
        </div>
        <div class="batch-grid">
          <textarea
            class="editor batch-editor"
            :value="batchInput"
            placeholder="1721808000&#10;1721808000000"
            spellcheck="false"
            @input="HandleBatchInput"
          />
          <div class="batch-result">
            <div
              v-for="(item, index) in batchResults"
              :key="`${item.input}-${index}`"
              class="batch-row"
              :class="{ error: !item.ok }"
            >
              <code>{{ item.input || '（空）' }}</code>
              <span>→</span>
              <strong>{{ item.ok ? item.datetimeText : item.message }}</strong>
            </div>
            <p v-if="!batchResults.length" class="empty-tip">转换结果会显示在这里</p>
          </div>
        </div>
      </section>

      <p v-if="statusText" class="status" :class="{ error: hasError, ok: !hasError }">
        {{ statusText }}
      </p>

      <section v-if="history.length" class="history-card">
        <div class="history-header">
          <h2>转换记录</h2>
          <div class="history-actions">
            <button type="button" class="ghost mini" @click="HandleCopyHistory">
              复制全部记录
            </button>
            <button type="button" class="clear-btn" @click="HandleClearHistory">
              清空记录
            </button>
          </div>
        </div>
        <ul class="history-list">
          <li v-for="record in history" :key="record.id">
            <div class="history-meta">
              <span class="type-tag">
                {{ record.direction === 'ts-to-time' ? '戳→时' : '时→戳' }}
              </span>
              <span class="meta-muted">{{ record.timezoneLabel }} · {{ record.unitLabel }}</span>
              <span class="meta-muted">{{ record.createdAt }}</span>
              <button
                type="button"
                class="ghost mini"
                @click="HandleCopy(`${record.input} → ${record.output}`)"
              >
                复制
              </button>
            </div>
            <p class="history-text">{{ record.input }} → {{ record.output }}</p>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 时间戳转换工具页
 * 秒/毫秒时间戳与多时区时间互转，支持批量与记录复制
 */
import { defineComponent } from 'vue'

import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  ConvertDateTimeToTimestamp,
  ConvertTimestampBatch,
  ConvertTimestampToDateTime,
  CreateHistoryRecord,
  FormatDateTimeInTimezone,
  GetNowTimestamp,
  GetTimezoneGroups,
  ResolveTimezoneOffsetText,
  type TimestampConvertItem,
  type TimestampHistoryRecord,
  type TimestampUnit,
  type TimezoneGroup,
} from '@/utils/TimestampConverter'

const EMPTY_RESULT: TimestampConvertItem = {
  input: '',
  ok: false,
  message: '',
  timestampMs: null,
  timestampSec: null,
  datetimeText: '',
  timezone: 'Asia/Shanghai',
  unit: 's',
}

export default defineComponent({
  name: 'TimestampConverterView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      timezoneGroups: GetTimezoneGroups() as TimezoneGroup[],
      timezone: 'Asia/Shanghai',
      unit: 's' as TimestampUnit,
      tsInput: '',
      timeInput: '',
      batchInput: '',
      tsResult: { ...EMPTY_RESULT } as TimestampConvertItem,
      timeResult: { ...EMPTY_RESULT } as TimestampConvertItem,
      batchResults: [] as TimestampConvertItem[],
      history: [] as TimestampHistoryRecord[],
      statusText: '',
      hasError: false,
      nowTimer: null as ReturnType<typeof setInterval> | null,
      nowMs: Date.now(),
    }
  },
  computed: {
    /**
     * 当前时区偏移文案
     * @returns 文案
     */
    offsetText(): string {
      return ResolveTimezoneOffsetText(this.timezone, this.nowMs)
    },
    /**
     * 时间戳→时间结果文案
     * @returns 文案
     */
    tsResultText(): string {
      if (!this.tsResult.message && !this.tsResult.ok) {
        return '点击「转换」查看结果'
      }
      if (!this.tsResult.ok) {
        return this.tsResult.message
      }
      return this.tsResult.datetimeText
    },
    /**
     * 时间→时间戳结果文案
     * @returns 文案
     */
    timeResultText(): string {
      if (!this.timeResult.message && !this.timeResult.ok) {
        return '点击「转换」查看结果'
      }
      if (!this.timeResult.ok) {
        return this.timeResult.message
      }
      return this.unit === 'ms'
        ? String(this.timeResult.timestampMs)
        : String(this.timeResult.timestampSec)
    },
  },
  /**
   * 启动时钟刷新偏移展示
   */
  mounted() {
    this.nowTimer = setInterval(() => {
      this.nowMs = Date.now()
    }, 1000)
  },
  beforeUnmount() {
    if (this.nowTimer) {
      clearInterval(this.nowTimer)
      this.nowTimer = null
    }
  },
  methods: {
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
     * 推入转换记录
     * @param record 记录
     */
    PushHistory(record: TimestampHistoryRecord) {
      this.history = [record, ...this.history].slice(0, 50)
    },
    /**
     * 切换时区
     * @param event 变更事件
     */
    HandleTimezoneChange(event: Event) {
      const target = event.target as HTMLSelectElement
      this.timezone = target.value
    },
    /**
     * 切换单位
     * @param unit 单位
     */
    HandleUnit(unit: TimestampUnit) {
      this.unit = unit
    },
    /**
     * 时间戳输入
     * @param event 输入事件
     */
    HandleTsInput(event: Event) {
      this.tsInput = (event.target as HTMLTextAreaElement).value
    },
    /**
     * 时间输入
     * @param event 输入事件
     */
    HandleTimeInput(event: Event) {
      this.timeInput = (event.target as HTMLTextAreaElement).value
    },
    /**
     * 批量输入
     * @param event 输入事件
     */
    HandleBatchInput(event: Event) {
      this.batchInput = (event.target as HTMLTextAreaElement).value
    },
    /**
     * 填入当前时间戳与当前时区时间
     */
    HandleFillNow() {
      const now = GetNowTimestamp(this.unit)
      this.tsInput = String(now)
      this.timeInput = FormatDateTimeInTimezone(Date.now(), this.timezone)
      this.SetStatus('已填入当前时间', false)
    },
    /**
     * 时间戳 → 时间
     */
    HandleTsToTime() {
      const result = ConvertTimestampToDateTime(this.tsInput, this.unit, this.timezone)
      this.tsResult = result
      if (!result.ok) {
        this.SetStatus(result.message, true)
        return
      }
      this.PushHistory(
        CreateHistoryRecord(
          'ts-to-time',
          this.tsInput.trim(),
          result.datetimeText,
          this.timezone,
          result.unit
        )
      )
      this.SetStatus('时间戳转换成功', false)
    },
    /**
     * 时间 → 时间戳
     */
    HandleTimeToTs() {
      const result = ConvertDateTimeToTimestamp(this.timeInput, this.unit, this.timezone)
      this.timeResult = result
      if (!result.ok) {
        this.SetStatus(result.message, true)
        return
      }
      const output =
        this.unit === 'ms' ? String(result.timestampMs) : String(result.timestampSec)
      this.PushHistory(
        CreateHistoryRecord(
          'time-to-ts',
          this.timeInput.trim(),
          output,
          this.timezone,
          this.unit
        )
      )
      this.SetStatus('日期时间转换成功', false)
    },
    /**
     * 批量转换
     */
    HandleBatchConvert() {
      const results = ConvertTimestampBatch(this.batchInput, 'auto', this.timezone)
      this.batchResults = results
      const okCount = results.filter((item) => item.ok).length
      if (!results.length) {
        this.SetStatus('请先输入批量时间戳', true)
        return
      }
      for (const item of results) {
        if (!item.ok) {
          continue
        }
        this.PushHistory(
          CreateHistoryRecord(
            'ts-to-time',
            item.input,
            item.datetimeText,
            this.timezone,
            item.unit
          )
        )
      }
      this.SetStatus(`批量完成：成功 ${okCount} / ${results.length}`, okCount === 0)
    },
    /**
     * 复制文本
     * @param text 文案
     */
    async HandleCopy(text: string) {
      if (!text) {
        return
      }
      try {
        await navigator.clipboard.writeText(text)
        this.SetStatus('已复制到剪贴板', false)
      } catch {
        this.SetStatus('复制失败，请手动选择复制', true)
      }
    },
    /**
     * 复制批量结果
     */
    HandleCopyBatch() {
      if (!this.batchResults.length) {
        this.SetStatus('暂无批量结果可复制', true)
        return
      }
      const text = this.batchResults
        .map((item) =>
          item.ok ? `${item.input} → ${item.datetimeText}` : `${item.input} → ${item.message}`
        )
        .join('\n')
      this.HandleCopy(text)
    },
    /**
     * 复制全部历史
     */
    HandleCopyHistory() {
      const text = this.history
        .map(
          (item) =>
            `[${item.createdAt}] ${item.input} → ${item.output} (${item.timezoneLabel} · ${item.unitLabel})`
        )
        .join('\n')
      this.HandleCopy(text)
    },
    /**
     * 清空历史
     */
    HandleClearHistory() {
      this.history = []
      this.SetStatus('已清空转换记录', false)
    },
    /**
     * 清空输入与结果
     */
    HandleClearAll() {
      this.tsInput = ''
      this.timeInput = ''
      this.batchInput = ''
      this.tsResult = { ...EMPTY_RESULT, timezone: this.timezone, unit: this.unit }
      this.timeResult = { ...EMPTY_RESULT, timezone: this.timezone, unit: this.unit }
      this.batchResults = []
      this.statusText = ''
      this.hasError = false
    },
  },
})
</script>

<style scoped>
.ts-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace {
  flex: 1;
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar-card,
.panel,
.history-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(49, 65, 95, 0.1);
  padding: 16px;
}

.toolbar-card {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 20px;
  align-items: center;
  justify-content: space-between;
}

.field-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.field-label {
  color: #6a7a94;
  font-size: 0.88rem;
}

.select {
  min-width: 320px;
  max-width: min(520px, 100%);
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 8px 12px;
  font: inherit;
  background: #fff;
  color: #1f2a3d;
}

.offset-tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(49, 72, 111, 0.1);
  color: #31486f;
  font-size: 0.8rem;
}

.chip-row {
  display: flex;
  gap: 8px;
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

.primary:hover {
  background: #3d5a8a;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.25);
  background: transparent;
  color: #31415f;
}

.ghost:hover:not(:disabled) {
  border-color: #3d6eb0;
  background: rgba(84, 148, 255, 0.08);
}

.ghost:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.primary.mini,
.ghost.mini {
  padding: 5px 10px;
  font-size: 0.8rem;
  border-radius: 8px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.convert-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-head h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #1f2a3d;
}

.panel-tip {
  margin: 6px 0 0;
  color: #6a7a94;
  font-size: 0.84rem;
}

.panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.editor {
  width: 100%;
  min-height: 110px;
  resize: vertical;
  border: 1px solid rgba(49, 65, 95, 0.18);
  border-radius: 12px;
  padding: 12px;
  font: 0.9rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: #1f2a3d;
  background: #fff;
  box-sizing: border-box;
}

.editor:focus {
  outline: 2px solid rgba(61, 110, 176, 0.35);
  border-color: #3d6eb0;
}

.result-box {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(49, 72, 111, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.result-main {
  margin: 0;
  color: #1f2a3d;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
}

.batch-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.batch-editor {
  min-height: 220px;
}

.batch-result {
  min-height: 220px;
  border: 1px solid rgba(49, 65, 95, 0.14);
  border-radius: 12px;
  background: #fff;
  padding: 10px;
  overflow: auto;
  max-height: 360px;
}

.batch-row {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) auto minmax(0, 1.4fr);
  gap: 8px;
  align-items: start;
  padding: 8px;
  border-radius: 8px;
  font-size: 0.86rem;
}

.batch-row:nth-child(odd) {
  background: rgba(49, 72, 111, 0.04);
}

.batch-row.error {
  color: #9f2f2f;
}

.batch-row code,
.batch-row strong {
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.empty-tip {
  margin: 24px 12px;
  color: #7a879c;
  font-size: 0.9rem;
}

.status {
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
}

.status.ok {
  background: rgba(46, 125, 90, 0.1);
  color: #1f6b4a;
}

.status.error {
  background: rgba(159, 47, 47, 0.08);
  color: #9f2f2f;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.history-header h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #1f2a3d;
}

.history-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.clear-btn {
  border: none;
  background: transparent;
  color: #9f2f2f;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
}

.history-list li {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(49, 72, 111, 0.05);
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(49, 72, 111, 0.12);
  color: #31486f;
  font-size: 0.75rem;
}

.meta-muted {
  color: #7a879c;
  font-size: 0.78rem;
}

.history-text {
  margin: 0;
  color: #31415f;
  font-size: 0.92rem;
  word-break: break-all;
}

@media (max-width: 900px) {.convert-grid, .batch-grid { grid-template-columns: 1fr; } .select { min-width: 0; width: 100%; } .batch-row { grid-template-columns: 1fr; }}
</style>
