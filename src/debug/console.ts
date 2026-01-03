const debugEnabled = String(import.meta.env.DEBUG || '').toLowerCase() === 'true';

if (!debugEnabled) {
  console.log = () => {};
}

export { debugEnabled };
