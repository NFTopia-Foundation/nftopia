export interface FcmPayload {
  notification?: {
    title: string;
    body: string;
  };
  data?: {
    [key: string]: string;
  };
}
