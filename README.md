# Fuse Beads · 拼豆豆图纸生成器

基于 **Vue 3 + Vite** 的拼豆像素图纸工具。页面组件使用 **Options API**（Vue2 风格生命周期）实现。

## 功能

- 文字输入 → 离屏 Canvas 采样 → 像素拼豆图案
- 方格像素图纸样式（贴合常见拼豆图纸，非圆形珠）
- MARD 291 色卡选择珠子颜色与描边颜色，格子内显示色号
- 整块图案外轮廓描边豆（按豆数扩宽，可实际拼接）
- Canvas 实时预览（网格尺寸 / 主体·描边·合计珠数）
- 导出 PNG 图纸
- 可调：采样字号、像素阈值、格子尺寸/颜色、背景色、辅助网格

## 技术栈

- Vue 3（Options API：`created` / `mounted` / `beforeUnmount` / `watch`）
- Vue Router 4（按目录自动聚合路由）
- Vuex 4 + vuex-persistedstate（sessionStorage 持久化）
- Vite 5 + TypeScript
- Canvas 2D 绘制

## 快速开始

```bash
npm install --registry https://registry.npmjs.org
npm run dev
```

### 多环境命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发环境本地启动（`.env.dev`） |
| `npm run test` | 测试环境本地启动（`.env.test`） |
| `npm run prod` | 生产环境本地启动（`.env.prod`） |
| `npm run build-dev` | 开发环境打包 |
| `npm run build-test` | 测试环境打包 |
| `npm run build` / `npm run build-prod` | 生产环境打包 |
| `npm run preview` | 预览构建产物 |

环境变量文件：`.env.dev` / `.env.test` / `.env.prod`  
主要字段：`VITE_ENV`、`VITE_API_BASE_URL`、`VITE_APP_TITLE`、`VITE_BASE_ROUTE`

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 图纸生成器 |
| `/about` | 关于页 |

## 项目结构

```
public/
  index.html              # HTML 模板（vite-plugin-html）
  favicon.ico
.env.dev / .env.test / .env.prod
src/
  App.vue                 # 根组件（router-view）
  main.ts                 # 注册 router / store
  router/
    index.ts              # 路由实例与前置守卫
    routes.ts             # 自动聚合各业务路由
    generator/index.ts
    about/index.ts
  store/
    index.ts              # Vuex 入口 + 持久化
    state.ts / getters.ts / mutations.ts / actions.ts
    modules/generator.ts  # 图纸参数状态
  views/
    generator/index.vue   # 生成器页
    about/index.vue       # 关于页
  components/
    ControlPanel.vue
    BeadCanvas.vue
  utils/
    Env.ts                # 环境变量读取
    TextToPixels.ts
    DrawBeadPattern.ts
    MardColors.ts          # MARD 291 色卡
  styles/main.css
```

## 会话总结

### 2026-07-22（方格像素图纸）

- **会话目的**：按参考拼豆图纸，将圆形珠改为方格像素格样式。
- **完成任务**：
  - 绘制改为无间隙方格填充，去掉圆形与高光
  - 叠加每格细线 / 每 10 格加粗的坐标网格
  - 格子足够大时自动绘制 MARD 色号
  - 默认格子尺寸调整为 22px，便于看清色号
- **关键决策**：
  - 视觉对齐常见拼豆图纸：方格、色号、计数网格
  - 空位保留背景色方格，保证整张图为完整像素网格
- **修改文件**：
  - 更新 `src/utils/DrawBeadPattern.ts`、`src/components/BeadCanvas.vue`
  - 更新 `src/components/ControlPanel.vue`、`src/store/modules/generator.ts`
  - 更新 `src/views/about/index.vue`、`README.md`

### 2026-07-22（外轮廓描边豆）

- **会话目的**：按用户反馈，描边改为整块文字/图案外围的可拼豆子，而非单颗珠线框。
- **完成任务**：
  - 新增 `BuildOutlinedPattern`：按切比雪夫距离外扩生成描边豆层
  - 绘制层用描边色填充 outline 格子，主体用珠子色
  - 预览统计区分主体 / 描边 / 合计豆数
  - 控件文案改为「描边宽度 N 豆」
- **关键决策**：
  - 描边宽度单位为豆数（1–5），默认 1 圈
  - 关闭描边时仅绘制主体文字豆
- **修改文件**：
  - 更新 `src/utils/TextToPixels.ts`、`src/utils/DrawBeadPattern.ts`
  - 更新 `src/components/BeadCanvas.vue`、`src/components/ControlPanel.vue`
  - 更新 `src/store/modules/generator.ts`、`src/views/about/index.vue`、`README.md`

### 2026-07-22（MARD 色卡 + 描边修复）

- **会话目的**：珠子/描边颜色改为 MARD 色卡选择，并修复描边看不见的问题。
- **完成任务**：
  - 新增 MARD 291 色卡数据与系列筛选工具
  - 控制面板用色块选择器替换自由取色（珠子色、描边色）
  - 绘制改为「先填充、后描边」两遍流程，描边内缩半线宽避免被相邻珠子覆盖
  - 默认珠子色改为 MARD C8，描边色改为 MARD H7
- **关键决策**：
  - 背景色仍保留自由取色（图纸底色不必受色卡限制）
  - 描边最小线宽保证 ≥1px，粗细范围调整为 1–5px
- **修改文件**：
  - 新增 `src/utils/MardColors.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/utils/DrawBeadPattern.ts`
  - 更新 `src/store/modules/generator.ts`、`src/views/about/index.vue`、`README.md`

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

### 2026-07-22（store / router）

- **会话目的**：参考 `ilot-h5-ussd-game-rush` 配置，为当前项目接入 store 与 router。
- **完成任务**：
  - 引入 Vue Router 4、Vuex 4、vuex-persistedstate
  - 按参考项目结构拆分 `src/router`、`src/store`、`src/views`
  - Vite / tsconfig 增加 `@` 路径别名
  - 生成器参数迁移到 `store/modules/generator`
- **关键决策**：
  - 路由用 `import.meta.glob` 自动聚合业务目录配置
  - Store 沿用 root + modules + sessionStorage 持久化模式
  - 页面继续使用 Options API，通过 `mapGetters` / `mapMutations` 连接 Vuex
- **修改文件**：
  - 更新 `package.json`、`vite.config.ts`、`tsconfig.json`、`tsconfig.node.json`、`src/main.ts`、`src/App.vue`、`README.md`
  - 新增 `src/router/**`、`src/store/**`、`src/views/generator/index.vue`、`src/views/about/index.vue`

### 2026-07-22（多环境 + public）

- **会话目的**：参考 ilot 增加开发/测试/生产环境配置，并补齐 `public` 静态资源目录。
- **完成任务**：
  - 新增 `.env.dev` / `.env.test` / `.env.prod`
  - 新增 `public/index.html`、`public/favicon.ico`
  - `vite.config.ts` 接入 `loadEnv`、`base`、`define process.env`、`vite-plugin-html`
  - `package.json` 增加多环境启停与打包脚本
  - 新增 `src/utils/Env.ts` 统一读取环境变量
- **关键决策**：
  - 模式命名与 ilot 对齐：`dev` / `test` / `prod`
  - HTML 模板放到 `public/index.html`，由 `vite-plugin-html` 注入入口
  - 生产构建开启 `drop_console`
- **修改文件**：
  - 新增 `.env.dev`、`.env.test`、`.env.prod`、`public/**`、`src/utils/Env.ts`
  - 更新 `vite.config.ts`、`package.json`、`index.html`、`src/router/index.ts`、`src/App.vue`、`src/vite-env.d.ts`、`README.md`

### 2026-07-22（Cloudflare 白屏修复）

- **会话目的**：排查 https://fuse-beads.pages.dev/ 发布后白屏问题。
- **完成任务**：
  - 定位到生产 `VITE_BASE_ROUTE=/fuse-beads` 导致 JS/CSS 请求错误路径
  - 将 `.env.prod` / `.env.test` 的 `VITE_BASE_ROUTE` 改为 `/`
  - 新增 `public/_redirects`，支持 Vue Router history 回退
- **关键决策**：
  - Cloudflare Pages 挂在域名根路径时，`base` 必须为 `/`
- **修改文件**：
  - 更新 `.env.prod`、`.env.test`、`README.md`
  - 新增 `public/_redirects`
