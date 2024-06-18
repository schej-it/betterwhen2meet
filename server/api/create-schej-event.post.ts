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

/** Convert the given when2meet dow date schej dow date */
function convertToDowDate(d: number, timezoneOffset: number) {
  const date = new Date(d);

  // when2meet Sunday: 1978-11-12
  // Schej Sunday: 2018-06-17
  // Change when2meet sunday to Schej sunday
  const day = date.getUTCDay();
  date.setUTCFullYear(2018);
  date.setUTCMonth(5);
  date.setUTCDate(17 + day);

  // Change to correct timezone
  const hours = Math.floor(timezoneOffset / 60);
  const minutes = timezoneOffset % 60;
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);

  return date;
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { href, timezoneOffset } = body;

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.goto(`https://when2meet.com${href}`);

  //
  // Get event details (dates, duration)
  //
  const groupGridElement = await page.$("#GroupGridSlots");

  if (!groupGridElement) {
    setResponseStatus(event, 400, "Invalid when2meet event id");
    event.node.res.end();
    return;
  }

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
  data.type = "specific_dates";

  // Determine if days of the week event
  if (new Date(data.dates[0]).getFullYear() === 1978) {
    data.type = "dow";
  }

  // Get base url
  const baseApiUrl =
    process.env.VERCEL_ENV === "production"
      ? "https://schej.it/api"
      : "http://localhost:3002";
  const baseSchejUrl =
    process.env.VERCEL_ENV === "production"
      ? "https://schej.it"
      : "http://localhost:8080";

  // Create schej event
  const createEventPayload = {
    name: data.name,
    duration: data.duration,
    dates: data.dates.map((d: number) => {
      if (data.type === "dow") {
        return convertToDowDate(d, timezoneOffset);
      }
      return new Date(d);
    }),
    notificationsEnabled: false,
    blindAvailabilityEnabled: false,
    daysOnly: false,
    fromWhen2meet: true,
    type: data.type,
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
      availability: data.availability[name].map((d: number) => {
        if (data.type === "dow") {
          return convertToDowDate(d, timezoneOffset);
        }
        return new Date(d);
      }),
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
