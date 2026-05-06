// 最简单的 Electron 测试
const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 400, height: 300 });
  win.loadURL('data:text/html,<h1>Electron Works!</h1>');
  
  setTimeout(() => {
    console.log('Electron is working correctly!');
    app.quit();
  }, 2000);
});
