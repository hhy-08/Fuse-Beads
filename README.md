# Fuse Beads · 拼豆豆图纸生成器

基于 **Vue 3 + Vite** 的拼豆像素图纸工具。页面组件使用 **Options API**（Vue2 风格生命周期）实现。

## 功能

- 文字输入 → 离屏 Canvas 采样 → 像素拼豆图案
- 描边开关、自定义描边颜色、描边粗细
- Canvas 实时预览（网格尺寸 / 珠子数量）
- 导出 PNG 图纸
- 可调：采样字号、像素阈值、珠子尺寸/颜色、背景色、辅助网格

## 技术栈

- Vue 3（Options API：`created` / `mounted` / `beforeUnmount` / `watch`）
- Vite 5 + TypeScript
- Canvas 2D 绘制

## 快速开始

```bash
npm install --registry https://registry.npmmirror.com
npm run dev
```

构建：

```bash
npm run build
npm run preview
```

## 项目结构

```
src/
  App.vue                 # 根页面状态与布局
  components/
    ControlPanel.vue      # 参数控制面板
    BeadCanvas.vue        # Canvas 预览与导出
  utils/
    TextToPixels.ts       # 文字转像素网格
    DrawBeadPattern.ts    # 拼豆绘制与 PNG 导出
  styles/main.css         # 全局样式
```

## 会话总结

### 2026-07-22

- **会话目的**：在空仓库创建 Vue3 + Vite 拼豆豆图纸生成器；页面用 Options API 生命周期实现。
- **完成任务**：
  - 搭建 Vue3 + Vite + TS 工程
  - 实现文字渲染像素图案、描边开关/颜色/粗细、Canvas 预览与 PNG 导出
  - 组件统一使用 Options API（`created`、`mounted`、`beforeUnmount`、`watch`）
- **关键决策**：
  - 技术栈保持 Vue3 + Vite；交互层不用 Composition API，改用 Options API 生命周期
  - 文字经离屏 Canvas 采样后裁剪空白，再绘制为圆形拼豆
  - 预览重绘使用短防抖，保证输入流畅
- **修改文件**：
  - 新增 `package.json`、`vite.config.ts`、`tsconfig*.json`、`index.html`
  - 新增 `src/main.ts`、`src/App.vue`、`src/vite-env.d.ts`、`src/styles/main.css`
  - 新增 `src/components/ControlPanel.vue`、`src/components/BeadCanvas.vue`
  - 新增 `src/utils/TextToPixels.ts`、`src/utils/DrawBeadPattern.ts`
  - 新增 `README.md`
