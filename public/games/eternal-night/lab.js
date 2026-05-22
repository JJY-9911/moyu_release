(function () {
  'use strict';

  var STAT_UPGRADES = [
    { id: 'speed', name: '移速提升', desc: '移速 +%' },
    { id: 'damage', name: '伤害提升', desc: '全伤害 +%' },
    { id: 'globalCastSpeed', name: '全局施法速度', desc: '全技能攻速 +%' },
    { id: 'swordSize', name: '大剑尺寸', desc: '大剑尺寸 +%（战士）' },
    { id: 'castSpeed', name: '大剑施法速度', desc: '大剑攻速 +%（战士）' },
    { id: 'knifeCastSpeed', name: '飞刀施法速度', desc: '飞刀攻速 +%（战士）' },
    { id: 'bibleCastSpeed', name: '圣经施法速度', desc: '圣经攻速 +%（法师）' },
    { id: 'holyWaterCastSpeed', name: '圣水施法速度', desc: '圣水攻速 +%（法师）' }
  ];

  var WEAPON_UPGRADES = [
    { id: 'addSword', name: '环绕大剑', desc: '数量 +1' },
    { id: 'addKnife', name: '飞刀', desc: '数量 +1' },
    { id: 'addBible', name: '环绕圣经', desc: '数量 +1' },
    { id: 'addHolyWater', name: '圣水', desc: '数量 +1' }
  ];

  var lab = null;
  var statsTimer = null;

  function waitForLab(cb) {
    if (window.EternalNightLab) {
      lab = window.EternalNightLab;
      cb();
      return;
    }
    window.EternalNightLab = window.EternalNightLab || {};
    window.EternalNightLab._onGameReady = function () {
      lab = window.EternalNightLab;
      cb();
    };
    var t = setInterval(function () {
      if (window.EternalNightLab && window.EternalNightLab.getSnapshot) {
        clearInterval(t);
        lab = window.EternalNightLab;
        cb();
      }
    }, 50);
  }

  function el(id) {
    return document.getElementById(id);
  }

  function buildHeroSwitch() {
    var wrap = el('heroSwitch');
    wrap.innerHTML = '';
    lab.roster.forEach(function (h) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hero-btn';
      btn.dataset.index = String(h.index);
      btn.textContent = h.name;
      btn.addEventListener('click', function () {
        lab.switchHero(h.index);
        updateHeroActive();
        refreshStats();
      });
      wrap.appendChild(btn);
    });
    updateHeroActive();
  }

  function updateHeroActive() {
    var snap = lab.getSnapshot();
    document.querySelectorAll('.hero-btn').forEach(function (btn) {
      var h = lab.roster[Number(btn.dataset.index)];
      btn.classList.toggle('active', h && h.key === snap.heroKey);
    });
  }

  function makeUpgradeBtn(item, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'upgrade-btn';
    btn.innerHTML =
      '<span class="up-name">' + item.name + '</span>' +
      '<span class="up-desc">' + item.desc + '</span>';
    btn.addEventListener('click', function () {
      onClick(item.id);
      refreshStats();
    });
    return btn;
  }

  function buildUpgrades() {
    var statWrap = el('statUpgrades');
    var wepWrap = el('weaponUpgrades');
    statWrap.innerHTML = '';
    wepWrap.innerHTML = '';
    STAT_UPGRADES.forEach(function (u) {
      statWrap.appendChild(makeUpgradeBtn(u, function (id) { lab.applyUpgrade(id); }));
    });
    WEAPON_UPGRADES.forEach(function (u) {
      wepWrap.appendChild(makeUpgradeBtn(u, function (id) { lab.applyUpgrade(id); }));
    });
  }

  function row(label, value) {
    return '<div class="stat-row"><span>' + label + '</span><span>' + value + '</span></div>';
  }

  function pct(n) {
    return (Math.round(n * 1000) / 10) + '%';
  }

  function refreshStats() {
    if (!lab) return;
    var s = lab.getSnapshot();
    var html = '';
    html += row('角色', s.heroName);
    html += row('生命', s.hp + ' / ' + s.maxHp);
    html += row('移速', s.speed.toFixed(2));
    html += row('移速加成', '+' + s.speedBonus + '%（×' + s.speedMult.toFixed(2) + '）');
    html += row('伤害加成', '+' + s.damageBonus + '%（×' + s.damageMult.toFixed(2) + '）');

    html += '<div class="stat-group">武器数量</div>';
    html += row('大剑', s.swordCount);
    html += row('飞刀', s.knifeCount);
    html += row('圣经', s.bibleCount);
    html += row('圣水', s.holyWaterCount);

    html += '<div class="stat-group">伤害</div>';
    if (s.swordDamage != null) html += row('大剑单次', s.swordDamage);
    if (s.knifeDamage != null) html += row('飞刀单次', s.knifeDamage);
    if (s.bibleDamage != null) html += row('圣经单次', s.bibleDamage);
    if (s.holyWaterDamage != null) html += row('圣水单次', s.holyWaterDamage);

    html += '<div class="stat-group">攻速倍率</div>';
    if (s.heroKey === 'king') {
      html += row('大剑尺寸', '+' + s.swordSizeBonus + '%（×' + s.swordSizeMult.toFixed(2) + '）');
      html += row('大剑攻速', '×' + s.swordCastMult.toFixed(2));
      if (s.knifeCount > 0) {
        html += row('飞刀攻速', '×' + s.knifeCastMult.toFixed(2));
        if (s.knifeCooldown != null) html += row('飞刀冷却', s.knifeCooldown + ' ms');
      }
    }
    if (s.heroKey === 'wizard') {
      html += row('圣经攻速', '×' + s.bibleCastMult.toFixed(2));
      if (s.holyWaterCount > 0) {
        html += row('圣水攻速', '×' + s.holyWaterCastMult.toFixed(2));
      }
    }
    html += row('全局攻速', '+' + s.globalCastSpeedBonus + '%');

    html += '<div class="stat-group">训练场敌人</div>';
    html += row('种类', lab.monsterNames.join(', '));

    el('statsBody').innerHTML = html;
    updateHeroActive();
  }

  function init() {
    buildHeroSwitch();
    buildUpgrades();
    el('btnReset').addEventListener('click', function () {
      lab.reset();
      refreshStats();
    });
    refreshStats();
    statsTimer = setInterval(refreshStats, 200);
  }

  waitForLab(init);
})();
