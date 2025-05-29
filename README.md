
# Build-Bool VSCode 扩展

一个轻量实用的 VSCode 扩展，为嵌入式开发提供便捷的构建按钮，支持 Windows 和 Linux/macOS。
功能已经测试通过,采用[MSPM0G3507工程](https://github.com/Cxxhh/MSPM0G3507-CMAKE-GCC-Template)测试若需要自行到链接下拉取
## 🚀 功能亮点

- **状态栏按钮**
  - ⚙️ Build：只构建编译修改的文件
  - 🔄 Rebuild：从头开始构建编译
  - 🧹 Clean：删除构建目录

- **平台适配**
  - 自动识别 `.bat`  和 `.sh` 脚本
  - 支持 CMD / bash / Git Bash

- **构建自动化**
  - 自动创建 `build/`
  - 执行 CMake 配置与编译
  - 可选使用 probe-rs 烧录嵌入式设备

## 🛠 安装方式

### 从 VSIX 安装
1. 下载 `build-bool-1.0.0.vsix`
2. VSCode → 扩展 → “...” → 选择 “从 VSIX 安装”
3. 选择下载的文件完成安装

### 源码安装
```bash
git clone https://github.com/Cxxhh/build-bool.git
cd build-bool
npm install
```
在 VSCode 中按 F5 启动扩展

## ⚙️ 使用指南
- 从本工程根目录获取 `run.sh` 或 `run.bat`(若自己以有git bash 最好使用shell脚本,因为shell脚本的信息输出更好)
- 将其放置在工程根目录下
- 打开 VSCode，点击状态栏的构建按钮
- 初次启动时，选择构建脚本（`run.sh` 或 `run.bat`）
- 更换脚本类型：`Ctrl+Shift+P` → 输入 “更改/选择构建脚本”

## 📁 构建脚本支持

- `run.bat`：适用于 Windows CMD
- `run.sh`：适用于 Linux/macOS 或 Git Bash

## ❗ 常见问题

- **按钮无响应**：确认脚本存在且具有执行权限
- **终端类型错误**：检查所选脚本与系统平台是否匹配
- **工具未找到**：确认 `cmake`、`ninja`、`arm-none-eabi-*` 在 PATH 中
- **烧录失败**：检查 probe-rs 是否安装，设备连接是否正常

## 📄 许可证

使用 MIT 许可证。详见 LICENSE 文件。

## 🤝 贡献指南

欢迎提交 Issue 或 PR，共同改进该扩展！
