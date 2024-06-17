import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";

/** Get the correct browser depending on if we're running in production
 *  Source: https://gist.github.com/kettanaito/56861aff96e6debc575d522dd03e5725
 */
async function getBrowser() {
  if (process.env.VERCEL_ENV === "production") {
    const executablePath = await chromium.executablePath();

    const browser = await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
    return browser;
  } else {
    const browser = await puppeteer.launch();
    return browser;
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const href = body.href;

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.goto(`https://when2meet.com${href}`);

  //
  // Get event details (dates, duration)
  //
  const groupGridElement = await page.$("#GroupGridSlots");

  // @ts-ignore
  const data = await page.evaluate((groupGrid: HTMLElement) => {
    const duration = groupGrid.children.length / 4;
    const dates = [];
    for (const col of groupGrid.children[0].children) {
      dates.push(new Date(parseInt(col.getAttribute("data-time") + "000")));
    }
    return { dates: JSON.stringify(dates), duration };
  }, groupGridElement);

  // Fix dates
  data.dates = JSON.parse(data.dates).map((d: string) => new Date(d).getTime());

  //
  // Get event name
  //
  const eventNameElement = await page.$("#NewEventNameDiv");
  // @ts-ignore
  const eventName = await page.evaluate((eventNameEl: HTMLElement) => {
    return eventNameEl.innerHTML.split("<br>")[0].trim();
  }, eventNameElement);
  data.name = eventName;

  //
  // Get map mapping name to available times
  //
  const availability: { [key: string]: number[] } = {};
  const availableElement = await page.$("#Available");
  for (const date of data.dates) {
    for (
      let i = 0, curDate = new Date(date);
      i < data.duration * 4;
      i++, curDate.setMinutes(curDate.getMinutes() + 15)
    ) {
      const groupTime = await page.$(`#GroupTime${curDate.getTime() / 1000}`);

      // @ts-ignore
      await groupTime.hover();

      // @ts-ignore
      const available = await page.evaluate((availableEl: HTMLElement) => {
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
    }
  }
  data.availability = availability;

  // Get base url
  const baseApiUrl =
    process.env.VERCEL_ENV === "production"
      ? "https://schej.it/api"
      : "http://localhost:3002";
  const baseSchejUrl =
    process.env.VERCEL_ENV === "production"
      ? "https://schej.it"
      : "http://localhost:8080";

  // TODO: NEED TO DETERMINE TYPE (specific dates vs dow)
  // Create schej event
  const createEventPayload = {
    name: data.name,
    duration: data.duration,
    dates: data.dates.map((d: number) => new Date(d)),
    notificationsEnabled: false,
    blindAvailabilityEnabled: false,
    daysOnly: false,
    type: "specific_dates",
  };
  const createEventResponse: { eventId: string; shortId: string } =
    await $fetch(`${baseApiUrl}/events`, {
      method: "POST",
      body: createEventPayload,
    });
  const { shortId } = createEventResponse;

  // Populate responses
  for (const name of Object.keys(data.availability)) {
    const addResponsePayload = {
      guest: true,
      name: name,
      availability: data.availability[name].map((d: number) => new Date(d)),
    };

    const response = await $fetch(`${baseApiUrl}/events/${shortId}/response`, {
      method: "POST",
      body: addResponsePayload,
    });
  }

  return {
    url: `${baseSchejUrl}/e/${shortId}`,
  };
});
