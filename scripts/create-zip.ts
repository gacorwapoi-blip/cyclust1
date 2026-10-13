import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

class ZipArchive {
  files: Array<{
    name: string;
    crc: number;
    compressedSize: number;
    uncompressedSize: number;
    data: Buffer;
  }> = [];

  addFile(name: string, contentBuffer: Buffer) {
    const cleanName = name.split(path.sep).join('/').replace(/^\//, '');
    const uncompressedSize = contentBuffer.length;
    const compressedData = zlib.deflateRawSync(contentBuffer, { level: 9 });
    const compressedSize = compressedData.length;
    const crc = this.calculateCrc32(contentBuffer);
    this.files.push({
      name: cleanName,
      crc,
      compressedSize,
      uncompressedSize,
      data: compressedData
    });
  }

  calculateCrc32(buf: Buffer): number {
    let crc = ~0;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        const bit = (byte ^ crc) & 1;
        crc >>>= 1;
        if (bit) crc = (crc ^ 0xEDB88320) >>> 0;
        byte >>>= 1;
      }
    }
    return (~crc) >>> 0;
  }

  generateBuffer(): Buffer {
    const localHeaders: Buffer[] = [];
    const cdHeaders: Buffer[] = [];
    let offset = 0;

    for (const f of this.files) {
      const nameBuf = Buffer.from(f.name, 'utf8');

      // Local File Header (30 bytes + filename)
      const lfh = Buffer.alloc(30 + nameBuf.length);
      lfh.writeUInt32LE(0x04034b50, 0); // signature
      lfh.writeUInt16LE(20, 4);         // version needed (2.0)
      lfh.writeUInt16LE(0, 6);          // flags
      lfh.writeUInt16LE(8, 8);          // compression (deflate)
      lfh.writeUInt16LE(0x4000, 10);     // mod time
      lfh.writeUInt16LE(0x4000, 12);     // mod date
      lfh.writeUInt32LE(f.crc, 14);     // crc-32
      lfh.writeUInt32LE(f.compressedSize, 18);
      lfh.writeUInt32LE(f.uncompressedSize, 22);
      lfh.writeUInt16LE(nameBuf.length, 26);
      lfh.writeUInt16LE(0, 28);         // extra len
      nameBuf.copy(lfh, 30);

      const fileOffset = offset;
      localHeaders.push(lfh);
      localHeaders.push(f.data);
      offset += lfh.length + f.data.length;

      // Central Directory Header (46 bytes + filename)
      const cdh = Buffer.alloc(46 + nameBuf.length);
      cdh.writeUInt32LE(0x02014b50, 0); // signature
      cdh.writeUInt16LE(20, 4);         // version made by
      cdh.writeUInt16LE(20, 6);         // version needed
      cdh.writeUInt16LE(0, 8);          // flags
      cdh.writeUInt16LE(8, 10);         // compression (deflate)
      cdh.writeUInt16LE(0x4000, 12);    // mod time
      cdh.writeUInt16LE(0x4000, 14);    // mod date
      cdh.writeUInt32LE(f.crc, 16);     // crc-32
      cdh.writeUInt32LE(f.compressedSize, 20);
      cdh.writeUInt32LE(f.uncompressedSize, 24);
      cdh.writeUInt16LE(nameBuf.length, 28);
      cdh.writeUInt16LE(0, 30);         // extra len
      cdh.writeUInt16LE(0, 32);         // comment len
      cdh.writeUInt16LE(0, 34);         // disk start
      cdh.writeUInt16LE(0, 36);         // internal attrs
      cdh.writeUInt32LE(0, 38);         // external attrs
      cdh.writeUInt32LE(fileOffset, 42); // offset
      nameBuf.copy(cdh, 46);

      cdHeaders.push(cdh);
    }

    const cdStart = offset;
    const cdBuf = Buffer.concat(cdHeaders);
    const cdSize = cdBuf.length;

    // End of Central Directory (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);  // signature
    eocd.writeUInt16LE(0, 4);           // disk number
    eocd.writeUInt16LE(0, 6);           // cd start disk
    eocd.writeUInt16LE(this.files.length, 8);  // entries on disk
    eocd.writeUInt16LE(this.files.length, 10); // total entries
    eocd.writeUInt32LE(cdSize, 12);     // cd size
    eocd.writeUInt32LE(cdStart, 16);    // cd offset
    eocd.writeUInt16LE(0, 20);          // comment len

    return Buffer.concat([...localHeaders, cdBuf, eocd]);
  }
}

function collectFiles(dir: string, baseDir = ''): Array<{ fullPath: string; relPath: string }> {
  let results: Array<{ fullPath: string; relPath: string }> = [];
  const list = fs.readdirSync(dir);
  
  const ignoredPatterns = [
    'node_modules',
    '.git',
    'dist',
    '.cache',
    'create-zip.ts',
    'trade-quant-vps.zip',
    '.aistudio',
    '.npm',
    'create-zip.js'
  ];

  for (const item of list) {
    if (ignoredPatterns.includes(item)) continue;
    const fullPath = path.join(dir, item);
    const relPath = baseDir ? path.join(baseDir, item) : item;
    
    // Skip if target file is zip inside public
    if (item.endsWith('.zip')) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(collectFiles(fullPath, relPath));
    } else {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

const rootDir = process.cwd();
const files = collectFiles(rootDir);
console.log(`Packaging ${files.length} source code files...`);

const zip = new ZipArchive();
for (const file of files) {
  const content = fs.readFileSync(file.fullPath);
  zip.addFile(file.relPath, content);
}

const zipBuffer = zip.generateBuffer();

// Ensure public directory exists
const publicDir = path.join(rootDir, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.join(publicDir, 'trade-quant-vps.zip');
fs.writeFileSync(outputPath, zipBuffer);

const rootOutputPath = path.join(rootDir, 'trade-quant-vps.zip');
fs.writeFileSync(rootOutputPath, zipBuffer);

console.log(`Success! Zip archive generated at: ${outputPath}`);
console.log(`Archive file size: ${(zipBuffer.length / 1024).toFixed(2)} KB`);
