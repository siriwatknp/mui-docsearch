import yargs from "yargs";
import fsp from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
// @ts-expect-error
import keywords from "./keywords";

const env = dotenv.config().parsed as {
  APPLICATION_ID: string;
  API_KEY: string;
};

async function run(argv: { filename?: string; rootDir?: string }) {
  const { filename, rootDir = "./snapshots" } = argv;
  if (!filename) {
    throw new Error("filename is required (--filename)");
  }
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1024, height: 728 },
  });
  const page = await browser.newPage();
  await page.goto(`file://${path.resolve("./playground/index.html")}`);

  // fill APP_ID and API_KEY
  await page.click('input[type="radio"][value="dev"]');
  await page.type("input#appId", env.APPLICATION_ID);
  await page.type("input#apiKey", env.API_KEY);
  await page.type("input#indexName", "material-ui");
  await page.waitForTimeout(100);

  await (keywords as Array<string>).reduce(async (promise, keyword) => {
    await promise;

    // select all text and type
    await page.click("#q", { clickCount: 3 });
    await page.type("#q", keyword, { delay: 200 });

    // wait for the search result
    await page.waitForSelector(".algolia-docsearch-footer--logo");
    await page.waitForTimeout(500);

    const dir = `${rootDir}/${keyword}`;
    try {
      await fsp.mkdir(dir, { recursive: true });
    } catch (error) {}
    await page.screenshot({
      fullPage: true,
      path: `${dir}/${filename}.jpg`,
    });
    return Promise.resolve();
  }, Promise.resolve());

  await browser.close();
}

yargs
  .command({
    command: "$0",
    builder: (command) => {
      return command
        .option("filename", {
          alias: "f",
          description: "generated file name.",
          type: "string",
        })
        .option("rootDir", {
          alias: "r",
          description: "snapshots root folder.",
          type: "string",
        });
    },
    handler: run,
  })
  .help()
  .strict(true)
  .version(false)
  .parse();
