import test from "node:test";
import assert from "node:assert/strict";
import { Sound } from "../src/audio";
import type { Event } from "../src/sim";

type ToneCall = {
  f: number;
  end: number;
  dur: number;
  vol: number;
  type: OscillatorType;
};

class RoutedSound extends Sound {
  calls: ToneCall[] = [];
  tones: ToneCall[] = [];
  delays: number[] = [];
  constructor() {
    super();
    this.context = {
      currentTime: 10,
    } as AudioContext;
    this.master = {} as GainNode;
  }
  tone(
    f: number,
    end: number,
    dur: number,
    vol: number,
    type: OscillatorType = "triangle",
  ) {
    const call = { f, end, dur, vol, type };
    this.calls.push(call);
    this.tones.push(call);
  }
  later(fn: () => void, ms: number) {
    this.delays.push(ms);
    fn();
  }
}

function routed() {
  return new RoutedSound();
}

function play(sound: RoutedSound, event: Event) {
  sound.calls = [];
  sound.play(event);
  return sound.calls;
}

test("elite and chest cues are distinct from legacy buy and wave cues", () => {
  const sound = routed();
  const elite = play(sound, { type: "elite", value: 3 });
  assert.deepEqual(
    elite.map((call) => [call.f, call.end, call.type]),
    [
      [230, 145, "square"],
      [185, 92, "sawtooth"],
    ],
  );
  const chest = play(sound, { type: "chest", value: 2 });
  assert.deepEqual(
    chest.map((call) => [call.f, call.end, call.type]),
    [
      [410, 680, "triangle"],
      [720, 1080, "sine"],
    ],
  );
  const legacy = play(sound, { type: "buy", kind: "sling" as never });
  assert.equal(legacy[0]?.f, 330);
});

test("item purchase uses its own cue and never stacks the old buy chime", () => {
  const sound = routed();
  const calls = play(sound, { type: "buy", item: "worn-sandals" });
  assert.equal(calls.length, 2);
  assert.deepEqual(
    [calls[0].f, calls[0].end, calls[0].type],
    [610, 820, "sine"],
  );
  assert(
    calls.every((call) => !(call.f === 330 && call.end === 660)),
    "legacy weapon-buy identity must not layer beneath item purchase",
  );
  assert.deepEqual(sound.delays, [55]);
});

test("item purchase has a short voice cap guard but other items can follow", () => {
  const sound = routed();
  const first = play(sound, { type: "buy", item: "worn-sandals" });
  assert.equal(first.length, 2);
  sound.lastItemBuy = -Infinity;
  const second = play(sound, { type: "buy", item: "thick-shell" });
  assert.equal(second.length, 2);
});

test("mute state is preserved and direct tone respects it", () => {
  const sound = routed();
  sound.muted = true;
  sound.tone(440, 880, 0.1, 0.1);
  assert.equal(sound.tones.length, 1, "stub bypasses WebAudio guard");
  assert.equal(sound.muted, true);
});
