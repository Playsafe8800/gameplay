'use strict';
/* eslint-disable */
const {
  ZKUtil,
  LocalEnvironmentSetup,
  FileUtils,
  ConsulUtil,
  RedisUtil,
  WireMockClient,
} = require('test-jarvis-node');

let consulUtil;
let redisUtil;
let redisClusterUtil;
let wireMockUtil;
let zookeeperUtil;
let zkConfigFilePath;
let zookeeperConfig;

let isConsulClientStarted = false;
let isRedisClientStarted = false;
let isRedisClusterClientStarted = false;
let isWireMockClientStarted = false;
let isZookeeperClientStarted = false;

let app_process_id;

const seconds = 3;
const appHost = 'localhost';
const appPort = 5900;

const TIMEOUT = 180000;

const shell = require('shelljs');

const zkFilePath = './lib/rummy_config_znodes.json';
const constants = require('./../constants');
const path = require('path');
const { consoleLog } = require('mocha/lib/reporters/base');

let start = process.hrtime();

async function startApplication(zookeeperIP, grpcPort) {
  const { spawn } = require('child_process');
  const srcfile = path.resolve('.', 'dist/app.js');
  const child = spawn(
    'PORT=6000 GRPC_SERVER_PORT=' +
      grpcPort +
      ' SERVER_ENV="local" NODE_ENV="local" ZK_CUSTOM_IPS="' +
      zookeeperIP +
      '" node',
    [srcfile],
    {
      detached: true,
      stdio: 'ignore',
    },
  );
  child.unref();
}

async function registerService(serviceName, servicePort) {
  try {
    await consulUtil.registerService(serviceName, servicePort);
  } catch (err) {}
}

async function sleep(service_name, interval_in_seconds) {
  await new Promise((resolve) =>
    setTimeout(resolve, interval_in_seconds * 1000),
  );
}

async function startConsul() {
  consulUtil = new ConsulUtil();
  await consulUtil._initialize();
  let config = await consulUtil.getConfig();
  if (config.port) {
    isConsulClientStarted = true;
    await sleep('Consul Client', seconds);
  }
  constants.consulConfiguration = config;
  return config;
}

async function startRedisNode() {
  redisUtil = new RedisUtil();
  await redisUtil._initialize();
  let redisConfig = await redisUtil.getConfig();
  await sleep('Redis Client', seconds);
  await redisUtil.connect();

  if (redisConfig.port) {
    isRedisClientStarted = true;
  }
  constants.redisConfiguration = redisConfig;
  return redisConfig;
}

async function startRedisClusterNode() {
  redisClusterUtil = new RedisClusterUtil(TIMEOUT);
  await redisClusterUtil._initialize();
  await redisClusterUtil.connect();
  let redisClusterConfig = await redisClusterUtil.getConfig();
  await sleep('Redis Cluster', seconds);
  await redisClusterUtil.connect();

  if (redisClusterConfig.port) {
    isRedisClusterClientStarted = true;
  }
  constants.redisClusterConfig = redisClusterConfig;
  return redisClusterConfig;
}

async function startWireMock() {
  const IMAGE_NAME =
    'm-central.mpl.live:9092/rummy-multi-table-grpc-wiremock:1.0.0';
  wireMockUtil = new WireMockClient(IMAGE_NAME);
  await wireMockUtil._initialize();

  let wireMockConfig = await wireMockUtil.getConfig();
  // let wireMockConfig = {
  //   host: appHost,
  //   port: 51000,
  //   wire_mock_port: 8889
  // };

  // let wireMockConfig = {
  //   host: '127.0.0.1',
  //   port: 50000,
  //   wire_mock_port: 8888,
  // };

  await sleep('gRPC WireMock', seconds);

  if (wireMockConfig.port) {
    isWireMockClientStarted = true;
  }

  try {
    await sleep('Register services to Consul app', seconds);

    await registerService('service-auth', wireMockConfig.port);
    await registerService('service-card-games', wireMockConfig.port);
    await registerService('service-user-data', wireMockConfig.port);
  } catch (err) {}
  constants.wireMockConfiguration = wireMockConfig;
  return wireMockConfig;
}

async function startZookeeper() {
  return new Promise(async (res, rej) => {
    zookeeperUtil = new ZKUtil();
    await zookeeperUtil._initialize();
    let zookeeperConfig = await zookeeperUtil.getConfig();
    await sleep('Zookeeper to up & running', 5);
    if (zookeeperConfig.port) {
      isZookeeperClientStarted = true;
    }
    constants.zookeeperConfig = zookeeperConfig;
    return res(zookeeperConfig);
  });
}

async function delay(timeout) {
  await new Promise((res) =>
    setTimeout(() => {
      res();
    }, timeout),
  );
}

async function startLocalApp(host, port) {
  return new Promise((resolve, rejects) => {
    const appStart =
      'port=' +
      appPort +
      ' SERVER_ENV="local" TEST_MODE=true CONSUL_HOST=' +
      appHost +
      ' CONSUL_PORT=' +
      constants.consulConfiguration.port +
      ' REDIS_PORT=' +
      constants.redisConfiguration.port +
      ' GAMEPLAY_REDIS_PORT=' +
      constants.redisConfiguration.port +
      ' PUB_SUB_REDIS_PORT=' +
      constants.redisConfiguration.port +
      ' PUBSUB_REDIS_PORT=' +
      constants.redisConfiguration.port +
      ' SCHEDULER_PORT=' +
      constants.redisConfiguration.port +
      ' SCHEDULER_REDIS_PORT=' +
      constants.redisConfiguration.port +
      ' SCHEDULER_REDIS_HOST="localhost" NODE_ENV="local" GRPC_SERVER_HOST="' +
      appHost +
      '" ZK_CUSTOM_IPS="' +
      host +
      ':' +
      port +
      '" node dist/app.js';

    const child = shell.exec(appStart, { async: true });
    child.stdout.on('data', function (data) {
      if (data.includes('SOCKET Server listening to the port')) {
        resolve(child.pid);
      }
    });
  }).then((result) => {
    return result;
  });
}

async function readJsonFileContent(filePath) {
  return new Promise(async (res, rej) => {
    let rawdata;
    try {
      await sleep(
        'Waiting for [5] seconds while loading the ZK config file - ' +
          filePath,
        5,
      );
      rawdata = await FileUtils.readContent(
        path.join('./', filePath),
      );
    } catch (err) {}
    let jsonData = JSON.parse(JSON.stringify(rawdata));
    await sleep('Zookeeper Client', seconds);

    try {
      let zkConfig = await zookeeperUtil.connectZookeeper(jsonData);
      return res(await zkConfig);
    } catch (error) {
      return rej(error);
    }
  });
}

before(async function () {
  zkConfigFilePath = await LocalEnvironmentSetup.copyFile(zkFilePath);

  let startEnv = process.hrtime();
  let [config, redisConfig, wireMockConfig, zookeeperConfig] =
    await Promise.all([
      startConsul(),
      startRedisNode(),
      startWireMock(),
      startZookeeper(),
    ]);

  let endEnv = process.hrtime(startEnv);

  await sleep('Setting up Zookeeper with the configuration(s)', 10);

  await LocalEnvironmentSetup.setUpRummyMultiTableNode(
    zkConfigFilePath,
    redisConfig,
    config,
    wireMockConfig,
  );
  await sleep('ZK File to be uploaded', 10);
  let zkConfig = await readJsonFileContent(zkConfigFilePath);
  await sleep('Zookeeper Config update is completed', 5);

  await sleep('Application Starts', 20);
  app_process_id = await startLocalApp(
    zookeeperConfig.host,
    zookeeperConfig.port,
  );
  await sleep('Test Execution Begins', 15);
});

after(async function (afterDone) {
  this.timeout(60000);
  if (app_process_id) {
    process.kill(app_process_id, 'SIGTERM');
    afterDone();
  }

  if (isRedisClientStarted) {
    redisUtil && (await redisUtil.stopContainer());
  }
  if (isWireMockClientStarted) {
    //wireMockUtil && (await wireMockUtil.stopContainer());
  }
  if (isConsulClientStarted) {
    consulUtil && (await consulUtil.stopContainer());
  }
  if (isZookeeperClientStarted) {
    zookeeperUtil && (await zookeeperUtil.stopContainer());
  }
});

process.on('exit', function () {
  let endTime = process.hrtime(start);
});
