(function (global) {
  'use strict';

  /** 横条精灵图播放速度：每秒 2 帧 */
  var ANIM_FPS = 2;
  var MS_PER_FRAME = 1000 / ANIM_FPS;

  function frameCount(img, assetWidth, assetHeight) {
    if (!img) return 1;
    var h = assetHeight(img);
    var w = assetWidth(img);
    if (!h || !w) return 1;
    var fw = h;
    return Math.max(1, Math.floor(w / fw));
  }

  function frameIndex(timeMs, count) {
    if (!count || count < 1) return 0;
    return Math.floor((timeMs || 0) / MS_PER_FRAME) % count;
  }

  function drawStrip(ctx, img, x, y, dw, dh, timeMs, assetWidth, assetHeight) {
    if (!img || !dw || !dh) return;
    var fh = assetHeight(img);
    var fw = fh;
    if (!fw || !fh) return;
    var n = frameCount(img, assetWidth, assetHeight);
    var fi = frameIndex(timeMs, n);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, fi * fw, 0, fw, fh, x, y, dw, dh);
  }

  global.NoahSprites = {
    ANIM_FPS: ANIM_FPS,
    MS_PER_FRAME: MS_PER_FRAME,
    frameCount: frameCount,
    frameIndex: frameIndex,
    drawStrip: drawStrip
  };
})(window);
