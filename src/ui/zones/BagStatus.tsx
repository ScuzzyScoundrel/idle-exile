export default function BagStatus({ inventoryCount, capacity, salvageTally }: {
  inventoryCount: number;
  capacity: number;
  salvageTally: { count: number; essence: number };
}) {
  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${
      inventoryCount >= capacity
        ? 'bg-amber-950 border border-amber-700'
        : 'bg-gray-800'
    }`}>
      <div className="flex items-center justify-between">
        <span className={inventoryCount >= capacity ? 'text-amber-300 font-semibold' : 'text-gray-400'}>
          {'\u{1F392}'} Bags: {inventoryCount}/{capacity}
          {inventoryCount >= capacity && ' — FULL'}
        </span>
        {salvageTally.count > 0 && (
          <span className="text-amber-400">
            {salvageTally.count} salvaged &rarr; +{salvageTally.essence} essence
          </span>
        )}
      </div>
      {inventoryCount >= capacity && (
        <div className="text-amber-400/80 text-xs mt-0.5">
          Gear drops are being auto-salvaged. Upgrade bags or disenchant items.
        </div>
      )}
    </div>
  );
}
