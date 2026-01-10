import pm2 from 'pm2';

export default async function getPm2Id(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    pm2.list((err, list: any[]) => {
      if (err) {
        reject(err);
      } else {
        const pid = Number(
          list.find((x) => x.pid === process.pid)?.pm2_env?.pm_id,
        );
        resolve(pid);
      }
    });
  });
}
