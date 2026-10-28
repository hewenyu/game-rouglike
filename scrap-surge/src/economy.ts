// Gun purchase planning for expedition20: which owned copies a bought gun
// fuses with (I+I -> II -> III -> IV) and the resulting loadout. Pure: it
// reads the loadout and returns a plan; Game.buyExpedition commits it.
import type { WeaponId } from "./data";
import { gunTier, type GunTier, type PurchasePreview } from "./expedition";
import type { Gun } from "./sim-types";

type PurchaseNode = {
  tier: GunTier;
  sourceIndices: number[];
  cooldown: number;
  paid: number;
};
export type PurchasePlan = PurchasePreview & {
  result: Gun[];
  cooldown: number;
};

export function planGunPurchase(
  guns: readonly Gun[],
  id: WeaponId,
  price: number,
  slotCap: number,
): PurchasePlan {
  const incomingCooldown = guns.length * 0.08;
  const existingNodes: PurchaseNode[] = guns
    .map((gun, slotIndex) => ({ gun, slotIndex }))
    .filter(({ gun }) => gun.id === id)
    .map(({ gun, slotIndex }) => ({
      tier: gunTier(gun.tier),
      sourceIndices: [slotIndex],
      cooldown: gun.cooldown,
      paid: gun.paid ?? 0,
    }));
  let incomingNode: PurchaseNode = {
    tier: 1,
    sourceIndices: [],
    cooldown: incomingCooldown,
    paid: price,
  };
  let mergedNode: PurchaseNode | null = null;
  let incomingTier: GunTier = 1;
  const consumedSlots = new Set<number>();
  while (incomingNode.tier < 4) {
    const partner = existingNodes
      .filter(
        (node) =>
          node.tier === incomingNode.tier &&
          !consumedSlots.has(node.sourceIndices[0]!),
      )
      .sort(
        (a, b) =>
          (a.sourceIndices[0] ?? Number.POSITIVE_INFINITY) -
          (b.sourceIndices[0] ?? Number.POSITIVE_INFINITY),
      )[0];
    if (!partner) break;
    consumedSlots.add(partner.sourceIndices[0]!);
    const allConsumed = [
      ...new Set([...incomingNode.sourceIndices, ...partner.sourceIndices]),
    ];
    mergedNode = {
      tier: (incomingNode.tier + 1) as GunTier,
      sourceIndices: allConsumed,
      cooldown: Math.max(incomingNode.cooldown, partner.cooldown),
      paid: incomingNode.paid + partner.paid,
    };
    incomingNode = mergedNode;
    incomingTier = mergedNode.tier;
  }
  const survivors = existingNodes
    .filter(
      (node) => !mergedNode?.sourceIndices.includes(node.sourceIndices[0]!),
    )
    .map((node) => {
      const source = node.sourceIndices[0]!;
      return {
        order: source,
        gun: { ...guns[source]!, id, tier: node.tier },
      };
    });
  if (mergedNode) {
    const survivorIndex = Math.min(
      ...mergedNode.sourceIndices.filter(Number.isFinite),
    );
    survivors.push({
      order: survivorIndex,
      gun: {
        ...guns[survivorIndex]!,
        id,
        tier: mergedNode.tier,
        cooldown: mergedNode.cooldown,
        paid: mergedNode.paid,
      },
    });
  } else {
    survivors.push({
      order: Number.POSITIVE_INFINITY,
      gun: {
        id,
        cooldown: incomingNode.cooldown,
        angle: 0,
        recoil: 0,
        tier: 1,
        paid: incomingNode.paid,
      },
    });
  }
  const untouched = guns
    .map((gun, slotIndex) => ({ order: slotIndex, gun }))
    .filter(({ gun }) => gun.id !== id);
  const result = [...untouched, ...survivors]
    .sort((a, b) => a.order - b.order)
    .map(({ gun }) => gun);
  const accepted = result.length <= slotCap;
  return {
    accepted,
    tier: result.reduce<GunTier>(
      (best, gun) => Math.max(best, gun.tier ?? 1) as GunTier,
      1,
    ),
    incomingTier,
    merged: mergedNode !== null,
    result,
    cooldown: incomingNode.cooldown,
    reason: accepted ? null : "no-space",
  };
}
