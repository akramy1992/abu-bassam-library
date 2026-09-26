#!/usr/bin/env node
'use strict';

const qrcode = require('../web/qrcode.js');

const payload = process.argv[2] || '';
const level = process.argv[3] || 'M';
const qr = qrcode(0, level);
qr.addData(payload, 'Byte');
qr.make();

const count = qr.getModuleCount();
const rows = [];
for (let row = 0; row < count; row += 1) {
  let line = '';
  for (let col = 0; col < count; col += 1) {
    line += qr.isDark(row, col) ? '1' : '0';
  }
  rows.push(line);
}
process.stdout.write(JSON.stringify({ count, rows }));
