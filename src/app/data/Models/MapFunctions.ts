type DataEntry = [string, number];

export function getMaxValueForEachYear(data: DataEntry[]): [string, number][] {

  const maxValuesPerYear = data.reduce<Record<string, number>>((acc, [year, value]) => {
    acc[year] = acc[year] ? Math.max(acc[year], value) : value;
    return acc;
  }, {});

  return Object.entries(maxValuesPerYear).map(([year, maxValue]) => [year, maxValue] as [string, number]);
}
