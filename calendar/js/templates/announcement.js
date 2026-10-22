/* قالب «اطلاعیه رسمی» — برای پیام‌ها و اعلانات مهم گروه
   - ظاهر رسمی شبیه تابلوی اعلانات (نوار بالا + نوار تاریخ + کادر متن)
   - پشتیبانی از متن طولانی با صفحه‌بندی خودکار
   - امضا در انتهای صفحهٔ آخر
   - خروجی PNG/SVG/HTML چندصفحه‌ای در ZIP
*/
(function(){
'use strict';

const AW = 1240, AH = 1754;
const M = 50;
const HEADER_BAR_H = 100;
const DATE_BAR_H = 90;
const BODY_TOP = M + HEADER_BAR_H + DATE_BAR_H + 40;
const BODY_BOTTOM = 1620;
const FOOTER_Y = 1640;
const FOOTER_H = 84;
const PAD_X = 40;
const PAD_Y = 30;
const CONTENT_W = AW - M*2 - PAD_X*2 - 20;
const LINE_H = 36;
const FONT_SIZE = 22;
const SIGN_H = 100;
const NOTE_FONT = '500 ' + FONT_SIZE + 'px Vazirmatn, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Noto Emoji", sans-serif';

function computeAllPages(text) {
  const oldFont = ctx.font;
  ctx.font = NOTE_FONT;
  const lines = wrapText(String(text || ''), CONTENT_W, NOTE_FONT);
  ctx.font = oldFont;

  const availP1 = Math.floor((BODY_BOTTOM - BODY_TOP - SIGN_H) / LINE_H);
  const availMid = Math.floor((BODY_BOTTOM - BODY_TOP) / LINE_H);

  if (!lines.length) return [[]];
  if (lines.length <= availP1) return [lines];

  const pages = [];
  let idx = 0;
  pages.push(lines.slice(0, availP1));
  idx = availP1;
  while (idx + availMid < lines.length) {
    pages.push(lines.slice(idx, idx + availMid));
    idx += availMid;
  }
  pages.push(lines.slice(idx));
  return pages;
}

function drawHeaderBar(i) {
  const hy = M;
  const hh = HEADER_BAR_H;
  const hw = AW - M*2;

  const g = ctx.createLinearGradient(M, hy, M + hw, hy + hh);
  g.addColorStop(0, '#04231c');
  g.addColorStop(0.5, '#063d35');
  g.addColorStop(1, '#04231c');
  ctx.fillStyle = g;
  rr(M, hy, hw, hh, 18);
  ctx.fill();

  ctx.strokeStyle = '#d4a437';
  ctx.lineWidth = 2.5;
  rr(M + 6, hy + 6, hw - 12, hh - 12, 14);
  ctx.stroke();

  // آیکون مگافون (راست)
  const iCx = AW - M - 55;
  const iCy = hy + hh / 2;
  ctx.fillStyle = '#d4a437';
  ctx.beginPath();
  ctx.arc(iCx, iCy, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#063d35';
  ctx.beginPath();
  ctx.moveTo(iCx - 14, iCy + 4);
  ctx.lineTo(iCx + 2, iCy - 12);
  ctx.lineTo(iCx + 2, iCy + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(iCx + 2, iCy + 2, 14, 8);

  // عنوان «اطلاعیه رسمی»
  ctx.fillStyle = '#f0c34f';
  ctx.font = '900 42px Vazirmatn';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('اطلاعیه رسمی', iCx - 42, iCy);

  // نام کانال (چپ)
  const chName = (chEl.value || '').replace('@','').trim() || 'دیار قدمگاه';
  ctx.fillStyle = '#fff';
  ctx.font = '800 ' + fit(chName, 260, 26, 800) + 'px Vazirmatn';
  ctx.textAlign = 'left';
  ctx.fillText(chName, M + 100, iCy);

  // لوگو (چپ)
  if (typeof drawLogoBadge === 'function') {
    drawLogoBadge(M + 55, iCy, 30, {
      ringOuter: '#d4a437', ringInner: '#063d35', bg: '#fffdf8',
      placeholderColor: '#063d35', placeholderFont: 9
    });
  }
}

function drawDateBar(i) {
  const ty = M + HEADER_BAR_H + 20;
  const th = DATE_BAR_H;
  const tw = AW - M*2;

  ctx.fillStyle = '#f7f1d9';
  rr(M, ty, tw, th, 14);
  ctx.fill();
  ctx.strokeStyle = '#d4a437';
  ctx.lineWidth = 2;
  rr(M, ty, tw, th, 14);
  ctx.stroke();

  const cellW = tw / 4;
  const dates = [
    { label: 'روز هفته', value: WD[i.wd] },
    { label: 'شمسی', value: fa(i.s.d) + ' ' + FA_M[i.s.m-1] + ' ' + fa(i.s.y) },
    { label: 'قمری', value: fa(i.h.d) + ' ' + AR_M[i.h.m-1] + ' ' + fa(i.h.y) },
    { label: 'میلادی', value: i.g.d + ' ' + EN_M[i.g.m-1] + ' ' + i.g.y }
  ];

  dates.forEach((d, k) => {
    const cx = M + cellW * k + cellW / 2;
    const cy = ty + th / 2;

    if (k > 0) {
      ctx.strokeStyle = 'rgba(212,164,55,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(M + cellW * k, ty + 18);
      ctx.lineTo(M + cellW * k, ty + th - 18);
      ctx.stroke();
    }

    ctx.fillStyle = '#7a8a84';
    ctx.font = '700 14px Vazirmatn';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.label, cx, cy - 22);

    ctx.fillStyle = '#10201c';
    const fs = fit(d.value, cellW - 30, 22, 800);
    ctx.font = '800 ' + fs + 'px Vazirmatn';
    ctx.fillText(d.value, cx, cy + 12);
  });
}

function drawContentBox(lines, pageNum, totalPages) {
  const bx = M + PAD_X - 10;
  const by = BODY_TOP;
  const bw = AW - M*2 - (PAD_X - 10) * 2;
  const bh = BODY_BOTTOM - BODY_TOP;

  ctx.fillStyle = '#fffdf8';
  rr(bx, by, bw, bh, 16);
  ctx.fill();

  ctx.strokeStyle = '#063d35';
  ctx.lineWidth = 3;
  rr(bx, by, bw, bh, 16);
  ctx.stroke();

  ctx.strokeStyle = '#d4a437';
  ctx.lineWidth = 1.2;
  rr(bx + 8, by + 8, bw - 16, bh - 16, 10);
  ctx.stroke();

  [[bx+15, by+15], [bx+bw-15, by+15], [bx+15, by+bh-15], [bx+bw-15, by+bh-15]].forEach(([cx, cy]) => {
    ctx.fillStyle = '#d4a437';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#10201c';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = NOTE_FONT;

  const textX = bx + bw - 30;
  const textTop = by + PAD_Y;

  lines.forEach((line, k) => {
    ctx.fillText(line, textX, textTop + k * LINE_H + LINE_H / 2);
  });

  if (pageNum === totalPages && lines.length > 0) {
    const signY = BODY_BOTTOM - SIGN_H / 2 - 10;
    ctx.strokeStyle = '#d4a437';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx + bw - 400, signY - 20);
    ctx.lineTo(bx + bw - 30, signY - 20);
    ctx.stroke();

    ctx.fillStyle = '#063d35';
    ctx.font = '700 20px Vazirmatn';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('با احترام، مدیریت دیار قدمگاه', bx + bw - 30, signY + 10);
  }
}

function drawFooter(pageNum, totalPages) {
  const fx = M;
  const fy = FOOTER_Y;
  const fw = AW - M*2;
  const fh = FOOTER_H;

  ctx.fillStyle = '#063d35';
  rr(fx, fy, fw, fh, 16);
  ctx.fill();
  ctx.strokeStyle = '#d4a437';
  ctx.lineWidth = 2;
  rr(fx + 4, fy + 4, fw - 8, fh - 8, 12);
  ctx.stroke();

  const fcy = fy + fh / 2;

  ctx.fillStyle = '#f0c34f';
  if (totalPages > 1) {
    ctx.font = '800 20px Vazirmatn';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('صفحهٔ ' + fa(pageNum) + ' از ' + fa(totalPages), fx + fw - 30, fcy);
  } else {
    ctx.font = '700 16px Vazirmatn';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('دیار قدمگاه', fx + fw - 30, fcy);
  }

  const ph = phEl.value || '';
  if (ph || (document.getElementById('phoneLabel') && document.getElementById('phoneLabel').value.trim())) {
    if (typeof drawRoundIcon === 'function') {
      drawRoundIcon('phone', fx + 40, fcy, 18, '#d4a437', '#063d35');
    }
    ctx.fillStyle = '#f0c34f';
    ctx.font = '700 18px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.direction = 'ltr';
    drawPhoneInline(fx + 72, fcy, {align:'left', phoneSize:18, labelSize:12, fill:'#f0c34f', maxWidth:340});
    ctx.restore();
  }

  const url = typeof validUrl === 'function' ? validUrl(chUrlEl.value) : null;
  const showQR = showQREl.checked && !!url;
  if (showQR) {
    const qrSize = 68;
    const qrX = fx + fw / 2 - qrSize / 2;
    const qrY = fy + (fh - qrSize) / 2;
    if (typeof drawQRCanvas === 'function' && typeof getQRMatrix === 'function') {
      drawQRCanvas(getQRMatrix(url), qrX, qrY, qrSize);
    }
  }
}

function drawAnnouncement(i) {
  const text = (noteEl.value || '').trim();
  const pages = computeAllPages(text);
  const total = pages.length;
  const current = Math.max(1, Math.min(window.__a4PreviewPage || 1, total));
  window.__a4PreviewPage = current;
  window.__a4PageInfo = { current, total, totalNoteLines: pages.reduce((s, p) => s + p.length, 0) };

  const bg = ctx.createLinearGradient(0, 0, 0, AH);
  bg.addColorStop(0, '#f4f8f5');
  bg.addColorStop(1, '#e4ece7');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, AW, AH);

  ctx.strokeStyle = '#063d35';
  ctx.lineWidth = 5;
  rr(20, 20, AW - 40, AH - 40, 24);
  ctx.stroke();
  ctx.strokeStyle = '#d4a437';
  ctx.lineWidth = 2;
  rr(30, 30, AW - 60, AH - 60, 18);
  ctx.stroke();

  drawHeaderBar(i);
  drawDateBar(i);

  const currentLines = pages[current - 1] || [];
  drawContentBox(currentLines, current, total);

  drawFooter(current, total);
}

registerTemplate({
  id: 'announcement',
  label: 'اطلاعیه رسمی 📢',
  short: 'اطلاعیه',
  group: 'عمومی',
  dims: { w: AW, h: AH },
  skipEventBadge: true,
  multipage: true,
  photoArea: { x: -9999, y: -9999, w: 0, h: 0 },
  clickRegions: {
    phone: { x: 50, y: 1640, w: 400, h: 84 },
    channel: [{ x: 690, y: 1640, w: 500, h: 84 }]
  },
  swatch: 'linear-gradient(135deg,#f4f8f5 0 40%,#063d35 40% 70%,#d4a437 70%)',
  style: {
    panel: '#063d35', frame: '#d4a437', inner: '#f7f1d9',
    goldText: '#f0c34f', darkText: '#10201c', bg: '#edf2ef',
    panelR: 24, outerR: 24, photoR: 0, softR: 16, pillR: 30,
    goldA: '#a56a07', goldB: '#f0c34f', shadow: 0.2
  },
  draw: drawAnnouncement
});
})();
