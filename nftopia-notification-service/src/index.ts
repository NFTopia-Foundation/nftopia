import app from './app';
import config from './config/env';

app.listen(config.PORT, () => {
  console.log(`Notification service running on port ${config.PORT}`);
});