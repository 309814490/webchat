// Check module resolution
console.log('Resolve paths for electron:');
try {
  console.log('  resolved to:', require.resolve('electron'));
} catch(e) {
  console.log('  resolve error:', e.message);
}
console.log('Is running in Electron:', !!process.versions.electron);
console.log('Electron version:', process.versions.electron);
