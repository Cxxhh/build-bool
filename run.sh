#!/bin/bash
set -e
set -u

# ===== 创建并进入 build 目录 =====
mkdir -p build
cd build

# ===== 配置（首次运行）=====
if [ ! -f "build.ninja" ]; then
    echo "配置"
    cmake -DCMAKE_BUILD_TYPE=Debug \
          -DCMAKE_EXPORT_COMPILE_COMMANDS=TRUE \
          -S .. \
          -B . \
          -G Ninja
fi

# ===== 编译 =====
echo "编译"
cmake --build . -- -j16

# ===== 修正路径（可选）=====
if [ -f compile_commands.json ]; then
    echo "修正路径"
    sed -i "s|/a/|A:/|g; s|/b/|B:/|g; s|/c/|C:/|g; s|/d/|D:/|g; s|/e/|E:/|g; s|/f/|F:/|g; s|/g/|G:/|g; s|/h/|H:/|g; s|/i/|I:/|g; s|/j/|J:/|g; s|/k/|K:/|g; s|/l/|L:/|g; s|/m/|M:/|g; s|/n/|N:/|g; s|/o/|O:/|g; s|/p/|P:/|g; s|/q/|Q:/|g; s|/r/|R:/|g; s|/s/|S:/|g; s|/t/|T:/|g; s|/u/|U:/|g; s|/v/|V:/|g; s|/w/|W:/|g; s|/x/|X:/|g; s|/y/|Y:/|g; s|/z/|Z:/|g" compile_commands.json
fi

# ===== 查找 ELF 文件 =====
elf_file=$(find . -maxdepth 1 -name "*.elf" | head -n 1)
[ -z "$elf_file" ] && echo "错误：未找到ELF" && exit 1

# ===== 生成 BIN 和 HEX =====
echo "生成文件"
bin_file="${elf_file%.elf}.bin"
hex_file="${elf_file%.elf}.hex"
arm-none-eabi-objcopy -O binary "$elf_file" "$bin_file"
arm-none-eabi-objcopy -O ihex "$elf_file" "$hex_file"
arm-none-eabi-size "$elf_file"

# ===== 烧录 =====
echo "烧录"
probe-rs download --chip MSPM0G3507 "$elf_file"

# ===== 复位 =====
echo "复位"
probe-rs reset --chip MSPM0G3507
