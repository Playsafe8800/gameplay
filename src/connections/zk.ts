import productConfig from '../config/zk/productConfig';
import config from '../config/zk/config';

class Zookeeper {
  private configData = { ...productConfig, ...config };

  constructor() {
    this.getConfig = this.getConfig.bind(this);
  }

  getConfig() {
    return this.configData;
  }
}

const zookeeperObj = new Zookeeper();
export default zookeeperObj;
