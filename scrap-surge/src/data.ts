export type WeaponId =
  "slinger" | "shotgun" | "saw" | "coil" | "rocket" | "fist";
export type ModId = "popcorn" | "domino" | "magnet";
export const WEAPONS: Record<
  WeaponId,
  {
    name: string;
    en: string;
    desc: string;
    price: number;
    color: string;
    interval: number;
    range: number;
    damage: number;
  }
> = {
  slinger: {
    name: "罐头快枪",
    en: "CAN POPPER",
    desc: "快、准、脆。连续发射尖头瓶盖。",
    price: 15,
    color: "#68bba8",
    interval: 0.25,
    range: 450,
    damage: 18,
  },
  shotgun: {
    name: "瓶盖散弹",
    en: "CAP SHOWER",
    desc: "一口气喷出 5 枚瓶盖。贴脸，整排碎掉。",
    price: 22,
    color: "#edaa3e",
    interval: 0.85,
    range: 300,
    damage: 15,
  },
  saw: {
    name: "旋转餐叉",
    en: "FORK TORNADO",
    desc: "餐叉绕身切割，靠过来的敌人会连吃数刀。",
    price: 21,
    color: "#a1bec2",
    interval: 0.21,
    range: 100,
    damage: 24,
  },
  coil: {
    name: "漏电电池",
    en: "BAD BATTERY",
    desc: "一道电弧跳过 5 个目标。怪越挤，越来劲。",
    price: 25,
    color: "#7ac7b1",
    interval: 0.8,
    range: 380,
    damage: 23,
  },
  rocket: {
    name: "汽水火箭",
    en: "SODA ROCKET",
    desc: "慢一点，但一炸就是一片。爆炸半径 92。",
    price: 26,
    color: "#eb7250",
    interval: 1.2,
    range: 500,
    damage: 45,
  },
  fist: {
    name: "弹簧拳套",
    en: "SPRING LOADED",
    desc: "近身一拳把怪打飞。飞出去的怪还能撞倒别的怪。",
    price: 18,
    color: "#e78368",
    interval: 0.6,
    range: 145,
    damage: 48,
  },
};
export const MODS: Record<ModId, { name: string; desc: string; icon: string }> =
  {
    popcorn: {
      name: "废料爆米花",
      desc: "捡废料时，废料会变成两发寻敌弹。你越爱捡，火力越密。",
      icon: "✷",
    },
    domino: {
      name: "易爆垃圾",
      desc: "任何击杀都会爆炸。爆炸击杀也会再炸，能连成一整片。",
      icon: "✹",
    },
    magnet: {
      name: "磁力回潮",
      desc: "吸附范围翻倍。每收集 8 份废料，向四周发射 10 枚瓶盖。",
      icon: "◎",
    },
  };
export const W = 1200,
  H = 800,
  DT = 1 / 60;
