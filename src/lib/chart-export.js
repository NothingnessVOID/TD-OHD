/** Rasterize the chart that is already on screen. Works on static hosting and
 * offline; no request containing birth details is sent to a card endpoint. */
export async function chartPng(svg, scale = 2) {
  if (!(svg instanceof SVGSVGElement)) throw new Error('No bodygraph to export.');
  const clone = svg.cloneNode(true);
  const box = svg.viewBox.baseVal;
  const width = box.width || 851;
  const height = box.height || 1310;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const originalNodes = [svg, ...svg.querySelectorAll('*')];
  const clonedNodes = [clone, ...clone.querySelectorAll('*')];
  const styles = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity',
    'font-family', 'font-size', 'font-weight', 'text-anchor', 'paint-order',
    'stroke-linecap', 'stroke-linejoin'];
  originalNodes.forEach((node, index) => {
    const computed = getComputedStyle(node);
    for (const property of styles) {
      const value = computed.getPropertyValue(property);
      if (value) clonedNodes[index].style.setProperty(property, value);
    }
  });
  const source = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable.');
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('PNG encoding failed.')), 'image/png'));
    return checkedPng(blob);
  } finally { URL.revokeObjectURL(url); }
}

/** Reject empty or mislabeled exports before reporting a successful save. */
export async function checkedPng(blob) {
  if (!(blob instanceof Blob) || blob.type !== 'image/png' || blob.size < 24)
    throw new Error('Invalid PNG export.');
  const header = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  if (![137,80,78,71,13,10,26,10].every((byte, index) => header[index] === byte))
    throw new Error('Invalid PNG signature.');
  return blob;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
