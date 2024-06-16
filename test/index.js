const puppeteer = require("puppeteer");

(async () => {
  const href = "/?25341956-TcUTc";

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(`https://when2meet.com${href}`);

  const groupGridElement = await page.$("#GroupGridSlots");
  const data = await page.evaluate((groupGrid) => {
    const duration = groupGrid.children.length / 4;
    const dates = [];
    for (const col of groupGrid.children[0].children) {
      dates.push(new Date(parseInt(col.getAttribute("data-time") + "000")));
    }
    return { dates: JSON.stringify(dates), duration };
  }, groupGridElement);

  // Fix dates
  data.dates = JSON.parse(data.dates).map((d) => new Date(d));

  console.log(data);

  const availability = {};
  const availableElement = await page.$("#Available");

  for (const date of data.dates) {
    for (
      let i = 0, curDate = date;
      i < data.duration * 4;
      i++, curDate.setMinutes(curDate.getMinutes() + 15)
    ) {
      const groupTime = await page.$(`#GroupTime${curDate.getTime() / 1000}`);
      await groupTime.hover();
      const available = await page.evaluate((availableEl) => {
        const available = availableEl.innerHTML.split("<br>");
        available.splice(-1);
        return available;
      }, availableElement);

      for (const name of available) {
        if (name in availability) {
          availability[name].push(curDate.getTime());
        } else {
          availability[name] = [curDate.getTime()];
        }
      }

      // console.log(curDate.getTime(), available);
    }
  }
  console.log(availability);

  // await browser.close();
})();
