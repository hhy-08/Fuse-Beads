# Fuse Kit · Fuse 工具箱

基于 **Vue 3 + Vite** 的本地实用小工具集合（Options API）。提供拼豆图纸、AI 抠图、图片处理、JSON / PDF、文本对比、单位换算等能力。

## 功能

- 工具列表首页：按「拼豆配套 / 图片类 / 文本办公 / 趣味生活」分类展示入口
- 文字或图片 → 像素拼豆图案（图片自动匹配 MARD 色卡）
- 可选字体采样（黑体 / 宋体 / 站酷 / 毛笔 / 像素等）
- 可调字间距（可负值叠连），支持逐字颜色、字号、加粗/倾斜/下划线/删除线、垂直对齐（顶/中/底）
- 方格像素图纸样式（贴合常见拼豆图纸，非圆形珠）
- MARD 291 色卡选择珠子颜色与描边颜色，格子内显示色号
- 整块图案外轮廓描边豆（按豆数扩宽，可实际拼接）
- Canvas 实时预览（可缩放）与 PNG 导出，生成后统计各色号用量与占比
- 可调：模式、采样字体、图片宽高、透明抠图、格子尺寸、背景色、辅助网格
- 像素画布：手绘 / 橡皮 / 取色 / 填充 / 图层 / 网格，导出像素图或拼豆图纸，可无损发送到拼豆生成器
- 像素图缩放：最近邻插值放大，整数倍或指定尺寸，可导出 PNG 并送入拼豆工具
- 配色模拟：多色号实时预览搭配，本地保存配色方案
- 图纸尺寸计算：按宽高估算拼豆板规格与豆子总数，上传图纸统计各色用量
- 二维码生成：文字/链接、前景/背景色、中心图标、纠错等级、PNG / JPEG / WebP 导出
- 图片转 ICO：多尺寸图标（16~256），完整放入 / 铺满裁切 / 拉伸，本地下载或 ZIP
- 图片 ↔ Base64：本地互转；提示体积约 +33%，超大图警告并限制（默认 ≤5MB）
- 文本对比：双栏粘贴或上传 txt / json / vue 等，行级 + 字符级差异高亮
- JSON 格式化：校验 / 美化 / 压缩；支持 stringify 转义字符串；树形展开收起；解析失败可「AI 修复」（本地智能纠错）
- 拾色器：屏幕取色，HEX / RGB / HSL / 透明度互转，自定义调色板本地保存
- 时间戳转换：秒 / 毫秒与多时区本地时间互转（含非洲多国），支持批量转换与复制记录
- 世界时钟：实时查看各国当前时间（模拟表盘 + 上午/下午等时段），支持大洲筛选、搜索与收藏
- AI 智能抠图：默认轻量 u2netp（~5MB）；海报/高清/人像等大模型选中后按需下载并缓存，导出透明 PNG

## 技术栈

- Vue 3（Options API：`created` / `mounted` / `beforeUnmount` / `watch`）
- Vue Router 4（按目录自动聚合路由）
- Vuex 4 + vuex-persistedstate（sessionStorage 持久化）
- Vite 5 + TypeScript
- Canvas 2D 绘制
- `@bunnio/rembg-web` + `onnxruntime-web`（浏览器端 AI 抠图）

## 快速开始

```bash
npm install --registry https://registry.npmjs.org
npm run sync-matting:light    # 可选：预置轻量模型到 public/models（~5MB）
# 大模型也可不预置：页面选中后自动下载到浏览器 IndexedDB
npm run sync-matting:poster   # 可选：预置轻量 + 海报模型
npm run sync-matting          # 可选：同步全部抠图模型
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
主要字段：`VITE_ENV`、`VITE_API_BASE_URL`、`VITE_APP_TITLE`（默认 Fuse 工具箱）、`VITE_BASE_ROUTE`

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 工具列表（默认首页） |
| `/generator` | 拼豆图纸生成器 |
| `/image-compress` | 图片压缩工具 |
| `/image-matting` | AI 智能抠图（本地去背景） |
| `/watermark` | 图片水印工具 |
| `/image-converter` | 图片格式转换 |
| `/image-base64` | 图片 ↔ Base64 |
| `/unit-converter` | 单位转换 |
| `/color-picker` | 拾色器（色值转换） |
| `/timestamp-converter` | 时间戳转换 |
| `/world-clock` | 世界时钟（各国时间） |
| `/file-converter` | 文件转换（纯前端） |
| `/pdf-tools` | PDF 工具站（卡片入口） |
| `/pdf-tools/:toolId` | 单个 PDF 工具工作区 |
| `/json-formatter` | JSON 格式化 / 校验 |
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
    tools/index.ts
    generator/index.ts
    imageCompress/index.ts
    watermark/index.ts
    imageConverter/index.ts
    unitConverter/index.ts
    fileConverter/index.ts
    pdfTools/index.ts
    about/index.ts
  store/
    index.ts              # Vuex 入口 + 持久化
    state.ts / getters.ts / mutations.ts / actions.ts
    modules/generator.ts  # 图纸参数状态
  views/
    tools/index.vue       # 工具列表首页
    generator/index.vue   # 拼豆生成器页
    imageCompress/index.vue # 图片压缩页
    watermark/            # 图片水印工具
    imageConverter/index.vue # 图片格式转换
    unitConverter/index.vue  # 单位转换
    fileConverter/index.vue  # 文件转换
    pdfTools/             # PDF 工具站（卡片 + 工具页）
    about/index.vue       # 关于页
  components/
    ControlPanel.vue
    BeadCanvas.vue
  utils/
    Env.ts                # 环境变量读取
    Brand.ts              # 品牌名 / 产品名常量
    ToolList.ts           # 首页工具列表配置
    pdfTools/             # PDF 工具站配置与 API 客户端
    ImageCompress.ts      # 图片压缩（质量/缩放/GIF）
    ImageConverter.ts     # 图片格式转换
    UnitConverter.ts      # 单位换算
    FileConverter.ts      # 文件转换（PDF/DOCX/XLSX 等）
    TextToPixels.ts
    DrawBeadPattern.ts
    MardColors.ts          # MARD 291 色卡
    FontOptions.ts         # 可选采样字体
  styles/main.css
server/                   # Cloudflare Workers + Containers（PDF API）
  wrangler.toml
  src/                    # Worker 入口与 pdf-lib 处理
  container/              # LibreOffice / qpdf Dockerfile
```

## PDF 后端（Cloudflare）

前端 Pages 与后端 Worker 分离部署：

1. **无 Docker（推荐当前）**：`npm run server:install && npm run server:deploy`  
   → 合并 / 拆分 / 旋转 / 水印 / 图片转 PDF  
2. 将返回的 `*.workers.dev` 写入 Pages 环境变量 `VITE_API_BASE_URL`，并重新部署前端  
3. 以后有 Docker 再跑 `npm run server:deploy:full` 开启 Word↔PDF / 加密  

详见 `server/README.md`。

### 在 dash.cloudflare 上怎么部署

项目拆成两个 Cloudflare 产品：

| 部分 | 产品 | 地址示例 |
|------|------|----------|
| 前端 Vue | **Pages** | `https://fuse-beads.pages.dev` |
| PDF API | **Workers + Containers** | `https://fuse-pdf-api.<账号>.workers.dev` |

#### 一、前置条件

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) 并登录  
2. 本机安装：**Node.js**、**Docker Desktop**（Containers 构建镜像必须开着）  
3. 终端登录 Wrangler：

```bash
cd server
npx wrangler login
```

浏览器授权后，CLI 才能往你的账号推 Worker / 镜像。

#### 二、部署后端 API（Worker-only，无需 Docker）

在本机终端（项目 `server/` 目录）：

```bash
cd /path/to/Fuse-Beads/server
npm install --legacy-peer-deps
npx wrangler login
npm run deploy
```

成功后终端会打印形如：

`https://fuse-pdf-api.<your-subdomain>.workers.dev`

到 Dashboard 核对：

1. **Workers & Pages** → 找到 `fuse-pdf-api`（与 Pages 的 `fuse-beads` 并列）  
2. 浏览器访问：`https://fuse-pdf-api.<subdomain>.workers.dev/api/health`  
   应返回 `ok: true`，`mode: "worker-only"`

以后若安装了 Docker，再执行 `npm run deploy:full` 开启 Word↔PDF / 加密。

说明：Worker-only **不需要** Docker；完整版 Containers 才需要。

#### 三、部署 / 更新前端（Pages）

**方式 A：Dashboard 连 Git（推荐，已有项目可跳过创建）**

1. **Workers & Pages** → **Create** → **Pages** → Connect to Git  
2. 选中本仓库；构建设置示例：  
   - Build command：`npm run build`  
   - Build output directory：`dist`  
   - Root directory：仓库根目录（不是 `server/`）  
3. **Settings → Environment variables**（Production）增加：  
   - `VITE_API_BASE_URL` = `https://fuse-pdf-api.<subdomain>.workers.dev`  
   - `VITE_ENV` = `prod`  
   - `VITE_APP_TITLE` = `Fuse 工具箱`  
   - `VITE_BASE_ROUTE` = `/`  
4. 保存后 **Retry deployment** / 推送代码触发重新构建  

**方式 B：本地构建后上传**

```bash
# 先改 .env.prod 里的 VITE_API_BASE_URL 为真实 API 地址
npm run build
npx wrangler pages deploy dist --project-name=fuse-beads
```

#### 四、前后端连通检查

1. 打开 Pages 站点 → 进入 **PDF 工具站**  
2. 顶部应显示「后端已连接」  
3. 先测 **合并 PDF**（纯 Worker）；再测 **Word 转 PDF**（会起 Container）

若提示跨域失败：到 Worker 的 `ALLOWED_ORIGINS` 补上实际前端域名（含自定义域），改完再 `npm run deploy` 或在 Dashboard Variables 里改后重新部署 Worker。

#### 五、Dashboard 里日常能改什么

- Pages：环境变量、自定义域、每次部署日志  
- Worker：`ALLOWED_ORIGINS` / `MAX_UPLOAD_BYTES`、请求日志、Containers 实例概况  
- 改 Dockerfile / Worker 代码后仍需本地 `npm run deploy`（镜像要重新 build）

## 会话总结

### 2026-07-24（ToolPageHero 顶部栏不固定）

- **会话目的**：顶部 Hero 随页面滚动，不做吸顶/视口锁定。
- **完成任务**：
  - `ToolPageHero` 明确 `position: static`，禁止 fixed/sticky
  - 工具列表、JSON 格式化去掉 `100vh + overflow:hidden` 布局，改为整页滚动
- **关键决策**：页面级滚动优先，避免「仅主内容区滚动导致顶部看似固定」
- **修改文件**：
  - 更新 `src/components/ToolPageHero.vue`、`src/views/tools/index.vue`、`src/views/jsonFormatter/index.vue`、`README.md`

### 2026-07-24（抽取 ToolPageHero 公用组件）

- **会话目的**：将各工具页重复的顶部 hero 抽成公用组件，统一品牌区与导航。
- **完成任务**：
  - 新增 `ToolPageHero`（`title` / `subtitle` / 可选 `links`，内置 `APPBRAND`）
  - 23 个含 `class="hero"` 的工具页改为引用该组件，并清理重复 hero 样式与 `appBrand`
  - 保留各页原有自定义导航（如世界时钟、像素缩放、图纸计算等）
  - `about` 页结构不同，未纳入
  - 本地 `vue-tsc -b` 通过
- **关键决策**：
  - 默认导航为「工具列表 + 关于」；特殊页通过 `links` prop 显式传入
  - 样式以拾色器页 hero 为准，集中维护
- **修改文件**：
  - 新增 `src/components/ToolPageHero.vue`
  - 更新 `src/views/**/index.vue`（除 about）、`README.md`

### 2026-07-24（修复加水印交接丢图）

- **会话目的**：修复 Markdown 卡片点「加水印」跳转后图片未载入。
- **完成任务**：交接改为 `window` + `sessionStorage` 双通道；优化 dataURL→File；水印页显示载入状态。
- **关键决策**：Vite 懒加载分包可能导致模块内变量不共享，不能只用闭包内存。
- **修改文件**：更新 `src/utils/WatermarkHandoff.ts`、`src/views/watermark/index.vue`、`src/views/markdownCard/index.vue`、`README.md`

### 2026-07-24（Markdown 卡片联动加水印）

- **会话目的**：Markdown 卡片与加水印工具打通，生成图可一键送入加水印。
- **完成任务**：
  - 卡片页增加「加水印」按钮：导出当前卡片 → 内存交接 → 跳转 `/watermark`
  - 水印页 `mounted` 消费交接数据并自动加入列表预览
- **关键决策**：用 `WatermarkHandoff` 内存传递 dataURL，避免 sessionStorage 体积限制（SPA 内跳转有效）
- **修改文件**：
  - 新增 `src/utils/WatermarkHandoff.ts`
  - 更新 `src/views/markdownCard/index.vue`、`src/views/watermark/index.vue`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-24（Markdown 卡片拖拽上传强化）

- **会话目的**：强化拖拽上传体验，使投放区更明显。
- **完成任务**：编辑区外包 `drop-zone`；拖入显示遮罩提示；用 dragDepth 避免闪烁；文案提示支持拖拽。
- **关键决策**：整块输入区作为投放目标，比仅绑 textarea 更稳、更易发现。
- **修改文件**：更新 `src/views/markdownCard/index.vue`、`README.md`

### 2026-07-24（Markdown 卡片工具栏布局）

- **会话目的**：修正「Markdown 输入」标题与操作按钮挤在同一行导致换行难看的问题。
- **完成任务**：标题与文件名单独一行，下方操作按钮等分横排且不换行。
- **关键决策**：`pane-head` 改为纵向布局，按钮 `flex: 1` 均分宽度。
- **修改文件**：更新 `src/views/markdownCard/index.vue`、`README.md`

### 2026-07-24（Markdown 卡片支持上传 MD）

- **会话目的**：完善 Markdown 卡片页，支持上传本地 Markdown 文件。
- **完成任务**：
  - 增加「上传 MD」按钮，接受 `.md` / `.markdown` / `.mdown` / `.mkd` / `.txt`
  - 支持拖放到编辑区；显示已加载文件名；限制 2MB；去除 UTF-8 BOM
- **关键决策**：校验与读取逻辑放在 `MarkdownCard.ts`，与粘贴 / 示例共用 `ApplyMarkdownText`
- **修改文件**：
  - 更新 `src/utils/MarkdownCard.ts`、`src/views/markdownCard/index.vue`、`README.md`

### 2026-07-24（Markdown 卡片生成）

- **会话目的**：新增「Markdown 卡片生成」工具，粘贴 Markdown 渲染精美卡片并导出图片，便于社交分享。
- **完成任务**：
  - 基于 `marked` + `DOMPurify` 渲染安全 HTML；`html2canvas` 导出 PNG / JPEG
  - 提供墨纸 / 夜码 / 海雾 / 松青四套主题，可调宽度、清晰度与页脚水印
  - 注册路由 `/markdown-card`，加入「文本 / 日常办公」分类
- **关键决策**：
  - 主题配色对齐 Fuse Kit 蓝系与青绿，避免默认紫白渐变；大图导出默认 2x
  - 依赖直装 `marked` / `dompurify` / `html2canvas`（后者此前为 jspdf 传递依赖）
- **修改文件**：
  - 新增 `src/utils/MarkdownCard.ts`、`src/views/markdownCard/index.vue`、`src/router/markdownCard/index.ts`
  - 更新 `src/utils/ToolList.ts`、`src/utils/Brand.ts`、`package.json`、`README.md`

### 2026-07-24（Cloudflare Pages 单文件 25MiB 限制）

- **会话目的**：修复 Pages 部署校验失败：`ort-wasm-simd-threaded.jsep.wasm` 约 25.6MiB 超限。
- **完成任务**：
  - ORT 从默认 JSEP（~26MiB）改为经典 `onnxruntime-web/wasm` + `ort-wasm-simd-threaded.wasm`（~12.9MiB）
  - Vite alias 强制 `@bunnio/rembg-web` 也走 wasm 入口，避免再次打进 jsep
  - 生产 `build*` 改为 `--light` 仅预置 u2netp；新增 `build:full-models` 供本地全量预热
  - 新增 `StripOversizedAssetsPlugin`：构建后剔除 dist 内 >25MiB 文件（本地残留大模型不会误上传）
- **关键决策**：大模型继续运行时按需下载；Pages 出包只保留轻量资源
- **修改文件**：
  - 更新 `src/utils/ImageMatting.ts`、`vite.config.ts`、`package.json`、`scripts/FetchMattingModels.mjs`
  - 新增 `scripts/StripOversizedAssetsPlugin.mjs`、更新 `README.md`

### 2026-07-24（Cloudflare Pages 构建 TS 报错修复）

- **会话目的**：修复 Cloudflare Pages `npm run build` 中 `vue-tsc` 失败导致的部署中断。
- **完成任务**：
  - 修复 `ColorPicker` 中 `EyeDropper` 类型断言（经 `unknown` 中转，消除 TS2352）
  - 补全并导出 `TimestampConvertItem`、`TimestampHistoryRecord`，消除时间戳工具相关 TS2304 / TS2305 / TS7006
  - 本地 `vue-tsc -b` 通过
- **关键决策**：
  - EyeDropper 非标准 DOM 类型用 `as unknown as`，避免直接交叉断言与 `Window` 不重叠
  - 转换结果 / 历史记录类型与页面用法对齐（`ts-to-time` | `time-to-ts`）
- **修改文件**：
  - 更新 `src/utils/ColorPicker.ts`、`src/utils/TimestampConverter.ts`、`README.md`

### 2026-07-24（图片 ↔ Base64 互转）

- **会话目的**：新增图片与 Base64 / Data URL 本地互转工具，并对超大图做提示与限制。
- **完成任务**：
  - 支持图片 → Base64（可选 Data URL 前缀）与 Base64 → 图片预览/下载
  - 常驻提示：超大图不建议转 Base64、体积约 +33%、超长字符串易卡顿/复制崩溃
  - 超过 1MB 警告，超过 5MB 拒绝转换；解码侧同步限制文本长度
  - 注册路由 `/image-base64`，加入「图片类工具」
- **关键决策**：
  - 硬上限 5MB，避免超长字符串拖垮页面；压缩入口链到图片压缩工具
- **修改文件**：
  - 新增 `src/utils/ImageBase64.ts`、`src/views/imageBase64/index.vue`、`src/router/imageBase64/index.ts`
  - 更新 `src/utils/ToolList.ts`、`src/utils/Brand.ts`、`README.md`

### 2026-07-24（世界时钟各国时间）

- **会话目的**：新增各国当前时间展示工具。
- **完成任务**：
  - 复用时区列表，秒级刷新展示日期 / 时间 / 星期 / 偏移
  - 支持大洲筛选、搜索、收藏与复制；昼夜卡片样式区分
  - 注册路由 `/world-clock`，加入「趣味生活」分类
- **修改文件**：
  - 新增 `src/utils/WorldClock.ts`、`src/views/worldClock/index.vue`、`src/router/worldClock/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-24（世界时钟模拟表盘与时段）

- **会话目的**：在世界时钟基础上增加钟表样式，并标明上午/下午等时段。
- **完成任务**：
  - 每张卡片增加模拟表盘（时/分/秒针随当地时间转动）
  - 展示中文时段（凌晨/清晨/上午/中午/下午/傍晚/晚上）与上午/下午标签
  - 同步显示 24 小时制与 12 小时制数字时间，昼夜样式区分
- **关键决策**：
  - 时段与指针角度在 `WorldClock.ts` 统一计算，卡片抽成 `WorldClockCard.vue` 避免重复模板
- **修改文件**：
  - 更新 `src/utils/WorldClock.ts`、`src/views/worldClock/index.vue`、`README.md`
  - 新增 `src/views/worldClock/WorldClockCard.vue`

### 2026-07-24（时间戳时区扩充非洲等）

- **会话目的**：扩充时间戳转换可选国家，重点补齐非洲时区。
- **完成任务**：新增尼日利亚、加纳、肯尼亚等非洲多国，并按时区大洲分组下拉。
- **修改文件**：`src/utils/TimestampConverter.ts`、`src/views/timestampConverter/index.vue`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-24（时间戳转换工具）

- **会话目的**：新增时间戳转换工具，支持多时区与批量转换。
- **完成任务**：
  - 秒 / 毫秒 ↔ 日期时间互转，默认北京时间，可选日韩欧美等时区
  - 支持批量转换、转换记录与一键复制
  - 注册路由 `/timestamp-converter`，加入「趣味生活」分类
- **关键决策**：用 `Intl` + 墙钟校正实现时区解析，避免额外时区库依赖。
- **修改文件**：
  - 新增 `src/utils/TimestampConverter.ts`、`src/views/timestampConverter/index.vue`、`src/router/timestampConverter/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-24（拾色器取消工作区全屏）

- **会话目的**：拾色器工作区改为普通页面布局，不再铺满视口。
- **修改文件**：`src/views/colorPicker/index.vue`、`README.md`

### 2026-07-24（拾色器透明度）

- **会话目的**：拾色器支持透明度设置与展示。
- **完成任务**：支持 Alpha 0~100%、`#RRGGBBAA` / `rgba` / `hsla`；预览与调色板使用棋盘格显示半透明。
- **修改文件**：`src/utils/ColorPicker.ts`、`src/views/colorPicker/index.vue`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-24（拾色器色值转换）

- **会话目的**：新增多功能拾色器工具。
- **完成任务**：
  - 实现 HEX / RGB / HSL 互转、原生调色、HSL 滑块
  - 支持 EyeDropper 屏幕取色；自定义调色板本地保存（最多 24 色）
  - 注册路由 `/color-picker`，加入「趣味生活」分类
- **关键决策**：取色依赖浏览器 EyeDropper；不支持时仍可手动输入与调色板选色。
- **修改文件**：
  - 新增 `src/utils/ColorPicker.ts`、`src/views/colorPicker/index.vue`、`src/router/colorPicker/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-24（工具首页简介文案）

- **会话目的**：首页副标题文案对齐当前工具能力。
- **完成任务**：更新 `APPDESCRIPTION` 与办公分类描述，覆盖拼豆、AI 抠图、JSON / PDF 等。
- **修改文件**：`src/utils/Brand.ts`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-24（工具列表页铺满视口）

- **会话目的**：工具列表页与 JSON 页一致，默认铺满顶部下方剩余视口。
- **完成任务**：保留 hero；列表区全宽 + 内部滚动，占满剩余高度。
- **修改文件**：`src/views/tools/index.vue`、`README.md`

### 2026-07-24（JSON 工作区默认铺满）

- **会话目的**：去掉全屏按钮，工作区默认占满顶部下方剩余视口，保留 hero。
- **完成任务**：移除全屏切换逻辑；页面 `100vh` 分栏，编辑区自适应拉高。
- **修改文件**：`src/views/jsonFormatter/index.vue`、`README.md`

### 2026-07-24（JSON 工作区全屏）

- **会话目的**：JSON 格式化工作区支持全屏展示。
- **完成任务**：工具栏增加「全屏 / 退出全屏」；Esc 退出；全屏时编辑区拉高并隐藏说明卡片。
- **修改文件**：`src/views/jsonFormatter/index.vue`、`README.md`

### 2026-07-24（AI 修复按钮可点）

- **会话目的**：解析失败时确保「AI 修复」可点击、更醒目。
- **完成任务**：顶部工具栏与错误条均提供可点修复按钮；有输入即启用；增强截断 JSON 补全。
- **修改文件**：`src/views/jsonFormatter/index.vue`、`src/utils/JsonFormatter.ts`、`README.md`

### 2026-07-24（JSON AI 修复）

- **会话目的**：解析失败时增加类似 FeHelper 的「AI 修复」能力。
- **完成任务**：
  - 新增本地智能纠错：松散转义、尾逗号、单引号、未引号键名、注释、JS/Python 字面量、截取片段等
  - 解析结果区与错误状态栏增加「AI 修复」按钮，修复成功后写入输入并树形展示
- **关键决策**：不依赖云端模型，纯本地启发式修复，保持工具箱离线可用；按钮文案对齐常见「AI 修复」习惯。
- **修改文件**：`src/utils/JsonFormatter.ts`、`src/views/jsonFormatter/index.vue`、`README.md`

### 2026-07-24（JSON 页顶部样式对齐）

- **会话目的**：JSON 格式化页顶部 hero 与其它工具页保持一致。
- **完成任务**：改为深蓝渐变头图、大号品牌字、胶囊导航链接样式。
- **关键决策**：对齐 `textDiff` / `imageMatting` 的 hero 样式规范。
- **修改文件**：`src/views/jsonFormatter/index.vue`、`README.md`

### 2026-07-24（JSON 树形展开收起）

- **会话目的**：解析结果增加与参考图一致的折叠树形视图。
- **完成任务**：
  - 新增递归 `JsonTreeNode`：三角展开/收起、折叠摘要 `{...} // N items`、语法高亮、行选中高亮
  - 右侧支持「树形 / 文本」切换，以及全部展开 / 全部收起
  - 主操作改为「解析 / 美化」，默认进入树形浏览
- **关键决策**：折叠状态用路径 map 管理，便于全局展开收起；复制/下载仍使用美化后的纯文本。
- **修改文件**：
  - 新增 `src/views/jsonFormatter/components/JsonTreeNode.vue`
  - 更新 `src/utils/JsonFormatter.ts`、`src/views/jsonFormatter/index.vue`、`README.md`

### 2026-07-24（JSON 格式化工具）

- **会话目的**：新增 JSON 格式化校验与美化工具，兼容普通 JSON 与后端 stringify 字符串。
- **完成任务**：
  - 实现解析 / 校验 / 美化 / 压缩 / 转义字符串，支持多层 `JSON.stringify` 自动解包
  - 新增工具页：双栏输入输出、缩进切换、粘贴/复制/上传/下载
  - 注册路由 `/json-formatter`，并加入首页「文本办公」分类
- **关键决策**：
  - 先 `JSON.parse`，若结果仍是 JSON 形态字符串则继续解包（上限 8 层）
  - 逻辑集中在 `JsonFormatter.ts`，页面保持 Options API 与现有工具页风格一致
- **修改文件**：
  - 新增 `src/utils/JsonFormatter.ts`、`src/views/jsonFormatter/index.vue`、`src/router/jsonFormatter/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-24（通用高清下载失败 / CORS）

- **会话目的**：修复「通用高清」每次下载失败。
- **完成任务**：
  - 根因：浏览器直连 GitHub 无 CORS、huggingface.co 国内常不可达；本地也缺 `isnet-general-use.onnx`
  - 镜像改为优先 `hf-mirror.com`（带 CORS）
  - 增加同源 `/matting-proxy`（Vite 中间件 + Pages Function）服务端拉取
  - 预置 `public/models/isnet-general-use.onnx`
- **关键决策**：大模型在浏览器侧必须同源或 CORS 友好 CDN，不能指望 GitHub Releases。
- **修改文件**：`ImageMatting.ts`、`vite.config.ts`、`scripts/MattingProxyPlugin.mjs`、`functions/matting-proxy.ts`、`FetchMattingModels.mjs`、`imageMatting/index.vue`、`README.md`

### 2026-07-23（修正自研后处理 + 大模型镜像）

- **会话目的**：按根因修复抠图发虚/镂空，并改善通用高清等大模型下载。
- **完成任务**：
  - 只用主输出（不再 max 融合侧输出）；概率 mask 不做 min-max/百分位拉伸
  - float 双线性采样合成 alpha，两端温和裁剪，去掉过度 gamma/锐化
  - 大模型镜像改为 HF（tomjackson2023 / SacredNoir 等），下载加停滞超时与无 Content-Length 进度估算
- **关键决策**：效果差来自错误后处理；下载失败来自 ghfast 大文件限流与不可靠镜像。
- **修改文件**：`src/utils/ImageMatting.ts`、`scripts/FetchMattingModels.mjs`、`README.md`
- **会话目的**：修复「通用高清」等模型加载时报 `protobuf parsing failed`。
- **完成任务**：
  - 按模型最小体积 + 文件头校验，拒绝 HTML/LFS/截断包
  - 本地 `public/models` 探测避免 SPA 把首页 HTML 当成 onnx
  - session 创建遇损坏缓存时自动清 IndexedDB 并强制重下
- **关键决策**：此前仅用 `>1MB` 判断过松，代理/回退页会被误缓存。
- **修改文件**：`src/utils/ImageMatting.ts`、`src/views/imageMatting/index.vue`、`README.md`

### 2026-07-23（默认轻量 + 按需下载 + 海报发虚修复）

- **会话目的**：默认使用轻量模型；大模型仅在用户选中后下载；修复海报档主体镂空发虚。
- **完成任务**：
  - 默认档位改为 `u2netp`（轻量）
  - 切换到海报/高清/人像时触发 `EnsureMattingModelReady`（本地 → IndexedDB → 镜像下载）
  - isnet 改为单输出优选 + 百分位归一化 + 强锐化 alpha，减轻立体字半透明镂空
- **关键决策**：复杂 3D 海报字轻量档往往更稳；大模型按需下载，避免首屏拉 170MB+。
- **修改文件**：`src/utils/ImageMatting.ts`、`src/views/imageMatting/index.vue`、`README.md`

### 2026-07-23（海报模型与细节保留）

- **会话目的**：增加更适合海报的模型，并减少抠图后细节丢失。
- **完成任务**：
  - 新增 `isnet-anime`（海报/插画推荐，1024）与 `isnet-general-use`（通用高清）
  - 海报档使用更宽松 alpha（preserve），减轻光效/细线被削掉
  - 同步脚本支持 `--poster`；默认选中海报模型
- **关键决策**：u2net 320 输入易糊细线；isnet 1024 + 宽松阈值更适合海报。
- **修改文件**：`types.ts`、`ImageMatting.ts`、`imageMatting/index.vue`、`FetchMattingModels.mjs`、`package.json`、`ToolList.ts`、`README.md`

### 2026-07-23（精细档软蒙版修复）

- **会话目的**：修复「精细/原高质量」整图发灰半透明，效果反而不如轻量档。
- **完成任务**：改为多输出 max 融合 + alpha 锐化自研合成；取消 rembg 默认 blur；文案改为轻量推荐 / 精细。
- **关键决策**：silueta 对平面海报易出软 mask；轻量 u2netp 对这类图更稳，精细档加强锐化并提示适用场景。
- **修改文件**：`src/utils/ImageMatting.ts`、`src/views/imageMatting/index.vue`、`README.md`

### 2026-07-23（Vite ORT ?url 修复）

- **会话目的**：修复 Vite 报错「public 下 jsep.mjs 不能被源码动态 import」。
- **完成任务**：ORT wasm/mjs 改为 `onnxruntime-web/...?...url` 由 Vite 打包；不再同步 `public/ort`。
- **关键决策**：`.onnx` 仍放 `public/models`（fetch）；ORT 模块文件必须走打包管线。
- **修改文件**：`ImageMatting.ts`、`vite.config.ts`、`FetchMattingModels.mjs`、`public/_headers`、`.gitignore`、`README.md`

### 2026-07-23（ORT jsep 资源补齐）

- **会话目的**：修复抠图时报 `ort-wasm-simd-threaded.jsep.mjs` 404 / no available backend。
- **完成任务**：同步脚本重新包含 jsep wasm/mjs；session 优先 `wasm` EP；错误文案区分模型与 ORT。
- **关键决策**：onnxruntime-web 会动态加载 jsep 模块，不能省略。
- **修改文件**：`scripts/FetchMattingModels.mjs`、`src/utils/ImageMatting.ts`、`README.md`

### 2026-07-23（AI 抠图避坑与模型同源）

- **会话目的**：修复 HuggingFace 模型下载超时，并补齐前端 AI 抠图通用避坑点。
- **完成任务**：
  - 模型与 ORT WASM 改为同源 `public/models`、`public/ort`（脚本拉取，不再依赖 HF）
  - 开启 `ort.env.wasm.proxy`（Web Worker）减轻主线程卡顿
  - 推理前长边限制 2048 自动缩小
  - 补充首次加载体积提示与中文网络错误文案
  - 增加 Cloudflare Pages `_headers` 对 `/models/*`、`/ort/*` 长期缓存
- **关键决策**：
  - 安装期用 GitHub Releases 拉模型，运行时只走本站静态资源
  - 大文件 gitignore，构建 / `npm run sync-matting` 时拉取
- **修改文件**：
  - `scripts/FetchMattingModels.mjs`、`src/utils/ImageMatting.ts`、`src/views/imageMatting/index.vue`
  - `public/_headers`、`.gitignore`、`package.json`、`README.md`

### 2026-07-23（AI 智能抠图）

- **会话目的**：新增浏览器端 AI 智能抠图工具，并采用双档模型兼顾体积与效果。
- **完成任务**：
  - 接入 `@bunnio/rembg-web` + `onnxruntime-web`
  - 默认轻量 `u2netp`（~5MB），可选高质量 `silueta`（~43MB）
  - 新增 `/image-matting` 页面：上传、进度、原图/结果对比、透明 PNG 下载
  - 首页 `ToolList` 增加「AI 智能抠图」入口
- **关键决策**：
  - 不用 imgly（~40MB+、AGPL）与完整 RMBG（更大）；选 rembg-web 可换小模型
  - 模型按需从 HuggingFace 下载并 IndexedDB 缓存，WASM 走 jsDelivr CDN
  - 动态 import 抠图依赖，避免拖慢其它工具首屏
- **修改文件**：
  - 新增 `src/utils/ImageMatting.ts`、`src/views/imageMatting/**`、`src/router/imageMatting/index.ts`
  - 更新 `src/utils/ToolList.ts`、`vite.config.ts`、`package.json`、`README.md`

### 2026-07-23（水印工具支持文本文件）

- **会话目的**：图片水印页同时支持 txt / docx 等文本加水印。
- **完成任务**：上传扩展为图片+文本；docx/txt 等排版为 A4 预览页后复用现有水印绘制与导出。
- **关键决策**：旧版 .doc 不支持（提示转 docx）；文本先栅格化成页再加水印，与中文 PDF 水印策略一致。
- **修改文件**：`TextDocumentWatermark.ts`、`watermark/types.ts`、`ImageUploader.vue`、`ImageList.vue`、`watermark/index.vue`、`ToolList.ts`、`README.md`

### 2026-07-23（PDF 水印支持中文）

- **会话目的**：PDF 水印支持中文显示。
- **完成任务**：水印改为浏览器本地（pdf.js + Canvas + jsPDF），用系统中文字体绘制；保留字号/颜色/旋转/位置/平铺。
- **关键决策**：不在 Worker 内嵌完整 CJK 字体（体积过大）；本地栅格化换中文兼容性。
- **修改文件**：`LocalPdfWatermark.ts`、`PdfToolList.ts`、`tool.vue`、`README.md`

### 2026-07-23（PDF 水印增强对齐图片水印）

- **会话目的**：PDF 水印增加与图片水印类似的效果参数。
- **完成任务**：支持字号、颜色、旋转（含负值）、九宫格位置、平铺及间距；前后端同步传参。
- **关键决策**：暂不移植「自由拖动」（PDF 无实时画布）；标准 Helvetica 暂不支持中文轮廓。
- **修改文件**：`server/src/pdf/operations.ts`、`server/src/index.ts`、`src/views/pdfTools/tool.vue`、`PdfToolList.ts`、`README.md`
- **注意**：需重新 `cd server && npm run deploy`，前端推送/重新部署 Pages 后线上生效。

### 2026-07-23（PDF 结果预览）

- **会话目的**：处理完成后可预览 PDF 结果（如水印效果）。
- **完成任务**：新增 pdf.js 预览工具；工具页在 PDF 结果生成后展示可翻页预览。
- **关键决策**：仅对 PDF 结果预览（ZIP/图片跳过）；浏览器本地渲染，不增加后端负担。
- **修改文件**：`src/utils/pdfTools/PdfPreview.ts`、`src/views/pdfTools/tool.vue`、`README.md`

### 2026-07-23（同源 /api 绕过 workers.dev 超时）

- **会话目的**：解决浏览器访问 `*.workers.dev` 连接超时（国内常见）。
- **完成任务**：新增 Pages Functions `/api/*` + Service Binding `PDF_API` → `fuse-pdf-api`；前端改为默认同源调用。
- **关键决策**：浏览器只访问 `fuse-beads.pages.dev/api/*`，由 CF 内网转发到 Worker，不经过公网 workers.dev。
- **修改文件**：`functions/api/[[path]].ts`、`wrangler.toml`、`PdfApi.ts`、`.env.prod`、`pdfTools/index.vue`、`README.md`
- **你需要做的**：
  1. Pages → fuse-beads → 设置 → 绑定：添加服务绑定 `PDF_API` → `fuse-pdf-api`（若未从 wrangler.toml 自动生效）
  2. 环境变量 `VITE_API_BASE_URL` **清空**或删除（不要再用 workers.dev）
  3. 重新部署前端后访问 `https://fuse-beads.pages.dev/api/health`

### 2026-07-23（fuse-pdf-api 首次部署成功）

- **会话目的**：将 Worker-only 后端部署到 Cloudflare。
- **完成任务**：`fuse-pdf-api` 已上线；`.env.prod` 写入真实 API 地址。
- **关键决策**：当前 `ENABLE_CONTAINERS=0`，先用 P0 能力；Pages 需配置同名环境变量并重新部署。
- **修改文件**：`.env.prod`、`README.md`
- **API 地址**：https://fuse-pdf-api.2330600478-e1b.workers.dev

### 2026-07-23（Worker-only 无 Docker 部署）

- **会话目的**：本地无 Docker 时仍能把后端部署到 Cloudflare。
- **完成任务**：默认改为 Worker-only；Containers 完整版拆到 `wrangler.containers.toml`；前端 Word↔PDF / 加密标为「需 Containers」。
- **关键决策**：无 Docker 用 `npm run deploy`；有 Docker 再 `deploy:full`。
- **修改文件**：`server/wrangler.toml`、`server/wrangler.containers.toml`、`server/src/**`、`PdfToolList.ts`、`pdfTools/index.vue`、`package.json`、`README.md`、`server/README.md`

### 2026-07-23（dash.cloudflare 部署说明）

- **会话目的**：说明如何在 Cloudflare Dashboard 上部署 PDF 前端与 API。
- **完成任务**：补充 Pages + Workers/Containers 分步部署、环境变量与连通检查说明。
- **关键决策**：Containers 必须经 Wrangler + Docker 发布；Dashboard 负责查看与改 Variables。
- **修改文件**：`README.md`

### 2026-07-23（PDF 工具站 + CF Containers）

- **会话目的**：新建 `/pdf-tools` 卡片站，后端纯 Cloudflare（Workers + Containers）实现 P0 + Word↔PDF。
- **完成任务**：
  - 新增 `server/`：Worker API（合并/拆分/旋转/水印/图片转 PDF）+ LibreOffice 容器（Word↔PDF、qpdf 加密）
  - 新增前端 `/pdf-tools` 卡片站与 `/pdf-tools/:toolId` 工作区
  - 首页工具列表增加「PDF 工具站」入口；环境变量指向本地/远程 API
- **关键决策**：
  - P0 轻量操作用 `pdf-lib` 跑在 Worker；Office 转换与加密走 Containers
  - PDF→JPG 继续浏览器本地 pdf.js，避免不必要上传
  - 前后端分离部署，通过 `VITE_API_BASE_URL` + CORS 连接
- **修改文件**：
  - 新增 `server/**`、`src/views/pdfTools/**`、`src/router/pdfTools/**`、`src/utils/pdfTools/**`
  - 更新 `ToolList.ts`、`.env.*`、`package.json`、`README.md`

### 2026-07-23（文本对比跳转过冲修复）

- **会话目的**：修复点击「修改 / 新增 / 删除」跳转过头、看不到高亮行的问题。
- **完成任务**：滚动改为基于 `getBoundingClientRect` 的相对位移计算，贴齐粘性表头下方，不再误用 `offsetTop`。
- **关键决策**：以「当前可视位置差 + scrollTop」校正，避免定位祖先导致偏移累积。
- **修改文件**：`src/views/textDiff/index.vue`、`README.md`

### 2026-07-23（文本对比跳转与高亮增强）

- **会话目的**：差异处更醒目，并支持点击「修改 / 新增 / 删除」跳转定位。
- **完成任务**：
  - 强化行级与字符级高亮样式
  - 统计项可点击循环跳转，显示当前第 x/y 处，定位行闪动聚焦
  - 并排视图左右同步滚动
- **关键决策**：多次点击同统计项按顺序跳下一处，回到开头循环。
- **修改文件**：`src/views/textDiff/index.vue`、`README.md`

### 2026-07-23（文本对比工具）

- **会话目的**：新增文本差异对比工具，支持文案校对与多类型文本/代码文件对比。
- **完成任务**：
  - 实现行级 LCS 对比，变更行内字符级高亮
  - 支持粘贴与上传 txt / json / vue / js / ts 等常见文本文件
  - 提供并排 / 统一两种视图，统计相同、修改、新增、删除行数
  - 接入路由与工具列表（办公类）
- **关键决策**：不引入第三方 diff 库，自研 LCS；相邻删+增合并为「修改」行以便行内高亮。
- **修改文件**：
  - 新增 `src/utils/TextDiff.ts`、`src/views/textDiff/index.vue`、`src/router/textDiff/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-23（ICO 显示转换后体积）

- **会话目的**：转为 ICO 后展示转换后的文件大小。
- **完成任务**：列表显示「原图 → ICO」体积；状态栏补充单文件 / ZIP 合计大小；改尺寸或缩放方式后清空旧结果。
- **关键决策**：体积写在每张文件项上，便于多图对照。
- **修改文件**：`src/views/imageToIco/index.vue`、`README.md`

### 2026-07-23（图片转 ICO）

- **会话目的**：新增「图片转 ICO」本地工具。
- **完成任务**：
  - 实现多尺寸 PNG 嵌入式 ICO 打包（16/24/32/48/64/128/256）
  - 支持完整放入 / 铺满裁切 / 拉伸；单张直下、多张 ZIP
  - 接入路由与工具列表入口
- **关键决策**：不引入第三方 ICO 库，用 Canvas 导出 PNG 再按 ICO 目录结构打包，兼容现代系统。
- **修改文件**：
  - 新增 `src/utils/ImageToIco.ts`、`src/views/imageToIco/index.vue`、`src/router/imageToIco/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-23（imageJoin 组件拆分）

- **会话目的**：将 `imageJoin/index.vue` 模板中拼接与分割大块 UI 拆成可维护的子组件，保持行为不变。
- **完成任务**：
  - 抽出 `StitchPanel`（拼接参数 + 预览，含 `AppendItems` / `Clear` / `HasItems`）
  - 抽出 `SplitOptionsPanel`（分割参数与下载）
  - 抽出 `SplitPreviewPanel`（分割预览与自由切线交互）
  - 父页仅保留模式切换、上传、状态与分割公共状态；修复 `HandleClear` 重复注释
- **关键决策**：拼接状态与方法内聚到 `StitchPanel`；自由切线交互内聚到预览面板；参数面板负责下载并通过 `status` / `busy` 与父级通信。
- **修改文件**：
  - `src/views/imageJoin/index.vue`
  - `src/views/imageJoin/components/StitchPanel.vue`（新增）
  - `src/views/imageJoin/components/SplitOptionsPanel.vue`（新增）
  - `src/views/imageJoin/components/SplitPreviewPanel.vue`（新增）
  - `README.md`

### 2026-07-23（自由分割细条二次修复）

- **会话目的**：竖线视觉贴齐横线后仍出现 799×9 / 799×15 等碎条。
- **完成任务**：
  - 吸附阈值随图尺寸放大（约 3%，最少 28px），覆盖预览缩放目测误差
  - 端点拖动实时吸附到交叉线；仅端点大力吸附，平行线位置不强行合并
  - 分割后把「非双参考线夹住」的薄缝并入相邻块，保留有意切出的窄带
- **关键决策**：碎条合并以「是否落在两道真实横切线之间」区分误缝与有意窄条。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（自由分割细条碎块修复）

- **会话目的**：排查自由分割预览出现 1px/十余像素短条碎块的原因。
- **完成任务**：
  - 说明根因：竖线段端点与横线差几像素时，接缝处会多切出薄片
  - 切线端点自动吸附到交叉切线；切割时吞掉过小残留边
  - 拖动结束后写回对齐后的切线坐标
- **关键决策**：以吸附 + 微边吸收修复 T 接缝误差，而不是简单丢弃碎块（避免丢像素）。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（自由分割切线长度可调）

- **会话目的**：自由分割切线支持调整长度，可只切割图片上半部分等局部区域。
- **完成任务**：
  - 切线模型改为带 `start/end` 的线段，不再强制贯穿整图
  - 预览端点可拖拽缩短/拉长；拖动线条本身仍可平移
  - 导出按线段局部切割矩形区域（非整幅网格贯穿）
- **关键决策**：新增切线默认仍贯穿整图，用户拖两端圆点即可只保留上半段等局部切割。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（自由分割顶栏 + 切线颜色）

- **会话目的**：自由分割独立为顶栏入口；切线增加颜色选项并提高可见度。
- **完成任务**：顶栏增加「自由分割」与「均等分割」并列；切线可选青/红/黄/绿/粉/橙/白，加粗并带描边光晕。
- **关键决策**：不再嵌套在均等分割内；切线颜色用 CSS 变量统一控制。
- **修改文件**：`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（自由分割）

- **会话目的**：分割工具增加自由切线分割，不限于均等行列。
- **完成任务**：均等/自由双模式；预览图点击加横竖切线、拖动调整、双击删除；预览与 ZIP 导出按自定义切线切分。
- **关键决策**：切线生成不规则网格；复用分块预览与打包下载流程。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（分割预览空白修复）

- **会话目的**：修复分割预览仅第一张有图、其余空白。
- **完成任务**：改用 `img` + `overflow` + `transform` 裁切预览，替代错误的 `background-position` 百分比算法。
- **关键决策**：translate 百分比相对图片自身尺寸，与切分坐标一一对应。
- **修改文件**：`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（分割效果预览）

- **会话目的**：图片分割增加可视化预览，便于确认切分效果。
- **完成任务**：原图叠加真实切线；下方宫格展示各块裁切预览与尺寸标注。
- **关键决策**：用与导出一致的 `BuildGridSlices` 坐标；小块预览用 CSS background 定位，避免频繁生成 Blob。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（拼接自由拖放）

- **会话目的**：支持画布上自由拖放摆放图片，实现任意一排多张等自定义布局。
- **完成任务**：新增「自由拖放」模式与 `FreeLayoutCanvas`；拖动改坐标、点选置顶；导出按内容包围盒裁切；可一键按网格重新排布。
- **关键决策**：保留自动网格与自由拖放双模式；自由模式列表顺序决定图层上下（后点选在上）。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`src/views/imageJoin/components/FreeLayoutCanvas.vue`、`README.md`

### 2026-07-23（拼接每行多张）

- **会话目的**：拼接支持一排 2 张等多列布局，不再仅限单列竖排。
- **完成任务**：增加「每行张数」1–4；多列时整行左右对齐、单张行内上下对齐；列表顺序决定从左到右、从上到下排布。
- **关键决策**：按阅读顺序自动分行；非自由画布拖放定位，用每行张数 + 排序实现「一排多个」。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（拼接缩放与左右对齐）

- **会话目的**：完善长图拼接，支持每张图独立缩放与水平布局。
- **完成任务**：单图缩放 10%–200%、左/中/右对齐；批量对齐与重置 100%；预览防抖刷新。
- **关键决策**：画布宽度取缩放后最大宽；对齐相对整张长图画布。
- **修改文件**：`src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`README.md`

### 2026-07-23（长图拼接 / 图片分割）

- **会话目的**：新增长图拼接与图片均等分割工具。
- **完成任务**：
  - 多图竖向拼接（最大宽对齐、居中、可调间距），导出 PNG 并支持预览
  - 单图按行×列均等分割，余数并入末行/末列；多图 ZIP、单图直下 PNG
  - 首页图片类工具增加入口 `/image-join`
- **关键决策**：
  - 单页双 Tab（拼接 / 分割），不做横向拼接与送入生成器
  - 分割网格 1–20 行/列，本地 Canvas + JSZip
- **修改文件**：
  - 新增 `src/utils/ImageJoin.ts`、`src/views/imageJoin/index.vue`、`src/router/imageJoin/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-23（图片裁剪顶部样式对齐）

- **会话目的**：图片裁剪页顶部样式与其他工具页保持一致。
- **完成任务**：将 `.hero` / `.brand` 等样式对齐图片压缩页（大号品牌字、相同渐变与内边距）。
- **关键决策**：复用压缩工具页的 hero 视觉规范，去掉裁剪页自定义的浅色页面底与小号 brand。
- **修改文件**：`src/views/imageCrop/index.vue`、`README.md`

### 2026-07-23（图片裁剪工具）

- **会话目的**：新增图片裁剪 & 形状裁切工具，用于头像与素材预处理。
- **完成任务**：
  - 实现自由矩形、固定比例（含自定义）、圆形、圆角裁切
  - 裁切框支持拖移与八向手柄缩放，本地 Canvas 导出透明底 PNG
  - 支持下载与送入拼豆生成器；首页图片类工具增加入口
- **关键决策**：
  - 按图片压缩等工具模式做独立路由页，不嵌入生成器
  - 圆形强制 1:1；圆角半径按裁切框短边百分比调节
  - 不做套索/多边形不规则裁切与批量多图
- **修改文件**：
  - 新增 `src/utils/ImageCrop.ts`、`src/views/imageCrop/index.vue`、`src/views/imageCrop/components/CropCanvas.vue`、`src/router/imageCrop/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-23（拼豆生成器色号用量）

- **会话目的**：生成图纸后统计每个颜色的数量。
- **完成任务**：按图案网格（含描边）汇总色号用量，在预览区展示色块、色号、数量与占比。
- **关键决策**：复用图纸计算器的用量数据结构，统计来自真实生成结果而非再次识图。
- **修改文件**：`src/utils/BoardCalculator.ts`、`src/components/BeadCanvas.vue`、`src/views/generator/index.vue`、`README.md`

### 2026-07-23（图纸色号优先识别）

- **会话目的**：修复上传带色号图纸后颜色识别不准。
- **完成任务**：按格子解码图纸；OCR 优先读取色号标注；失败再四角采样匹配 MARD；自动剔除 T1 等背景色。
- **关键决策**：不再整图缩小二次量化；自动检测本工具导出图纸的行列布局。
- **修改文件**：`src/utils/BeadBlueprintDecoder.ts`、`src/utils/BoardCalculator.ts`、`src/views/boardCalculator/index.vue`、`package.json`、`README.md`

### 2026-07-23（图纸尺寸计算器拖拽上传）

- **会话目的**：图纸尺寸计算器支持拖拽上传图片。
- **完成任务**：上传区支持拖入图片，拖拽态高亮提示。
- **关键决策**：与点击选择共用同一套文件校验逻辑。
- **修改文件**：`src/views/boardCalculator/index.vue`、`README.md`

### 2026-07-23（图纸尺寸计算器）

- **会话目的**：新增图纸尺寸计算器，服务拼豆备料。
- **完成任务**：输入宽高/描边估算板材与豆数；对照多种标准板；可选上传图纸做 MARD 色号用量统计。
- **关键决策**：豆距按 5mm 估算实物尺寸；推荐板型优先总块数少、余量少。
- **修改文件**：`src/utils/BoardCalculator.ts`、`src/views/boardCalculator/index.vue`、`src/router/boardCalculator/index.ts`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-23（拼豆配色模拟器）

- **会话目的**：新增配色模拟工具，预览色号搭配并保存方案。
- **完成任务**：色号输入 / 色卡点选、网格/横条/叠色预览、localStorage 保存/加载/删除方案。
- **关键决策**：方案存浏览器本地；无效色号提示但不阻断有效色预览。
- **修改文件**：`src/utils/MardColors.ts`、`src/utils/PaletteSimulator.ts`、`src/views/paletteSimulator/index.vue`、`src/router/paletteSimulator/index.ts`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-23（工具按类型分类）

- **会话目的**：首页工具按类型分组展示。
- **完成任务**：新增分类字段与分组 API；首页按区块展示分类标题、说明与工具卡片。
- **关键决策**：
  - 拼豆配套：拼豆工具 / 像素画布 / 像素图缩放 / 色卡对照
  - 图片类：压缩 / 水印 / 格式转换
  - 文本办公：文件转换 / 二维码生成
  - 趣味生活：单位转换
- **修改文件**：`src/utils/ToolList.ts`、`src/views/tools/index.vue`、`README.md`

### 2026-07-22（像素图缩放器）

- **会话目的**：新增最近邻像素图缩放工具，用于拼豆素材预处理。
- **完成任务**：整数倍 / 指定尺寸缩放、原图对照预览、导出 PNG、一键送入拼豆工具。
- **关键决策**：手写最近邻采样（非浏览器默认平滑缩放），保留透明通道。
- **修改文件**：`src/utils/PixelScaler.ts`、`src/views/pixelScaler/index.vue`、`src/router/pixelScaler/index.ts`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-22（像素填充死机修复）

- **会话目的**：修复点击填充导致页面卡死。
- **完成任务**：洪水填充增加边界检查，避免越界 `null` 与空区域目标色匹配后无限扩张。
- **关键决策**：用 `Uint8Array` 标记已访问格，越界坐标直接跳过。
- **修改文件**：`src/utils/PixelCanvas.ts`、`README.md`

### 2026-07-22（像素画布编辑器）

- **会话目的**：新增像素画布，并与拼豆生成器无缝对接。
- **完成任务**：
  - 手绘 / 橡皮 / 取色 / 填充、多图层、网格、尺寸调整
  - 导出像素图 PNG、拼豆图纸 PNG
  - Vuex `importedPixelGrid` + `sourceMode: 'pixel'` 无损导入生成器
- **关键决策**：扁平化图层为 `ColoredPixelGrid` 后直接供 `BeadCanvas` 绘制，避免再走图片量化。
- **修改文件**：`src/utils/PixelCanvas.ts`、`src/views/pixelEditor/index.vue`、`src/router/pixelEditor/index.ts`、`src/store/modules/generator.ts`、`src/store/index.ts`、`src/components/BeadCanvas.vue`、`src/components/ControlPanel.vue`、`src/views/generator/index.vue`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-22（二维码多格式导出）

- **会话目的**：二维码导出支持多种图片格式。
- **完成任务**：增加 PNG / JPEG / WebP 选择；JPEG/WebP 可调质量；按格式生成扩展名。
- **关键决策**：预览仍用 PNG；JPEG 导出前铺不透明底，避免透明通道问题。
- **修改文件**：`src/utils/QrCodeGenerator.ts`、`src/views/qrCode/index.vue`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-22（二维码生成器）

- **会话目的**：新增二维码生成工具。
- **完成任务**：
  - 接入 `qrcode`，实现颜色、中心图标、PNG 导出
  - 新增页面 `/qrcode`、路由与工具列表入口
  - 嵌入图标时自动使用 H 纠错等级
- **关键决策**：纯前端生成；图标居中白底圆角，占比限制在 12%–28% 以保证可扫。
- **修改文件**：`src/utils/QrCodeGenerator.ts`、`src/views/qrCode/index.vue`、`src/router/qrCode/index.ts`、`src/utils/ToolList.ts`、`package.json`、`README.md`

### 2026-07-22（PDF 转图片中文空白修复）

- **会话目的**：部分 PDF（如电子发票）转图片后中文内容空白。
- **完成任务**：
  - 启用 pdf.js CMap + standard_fonts（同步到 `public/pdfjs`）
  - 提高渲染倍率，开启注解渲染与白底
  - 增加 `postinstall` / 构建前同步脚本
- **关键决策**：发票 PDF 多用 CID/CJK 字体，缺 CMap 时只剩线条、二维码与少量 ASCII；同步启用 `enableXfa` 兼容部分电子票。
- **修改文件**：`src/utils/FileConverter.ts`、`scripts/SyncPdfjsAssets.mjs`、`package.json`、`.gitignore`、`README.md`

### 2026-07-22（文件转换批量）

- **会话目的**：文件转换支持同格式多文件批量处理。
- **完成任务**：多选上传、同格式校验、逐个转换进度、多文件结果 ZIP 打包。
- **关键决策**：不同源格式不允许混选；单文件仍直接下载，多文件统一打包。
- **修改文件**：`src/utils/FileConverter.ts`、`src/views/fileConverter/index.vue`、`ToolList.ts`、`README.md`

### 2026-07-22（TXT 转 PDF 中文乱码修复）

- **会话目的**：TXT→PDF 中文乱码。
- **完成任务**：改用 Canvas + 浏览器中文字体排版再写入 PDF；文本读取增加 GBK 回退。
- **关键决策**：jsPDF 默认字体不含 CJK，直接 `text()` 会乱码，故走「画布渲染 → 图片嵌入 PDF」。
- **修改文件**：`src/utils/FileConverter.ts`、`README.md`

### 2026-07-22（文件转换纯前端）

- **会话目的**：参考 toolbox file-converter，但改为纯前端实现，并支持 PDF→PNG/JPG。
- **完成任务**：
  - 新增 `/file-converter`：PDF→PNG/JPG/TXT，TXT→PDF，DOCX→TXT/HTML，XLSX→CSV/JSON 等
  - 多页 PDF 出图自动 ZIP；明确排除 Word/Excel↔PDF 等需后端类型
  - 接入 pdfjs-dist / jspdf / mammoth / xlsx
- **关键决策**：只保留浏览器可可靠完成的转换，避免假依赖后端的入口。
- **修改文件**：
  - 新增 `src/utils/FileConverter.ts`、`src/views/fileConverter/index.vue`、`src/router/fileConverter/index.ts`
  - 更新 `ToolList.ts`、`Brand.ts`、`about`、`README.md`、`package.json`

### 2026-07-22（拼豆页顶部样式统一）

- **会话目的**：拼豆工具顶部样式与其他工具页不一致。
- **完成任务**：去掉大高度头图、点阵动画与入场动画，品牌字号与导航样式对齐其他工具页。
- **修改文件**：`src/views/generator/index.vue`、`README.md`

### 2026-07-22（项目品牌更名）

- **会话目的**：名称/标题改为更符合多工具箱定位。
- **完成任务**：
  - 品牌统一为 **Fuse Kit**，产品名 **Fuse 工具箱**
  - 更新 env / HTML / package.json / Vuex key / 各页页头与关于页文案
  - 新增 `Brand.ts` 集中管理品牌常量
- **关键决策**：拼豆仍为独立工具名；站点级标题改为工具箱，避免各页共用旧「图纸生成器」文案。
- **修改文件**：
  - 新增 `src/utils/Brand.ts`
  - 更新 `.env.*`、`index.html`、`public/index.html`、`package.json`
  - 更新各 `views/**`、`src/utils/Env.ts`、`src/store/*`、`README.md`

### 2026-07-22（单位转换工具）

- **会话目的**：参考 toolbox unit-converter 新增单位转换工具。
- **完成任务**：
  - 新增 `/unit-converter`：长度/重量/面积/体积/温度
  - 支持单位交换、换算比率说明、防抖历史记录
  - 工具列表增加入口
- **关键决策**：
  - 与参考一致使用自建换算系数（不引入 convert-units）
  - 修正平方千米系数：1 km² = 1,000,000 m²
- **修改文件**：
  - 新增 `src/utils/UnitConverter.ts`、`src/views/unitConverter/index.vue`、`src/router/unitConverter/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-22（水印旋转支持负值）

- **会话目的**：旋转角度支持负值。
- **完成任务**：旋转范围改为 -180°~180°，并增加数字输入便于精确设置。
- **修改文件**：`src/views/watermark/components/WatermarkSettings.vue`、`README.md`

### 2026-07-22（水印平铺可拖动）

- **会话目的**：平铺模式下无法自由拖动。
- **完成任务**：平铺绘制接入 `watermarkPos` 整体偏移；平铺时可在预览区任意位置拖动网格。
- **关键决策**：平铺与自由拖动可同时开启；拖动偏移用模运算保证网格连续铺满。
- **修改文件**：`PreviewCanvas.vue`、`WatermarkSettings.vue`、`watermark/index.vue`、`README.md`

### 2026-07-22（图片格式转换）

- **会话目的**：参考 toolbox image-converter 新增图片格式转换工具。
- **完成任务**：
  - 新增 `/image-converter`：多图上传，转 JPEG/PNG/WebP/GIF
  - 单张直接下载，多张打包 ZIP；JPEG/WebP 可调质量
  - 工具列表增加入口
- **关键决策**：
  - Canvas 转码；JPEG/GIF 先铺白底避免透明变黑
  - 转换逻辑抽到 `ImageConverter.ts`
- **修改文件**：
  - 新增 `src/utils/ImageConverter.ts`、`src/views/imageConverter/index.vue`、`src/router/imageConverter/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-22（水印单张下载）

- **会话目的**：单张加水印时缺少下载入口。
- **完成任务**：预览区与操作栏增加「下载当前图片」；多图才显示「打包下载全部」。
- **关键决策**：下载直接导出当前预览 Canvas，无需先点批量处理。
- **修改文件**：`src/views/watermark/index.vue`、`src/views/watermark/components/PreviewCanvas.vue`、`README.md`

### 2026-07-22（图片水印工具）

- **会话目的**：参考 toolbox watermark 在本项目新增图片水印工具。
- **完成任务**：
  - 新增 `/watermark`：多图上传、九宫格位置、平铺、旋转、透明度、自由拖动
  - 支持批量加水印与 ZIP 打包下载
  - 工具列表增加「图片水印工具」入口
- **关键决策**：
  - 沿用 Options API + 本站视觉，不引入 Element Plus
  - 预设位置切换时关闭自由拖动，避免坐标冲突
- **修改文件**：
  - 新增 `src/views/watermark/**`、`src/router/watermark/index.ts`
  - 更新 `src/utils/ToolList.ts`、`README.md`

### 2026-07-22（图片压缩对齐 toolbox）

- **会话目的**：参考 `tool/frontend` 的 image-compressor 重做本项目图片压缩页。
- **完成任务**：
  - 接入 `browser-image-compression` / `jszip` / `gifuct-js`
  - 支持多图拖拽上传、质量/缩放/最大宽高、进度条、结果表、单下/打包 ZIP
  - GIF 单独处理，其它格式走 browser-image-compression
  - 压缩逻辑抽到 `src/utils/ImageCompress.ts`，页面保持 Options API + 原生 UI
- **关键决策**：
  - 不引入 Element Plus，交互能力对齐参考页，视觉延续 Fuse Beads 风格
  - 文件大小限制：GIF ≤ 20MB，其它 ≤ 50MB
- **修改文件**：
  - 新增 `src/utils/ImageCompress.ts`
  - 重写 `src/views/imageCompress/index.vue`
  - 更新 `package.json`、`src/utils/ToolList.ts`、`README.md`

### 2026-07-22（工具列表首页）

- **会话目的**：创建工具列表页作为默认首页，点击进入各工具。
- **完成任务**：
  - 新增工具列表页 `/`，含拼豆工具、图片压缩工具、色卡对照（即将推出）
  - 拼豆工具路由改为 `/generator`
  - 新增图片压缩工具页 `/image-compress`（本地 Canvas 压缩）
  - 更新生成器/关于页导航回链
- **关键决策**：
  - 路由按目录自动聚合，工具配置集中在 `ToolList.ts`
  - 未就绪工具以禁用卡片展示，避免空跳转
- **修改文件**：
  - 新增 `src/views/tools/index.vue`、`src/views/imageCompress/index.vue`
  - 新增 `src/router/tools/index.ts`、`src/router/imageCompress/index.ts`、`src/utils/ToolList.ts`
  - 更新 `src/router/generator/index.ts`、`src/views/generator/index.vue`、`src/views/about/index.vue`、`README.md`

### 2026-07-22（图片清晰度 / 相近色合并）

- **会话目的**：图片转拼豆时可调清晰度，相近颜色统一，并带锐化效果。
- **完成任务**：
  - 新增清晰度 1~10：低=相近色合并/限色；高=细节更多+锐化
  - 采样前做 Unsharp Mask，采样后做相近色合并与最大色数限制
  - 控制面板增加清晰度滑杆
- **关键决策**：
  - 低清晰度使用最近邻缩放，色块更硬朗
  - 合并策略按色号用量从高到低并入主色，减少杂色
- **修改文件**：
  - 更新 `src/utils/ImageToPixels.ts`、`src/store/modules/generator.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/components/BeadCanvas.vue`
  - 更新 `src/views/generator/index.vue`、`README.md`

### 2026-07-22（图片转拼豆）

- **会话目的**：新增图片转可拼豆像素图功能。
- **完成任务**：
  - 新增 `ImageToPixels`：缩放采样 + 最近 MARD 色匹配
  - 生成器增加「文字 / 图片」双模式切换
  - 支持上传图片、最大宽高、透明抠图阈值
  - 图片 dataURL 不写入 sessionStorage，避免撑爆缓存
- **关键决策**：
  - 颜色匹配使用加权欧氏距离，贴近人眼感知
  - 图片与文字共用描边、网格、色值、缩放与导出流程
- **修改文件**：
  - 新增 `src/utils/ImageToPixels.ts`
  - 更新 `src/store/modules/generator.ts`、`src/store/index.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/components/BeadCanvas.vue`
  - 更新 `src/views/generator/index.vue`、`src/views/about/index.vue`
  - 更新 `src/utils/DrawBeadPattern.ts`、`README.md`

### 2026-07-22（预览缩放 + 大格子）

- **会话目的**：增加图片放大功能，并放大每个格子以便放下色值。
- **完成任务**：
  - 预览区增加缩放条 / ±− 按钮，支持 Ctrl/⌘+滚轮缩放（50%~300%）
  - 去掉 `max-width:100%` 强行缩小，改为可滚动查看真实比例
  - 格子尺寸默认提升到 40px，范围 28~72，绘制最小格边 28px
  - 旧会话格子过小时自动抬升到 40px
- **关键决策**：
  - 缩放只影响预览显示，导出仍按实际格子分辨率
  - 像素渲染使用 `pixelated`，放大后边缘更清晰
- **修改文件**：
  - 更新 `src/components/BeadCanvas.vue`、`src/components/ControlPanel.vue`
  - 更新 `src/store/modules/generator.ts`、`src/utils/DrawBeadPattern.ts`
  - 更新 `src/views/generator/index.vue`、`README.md`

### 2026-07-22（豆豆色值标注）

- **会话目的**：让每个有色豆豆格子显示色值，方便对照拼豆。
- **完成任务**：
  - 每个主体/描边豆子绘制色值文字（优先 MARD 色号，否则 HEX）
  - 色值在网格线之后绘制，避免被盖住
  - 增加「豆豆上显示色值」开关，默认开启
- **关键决策**：
  - 小格子自动缩小字号；无 MARD 匹配时回退显示 HEX
- **修改文件**：
  - 更新 `src/utils/DrawBeadPattern.ts`、`src/store/modules/generator.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/components/BeadCanvas.vue`
  - 更新 `src/views/generator/index.vue`、`README.md`

### 2026-07-22（逐字垂直对齐）

- **会话目的**：为每个字增加垂直对齐（居顶 / 居中 / 居底）。
- **完成任务**：
  - `CharStyle` 增加 `align` 字段
  - 合成网格时按对齐计算 Y 偏移
  - 控制面板增加对齐切换与「对齐应用到全部」
- **关键决策**：
  - 默认对齐为居中，兼容旧会话数据时自动补齐
  - 预览区用 `align-self` 同步展示对齐效果
- **修改文件**：
  - 更新 `src/utils/TextToPixels.ts`、`src/store/modules/generator.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/views/generator/index.vue`
  - 更新 `src/views/about/index.vue`、`README.md`

### 2026-07-22（负字距 + 文字效果）

- **会话目的**：字间距支持负值叠连，并为每字增加加粗/倾斜/下划线等效果。
- **完成任务**：
  - 字间距范围调整为 -24~24，负值时字符可重叠连接
  - `CharStyle` 增加 `bold` / `italic` / `underline` / `lineThrough`
  - 采样时按样式绘制字体效果，下划线/删除线一并像素化
  - 控制面板增加效果开关与「样式应用到全部」
- **关键决策**：
  - 负字距布局先计算坐标再统一偏移，避免越界
  - 重叠区域后写覆盖先写，便于连笔观感
- **修改文件**：
  - 更新 `src/utils/TextToPixels.ts`、`src/utils/FontOptions.ts`
  - 更新 `src/store/modules/generator.ts`、`src/components/ControlPanel.vue`
  - 更新 `src/views/generator/index.vue`、`README.md`

### 2026-07-22（字间距 + 逐字样式）

- **会话目的**：支持调整字间距，并为每个字单独设置颜色与大小。
- **完成任务**：
  - 新增 `ConvertStyledTextToPixels` 按字采样并横向拼接
  - 图案网格改为每格自带颜色，描边仍用统一描边色
  - Store 增加 `letterSpacing`、`charStyles` 与应用到全部能力
  - 控制面板增加字间距滑杆、字符点选、逐字色号/字号编辑
- **关键决策**：
  - 改文字时自动对齐 `charStyles` 长度，保留已有字的配置
  - 垂直居中对齐不同字号字符
- **修改文件**：
  - 更新 `src/utils/TextToPixels.ts`、`src/utils/DrawBeadPattern.ts`
  - 更新 `src/store/modules/generator.ts`、`src/components/ControlPanel.vue`
  - 更新 `src/components/BeadCanvas.vue`、`src/views/generator/index.vue`
  - 更新 `src/views/about/index.vue`、`README.md`

### 2026-07-22（可选字体）

- **会话目的**：为文字采样增加可切换字体。
- **完成任务**：
  - 新增 `FontOptions` 字体清单与 `document.fonts` 预加载
  - 控制面板增加字体下拉与实时预览
  - Store / 生成器页 / Canvas 贯通 `fontId`
  - Google Fonts 补充宋体、站酷黄油体、毛笔与像素字体
- **关键决策**：
  - 采样前先 `EnsureFontLoaded`，避免未加载时回退系统字体导致预览不准
  - 异步重绘使用 token 丢弃过期结果
- **修改文件**：
  - 新增 `src/utils/FontOptions.ts`
  - 更新 `public/index.html`、`src/store/modules/generator.ts`
  - 更新 `src/components/ControlPanel.vue`、`src/components/BeadCanvas.vue`
  - 更新 `src/views/generator/index.vue`、`src/views/about/index.vue`、`README.md`

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
