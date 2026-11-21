# The Quiet Gallery

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/xeraaGH/best-stealth-game-20261121/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/xeraaGH/best-stealth-game-20261121/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard)

A top-down stealth game that plays offline in desktop Chrome from static
files. You are a thief in a museum after hours: sneak past patrolling
guards, hide in the shadows, steal three relics, and slip out through the
green EXIT — unseen.

## The game

- **A complete stealth game.** Two wings (The Marble Wing, The Vault Wing),
  each a level seen from above: guards with vision cones, display cases and
  shadows to hide behind, and an exit to reach unseen.
- **Patrols you can learn.** Every guard walks a fixed loop; watch the
  cones, wait for the gap, move when the patrol turns away.
- **A detection system that gives you a chance.** A guard's cone fills a
  shared detection meter — a glimpse only makes it suspicious, a clear look
  at close range raises the alarm. Break line of sight and the alarm cools
  down; shadows and sneaking slow the meter.
- **Tools.** Hold Shift to sneak (slow, quiet, harder to spot). Click to
  throw a coin: its ring pulls nearby guards away to investigate. Running
  footsteps carry and can give you away.
- **Feel.** Cones turn yellow, orange, then red as a guard grows
  suspicious; a `?` or `!` appears above its cap; footsteps, the alarm
  sting, the coin's ring and the relic chime are all synthesised in code
  with WebAudio — no sound files, no network.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift (hold) | Sneak — slow and quiet |
| Click | Throw a coin to distract guards |
| Enter | Start / continue |
| R | Restart the wing |
| N | Next wing (after a clean getaway) |

## Play it

Serve `game/` with any static server and open `game/index.html`, for
example:

```sh
python3 -m http.server --directory game 8080
```

No build step, no libraries, no network requests: every file the game
loads lives under `game/`.

## Structure

```
game/
  index.html        the page and its canvas
  src/
    config.js       every tuning number in one place
    levels.js       the two wings: grids and guard patrols
    vision.js       line of sight and vision-cone checks
    guard.js        guard AI: patrol, suspicious, alert, search
    player.js       movement, sneaking, coin throws
    audio.js        WebAudio sound, synthesised in code
    world.js        game state, detection meter, win and caught
    render.js       everything drawn on the canvas
    input.js        keyboard and mouse
    shots.js        the four screenshot scenes (?shot=cover|sneak|alert|win)
    main.js         the bootstrap and fixed-step game loop
```

`main.ts` (Node 22, standard library only) hands the game in: it copies
`game/` and `screenshots/` to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and
writes `/output/dossier.json` with `buildDossier` from
`vendor/makefun-game.ts`.

## License

MIT — see [LICENSE](LICENSE).
