// 1つのステージを遊ぶ場面。走る・跳ぶ・登る・敵・旗・ゴール。
import Phaser from "phaser";
import { pad } from "./controls.js";
import { sfx } from "./audio.js";
import { ONE_WAY_TILES, SOLID_TILES, T, THEMES, TILE, VIEW, ensureTextures } from "./textures.js";

const GRAVITY = 600;
const MAX_FALL = 260;
const CLIMB_SPEED = 55;
const GLIDE_FALL = 35;
const JUMP_BUFFER_MS = 120;
const JUMP_CUT_SPEED = -80;
const STOMP_BOUNCE = -180;
const INVINCIBLE_MS = 1300;
const ENEMY_SPEED = 20;
const ROLL_KILL_SPEED = 45;
const SNAP_EPSILON = 0.01; // これより小さいずれは計算の誤差とみなす

function tileIndexOf(rows, x, y) {
  const ch = rows[y][x];
  if (ch === "#") return y > 0 && rows[y - 1][x] === "#" ? T.FILL : T.TOP;
  return { "=": T.BLOCK, "-": T.PLAT, H: T.LADDER, T: T.LADDER_TOP, "^": T.SPIKE }[ch] ?? -1;
}

export class StageScene extends Phaser.Scene {
  constructor() {
    super("stage");
  }

  init(data) {
    this.stage = data.stage;
    this.character = data.character;
    this.hooks = data.hooks;
    this.stats = data.character.stats;
  }

  create() {
    const { stage, character } = this;
    const theme = THEMES[stage.theme];
    ensureTextures(this, stage.theme);
    const rows = stage.rows;
    this.rows = rows;
    this.mapW = rows[0].length * TILE;
    this.mapH = rows.length * TILE;

    this.cameras.main.setBackgroundColor(theme.sky);
    this.bg = this.add.tileSprite(0, 0, VIEW, VIEW, `bg-${stage.theme}`).setOrigin(0).setScrollFactor(0);

    // マス
    const data = rows.map((row, y) => [...row].map((_, x) => tileIndexOf(rows, x, y)));
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage(`tiles-${stage.theme}`, `tiles-${stage.theme}`, TILE, TILE, 0, 0, 0);
    this.layer = map.createLayer(0, tileset, 0, 0);
    this.layer.setCollision(SOLID_TILES);
    this.layer.forEachTile((t) => {
      if (ONE_WAY_TILES.includes(t.index)) t.setCollision(false, false, true, false);
    });

    this.physics.world.gravity.y = GRAVITY;
    this.physics.world.setBounds(0, -64, this.mapW, this.mapH + 128);
    this.physics.world.setBoundsCollision(true, true, false, false);

    // 星のかけら・旗・ゴール・敵
    this.gems = this.physics.add.staticGroup();
    this.flags = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.gemTotal = 0;
    let start = { x: 0, y: 0 };
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const cx = x * TILE + TILE / 2;
        const bottom = (y + 1) * TILE;
        if (ch === "P") start = { x: cx, y: bottom };
        if (ch === "o") {
          this.gems.create(cx, y * TILE + 4, "gem");
          this.gemTotal++;
        }
        if (ch === "C") this.flags.create(cx, bottom - 8, "flag-off");
        if (ch === "G") this.goal = this.physics.add.staticImage(cx, bottom - 16, "goal");
        if (ch === "e") this.spawnWalker(cx, bottom);
        if (ch === "f") this.spawnFlyer(cx, y * TILE + 4);
      }),
    );
    this.tweens.add({ targets: this.gems.getChildren(), y: "-=1", duration: 500, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    // 主人公
    const key0 = `${character.id}_0`;
    this.player = this.physics.add.sprite(start.x, start.y, key0).setOrigin(0.5, 1);
    const fw = this.player.width;
    const fh = this.player.height;
    const bw = Math.min(10, fw - 2);
    const bh = Math.min(13, fh - 1);
    this.player.body.setSize(bw, bh).setOffset((fw - bw) / 2, fh - bh);
    this.player.setCollideWorldBounds(true);
    this.respawnPoint = { ...start };

    this.physics.add.collider(this.player, this.layer, null, (_p, tile) => this.canStandOn(tile), this);
    this.physics.add.collider(this.enemies, this.layer, null, (e, tile) => !e.flying && tile.index !== T.SPIKE);
    this.physics.add.overlap(this.player, this.gems, this.takeGem, null, this);
    this.physics.add.overlap(this.player, this.flags, this.touchFlag, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.goal, this.reachGoal, null, this);

    // 状態
    this.hearts = this.stats.hearts;
    this.gemCount = 0;
    this.facing = 1;
    this.climbing = false;
    this.cleared = false;
    this.lastGround = 0;
    this.airJumpsLeft = 0;
    this.invincibleUntil = 0;
    this.dropUntil = 0;
    this.look = 0;

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.mapW, this.mapH);
    this.camX = Phaser.Math.Clamp(start.x - VIEW / 2, 0, Math.max(0, this.mapW - VIEW));
    this.camY = Phaser.Math.Clamp(start.y - VIEW * 0.6, 0, Math.max(0, this.mapH - VIEW));
    this.camTargetY = this.camY;
    cam.setScroll(this.camX, this.camY);

    // 物理の計算のあと、ごく小さい誤差（127.99999… など）を整数にそろえる。
    // Phaser はドットを切り捨てで描くので、誤差が残ると1ドット上下に震えて見える。
    this.events.on("postupdate", this.snapPositions, this);

    this.updateHud();
  }

  snapPositions() {
    const snap = (obj) => {
      const ry = Math.round(obj.y);
      if (Math.abs(obj.y - ry) < SNAP_EPSILON) obj.y = ry;
      const rx = Math.round(obj.x);
      if (Math.abs(obj.x - rx) < SNAP_EPSILON) obj.x = rx;
    };
    snap(this.player);
    this.enemies.getChildren().forEach(snap);
  }

  spawnWalker(x, bottom) {
    const e = this.enemies.create(x, bottom - 3, `walker-${this.stage.theme}`);
    e.body.setSize(8, 6);
    e.setVelocityX(-ENEMY_SPEED);
    e.flying = false;
  }

  spawnFlyer(x, y) {
    const e = this.enemies.create(x, y, `flyer-${this.stage.theme}`);
    e.body.setAllowGravity(false);
    e.body.setSize(8, 6);
    e.flying = true;
    e.baseY = y;
    e.phase = Math.random() * Math.PI * 2;
  }

  canStandOn(tile) {
    if (ONE_WAY_TILES.includes(tile.index)) {
      if (this.climbing) return false;
      if (this.time.now < this.dropUntil) return false;
    }
    return true;
  }

  tileAt(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (ty < 0 || ty >= this.rows.length || tx < 0 || tx >= this.rows[0].length) return -1;
    return tileIndexOf(this.rows, tx, ty);
  }

  isLadder(px, py) {
    const i = this.tileAt(px, py);
    return i === T.LADDER || i === T.LADDER_TOP;
  }

  isFloorForEnemy(px, py) {
    const i = this.tileAt(px, py);
    return SOLID_TILES.includes(i) || ONE_WAY_TILES.includes(i);
  }

  updateHud() {
    this.hooks.onHud({ hearts: this.hearts, maxHearts: this.stats.hearts, gems: this.gemCount, total: this.gemTotal });
  }

  takeGem(_p, gem) {
    gem.destroy();
    this.gemCount++;
    sfx.gem();
    this.updateHud();
  }

  touchFlag(_p, flag) {
    if (flag.activated) return;
    flag.activated = true;
    flag.setTexture("flag-on");
    this.respawnPoint = { x: flag.x, y: flag.y + 8 };
    this.hearts = this.stats.hearts;
    sfx.checkpoint();
    this.hooks.onToast("旗にタッチ！ ここから再開できる");
    this.updateHud();
  }

  hitEnemy(player, enemy) {
    if (enemy.dead || this.cleared) return;
    const pb = player.body;
    const stomping = pb.velocity.y > 20 && pb.bottom <= enemy.body.top + 5;
    const rolling = this.stats.roll && !this.climbing && Math.abs(pb.velocity.x) > ROLL_KILL_SPEED;
    if (stomping || rolling) {
      this.defeat(enemy);
      if (stomping) {
        pb.setVelocityY(STOMP_BOUNCE);
        this.airJumpsLeft = this.stats.airJumps;
      }
      return;
    }
    this.hurt(enemy.x < player.x ? 1 : -1);
  }

  defeat(enemy) {
    enemy.dead = true;
    enemy.body.enable = false;
    sfx.stomp();
    this.tweens.add({ targets: enemy, scaleY: 0.2, alpha: 0, y: enemy.y + 2, duration: 250, onComplete: () => enemy.destroy() });
  }

  hurt(dir) {
    if (this.time.now < this.invincibleUntil) return;
    this.hearts--;
    sfx.hurt();
    if (this.hearts <= 0) {
      this.respawn("あと少し！ 旗からもう一回");
      return;
    }
    this.climbing = false;
    this.player.body.setAllowGravity(true);
    this.player.body.setVelocity(dir * 110, -150);
    this.invincibleUntil = this.time.now + INVINCIBLE_MS;
    this.updateHud();
  }

  fellOff() {
    this.hearts--;
    sfx.hurt();
    this.respawn(this.hearts <= 0 ? "あと少し！ 旗からもう一回" : null);
  }

  respawn(message) {
    if (this.hearts <= 0) this.hearts = this.stats.hearts;
    const p = this.player;
    this.climbing = false;
    p.body.setAllowGravity(true);
    p.body.reset(this.respawnPoint.x, this.respawnPoint.y);
    p.setVelocity(0, 0);
    this.invincibleUntil = this.time.now + INVINCIBLE_MS;
    this.camTargetY = Phaser.Math.Clamp(p.y - VIEW * 0.6, 0, Math.max(0, this.mapH - VIEW));
    if (message) this.hooks.onToast(message);
    this.updateHud();
  }

  reachGoal() {
    if (this.cleared) return;
    this.cleared = true;
    this.player.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.player.setTexture(`${this.character.id}_0`);
    this.tweens.add({ targets: this.player, y: this.player.y - 6, duration: 200, yoyo: true, repeat: 2 });
    sfx.clear();
    this.time.delayedCall(1300, () => this.hooks.onClear({ gems: this.gemCount, total: this.gemTotal }));
  }

  startClimb(col) {
    this.climbing = true;
    this.player.body.setAllowGravity(false);
    this.player.setVelocity(0, 0);
    this.player.x = col * TILE + TILE / 2;
  }

  stopClimb() {
    this.climbing = false;
    this.player.body.setAllowGravity(true);
  }

  doJump(power) {
    this.player.body.setVelocityY(-power);
    pad.jumpAt = 0;
    this.lastGround = -10000;
  }

  update(time, delta) {
    if (this.cleared) return;
    const dt = Math.min(delta, 50) / 1000;
    const p = this.player;
    const b = p.body;
    const s = this.stats;
    const onGround = b.blocked.down;
    const wantJump = performance.now() - pad.jumpAt < JUMP_BUFFER_MS;

    if (onGround) {
      this.lastGround = time;
      this.airJumpsLeft = s.airJumps;
    }

    // はしご
    let ladderHere = this.isLadder(p.x, b.center.y) || this.isLadder(p.x, b.bottom - 2);
    if (!this.climbing) {
      if (pad.up && ladderHere && !wantJump) {
        this.startClimb(Math.floor(p.x / TILE));
      } else if (pad.down && onGround && this.tileAt(p.x, b.bottom + 2) === T.LADDER_TOP) {
        this.startClimb(Math.floor(p.x / TILE));
        p.y += 3;
        ladderHere = true; // 体の位置は次の場面で更新されるので、この場面では降り始めたとみなす
      } else if (pad.down && onGround && this.tileAt(p.x, b.bottom + 2) === T.PLAT && wantJump) {
        // ↓＋ジャンプで板から下りる
        this.dropUntil = time + 250;
        pad.jumpAt = 0;
      }
    }

    if (this.climbing) {
      const vy = pad.up ? -CLIMB_SPEED : pad.down ? CLIMB_SPEED : 0;
      b.setVelocity(0, vy);
      if (wantJump) {
        this.stopClimb();
        this.doJump(s.jump * 0.8);
        sfx.jump();
      } else if ((pad.left || pad.right) && !pad.up && !pad.down) {
        this.stopClimb();
      } else if (!ladderHere) {
        this.stopClimb();
        if (vy < 0) b.setVelocityY(-40);
      } else if (pad.down && onGround && !this.isLadder(p.x, b.bottom + 2)) {
        this.stopClimb();
      }
    } else {
      // 歩く
      const dir = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
      if (dir) this.facing = dir;
      const target = dir * s.speed;
      const accel = (dir ? (onGround ? 700 : 500) : onGround ? 900 : 300) * dt;
      const vx = b.velocity.x;
      b.setVelocityX(Math.abs(target - vx) <= accel ? target : vx + Math.sign(target - vx) * accel);

      // 跳ぶ
      if (wantJump) {
        const canGroundJump = onGround || time - this.lastGround < s.coyoteMs;
        if (canGroundJump) {
          this.doJump(s.jump);
          sfx.jump();
        } else if (this.airJumpsLeft > 0) {
          this.airJumpsLeft--;
          this.doJump(s.jump * 0.9);
          sfx.airJump();
        }
      }
      if (!pad.jump && b.velocity.y < JUMP_CUT_SPEED) b.setVelocityY(JUMP_CUT_SPEED);
      if (s.glide && pad.jump && b.velocity.y > GLIDE_FALL) b.setVelocityY(GLIDE_FALL);
      if (b.velocity.y > MAX_FALL) b.setVelocityY(MAX_FALL);
    }

    // トゲ・落下
    if (this.tileAt(p.x, b.bottom - 1) === T.SPIKE) this.hurt(-this.facing);
    if (p.y - p.height > this.mapH + 8) this.fellOff();

    // 見た目
    const moving = Math.abs(b.velocity.x) > 5;
    let frame = 0;
    if (this.climbing) {
      frame = 0;
      if (b.velocity.y !== 0) p.setFlipX(Math.floor(time / 160) % 2 === 0);
    } else {
      p.setFlipX(this.facing < 0);
      if (onGround && moving) frame = Math.floor(time / 120) % 2;
    }
    p.setTexture(`${this.character.id}_${frame}`);
    p.setAlpha(time < this.invincibleUntil ? (Math.floor(time / 80) % 2 ? 0.3 : 1) : 1);

    this.updateEnemies(time);
    this.updateCamera(onGround);
  }

  updateEnemies(time) {
    this.enemies.getChildren().forEach((e) => {
      if (e.dead) return;
      if (e.flying) {
        e.y = e.baseY + Math.sin(time / 600 + e.phase) * 14;
        e.body.updateFromGameObject();
        return;
      }
      const eb = e.body;
      let vx = eb.velocity.x || -ENEMY_SPEED;
      if (eb.blocked.left) vx = ENEMY_SPEED;
      if (eb.blocked.right) vx = -ENEMY_SPEED;
      if (eb.blocked.down && !this.isFloorForEnemy(e.x + Math.sign(vx) * 6, eb.bottom + 2)) vx = -vx;
      e.setVelocityX(vx);
      e.setFlipX(vx > 0);
    });
  }

  updateCamera(onGround) {
    const p = this.player;
    this.look += (this.facing * 24 - this.look) * 0.04;
    const maxX = Math.max(0, this.mapW - VIEW);
    const maxY = Math.max(0, this.mapH - VIEW);
    const targetX = Phaser.Math.Clamp(p.x + this.look - VIEW / 2, 0, maxX);
    const screenY = p.y - this.camY;
    if (onGround || this.climbing || screenY < 40 || screenY > 140) {
      this.camTargetY = Phaser.Math.Clamp(p.y - VIEW * 0.6, 0, maxY);
    }
    this.camX += (targetX - this.camX) * 0.15;
    this.camY += (this.camTargetY - this.camY) * 0.1;
    this.cameras.main.setScroll(Math.round(this.camX), Math.round(this.camY));
    this.bg.tilePositionX = Math.round(this.camX * 0.3);
    this.bg.tilePositionY = this.stage.theme === "tower" ? Math.round(this.camY * 0.3) : 0;
  }
}
