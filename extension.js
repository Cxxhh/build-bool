const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// 用于存储从脚本中解析出的命令
let flashCommand = '';

// 默认脚本文件名和分隔符 - SCRIPT_FILENAME 将在 activate 中动态设置
let SCRIPT_FILENAME = ''; // 将在 activate 中基于用户选择设置
const FLASH_MARKER = '#F';

let sharedTerminal = null; // 用于保存共享终端实例
const SHARED_TERMINAL_NAME = "Build/Rebuild/Clean Terminal";
const SCRIPT_TYPE_KEY = 'extension.selectedScriptType'; // 用于工作区状态存储

// 将按钮实例提升到更广的作用域，以便更新
let compileBtn, flashBtn, cleanBtn;

async function parseScriptAndSetupCommands(context) {
    flashCommand = '';
    if (!SCRIPT_FILENAME) {
        // vscode.window.showWarningMessage('尚未选择脚本文件。请重新加载工作区或检查设置。');
        return;
    }

    const files = await vscode.workspace.findFiles(`**/${SCRIPT_FILENAME}`, null, 1);
    if (files.length > 0) {
        const scriptPath = files[0].fsPath;
        try {
            const content = fs.readFileSync(scriptPath, 'utf-8');
            const lines = content.split('\n');
            let currentSection = null;
            for (const line of lines) {
                if (line.trim().startsWith(FLASH_MARKER)) {
                    currentSection = 'flash';
                    continue;
                }
                if (currentSection && line.trim() && !line.trim().startsWith('#') && !(SCRIPT_FILENAME.endsWith('.bat') && line.trim().toLowerCase().startsWith('rem'))) {
                    switch (currentSection) {
                        case 'flash':
                            flashCommand += (flashCommand ? '\n' : '') + line.trim();
                            break;
                    }
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`读取或解析 ${SCRIPT_FILENAME} 失败: ${error.message}`);
        }
    } else {
        // vscode.window.showWarningMessage(`未在工作区找到 ${SCRIPT_FILENAME} 文件。按钮命令将为空。`);
    }
}

function executeCommandInTerminal(commandName, scriptCommand) {
    if (scriptCommand && scriptCommand.trim()) {
        let terminalOptions = { name: SHARED_TERMINAL_NAME };
        if (SCRIPT_FILENAME.endsWith('.bat')) {
            terminalOptions.shellPath = 'cmd.exe'; // 为 .bat 文件指定 cmd.exe
            terminalOptions.shellArgs = []; // cmd.exe 可能不需要特定的 shellArgs 来执行命令
        }

        if (!sharedTerminal || sharedTerminal.exitStatus !== undefined || 
            (SCRIPT_FILENAME.endsWith('.bat') && sharedTerminal.name !== SHARED_TERMINAL_NAME + ' (CMD)') || 
            (!SCRIPT_FILENAME.endsWith('.bat') && sharedTerminal.name === SHARED_TERMINAL_NAME + ' (CMD)')) {
            
            if(sharedTerminal && sharedTerminal.exitStatus === undefined) sharedTerminal.dispose(); // Dispose if type mismatch

            if (SCRIPT_FILENAME.endsWith('.bat')) {
                terminalOptions.name = SHARED_TERMINAL_NAME + ' (CMD)';
            } else {
                terminalOptions.name = SHARED_TERMINAL_NAME; // Default name for sh
            }
            sharedTerminal = vscode.window.createTerminal(terminalOptions);
        }

        if (SCRIPT_FILENAME.endsWith('.bat')) {
            // 对于 .bat 文件，直接发送命令
            scriptCommand.split('\n').forEach(cmdLine => {
                if (cmdLine.trim()) sharedTerminal.sendText(cmdLine.trim());
            });
        } else {
            // 对于 .sh 文件，使用 bash heredoc
            sharedTerminal.sendText(`bash << 'EOF'`);
            sharedTerminal.sendText(`set +x`);
            sharedTerminal.sendText(scriptCommand);
            sharedTerminal.sendText(`EOF`);
        }
        sharedTerminal.show();
    } else {
        vscode.window.showInformationMessage(`命令 ${commandName} 的脚本片段为空或无效。请检查 ${SCRIPT_FILENAME}。`);
    }
}

function executeRunScript() {
    if (!SCRIPT_FILENAME) {
        vscode.window.showErrorMessage('尚未选择执行脚本，请重新加载工作区。');
        return;
    }

    let terminalOptions = { name: SHARED_TERMINAL_NAME };
    if (SCRIPT_FILENAME.endsWith('.bat')) {
        terminalOptions.shellPath = 'cmd.exe'; // 为 .bat 文件指定 cmd.exe
        terminalOptions.shellArgs = []; // cmd.exe 可能不需要特定的 shellArgs 来执行命令
    }

    // 检查是否需要因为 shell 类型不匹配而重新创建终端
    // 或者终端已关闭
    if (!sharedTerminal || sharedTerminal.exitStatus !== undefined || 
        (SCRIPT_FILENAME.endsWith('.bat') && sharedTerminal.name !== SHARED_TERMINAL_NAME + ' (CMD)') || 
        (!SCRIPT_FILENAME.endsWith('.bat') && sharedTerminal.name === SHARED_TERMINAL_NAME + ' (CMD)')) {
        
        if(sharedTerminal && sharedTerminal.exitStatus === undefined) sharedTerminal.dispose(); // Dispose if type mismatch or to switch

        if (SCRIPT_FILENAME.endsWith('.bat')) {
            terminalOptions.name = SHARED_TERMINAL_NAME + ' (CMD)';
        } else {
            terminalOptions.name = SHARED_TERMINAL_NAME; // Default name for sh
        }
        sharedTerminal = vscode.window.createTerminal(terminalOptions);
    }

    if (SCRIPT_FILENAME.endsWith('.bat')) {
        // 对于 .bat 文件，确保路径正确，cmd.exe 通常可以直接执行
        sharedTerminal.sendText(SCRIPT_FILENAME); 
    } else {
        sharedTerminal.sendText(`./${SCRIPT_FILENAME}`); // Linux/macOS/Git Bash 需要 ./
    }
    sharedTerminal.show();
}

function executeCleanCommand() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('请先打开一个工作区。');
        return;
    }
    const buildFolderPath = path.join(workspaceFolders[0].uri.fsPath, 'build');
    try {
        if (fs.existsSync(buildFolderPath)) {
            fs.rmSync(buildFolderPath, { recursive: true, force: true });
            vscode.window.showInformationMessage('Build 文件夹已成功删除。');
        } else {
            vscode.window.showInformationMessage('Build 文件夹不存在，无需删除。');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`删除 Build 文件夹失败: ${error.message}`);
    }
}

async function promptForScriptChoice(context) {
    const scriptChoice = await vscode.window.showQuickPick(['run.sh', 'run.bat'], {
        placeHolder: '请选择用于 Build/Rebuild 的脚本文件 (此选择将保存在当前工作区)',
        ignoreFocusOut: true
    });
    
    if (scriptChoice) {
        SCRIPT_FILENAME = scriptChoice;
        await context.workspaceState.update(SCRIPT_TYPE_KEY, scriptChoice); // Corrected: use scriptChoice here
        vscode.window.showInformationMessage(`已选择 ${SCRIPT_FILENAME} 作为脚本文件。`);
        return true;
    } else {
        // 如果用户取消选择，可以保留旧的 SCRIPT_FILENAME 或设置默认值
        // 为保持一致性，如果之前有选择，则保留；如果没有，则可能需要提示或用默认
        if (!context.workspaceState.get(SCRIPT_TYPE_KEY)) {
             SCRIPT_FILENAME = 'run.sh'; // 默认回退到 run.sh 如果之前从未选择过
             await context.workspaceState.update(SCRIPT_TYPE_KEY, SCRIPT_FILENAME); 
             vscode.window.showWarningMessage('未选择脚本文件，将默认使用 run.sh。');
        } else {
            SCRIPT_FILENAME = context.workspaceState.get(SCRIPT_TYPE_KEY); // 保持之前的选择
        }
        return false;
    }
}

function updateStatusBarItems() {
    if (compileBtn) {
        compileBtn.tooltip = `执行构建命令 (./${SCRIPT_FILENAME})`;
    }
    if (flashBtn) {
        flashBtn.tooltip = `执行重建命令 (Clean then Build using ./${SCRIPT_FILENAME})`;
    }
    // Clean button tooltip doesn't depend on SCRIPT_FILENAME
}

async function initializeScriptChoiceAndCommands(context) {
    let selectedScript = context.workspaceState.get(SCRIPT_TYPE_KEY);
    if (!selectedScript) {
        const userMadeChoice = await promptForScriptChoice(context);
        if (!userMadeChoice && !SCRIPT_FILENAME) { // 如果用户取消且无先前选择，则可能需要处理
             // SCRIPT_FILENAME 会在 promptForScriptChoice 中设置默认值
        }
    } else {
        SCRIPT_FILENAME = selectedScript;
    }
    await parseScriptAndSetupCommands(context);
    updateStatusBarItems();
}

async function activate (context) {
  // vscode.window.showInformationMessage('插件已激活，正在创建按钮…');

  // 创建按钮实例
  compileBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,  1);
  compileBtn.text = '⚙️ Build';
  compileBtn.command = 'extension.compile';
  compileBtn.show();
  context.subscriptions.push(compileBtn);

  flashBtn   = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  flashBtn.text = '🔄 Rebuild';
  flashBtn.command = 'extension.rebuild';
  flashBtn.show();
  context.subscriptions.push(flashBtn);

  cleanBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1);
  cleanBtn.text = '🧹 Clean';
  cleanBtn.tooltip = '删除 build 文件夹';
  cleanBtn.command = 'extension.clean';
  cleanBtn.show();
  context.subscriptions.push(cleanBtn);

  await initializeScriptChoiceAndCommands(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.compile', () => executeRunScript()),
        vscode.commands.registerCommand('extension.rebuild',   () => {
          executeCleanCommand();
          executeRunScript();
        }),
        vscode.commands.registerCommand('extension.clean',   () => executeCleanCommand())
    );

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (SCRIPT_FILENAME && path.basename(document.fileName) === SCRIPT_FILENAME) { // 确保 SCRIPT_FILENAME 已定义
                await parseScriptAndSetupCommands(context);
            }
        })
    );

    // 命令：更改/选择脚本文件
    context.subscriptions.push(vscode.commands.registerCommand('extension.changeScriptFile', async () => {
        await context.workspaceState.update(SCRIPT_TYPE_KEY, undefined); // 清除旧选择
        const userMadeChoice = await promptForScriptChoice(context); // 重新提示选择
        if (userMadeChoice) {
          await parseScriptAndSetupCommands(context); // 如果做了新选择，重新解析
        }
        // 如果用户取消选择，promptForScriptChoice 会处理 SCRIPT_FILENAME (保留旧的或设默认)
        // 确保 SCRIPT_FILENAME 有效后再解析和更新按钮
        if (SCRIPT_FILENAME) {
          await parseScriptAndSetupCommands(context);
        }
        updateStatusBarItems(); // 更新按钮提示
        // vscode.window.showInformationMessage('脚本选择流程已完成。'); // 可选提示
    }));

    context.subscriptions.push({
        dispose: () => {
            if (sharedTerminal) {
                sharedTerminal.dispose();
            }
        }
    });
}

function deactivate () {
    if (sharedTerminal) {
        sharedTerminal.dispose();
    }
}

module.exports = { activate, deactivate };
