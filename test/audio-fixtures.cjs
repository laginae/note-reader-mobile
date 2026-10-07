function mp3() {
  const bytes = new Uint8Array(417);
  bytes.set([255, 251, 144, 0]);
  return bytes;
}
function wave() {
  const bytes = new Uint8Array(48);
  const view = new DataView(bytes.buffer);
  const text = (offset, value) => bytes.set(new TextEncoder().encode(value), offset);
  text(0, 'RIFF'); view.setUint32(4, 40, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, 24000, true); view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, 4, true);
  return bytes;
}
const jsonBytes = value => new TextEncoder().encode(JSON.stringify(value)).buffer;
const base64 = value => btoa(String.fromCharCode(...value));
module.exports = {mp3, wave, jsonBytes, base64};
