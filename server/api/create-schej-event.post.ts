import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import { PostHog } from "posthog-node";

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

async function trackEventWithPosthog(event: any, posthogPayload: any) {
  const runtimeConfig = useRuntimeConfig();
  const cookieString = event.node.req.headers.cookie || "";
  const cookieName = `ph_${runtimeConfig.public.posthogPublicKey}_posthog`;
  const cookieMatch = cookieString.match(new RegExp(cookieName + "=([^;]+)"));

  let distinctId;
  if (cookieMatch) {
    const parsedValue = JSON.parse(decodeURIComponent(cookieMatch[1]));
    if (parsedValue && parsedValue.distinct_id) {
      distinctId = parsedValue.distinct_id;
      const posthog = new PostHog(runtimeConfig.public.posthogPublicKey, {
        host: runtimeConfig.public.posthogHost,
      });
      posthog.capture({
        distinctId: distinctId,
        event: "Event created",
        properties: posthogPayload,
      });
      await posthog.shutdown();
    }
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { href, timezoneOffset } = body;

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.goto(`https://when2meet.com${href}`);

  // Set a timeout for waiting (e.g., 10 seconds)
  const waitOptions = { timeout: 10000 };

  try {
    await page.waitForSelector("#NewEventNameDiv", waitOptions);
    await page.waitForSelector("#Available", waitOptions);
    await page.waitForSelector("#GroupGridSlots", waitOptions);
  } catch (error) {
    setResponseStatus(event, 400, "Invalid when2meet event id");
    event.node.res.end();
    return;
  }

  // Check if group grid exists
  const groupGridElement = await page.$("#GroupGridSlots");

  if (!groupGridElement) {
    setResponseStatus(event, 400, "Invalid when2meet event id");
    event.node.res.end();
    return;
  }

  // @ts-ignore
  const data = await page.evaluate(() => {
    // Get date and duration
    const groupGrid = document.getElementById("GroupGridSlots");
    const duration = groupGrid!.children.length / 4;
    const dates = [];
    for (const col of groupGrid!.children[0].children) {
      dates.push(
        new Date(parseInt(col.getAttribute("data-time") + "000")).getTime()
      );
    }

    // Get event name
    const name = document
      .getElementById("NewEventNameDiv")!
      .innerHTML.split("<br>")[0]
      .trim();

    // Get availability
    const availableEl = document.getElementById("Available");
    const availability: { [key: string]: number[] } = {};
    for (const date of dates) {
      for (
        let i = 0, curDate = new Date(date);
        i < duration * 4;
        i++, curDate.setMinutes(curDate.getMinutes() + 15)
      ) {
        // @ts-ignore
        ShowSlot(curDate.getTime() / 1000, "");

        const available = availableEl!.innerHTML.split("<br>");
        available.splice(-1);

        for (const name of available) {
          if (name in availability) {
            availability[name].push(curDate.getTime());
          } else {
            availability[name] = [curDate.getTime()];
          }
        }
      }
    }

    return { dates, duration, name, availability };
  });

  console.log("DATA: ", data);

  data.type = "specific_dates";

  // Determine if days of the week event
  if (new Date(data.dates[0]).getFullYear() === 1978) {
    data.type = "dow";
  }

  // Get base url
  const baseApiUrl =
    process.env.VERCEL_ENV === "production"
      ? "https://schej.it/api"
      : "http://localhost:3002/api";
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
    when2meetHref: href,
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

  const posthogPayload = {
    eventId: shortId,
    eventName: createEventPayload.name,
    eventDuration: createEventPayload.duration,
    eventDates: JSON.stringify(createEventPayload.dates),
    eventType: createEventPayload.type,
    eventWhen2meetHref: href,
  };
  trackEventWithPosthog(event, posthogPayload);

  return {
    url: `${baseSchejUrl}/e/${shortId}`,
  };
});
