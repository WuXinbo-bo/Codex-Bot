const { app, dialog } = require('electron');
if (process.env.METABOT_LEGACY === '1') {
  process.env.METABOT_HOME = process.env.METABOT_HOME || require('node:path').join(require('node:os').homedir(), '.metabot-legacy');
  require('./main.cjs');
} else {
  app.whenReady().then(() => {
    try {
      require('../scripts/start.cjs').startNative().once('spawn', () => app.quit()).once('error', error => {
        dialog.showErrorBox('Meta Bot', error.message); app.quit();
      });
    } catch (error) { dialog.showErrorBox('Meta Bot', error.message); app.quit(); }
  });
}
