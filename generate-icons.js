#!/usr/bin/env node
// generate-icons.js - 生成扩展图标
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 背景圆角矩形
  const r = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = '#1976D2';
  ctx.fill();

  // 相机图标
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.55;

  // 相机主体
  ctx.fillStyle = 'white';
  ctx.beginPath();
  const bx = cx - s/2, by = cy - s*0.35, bw = s, bh = s * 0.65;
  ctx.roundRect(bx, by, bw, bh, size * 0.06);
  ctx.fill();

  // 镜头
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.05, s * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#1976D2';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.05, s * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  // 取景器小矩形
  ctx.fillStyle = '#1976D2';
  ctx.fillRect(bx + bw * 0.08, by + bh * 0.12, bw * 0.2, bh * 0.25);

  const outPath = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`生成: ${outPath}`);
});
