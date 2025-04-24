import {readFile, writeFile} from 'fs/promises';

const START_YEAR = 2010;

// Загрузка и сортировка данных по дате
const loadData = async (filePath) => {
  const content = await readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  return json.data.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Поиск значения по дате (точная или ближайшая предыдущая)
const findValueByDate = (data, dateStr) => {
  const targetDate = new Date(dateStr);

  // Поиск точного совпадения
  const exact = data.find(d => d.date === dateStr);
  if (exact) return exact;

  // Поиск ближайшей предыдущей даты
  for (let i = data.length - 1; i >= 0; i--) {
    const currentDate = new Date(data[i].date);
    if (currentDate <= targetDate) return data[i];
  }

  // Если все даты позже — возвращаем первую
  return data[0] ?? null;
};

const contDayDiv = (imoex, mcftr) => {
  const ret = [];
  for (let i = imoex.length - 1; i > 0; i--) {
    let a1 = imoex[i - 1];
    let a2 = imoex[i];
    let date1 = a1.date;
    let date2 = a2.date;

    let b1 = findValueByDate(mcftr, date1);
    let b2 = findValueByDate(mcftr, date2);

    let a = a2.value / a1.value;
    let b = b2.value / b1.value;

    let div = b / a;

    ret.push({date: date2, value: div});
  }
  return ret;
}

const countSlidingYield = (dayDivYields, year_window) => { // {date: "2022-01-01", value: 1.0001}
  const ret = [];
  for (let i = dayDivYields.length - 1; i >= 0; i--) {
    let a2 = dayDivYields[i];
    let date2 = a2.date;
    let date1 = (+date2.substring(0, 4) - year_window) + date2.substring(4);
    let a1 = findValueByDate(dayDivYields, date1);
    if (a1.date === dayDivYields[0].date) {
      break;
    }

    let d_yield = 1;
    for (let j = i; j >= 0 && a1.date !== dayDivYields[j].date; j--) {
      d_yield = d_yield * dayDivYields[j].value;
    }
    if (year_window !== 1) {
      d_yield = Math.pow(d_yield, 1 / year_window);
    }
    ret.push({date: date2, value: d_yield - 1});
  }
  return ret;
}

const contYearDiv = (imoex, mcftr, year_window) => {
  const ret = [];
  for (let i = imoex.length - 1; i >= 0; i--) {
    let a2 = imoex[i];
    let date2 = a2.date;
    if (date2.substring(0, 4) < START_YEAR + year_window) {
      break; // window stop
    }
    let date1 = (+date2.substring(0, 4) - year_window) + date2.substring(4);
    let a1 = findValueByDate(imoex, date1);

    let b1 = findValueByDate(mcftr, date1);
    let b2 = findValueByDate(mcftr, date2);

    let a = a2.value / a1.value;
    let b = b2.value / b1.value;

    let div = b / a - 1
    if (year_window !== 1) {
      div = Math.pow(1 + div, 1 / year_window) - 1;
    }
    ret.push({date: date2, value: div});
  }
  return ret;
}

const countAndWriteBasedOnYearYield = async (imoex, mcftr, year_window) => {
  let divs = contYearDiv(imoex, mcftr, year_window).reverse();

  let csv = "";
  divs.forEach(d => {
    csv += d.date + "\t" + d.value + "\n";
  })

  await writeFile("year_based_div_yields_window_" + year_window + ".csv", csv, 'utf8');
}

const countAndWriteBasedOnDayYield = async (imoex, mcftr, year_window) => {
  let day_divs = contDayDiv(imoex, mcftr).reverse();
  let year_yields = countSlidingYield(day_divs, year_window).reverse();

  let csv = "";
  year_yields.forEach(d => {
    csv += d.date + "\t" + d.value + "\n";
  })

  await writeFile("day_based_div_yields_window_" + year_window + ".csv", csv, 'utf8');
}

// Пример использования
const main = async () => {
  let imoex = await loadData('./IMOEX.json');
  let mcftr = await loadData('./MCFTR.json');

  await countAndWriteBasedOnDayYield(imoex, mcftr, 1);
  await countAndWriteBasedOnDayYield(imoex, mcftr, 3);
  await countAndWriteBasedOnYearYield(imoex, mcftr, 1);
  await countAndWriteBasedOnYearYield(imoex, mcftr, 3);

};

main().catch(console.error);
