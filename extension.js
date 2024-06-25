const vscode = require("vscode")

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("validate", () => {
      vscode.window.showInformationMessage("it works")
    }),
  )
}

module.exports = {activate}
