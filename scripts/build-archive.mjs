import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const sourceRoot = 'E:\\Portfolio\\Inspo';
const distRoot = path.join(projectRoot, 'dist');
const mediaRoot = path.join(distRoot, 'media');
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const metadata = JSON.parse(await fs.readFile(path.join(projectRoot, 'data', 'collections.json'), 'utf8'));
const captionData = JSON.parse(await fs.readFile(path.join(projectRoot, 'data', 'image-captions.json'), 'utf8'));

function toWebPath(value) {
  return value.split(path.sep).join('/');
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

async function listImages(folder, relative = '') {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => naturalCompare(a.name, b.name))) {
    const absolute = path.join(folder, entry.name);
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await listImages(absolute, rel));
    else if (imageExtensions.has(path.extname(entry.name).toLowerCase())) result.push({ absolute, relative: rel });
  }
  return result;
}

await fs.mkdir(mediaRoot, { recursive: true });
const collections = [];

for (let collectionIndex = 0; collectionIndex < metadata.length; collectionIndex += 1) {
  const item = metadata[collectionIndex];
  const collectionId = `c${String(collectionIndex + 1).padStart(2, '0')}`;
  const sourcePath = path.join(sourceRoot, item.sourceFolder);
  const outputPath = path.join(mediaRoot, collectionId);
  await fs.mkdir(outputPath, { recursive: true });
  const files = await listImages(sourcePath);
  const sectionNames = [...new Set(files.map(file => {
    const parts = file.relative.split(path.sep);
    return parts.length > 1 ? parts[0] : 'Images';
  }))];
  const images = [];

  for (let imageIndex = 0; imageIndex < files.length; imageIndex += 1) {
    const file = files[imageIndex];
    const extension = path.extname(file.relative).toLowerCase();
    const outputName = `${String(imageIndex + 1).padStart(4, '0')}${extension}`;
    await fs.copyFile(file.absolute, path.join(outputPath, outputName));
    const parts = file.relative.split(path.sep);
    const caption = captionData.captions[`${item.sourceFolder}/${toWebPath(file.relative)}`];
    const source = caption ? captionData.sources[caption.source] : null;
    images.push({
      src: `media/${collectionId}/${outputName}`,
      section: parts.length > 1 ? parts[0] : 'Images',
      alt: caption?.text || `${item.title}, image ${imageIndex + 1}`,
      description: caption?.text || '',
      source: source ? { label: source.label, url: source.url } : null
    });
  }

  collections.push({
    id: collectionId,
    title: item.title,
    subtitle: item.subtitle,
    type: item.type,
    year: item.year,
    decade: item.decade,
    people: item.people,
    subjects: item.subjects,
    downloads: item.downloads || [],
    status: item.status || 'Catalogued',
    imageCount: images.length,
    sections: sectionNames,
    cover: images[Math.min(item.coverIndex || 0, Math.max(images.length - 1, 0))]?.src || '',
    images
  });
}

const payload = `window.ARCHIVE_DATA = ${JSON.stringify({ generatedAt: new Date().toISOString(), collections })};\n`;
await fs.writeFile(path.join(distRoot, 'archive-data.js'), payload, 'utf8');
console.log(`Built ${collections.length} collections and ${collections.reduce((sum, item) => sum + item.imageCount, 0)} images.`);
