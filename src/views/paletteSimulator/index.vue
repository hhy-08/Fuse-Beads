<template>
  <div class="palette-page">
    <ToolPageHero
      title="配色模拟"
      subtitle="输入多个 MARD 色号，实时预览色块搭配；支持保存配色方案到本地"
      :links="[{ to: '/', label: '工具列表' }, { to: '/generator', label: '拼豆工具' }, { to: '/about', label: '关于' }]"
    />

    <main class="workspace">
      <aside class="panel side-panel">
        <section class="section">
          <h2>添加色号</h2>
          <label class="field">
            <span>输入色号（空格 / 逗号分隔，如 A1 B2 H8）</span>
            <textarea
              v-model="codeInput"
              rows="3"
              placeholder="A1, A5, B2, H8"
              @keydown.enter.exact.prevent="HandleAddCodes"
            />
          </label>
          <div class="inline-actions">
            <button type="button" class="primary" @click="HandleAddCodes">
              添加到预览
            </button>
            <button type="button" class="ghost" @click="ClearPreview">
              清空预览
            </button>
          </div>
          <p v-if="invalidHint" class="hint error">{{ invalidHint }}</p>
        </section>

        <section class="section">
          <h2>从色卡点选</h2>
          <label class="field">
            <span>系列</span>
            <select v-model="paletteSeries">
              <option v-for="series in seriesList" :key="series" :value="series">
                {{ series }}
              </option>
            </select>
          </label>
          <div class="picker-grid">
            <button
              v-for="swatch in paletteColors"
              :key="swatch.code"
              type="button"
              class="picker-swatch"
              :class="{ active: selectedCodes.includes(swatch.code) }"
              :style="{ background: swatch.hex }"
              :title="`${swatch.code} ${swatch.hex}`"
              @click="TogglePaletteCode(swatch.code)"
            >
              <span>{{ swatch.code }}</span>
            </button>
          </div>
        </section>

        <section class="section">
          <h2>保存方案</h2>
          <label class="field">
            <span>方案名称</span>
            <input
              v-model="schemeName"
              type="text"
              maxlength="40"
              placeholder="例如：春日配色"
            />
          </label>
          <div class="inline-actions">
            <button
              type="button"
              class="primary"
              :disabled="!selectedCodes.length"
              @click="HandleSaveScheme"
            >
              {{ editingSchemeId ? '更新方案' : '保存方案' }}
            </button>
            <button
              v-if="editingSchemeId"
              type="button"
              class="ghost"
              @click="CancelEditScheme"
            >
              取消编辑
            </button>
          </div>
          <p v-if="statusText" class="hint" :class="{ error: hasError }">
            {{ statusText }}
          </p>
        </section>

        <section class="section">
          <div class="section-head">
            <h2>已保存方案</h2>
            <span class="count">{{ savedSchemes.length }}</span>
          </div>
          <ul v-if="savedSchemes.length" class="scheme-list">
            <li v-for="scheme in savedSchemes" :key="scheme.id" class="scheme-item">
              <button type="button" class="scheme-main" @click="LoadScheme(scheme)">
                <strong>{{ scheme.name }}</strong>
                <span>{{ scheme.codes.join(' · ') }}</span>
                <em>{{ FormatTime(scheme.updatedAt) }}</em>
              </button>
              <div class="scheme-actions">
                <button type="button" class="ghost-sm" @click="EditScheme(scheme)">
                  编辑
                </button>
                <button type="button" class="ghost-sm danger" @click="RemoveScheme(scheme.id)">
                  删除
                </button>
              </div>
              <div class="scheme-mini">
                <span
                  v-for="code in scheme.codes.slice(0, 8)"
                  :key="`${scheme.id}-${code}`"
                  class="mini-swatch"
                  :style="{ background: ResolveHex(code) }"
                  :title="code"
                />
              </div>
            </li>
          </ul>
          <p v-else class="empty">暂无保存的方案，搭配满意后点「保存方案」</p>
        </section>
      </aside>

      <section class="panel preview-panel">
        <div class="preview-toolbar">
          <div>
            <h2>搭配预览</h2>
            <p>
              已选 {{ previewColors.length }} 色
              <template v-if="previewColors.length">
                · {{ previewColors.map((item) => item.code).join(' / ') }}
              </template>
            </p>
          </div>
          <div class="layout-tabs">
            <button
              type="button"
              class="layout-btn"
              :class="{ active: previewLayout === 'grid' }"
              @click="previewLayout = 'grid'"
            >
              网格
            </button>
            <button
              type="button"
              class="layout-btn"
              :class="{ active: previewLayout === 'row' }"
              @click="previewLayout = 'row'"
            >
              横条
            </button>
            <button
              type="button"
              class="layout-btn"
              :class="{ active: previewLayout === 'stack' }"
              @click="previewLayout = 'stack'"
            >
              叠色
            </button>
          </div>
        </div>

        <div v-if="previewColors.length" class="preview-stage" :class="previewLayout">
          <div
            v-for="(color, index) in previewColors"
            :key="`${color.code}-${index}`"
            class="preview-block"
            :style="{ background: color.hex }"
          >
            <div class="block-meta">
              <strong>{{ color.code }}</strong>
              <span>{{ color.hex }}</span>
            </div>
            <button
              type="button"
              class="remove-btn"
              title="移除"
              @click="RemoveCode(color.code)"
            >
              ×
            </button>
          </div>
        </div>
        <div v-else class="preview-empty">
          <p>从左侧输入色号或点选色卡，这里会实时显示搭配效果</p>
        </div>

        <div v-if="previewColors.length" class="chip-row">
          <button
            v-for="color in previewColors"
            :key="`chip-${color.code}`"
            type="button"
            class="chip"
            @click="RemoveCode(color.code)"
          >
            <i :style="{ background: color.hex }" />
            {{ color.code }}
            <span>×</span>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 拼豆配色模拟器页面
 * 多色号实时预览与本地方案保存
 */
import { defineComponent } from 'vue'

import {
  FindMardColorByCode,
  GetMardColorsBySeries,
  MARDSERIES,
  type MardColor,
} from '@/utils/MardColors'
import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  DeletePaletteScheme,
  FormatSchemeTime,
  LoadPaletteSchemes,
  ParseColorCodeInput,
  ResolvePaletteColors,
  UpsertPaletteScheme,
  type PaletteScheme,
} from '@/utils/PaletteSimulator'

export default defineComponent({
  name: 'PaletteSimulatorView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      seriesList: MARDSERIES as readonly string[],
      paletteSeries: '全部',
      codeInput: '',
      selectedCodes: [] as string[],
      previewLayout: 'grid' as 'grid' | 'row' | 'stack',
      schemeName: '',
      editingSchemeId: '' as string,
      savedSchemes: [] as PaletteScheme[],
      invalidHint: '',
      statusText: '',
      hasError: false,
    }
  },
  computed: {
    /**
     * 当前系列可选色卡
     * @returns 色卡列表
     */
    paletteColors(): MardColor[] {
      return GetMardColorsBySeries(this.paletteSeries)
    },
    /**
     * 预览用有效颜色
     * @returns 颜色列表
     */
    previewColors(): MardColor[] {
      return ResolvePaletteColors(this.selectedCodes).colors
    },
  },
  /**
   * 挂载后加载本地方案
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '配色模拟')
    this.savedSchemes = LoadPaletteSchemes()
  },
  methods: {
    /**
     * 格式化方案时间
     * @param timestamp 时间戳
     * @returns 文案
     */
    FormatTime(timestamp: number): string {
      return FormatSchemeTime(timestamp)
    },
    /**
     * 色号转 HEX（无效则灰）
     * @param code 色号
     * @returns HEX
     */
    ResolveHex(code: string): string {
      return FindMardColorByCode(code)?.hex || '#d7deea'
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
     * 从输入框追加色号
     */
    HandleAddCodes() {
      const codes = ParseColorCodeInput(this.codeInput)
      if (!codes.length) {
        this.invalidHint = '请输入至少一个色号'
        return
      }
      const { colors, invalidCodes } = ResolvePaletteColors(codes)
      const next = [...this.selectedCodes]
      for (const color of colors) {
        if (!next.includes(color.code)) {
          next.push(color.code)
        }
      }
      this.selectedCodes = next
      this.codeInput = ''
      this.invalidHint = invalidCodes.length
        ? `未识别色号：${invalidCodes.join('、')}`
        : ''
      this.SetStatus(`已加入 ${colors.length} 个色号`)
    },
    /**
     * 点选色卡切换色号
     * @param code 色号
     */
    TogglePaletteCode(code: string) {
      if (this.selectedCodes.includes(code)) {
        this.RemoveCode(code)
        return
      }
      this.selectedCodes = [...this.selectedCodes, code]
      this.invalidHint = ''
    },
    /**
     * 移除某个色号
     * @param code 色号
     */
    RemoveCode(code: string) {
      this.selectedCodes = this.selectedCodes.filter((item) => item !== code)
    },
    /**
     * 清空预览
     */
    ClearPreview() {
      this.selectedCodes = []
      this.invalidHint = ''
      this.SetStatus('已清空预览')
    },
    /**
     * 保存或更新方案
     */
    HandleSaveScheme() {
      try {
        const result = UpsertPaletteScheme(
          this.schemeName,
          this.selectedCodes,
          this.editingSchemeId || undefined,
        )
        this.savedSchemes = result.schemes
        this.schemeName = result.scheme.name
        this.editingSchemeId = result.scheme.id
        this.SetStatus(`已保存「${result.scheme.name}」`)
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '保存失败',
          true,
        )
      }
    },
    /**
     * 加载方案到预览
     * @param scheme 方案
     */
    LoadScheme(scheme: PaletteScheme) {
      this.selectedCodes = [...scheme.codes]
      this.schemeName = scheme.name
      this.editingSchemeId = ''
      this.invalidHint = ''
      this.SetStatus(`已加载「${scheme.name}」`)
    },
    /**
     * 进入编辑已有方案
     * @param scheme 方案
     */
    EditScheme(scheme: PaletteScheme) {
      this.selectedCodes = [...scheme.codes]
      this.schemeName = scheme.name
      this.editingSchemeId = scheme.id
      this.SetStatus(`正在编辑「${scheme.name}」`)
    },
    /**
     * 取消编辑状态
     */
    CancelEditScheme() {
      this.editingSchemeId = ''
      this.SetStatus('已取消编辑，保存将创建新方案')
    },
    /**
     * 删除方案
     * @param schemeId 方案 ID
     */
    RemoveScheme(schemeId: string) {
      const target = this.savedSchemes.find((item) => item.id === schemeId)
      if (!target) {
        return
      }
      if (!window.confirm(`确定删除方案「${target.name}」？`)) {
        return
      }
      this.savedSchemes = DeletePaletteScheme(schemeId)
      if (this.editingSchemeId === schemeId) {
        this.editingSchemeId = ''
      }
      this.SetStatus(`已删除「${target.name}」`)
    },
  },
})
</script>

<style scoped>
.palette-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace {
  flex: 1;
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: 18px;
  align-items: start;
}

.panel {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.side-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 180px);
  overflow: auto;
}

.section h2,
.preview-toolbar h2 {
  margin: 0 0 10px;
  font-size: 0.98rem;
  color: #1d2a44;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.section-head h2 {
  margin: 0;
}

.count {
  font-size: 0.8rem;
  color: #6a7a96;
  background: rgba(49, 65, 95, 0.06);
  border-radius: 999px;
  padding: 2px 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #31415f;
  font-size: 0.88rem;
  margin-bottom: 10px;
}

.field textarea,
.field input,
.field select {
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  background: #fff;
  color: #1d2a44;
}

.field textarea {
  resize: vertical;
  min-height: 72px;
}

.inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.primary,
.ghost,
.ghost-sm,
.layout-btn {
  font: inherit;
  cursor: pointer;
}

.primary,
.ghost {
  border-radius: 999px;
  padding: 9px 14px;
}

.primary {
  border: 1px solid #31486f;
  background: #31486f;
  color: #fff8ef;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
}

.primary:disabled,
.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  margin: 10px 0 0;
  font-size: 0.86rem;
  color: #3f6b4a;
}

.hint.error {
  color: #a33b3b;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  max-height: 220px;
  overflow: auto;
}

.picker-swatch {
  position: relative;
  aspect-ratio: 1;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
}

.picker-swatch span {
  position: absolute;
  left: 2px;
  bottom: 2px;
  font-size: 0.58rem;
  color: #1d2a44;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 3px;
  padding: 0 2px;
}

.picker-swatch.active {
  outline: 2px solid #31486f;
  outline-offset: 1px;
}

.scheme-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scheme-item {
  border: 1px solid rgba(49, 65, 95, 0.14);
  border-radius: 12px;
  background: #fff;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scheme-main {
  border: none;
  background: transparent;
  text-align: left;
  padding: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font: inherit;
}

.scheme-main strong {
  color: #1d2a44;
}

.scheme-main span {
  color: #5a6a84;
  font-size: 0.82rem;
  line-height: 1.4;
  word-break: break-all;
}

.scheme-main em {
  font-style: normal;
  color: #8a96aa;
  font-size: 0.75rem;
}

.scheme-actions {
  display: flex;
  gap: 10px;
}

.ghost-sm {
  border: none;
  background: transparent;
  color: #4d6d9a;
  padding: 0;
  font-size: 0.82rem;
}

.ghost-sm.danger {
  color: #a33b3b;
}

.scheme-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.mini-swatch {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.empty {
  margin: 0;
  color: #6a7a96;
  font-size: 0.88rem;
  line-height: 1.5;
}

.preview-panel {
  padding: 18px;
  min-height: 520px;
}

.preview-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.preview-toolbar p {
  margin: 6px 0 0;
  color: #6a7a96;
  font-size: 0.88rem;
  line-height: 1.5;
}

.layout-tabs {
  display: flex;
  gap: 6px;
}

.layout-btn {
  border: 1px solid rgba(49, 65, 95, 0.2);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.85rem;
}

.layout-btn.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.preview-stage {
  display: grid;
  gap: 10px;
  min-height: 320px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(49, 65, 95, 0.12);
  background: #edf1f7;
}

.preview-stage.grid {
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}

.preview-stage.row {
  grid-template-columns: 1fr;
}

.preview-stage.row .preview-block {
  min-height: 72px;
}

.preview-stage.stack {
  grid-template-columns: 1fr;
  gap: 0;
  overflow: hidden;
  padding: 0;
}

.preview-stage.stack .preview-block {
  min-height: 64px;
  border-radius: 0;
  border: none;
}

.preview-block {
  position: relative;
  min-height: 110px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: flex-end;
  padding: 10px;
  overflow: hidden;
}

.block-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  color: #1d2a44;
}

.block-meta strong {
  font-size: 0.95rem;
}

.block-meta span {
  font-size: 0.75rem;
  color: #5a6a84;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 999px;
  background: rgba(29, 42, 68, 0.55);
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.preview-empty {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  border: 1px dashed rgba(49, 65, 95, 0.22);
  background: rgba(255, 255, 255, 0.55);
  color: #6a7a96;
  text-align: center;
  padding: 24px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(49, 65, 95, 0.16);
  background: #fff;
  border-radius: 999px;
  padding: 6px 10px;
  font: inherit;
  font-size: 0.85rem;
  color: #31415f;
  cursor: pointer;
}

.chip i {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.chip span {
  color: #8a96aa;
}

@media (max-width: 900px) {.workspace { grid-template-columns: 1fr; } .side-panel { max-height: none; } .preview-toolbar { flex-direction: column; }}
</style>
