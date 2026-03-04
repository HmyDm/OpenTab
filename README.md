# OpenTab

<img src=".docs/cover.png" alt="cover" >

OpenTab 是一个基于 `Vue 3 + TypeScript + Vite` 开发的浏览器新标签页扩展，面向 Edge/Chrome。项目主打“本地优先”：配置、分类、收藏网站与界面个性化数据均保存在本地，不依赖后端服务。

## 截图

<img src=".docs/cover1.jpg" 
     alt="主界面截图" 
     style="max-width: 350px; height: auto; display: block; margin: 16px auto;">

<br>

<img src=".docs/cover2.png" 
     alt="快捷圆环功能" 
     style="max-width: 350px; height: auto; display: block; margin: 16px auto;">

## 功能特性

- 新标签主页
  - 搜索栏，支持 `Bing / Google / Baidu` 与自定义搜索引擎
  - 收藏网站网格展示，支持分类浏览与快速访问，支持鼠标滚动切换
  - 加载资源更少，性能更稳定
- 个性化设置
  - 自定义壁纸
  - 图标大小与圆角调节
  - 侧边栏隐藏开关
- 数据导入导出
  - 一键导出配置文件
  - 跨设备导入恢复
- 快捷圆环(new)
  - 任意网页按住“修饰键 + 鼠标左键”呼出快捷圆环
  - 支持 `Ctrl / Alt / Shift` 触发键
  - 圆环大小可调
  - 最多支持 8 个快捷页面

## 技术栈

- 框架：`Vue 3`
- 语言：`TypeScript`
- 构建：`Vite`
- 样式：`Tailwind CSS`
- 存储：`chrome.storage.local` + `IndexedDB`

## 项目结构

```text
openTab/
├─ src/
│  ├─ background/
│  ├─ components/
│  ├─ content/
│  ├─ utils/
│  ├─ views/
│  ├─ manifest.json
│  └─ main.ts
├─ public/
├─ dist/
└─ package.json
```

## 本地开发

### 1. 环境要求

- `Node.js >= 18`
- 推荐使用 `pnpm`（也可使用 `npm`）

### 2. 安装依赖

```bash
pnpm install
```

### 3. 本地开发

```bash
pnpm dev 或者 npm run dev
```

## 在浏览器中加载扩展（开发模式）

先执行：

```bash
pnpm build
```

然后加载 `dist` 目录：

### Edge

1. 打开 `edge://extensions/`
2. 开启“开发人员模式”
3. 点击“加载解压缩的扩展”
4. 选择项目的 `dist` 目录

### Chrome（未来会考虑上架）

1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择项目的 `dist` 目录

## 打包发布

```bash
pnpm build
```

构建产物位于 `dist/`。

## 问题

1.为什么不上架谷歌chrome呢？

因为还没有开发账号，所以没有上架! 后续会考虑申请一个开发者账号，本项目最初纯兴趣开发的，自己使用的。

2.支持那些浏览器？

目前支持大部分的浏览器，如果你的电脑上有edge浏览器，可以直接去扩展商店中搜索安装。chrome目前无法安装，因为没有上架，但是兼容基于chrome内核开发的浏览器都可以安装。比如星愿浏览器等。

3.安全性如何？

本项目完全基于本地存储，不依赖任何后端服务，因此安全性非常高。
开发这个目的的来由也是因为一些新标签页存在后门安全的问题，所以打算做个本地化的标签页。

4.这个项目是由AI生成的吗？

是的，依托于强大的AI技术生成，代码全部开源，欢迎大家 fork。

5.后续迭代计划

做这个的初衷是基于每个人的需求，做安全，个性化的新标签页，后续有更棒的想法，欢迎提issue。当然也支持定制开发，定制自己的新标签页。

## 贡献指南

欢迎提交 Issue / Pull Request：

1. Fork 本仓库并创建功能分支
2. 提交修改并补充必要说明
3. 发起 PR，描述变更背景与验证方式

## 许可证

`GPL-3.0`
