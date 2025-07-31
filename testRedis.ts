import Redis from 'ioredis';

const client = new Redis();

client.set('hello', 'world').then(() => {
  console.log('Set successful');
  client.quit();
});
