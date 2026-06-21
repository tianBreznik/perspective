/** Entry shell — loads Three.js in a separate chunk before the app module runs. */
performance.mark('boot-start');
import('./src/app.js').catch((err) => {
    console.error('Failed to start app:', err);
});
