#!/usr/bin/env bash
# ===BUILD===
echo "Build process finished"

# ===COMPILE===
# arm-none-eabi-gcc -c main.c -o main.o
echo "Compile process finished"

# ===FLASH===
# openocd -f board/stm32f4discovery.cfg -c "program build/xxx.elf verify reset exit"
echo "Flash process finished"