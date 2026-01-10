export const ZK = Object.freeze({
  SERVER_CONFIG: 'config',
  PRODUCT_CONFIG: 'product-config',
  IPs: process.env.ZK_CUSTOM_IPS || '',
  SERVER_CONFIG_PATH: '/mpl/rummy-multi-table-node/config',
  PRODUCT_CONFIG_PATH: '/mpl/rummy-multi-table-node/product-config',
});
