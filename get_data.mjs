import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';

const OUT_PATH = '.';

const startYear = 2010;
const endYear = 2025;

const YEARS = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
const CHUNKS = [
  ['01-01', '04-30'],
  ['04-30', '08-30'],
  ['08-30', '12-31'],
];

const fetchData = async (from, till, index_name) => {
  const url = `https://iss.moex.com/iss/history/engines/stock/markets/index/securities/${index_name}.json?from=${from}&till=${till}&history.columns=TRADEDATE,CLOSE`;
  const res = await fetch(url);
  const json = await res.json();
  return json.history.data.map(([date, value]) => ({ date, value }));
};

const main = async (index_name) => {
  await mkdir(OUT_PATH, { recursive: true });

  let allData = [];

  for (const year of YEARS) {
    console.log(`Fetching data for ${year}`);
    for (const [start, end] of CHUNKS) {
      const from = `${year}-${start}`;
      const till = `${year}-${end}`;
      try {
        const chunkData = await fetchData(from, till, index_name);
        allData = allData.concat(chunkData);
      } catch (e) {
        console.error(`Failed to fetch for ${from} to ${till}:`, e.message);
      }
    }
  }

  const output = { data: allData };
  const OUT_FILE = path.join(OUT_PATH, index_name + '.json');
  await writeFile(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Done. Saved ${allData.length} entries to ${OUT_FILE}`);
};

main("MCFTR").catch(err => console.error(err));
main("IMOEX").catch(err => console.error(err));
