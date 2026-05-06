try {
  const electron = require('electron');
  console.log('typeof electron:', typeof electron);
  console.log('electron value:', electron);
  if (typeof electron === 'string') {
    console.log('ERROR: require("electron") returned a string path, not the API');
    process.exit(1);
  }
  const { app } = electron;
  console.log('app:', typeof app);
  if (app) {
    app.whenReady().then(() => {
      console.log('Electron app ready!');
      app.quit();
    });
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
