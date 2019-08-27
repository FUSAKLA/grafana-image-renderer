import * as path from 'path';
import * as os from 'os';
import * as puppeteer from 'puppeteer';
import { Logger } from './logger';
import uniqueFilename = require('unique-filename');


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class Browser {

  constructor(private log: Logger) {
  }

  validateOptions(options) {
    options.width = parseInt(options.width) || 1000;
    options.height = parseInt(options.height) || 500;
    options.timeout = parseInt(options.timeout) || 30;

    if (options.width > 3000 || options.width < 10) {
      options.width = 2500;
    }

    if (options.height > 3000 || options.height < 10) {
      options.height = 1500;
    }
  }

  async render(options) {
    let browser;
    let page;
    const env = Object.assign({}, process.env);

    try {
      this.validateOptions(options);

      // set env timezone
      env.TZ = options.timezone || process.env.TZ;

      if ((process as any).pkg) {
        const parts = puppeteer.executablePath().split(path.sep);
        while(!parts[0].startsWith('chrome-')) {
          parts.shift();
        }
        const executablePath = [path.dirname(process.execPath), ...parts].join(path.sep);
        console.log('executablePath', executablePath);
        browser = await puppeteer.launch({
          executablePath,
          env: env,
          args: ["--no-sandbox", "--proxy-server='direct://'", "--proxy-bypass-list=*"],
        });
      } else {
        browser = await puppeteer.launch({
          env: env,
          args: ["--no-sandbox", "--proxy-server='direct://'", "--proxy-bypass-list=*"],
        });
      }
      page = await browser.newPage();

      await page.setViewport({
        width: options.width,
        height: options.height,
        deviceScaleFactor: 1,
        });

      await page.setUserAgent('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0');

      await page.setCookie({
        'name': 'renderKey',
        'value': options.renderKey,
        'domain': options.domain,
      });

      await page.goto(options.url);

      // wait for all panels to render
      await page.waitForFunction(() => {
        await sleep(2000);
        return true;
        //const panelCount = document.querySelectorAll('.panel-wrapper').length;
        //return (<any>window).panelsRendered >= panelCount;
      }, {
        timeout: options.timeout * 1000
      });

      if (!options.filePath) {
        options.filePath = uniqueFilename(os.tmpdir()) + '.png';
      }

      await page.screenshot({path: options.filePath});

      return { filePath: options.filePath };

    } finally {
      if (page) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
    }
  }
}

