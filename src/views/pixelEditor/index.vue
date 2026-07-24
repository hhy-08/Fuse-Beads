<template>
  <div class="pixel-page">
    <ToolPageHero
      title="像素画布"
      subtitle="自由手绘像素画，支持橡皮擦、取色、图层与网格，可导出像素图 / 拼豆图纸并对接拼豆生成器"
      :links="[{ to: '/', label: '工具列表' }, { to: '/generator', label: '拼豆工具' }, { to: '/about', label: '关于' }]"
    />

    <main class="workspace">
      <aside class="panel tools-panel">
        <section class="section">
          <h2>工具</h2>
          <div class="tool-row">
            <button
              v-for="item in toolOptions"
              :key="item.value"
              type="button"
              class="tool-btn"
              :class="{ active: tool === item.value }"
              @click="tool = item.value"
            >
              {{ item.label }}
            </button>
          </div>
        </section>

        <section class="section">
          <h2>画笔颜色</h2>
          <div class="color-row">
            <input v-model="paintColor" type="color" @input="HandlePaintColorInput" />
            <input
              v-model="paintColor"
              type="text"
              class="color-text"
              maxlength="7"
              @change="HandlePaintColorInput"
            />
          </div>
          <label class="field">
            <span>MARD 系列</span>
            <select v-model="paletteSeries">
              <option v-for="series in seriesList" :key="series" :value="series">
                {{ series }}
              </option>
            </select>
          </label>
          <div class="palette-grid">
            <button
              v-for="swatch in paletteColors"
              :key="swatch.code"
              type="button"
              class="swatch"
              :class="{ active: paintColor.toUpperCase() === swatch.hex.toUpperCase() }"
              :style="{ background: swatch.hex }"
              :title="`${swatch.code} ${swatch.hex}`"
              @click="SelectPaletteColor(swatch.hex)"
            >
              <span>{{ swatch.code }}</span>
            </button>
          </div>
        </section>

        <section class="section">
          <h2>画布</h2>
          <div class="size-row">
            <label class="field">
              <span>宽 {{ canvasWidth }}</span>
              <input v-model.number="canvasWidth" type="range" min="8" max="96" step="1" />
            </label>
            <label class="field">
              <span>高 {{ canvasHeight }}</span>
              <input v-model.number="canvasHeight" type="range" min="8" max="96" step="1" />
            </label>
          </div>
          <button type="button" class="ghost" @click="ApplyCanvasSize">应用尺寸</button>
          <label class="check">
            <input v-model="showGrid" type="checkbox" @change="RedrawCanvas" />
            显示网格
          </label>
          <label class="field">
            <span>预览缩放 {{ cellSize }}px</span>
            <input
              v-model.number="cellSize"
              type="range"
              min="8"
              max="28"
              step="1"
              @input="RedrawCanvas"
            />
          </label>
        </section>

        <section class="section">
          <h2>图层</h2>
          <ul class="layer-list">
            <li
              v-for="layer in project.layers"
              :key="layer.id"
              class="layer-item"
              :class="{ active: layer.id === project.activeLayerId }"
              @click="SelectLayer(layer.id)"
            >
              <label class="vis" @click.stop>
                <input
                  type="checkbox"
                  :checked="layer.visible"
                  @change="ToggleLayerVisible(layer.id, $event)"
                />
              </label>
              <span class="layer-name">{{ layer.name }}</span>
              <button
                type="button"
                class="ghost-sm"
                :disabled="project.layers.length <= 1"
                @click.stop="DeleteLayer(layer.id)"
              >
                删
              </button>
            </li>
          </ul>
          <div class="layer-actions">
            <button type="button" class="ghost" @click="HandleAddLayer">新建图层</button>
            <button type="button" class="ghost" @click="HandleClearActiveLayer">清空当前层</button>
          </div>
        </section>

        <section class="section">
          <h2>导出 / 对接</h2>
          <label class="field">
            <span>像素图放大 {{ exportScale }}x</span>
            <input v-model.number="exportScale" type="range" min="1" max="32" step="1" />
          </label>
          <div class="action-stack">
            <button type="button" class="ghost" @click="ExportPixelImage">导出像素图 PNG</button>
            <button type="button" class="ghost" @click="ExportBeadImage">导出拼豆图纸 PNG</button>
            <button type="button" class="primary" @click="SendToGenerator">发送到拼豆生成器</button>
          </div>
          <p v-if="statusText" class="status" :class="{ error: hasError }">{{ statusText }}</p>
          <p class="meta">
            {{ project.width }} × {{ project.height }} · 已填
            {{ filledCount }} 格 · 图层 {{ project.layers.length }}
          </p>
        </section>
      </aside>

      <section class="canvas-panel">
        <div class="canvas-toolbar">
          <h2>画板</h2>
          <p>按住拖拽绘制 · 取色点击采样 · 填充点击区域</p>
        </div>
        <div
          class="canvas-stage"
          ref="stage"
          @pointerdown="HandlePointerDown"
          @pointermove="HandlePointerMove"
          @pointerup="HandlePointerUp"
          @pointerleave="HandlePointerUp"
          @pointercancel="HandlePointerUp"
        >
          <canvas ref="board" class="board"></canvas>
        </div>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 像素画布编辑器页面
 * 手绘 / 橡皮 / 取色 / 填充 / 图层 / 网格，并对接拼豆生成器
 */
import { defineComponent } from 'vue'

import router from '@/router'
import {
  GetMardColorsBySeries,
  MARDSERIES,
  type MardColor,
} from '@/utils/MardColors'
import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  AddPixelLayer,
  ClearPixelLayer,
  CloneColoredPixelGrid,
  CountFilledPixels,
  CreatePixelProject,
  DrawLayerLine,
  ExportProjectBeadPng,
  ExportProjectPixelPng,
  FillLayerRegion,
  FindActiveLayer,
  FlattenProjectToGrid,
  NormalizePaintColor,
  RemovePixelLayer,
  ResizePixelProject,
  ResolvePixelExportStamp,
  SampleProjectPixel,
  SetLayerPixel,
  type PixelTool,
} from '@/utils/PixelCanvas'

export default defineComponent({
  name: 'PixelEditorView',
  components: {
    ToolPageHero,
  },
  data() {
    const project = CreatePixelProject(32, 32)
    return {
      project,
      tool: 'pen' as PixelTool,
      toolOptions: [
        { value: 'pen' as PixelTool, label: '画笔' },
        { value: 'eraser' as PixelTool, label: '橡皮' },
        { value: 'eyedropper' as PixelTool, label: '取色' },
        { value: 'fill' as PixelTool, label: '填充' },
      ],
      paintColor: '#0F54C0',
      seriesList: MARDSERIES as readonly string[],
      paletteSeries: '全部',
      canvasWidth: 32,
      canvasHeight: 32,
      cellSize: 16,
      showGrid: true,
      exportScale: 8,
      isDrawing: false,
      lastX: -1,
      lastY: -1,
      statusText: '',
      hasError: false,
    }
  },
  computed: {
    /**
     * 当前系列色卡
     * @returns 色块列表
     */
    paletteColors(): MardColor[] {
      return GetMardColorsBySeries(this.paletteSeries)
    },
    /**
     * 已着色格子数
     * @returns 数量
     */
    filledCount(): number {
      return CountFilledPixels(FlattenProjectToGrid(this.project))
    },
  },
  /**
   * 挂载后绘制画布
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '像素画布')
    this.RedrawCanvas()
    window.addEventListener('resize', this.RedrawCanvas)
  },
  /**
   * 卸载清理
   */
  beforeUnmount() {
    window.removeEventListener('resize', this.RedrawCanvas)
  },
  methods: {
    /**
     * 规范化画笔颜色输入
     */
    HandlePaintColorInput() {
      const next = NormalizePaintColor(this.paintColor)
      if (next) {
        this.paintColor = next
      }
    },
    /**
     * 从色卡选色
     * @param hex 色值
     */
    SelectPaletteColor(hex: string) {
      this.paintColor = hex.toUpperCase()
      if (this.tool === 'eraser' || this.tool === 'eyedropper') {
        this.tool = 'pen'
      }
    },
    /**
     * 应用画布尺寸
     */
    ApplyCanvasSize() {
      this.project = ResizePixelProject(
        this.project,
        this.canvasWidth,
        this.canvasHeight,
      )
      this.canvasWidth = this.project.width
      this.canvasHeight = this.project.height
      this.RedrawCanvas()
      this.SetStatus(`画布已调整为 ${this.project.width} × ${this.project.height}`)
    },
    /**
     * 选中图层
     * @param layerId 图层 ID
     */
    SelectLayer(layerId: string) {
      this.project = { ...this.project, activeLayerId: layerId }
      this.RedrawCanvas()
    },
    /**
     * 切换图层可见性
     * @param layerId 图层 ID
     * @param event 事件
     */
    ToggleLayerVisible(layerId: string, event: Event) {
      const checked = (event.target as HTMLInputElement).checked
      this.project = {
        ...this.project,
        layers: this.project.layers.map((layer) =>
          layer.id === layerId ? { ...layer, visible: checked } : layer,
        ),
      }
      this.RedrawCanvas()
    },
    /**
     * 新建图层
     */
    HandleAddLayer() {
      this.project = AddPixelLayer(this.project)
      this.RedrawCanvas()
      this.SetStatus('已新建图层')
    },
    /**
     * 删除图层
     * @param layerId 图层 ID
     */
    DeleteLayer(layerId: string) {
      this.project = RemovePixelLayer(this.project, layerId)
      this.RedrawCanvas()
    },
    /**
     * 清空当前活动图层
     */
    HandleClearActiveLayer() {
      const layer = FindActiveLayer(this.project)
      if (!layer) {
        return
      }
      ClearPixelLayer(layer)
      this.project = {
        ...this.project,
        layers: this.project.layers.map((item) =>
          item.id === layer.id ? { ...layer, cells: layer.cells } : item,
        ),
      }
      this.RedrawCanvas()
      this.SetStatus('已清空当前图层')
    },
    /**
     * 指针坐标转像素格
     * @param event 指针事件
     * @returns 格坐标或 null
     */
    ResolveCellFromEvent(event: PointerEvent): { x: number; y: number } | null {
      const canvas = this.$refs.board as HTMLCanvasElement | undefined
      if (!canvas) {
        return null
      }
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const px = (event.clientX - rect.left) * scaleX
      const py = (event.clientY - rect.top) * scaleY
      const x = Math.floor(px / this.cellSize)
      const y = Math.floor(py / this.cellSize)
      if (
        x < 0 ||
        y < 0 ||
        x >= this.project.width ||
        y >= this.project.height
      ) {
        return null
      }
      return { x, y }
    },
    /**
     * 在活动图层绘制一笔
     * @param x 列
     * @param y 行
     * @param continuous 是否连续线
     */
    PaintAt(x: number, y: number, continuous: boolean) {
      const layer = FindActiveLayer(this.project)
      if (!layer || !layer.visible) {
        this.SetStatus('请选择可见图层再绘制', true)
        return
      }

      if (this.tool === 'eyedropper') {
        const sampled = SampleProjectPixel(this.project, x, y)
        if (sampled) {
          this.paintColor = sampled
          this.tool = 'pen'
          this.SetStatus(`已取色 ${sampled}`)
        }
        return
      }

      if (this.tool === 'fill') {
        const color = NormalizePaintColor(this.paintColor)
        if (!color) {
          this.SetStatus('颜色格式无效', true)
          return
        }
        FillLayerRegion(layer, x, y, color)
        this.BumpLayer(layer)
        this.RedrawCanvas()
        return
      }

      const color =
        this.tool === 'eraser' ? null : NormalizePaintColor(this.paintColor)
      if (this.tool === 'pen' && !color) {
        this.SetStatus('颜色格式无效', true)
        return
      }

      if (continuous && this.lastX >= 0 && this.lastY >= 0) {
        DrawLayerLine(layer, this.lastX, this.lastY, x, y, color)
      } else {
        SetLayerPixel(layer, x, y, color)
      }
      this.lastX = x
      this.lastY = y
      this.BumpLayer(layer)
      this.RedrawCanvas()
    },
    /**
     * 触发图层引用更新（保证 Vue 响应）
     * @param layer 图层
     */
    BumpLayer(layer: { id: string }) {
      this.project = {
        ...this.project,
        layers: this.project.layers.map((item) =>
          item.id === layer.id ? { ...item } : item,
        ),
      }
    },
    /**
     * 指针按下
     * @param event 事件
     */
    HandlePointerDown(event: PointerEvent) {
      const cell = this.ResolveCellFromEvent(event)
      if (!cell) {
        return
      }
      const stage = this.$refs.stage as HTMLElement | undefined
      stage?.setPointerCapture?.(event.pointerId)
      this.isDrawing = true
      this.lastX = -1
      this.lastY = -1
      this.PaintAt(cell.x, cell.y, false)
    },
    /**
     * 指针移动
     * @param event 事件
     */
    HandlePointerMove(event: PointerEvent) {
      if (!this.isDrawing) {
        return
      }
      if (this.tool === 'eyedropper' || this.tool === 'fill') {
        return
      }
      const cell = this.ResolveCellFromEvent(event)
      if (!cell) {
        return
      }
      this.PaintAt(cell.x, cell.y, true)
    },
    /**
     * 指针抬起
     */
    HandlePointerUp() {
      this.isDrawing = false
      this.lastX = -1
      this.lastY = -1
    },
    /**
     * 重绘画板（合成图层 + 网格）
     */
    RedrawCanvas() {
      const canvas = this.$refs.board as HTMLCanvasElement | undefined
      if (!canvas) {
        return
      }
      const cell = Math.max(8, Math.round(this.cellSize))
      this.cellSize = cell
      canvas.width = this.project.width * cell
      canvas.height = this.project.height * cell
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return
      }

      // 透明棋盘底
      const tile = Math.max(4, Math.floor(cell / 2))
      for (let y = 0; y < canvas.height; y += tile) {
        for (let x = 0; x < canvas.width; x += tile) {
          const odd = (Math.floor(x / tile) + Math.floor(y / tile)) % 2 === 1
          ctx.fillStyle = odd ? '#e8ecf3' : '#f7f8fb'
          ctx.fillRect(x, y, tile, tile)
        }
      }

      const grid = FlattenProjectToGrid(this.project)
      for (let y = 0; y < grid.height; y += 1) {
        for (let x = 0; x < grid.width; x += 1) {
          const color = grid.cells[y][x]
          if (!color) {
            continue
          }
          ctx.fillStyle = color
          ctx.fillRect(x * cell, y * cell, cell, cell)
        }
      }

      if (this.showGrid) {
        ctx.strokeStyle = 'rgba(40, 56, 84, 0.22)'
        ctx.lineWidth = 1
        for (let x = 0; x <= this.project.width; x += 1) {
          const pos = x * cell + 0.5
          ctx.beginPath()
          ctx.moveTo(pos, 0)
          ctx.lineTo(pos, canvas.height)
          ctx.stroke()
        }
        for (let y = 0; y <= this.project.height; y += 1) {
          const pos = y * cell + 0.5
          ctx.beginPath()
          ctx.moveTo(0, pos)
          ctx.lineTo(canvas.width, pos)
          ctx.stroke()
        }
      }
    },
    /**
     * 导出像素图
     */
    ExportPixelImage() {
      try {
        if (!this.filledCount) {
          throw new Error('画布为空，请先绘制')
        }
        ExportProjectPixelPng(
          this.project,
          this.exportScale,
          `pixel-art-${ResolvePixelExportStamp()}.png`,
        )
        this.SetStatus('已导出像素图 PNG')
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '导出失败',
          true,
        )
      }
    },
    /**
     * 导出拼豆图纸
     */
    ExportBeadImage() {
      try {
        ExportProjectBeadPng(this.project, {
          beadSize: 40,
          backgroundColor: '#f7f4ef',
          showGrid: true,
          showColorCode: true,
          fileName: `pixel-拼豆图纸-${ResolvePixelExportStamp()}.png`,
        })
        this.SetStatus('已导出拼豆图纸 PNG')
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '导出失败',
          true,
        )
      }
    },
    /**
     * 将当前画面无损导入拼豆生成器
     */
    SendToGenerator() {
      try {
        const grid = FlattenProjectToGrid(this.project)
        if (!CountFilledPixels(grid)) {
          throw new Error('画布为空，请先绘制')
        }
        this.$store.commit(
          'SETIMPORTEDPIXELGRID',
          CloneColoredPixelGrid(grid),
        )
        void router.push('/generator')
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '发送失败',
          true,
        )
      }
    },
    /**
     * 设置状态文案
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
.pixel-page {
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
  grid-template-columns: minmax(280px, 340px) 1fr;
  gap: 18px;
  align-items: start;
}

.panel,
.canvas-panel {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.tools-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: calc(100vh - 180px);
  overflow: auto;
}

.section h2,
.canvas-toolbar h2 {
  margin: 0 0 10px;
  font-size: 0.98rem;
  color: #1d2a44;
}

.tool-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tool-btn,
.ghost,
.primary,
.ghost-sm {
  font: inherit;
  cursor: pointer;
}

.tool-btn {
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(49, 65, 95, 0.2);
  background: #fff;
  color: #31415f;
}

.tool-btn.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #31415f;
  font-size: 0.88rem;
  margin-top: 10px;
}

.field select,
.color-text {
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  background: #fff;
}

.color-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-row input[type='color'] {
  width: 44px;
  height: 40px;
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  background: #fff;
  padding: 0;
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-top: 10px;
  max-height: 180px;
  overflow: auto;
}

.swatch {
  position: relative;
  aspect-ratio: 1;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
}

.swatch span {
  position: absolute;
  left: 2px;
  bottom: 2px;
  font-size: 0.58rem;
  color: #1d2a44;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 3px;
  padding: 0 2px;
}

.swatch.active {
  outline: 2px solid #31486f;
  outline-offset: 1px;
}

.size-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  color: #31415f;
  font-size: 0.9rem;
}

.layer-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(49, 65, 95, 0.14);
  background: #fff;
  cursor: pointer;
}

.layer-item.active {
  border-color: #31486f;
  background: rgba(49, 72, 111, 0.08);
}

.layer-name {
  flex: 1;
  color: #31415f;
  font-size: 0.88rem;
}

.layer-actions,
.action-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.ghost,
.primary {
  border-radius: 999px;
  padding: 10px 14px;
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

.ghost-sm {
  border: none;
  background: transparent;
  color: #6a7a96;
  font-size: 0.8rem;
  padding: 0;
}

.ghost-sm:disabled {
  opacity: 0.4;
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

.meta {
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: #6a7a96;
}

.canvas-panel {
  padding: 16px;
  min-height: 520px;
}

.canvas-toolbar p {
  margin: 0 0 12px;
  color: #6a7a96;
  font-size: 0.88rem;
}

.canvas-stage {
  overflow: auto;
  max-height: calc(100vh - 240px);
  border-radius: 14px;
  border: 1px solid rgba(49, 65, 95, 0.12);
  background: #edf1f7;
  padding: 16px;
  touch-action: none;
}

.board {
  display: block;
  image-rendering: pixelated;
  cursor: crosshair;
  box-shadow: 0 8px 24px rgba(29, 42, 68, 0.12);
  background: #fff;
}

@media (max-width: 900px) {.workspace { grid-template-columns: 1fr; } .tools-panel { max-height: none; }}
</style>
