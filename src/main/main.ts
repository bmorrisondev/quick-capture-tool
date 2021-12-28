/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  Tray,
  Menu,
  MenuItem,
  globalShortcut,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

let trayIcon = null;

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 500,
    height: 170,
    icon: getAssetPath('icon.png'),
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (!isDevelopment) {
    mainWindow.resizable = false;
  }

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('minimize', (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupTrayIcon() {
  const staticDir = require('path')
    .join(__dirname, '/static')
    .replace(/\\/g, '\\\\');
  const iconFile = path.join(staticDir, '/trello-icon.ico');
  trayIcon = new Tray(iconFile);
  trayIcon.setTitle('Quick Capture');
  // let trayIcon = new Tray(`${__dirname}/dist/img/trello-icon.ico`)
  // let trayIcon = new Tray(nativeImage.createEmpty())

  const contextMenu = Menu.buildFromTemplate([
    // {
    //     label: 'Show App',
    //     click: function () {
    //         win.show()
    //     }
    // },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  trayIcon.on('click', () => mainWindow?.show());
  trayIcon.setContextMenu(contextMenu);
}

function setupMenu() {
  const menu = new Menu();

  menu.append(
    new MenuItem({
      label: 'Close',
      accelerator: 'Esc',
      click: () => mainWindow?.close(),
    })
  );

  menu.append(
    new MenuItem({
      label: 'Quit',
      accelerator: 'Control+Q',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    })
  );

  mainWindow?.setMenu(menu);
}

function registerHotkeys() {
  // Register a 'CommandOrControl+X' shortcut listener.
  const ret = globalShortcut.register('CommandOrControl+Shift+O', () => {
    mainWindow?.show();
    mainWindow?.webContents.send('focus-input');
  });

  if (!ret) {
    alert('Hotkey registration failed.');
  }
}

function registerIpcEvents() {
  ipcMain.on('close-window', () => {
    mainWindow?.close();
  });

  ipcMain.on('show-window', () => {
    mainWindow?.show();
  });
}

app
  .whenReady()
  .then(() => {
    createWindow();
    setupMenu();
    setupTrayIcon();
    registerHotkeys();
    registerIpcEvents();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
