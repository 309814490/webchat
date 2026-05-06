const electron = require('electron');
console.log('type:', typeof electron);
console.log('keys:', Object.keys(electron).join(', '));
console.log('app type:', typeof electron.app);
if (electron.app) {
  electron.app.whenReady().then(() => {
    console.log('Electron ready!');
    electron.app.quit();
  });
} else {
  console.log('electron value:', electron);
  process.exit(1);
}
